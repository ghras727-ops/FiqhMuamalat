import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { arabicAuthError } from '../lib/authErrors'
import type { Profile } from '../types'
import { AuthContext } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(Boolean(supabase))
  const [profile, setProfile] = useState<Profile | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

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
      .select('id, full_name, student_no, role, active, created_at')
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
  }, [userId])

  const signIn = useCallback(async (identifier: string, password: string) => {
    if (!supabase) return 'لم يُضبط الاتصال بقاعدة البيانات. راجع ملف .env.local.'
    const email = identifier.trim()
    if (!email || !password) return 'أدخل اسم المستخدم وكلمة المرور.'
    // الدخول باسم المستخدم (الرقم الجامعي) يُفعَّل مع حسابات الطلاب في مرحلة لاحقة.
    if (!email.includes('@')) return 'أدخل البريد الإلكتروني كاملًا.'
    setNotice(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? arabicAuthError(error) : null
  }, [])

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
    <AuthContext.Provider value={{ session, profile: currentProfile, loading, notice, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}
