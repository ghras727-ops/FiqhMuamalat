import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' }

export default function Button({ variant = 'primary', className = '', type = 'button', ...props }: Props) {
  const base =
    'inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-base font-semibold transition disabled:cursor-not-allowed disabled:opacity-60'
  const styles =
    variant === 'primary'
      ? 'bg-primary text-white hover:bg-primary/90'
      : 'border border-primary bg-white text-primary hover:bg-surface'
  return <button type={type} className={`${base} ${styles} ${className}`} {...props} />
}
