import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btnDanger = 'rounded-xl border border-error bg-white px-4 py-2 text-sm font-semibold text-error hover:bg-error-soft disabled:opacity-60'
const btnSuccess = 'rounded-xl bg-secondary px-5 py-2.5 text-base font-semibold text-white shadow-sm hover:bg-secondary-hover disabled:opacity-60'
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
interface ExistingReport {
  id: string
  student_id: string
  from_week_number: number
  to_week_number: number
  type: string
  report_number: string | null
  approved_at: string
  status: string
  teacher_note: string | null
  seen_at: string | null
}

interface StudentAttemptRow {
  week_number: number
  week_title: string
  activity_id: string | null
  activity_title: string | null
  total_possible: number
  has_attempt: boolean
  auto_score: number
  manual_score: number
  final_score: number
  percent: number
  status: string | null
  submitted_at: string | null
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`
  return new Date(iso).toLocaleDateString('ar-SA')
}

export default function ReportsTab() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [students, setStudents] = useState<Student[]>([])
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string>('')

  const [weeks, setWeeks] = useState<Week[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [attempts, setAttempts] = useState<AttemptRaw[]>([])
  const [totalsByActivity, setTotalsByActivity] = useState<Record<string, number>>({})

  const [fromWeek, setFromWeek] = useState<number>(1)
  const [toWeek, setToWeek] = useState<number>(1)
  const [teacherNote, setTeacherNote] = useState('')

  const [reports, setReports] = useState<ExistingReport[]>([])
  const [busy, setBusy] = useState(false)

  const loadBaseData = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)

    const [stRes, wkRes, acRes, atRes] = await Promise.all([
      supabase.from('profiles').select('id,full_name,student_no').eq('role', 'student').order('student_no', { ascending: true }),
      supabase.from('weeks').select('id,number,title').order('number'),
      supabase.from('activities').select('id,title,week_id'),
      supabase.from('attempts').select('id,activity_id,student_id,auto_score,manual_score,status,submitted_at'),
    ])

    if (stRes.error || wkRes.error || acRes.error || atRes.error) {
      setError('تعذّر تحميل البيانات.')
      setLoading(false)
      return
    }

    const stList = (stRes.data ?? []) as Student[]
    setStudents(stList)
    if (stList.length > 0) setSelectedId((prev) => prev || stList[0].id)

    const wkList = (wkRes.data ?? []) as Week[]
    setWeeks(wkList)
    setActivities((acRes.data ?? []) as Activity[])
    setAttempts((atRes.data ?? []) as AttemptRaw[])

    const maxWeek = wkList.length > 0 ? Math.max(...wkList.map((w) => w.number)) : 1
    setToWeek(maxWeek)

    // حساب الدرجة الكلية لكل نشاط
    const actIds = ((acRes.data ?? []) as Activity[]).map((a) => a.id)
    const totals: Record<string, number> = {}
    if (actIds.length > 0) {
      const aqRes = await supabase.from('activity_questions').select('activity_id,question_id').in('activity_id', actIds)
      const qIds = Array.from(new Set(((aqRes.data ?? []) as { question_id: string }[]).map((x) => x.question_id)))
      const qRes = qIds.length > 0
        ? await supabase.from('questions').select('id,score').in('id', qIds)
        : { data: [] as { id: string; score: number }[], error: null }
      const scoreMap: Record<string, number> = {}
      for (const q of (qRes.data ?? []) as { id: string; score: number }[]) scoreMap[q.id] = q.score
      for (const link of (aqRes.data ?? []) as { activity_id: string; question_id: string }[]) {
        totals[link.activity_id] = (totals[link.activity_id] ?? 0) + (scoreMap[link.question_id] ?? 0)
      }
    }
    setTotalsByActivity(totals)
    setLoading(false)
  }, [])

  useEffect(() => { void loadBaseData() }, [loadBaseData])

  const loadReports = useCallback(async () => {
    if (!supabase || !selectedId) return
    const { data, error: err } = await supabase
      .from('weekly_reports')
      .select('id,student_id,from_week_number,to_week_number,type,report_number,approved_at,status,teacher_note,seen_at')
      .eq('student_id', selectedId)
      .order('approved_at', { ascending: false })
    if (err) return
    setReports((data ?? []) as ExistingReport[])
  }, [selectedId])

  useEffect(() => { void loadReports() }, [loadReports])

  function buildStudentRows(studentId: string): StudentAttemptRow[] {
    const rows: StudentAttemptRow[] = []
    for (const w of weeks) {
      const act = activities.find((a) => a.week_id === w.id)
      const total = act ? (totalsByActivity[act.id] ?? 0) : 0
      const attempt = act ? attempts.find((t) => t.activity_id === act.id && t.student_id === studentId) : null
      const auto = attempt?.auto_score ?? 0
      const manual = attempt?.manual_score ?? 0
      const final = auto + manual
      const percent = total > 0 ? Math.round((final / total) * 100) : 0
      rows.push({
        week_number: w.number,
        week_title: w.title,
        activity_id: act?.id ?? null,
        activity_title: act?.title ?? null,
        total_possible: total,
        has_attempt: !!attempt,
        auto_score: auto,
        manual_score: manual,
        final_score: final,
        percent,
        status: attempt?.status ?? null,
        submitted_at: attempt?.submitted_at ?? null,
      })
    }
    return rows
  }

  async function approveReport() {
    if (!supabase || !selectedId) return
    if (fromWeek > toWeek) { setError('المدى غير صحيح.'); return }
    const student = students.find((s) => s.id === selectedId)
    const type = fromWeek === toWeek ? 'أسبوعي' : 'تراكمي'
    const msg = `إصدار تقرير ${type} للطالب «${student?.full_name}» من الأسبوع ${fromWeek} إلى الأسبوع ${toWeek}؟\n\nسيظهر للطالب فورًا في «درجاتي».`
    if (!window.confirm(msg)) return

    setBusy(true); setError(null); setSuccess(null)
    const { error: rpcErr } = await supabase.rpc('approve_weekly_report', {
      p_student_id: selectedId,
      p_from_week: fromWeek,
      p_to_week: toWeek,
      p_teacher_note: teacherNote.trim() || null,
    })
    setBusy(false)

    if (rpcErr) { setError('فشل الإصدار: ' + rpcErr.message); return }
    setSuccess(`تم إصدار التقرير بنجاح وظهر للطالب.`)
    setTeacherNote('')
    await loadReports()
  }

  async function revokeReport(reportId: string, reportNumber: string | null) {
    if (!supabase) return
    const reason = window.prompt(
      `إلغاء التقرير ${reportNumber ?? ''}؟\n\nاكتب سبب الإلغاء (اختياري):`,
      ''
    )
    if (reason === null) return

    setBusy(true); setError(null); setSuccess(null)
    const { error: rpcErr } = await supabase.rpc('revoke_report', {
      p_report_id: reportId,
      p_reason: reason.trim() || null,
    })
    setBusy(false)
    if (rpcErr) { setError('فشل الإلغاء: ' + rpcErr.message); return }
    setSuccess('تم إلغاء التقرير. يمكنك إصدار تقرير جديد.')
    await loadReports()
  }

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>

  const selected = students.find((s) => s.id === selectedId)
  const filteredStudents = query.trim().length === 0
    ? students
    : students.filter((s) => s.full_name.includes(query) || (s.student_no ?? '').includes(query))

  const studentRows = selectedId ? buildStudentRows(selectedId) : []
  const activeReports = reports.filter((r) => r.status === 'active')
  const revokedReports = reports.filter((r) => r.status === 'revoked')

  // إجماليات المدى المحدد
  const inRange = studentRows.filter((r) => r.week_number >= fromWeek && r.week_number <= toWeek)
  const sumTotal = inRange.reduce((s, r) => s + (r.has_attempt ? r.total_possible : 0), 0)
  const sumScore = inRange.reduce((s, r) => s + (r.has_attempt ? r.final_score : 0), 0)
  const sumPercent = sumTotal > 0 ? Math.round((sumScore / sumTotal) * 100) : 0

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">التقارير</h2>
        <p className="mt-1 text-base text-white/85">إصدار تقارير أكاديمية رسمية واعتمادها للطلاب.</p>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-base font-semibold text-error">{error}</p>}
      {success && <p className="rounded-xl bg-secondary-soft p-3 text-base font-semibold text-secondary ring-1 ring-secondary/20">{success}</p>}

      {/* قسم إصدار التقارير */}
      <section className={card}>
        <h3 className="text-xl font-bold text-primary">📄 إصدار تقرير رسمي</h3>
        <p className="mt-1 text-sm text-ink-muted">
          اختر الطالب والمدى الزمني، ثم اعتمد التقرير ليظهر للطالب في «درجاتي».
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-ink">بحث بالاسم أو الرقم</label>
            <input
              className={input}
              placeholder="اكتب للبحث..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-ink">الطالب</label>
            <select className={input} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}{s.student_no ? ` (${s.student_no})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selected && (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-primary-soft/40 p-3 text-sm">
              <span className="rounded-lg bg-primary-soft px-3 py-1 font-semibold text-primary">{selected.full_name}</span>
              {selected.student_no && (
                <span className="rounded-lg bg-bg px-3 py-1 font-mono text-ink-muted" dir="ltr">{selected.student_no}</span>
              )}
              <span className="text-ink-muted">— {studentRows.filter((r) => r.has_attempt).length} أسبوع بمحاولة</span>
            </div>

            {/* جدول أسابيع الطالب */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-light-blue">
                    <th className={th}>الأسبوع</th>
                    <th className={th}>العنوان</th>
                    <th className={th}>الحالة</th>
                    <th className={th}>الدرجة</th>
                    <th className={th}>النسبة</th>
                    <th className={th}>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRows.map((r) => (
                    <tr
                      key={r.week_number}
                      className={
                        'border-b border-light-blue/50 ' +
                        (r.week_number >= fromWeek && r.week_number <= toWeek ? 'bg-accent-soft/20' : '')
                      }
                    >
                      <td className="p-3 font-semibold">الأسبوع {r.week_number}</td>
                      <td className="p-3">{r.week_title}</td>
                      <td className="p-3">
                        {!r.has_attempt ? (
                          <span className="rounded-lg bg-bg px-2 py-0.5 text-xs text-ink-muted">لا محاولة</span>
                        ) : r.status === 'graded' ? (
                          <span className="rounded-lg bg-secondary-soft px-2 py-0.5 text-xs font-semibold text-secondary ring-1 ring-secondary/20">مصحح</span>
                        ) : r.status === 'submitted' ? (
                          <span className="rounded-lg bg-warning-soft px-2 py-0.5 text-xs font-semibold text-ink ring-1 ring-warning">بانتظار التصحيح</span>
                        ) : (
                          <span className="rounded-lg bg-ink/10 px-2 py-0.5 text-xs font-semibold text-ink-muted">مسودة</span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-primary" dir="ltr">
                        {r.has_attempt ? <>{r.final_score} / {r.total_possible}</> : '—'}
                      </td>
                      <td className="p-3 font-semibold">
                        {r.has_attempt ? `${r.percent}%` : '—'}
                      </td>
                      <td className="p-3 text-xs text-ink-muted">
                        {r.submitted_at ? timeAgo(r.submitted_at) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* اختيار المدى + ملاحظة */}
            <div className="mt-5 rounded-xl border border-light-blue bg-bg p-4">
              <h4 className="text-base font-bold text-primary">إصدار التقرير</h4>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <div>
                  <label className="text-sm font-semibold text-ink">من الأسبوع</label>
                  <input
                    type="number"
                    min={1}
                    max={weeks.length}
                    className={input}
                    value={fromWeek}
                    onChange={(e) => setFromWeek(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-ink">إلى الأسبوع</label>
                  <input
                    type="number"
                    min={1}
                    max={weeks.length}
                    className={input}
                    value={toWeek}
                    onChange={(e) => setToWeek(parseInt(e.target.value, 10) || 1)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-ink">نوع التقرير (تلقائي)</label>
                  <div className="mt-1 rounded-xl bg-white px-3 py-2 text-base font-semibold text-primary">
                    {fromWeek === toWeek
                      ? `أسبوعي — الأسبوع ${fromWeek}`
                      : `تراكمي — من ${fromWeek} إلى ${toWeek} (${sumScore} / ${sumTotal} = ${sumPercent}%)`}
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <label className="text-sm font-semibold text-ink">ملاحظة الأستاذ (اختيارية — ستظهر في التقرير)</label>
                <textarea
                  rows={2}
                  className={input}
                  placeholder="مثال: أحسنت، واصل هذا التميز."
                  value={teacherNote}
                  onChange={(e) => setTeacherNote(e.target.value)}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-3">
                <button className={btnSuccess} onClick={() => void approveReport()} disabled={busy}>
                  {busy ? 'جارٍ الإصدار...' : '✓ اعتماد وإرسال للطالب'}
                </button>
              </div>
            </div>

            {/* قائمة التقارير الصادرة */}
            {activeReports.length > 0 && (
              <div className="mt-5">
                <h4 className="text-base font-bold text-primary">📋 التقارير المعتمدة</h4>
                <ul className="mt-2 space-y-2">
                  {activeReports.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-light-blue bg-white p-3">
                      <div>
                        <div className="font-semibold text-ink">
                          {r.type === 'weekly' ? `أسبوعي — الأسبوع ${r.from_week_number}` : `تراكمي — الأسابيع ${r.from_week_number} إلى ${r.to_week_number}`}
                          {r.report_number && <span className="ms-2 rounded bg-bg px-2 py-0.5 font-mono text-xs text-ink-muted" dir="ltr">{r.report_number}</span>}
                        </div>
                        <div className="text-xs text-ink-muted">
                          أُصدر {timeAgo(r.approved_at)}
                          {r.seen_at ? ' — ✓ رآه الطالب' : ' — ⏳ لم يره بعد'}
                        </div>
                        {r.teacher_note && (
                          <div className="mt-1 text-xs text-ink-muted">ملاحظة: {r.teacher_note}</div>
                        )}
                      </div>
                      <button className={btnDanger} onClick={() => void revokeReport(r.id, r.report_number)} disabled={busy}>
                        إلغاء التقرير
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {revokedReports.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-ink-muted">
                  تقارير ملغاة ({revokedReports.length})
                </summary>
                <ul className="mt-2 space-y-1 text-xs text-ink-muted">
                  {revokedReports.map((r) => (
                    <li key={r.id}>
                      {r.type === 'weekly' ? `الأسبوع ${r.from_week_number}` : `تراكمي ${r.from_week_number}–${r.to_week_number}`}
                      {' — '}{timeAgo(r.approved_at)}
                      {r.report_number && <> — <span dir="ltr">{r.report_number}</span></>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </section>

      {/* ملاحظة توضيحية */}
      <section className="rounded-2xl border border-accent bg-accent-soft/30 p-4 text-sm text-ink">
        <b className="text-primary">💡 كيف يعمل؟</b>
        <ul className="mt-2 ms-5 list-disc space-y-1">
          <li>اختر الطالب، ثم حدد «من الأسبوع» و«إلى الأسبوع».</li>
          <li>لو كان المدى أسبوعًا واحدًا → التقرير أسبوعي. لو أكثر → تراكمي.</li>
          <li>اضغط «اعتماد وإرسال» → يظهر للطالب فورًا في تبويب «درجاتي» مع إشعار.</li>
          <li>التقرير يحفظ نسخة مجمّدة (snapshot) — لا تتغير حتى لو تغيرت الدرجات لاحقًا.</li>
          <li>يمكنك إلغاء أي تقرير — عندها يختفي من الطالب ويمكنك إصدار تقرير جديد.</li>
        </ul>
      </section>
    </div>
  )
}