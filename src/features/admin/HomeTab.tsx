import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const th = 'p-3 text-start text-ink-muted'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'

interface Stats {
  students: number
  weeks: number
  lessons: number
  materials: number
  questions: number
  attempts: number
  pendingEssays: number
}

interface PendingRow {
  answer_id: string
  question_text: string
  question_score: number
  student_name: string
  student_no: string | null
  activity_title: string
  week_number: number
  attempt_id: string
  submitted_at: string
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime()
  const diff = (Date.now() - d) / 1000
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`
  return new Date(iso).toLocaleDateString('ar-SA')
}

export default function HomeTab() {
  const [stats, setStats] = useState<Stats>({
    students: 0, weeks: 0, lessons: 0, materials: 0,
    questions: 0, attempts: 0, pendingEssays: 0,
  })
  const [pending, setPending] = useState<PendingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)

    const [
      stRes, wkRes, lsRes, msRes, qRes, atRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id').eq('role', 'student').eq('active', true),
      supabase.from('weeks').select('id'),
      supabase.from('lessons').select('id'),
      supabase.from('materials').select('id'),
      supabase.from('questions').select('id'),
      supabase.from('attempts').select('id'),
    ])

    // المقالي بانتظار التصحيح
    const anRes = await supabase
      .from('answers')
      .select('id, question_id, attempt_id, text_answer, awarded_score, questions(type, text, score), attempts(submitted_at, student_id, activity_id, profiles(full_name, student_no), activities(title, week_id, weeks(number)))')
      .is('awarded_score', null)
      .not('text_answer', 'is', null)

    if (stRes.error || wkRes.error || lsRes.error || msRes.error || qRes.error || atRes.error) {
      setError('تعذّر تحميل البيانات.')
      setLoading(false)
      return
    }

    let pendingList: PendingRow[] = []
    if (!anRes.error && anRes.data) {
      type AnyRec = Record<string, unknown>
      const rows = anRes.data as unknown as AnyRec[]
      pendingList = rows
        .filter((r) => {
          const q = r.questions as AnyRec | null
          const t = q?.type as string | undefined
          return t === 'essay_smart' || t === 'essay_reasoning'
        })
        .map((r) => {
          const q = (r.questions ?? {}) as AnyRec
          const at = (r.attempts ?? {}) as AnyRec
          const prof = (at.profiles ?? {}) as AnyRec
          const act = (at.activities ?? {}) as AnyRec
          const wk = (act.weeks ?? {}) as AnyRec
          return {
            answer_id: r.id as string,
            question_text: (q.text as string) ?? '—',
            question_score: (q.score as number) ?? 0,
            student_name: (prof.full_name as string) ?? '—',
            student_no: (prof.student_no as string | null) ?? null,
            activity_title: (act.title as string) ?? '—',
            week_number: (wk.number as number) ?? 0,
            attempt_id: r.attempt_id as string,
            submitted_at: (at.submitted_at as string) ?? '',
          }
        })
        .slice(0, 15)
    }

    setStats({
      students: ((stRes.data ?? []) as unknown[]).length,
      weeks: ((wkRes.data ?? []) as unknown[]).length,
      lessons: ((lsRes.data ?? []) as unknown[]).length,
      materials: ((msRes.data ?? []) as unknown[]).length,
      questions: ((qRes.data ?? []) as unknown[]).length,
      attempts: ((atRes.data ?? []) as unknown[]).length,
      pendingEssays: pendingList.length,
    })
    setPending(pendingList)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const cards = [
    { n: stats.students, label: 'طلاب مسجلون', tone: 'text-primary' },
    { n: stats.weeks, label: 'أسابيع', tone: 'text-primary' },
    { n: stats.lessons, label: 'دروس', tone: 'text-primary' },
    { n: stats.materials, label: 'مواد', tone: 'text-primary' },
    { n: stats.questions, label: 'أسئلة', tone: 'text-primary' },
    { n: stats.attempts, label: 'محاولات', tone: 'text-primary' },
    { n: stats.pendingEssays, label: 'بانتظار التصحيح', tone: stats.pendingEssays > 0 ? 'text-error' : 'text-secondary' },
  ]

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">الرئيسة</h2>
        <p className="mt-1 text-base text-white/85">
          نظرة سريعة على حالة المقرر وما يحتاج انتباهك اليوم.
        </p>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-sm font-semibold text-error">{error}</p>}

      {/* بطاقات الإحصاء */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {cards.map((s) => (
          <div key={s.label} className="rounded-2xl border border-light-blue bg-white p-4 shadow-sm">
            <div className={`text-3xl font-bold ${s.tone}`}>{s.n}</div>
            <div className="mt-1 text-xs text-ink-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* بانتظار المراجعة */}
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-bold text-primary">
            📝 بانتظار تصحيحك ({pending.length})
          </h3>
          <button className={btnOutline} onClick={() => void load()}>تحديث</button>
        </div>

        {pending.length === 0 ? (
          <p className="mt-4 rounded-xl bg-secondary-soft p-6 text-center text-base font-semibold text-secondary ring-1 ring-secondary/20">
            ✅ لا توجد إجابات مقالية بانتظار التصحيح حاليًا.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-muted">
              اضغط «تصحيح» للانتقال إلى تبويب الدرجات وفتح المحاولة.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-light-blue">
                    <th className={th}>الطالب</th>
                    <th className={th}>الرقم</th>
                    <th className={th}>الأسبوع</th>
                    <th className={th}>النشاط</th>
                    <th className={th}>السؤال</th>
                    <th className={th}>الدرجة</th>
                    <th className={th}>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((p) => (
                    <tr key={p.answer_id} className="border-b border-light-blue/50 align-top hover:bg-bg">
                      <td className="p-3 text-base font-semibold text-ink">{p.student_name}</td>
                      <td className="p-3 font-mono text-xs text-ink-muted" dir="ltr">{p.student_no ?? '—'}</td>
                      <td className="p-3">الأسبوع {p.week_number}</td>
                      <td className="p-3">{p.activity_title}</td>
                      <td className="p-3 max-w-md">
                        <div className="line-clamp-2 text-ink">{p.question_text}</div>
                      </td>
                      <td className="p-3 font-semibold text-primary">{p.question_score}</td>
                      <td className="p-3 text-xs text-ink-muted">{p.submitted_at ? timeAgo(p.submitted_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* توجيهات سريعة */}
      <section className={card}>
        <h3 className="text-lg font-bold text-primary">🔗 إجراءات سريعة</h3>
        <p className="mt-1 text-sm text-ink-muted">
          لتصحيح الإجابات المقالية، انتقل إلى تبويب «الدرجات» ثم اضغط «تصحيح» بجانب أي طالب.
        </p>
      </section>
    </div>
  )
}