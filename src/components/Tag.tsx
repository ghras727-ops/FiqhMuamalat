import type { ReactNode } from 'react'

type Tone = 'ok' | 'wait' | 'off' | 'info'

const tones: Record<Tone, string> = {
  ok: 'bg-secondary/10 text-secondary',
  wait: 'bg-warning/40 text-ink',
  off: 'bg-error/10 text-error',
  info: 'bg-primary/10 text-primary',
}

export default function Tag({ children, tone }: { children: ReactNode; tone: Tone }) {
  return (
    <span className={'inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ' + tones[tone]}>
      {children}
    </span>
  )
}
