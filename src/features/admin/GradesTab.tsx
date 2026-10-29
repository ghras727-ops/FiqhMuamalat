import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const btnDanger = 'rounded-xl border border-error bg-white px-5 py-2.5 text-base font-semibold text-error hover:bg-error-soft disabled:opacity-60'
const btnSuccess = 'rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary-hover disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink'

type QType = 'mcq' | 'tf' | 'essay_smart' | 'essay_reasoning'
type WeekFilter = number | 'all'

const TYPE_LABEL: Record<QType, string> = {
  mcq: 'اختيار من متعدد', tf: 'صح / خطأ',
  essay_smart: 'مقالي ذكي', essay_reasoning: 'مقالي استدلال وفهم',
}
const TYPE_ORDER: QType[] = ['mcq', 'tf', 'essay_smart', 'essay_reasoning']
const TYPE_STYLE: Record<QType, { headerBg: string; headerText: string; badgeBg: string }> = {
  mcq:             { headerBg: 'border-s-primary',   headerText: 'text-ink-muted', badgeBg: 'bg-primary-soft text-primary border-primary/20' },
  tf:              { headerBg: 'border-s-secondary', headerText: 'text-ink-muted', badgeBg: 'bg-secondary-soft text-secondary border-secondary/20' },
  essay_smart:     { headerBg: 'border-s-accent',    headerText: 'text-ink-muted', badgeBg: 'bg-accent-soft/30 text-primary border-accent/50' },
  essay_reasoning: { headerBg: 'border-s-ink',       headerText: 'text-ink-muted', badgeBg: 'bg-ink/5 text-ink border-ink/20' },
}

interface WeekInfo { id: string; number: number; title: string }

interface AttemptRow {
  id: string; activity_id: string; student_id: string
  student_name: string; student_no: string | null
  is_test?: boolean
  activity_title: string; week_number: number
  auto_score: number; manual_score: number | null
  total_possible: number; status: string; submitted_at: string
}
interface RawAttempt {
  id: string; activity_id: string; student_id: string
  auto_score: number; manual_score: number | null
  status: string; submitted_at: string
}
interface Question { id: string; type: QType; text: string; score: number }
interface Option { id: string; question_id: string; label: string; text: string; position: number }
interface Key { question_id: string; correct_option_id: string | null; correct_tf: boolean | null; model_answer: string | null; grading_criteria: string | null; internal_note: string | null }
interface AQ { activity_id?: string; question_id: string; position: number }
interface AnswerRow {
  id: string; question_id: string
  option_id: string | null; text_answer: string | null
  is_correct: boolean | null; awarded_score: number | null
}
interface RetakeRequest {
  id: string; activity_id: string; student_id: string
  attempt_id: string | null; reason: string; created_at: string
  student_name: string; student_no: string | null
  activity_title: string; week_number: number
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`
  return new Date(iso).toLocaleDateString('ar-SA-u-nu-latn')
}

function formatTestDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    let hours = d.getHours()
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? 'م' : 'ص'
    hours = hours % 12 || 12
    return `${day}/${month} - ${hours}:${minutes} ${ampm}`
  } catch {
    return '—'
  }
}

export default function GradesTab() {
  const [rows, setRows] = useState<AttemptRow[]>([])
  const [retakeRequests, setRetakeRequests] = useState<RetakeRequest[]>([])
  const [weeks, setWeeks] = useState<WeekInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedWeek, setSelectedWeek] = useState<WeekFilter>('all')

  // grading panel
  const [gradingRow, setGradingRow] = useState<AttemptRow | null>(null)
  const [gradingQuestions, setGradingQuestions] = useState<Question[]>([])
  const [gradingOptions, setGradingOptions] = useState<Record<string, Option[]>>({})
  const [gradingKeys, setGradingKeys] = useState<Record<string, Key>>({})
  const [gradingAq, setGradingAq] = useState<AQ[]>([])
  const [gradingAnswers, setGradingAnswers] = useState<Record<string, AnswerRow>>({})
  const [grades, setGrades] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<Record<QType, boolean>>({ mcq: false, tf: false, essay_smart: false, essay_reasoning: false })
  const [busy, setBusy] = useState(false)

  // ⬇️ حالة نافذة التأكيد
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [saveSummary, setSaveSummary] = useState<{ smartScore: number, smartMax: number, reasoningScore: number, reasoningMax: number, missingGrades: number } | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true); setError(null)

    const [wRes, att, rq] = await Promise.all([
      supabase.from('weeks').select('id,number,title').order('number'),
      supabase.from('attempts').select('id,activity_id,student_id,auto_score,manual_score,status,submitted_at').in('status', ['submitted', 'graded']).order('submitted_at', { ascending: false }),
      supabase.from('retake_requests').select('id,activity_id,student_id,attempt_id,reason,created_at,status').eq('status', 'pending').order('created_at', { ascending: true }),
    ])

    if (wRes.error || att.error) { setError('تعذّر تحميل النتائج.'); setLoading(false); return }
    if (rq.error) { setError('تعذّر تحميل طلبات الإعادة.'); setLoading(false); return }

    setWeeks((wRes.data ?? []) as WeekInfo[])

    const attempts = (att.data ?? []) as RawAttempt[]
    const reqs = (rq.data ?? []) as { id: string; activity_id: string; student_id: string; attempt_id: string | null; reason: string; created_at: string }[]

    const studentIds = Array.from(new Set([...attempts.map((a) => a.student_id), ...reqs.map((r) => r.student_id)]))
    const activityIds = Array.from(new Set([...attempts.map((a) => a.activity_id), ...reqs.map((r) => r.activity_id)]))

  const nameMap: Record<string, { name: string; no: string | null; isTest: boolean }> = {}
    if (studentIds.length > 0) {
  const pr = await supabase.from('profiles').select('id,full_name,student_no,is_test').in('id', studentIds)
  for (const p of (pr.data ?? []) as { id: string; full_name: string; student_no: string | null; is_test: boolean }[]) {
    nameMap[p.id] = { name: p.full_name, no: p.student_no, isTest: p.is_test }
      }
    }

    const actMap: Record<string, { title: string; week_id: string }> = {}
    const weekIds = new Set<string>()
    if (activityIds.length > 0) {
      const ac = await supabase.from('activities').select('id,title,week_id').in('id', activityIds)
      for (const a of (ac.data ?? []) as { id: string; title: string; week_id: string }[]) {
        actMap[a.id] = { title: a.title, week_id: a.week_id }
        weekIds.add(a.week_id)
      }
    }

    const weekMap: Record<string, number> = {}
    if (weekIds.size > 0) {
      const wRes2 = await supabase.from('weeks').select('id,number').in('id', Array.from(weekIds))
      for (const w of (wRes2.data ?? []) as { id: string; number: number }[]) weekMap[w.id] = w.number
    }

    // ⬇️ الإصلاح المعماري: حساب الدرجة الكاملة من attempt_questions (30 سؤال) بدلاً من activity_questions (60 سؤال)
    const totalByAttempt: Record<string, number> = {}
    const attemptIds = attempts.map(a => a.id)
    if (attemptIds.length > 0) {
      const aqRes = await supabase.from('attempt_questions').select('attempt_id,question_id').in('attempt_id', attemptIds)
      const qIds = Array.from(new Set(((aqRes.data ?? []) as { question_id: string }[]).map((x) => x.question_id)))
      const qRes = qIds.length > 0
        ? await supabase.from('questions').select('id,score').in('id', qIds)
        : { data: [] as { id: string; score: number }[], error: null }
      const scoreMap: Record<string, number> = {}
      for (const q of (qRes.data ?? []) as { id: string; score: number }[]) scoreMap[q.id] = q.score
      for (const link of (aqRes.data ?? []) as { attempt_id: string; question_id: string }[]) {
        totalByAttempt[link.attempt_id] = (totalByAttempt[link.attempt_id] ?? 0) + (scoreMap[link.question_id] ?? 0)
      }
    }

    const out: AttemptRow[] = attempts.map((a) => {
      const info = nameMap[a.student_id]
      const act = actMap[a.activity_id]
      return {
        id: a.id, activity_id: a.activity_id, student_id: a.student_id,
  student_name: info?.name ?? '—', student_no: info?.no ?? null, is_test: info?.isTest ?? false,
        activity_title: act?.title ?? '—',
        week_number: act ? (weekMap[act.week_id] ?? 0) : 0,
        auto_score: a.auto_score, manual_score: a.manual_score,
        total_possible: totalByAttempt[a.id] ?? 0, // ⬅️ تم التعديل هنا
        status: a.status, submitted_at: a.submitted_at,
      }
    })
    setRows(out)

    const reqOut: RetakeRequest[] = reqs.map((r) => {
      const info = nameMap[r.student_id]
      const act = actMap[r.activity_id]
      return {
        id: r.id, activity_id: r.activity_id, student_id: r.student_id,
        attempt_id: r.attempt_id, reason: r.reason, created_at: r.created_at,
        student_name: info?.name ?? '—', student_no: info?.no ?? null,
        activity_title: act?.title ?? '—',
        week_number: act ? (weekMap[act.week_id] ?? 0) : 0,
      }
    })
    setRetakeRequests(reqOut)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function approveRetake(id: string) {
    if (!supabase) return
    if (!window.confirm('الموافقة على إعادة الاختبار؟ ستُحذف محاولة الطالب ويبدأ من جديد.')) return
    setBusy(true); setError(null); setSuccess(null)
    const { error: rpcErr } = await supabase.rpc('approve_retake', { p_request_id: id })
    setBusy(false)
    if (rpcErr) { setError('تعذّرت الموافقة: ' + rpcErr.message); return }
    setSuccess('تمت الموافقة على طلب الإعادة.')
    await load()
  }

  async function rejectRetake(id: string) {
    if (!supabase) return
    if (!window.confirm('رفض طلب الإعادة؟')) return
    setBusy(true); setError(null); setSuccess(null)
    const { error: rpcErr } = await supabase.rpc('reject_retake', { p_request_id: id })
    setBusy(false)
    if (rpcErr) { setError('تعذّر الرفض: ' + rpcErr.message); return }
    setSuccess('تم رفض الطلب.')
    await load()
  }

  async function openGrading(row: AttemptRow) {
    if (!supabase) return
    setError(null); setSuccess(null); setBusy(true)
    
    // ⬇️ الإصلاح المعماري: جلب أسئلة المحاولة (attempt_questions) بدلاً من أسئلة النشاط كاملة
    const [aqRes, qRes, oRes, kRes, anRes] = await Promise.all([
      supabase.from('attempt_questions').select('question_id,position').eq('attempt_id', row.id).order('position'),
      supabase.from('questions').select('id,type,text,score'),
      supabase.from('question_options').select('id,question_id,label,text,position').order('position'),
      supabase.from('question_keys').select('question_id,correct_option_id,correct_tf,model_answer,grading_criteria,internal_note'),
      supabase.from('answers').select('id,question_id,option_id,text_answer,is_correct,awarded_score').eq('attempt_id', row.id),
    ])
    setBusy(false)
    if (aqRes.error || qRes.error || oRes.error || kRes.error || anRes.error) { setError('تعذّر تحميل بيانات التصحيح.'); return }

    const aqList = (aqRes.data ?? []) as AQ[]
    const ids = new Set(aqList.map((x) => x.question_id))
    const qs = ((qRes.data ?? []) as Question[]).filter((q) => ids.has(q.id))
    const om: Record<string, Option[]> = {}
    for (const o of (oRes.data ?? []) as Option[]) if (ids.has(o.question_id)) (om[o.question_id] ??= []).push(o)
    const km: Record<string, Key> = {}
    for (const k of (kRes.data ?? []) as Key[]) if (ids.has(k.question_id)) km[k.question_id] = k
    const am: Record<string, AnswerRow> = {}
    for (const a of (anRes.data ?? []) as AnswerRow[]) am[a.question_id] = a

    const initialGrades: Record<string, string> = {}
    for (const [qid, a] of Object.entries(am)) {
      if (a.awarded_score !== null && a.awarded_score !== undefined) initialGrades[qid] = String(a.awarded_score)
    }

    setGradingRow(row); setGradingAq(aqList); setGradingQuestions(qs)
    setGradingOptions(om); setGradingKeys(km); setGradingAnswers(am); setGrades(initialGrades)
    setOpen({ mcq: false, tf: false, essay_smart: false, essay_reasoning: false })
  }

  function prepareSaveGrades() {
    if (!gradingRow) return
    let smartScore = 0, smartMax = 0
    let reasoningScore = 0, reasoningMax = 0
    let missingGrades = 0

    for (const q of gradingQuestions) {
      const val = grades[q.id]
      const isAnswered = !!gradingAnswers[q.id]?.text_answer
      const hasGrade = val !== undefined && val.trim() !== ''

      if (q.type === 'essay_smart') {
        smartMax += q.score
        if (hasGrade) smartScore += Number(val)
        else if (isAnswered) missingGrades++
      } else if (q.type === 'essay_reasoning') {
        reasoningMax += q.score
        if (hasGrade) reasoningScore += Number(val)
        else if (isAnswered) missingGrades++
      }
    }

    setSaveSummary({ smartScore, smartMax, reasoningScore, reasoningMax, missingGrades })
    setShowSaveConfirm(true)
  }

  async function executeSaveGrades() {
    if (!supabase || !gradingRow) return
    const list: { question_id: string; score: number }[] = []
    for (const [qid, raw] of Object.entries(grades)) {
      const n = Number(raw)
      if (!Number.isFinite(n) || n < 0) continue
      const q = gradingQuestions.find((x) => x.id === qid)
      if (!q) continue
      if (n > q.score) { setError(`الدرجة المدخلة لسؤال تتجاوز الحد (${q.score}).`); setShowSaveConfirm(false); return }
      list.push({ question_id: qid, score: n })
    }
    setBusy(true); setError(null); setShowSaveConfirm(false)
    const { error: rpcErr } = await supabase.rpc('grade_attempt', { p_attempt_id: gradingRow.id, p_grades: list })
    setBusy(false)
    if (rpcErr) { setError(rpcErr.message); return }
    setSuccess('تم حفظ الدرجات بنجاح.')
    setGradingRow(null); setGradingAnswers({}); setGrades({})
    await load()
  }

  async function resetAttempt() {
    if (!supabase || !gradingRow) return

    const { data: activeReports } = await supabase
      .from('weekly_reports')
      .select('id,report_number,from_week_number,to_week_number')
      .eq('student_id', gradingRow.student_id)
      .eq('status', 'active')
      .lte('from_week_number', gradingRow.week_number)
      .gte('to_week_number', gradingRow.week_number)

    let msg = `إعادة تعيين محاولة ${gradingRow.student_name}؟\n\nسيُحذف كل ما أجاب عنه في هذا النشاط.`
    if (activeReports && activeReports.length > 0) {
      const reps = activeReports.map(r =>
        r.report_number ? `• ${r.report_number}` : `• تقرير ${r.from_week_number}–${r.to_week_number}`
      ).join('\n')
      msg += `\n\n⚠️ سيتم إلغاء التقارير المعتمدة الآتية تلقائيًا:\n${reps}\n\nهل أنت متأكد؟`
    }

    if (!window.confirm(msg)) return

    setBusy(true); setError(null); setSuccess(null)
    const { data, error: rpcErr } = await supabase.rpc('reset_attempt', { p_attempt_id: gradingRow.id })
    setBusy(false)
    if (rpcErr) { setError('تعذّر إعادة التعيين: ' + rpcErr.message); return }
    const info = data as { deleted?: number; revoked_reports?: number } | null
    if (!info || info.deleted === 0) { setError('لم يُحذف شيء.'); return }
    const revoked = info.revoked_reports ?? 0
    setSuccess(revoked > 0
      ? `تمت إعادة التعيين + إلغاء ${revoked} تقرير معتمد.`
      : 'تمت إعادة التعيين بنجاح.')
    setGradingRow(null); setGradingAnswers({}); setGrades({})
    await load()
  }

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>

  const filtered = rows.filter((r) => {
    if (selectedWeek !== 'all' && r.week_number !== selectedWeek) return false
    if (query.trim() && !r.student_name.includes(query) && !(r.student_no ?? '').includes(query)) return false
    return true
  })

  const statRows = selectedWeek === 'all' ? rows : rows.filter((r) => r.week_number === selectedWeek)
  const totalAttempts = statRows.length
  const gradedCount = statRows.filter((r) => r.status === 'graded').length
  const gradedPercents = statRows
    .filter((r) => r.status === 'graded' && r.total_possible > 0)
    .map((r) => Math.min(100, Math.round(((r.auto_score + (r.manual_score ?? 0)) / r.total_possible) * 100)))
  const avgPercent = gradedPercents.length === 0 ? 0 : Math.round(gradedPercents.reduce((s, x) => s + x, 0) / gradedPercents.length)
  const topPercent = gradedPercents.length === 0 ? 0 : Math.max(...gradedPercents)

  const sortedAq = [...gradingAq].sort((a, b) => a.position - b.position)
  const grouped: Record<QType, AQ[]> = { mcq: [], tf: [], essay_smart: [], essay_reasoning: [] }
  for (const link of sortedAq) {
    const q = gradingQuestions.find((x) => x.id === link.question_id)
    if (q) grouped[q.type].push(link)
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">الدرجات</h2>
        <p className="mt-1 text-base text-white/85">نتائج الطلاب موزّعة حسب الأسبوع.</p>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-base font-semibold text-error">{error}</p>}
      {success && <p className="rounded-xl bg-secondary-soft p-3 text-base font-semibold text-secondary ring-1 ring-secondary/20">{success}</p>}

      {/* طلبات الإعادة */}
      {retakeRequests.length > 0 && (
        <section className="rounded-2xl border-2 border-accent bg-gradient-to-l from-accent-soft/40 to-white p-5 shadow-sm">
          <h3 className="text-xl font-bold text-primary">
            📩 طلبات إعادة الاختبار ({retakeRequests.length})
          </h3>
          <p className="mt-1 text-sm text-ink-muted">الموافقة تحذف محاولة الطالب فيبدأ من جديد.</p>
          <ul className="mt-4 space-y-3">
            {retakeRequests.map((r) => (
              <li key={r.id} className="rounded-xl border border-light-blue bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-ink">{r.student_name}</span>
                      {r.student_no && (
                        <span className="rounded bg-bg px-2 py-0.5 font-mono text-xs text-ink-muted" dir="ltr">{r.student_no}</span>
                      )}
                      <span className="rounded-lg bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                        الأسبوع {r.week_number}
                      </span>
                      <span className="text-xs text-ink-muted">{timeAgo(r.created_at)}</span>
                    </div>
                    <div className="mt-2 whitespace-pre-wrap rounded-lg bg-accent-soft/30 p-3 text-sm leading-7 text-ink">
                      <b className="text-primary">السبب: </b>{r.reason}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className={btnSuccess} onClick={() => void approveRetake(r.id)} disabled={busy}>موافقة</button>
                    <button className={btnDanger + ' !py-2 !text-sm'} onClick={() => void rejectRetake(r.id)} disabled={busy}>رفض</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* تبويبات الأسابيع */}
      <section className={card}>
        <h3 className="mb-3 text-lg font-bold text-primary">📅 فلترة حسب الأسبوع</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedWeek('all')}
            className={
              'rounded-xl border-2 px-4 py-2 text-sm font-bold transition ' +
              (selectedWeek === 'all'
                ? 'border-primary bg-primary text-white shadow-md'
                : 'border-light-blue bg-white text-ink-muted hover:border-primary/40 hover:bg-primary-soft')
            }
          >
            الكل ({rows.length})
          </button>
          {weeks.map((w) => {
            const count = rows.filter((r) => r.week_number === w.number).length
            const active = selectedWeek === w.number
            const hasAttempts = count > 0
            return (
              <button
                key={w.id}
                onClick={() => setSelectedWeek(w.number)}
                disabled={!hasAttempts}
                className={
                  'rounded-xl border-2 px-4 py-2 text-sm font-bold transition ' +
                  (active
                    ? 'border-primary bg-primary text-white shadow-md'
                    : hasAttempts
                      ? 'border-light-blue bg-white text-ink-muted hover:border-primary/40 hover:bg-primary-soft'
                      : 'cursor-not-allowed border-ink/10 bg-bg text-ink/30')
                }
              >
                الأسبوع {w.number} ({count})
              </button>
            )
          })}
        </div>
      </section>

      {/* ملخص الأسبوع المحدد */}
      <section className={card}>
        <h3 className="mb-3 text-lg font-bold text-primary">
          📊 ملخص {selectedWeek === 'all' ? 'الإجمالي' : `الأسبوع ${selectedWeek}`}
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="عدد المؤدّين" value={String(totalAttempts)} tone="primary" />
          <StatCard label="مصحّح" value={`${gradedCount} / ${totalAttempts}`} tone="success" />
          <StatCard label="متوسط النسبة" value={`${avgPercent}%`} tone={avgPercent >= 70 ? 'success' : avgPercent >= 50 ? 'info' : 'error'} />
          <StatCard label="أعلى نسبة" value={`${topPercent}%`} tone="success" />
        </div>
      </section>

      {/* جدول الطلاب */}
      <section className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-primary">
            👥 طلاب {selectedWeek === 'all' ? 'جميع الأسابيع' : `الأسبوع ${selectedWeek}`}
          </h3>
          <div className="flex flex-wrap gap-2">
            <input
              className={input + ' mt-0 w-56'}
              placeholder="ابحث باسم الطالب أو رقمه..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className={btnOutline} onClick={() => void load()}>🔄 تحديث</button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-4 rounded-xl bg-bg p-6 text-center text-base text-ink-muted">
            {selectedWeek === 'all' ? 'لا نتائج بعد.' : `لا محاولات في الأسبوع ${selectedWeek} بعد.`}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-blue text-ink-muted">
                  <th className="p-3 text-start">#</th>
                  <th className="p-3 text-start">الطالب</th>
                  <th className="p-3 text-start">الرقم</th>
                  {selectedWeek === 'all' && <th className="p-3 text-start">الأسبوع</th>}
                  <th className="p-3 text-start">تاريخ الاختبار</th>
                  <th className="p-3 text-start">المجموع</th>
                  <th className="p-3 text-start">الحالة</th>
                  <th className="p-3 text-start">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const rawTotal = r.auto_score + (r.manual_score ?? 0)
                  const cappedTotal = Math.min(rawTotal, r.total_possible)
                  const overflow = rawTotal > r.total_possible
                  return (
                    <tr key={r.id} className="border-b border-light-blue/50 hover:bg-bg">
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3 text-base font-semibold text-ink">  {r.student_name}  {r.is_test && <span className="ms-2 rounded bg-warning-soft px-2 py-0.5 text-[10px] font-bold text-ink border border-warning">🧪 تجريبي</span>}</td>
                      <td className="p-3 font-mono text-xs text-ink-muted" dir="ltr">{r.student_no ?? '—'}</td>
                      {selectedWeek === 'all' && (
                        <td className="p-3">
                          <span className="rounded-lg bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                            أ{r.week_number}
                          </span>
                        </td>
                      )}
                      <td className="p-3 text-sm font-semibold text-ink-muted">
                        <span dir="ltr">{formatTestDate(r.submitted_at)}</span>
                      </td>
                      <td className="p-3 text-lg font-bold text-secondary">
                        {cappedTotal.toFixed(1)} / {r.total_possible}
                        {overflow && <span className="ms-2 text-xs text-error">⚠</span>}
                      </td>
                      <td className="p-3">
                        {r.status === 'graded' ? (
                          <span className="rounded-lg bg-secondary-soft px-2 py-0.5 text-xs font-semibold text-secondary ring-1 ring-secondary/20">مصحح</span>
                        ) : (
                          <span className="rounded-lg bg-warning-soft px-2 py-0.5 text-xs font-semibold text-ink ring-1 ring-warning">بانتظار التصحيح</span>
                        )}
                      </td>
                      <td className="p-3">
                        <button className={btnOutline} onClick={() => void openGrading(r)} disabled={busy}>تصحيح</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* لوحة التصحيح */}
      {gradingRow && (
        <section className={card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-bold text-primary">تصحيح — {gradingRow.student_name}</h3>
              <p className="mt-1 text-sm text-ink-muted">
                <span className="rounded-lg bg-primary-soft px-2 py-0.5 font-bold text-primary">
                  الأسبوع {gradingRow.week_number}
              </span>
                {' '}— {gradingRow.activity_title} — الرقم {gradingRow.student_no ?? '—'}
              </p>
            </div>
            <button className={btnOutline} onClick={() => { setGradingRow(null); setGradingAnswers({}); setGrades({}) }}>إغلاق</button>
          </div>

          <div className="space-y-4">
            {TYPE_ORDER.map((t) => {
              const items = grouped[t]
              if (items.length === 0) return null
              const isOpen = open[t]
              const style = TYPE_STYLE[t]
              const groupScore = items.reduce((s, link) => {
                const q = gradingQuestions.find((x) => x.id === link.question_id)
                return s + (q?.score ?? 0)
              }, 0)
              return (
                <section key={t} className={`overflow-hidden rounded-2xl border border-light-blue border-s-4 bg-white shadow-sm ${style.headerBg}`}>
                  <button className="flex w-full items-center justify-between gap-4 bg-white px-5 py-4 text-start hover:bg-primary-soft" onClick={() => setOpen({ ...open, [t]: !isOpen })}>
                    <div className="flex items-center gap-4">
                      <span className={`rounded-xl border px-4 py-1.5 text-lg font-bold ${style.badgeBg}`}>{TYPE_LABEL[t]}</span>
                      <span className={`text-base font-semibold ${style.headerText}`}>{items.length} سؤال — {groupScore} درجة</span>
                    </div>
                    <span className={`text-2xl ${style.headerText} transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                  </button>

                  {isOpen && (
                    <ul className="space-y-4 border-t border-light-blue bg-bg p-4">
                      {items.map((link, i) => {
                        const q = gradingQuestions.find((x) => x.id === link.question_id)
                        if (!q) return null
                        const qOpts = gradingOptions[q.id] ?? []
                        const k = gradingKeys[q.id]
                        const ans = gradingAnswers[q.id]
                        const answered = !!ans
                        const chosen = qOpts.find((o) => o.id === ans?.option_id)
                        const correctOpt = qOpts.find((o) => o.id === k?.correct_option_id)
                        const isEssay = q.type.startsWith('essay')

                        return (
                          <li key={q.id} className="rounded-xl border border-light-blue bg-white p-4">
                            <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                              <span className={`rounded-lg border px-2 py-0.5 font-semibold ${style.badgeBg}`}>س{i + 1}</span>
                              <span className="rounded-lg bg-primary-soft px-2 py-0.5 font-semibold text-primary">{q.score} درجة</span>
                              {!answered && <span className="rounded-lg bg-error-soft px-2 py-0.5 font-semibold text-error ring-1 ring-error/20">لم يجب</span>}
                            </div>

                            <div className="mt-3 whitespace-pre-wrap text-lg font-semibold leading-8 text-ink">{q.text}</div>

                            {q.type === 'mcq' && (
                              <div className="mt-3 space-y-2 text-sm">
                                {answered ? (
                                  <>
                                    <div className="rounded-lg bg-bg p-2">
                                      <b className="text-ink-muted">إجابة الطالب: </b>
                                      <span className={ans?.is_correct ? 'font-semibold text-secondary' : 'font-semibold text-error'}>
                                        {chosen ? `${chosen.label}) ${chosen.text}` : '—'}
                                        {ans?.is_correct ? ' ✓' : ' ✗'}
                                      </span>
                                    </div>
                                    <div className="rounded-lg bg-secondary-soft p-2 text-secondary">
                                      <b>الإجابة الصحيحة: </b>{correctOpt ? `${correctOpt.label}) ${correctOpt.text}` : '—'}
                                    </div>
                                  </>
                                ) : <p className="rounded-lg bg-error-soft p-2 text-error">الطالب لم يجب عن هذا السؤال.</p>}
                              </div>
                            )}

                            {q.type === 'tf' && (
                              <div className="mt-3 space-y-2 text-sm">
                                {answered ? (
                                  <>
                                    <div className="rounded-lg bg-bg p-2">
                                      <b className="text-ink-muted">إجابة الطالب: </b>
                                      <span className={ans?.is_correct ? 'font-semibold text-secondary' : 'font-semibold text-error'}>
                                        {ans?.text_answer === 'true' ? 'صح ✓' : ans?.text_answer === 'false' ? 'خطأ ✗' : '—'}
                                      </span>
                                    </div>
                                    <div className="rounded-lg bg-secondary-soft p-2 text-secondary">
                                      <b>الإجابة الصحيحة: </b>{k?.correct_tf ? 'صح' : 'خطأ'}
                                    </div>
                                  </>
                                ) : <p className="rounded-lg bg-error-soft p-2 text-error">الطالب لم يجب عن هذا السؤال.</p>}
                              </div>
                            )}

                            {isEssay && (
                              answered ? (
                                <>
                                  <div className="mt-3 whitespace-pre-wrap rounded-lg bg-bg p-3 text-sm leading-7 text-ink">
                                    <b className="text-ink-muted">إجابة الطالب:</b><br />
                                    {ans?.text_answer || <span className="text-ink-muted">— لم يجب —</span>}
                                  </div>
                                  {k?.model_answer && (
                                    <div className="mt-2 whitespace-pre-wrap rounded-lg bg-primary-soft p-3 text-sm leading-7 text-ink">
                                      <b className="text-primary">الإجابة النموذجية: </b>{k.model_answer}
                                    </div>
                                  )}
                                  {k?.grading_criteria && (
                                    <div className="mt-2 whitespace-pre-wrap rounded-lg bg-accent-soft/30 p-3 text-sm leading-7 text-ink">
                                      <b className="text-primary">معايير التصحيح: </b>{k.grading_criteria}
                                    </div>
                                  )}
                                  <div className="mt-3 flex items-center gap-3">
                                    <label className="text-sm font-semibold text-ink">الدرجة (من {q.score}):</label>
                                    <input 
                                      type="number" 
                                      min={0} 
                                      max={q.score} 
                                      step={0.25} 
                                      className={input + ' mt-0 w-32'} 
                                      value={grades[q.id] ?? ''} 
                                      onChange={(e) => setGrades({ ...grades, [q.id]: e.target.value })} 
                                      onWheel={(e) => e.currentTarget.blur()}
                                    />
                                  </div>
                                </>
                              ) : <p className="mt-3 rounded-lg bg-error-soft p-2 text-sm text-error">الطالب لم يجب عن هذا السؤال.</p>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button className={btn} onClick={prepareSaveGrades} disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ الدرجات'}</button>
            <button className={btnDanger} onClick={() => void resetAttempt()} disabled={busy}>إعادة تعيين</button>
            <button className={btnOutline} onClick={() => { setGradingRow(null); setGradingAnswers({}); setGrades({}) }} disabled={busy}>إلغاء</button>
          </div>
        </section>
      )}

      {/* ⬇️ نافذة تأكيد الحفظ */}
      {showSaveConfirm && saveSummary && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-center">
            <h3 className="text-xl font-bold text-primary mb-4">تأكيد حفظ درجات المقالي</h3>
            
            <div className="space-y-3 text-start text-sm">
              <div className="rounded-xl border border-light-blue bg-bg p-3 flex justify-between items-center">
                <span className="font-semibold text-ink">درجة المقالي الذكي:</span>
                <span className="font-bold text-secondary text-lg">{saveSummary.smartScore} <span className="text-sm text-ink-muted">من {saveSummary.smartMax}</span></span>
              </div>
              <div className="rounded-xl border border-light-blue bg-bg p-3 flex justify-between items-center">
                <span className="font-semibold text-ink">درجة الاستدلال:</span>
                <span className="font-bold text-secondary text-lg">{saveSummary.reasoningScore} <span className="text-sm text-ink-muted">من {saveSummary.reasoningMax}</span></span>
              </div>
            </div>

            {saveSummary.missingGrades > 0 && (
              <div className="mt-4 rounded-xl bg-error-soft p-3 text-sm font-semibold text-error ring-1 ring-error/20">
                ⚠️ تنبيه: هناك {saveSummary.missingGrades} سؤالاً مقالياً أجاب عنه الطالب ولم تضع له درجة! (سيُحسب صفراً إن أكملت).
              </div>
            )}

            <div className="mt-6 flex gap-2 justify-center">
              <button className={btn} onClick={() => void executeSaveGrades()}>نعم، حفظ الدرجات</button>
              <button className={btnOutline} onClick={() => setShowSaveConfirm(false)}>مراجعة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: 'primary' | 'success' | 'info' | 'error' }) {
  const tones: Record<string, { bg: string; text: string; border: string }> = {
    primary: { bg: 'bg-primary-soft', text: 'text-primary', border: 'border-s-primary' },
    success: { bg: 'bg-secondary-soft', text: 'text-secondary', border: 'border-s-secondary' },
    info:    { bg: 'bg-accent-soft/40', text: 'text-primary', border: 'border-s-accent' },
    error:   { bg: 'bg-error-soft', text: 'text-error', border: 'border-s-error' },
  }
  const t = tones[tone]
  return (
    <div className={`rounded-2xl border border-light-blue border-s-4 ${t.bg} p-4 shadow-sm ${t.border}`}>
      <div className="text-xs font-semibold text-ink-muted">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${t.text}`}>{value}</div>
    </div>
  )
}