import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const btnDanger = 'rounded-xl border border-error bg-white px-5 py-2.5 text-base font-semibold text-error hover:bg-error-soft disabled:opacity-60'
const btnSuccess = 'rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary-hover disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink'

type QType = 'mcq' | 'tf' | 'essay_smart' | 'essay_reasoning'

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

interface AttemptRow {
  id: string; activity_id: string; student_id: string
  student_name: string; student_no: string | null
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
interface AQ { activity_id: string; question_id: string; position: number }
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
  return new Date(iso).toLocaleDateString('ar-SA')
}

export default function GradesTab() {
  const [rows, setRows] = useState<AttemptRow[]>([])
  const [retakeRequests, setRetakeRequests] = useState<RetakeRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [query, setQuery] = useState('')

  const [gradingRow, setGradingRow] = useState<AttemptRow | null>(null)
  const [gradingQuestions, setGradingQuestions] = useState<Question[]>([])
  const [gradingOptions, setGradingOptions] = useState<Record<string, Option[]>>({})
  const [gradingKeys, setGradingKeys] = useState<Record<string, Key>>({})
  const [gradingAq, setGradingAq] = useState<AQ[]>([])
  const [gradingAnswers, setGradingAnswers] = useState<Record<string, AnswerRow>>({})
  const [grades, setGrades] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<Record<QType, boolean>>({ mcq: false, tf: false, essay_smart: false, essay_reasoning: false })
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true); setError(null)

    const [att, rq] = await Promise.all([
      supabase.from('attempts').select('id,activity_id,student_id,auto_score,manual_score,status,submitted_at').order('submitted_at', { ascending: false }),
      supabase.from('retake_requests').select('id,activity_id,student_id,attempt_id,reason,created_at,status').eq('status', 'pending').order('created_at', { ascending: true }),
    ])

    if (att.error) { setError('تعذّر تحميل النتائج: ' + att.error.message); setLoading(false); return }
    if (rq.error) { setError('تعذّر تحميل طلبات الإعادة: ' + rq.error.message); setLoading(false); return }

    const attempts = (att.data ?? []) as RawAttempt[]
    const reqs = (rq.data ?? []) as { id: string; activity_id: string; student_id: string; attempt_id: string | null; reason: string; created_at: string }[]

    const studentIds = Array.from(new Set([...attempts.map((a) => a.student_id), ...reqs.map((r) => r.student_id)]))
    const activityIds = Array.from(new Set([...attempts.map((a) => a.activity_id), ...reqs.map((r) => r.activity_id)]))

    const nameMap: Record<string, { name: string; no: string | null }> = {}
    if (studentIds.length > 0) {
      const pr = await supabase.from('profiles').select('id,full_name,student_no').in('id', studentIds)
      for (const p of (pr.data ?? []) as { id: string; full_name: string; student_no: string | null }[]) {
        nameMap[p.id] = { name: p.full_name, no: p.student_no }
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
      const wRes = await supabase.from('weeks').select('id,number').in('id', Array.from(weekIds))
      for (const w of (wRes.data ?? []) as { id: string; number: number }[]) weekMap[w.id] = w.number
    }

    const totalByActivity: Record<string, number> = {}
    if (activityIds.length > 0) {
      const aqRes = await supabase.from('activity_questions').select('activity_id,question_id').in('activity_id', activityIds)
      const qIds = Array.from(new Set(((aqRes.data ?? []) as { question_id: string }[]).map((x) => x.question_id)))
      const qRes = qIds.length > 0
        ? await supabase.from('questions').select('id,score').in('id', qIds)
        : { data: [] as { id: string; score: number }[], error: null }
      const scoreMap: Record<string, number> = {}
      for (const q of (qRes.data ?? []) as { id: string; score: number }[]) scoreMap[q.id] = q.score
      for (const link of (aqRes.data ?? []) as { activity_id: string; question_id: string }[]) {
        totalByActivity[link.activity_id] = (totalByActivity[link.activity_id] ?? 0) + (scoreMap[link.question_id] ?? 0)
      }
    }

    const out: AttemptRow[] = attempts.map((a) => {
      const info = nameMap[a.student_id]
      const act = actMap[a.activity_id]
      return {
        id: a.id, activity_id: a.activity_id, student_id: a.student_id,
        student_name: info?.name ?? '—', student_no: info?.no ?? null,
        activity_title: act?.title ?? '—',
        week_number: act ? (weekMap[act.week_id] ?? 0) : 0,
        auto_score: a.auto_score, manual_score: a.manual_score,
        total_possible: totalByActivity[a.activity_id] ?? 0,
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
    const [aqRes, qRes, oRes, kRes, anRes] = await Promise.all([
      supabase.from('activity_questions').select('activity_id,question_id,position').eq('activity_id', row.activity_id).order('position'),
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

  async function saveGrades() {
    if (!supabase || !gradingRow) return
    const list: { question_id: string; score: number }[] = []
    for (const [qid, raw] of Object.entries(grades)) {
      const n = Number(raw)
      if (!Number.isFinite(n) || n < 0) continue
      const q = gradingQuestions.find((x) => x.id === qid)
      if (!q) continue
      if (n > q.score) { setError(`الدرجة المدخلة لسؤال تتجاوز الحد (${q.score}).`); return }
      list.push({ question_id: qid, score: n })
    }
    setBusy(true); setError(null)
    const { error: rpcErr } = await supabase.rpc('grade_attempt', { p_attempt_id: gradingRow.id, p_grades: list })
    setBusy(false)
    if (rpcErr) { setError(rpcErr.message); return }
    setSuccess('تم حفظ الدرجات بنجاح.')
    setGradingRow(null); setGradingAnswers({}); setGrades({})
    await load()
  }

  async function resetAttempt() {
    if (!supabase || !gradingRow) return
    if (!window.confirm(`إعادة تعيين محاولة ${gradingRow.student_name}؟ سيُحذف كل ما أجاب عنه.`)) return
    setBusy(true); setError(null); setSuccess(null)
    const { data, error: rpcErr } = await supabase.rpc('reset_attempt', { p_attempt_id: gradingRow.id })
    setBusy(false)
    if (rpcErr) { setError('تعذّر إعادة التعيين: ' + rpcErr.message); return }
    const deleted = (data as { deleted?: number } | null)?.deleted ?? 0
    if (deleted === 0) { setError('لم يُحذف شيء.'); return }
    setSuccess('تمت إعادة التعيين بنجاح.')
    setGradingRow(null); setGradingAnswers({}); setGrades({})
    await load()
  }

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>

  const filtered = query.trim().length === 0
    ? rows
    : rows.filter((r) => r.student_name.includes(query) || (r.student_no ?? '').includes(query))

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
        <p className="mt-1 text-base text-white/85">نتائج جميع الطلاب وتصحيح الأسئلة المقالية.</p>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-base font-semibold text-error">{error}</p>}
      {success && <p className="rounded-xl bg-secondary-soft p-3 text-base font-semibold text-secondary ring-1 ring-secondary/20">{success}</p>}

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
                      <span className="text-xs text-ink-muted">{timeAgo(r.created_at)}</span>
                    </div>
                    <div className="mt-1 text-sm text-ink-muted">
                      الأسبوع {r.week_number}: {r.activity_title}
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

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <input
            className={input + ' mt-0 w-full max-w-sm'}
            placeholder="ابحث باسم الطالب أو رقمه..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className={btnOutline} onClick={() => void load()}>تحديث</button>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-4 rounded-xl bg-bg p-6 text-center text-base text-ink-muted">لا نتائج بعد.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-blue text-ink-muted">
                  <th className="p-3 text-start">#</th>
                  <th className="p-3 text-start">الطالب</th>
                  <th className="p-3 text-start">الرقم</th>
                  <th className="p-3 text-start">النشاط</th>
                  <th className="p-3 text-start">آلية</th>
                  <th className="p-3 text-start">يدوية</th>
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
                      <td className="p-3 text-base font-semibold text-ink">{r.student_name}</td>
                      <td className="p-3 font-mono text-xs text-ink-muted" dir="ltr">{r.student_no ?? '—'}</td>
                      <td className="p-3">
                        <div className="text-ink">الأسبوع {r.week_number}: {r.activity_title}</div>
                      </td>
                      <td className="p-3 font-semibold text-primary">{r.auto_score}</td>
                      <td className="p-3">{r.manual_score ?? '—'}</td>
                      <td className="p-3 text-lg font-bold text-secondary">
                        {cappedTotal.toFixed(1)} / {r.total_possible}
                        {overflow && <span className="ms-2 text-xs text-error">⚠</span>}
                      </td>
                      <td className="p-3">
                        {r.status === 'graded' ? (
                          <span className="rounded-lg bg-secondary-soft px-2 py-0.5 text-xs font-semibold text-secondary ring-1 ring-secondary/20">مصحح</span>
                        ) : r.status === 'submitted' ? (
                          <span className="rounded-lg bg-warning-soft px-2 py-0.5 text-xs font-semibold text-ink ring-1 ring-warning">بانتظار التصحيح</span>
                        ) : (
                          <span className="rounded-lg bg-ink/10 px-2 py-0.5 text-xs font-semibold text-ink-muted">قيد الإجابة</span>
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

      {gradingRow && (
        <section className={card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-bold text-primary">تصحيح — {gradingRow.student_name}</h3>
              <p className="mt-1 text-sm text-ink-muted">
                الأسبوع {gradingRow.week_number}: {gradingRow.activity_title} — الرقم {gradingRow.student_no ?? '—'}
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
                                    <input type="number" min={0} max={q.score} step={0.25} className={input + ' mt-0 w-32'} value={grades[q.id] ?? ''} onChange={(e) => setGrades({ ...grades, [q.id]: e.target.value })} />
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
            <button className={btn} onClick={() => void saveGrades()} disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ الدرجات'}</button>
            <button className={btnDanger} onClick={() => void resetAttempt()} disabled={busy}>إعادة تعيين</button>
            <button className={btnOutline} onClick={() => { setGradingRow(null); setGradingAnswers({}); setGrades({}) }} disabled={busy}>إلغاء</button>
          </div>
        </section>
      )}
    </div>
  )
}