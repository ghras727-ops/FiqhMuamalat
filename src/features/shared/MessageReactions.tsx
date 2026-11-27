export interface ReactionRow {
  message_id: string
  user_id: string
  emoji: string
}

export const QUICK_EMOJIS = ['👍', '❤️', '✅', '🙏'] as const

interface Props {
  messageId: string
  meId: string
  reactions: ReactionRow[]
  onToggle: (messageId: string, emoji: string) => void
  disabled?: boolean
}

export default function MessageReactions({ messageId, meId, reactions, onToggle, disabled }: Props) {
  const mine = new Set(reactions.filter((r) => r.user_id === meId).map((r) => r.emoji))
  const counts = new Map<string, number>()
  for (const r of reactions) {
    counts.set(r.emoji, (counts.get(r.emoji) ?? 0) + 1)
  }

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
      {QUICK_EMOJIS.map((emoji) => {
        const count = counts.get(emoji) ?? 0
        const active = mine.has(emoji)
        return (
          <button
            key={emoji}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(messageId, emoji)}
            className={
              'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold transition ' +
              (active
                ? 'border-primary bg-primary-soft text-primary'
                : 'border-light-blue bg-white text-ink-muted hover:border-primary/50 hover:text-ink')
            }
          >
            <span>{emoji}</span>
            {count > 0 && <span>{count}</span>}
          </button>
        )
      })}
    </div>
  )
}
