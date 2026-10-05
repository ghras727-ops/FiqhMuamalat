import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import MaterialsTab from './MaterialsTab'

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
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const [w, l, m] = await Promise.all([
      supabase.from('weeks').select('id,number,title,summary,published').order('number'),
      supabase
        .from('lessons')
        .select('id,week_id,title,body,position,published')
        .order('position'),
      supabase.from('materials').select('id,week_id'),
    ])
    if (w.error || l.error || m.error) {
      setError('تعذّر تحميل البيانات.')
    } else {
      setError(null)
      setWeeks((w.data ?? []) as Week[])
      setLessons((l.data ?? []) as Lesson[])
      const c: Record<string, number> = {}
      for (const row of (m.data ?? []) as { week_id: string }[]) {
        c[row.week_id] = (c[row.week_id] ?? 0) + 1
      }
      setCounts(c)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function createWeek1() {
    if (!supabase) return
    const { error: err } = await supabase.from('weeks').insert({
      number: 1,
      title: 'الأسبوع الأول',
      summary: null,
      published: false,
    })
    if (err) setError('تعذّر إنشاء الأسبوع الأول: ' + err.message)
    else void load()
  }

  return (
    <div className="space-y-4">
      <section className={card}>
        <h2 className="text-xl font-bold text-primary">الأسابيع والدروس</h2>
        <p className="mt-1 text-sm text-ink/70">
          لكل أسبوع درس واحد ومواد متعددة. الأسبوع غير المنشور لا يراه الطالب.
        </p>
        {error && <p className="mt-3 text-sm font-semibold text-error">{error}</p>}
      </section>

      {loading ? (
        <section className={card}>
          <p className="text-ink/70">جارٍ التحميل...</p>
        </section>
      ) : weeks.length === 0 ? (
        <section className={card}>
          <p className="text-ink/70">لا توجد أسابيع بعد.</p>
          <button className={btn + ' mt-3'} onClick={createWeek1}>
            إنشاء الأسبوع الأول
          </button>
        </section>
      ) : (
        weeks.map((w) => (
          <WeekBlock
            key={w.id}
            week={w}
            lesson={lessons.find((l) => l.week_id === w.id) ?? null}
            materialCount={counts[w.id] ?? 0}
            isOpen={openId === w.id}
            onToggle={() => setOpenId(openId === w.id ? null : w.id)}
            onChanged={load}
          />
        ))
      )}
    </div>
  )
}

function WeekBlock(props: {
  week: Week
  lesson: Lesson | null
  materialCount: number
  isOpen: boolean
  onToggle: () => void
  onChanged: () => void
}) {
  const { week, lesson, materialCount, isOpen, onToggle, onChanged } = props
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [title, setTitle] = useState(week.title)
  const [summary, setSummary] = useState(week.summary ?? '')

  useEffect(() => setTitle(week.title), [week.title])
  useEffect(() => setSummary(week.summary ?? ''), [week.summary])

  async function saveWeek() {
    if (!supabase) return
    if (!title.trim()) {
      setErr('العنوان مطلوب.')
      return
    }
    setBusy(true)
    setErr(null)
    const { error } = await supabase
      .from('weeks')
      .update({ title: title.trim(), summary: summary.trim() || null })
      .eq('id', week.id)
    setBusy(false)
    if (error) setErr(error.message)
    else onChanged()
  }

  async function toggleWeekPublish() {
    if (!supabase) return
    setBusy(true)
    setErr(null)
    const { error } = await supabase
      .from('weeks')
      .update({ published: !week.published })
      .eq('id', week.id)
    setBusy(false)
    if (error) setErr(error.message)
    else onChanged()
  }

  async function createLesson() {
    if (!supabase) return
    setBusy(true)
    setErr(null)
    const { error } = await supabase.from('lessons').insert({
      week_id: week.id,
      title: week.title,
      body: null,
      position: 1,
      published: false,
    })
    setBusy(false)
    if (error) setErr(error.message)
    else onChanged()
  }

  return (
    <section className={card}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-primary">
            الأسبوع {week.number}: {week.title}
          </h3>
          <p className="mt-1 text-xs text-ink/60">
            {week.published ? 'منشور' : 'مخفي'} — {materialCount} مادة —{' '}
            {lesson ? 'درس موجود' : 'لا درس بعد'}
          </p>
        </div>
        <button className={btnOutline} onClick={onToggle}>
          {isOpen ? 'إغلاق' : 'فتح/تحرير'}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4 space-y-5">
          {err && <p className="text-sm font-semibold text-error">{err}</p>}

          <div className="rounded-xl border border-light-blue p-4 space-y-3">
            <h4 className="font-semibold text-primary">معلومات الأسبوع</h4>
            <div>
              <label className="text-sm font-semibold">العنوان</label>
              <input
                className={input}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-semibold">الملخص</label>
              <textarea
                className={input}
                rows={2}
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={btn} onClick={saveWeek} disabled={busy}>
                حفظ
              </button>
              <button className={btnOutline} onClick={toggleWeekPublish} disabled={busy}>
                {week.published ? 'إخفاء الأسبوع' : 'نشر الأسبوع'}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-light-blue p-4 space-y-3">
            <h4 className="font-semibold text-primary">الدرس</h4>
            {lesson ? (
              <LessonEditor lesson={lesson} onChanged={onChanged} />
            ) : (
              <>
                <p className="text-sm text-ink/70">لا يوجد درس بعد.</p>
                <button className={btn} onClick={createLesson} disabled={busy}>
                  إنشاء الدرس
                </button>
              </>
            )}
          </div>

          <div className="rounded-xl border border-light-blue p-4">
            <h4 className="font-semibold text-primary mb-3">مواد الأسبوع</h4>
            <MaterialsTab weekId={week.id} />
          </div>
        </div>
      )}
    </section>
  )
}

function LessonEditor({
  lesson,
  onChanged,
}: {
  lesson: Lesson
  onChanged: () => void
}) {
  const [title, setTitle] = useState(lesson.title)
  const [body, setBody] = useState(lesson.body ?? '')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => setTitle(lesson.title), [lesson.title])
  useEffect(() => setBody(lesson.body ?? ''), [lesson.body])

  async function save() {
    if (!supabase) return
    if (!title.trim()) {
      setErr('عنوان الدرس مطلوب.')
      return
    }
    setBusy(true)
    setErr(null)
    const { error } = await supabase
      .from('lessons')
      .update({ title: title.trim(), body: body.trim() || null })
      .eq('id', lesson.id)
    setBusy(false)
    if (error) setErr(error.message)
    else onChanged()
  }

  async function togglePublish() {
    if (!supabase) return
    setBusy(true)
    setErr(null)
    const { error } = await supabase
      .from('lessons')
      .update({ published: !lesson.published })
      .eq('id', lesson.id)
    setBusy(false)
    if (error) setErr(error.message)
    else onChanged()
  }

  return (
    <div className="space-y-3">
      {err && <p className="text-sm font-semibold text-error">{err}</p>}
      <div>
        <label className="text-sm font-semibold">عنوان الدرس</label>
        <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className="text-sm font-semibold">نص الدرس</label>
        <textarea
          className={input}
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button className={btn} onClick={save} disabled={busy}>
          حفظ
        </button>
        <button className={btnOutline} onClick={togglePublish} disabled={busy}>
          {lesson.published ? 'إخفاء الدرس' : 'نشر الدرس'}
        </button>
      </div>
    </div>
  )
}