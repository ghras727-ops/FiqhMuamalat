import type { AuthError } from '@supabase/supabase-js'

/** يحوّل أخطاء Supabase Auth إلى رسائل عربية واضحة. */
export function arabicAuthError(error: AuthError): string {
  const code = error.code ?? ''
  if (code === 'invalid_credentials') return 'اسم المستخدم أو كلمة المرور غير صحيحة.'
  if (code === 'email_not_confirmed') return 'لم يُؤكَّد البريد الإلكتروني لهذا الحساب بعد.'
  if (code === 'user_banned') return 'هذا الحساب موقوف.'
  if (code === 'over_request_rate_limit' || error.status === 429) {
    return 'محاولات كثيرة متتالية. انتظر قليلًا ثم أعد المحاولة.'
  }
  if (error.name === 'AuthRetryableFetchError' || error.status === 0) {
    return 'تعذّر الاتصال بالخادم. تحقق من اتصال الإنترنت ثم أعد المحاولة.'
  }
  return 'تعذّر تسجيل الدخول. حاول مرة أخرى.'
}
