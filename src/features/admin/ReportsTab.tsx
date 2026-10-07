import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink'
const th = 'p-3 text-start text-ink-muted'

interface Student { id: string; full_name: string; student_no: string | null }
interface Week { id: string; number: number; title: string }
interface Activity { id: string; title: string; week_id: string }
interface AttemptRaw {
  id: string
  activity_id: string
  student_id: string
  auto_score: number
  manual_score: number | null
  status: string
  submitted_at: string
}
interface AQ { activity_id: string; question_id: string }
interface QScore { id: string; score: number }

interface StudentRow {
  student: Student
  attempts: {
    attempt: AttemptRaw
    activity: Activity
    week_number: number
    total_possible: number
  }[]
}

interface GroupRow {
  activity: Activity
  week_number: number
  total_possible: number
  attempts_count: number
  avg_score: number
  avg_percent: number
  raw_percent: number
}

function barColor(p: number) {
  if (p < 50) return 'bg-error'
  if (p < 70) return 'bg-warning'
  return 'bg-secondary'
}

function pctSafe(value: number): number {
  return Math.min(100, Math.max(0, Math.round(value)))
}

export default function ReportsTab() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [studentRows, setStudentRows] = useState<StudentRow[]>([])
  const [groupRows, setGroupRows] = useState<GroupRow[]>([])
  const [selectedId, setSelectedId] = useState<string>('')

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)

    const stRes = await supabase
      .from('profiles')
      .select('id,full_name,student_no')
      .eq('role', 'student')
      .order('student_no', { ascending: true })

    if (stRes.error) {
      setError('تعذّر تحميل الطلاب: ' + stRes.error.message)
      setLoading(false)
      return
    }
    const stList = (stRes.data ?? []) as Student[]
    setStudents(stList)
    if (stList.length > 0) setSelectedId((prev) => prev || stList[0].id)

    const atRes = await supabase
      .from('attempts')
      .select('id,activity_id,student_id,auto_score,manual_score,status,submitted_at')
      .order('submitted_at', { ascending: false })

    if (atRes.error) {
      setError('تعذّر تحميل المحاولات: ' + atRes.error.message)
      setLoading(false)
      return
    }
    const attempts = (atRes.data ?? []) as AttemptRaw[]

    const actIds = Array.from(new Set(attempts.map((a) => a.activity_id)))
    const actMap: Record<string, Activity> = {}
    const weekMap: Record<string, Week> = {}
    if (actIds.length > 0) {
      const acRes = await supabase.from('activities').select('id,title,week_id').in('id', actIds)
      for (const a of (acRes.data ?? []) as Activity[]) actMap[a.id] = a
      const wIds = Array.from(new Set(Object.values(actMap).map((a) => a.week_id)))
      if (wIds.length > 0) {
        const wRes = await supabase.from('weeks').select('id,number,title').in('id', wIds)
        for (const w of (wRes.data ?? []) as Week[]) weekMap[w.id] = w
      }
    }

    const totalByAct: Record<string, number> = {}
    if (actIds.length > 0) {
      const aqRes = await supabase
        .from('activity_questions')
        .select('activity_id,question_id')
        .in('activity_id', actIds)
      const qIds = Array.from(new Set(((aqRes.data ?? []) as AQ[]).map((x) => x.question_id)))
      const qRes = qIds.length > 0
        ? await supabase.from('questions').select('id,score').in('id', qIds)
        : { data: [] as QScore[], error: null }
      const scoreMap: Record<string, number> = {}
      for (const q of (qRes.data ?? []) as QScore[]) scoreMap[q.id] = q.score
      for (const link of (aqRes.data ?? []) as AQ[]) {
        totalByAct[link.activity_id] = (totalByAct[link.activity_id] ?? 0) + (scoreMap[link.question_id] ?? 0)
      }
    }

    const byStudent: Record<string, AttemptRaw[]> = {}
    for (const a of attempts) (byStudent[a.student_id] ??= []).push(a)

    const rows: StudentRow[] = stList.map((s) => ({
      student: s,
      attempts: (byStudent[s.id] ?? []).map((at) => {
        const act = actMap[at.activity_id]
        return {
          attempt: at,
          activity: act ?? { id: at.activity_id, title: '—', week_id: '' },
          week_number: act ? (weekMap[act.week_id]?.number ?? 0) : 0,
          total_possible: totalByAct[at.activity_id] ?? 0,
        }
      }),
    }))
    setStudentRows(rows)

    const byActivity: Record<string, AttemptRaw[]> = {}
    for (const a of attempts) (byActivity[a.activity_id] ??= []).push(a)

    const gRows: GroupRow[] = Object.entries(byActivity).map(([aid, list]) => {
      const act = actMap[aid] ?? { id: aid, title: '—', week_id: '' }
      const total = totalByAct[aid] ?? 0
      const avg = list.length === 0 ? 0 : list.reduce((t, r) => t + r.auto_score + (r.manual_score ?? 0), 0) / list.length
      const rawPercent = total === 0 ? 0 : (avg / total) * 100
      return {
        activity: act,
        week_number: act.week_id ? (weekMap[act.week_id]?.number ?? 0) : 0,
        total_possible: total,
        attempts_count: list.length,
        avg_score: avg,
        avg_percent: pctSafe(rawPercent),
        raw_percent: Math.round(rawPercent),
      }
    }).sort((a, b) => a.week_number - b.week_number)
    setGroupRows(gRows)

    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>

  const selected = studentRows.find((r) => r.student.id === selectedId)

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">التقارير</h2>
        <p className="mt-1 text-base text-white/85">تقارير فردية وجماعية للطلاب الحقيقيين.</p>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-base font-semibold text-error">{error}</p>}

      {/* تقرير فردي */}
      <section className={card}>
        <h3 className="text-xl font-bold text-primary">تقرير فردي</h3>

        {students.length === 0 ? (
          <p className="mt-4 rounded-xl bg-bg p-6 text-center text-base text-ink-muted">لا يوجد طلاب بعد.</p>
        ) : (
          <>
            <div className="mt-3 flex flex-wrap items-end gap-3">
              <div className="w-full max-w-sm">
                <label className="text-sm font-semibold text-ink">الطالب</label>
                <select className={input} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
                  {students.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.full_name}{s.student_no ? ` (${s.student_no})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <button className={btnOutline} onClick={() => void load()}>تحديث</button>
            </div>

            {!selected || selected.attempts.length === 0 ? (
              <p className="mt-4 rounded-xl bg-bg p-6 text-center text-base text-ink-muted">
                لا توجد محاولات لهذا الطالب بعد.
              </p>
            ) : (
              <>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <span className="rounded-xl bg-primary-soft px-4 py-2 font-semibold text-primary">{selected.student.full_name}</span>
                  {selected.student.student_no && (
                    <span className="rounded-xl bg-bg px-4 py-2 font-mono text-ink-muted" dir="ltr">{selected.student.student_no}</span>
                  )}
                  <span className="rounded-xl bg-secondary-soft px-4 py-2 font-semibold text-secondary">
                    {selected.attempts.length} محاولة
                  </span>
                </div>

                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-light-blue">
                        <th className={th}>الأسبوع</th>
                        <th className={th}>النشاط</th>
                        <th className={th}>آلية</th>
                        <th className={th}>يدوية</th>
                        <th className={th}>المجموع</th>
                        <th className={th}>النسبة</th>
                        <th className={th}>الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.attempts.map(({ attempt, activity, week_number, total_possible }) => {
                        const rawTotal = attempt.auto_score + (attempt.manual_score ?? 0)
                        const cappedTotal = Math.min(rawTotal, total_possible)
                        const overflow = rawTotal > total_possible
                        const rawPct = total_possible === 0 ? 0 : Math.round((rawTotal / total_possible) * 100)
                        const pct = pctSafe(rawPct)
                        return (
                          <tr key={attempt.id} className="border-b border-light-blue/50 hover:bg-bg">
                            <td className="p-3">الأسبوع {week_number}</td>
                            <td className="p-3 text-base font-semibold text-ink">{activity.title}</td>
                            <td className="p-3 font-semibold text-primary">{attempt.auto_score}</td>
                            <td className="p-3">{attempt.manual_score ?? '—'}</td>
                            <td className="p-3 text-lg font-bold text-secondary" dir="ltr">
                              {cappedTotal.toFixed(1)} / {total_possible}
                            </td>
                            <td className="p-3 font-semibold">
                              {overflow
                                ? <span className="rounded-lg bg-error-soft px-2 py-0.5 text-error ring-1 ring-error/20">⚠ {rawPct}%</span>
                                : `${pct}%`}
                            </td>
                            <td className="p-3">
                              {attempt.status === 'graded'
                                ? <span className="rounded-lg bg-secondary-soft px-2 py-0.5 text-xs font-semibold text-secondary ring-1 ring-secondary/20">مصحح</span>
                                : attempt.status === 'submitted'
                                  ? <span className="rounded-lg bg-warning-soft px-2 py-0.5 text-xs font-semibold text-ink ring-1 ring-warning">بانتظار التصحيح</span>
                                  : <span className="rounded-lg bg-ink/10 px-2 py-0.5 text-xs font-semibold text-ink-muted">قيد الإجابة</span>}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </>
        )}
      </section>

      {/* تقرير جماعي */}
      <section className={card}>
        <h3 className="text-xl font-bold text-primary">تقرير جماعي — حسب النشاط</h3>

        {groupRows.length === 0 ? (
          <p className="mt-4 rounded-xl bg-bg p-6 text-center text-base text-ink-muted">لا محاولات بعد.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-blue">
                  <th className={th}>الأسبوع</th>
                  <th className={th}>النشاط</th>
                  <th className={th}>عدد المؤدّين</th>
                  <th className={th}>المتوسط</th>
                  <th className={th}>النسبة</th>
                  <th className={th}>الشريط</th>
                </tr>
              </thead>
              <tbody>
                {groupRows.map((g) => (
                  <tr key={g.activity.id} className="border-b border-light-blue/50 hover:bg-bg">
                    <td className="p-3">الأسبوع {g.week_number}</td>
                    <td className="p-3 text-base font-semibold text-ink">{g.activity.title}</td>
                    <td className="p-3">{g.attempts_count}</td>
                    <td className="p-3" dir="ltr">
                      {Math.min(g.avg_score, g.total_possible).toFixed(1)} / {g.total_possible}
                    </td>
                    <td className="p-3 font-semibold">
                      {g.raw_percent > 100
                        ? <span className="rounded-lg bg-error-soft px-2 py-0.5 text-error ring-1 ring-error/20">⚠ {g.raw_percent}%</span>
                        : `${g.avg_percent}%`}
                    </td>
                    <td className="p-3 w-40">
                      <div className="h-3 overflow-hidden rounded-full bg-surface">
                        <div className={'h-full ' + barColor(g.avg_percent)} style={{ width: g.avg_percent + '%' }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}