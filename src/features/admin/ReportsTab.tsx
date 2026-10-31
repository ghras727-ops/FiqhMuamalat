import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import WeeklyReport, { type ReportSnapshot } from '../shared/WeeklyReport'
import InstitutionalReport, { type InstitutionalSnapshot } from '../shared/InstitutionalReport'
import ComprehensiveReport, { type ComprehensiveSnapshot } from '../shared/ComprehensiveReport'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const btnDanger = 'rounded-xl border border-error bg-white px-4 py-2 text-sm font-semibold text-error hover:bg-error-soft disabled:opacity-60'
const btnSuccess = 'rounded-xl bg-secondary px-5 py-2.5 text-base font-semibold text-white shadow-sm hover:bg-secondary-hover disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink'
const th = 'p-3 text-start text-ink-muted'

interface Student { id: string; full_name: string; student_no: string | null }
interface Week { id: string; number: number; title: string }
interface Activity { id: string; title: string; week_id: string }
interface AttemptRaw {
  id: string; activity_id: string; student_id: string
  auto_score: number; manual_score: number | null
  status: string; submitted_at: string
}
interface ExistingReport {
  id: string; student_id: string
  from_week_number: number; to_week_number: number
  type: string; report_number: string | null
  approved_at: string; status: string
  teacher_note: string | null; seen_at: string | null
  snapshot: ReportSnapshot
}

interface StudentAttemptRow {
  week_number: number; week_title: string
  activity_id: string | null; activity_title: string | null
  total_possible: number; has_attempt: boolean
  auto_score: number; manual_score: number; final_score: number
  percent: number; status: string | null; submitted_at: string | null
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`
  return new Date(iso).toLocaleDateString('ar-SA-u-nu-latn')
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
  const [totalsByAttempt, setTotalsByAttempt] = useState<Record<string, number>>({})

  const [fromWeek, setFromWeek] = useState<number>(1)
  const [toWeek, setToWeek] = useState<number>(1)
  const [teacherNote, setTeacherNote] = useState('')

  const [reports, setReports] = useState<ExistingReport[]>([])
  const [busy, setBusy] = useState(false)

  const [instSnapshot, setInstSnapshot] = useState<InstitutionalSnapshot | null>(null)
  const [instFromWeek, setInstFromWeek] = useState(1)
  const [instToWeek, setInstToWeek] = useState(7)
  const [instBusy, setInstBusy] = useState(false)

  const [showComprehensive, setShowComprehensive] = useState(false)
  const [compSnapshot, setCompSnapshot] = useState<ComprehensiveSnapshot | null>(null)
  const [compStudentId, setCompStudentId] = useState('')
  const [compOptions, setCompOptions] = useState({ grades: true, attendance: true })
  const [compBusy, setCompBusy] = useState(false)

  const [preview, setPreview] = useState<{
    snapshot: ReportSnapshot
    reportNumber: string | null
    approvedAt: string
    teacherNote: string | null
    mode: 'new' | 'existing'
    reportId?: string
  } | null>(null)

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
      setLoading(false); return
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

    const atList = (atRes.data ?? []) as AttemptRaw[]
    const attemptIds = atList.map(a => a.id)
    const totals: Record<string, number> = {}
    
    if (attemptIds.length > 0) {
      const aqRes = await supabase.from('attempt_questions').select('attempt_id,question_id').in('attempt_id', attemptIds)
      const qIds = Array.from(new Set(((aqRes.data ?? []) as { question_id: string }[]).map((x) => x.question_id)))
      const qRes = qIds.length > 0
        ? await supabase.from('questions').select('id,score').in('id', qIds)
        : { data: [] as { id: string; score: number }[], error: null }
      const scoreMap: Record<string, number> = {}
      for (const q of (qRes.data ?? []) as { id: string; score: number }[]) scoreMap[q.id] = q.score
      
      for (const link of (aqRes.data ?? []) as { attempt_id: string; question_id: string }[]) {
        totals[link.attempt_id] = (totals[link.attempt_id] ?? 0) + (scoreMap[link.question_id] ?? 0)
      }
    }
    setTotalsByAttempt(totals)
    setLoading(false)
  }, [])

  useEffect(() => { void loadBaseData() }, [loadBaseData])

  const loadReports = useCallback(async () => {
    if (!supabase || !selectedId) return
    const { data, error: err } = await supabase
      .from('weekly_reports')
      .select('id,student_id,from_week_number,to_week_number,type,report_number,approved_at,status,teacher_note,seen_at,snapshot')
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
      const attempt = act ? attempts.find((t) => t.activity_id === act.id && t.student_id === studentId) : null
      const total = attempt ? (totalsByAttempt[attempt.id] ?? 0) : 0
      const auto = attempt?.auto_score ?? 0
      const manual = attempt?.manual_score ?? 0
      const final = auto + manual
      const percent = total > 0 ? Math.round((final / total) * 100) : 0
      rows.push({
        week_number: w.number, week_title: w.title,
        activity_id: act?.id ?? null, activity_title: act?.title ?? null,
        total_possible: total, has_attempt: !!attempt,
        auto_score: auto, manual_score: manual, final_score: final,
        percent, status: attempt?.status ?? null,
        submitted_at: attempt?.submitted_at ?? null,
      })
    }
    return rows
  }

  function buildPreviewSnapshot(studentId: string, from: number, to: number): ReportSnapshot {
    const student = students.find((s) => s.id === studentId)!
    const rows = buildStudentRows(studentId).filter((r) => r.week_number >= from && r.week_number <= to)

    let sumTotal = 0
    let sumScore = 0
    const weekEntries = rows.map((r) => {
      let classCount = 0
      let classAvg = 0
      let classTop = 0
      let rank: number | null = null

      if (r.activity_id) {
        const classAttempts = attempts.filter((a) => a.activity_id === r.activity_id && a.status === 'graded')
        classCount = classAttempts.length
        if (classCount > 0) {
          const finals = classAttempts.map((a) => a.auto_score + (a.manual_score ?? 0))
          classAvg = Math.round((finals.reduce((s, x) => s + x, 0) / classCount) * 10) / 10
          classTop = Math.max(...finals)
          if (r.status === 'graded') rank = finals.filter((x) => x > r.final_score).length + 1
        }
      }

      sumTotal += r.total_possible
      if (r.has_attempt && r.status === 'graded') sumScore += r.final_score

      return {
        number: r.week_number, title: r.week_title, total_possible: r.total_possible,
        has_attempt: r.has_attempt, auto_score: r.auto_score, manual_score: r.manual_score,
        final_score: r.final_score, percent: r.percent, status: r.status ?? undefined,
        submitted_at: r.submitted_at, rank, class_count: classCount, class_avg: classAvg, class_top: classTop,
      }
    })

    const percent = sumTotal > 0 ? Math.round((sumScore / sumTotal) * 100) : 0

    return {
      student: { id: student.id, full_name: student.full_name, student_no: student.student_no ?? '—' },
      from_week: from, to_week: to, type: from === to ? 'weekly' : 'cumulative',
      weeks: weekEntries, totals: { total_possible: sumTotal, student_total: sumScore, percent },
      generated_at: new Date().toISOString(),
    }
  }

  function openPreview() {
    if (!selectedId) { setError('اختر طالبًا أولًا.'); return }
    if (fromWeek > toWeek) { setError('المدى غير صحيح.'); return }
    setError(null)
    const snapshot = buildPreviewSnapshot(selectedId, fromWeek, toWeek)
    setPreview({ snapshot, reportNumber: null, approvedAt: new Date().toISOString(), teacherNote: teacherNote.trim() || null, mode: 'new' })
  }

  function openExistingReport(r: ExistingReport) {
    setPreview({ snapshot: r.snapshot, reportNumber: r.report_number, approvedAt: r.approved_at, teacherNote: r.teacher_note, mode: 'existing', reportId: r.id })
  }

  async function confirmApprove() {
    if (!supabase || !selectedId || !preview) return
    if (preview.mode !== 'new') return
    setBusy(true); setError(null)
    const { error: rpcErr } = await supabase.rpc('approve_weekly_report', {
      p_student_id: selectedId, p_from_week: preview.snapshot.from_week, p_to_week: preview.snapshot.to_week, p_teacher_note: teacherNote.trim() || null,
    })
    setBusy(false)
    if (rpcErr) { setError('فشل الإصدار: ' + rpcErr.message); return }
    setSuccess('✓ تم إصدار التقرير وإرساله للطالب.')
    setPreview(null); setTeacherNote(''); await loadReports()
  }

  async function revokeReport(reportId: string, reportNumber: string | null) {
    if (!supabase) return
    const reason = window.prompt(`إلغاء التقرير ${reportNumber ?? ''}؟\n\nاكتب سبب الإلغاء (اختياري):`, '')
    if (reason === null) return
    setBusy(true); setError(null); setSuccess(null)
    const { error: rpcErr } = await supabase.rpc('revoke_report', { p_report_id: reportId, p_reason: reason.trim() || null })
    setBusy(false)
    if (rpcErr) { setError('فشل الإلغاء: ' + rpcErr.message); return }
    setSuccess('تم إلغاء التقرير.'); await loadReports()
  }

  async function generateInstitutional() {
    if (!supabase) return
    setError(null); setInstBusy(true)
    const { data, error: rpcErr } = await supabase.rpc('institutional_report', { p_from_week: instFromWeek, p_to_week: instToWeek })
    setInstBusy(false)
    if (rpcErr) { setError('تعذّر إنشاء التقرير: ' + rpcErr.message); return }
    setInstSnapshot(data as InstitutionalSnapshot)
  }

  async function generateComprehensiveReport() {
    if (!supabase || !compStudentId) return
    setCompBusy(true); setError(null)
    try {
      const student = students.find(s => s.id === compStudentId)!
      let grades: any[] = []
      if (compOptions.grades) {
        const { data: atts } = await supabase.from('attempts').select('id, activity_id, auto_score, manual_score, status').eq('student_id', compStudentId).eq('status', 'graded')
        if (atts) {
          for (const at of atts) {
            const act = activities.find(a => a.id === at.activity_id)
            const week = weeks.find(w => w.id === act?.week_id)
            if (week && week.number >= fromWeek && week.number <= toWeek) {
              // إصلاح 1: إذا لم نجد الدرجة الكاملة في attempt_questions (للمحاولات القديمة)، نستخدم 60 كافتراضي
              const max = totalsByAttempt[at.id] || 60
              const score = at.auto_score + (at.manual_score ?? 0)
              // إصلاح 2: استخدام عنوان الأسبوع (week.title) بدلاً من عنوان النشاط
              grades.push({ week: week.number, title: week.title, score, max, percent: max ? Math.round((score/max)*100) : 0, status: at.status })
            }
          }
        }
      }
      let attendance: any[] = []
      if (compOptions.attendance) {
        const { data: att } = await supabase.from('attendance').select('week_id, status').eq('student_id', compStudentId)
        if (att) {
          for (const a of att) {
            const week = weeks.find(w => w.id === a.week_id)
            if (week && week.number >= fromWeek && week.number <= toWeek) attendance.push({ week: week.number, status: a.status })
          }
        }
      }
      setCompSnapshot({
        student: { full_name: student.full_name, student_no: student.student_no },
        from_week: fromWeek, to_week: toWeek, generated_at: new Date().toISOString(),
        grades: grades.sort((a,b) => a.week - b.week), attendance: attendance.sort((a,b) => a.week - b.week),
        options: { showGrades: compOptions.grades, showAttendance: compOptions.attendance }
      })
      setShowComprehensive(false)
    } catch (err: any) { setError(err.message) } finally { setCompBusy(false) }
  }

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>

  const selected = students.find((s) => s.id === selectedId)
  const filteredStudents = query.trim().length === 0 ? students : students.filter((s) => s.full_name.includes(query) || (s.student_no ?? '').includes(query))
  const studentRows = selectedId ? buildStudentRows(selectedId) : []
  const activeReports = reports.filter((r) => r.status === 'active')
  const revokedReports = reports.filter((r) => r.status === 'revoked')
  const inRange = studentRows.filter((r) => r.week_number >= fromWeek && r.week_number <= toWeek)
  const sumTotal = inRange.reduce((s, r) => s + r.total_possible, 0)
  const sumScore = inRange.reduce((s, r) => s + (r.has_attempt && r.status === 'graded' ? r.final_score : 0), 0)
  const sumPercent = sumTotal > 0 ? Math.round((sumScore / sumTotal) * 100) : 0

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md flex flex-wrap justify-between items-center gap-3">
        <div>
          <h2 className="text-3xl font-bold">التقارير</h2>
          <p className="mt-1 text-base text-white/85">إصدار تقارير أكاديمية رسمية واعتمادها للطلاب.</p>
        </div>
        <button className="rounded-xl bg-white px-5 py-2.5 text-primary font-bold shadow-sm hover:bg-primary-soft transition-colors" onClick={() => setShowComprehensive(true)}>
          📄 تقرير الطالب الشامل
        </button>
      </section>

      <section className={card}>
        <h3 className="text-xl font-bold text-primary">📊 التقرير المؤسسي للإدارة</h3>
        <p className="mt-1 text-sm text-ink-muted">كشف شامل لجميع الطلاب — نتائج + حضور — جاهز للطباعة.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div><label className="text-sm font-semibold text-ink">من الأسبوع</label><input type="number" min={1} max={16} className={input} value={instFromWeek} onChange={(e) => setInstFromWeek(parseInt(e.target.value, 10) || 1)} /></div>
          <div><label className="text-sm font-semibold text-ink">إلى الأسبوع</label><input type="number" min={1} max={16} className={input} value={instToWeek} onChange={(e) => setInstToWeek(parseInt(e.target.value, 10) || 1)} /></div>
          <div className="flex items-end"><button className={btn} onClick={() => void generateInstitutional()} disabled={instBusy}>{instBusy ? '...' : '📊 تقرير النتائج المؤسسي'}</button></div>
        </div>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-base font-semibold text-error">{error}</p>}
      {success && <p className="rounded-xl bg-secondary-soft p-3 text-base font-semibold text-secondary ring-1 ring-secondary/20">{success}</p>}

      <section className={card}>
        <h3 className="text-xl font-bold text-primary">📄 إصدار تقرير رسمي</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div><label className="text-sm font-semibold text-ink">بحث بالاسم أو الرقم</label><input className={input} placeholder="اكتب للبحث..." value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <div><label className="text-sm font-semibold text-ink">الطالب</label><select className={input} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>{filteredStudents.map((s) => <option key={s.id} value={s.id}>{s.full_name}{s.student_no ? ` (${s.student_no})` : ''}</option>)}</select></div>
        </div>

        {selected && (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-primary-soft/40 p-3 text-sm">
              <span className="rounded-lg bg-primary-soft px-3 py-1 font-semibold text-primary">{selected.full_name}</span>
              {selected.student_no && <span className="rounded-lg bg-bg px-3 py-1 font-mono text-ink-muted" dir="ltr">{selected.student_no}</span>}
              <span className="text-ink-muted">— {studentRows.filter((r) => r.has_attempt).length} أسبوع بمحاولة</span>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-light-blue"><th className={th}>الأسبوع</th><th className={th}>العنوان</th><th className={th}>الحالة</th><th className={th}>الدرجة</th><th className={th}>النسبة</th><th className={th}>التاريخ</th></tr></thead>
                <tbody>
                  {studentRows.map((r) => (
                    <tr key={r.week_number} className={'border-b border-light-blue/50 ' + (r.week_number >= fromWeek && r.week_number <= toWeek ? 'bg-accent-soft/20' : '')}>
                      <td className="p-3 font-semibold">الأسبوع {r.week_number}</td>
                      <td className="p-3">{r.week_title}</td>
                      <td className="p-3">{!r.has_attempt ? <span className="rounded-lg bg-bg px-2 py-0.5 text-xs text-ink-muted">لا محاولة</span> : r.status === 'graded' ? <span className="rounded-lg bg-secondary-soft px-2 py-0.5 text-xs font-semibold text-secondary ring-1 ring-secondary/20">مصحح</span> : r.status === 'submitted' ? <span className="rounded-lg bg-warning-soft px-2 py-0.5 text-xs font-semibold text-ink ring-1 ring-warning">بانتظار التصحيح</span> : <span className="rounded-lg bg-ink/10 px-2 py-0.5 text-xs font-semibold text-ink-muted">مسودة</span>}</td>
                      <td className="p-3 font-semibold text-primary" dir="ltr">{r.has_attempt ? <>{r.final_score} / {r.total_possible}</> : '—'}</td>
                      <td className="p-3 font-semibold">{r.has_attempt ? `${r.percent}%` : '—'}</td>
                      <td className="p-3 text-xs text-ink-muted">{r.submitted_at ? timeAgo(r.submitted_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 rounded-xl border border-light-blue bg-bg p-4">
              <h4 className="text-base font-bold text-primary">إعداد التقرير</h4>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <div><label className="text-sm font-semibold text-ink">من الأسبوع</label><input type="number" min={1} max={weeks.length} className={input} value={fromWeek} onChange={(e) => setFromWeek(parseInt(e.target.value, 10) || 1)} /></div>
                <div><label className="text-sm font-semibold text-ink">إلى الأسبوع</label><input type="number" min={1} max={weeks.length} className={input} value={toWeek} onChange={(e) => setToWeek(parseInt(e.target.value, 10) || 1)} /></div>
                <div className="md:col-span-2"><label className="text-sm font-semibold text-ink">نوع التقرير (تلقائي)</label><div className="mt-1 rounded-xl bg-white px-3 py-2 text-base font-semibold text-primary">{fromWeek === toWeek ? `أسبوعي — الأسبوع ${fromWeek}` : `تراكمي — من ${fromWeek} إلى ${toWeek} (${sumScore} / ${sumTotal} = ${sumPercent}%)`}</div></div>
              </div>
              <div className="mt-3"><label className="text-sm font-semibold text-ink">ملاحظة الأستاذ (اختيارية — ستظهر في التقرير)</label><textarea rows={2} className={input} placeholder="مثال: أحسنت، واصل هذا التميز." value={teacherNote} onChange={(e) => setTeacherNote(e.target.value)} /></div>
              <div className="mt-4 flex flex-wrap gap-3"><button className={btn} onClick={openPreview} disabled={busy}>👁️ معاينة التقرير</button></div>
            </div>
            {activeReports.length > 0 && (
              <div className="mt-5">
                <h4 className="text-base font-bold text-primary">📋 التقارير المعتمدة</h4>
                <ul className="mt-2 space-y-2">
                  {activeReports.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-light-blue bg-white p-3">
                      <div className="min-w-0 flex-1"><div className="font-semibold text-ink">{r.type === 'weekly' ? `أسبوعي — الأسبوع ${r.from_week_number}` : `تراكمي — الأسابيع ${r.from_week_number} إلى ${r.to_week_number}`}{r.report_number && <span className="ms-2 rounded bg-bg px-2 py-0.5 font-mono text-xs text-ink-muted" dir="ltr">{r.report_number}</span>}</div><div className="text-xs text-ink-muted">أُصدر {timeAgo(r.approved_at)} {r.seen_at ? ' — ✓ رآه الطالب' : ' — ⏳ لم يره بعد'}</div>{r.teacher_note && <div className="mt-1 text-xs text-ink-muted">ملاحظة: {r.teacher_note}</div>}</div>
                      <div className="flex flex-wrap gap-2"><button className={btnOutline} onClick={() => openExistingReport(r)} disabled={busy}>عرض</button><button className={btnDanger} onClick={() => void revokeReport(r.id, r.report_number)} disabled={busy}>إلغاء</button></div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {revokedReports.length > 0 && (
              <details className="mt-3"><summary className="cursor-pointer text-sm text-ink-muted">تقارير ملغاة ({revokedReports.length})</summary><ul className="mt-2 space-y-1 text-xs text-ink-muted">{revokedReports.map((r) => <li key={r.id}>{r.type === 'weekly' ? `الأسبوع ${r.from_week_number}` : `تراكمي ${r.from_week_number}–${r.to_week_number}`} {' — '}{timeAgo(r.approved_at)} {r.report_number && <> — <span dir="ltr">{r.report_number}</span></>}</li>)}</ul></details>
            )}
          </>
        )}
      </section>

      {preview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-2 md:p-6">
          <div className="mx-auto max-w-[900px]">
            <div className="no-print sticky top-0 z-10 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3 shadow-lg"><div className="text-base font-bold text-primary">{preview.mode === 'new' ? '👁️ معاينة التقرير — قبل الاعتماد' : '📄 عرض التقرير'}</div><div className="flex flex-wrap gap-2"><button className={btnOutline} onClick={() => window.print()}>🖨️ طباعة / PDF</button>{preview.mode === 'new' ? <button className={btnSuccess} onClick={() => void confirmApprove()} disabled={busy}>{busy ? '...' : '✓ اعتماد وإرسال للطالب'}</button> : null}<button className={btnDanger} onClick={() => setPreview(null)} disabled={busy}>إغلاق</button></div></div>
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xl"><WeeklyReport snapshot={preview.snapshot} reportNumber={preview.reportNumber} approvedAt={preview.approvedAt} teacherNote={preview.teacherNote} /></div>
          </div>
        </div>
      )}

      {instSnapshot && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-2 md:p-6">
          <div className="mx-auto max-w-[900px]">
            <div className="no-print sticky top-0 z-10 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3 shadow-lg"><div className="text-base font-bold text-primary">📊 التقرير المؤسسي — الأسابيع {instSnapshot.from_week}–{instSnapshot.to_week}</div><div className="flex flex-wrap gap-2"><button className={btnOutline} onClick={() => window.print()}>🖨️ طباعة / PDF</button><button className={btn} onClick={() => setInstSnapshot(null)}>إغلاق</button></div></div>
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xl"><InstitutionalReport snapshot={instSnapshot} generatedAt={instSnapshot.generated_at} mode="grades" /></div>
          </div>
        </div>
      )}

      {showComprehensive && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-primary mb-4">إعداد التقرير الشامل</h3>
            <div className="space-y-4">
              <div><label className="text-sm font-semibold">الطالب</label><select className={input} value={compStudentId} onChange={e => setCompStudentId(e.target.value)}><option value="">-- اختر طالباً --</option>{students.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></div>
              <div className="flex gap-4 text-sm mt-4"><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={compOptions.grades} onChange={e => setCompOptions({...compOptions, grades: e.target.checked})} /> الدرجات</label><label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={compOptions.attendance} onChange={e => setCompOptions({...compOptions, attendance: e.target.checked})} /> الحضور والغياب</label></div>
              <div className="flex gap-2 justify-end mt-6"><button className={btnOutline} onClick={() => setShowComprehensive(false)}>إلغاء</button><button className={btn} onClick={() => void generateComprehensiveReport()} disabled={compBusy || !compStudentId}>{compBusy ? '...' : 'معاينة التقرير'}</button></div>
            </div>
          </div>
        </div>
      )}

      {compSnapshot && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/70 p-2 md:p-6 print:bg-white print:p-0">
           <div className="mx-auto max-w-[210mm]">
             <div className="no-print sticky top-0 z-10 mb-3 flex justify-between rounded-2xl bg-white p-3 shadow-lg"><div className="font-bold text-primary">معاينة التقرير الشامل</div><div className="flex gap-2"><button className={btnOutline} onClick={() => window.print()}>🖨️ طباعة / PDF</button><button className={btnDanger} onClick={() => setCompSnapshot(null)}>إغلاق</button></div></div>
             <div className="bg-white shadow-2xl print:shadow-none"><ComprehensiveReport snapshot={compSnapshot} /></div>
           </div>
        </div>
      )}
    </div>
  )
}