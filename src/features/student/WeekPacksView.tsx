import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { card } from '../../components/ui'

interface Week { id: string; number: number; title: string; summary: string | null }
interface Lesson { id: string; week_id: string; title: string; body: string | null; position: number }
type Kind = 'slides' | 'document' | 'link'
interface Material {
  id: string
  week_id: string
  lesson_id: string | null
  title: string
  kind: Kind
  view_path: string | null
  download_path: string | null
  url: string | null
  position: number
}

async function buildUrl(kind: Kind, path: string, url: string | null): Promise<string | null> {
  if (kind === 'link' && url) return url
  if (!supabase) return null
  const { data, error } = await supabase.storage.from('course-files').createSignedUrl(path, 86400)
  if (error || !data) return null
  const ext = (path.split('.').pop() ?? '').toLowerCase()
  const officeExts = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'odt', 'ods', 'odp']
  if (officeExts.includes(ext)) {
    return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(data.signedUrl)}`
  }
  return data.signedUrl
}

export default function WeekPacksView() {
  const [weeks, setWeeks] = useState<Week[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [signed, setSigned] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      const [w, l, m] = await Promise.all([
        supabase.from('weeks').select('id,number,title,summary').order('number'),
        supabase.from('lessons').select('id,week_id,title,body,position').order('position'),
        supabase.from('materials').select('id,week_id,lesson_id,title,kind,view_path,download_path,url,position').order('position'),
      ])
      if (cancelled) return
      if (w.error || l.error || m.error) {
        setError('تعذّر تحميل المحتوى.')
        setLoading(false)
        return
      }
      setWeeks((w.data ?? []) as Week[])
      setLessons((l.data ?? []) as Lesson[])
      const mats = (m.data ?? []) as Material[]
      setMaterials(mats)
      const next: Record<string, string | null> = {}
      for (const mat of mats) {
        if (mat.kind === 'link') continue
        const path = mat.view_path ?? mat.download_path
        if (!path) { next[mat.id] = null; continue }
        next[mat.id] = await buildUrl(mat.kind, path, null)
      }
      if (cancelled) return
      setSigned(next)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>
  if (error) return <section className={card}><p className="text-sm font-semibold text-error">{error}</p></section>
  if (weeks.length === 0) return <section className={card}><p className="text-ink-muted">لم يُنشر أي أسبوع بعد.</p></section>

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-primary">📚 دروس الأسابيع</h2>
      {weeks.map((w) => {
        const wLessons = lessons.filter((l) => l.week_id === w.id)
        return (
          <section key={w.id} className={card}>
            <h3 className="text-xl font-bold text-primary">الأسبوع {w.number}: {w.title}</h3>
            {w.summary && <p className="mt-1 text-sm text-ink-muted">{w.summary}</p>}

            <div className="mt-4 space-y-4">
              {wLessons.map((l) => (
                <LessonView
                  key={l.id}
                  lesson={l}
                  materials={materials.filter((m) => m.lesson_id === l.id)}
                  signed={signed}
                />
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function LessonView({ lesson, materials, signed }: {
  lesson: Lesson
  materials: Material[]
  signed: Record<string, string | null>
}) {
  const [open, setOpen] = useState(true)
  const docs = materials.filter((m) => m.kind === 'document')
  const slides = materials.filter((m) => m.kind === 'slides')
  const links = materials.filter((m) => m.kind === 'link')

  return (
    <section className="overflow-hidden rounded-2xl border border-light-blue border-s-4 border-s-primary bg-white">
      <button
        className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-start hover:bg-primary-soft"
        onClick={() => setOpen(!open)}
      >
        <span className="text-lg font-bold text-primary">📖 {lesson.title}</span>
        <span className="text-2xl text-primary">{open ? '▼' : '▶'}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-light-blue bg-bg p-4">
          {lesson.body && (
            <div className="whitespace-pre-wrap rounded-xl bg-white p-4 text-base leading-8 text-ink">
              {lesson.body}
            </div>
          )}

          {docs.length > 0 && <MaterialGroup title="📄 المادة الخام" items={docs} signed={signed} />}
          {slides.length > 0 && <MaterialGroup title="📊 العرض التقديمي" items={slides} signed={signed} />}
          {links.length > 0 && <MaterialGroup title="🔗 روابط خارجية" items={links} signed={signed} />}
        </div>
      )}
    </section>
  )
}

function MaterialGroup({ title, items, signed }: {
  title: string
  items: Material[]
  signed: Record<string, string | null>
}) {
  return (
    <div className="rounded-xl border border-light-blue bg-white p-4">
      <h5 className="mb-3 text-base font-bold text-primary">{title}</h5>
      <ul className="space-y-2">
        {items.map((m) => {
          const href = m.kind === 'link' ? m.url ?? '#' : signed[m.id] ?? null
          const disabled = !href
          return (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-light-blue p-3">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink">
                  {m.kind === 'link' && '🔗 '}{m.kind === 'slides' && '📊 '}{m.kind === 'document' && '📄 '}
                  {m.title}
                </div>
                {m.kind === 'link' && m.url && (
                  <div className="mt-1 break-all text-xs text-ink-muted" dir="ltr">{m.url}</div>
                )}
              </div>
              <a
                className={
                  'rounded-xl border px-4 py-2 text-sm font-semibold transition ' +
                  (disabled
                    ? 'cursor-not-allowed border-ink/20 text-ink/40'
                    : 'border-primary bg-white text-primary hover:bg-primary-soft')
                }
                href={href ?? '#'}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => { if (disabled) e.preventDefault() }}
              >
                {m.kind === 'link' ? 'فتح الرابط ↗' : 'فتح الملف'}
              </a>
            </li>
          )
        })}
      </ul>
    </div>
  )
}