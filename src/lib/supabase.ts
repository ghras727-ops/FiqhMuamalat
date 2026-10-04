import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** هل ضُبطت متغيرات Supabase في ملف .env.local؟ */
export const isSupabaseConfigured = Boolean(url && publishableKey)

/** حاجز أمان: يرفض أي مفتاح سري (sb_secret_ أو service_role) في تطبيق المتصفح. */
function isSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true
  try {
    const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload?.role === 'service_role'
  } catch {
    return false
  }
}

if (publishableKey && isSecretKey(publishableKey)) {
  throw new Error(
    'مفتاح سري في VITE_SUPABASE_PUBLISHABLE_KEY. استخدم المفتاح العام (sb_publishable_ أو anon) فقط، وغيّر المفتاح المكشوف فورًا.',
  )
}

/**
 * عميل Supabase بالمفتاح العام فقط. الصلاحيات الفعلية تحكمها سياسات RLS في القاعدة.
 * يكون null إذا لم تُضبط المتغيرات، فيعمل المشروع دون خطأ.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, publishableKey!)
  : null
