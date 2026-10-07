import type { ReactNode } from 'react'
import { useAuth } from '../app/auth-context'

export interface ShellTab {
  key: string
  label: string
}

interface Props {
  tabs?: ShellTab[]
  current?: string
  onChange?: (key: string) => void
  children: ReactNode
}

/** هيكل التطبيق: شريط علوي (الشعار، المقرر، المدرس، المستخدم، تسجيل الخروج) وتبويبات ومحتوى. */
export default function AppShell({ tabs, current, onChange, children }: Props) {
  const { profile, signOut } = useAuth()
  const roleLabel = profile?.role === 'teacher' ? 'أستاذ' : 'طالب'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-light-blue bg-white">
        <div className="flex h-1.5" aria-hidden="true">
          <span className="flex-[3] bg-primary" />
          <span className="flex-1 bg-secondary" />
          <span className="flex-1 bg-accent" />
        </div>

        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          {/* الشعار + المقرر + المدرس */}
          <div className="flex items-center gap-3">
            <img
              src="/UST.png"
              alt="شعار جامعة العلوم والتكنولوجيا"
              className="h-14 w-14 rounded-2xl border border-light-blue bg-white object-contain p-1 shadow-sm"
            />
            <div className="leading-tight">
              <div className="text-xl font-bold text-primary">فقه المعاملات</div>
              <div className="mt-0.5 text-xs font-semibold text-ink-muted">
                مدرس المقرر: د. محمد إسماعيل
              </div>
            </div>
          </div>

          {/* المستخدم */}
          <div className="flex items-center gap-3">
            <div className="text-end leading-tight">
              <div className="text-sm font-semibold text-ink">{profile?.full_name}</div>
              <div className="text-xs text-ink-muted">{roleLabel}</div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary-soft"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>

        {tabs && tabs.length > 0 && (
          <nav className="mx-auto max-w-6xl overflow-x-auto px-4" aria-label="التبويبات">
            <ul className="flex gap-1">
              {tabs.map((t) => {
                const active = t.key === current
                return (
                  <li key={t.key}>
                    <button
                      type="button"
                      onClick={() => onChange?.(t.key)}
                      aria-current={active ? 'page' : undefined}
                      className={`whitespace-nowrap border-b-4 px-4 py-3 text-base transition ${
                        active
                          ? 'border-primary font-bold text-primary'
                          : 'border-transparent text-ink-muted hover:text-primary'
                      }`}
                    >
                      {t.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>

      <footer className="mt-8 border-t border-light-blue bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-ink-muted">
          <span>© 2026 — مقرر فقه المعاملات</span>
          <span>المطور: د. محمد إسماعيل</span>
        </div>
      </footer>
    </div>
  )
}