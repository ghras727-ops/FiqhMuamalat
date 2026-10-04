import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { FunctionsHttpError, type Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { arabicAuthError } from '../lib/authErrors'
import type { Profile } from '../types'
import { AuthContext } from './auth-context'

/**
 * اسم Edge Function الخاصة بتغيير كلمة المرور كما يظهر في لوحة Supabase.
 * (لوحة Supabase تسمّي الدوال أسماء عشوائية، فنحفظ الاسم في مكان واحد.)
 */
const CHANGE_PASSWORD_FUNCTION = 'dynamic-responder'

const STUDENT_NO_PATTERN = /^[A-Z]{2}[0-9]{4,8}$/

/** يحوّل ما يكتبه المستخدم إلى بريد الدخول: بريد الأستاذ كما هو، أو بريد الطالب المشتق من رقمه التعريفي. */
function toLoginEmail(identifier: string): string | null {
  const value = identifier.trim()
  if (value.includes('@')) return value
  const studentNo = value.toUpperCase()
  if (!STUDENT_NO_PATTERN.test(studentNo)) return null
  return `${studentNo.toLowerCase()}@students.invalid`
}

const FUNCTION_ERRORS: Record<string, string> = {
  current_password_incorrect: 'كلمة المرور الحالية غير صحيحة.',
  password_length_8_to_72: 'كلمة المرور الجديدة يجب أن تكون من 8 إلى 72 محرفًا.',
  password_needs_letter_and_digit: 'كلمة المرور الجديدة يجب أن تحتوي حرفًا ورقمًا على الأقل.',
  password_same_as_current: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية.',
  missing_fields: 'أدخل كلمة المرور الحالية والجديدة.',
  flag_update_failed_contact_teacher:
    'تغيّرت كلمة المرور لكن تعذّر إكمال التفعيل. تواصل مع الأستاذ.',
  unauthorized: 'انتهت الجلسة. سجّل الدخول من جديد.',
  forbidden: 'هذا الحساب غير مسموح له بتغيير كلمة المرور من هنا.',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(Boolean(supabase))
  const [profile, setProfile] = useState<Profile | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  // 1) متابعة الجلسة
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  // 2) تحميل الملف والدور من القاعدة. القراءة محكومة بسياسات RLS.
  const userId = session?.user.id ?? null
  useEffect(() => {
    if (!supabase) return
    if (!userId) return
    let cancelled = false
    supabase
      .from('profiles')
      .select('id, full_name, student_no, role, active, must_change_password, created_at')
      .eq('id', userId)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (cancelled) return
        let problem: string | null = null
        if (error) problem = 'تعذّر تحميل بيانات الحساب. حاول مرة أخرى.'
        else if (!data) problem = 'هذا الحساب غير مسجَّل في المنصة. تواصل مع الأستاذ.'
        else if (!data.active) problem = 'هذا الحساب غير مفعّل. تواصل مع الأستاذ.'

        if (problem) {
          setNotice(problem)
          await supabase!.auth.signOut({ scope: 'local' })
          return
        }
        setNotice(null)
        setProfile(data as Profile)
      })
    return () => {
      cancelled = true
    }
  }, [userId, reloadTick])

  const signIn = useCallback(async (identifier: string, password: string) => {
    if (!supabase) return 'لم يُضبط الاتصال بقاعدة البيانات. راجع ملف .env.local.'
    if (!identifier.trim() || !password) return 'أدخل اسم المستخدم وكلمة المرور.'
    const email = toLoginEmail(identifier)
    if (!email) return 'الرقم التعريفي غير صحيح. مثال: FM0001'
    setNotice(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? arabicAuthError(error) : null
  }, [])

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!supabase) return 'لم يُضبط الاتصال بقاعدة البيانات. راجع ملف .env.local.'
      const studentNo = profile?.student_no
      if (!studentNo) return 'تعذّر تحديد الحساب. سجّل الدخول من جديد.'
      if (!currentPassword || !newPassword) return 'أدخل كلمة المرور الحالية والجديدة.'

      const { error } = await supabase.functions.invoke(CHANGE_PASSWORD_FUNCTION, {
        body: { current_password: currentPassword, new_password: newPassword },
      })

      if (error) {
        if (error instanceof FunctionsHttpError) {
          try {
            const body = await error.context.json()
            const known = FUNCTION_ERRORS[String(body?.error ?? '')]
            if (known) return known
          } catch {
            // نتجاهل: نعرض الرسالة العامة أدناه
          }
        }
        return 'تعذّر تغيير كلمة المرور. حاول مرة أخرى.'
      }

      // نجح التغيير: ندخل بالكلمة الجديدة للحصول على جلسة سليمة، ثم نعيد تحميل الملف.
      const email = `${studentNo.toLowerCase()}@students.invalid`
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: newPassword,
      })
      if (signInError) {
        await supabase.auth.signOut({ scope: 'local' })
        setProfile(null)
        return 'تغيّرت كلمة المرور. سجّل الدخول بالكلمة الجديدة.'
      }
      setReloadTick((n) => n + 1)
      return null
    },
    [profile],
  )

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    // عند فشل الشبكة لا تُحذف الجلسة المحلية تلقائيًا، فنحذفها يدويًا.
    if (error) await supabase.auth.signOut({ scope: 'local' })
    setProfile(null)
  }, [])

  // الملف يُعدّ صالحًا فقط إن كان لمستخدم الجلسة الحالية.
  const currentProfile = userId && profile?.id === userId ? profile : null
  const loading = sessionLoading || (userId !== null && currentProfile === null)

  return (
    <AuthContext.Provider
      value={{ session, profile: currentProfile, loading, notice, signIn, changePassword, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}