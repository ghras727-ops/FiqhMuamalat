import type { ReactNode } from 'react'

/** بطاقة مركزية بشريط الهوية، تُستخدم في صفحات هذه المرحلة. */
export default function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-light-blue bg-white shadow-sm">
        <div className="flex h-1.5" aria-hidden="true">
          <span className="flex-[3] bg-primary" />
          <span className="flex-1 bg-secondary" />
          <span className="flex-1 bg-accent" />
        </div>
        <div className="px-6 py-10 text-center sm:px-10 sm:py-12">{children}</div>
      </section>
    </main>
  )
}
