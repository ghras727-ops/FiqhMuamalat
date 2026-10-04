import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../../app/auth-context'
import Button from '../../components/Button'
import CenteredCard from '../../components/CenteredCard'

const inputClass =
  'w-full rounded-xl border border-light-blue bg-white py-3 pl-4 pr-16 text-base text-ink outline-none transition focus:border-primary'

function Rule({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? 'font-semibold text-secondary' : 'text-ink/60'}`}>
      <span
        aria-hidden="true"
        className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-white ${ok ? 'bg-secondary' : 'bg-light-blue'}`}
      >
        {ok ? '✓' : ''}
      </span>
      <span>{children}</span>
    </li>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  autoComplete: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        dir="ltr"
        type={show ? 'text' : 'password'}
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
    </div>
  )
}

/** شاشة إلزامية: لا يدخل الطالب المقرر قبل تغيير كلمة المرور المؤقتة. */
export default function ChangePasswordPage() {
  const { profile, changePassword, signOut } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const lengthOk = next.length >= 8 && next.length <= 72
  const mixOk = /[A-Za-z]/.test(next) && /[0-9]/.test(next)
  const differentOk = next.length > 0 && next !== current
  const matchOk = next.length > 0 && next === confirm
  const allOk = lengthOk && mixOk && differentOk && matchOk && current.length > 0

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!allOk) {
      setError('أكمل الشروط الموضحة أدناه قبل المتابعة.')
      return
    }
    setSubmitting(true)
    const message = await changePassword(current, next)
    setSubmitting(false)
    if (message) setError(message)
    // عند النجاح يُعاد تحميل الملف تلقائيًا، فيوجّه التطبيق الطالب إلى صفحته.
  }

  return (
    <CenteredCard>
      <div
        className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold leading-tight text-primary">تغيير كلمة المرور</h1>
      <p className="mt-3 text-base text-ink">
        {profile?.full_name ? `مرحبًا ${profile.full_name}. ` : ''}
        كلمة المرور الحالية مؤقتة، ولا يمكنك دخول المقرر قبل تغييرها.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5 text-start">
        <div className="relative">
          <PasswordField
            id="current"
            label="كلمة المرور الحالية (المؤقتة)"
            value={current}
            onChange={setCurrent}
            show={show}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-[2.6rem] text-sm font-semibold text-primary"
            aria-pressed={show}
          >
            {show ? 'إخفاء' : 'إظهار'}
          </button>
        </div>

        <PasswordField
          id="new"
          label="كلمة المرور الجديدة"
          value={next}
          onChange={setNext}
          show={show}
          autoComplete="new-password"
        />
        <PasswordField
          id="confirm"
          label="تأكيد كلمة المرور الجديدة"
          value={confirm}
          onChange={setConfirm}
          show={show}
          autoComplete="new-password"
        />

        <ul className="space-y-1.5 rounded-xl bg-surface px-4 py-3 text-sm" aria-live="polite">
          <Rule ok={lengthOk}>من 8 إلى 72 محرفًا</Rule>
          <Rule ok={mixOk}>تحتوي حرفًا إنجليزيًا ورقمًا على الأقل</Rule>
          <Rule ok={differentOk}>تختلف عن كلمة المرور المؤقتة</Rule>
          <Rule ok={matchOk}>التأكيد مطابق</Rule>
        </ul>

        {error && (
          <p role="alert" className="rounded-xl border border-error bg-error/10 px-4 py-3 text-sm font-semibold text-ink">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'جارٍ الحفظ…' : 'حفظ ومتابعة'}
        </Button>
        <Button variant="outline" onClick={signOut} disabled={submitting}>
          تسجيل الخروج
        </Button>
      </form>
    </CenteredCard>
  )
}