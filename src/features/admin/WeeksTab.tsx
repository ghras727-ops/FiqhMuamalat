import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface Week {
  id: string
  number: number
  title: string
  summary: string | null
  published: boolean
}

interface Lesson {
  id: string
  week_id: string
  title: string
  body: string | null
  position: number
  published: boolean
}

const card = 'rounded-2xl border border-light-blue bg-white p-6'
const btn =
  'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60'
const btnOutline =
  'rounded-xl border border-primary bg-white px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-surface disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue p-2 text-ink'

export default function WeeksTab() {
  const [weeks, setWeeks] = useState<Week[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [showWeek, setShowWeek] = useState(false)
  const [wNumber, setWNumber] = useState('')
  const [wTitle, setWTitle] = useState('')
  const [wSummary, setWSummary] = useState('')

  const [lessonFor, setLessonFor] = useState<string | null>(null)
  const [lTitle, setLTitle] = useState('')
  const [lBody, setLBody] = useState('')

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const w = await supabase.from('weeks').select('id, number, title, summary, published').order('number')
    const l = await supabase
      .from('lessons')
      .select('id, week_id, title, body, position, published')
      .order('position')
    if (w.error || l.error) setError('تعذّر تحميل الأسابيع والدروس.')
    else {
      setError(null)
      setWeeks((w.data ?? []) as Week[])
      setLessons((l.data ?? []) as Lesson[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function addWeek() {
    if (!supabase) return
    const n = parseInt(wNumber, 10)
    if (!n || n < 1 || !wTitle.trim()) {
      setError('اكتب رقم الأسبوع وعنوانه.')
      return
    }
    setBusy(true)
    const { error: err } = await supabase.from('weeks').insert({
      number: n,
      title: wTitle.trim(),
      summary: wSummary.trim() || null,
    })
    setBusy(false)
    if (err) {
      setError('تعذّرت إضافة الأسبوع. ربما رقمه مستخدم من قبل.')
      return
    }
    setError(null)
    setWNumber('')
    setWTitle('')
    setWSummary('')
    setShowWeek(false)
    void load()
  }

  async function addLesson(weekId: string) {
    if (!supabase) return
    if (!lTitle.trim()) {
      setError('اكتب عنوان الدرس.')
      return
    }
    const inWeek = lessons.filter((x) => x.week_id === weekId)
    const next = inWeek.length === 0 ? 1 : Math.max(...inWeek.map((x) => x.position)) + 1
    setBusy(true)
    const { error: err } = await supabase.from('lessons').insert({
      week_id: weekId,
      title: lTitle.trim(),
      body: lBody.trim() || null,
      position: next,
    })
    setBusy(false)
    if (err) {
      setError('تعذّرت إضافة الدرس.')
      return
    }
    setError(null)
    setLTitle('')
    setLBody('')
    setLessonFor(null)
    void load()
  }

  async function togglePublish(table: 'weeks' | 'lessons', id: string, value: boolean) {
    if (!supabase) return
    const { error: err } = await supabase.from(table).update({ published: !value }).eq('id', id)
    if (err) setError('تعذّر تغيير حالة النشر.')
    else void load()
  }

  const badge = (p: boolean) =>
    'text-sm font-semibold ' + (p ? 'text-secondary' : 'text-ink/60')

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-primary">الأسابيع والدروس</h2>
          <button className={btn} onClick={() => setShowWeek((v) => !v)}>
            + إضافة أسبوع
          </button>
        </div>

        {showWeek && (
          <div className="mt-4 space-y-3">
            <div>
              <label className="text-sm font-semibold" htmlFor="wn">رقم الأسبوع</label>
              <input id="wn" type="number" min={1} className={input} value={wNumber} onChange={(e) => setWNumber(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="wt">عنوان الأسبوع</label>
              <input id="wt" type="text" className={input} value={wTitle} onChange={(e) => setWTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="ws">ملخص (اختياري)</label>
              <input id="ws" type="text" className={input} value={wSummary} onChange={(e) => setWSummary(e.target.value)} />
            </div>
            <button className={btn} onClick={addWeek} disabled={busy}>
              {busy ? 'جارٍ الحفظ...' : 'حفظ الأسبوع'}
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm font-semibold text-error">{error}</p>}
      </section>

      {loading ? (
        <section className={card}>
          <p className="text-ink/70">جارٍ التحميل...</p>
        </section>
      ) : weeks.length === 0 ? (
        <section className={card}>
          <p className="text-ink/70">لا توجد أسابيع بعد. ابدأ بإضافة الأسبوع الأول.</p>
        </section>
      ) : (
        weeks.map((w) => {
          const list = lessons.filter((x) => x.week_id === w.id)
          return (
            <section key={w.id} className={card}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-primary">
                    الأسبوع {w.number}: {w.title}
                  </h3>
                  {w.summary && <p className="mt-1 text-sm text-ink/70">{w.summary}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={badge(w.published)}>{w.published ? 'منشور' : 'مخفي'}</span>
                  <button className={btnOutline} onClick={() => togglePublish('weeks', w.id, w.published)}>
                    {w.published ? 'إخفاء' : 'نشر'}
                  </button>
                  <button className={btn} onClick={() => setLessonFor(lessonFor === w.id ? null : w.id)}>
                    + إضافة درس
                  </button>
                </div>
              </div>

              {lessonFor === w.id && (
                <div className="mt-4 space-y-3 rounded-xl border border-light-blue p-4">
                  <div>
                    <label className="text-sm font-semibold" htmlFor={'lt' + w.id}>عنوان الدرس</label>
                    <input id={'lt' + w.id} type="text" className={input} value={lTitle} onChange={(e) => setLTitle(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-semibold" htmlFor={'lb' + w.id}>محتوى الدرس</label>
                    <textarea id={'lb' + w.id} rows={6} className={input} value={lBody} onChange={(e) => setLBody(e.target.value)} />
                  </div>
                  <button className={btn} onClick={() => addLesson(w.id)} disabled={busy}>
                    {busy ? 'جارٍ الحفظ...' : 'حفظ الدرس'}
                  </button>
                </div>
              )}

              <ul className="mt-4 space-y-2">
                {list.length === 0 && <li className="text-sm text-ink/60">لا دروس في هذا الأسبوع بعد.</li>}
                {list.map((x) => (
                  <li key={x.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-light-blue/50 pb-2">
                    <span className="text-ink">{x.position}. {x.title}</span>
                    <span className="flex items-center gap-2">
                      <span className={badge(x.published)}>{x.published ? 'منشور' : 'مخفي'}</span>
                      <button className={btnOutline} onClick={() => togglePublish('lessons', x.id, x.published)}>
                        {x.published ? 'إخفاء' : 'نشر'}
                      </button>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )
        })
      )}
    </div>
  )
}
