import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { Profile } from '../types'

export interface AuthState {
  session: Session | null
  /** ملف المستخدم من جدول profiles (null حتى يُحمَّل أو إن لم يكن مسموحًا له). */
  profile: Profile | null
  loading: boolean
  /** رسالة تظهر في صفحة الدخول عند رفض حساب (غير مسجَّل / غير مفعّل ...). */
  notice: string | null
  /** يعيد رسالة خطأ عربية، أو null عند النجاح. */
  signIn: (identifier: string, password: string) => Promise<string | null>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthState>({
  session: null,
  profile: null,
  loading: true,
  notice: null,
  signIn: async () => null,
  signOut: async () => {},
})

export const useAuth = () => useContext(AuthContext)
