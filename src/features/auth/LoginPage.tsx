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
      <div
        className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z" />
          <path d="M12 6.5v13" />
        </svg>
      </div>
      <h1 className="text-4xl font-bold leading-tight text-primary">فقه المعاملات</h1>
      <p className="mt-3 text-lg text-ink">المنصة التعليمية التفاعلية</p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5 text-start">
        {!isSupabaseConfigured && (
          <p role="alert" className="rounded-xl border border-warning bg-warning/30 px-4 py-3 text-sm text-ink">
            لم يُضبط الاتصال بقاعدة البيانات بعد. أنشئ ملف .env.local كما في README.
          </p>
        )}

        <div>
          <label htmlFor="identifier" className="mb-2 block text-sm font-semibold text-ink">
            اسم المستخدم / البريد الإلكتروني
          </label>
          <input
            id="identifier"
            dir="ltr"
            className={inputClass}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
            inputMode="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-ink">
            كلمة المرور
          </label>
          <input
            id="password"
            dir="ltr"
            type="password"
            className={inputClass}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {message && (
          <p role="alert" className="rounded-xl border border-error bg-error/10 px-4 py-3 text-sm font-semibold text-ink">
            {message}
          </p>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'جارٍ الدخول…' : 'دخول'}
        </Button>
      </form>
    </CenteredCard>
  )
}
