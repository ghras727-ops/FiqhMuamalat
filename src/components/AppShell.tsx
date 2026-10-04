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

/** هيكل التطبيق: شريط علوي (الشعار، المستخدم، تسجيل الخروج) وتبويبات ومحتوى. */
export default function AppShell({ tabs, current, onChange, children }: Props) {
  const { profile, signOut } = useAuth()
  const roleLabel = profile?.role === 'teacher' ? 'أستاذ' : 'طالب'

  return (
    <div className="min-h-screen">
      <header className="border-b border-light-blue bg-white">
        <div className="flex h-1.5" aria-hidden="true">
          <span className="flex-[3] bg-primary" />
          <span className="flex-1 bg-secondary" />
          <span className="flex-1 bg-accent" />
        </div>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <span
              className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-white"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z" />
                <path d="M12 6.5v13" />
              </svg>
            </span>
            <span className="text-xl font-bold text-primary">فقه المعاملات</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-end leading-tight">
              <div className="text-sm font-semibold text-ink">{profile?.full_name}</div>
              <div className="text-xs text-ink/60">{roleLabel}</div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-surface"
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
                          : 'border-transparent text-ink/70 hover:text-primary'
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

      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  )
}