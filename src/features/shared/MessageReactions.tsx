import { useState } from 'react'

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
  resolveUserName?: (userId: string) => string
}

export default function MessageReactions({
  messageId,
  meId,
  reactions,
  onToggle,
  disabled,
  resolveUserName,
}: Props) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [inspectEmoji, setInspectEmoji] = useState<string | null>(null)

  const mine = new Set(reactions.filter((r) => r.user_id === meId).map((r) => r.emoji))
  const byEmoji = new Map<string, string[]>()
  for (const r of reactions) {
    const list = byEmoji.get(r.emoji) ?? []
    list.push(r.user_id)
    byEmoji.set(r.emoji, list)
  }

  const activeList = QUICK_EMOJIS.filter((e) => (byEmoji.get(e)?.length ?? 0) > 0)
  const inspectedUsers = inspectEmoji ? (byEmoji.get(inspectEmoji) ?? []) : []

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5">
        {activeList.map((emoji) => {
          const users = byEmoji.get(emoji) ?? []
          const isMine = mine.has(emoji)
          return (
            <button
              key={emoji}
              type="button"
              disabled={disabled}
              onClick={(e) => {
                e.stopPropagation()
                if (resolveUserName) {
                  setInspectEmoji((prev) => (prev === emoji ? null : emoji))
                } else {
                  onToggle(messageId, emoji)
                }
              }}
              title={resolveUserName ? 'انقر لعرض أسماء المتفاعلين' : 'تبديل التفاعل'}
              className={
                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold transition ' +
                (isMine
                  ? 'border-primary bg-primary-soft text-primary'
                  : 'border-light-blue bg-white text-ink-muted hover:border-primary/50')
              }
            >
              <span>{emoji}</span>
              <span>{users.length}</span>
            </button>
          )
        })}

        <div className="relative">
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation()
              setPickerOpen((v) => !v)
            }}
            className="rounded-full border border-light-blue bg-white px-2.5 py-0.5 text-xs font-semibold text-ink-muted transition hover:border-primary hover:text-primary"
          >
            {pickerOpen ? 'إغلاق' : 'تفاعل +'}
          </button>

          {pickerOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="mt-1 inline-flex items-center gap-1 rounded-full border border-light-blue bg-white px-2 py-1 shadow-md"
            >
              {QUICK_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => {
                    onToggle(messageId, emoji)
                    setPickerOpen(false)
                  }}
                  className={
                    'rounded-full px-1.5 py-0.5 text-sm transition hover:bg-primary-soft ' +
                    (mine.has(emoji) ? 'bg-primary-soft' : '')
                  }
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {resolveUserName && inspectEmoji && inspectedUsers.length > 0 && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="rounded-lg border border-light-blue bg-bg/60 px-3 py-2 text-xs text-ink"
        >
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="font-bold text-primary">
              المتفاعلون بـ {inspectEmoji} ({inspectedUsers.length}):
            </span>
            <button
              type="button"
              onClick={() => setInspectEmoji(null)}
              className="text-ink-muted hover:text-error"
            >
              ✕
            </button>
          </div>
          <p className="leading-relaxed">
            {inspectedUsers.map((uid) => resolveUserName(uid)).join('، ')}
          </p>
        </div>
      )}
    </div>
  )
}
