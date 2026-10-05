import { useEffect, useState } from 'react'
import { loadFile, type Attachment } from '../demo/files'

const link =
  'rounded-xl border border-primary bg-white px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-surface'

function sizeLabel(n: number) {
  if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB'
  return (n / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function AttachmentView({ att }: { att: Attachment }) {
  const [url, setUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let alive = true
    let made: string | null = null
    loadFile(att.id)
      .then((b) => {
        if (!alive) return
        if (!b) {
          setMissing(true)
          return
        }
        made = URL.createObjectURL(b)
        setUrl(made)
      })
      .catch(() => {
        if (alive) setMissing(true)
      })
    return () => {
      alive = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [att.id])

  const isImage = att.type.startsWith('image/')
  const isPdf = att.type === 'application/pdf'

  return (
    <div className="rounded-xl border border-light-blue p-3">
      {isImage && url && (
        <img src={url} alt={att.name} className="mb-3 max-h-96 max-w-full rounded-xl border border-light-blue" />
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm">
          {att.name} <span className="text-xs text-ink/60" dir="ltr">({sizeLabel(att.size)})</span>
        </span>
        {missing && <span className="text-xs text-ink/60">الملف غير متوفر في هذا المتصفح.</span>}
        {url && (
          <span className="flex gap-2">
            {(isPdf || isImage) && (
              <a className={link} href={url} target="_blank" rel="noreferrer">فتح</a>
            )}
            <a className={link} href={url} download={att.name}>تنزيل</a>
          </span>
        )}
      </div>
    </div>
  )
}
