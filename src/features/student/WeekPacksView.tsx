import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { card } from '../../components/ui'

interface Week {
  id: string
  number: number
  title: string
  summary: string | null
}

interface Lesson {
  id: string
  week_id: string
  title: string
  body: string | null
  position: number
}

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

function kindLabel(k: Kind): string {
  if (k === 'slides') return 'عرض تقديمي'
  if (k === 'document') return 'مستند'
  return 'رابط'
}

export default function WeekPacksView() {
  const [weeks, setWeeks] = useState<Week[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [signed, setSigned] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openLesson, setOpenLesson] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      const [w, l, m] = await Promise.all([
        supabase.from('weeks').select('id,number,title,summary').order('number'),
        supabase
          .from('lessons')
          .select('id,week_id,title,body,position')
          .order('position'),
        supabase
          .from('materials')
          .select(
            'id,week_id,lesson_id,title,kind,view_path,download_path,url,position',
          )
          .order('position'),
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
        if (!path) {
          next[mat.id] = null
          continue
        }
        const { data } = await supabase.storage
          .from('course-files')
          .createSignedUrl(path, 3600)
        next[mat.id] = data?.signedUrl ?? null
      }
      if (cancelled) return
      setSigned(next)
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  if (loading) {
    return (
      <section className={card}>
        <p className="text-ink/70">جارٍ التحميل...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className={card}>
        <p className="text-sm font-semibold text-error">{error}</p>
      </section>
    )
  }

  if (weeks.length === 0) {
    return (
      <section className={card}>
        <p className="text-ink/70">لم يُنشر أي أسبوع بعد.</p>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold text-primary">دروس الأسابيع</h2>

      {weeks.map((w) => {
        const wLessons = lessons.filter((l) => l.week_id === w.id)
        const wMaterials = materials.filter((m) => m.week_id === w.id)
        return (
          <section key={w.id} className={card}>
            <h3 className="text-lg font-bold text-primary">
              الأسبوع {w.number}: {w.title}
            </h3>
            {w.summary && <p className="mt-1 text-sm text-ink/70">{w.summary}</p>}

            {wLessons.length > 0 && (
              <ul className="mt-4 space-y-2">
                {wLessons.map((l) => (
                  <li key={l.id} className="rounded-xl bg-surface p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">{l.title}</span>
                      <button
                        className="rounded-xl border border-primary bg-white px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-surface"
                        onClick={() => setOpenLesson(openLesson === l.id ? null : l.id)}
                      >
                        {openLesson === l.id ? 'إغلاق' : 'عرض الدرس'}
                      </button>
                    </div>
                    {openLesson === l.id && l.body && (
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-ink/80">
                        {l.body}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {wMaterials.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 text-sm font-semibold text-ink/70">مواد الأسبوع</div>
                <ul className="space-y-2">
                  {wMaterials.map((m) => {
                    const href =
                      m.kind === 'link' ? m.url ?? '#' : signed[m.id] ?? null
                    const disabled = !href
                    return (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-light-blue p-3 text-sm"
                      >
                        <div>
                          <span className="rounded bg-surface px-2 py-0.5 text-xs">
                            {kindLabel(m.kind)}
                          </span>{' '}
                          <span className="font-semibold">{m.title}</span>
                        </div>
                        <a
                          className={
                            'rounded-xl border px-3 py-1.5 text-sm font-semibold transition ' +
                            (disabled
                              ? 'cursor-not-allowed border-ink/20 text-ink/40'
                              : 'border-primary bg-white text-primary hover:bg-surface')
                          }
                          href={href ?? '#'}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => {
                            if (disabled) e.preventDefault()
                          }}
                        >
                          {m.kind === 'link' ? 'فتح الرابط' : 'فتح الملف'}
                        </a>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </section>
        )
      })}
    </div>
  )
}