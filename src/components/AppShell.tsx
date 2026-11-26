import type { ReactNode } from 'react'
import { useAuth } from '../app/auth-context'

export interface ShellTab {
  key: string
  label: string
  group?: string
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
          <nav className="border-t border-light-blue/70 bg-surface/60" aria-label="التنقل الرئيسي">
            <div className="mx-auto flex max-w-6xl items-center gap-1 overflow-x-auto px-4 py-1.5">
              {tabs.map((t, idx) => {
                const active = t.key === current
                const prevGroup = idx > 0 ? tabs[idx - 1].group : t.group
                const showDivider = idx > 0 && t.group && prevGroup !== t.group
                return (
                  <div key={t.key} className="flex shrink-0 items-center">
                    {showDivider && (
                      <span className="mx-1.5 h-5 w-px bg-light-blue" aria-hidden="true" />
                    )}
                    <button
                      type="button"
                      onClick={() => onChange?.(t.key)}
                      aria-current={active ? 'page' : undefined}
                      className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-sm transition ${
                        active
                          ? 'bg-primary font-bold text-white shadow-sm'
                          : 'font-medium text-ink-muted hover:bg-white hover:text-primary'
                      }`}
                    >
                      {t.label}
                    </button>
                  </div>
                )
              })}
            </div>
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