import { useState, type FormEvent } from 'react'
import { useAuth } from '../../app/auth-context'
import { isSupabaseConfigured } from '../../lib/supabase'
import Button from '../../components/Button'
import CenteredCard from '../../components/CenteredCard'

const inputClass =
  'w-full rounded-xl border border-light-blue bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-primary'

export default function LoginPage() {
  const { signIn, notice } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const message = await signIn(identifier, password)
    setSubmitting(false)
    if (message) setError(message)
  }

  const message = error ?? notice

  return (
    <CenteredCard>
      <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl border border-light-blue bg-white p-3 shadow-sm">
        <img
          src="/UST.png"
          alt="شعار جامعة العلوم والتكنولوجيا"
          className="h-full w-full object-contain"
        />
      </div>

      <h1 className="text-4xl font-bold leading-tight text-primary">فقه المعاملات</h1>
      <p className="mt-2 text-lg text-ink-muted">المنصة التعليمية التفاعلية</p>
      <p className="mt-3 text-sm font-semibold text-primary">
        مدرس المقرر: د. محمد إسماعيل
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5 text-start">
        {!isSupabaseConfigured && (
          <p role="alert" className="rounded-xl border border-warning bg-warning/30 px-4 py-3 text-sm text-ink">
            لم يُضبط الاتصال بقاعدة البيانات بعد. أنشئ ملف .env.local كما في README.
          </p>
        )}

        <div>
          <label htmlFor="identifier" className="mb-2 block text-sm font-semibold text-ink">
            الرقم التعريفي / البريد الإلكتروني
          </label>
          <input
            id="identifier"
            dir="ltr"
            className={inputClass}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="الطالب: FM0001"
            autoComplete="username"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <p className="mt-1.5 text-xs text-ink-muted">
            الطالب يكتب الرقم التعريفي الذي سلّمه له الأستاذ، والأستاذ يكتب بريده الإلكتروني.
          </p>
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-ink">
            كلمة المرور
          </label>
          <div className="relative">
            <input
              id="password"
              dir="ltr"
              type={showPassword ? 'text' : 'password'}
              className={`${inputClass} pr-16`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-primary"
              aria-pressed={showPassword}
            >
              {showPassword ? 'إخفاء' : 'إظهار'}
            </button>
          </div>
        </div>

        {message && (
          <p role="alert" className="rounded-xl border border-error bg-error-soft px-4 py-3 text-sm font-semibold text-error">
            {message}
          </p>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'جارٍ الدخول…' : 'دخول'}
        </Button>
      </form>

      <p className="mt-8 text-xs text-ink-muted">
        المطور: د. محمد إسماعيل — 2026
      </p>
    </CenteredCard>
  )
}