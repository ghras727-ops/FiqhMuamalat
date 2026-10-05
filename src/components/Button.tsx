import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' }

export default function Button({ variant = 'primary', className = '', type = 'button', ...props }: Props) {
  const base =
    'inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-base font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60'
  const styles =
    variant === 'primary'
      ? 'bg-primary text-white shadow-sm hover:bg-primary-hover active:bg-primary-active'
      : 'border border-primary bg-white text-primary hover:bg-primary-soft active:bg-accent-soft/50'
  return <button type={type} className={`${base} ${styles} ${className}`} {...props} />
}