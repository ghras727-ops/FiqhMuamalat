import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-hover active:bg-primary-active focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary-soft active:bg-accent-soft/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60'
const btnDanger = 'rounded-xl border border-error bg-white px-4 py-2 text-sm font-semibold text-error transition hover:bg-error-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-error/40 disabled:cursor-not-allowed disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent/40'
const label = 'text-base font-semibold text-primary'

type QType = 'mcq' | 'tf' | 'essay_smart' | 'essay_reasoning'
type View = 'questions' | 'results'

interface Activity { id: string; week_id: string; title: string; open: boolean; release: string }
interface Week { id: string; number: number; title: string }
interface Question { id: string; type: QType; text: string; score: number }
interface Option { id: string; question_id: string; label: string; text: string; position: number }
interface Key { question_id: string; correct_option_id: string | null; correct_tf: boolean | null; model_answer: string | null; grading_criteria: string | null; internal_note: string | null }
interface AQ { activity_id: string; question_id: string; position: number }

interface AttemptRaw {
  id: string
  activity_id: string
  student_id: string
  auto_score: number
  manual_score: number | null
  status: string
  submitted_at: string
}
interface AttemptRow extends AttemptRaw { student_name: string }

interface AnswerRow {
  id: string
  question_id: string
  option_id: string | null
  text_answer: string | null
  is_correct: boolean | null
  awarded_score: number | null
}

const TYPE_LABEL: Record<QType, string> = {
  mcq: 'اختيار من متعدد',
  tf: 'صح / خطأ',
  essay_smart: 'مقالي ذكي',
  essay_reasoning: 'مقالي استدلال وفهم',
}

const TYPE_ORDER: QType[] = ['mcq', 'tf', 'essay_smart', 'essay_reasoning']

const TYPE_STYLE: Record<QType, { headerBg: string; headerText: string; badgeBg: string }> = {
  mcq:             { headerBg: 'border-s-primary',   headerText: 'text-ink-muted', badgeBg: 'bg-primary-soft text-primary border-primary/20' },
  tf:              { headerBg: 'border-s-secondary', headerText: 'text-ink-muted', badgeBg: 'bg-secondary-soft text-secondary border-secondary/20' },
  essay_smart:     { headerBg: 'border-s-accent',    headerText: 'text-ink-muted', badgeBg: 'bg-accent-soft/30 text-primary border-accent/50' },
  essay_reasoning: { headerBg: 'border-s-ink',       headerText: 'text-ink-muted', badgeBg: 'bg-ink/5 text-ink border-ink/20' },
}

interface DraftOption { label: string; text: string; isCorrect: boolean }
interface Draft {
  type: QType
  text: string
  score: number
  options: DraftOption[]
  correctTf: boolean
  modelAnswer: string
  gradingCriteria: string
  internalNote: string
}

function emptyDraft(): Draft {
  return {
    type: 'mcq',
    text: '',
    score: 1,
    options: [
      { label: 'أ', text: '', isCorrect: true },
      { label: 'ب', text: '', isCorrect: false },
      { label: 'ج', text: '', isCorrect: false },
      { label: 'د', text: '', isCorrect: false },
    ],
    correctTf: true,
    modelAnswer: '',
    gradingCriteria: '',
    internalNote: '',
  }
}

export default function QuizSetsTab() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [weeks, setWeeks] = useState<Week[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [questions, setQuestions] = useState<Question[]>([])
  const [options, setOptions] = useState<Record<string, Option[]>>({})
  const [keys, setKeys] = useState<Record<string, Key>>({})
  const [aq, setAq] = useState<AQ[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<'list' | 'add'>('list')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [draft, setDraft] = useState<Draft>(emptyDraft())
  const [open, setOpen] = useState<Record<QType, boolean>>({
    mcq: true, tf: false, essay_smart: false, essay_reasoning: false,
  })

  const [view, setView] = useState<View>('questions')
  const [attempts, setAttempts] = useState<AttemptRow[]>([])
  const [gradingAttemptId, setGradingAttemptId] = useState<string | null>(null)
  const [gradingAnswers, setGradingAnswers] = useState<AnswerRow[]>([])
  const [grades, setGrades] = useState<Record<string, string>>({})

  const loadActivities = useCallback(async () => {
    if (!supabase) return
    const [a, w] = await Promise.all([
      supabase.from('activities').select('id,week_id,title,open,release').order('created_at'),
      supabase.from('weeks').select('id,number,title').order('number'),
    ])
    if (a.error || w.error) { setError('تعذّر التحميل.'); setLoading(false); return }
    const acts = (a.data ?? []) as Activity[]
    setActivities(acts)
    setWeeks((w.data ?? []) as Week[])
    setSelectedId((prev) => prev || (acts[0]?.id ?? ''))
    setLoading(false)
  }, [])

  const loadQuestions = useCallback(async () => {
    if (!supabase || !selectedId) return
    const [aqRes, qRes, oRes, kRes] = await Promise.all([
      supabase.from('activity_questions').select('activity_id,question_id,position').eq('activity_id', selectedId).order('position'),
      supabase.from('questions').select('id,type,text,score'),
      supabase.from('question_options').select('id,question_id,label,text,position').order('position'),
      supabase.from('question_keys').select('question_id,correct_option_id,correct_tf,model_answer,grading_criteria,internal_note'),
    ])
    if (aqRes.error || qRes.error || oRes.error || kRes.error) { setError('تعذّر تحميل الأسئلة.'); return }
    const aqList = (aqRes.data ?? []) as AQ[]
    const ids = new Set(aqList.map((x) => x.question_id))
    setAq(aqList)
    setQuestions(((qRes.data ?? []) as Question[]).filter((q) => ids.has(q.id)))
    const om: Record<string, Option[]> = {}
    for (const o of (oRes.data ?? []) as Option[]) { if (ids.has(o.question_id)) (om[o.question_id] ??= []).push(o) }
    setOptions(om)
    const km: Record<string, Key> = {}
    for (const k of (kRes.data ?? []) as Key[]) { if (ids.has(k.question_id)) km[k.question_id] = k }
    setKeys(km)
  }, [selectedId])

  const loadAttempts = useCallback(async () => {
    if (!supabase || !selectedId) return
    setBusy(true)
    const at = await supabase
      .from('attempts')
      .select('id,activity_id,student_id,auto_score,manual_score,status,submitted_at')
      .eq('activity_id', selectedId)
      .order('submitted_at')
    if (at.error) { setError('تعذّر تحميل المحاولات: ' + at.error.message); setBusy(false); return }
    const list = (at.data ?? []) as AttemptRaw[]
    const sids = Array.from(new Set(list.map((x) => x.student_id)))
    const names: Record<string, string> = {}
    if (sids.length > 0) {
      const pr = await supabase.from('profiles').select('id,full_name').in('id', sids)
      if (!pr.error) {
        for (const p of (pr.data ?? []) as { id: string; full_name: string }[]) names[p.id] = p.full_name
      }
    }
    setAttempts(list.map((x) => ({ ...x, student_name: names[x.student_id] ?? '—' })))
    setBusy(false)
  }, [selectedId])

  useEffect(() => { void loadActivities() }, [loadActivities])
  useEffect(() => { void loadQuestions() }, [loadQuestions])
  useEffect(() => { if (view === 'results' && selectedId) void loadAttempts() }, [view, selectedId, loadAttempts])

  async function openGrading(attemptId: string) {
    if (!supabase) return
    setBusy(true); setError(null)
    const an = await supabase
      .from('answers')
      .select('id,question_id,option_id,text_answer,is_correct,awarded_score')
      .eq('attempt_id', attemptId)
    setBusy(false)
    if (an.error) { setError(an.error.message); return }
    const rows = (an.data ?? []) as AnswerRow[]
    setGradingAnswers(rows)
    const g: Record<string, string> = {}
    for (const r of rows) if (r.awarded_score !== null) g[r.question_id] = String(r.awarded_score)
    setGrades(g)
    setGradingAttemptId(attemptId)
  }

  async function saveGrades() {
    if (!supabase || !gradingAttemptId) return
    const list: { question_id: string; score: number }[] = []
    for (const [qid, raw] of Object.entries(grades)) {
      const n = Number(raw)
      if (Number.isFinite(n) && n >= 0) list.push({ question_id: qid, score: n })
    }
    setBusy(true); setError(null)
    const { error: rpcErr } = await supabase.rpc('grade_attempt', {
      p_attempt_id: gradingAttemptId,
      p_grades: list,
    })
    setBusy(false)
    if (rpcErr) { setError(rpcErr.message); return }
    setGradingAttemptId(null)
    setGradingAnswers([])
    setGrades({})
    await loadAttempts()
  }

  function startAdd() { setDraft(emptyDraft()); setEditingId(null); setMode('add') }

  function startEdit(q: Question) {
    const qOpts = options[q.id] ?? []
    const k = keys[q.id]
    setDraft({
      type: q.type,
      text: q.text,
      score: q.score,
      options: qOpts.length === 4
        ? qOpts.map((o) => ({ label: o.label, text: o.text, isCorrect: o.id === k?.correct_option_id }))
        : emptyDraft().options,
      correctTf: k?.correct_tf ?? true,
      modelAnswer: k?.model_answer ?? '',
      gradingCriteria: k?.grading_criteria ?? '',
      internalNote: k?.internal_note ?? '',
    })
    setEditingId(q.id); setMode('add')
  }

  function cancel() { setMode('list'); setEditingId(null); setDraft(emptyDraft()) }

  async function saveDraft() {
    if (!supabase) return
    if (!draft.text.trim()) { setError('نص السؤال مطلوب.'); return }
    if (draft.score < 1) { setError('الدرجة يجب أن تكون 1 على الأقل.'); return }
    if (draft.type === 'mcq') {
      for (const o of draft.options) { if (!o.text.trim()) { setError('كل خيارات MCQ يجب أن تحتوي نصًّا.'); return } }
      if (!draft.options.some((o) => o.isCorrect)) { setError('اختر إجابة صحيحة واحدة.'); return }
    }
    setBusy(true); setError(null)
    try {
      let qid: string | null = editingId
      if (editingId) {
        const { error: upErr } = await supabase.from('questions').update({ type: draft.type, text: draft.text.trim(), score: draft.score }).eq('id', editingId)
        if (upErr) { setError(upErr.message); return }
        await supabase.from('question_keys').delete().eq('question_id', editingId)
        await supabase.from('question_options').delete().eq('question_id', editingId)
      } else {
        const { data, error: insErr } = await supabase.from('questions').insert({ type: draft.type, text: draft.text.trim(), score: draft.score }).select('id').single()
        if (insErr || !data) { setError(insErr?.message ?? 'فشل الإدراج'); return }
        qid = (data as { id: string }).id
        const nextPos = aq.length === 0 ? 1 : Math.max(...aq.map((x) => x.position)) + 1
        const { error: aqErr } = await supabase.from('activity_questions').insert({ activity_id: selectedId, question_id: qid, position: nextPos })
        if (aqErr) { setError(aqErr.message); return }
      }
      if (!qid) return
      if (draft.type === 'mcq') {
        const optRows = draft.options.map((o, i) => ({ question_id: qid, label: o.label, text: o.text.trim(), position: i + 1 }))
        const { data: optData, error: oErr } = await supabase.from('question_options').insert(optRows).select('id,position')
        if (oErr || !optData) { setError(oErr?.message ?? 'فشل حفظ الخيارات'); return }
        const correctIdx = draft.options.findIndex((o) => o.isCorrect)
        const correctId = (optData as { id: string; position: number }[]).find((o) => o.position === correctIdx + 1)?.id ?? null
        await supabase.from('question_keys').insert({ question_id: qid, correct_option_id: correctId, internal_note: draft.internalNote.trim() || null })
      } else if (draft.type === 'tf') {
        await supabase.from('question_keys').insert({ question_id: qid, correct_tf: draft.correctTf, internal_note: draft.internalNote.trim() || null })
      } else {
        await supabase.from('question_keys').insert({ question_id: qid, model_answer: draft.modelAnswer.trim() || null, grading_criteria: draft.gradingCriteria.trim() || null, internal_note: draft.internalNote.trim() || null })
      }
      cancel(); await loadQuestions()
    } finally { setBusy(false) }
  }

  async function deleteQuestion(qid: string) {
    if (!supabase) return
    if (!window.confirm('حذف السؤال؟')) return
    setBusy(true); setError(null)
    await supabase.from('activity_questions').delete().eq('activity_id', selectedId).eq('question_id', qid)
    await supabase.from('questions').delete().eq('id', qid)
    setBusy(false); await loadQuestions()
  }

  async function move(qid: string, dir: -1 | 1, group: AQ[]) {
    if (!supabase) return
    const sorted = [...group].sort((a, b) => a.position - b.position)
    const idx = sorted.findIndex((x) => x.question_id === qid)
    const other = sorted[idx + dir]
    if (!other) return
    const cur = sorted[idx]
    const TEMP = 999999
    setBusy(true)
    await supabase.from('activity_questions').update({ position: TEMP }).eq('activity_id', selectedId).eq('question_id', cur.question_id)
    await supabase.from('activity_questions').update({ position: cur.position }).eq('activity_id', selectedId).eq('question_id', other.question_id)
    await supabase.from('activity_questions').update({ position: other.position }).eq('activity_id', selectedId).eq('question_id', cur.question_id)
    setBusy(false); await loadQuestions()
  }

  async function toggleActivity() {
    if (!supabase || !selectedId) return
    const act = activities.find((a) => a.id === selectedId)
    if (!act) return
    setBusy(true)
    await supabase.from('activities').update({ open: !act.open }).eq('id', act.id)
    setBusy(false); await loadActivities()
  }

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>

  const selAct = activities.find((a) => a.id === selectedId)
  const selWeek = selAct ? weeks.find((w) => w.id === selAct.week_id) : null
  const sortedAq = [...aq].sort((a, b) => a.position - b.position)
  const answeredTypes = TYPE_ORDER.filter((t) => questions.some((q) => q.type === t)).length
  const progressPercent = questions.length === 0 ? 0 : Math.round((answeredTypes / TYPE_ORDER.length) * 100)

  const grouped: Record<QType, AQ[]> = { mcq: [], tf: [], essay_smart: [], essay_reasoning: [] }
  for (const link of sortedAq) {
    const q = questions.find((x) => x.id === link.question_id)
    if (q) grouped[q.type].push(link)
  }

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 pb-7 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">بنك الأسئلة</h2>
            <p className="mt-1 text-base text-white/85">إدارة الأسئلة، عرض نتائج الطلاب، والتصحيح اليدوي.</p>
          </div>
          {selAct && (
            <button
              className={(selAct.open
                ? 'bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/30'
                : 'bg-white text-primary hover:bg-primary-soft') + ' rounded-xl px-5 py-2.5 text-base font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'}
              onClick={() => void toggleActivity()}
              disabled={busy}
            >
              {selAct.open ? 'إغلاق النشاط للطلاب' : 'فتح النشاط للطلاب'}
            </button>
          )}
        </div>

        {activities.length > 0 && (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <select
                className="rounded-xl border border-white/30 bg-white/10 p-3 text-base font-semibold text-white backdrop-blur focus:outline-none focus:ring-2 focus:ring-accent"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {activities.map((a) => {
                  const w = weeks.find((x) => x.id === a.week_id)
                  return <option key={a.id} value={a.id} className="text-ink">الأسبوع {w?.number ?? '?'}: {a.title}</option>
                })}
              </select>

              <div className="inline-flex rounded-xl bg-white/15 p-1 ring-1 ring-white/20">
                <button
                  className={(view === 'questions' ? 'bg-white text-primary shadow-sm' : 'text-white') + ' rounded-lg px-4 py-1.5 text-sm font-semibold transition'}
                  onClick={() => setView('questions')}
                >الأسئلة</button>
                <button
                  className={(view === 'results' ? 'bg-white text-primary shadow-sm' : 'text-white') + ' rounded-lg px-4 py-1.5 text-sm font-semibold transition'}
                  onClick={() => setView('results')}
                >النتائج</button>
              </div>

              {view === 'questions' && (
                <button
                  className="ms-auto rounded-xl bg-white px-5 py-2.5 text-base font-semibold text-primary shadow-sm transition hover:bg-primary-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
                  onClick={startAdd}
                  disabled={busy}
                >
                  + سؤال جديد
                </button>
              )}

              {view === 'results' && (
                <button
                  className="ms-auto rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/25 disabled:opacity-60"
                  onClick={() => void loadAttempts()}
                  disabled={busy}
                >
                  تحديث
                </button>
              )}
            </div>

            {view === 'questions' && (
              <div className="mt-5">
                <div className="flex justify-between text-sm text-white/85">
                  <span>تنوع الأسئلة</span>
                  <span>{answeredTypes} من {TYPE_ORDER.length} أنواع — {questions.length} سؤالًا</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-gradient-to-l from-accent to-accent-soft transition-all" style={{ width: progressPercent + '%' }} />
                </div>
              </div>
            )}
          </>
        )}

        {error && <p className="mt-4 rounded-xl bg-error-soft p-3 text-base font-semibold text-error">{error}</p>}

        <div className="absolute inset-x-0 bottom-0 flex h-1" aria-hidden="true">
          <span className="flex-[3] bg-accent" />
          <span className="flex-1 bg-secondary" />
          <span className="flex-1 bg-warning" />
        </div>
      </section>

      {view === 'questions' && (
        <>
          {mode === 'add' && (
            <DraftEditor draft={draft} setDraft={setDraft} busy={busy} editing={!!editingId} onSave={() => void saveDraft()} onCancel={cancel} />
          )}

          {mode === 'list' && selAct && (
            <div className="space-y-4">
              {TYPE_ORDER.map((t) => {
                const items = grouped[t]
                const groupScore = items.reduce((s, link) => {
                  const q = questions.find((x) => x.id === link.question_id)
                  return s + (q?.score ?? 0)
                }, 0)
                const isOpen = open[t]
                const style = TYPE_STYLE[t]
                return (
                  <section key={t} className={`overflow-hidden rounded-2xl border border-light-blue border-s-4 bg-white shadow-sm transition hover:shadow-md ${style.headerBg}`}>
                    <button
                      className="flex w-full items-center justify-between gap-4 bg-white px-5 py-4 text-start transition hover:bg-primary-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
                      onClick={() => setOpen({ ...open, [t]: !isOpen })}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`rounded-xl border px-4 py-1.5 text-lg font-bold ${style.badgeBg}`}>
                          {TYPE_LABEL[t]}
                        </span>
                        <span className={`text-base font-semibold ${style.headerText}`}>
                          {items.length} سؤال — {groupScore} درجة
                        </span>
                      </div>
                      <span className={`text-2xl ${style.headerText} transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                    </button>

                    {isOpen && (
                      <ul className="space-y-3 border-t border-light-blue bg-bg p-4">
                        {items.length === 0 && (
                          <li className="rounded-xl bg-white p-4 text-center text-base text-ink-muted">لا أسئلة من هذا النوع.</li>
                        )}
                        {items.map((link, i) => {
                          const q = questions.find((x) => x.id === link.question_id)
                          if (!q) return null
                          const qOpts = options[q.id] ?? []
                          const k = keys[q.id]
                          return (
                            <li key={q.id} className="rounded-xl border border-light-blue bg-white p-4 shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                                    <span className={`rounded-lg border px-2 py-0.5 font-semibold ${style.badgeBg}`}>{i + 1}</span>
                                    <span className="rounded-lg bg-primary-soft px-2 py-0.5 font-semibold text-primary">{q.score} درجة</span>
                                    {k?.internal_note && (
                                      <span className="rounded-lg bg-warning-soft px-2 py-0.5 font-semibold text-ink ring-1 ring-warning">⚠ يحتاج مراجعة</span>
                                    )}
                                  </div>
                                  <div className="mt-3 whitespace-pre-wrap text-lg font-semibold leading-8 text-ink">{q.text}</div>
                                  {q.type === 'mcq' && (
                                    <ul className="mt-3 space-y-2 text-base">
                                      {qOpts.map((o) => {
                                        const isCorrect = o.id === k?.correct_option_id
                                        return (
                                          <li key={o.id} className={'flex items-center gap-3 rounded-lg border p-2 ' + (isCorrect ? 'border-secondary/40 bg-secondary-soft font-semibold text-secondary' : 'border-light-blue bg-white text-ink')}>
                                            <span className="w-8 text-center font-bold">{o.label}</span>
                                            <span>{o.text}</span>
                                            {isCorrect && <span className="ms-auto pe-2 text-lg">✓</span>}
                                          </li>
                                        )
                                      })}
                                    </ul>
                                  )}
                                  {q.type === 'tf' && (
                                    <div className="mt-3 text-lg">الإجابة: <b className={k?.correct_tf ? 'text-secondary' : 'text-error'}>{k?.correct_tf ? 'صح ✓' : 'خطأ ✗'}</b></div>
                                  )}
                                  {q.type.startsWith('essay') && k?.model_answer && (
                                    <div className="mt-3 whitespace-pre-wrap rounded-lg border border-light-blue bg-primary-soft p-3 text-base text-ink">
                                      <b className="text-primary">الإجابة النموذجية: </b>{k.model_answer}
                                    </div>
                                  )}
                                  {k?.internal_note && (
                                    <div className="mt-3 rounded-lg bg-warning-soft p-2 text-sm text-ink ring-1 ring-warning"><b>ملاحظة: </b>{k.internal_note}</div>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button className={btnOutline} onClick={() => void move(q.id, -1, items)} disabled={busy || i === 0} title="أعلى">▲</button>
                                  <button className={btnOutline} onClick={() => void move(q.id, 1, items)} disabled={busy || i === items.length - 1} title="أسفل">▼</button>
                                  <button className={btnOutline} onClick={() => startEdit(q)} disabled={busy}>تحرير</button>
                                  <button className={btnDanger} onClick={() => void deleteQuestion(q.id)} disabled={busy}>حذف</button>
                                </div>
                              </div>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </section>
                )
              })}
            </div>
          )}
        </>
      )}

      {view === 'results' && selAct && (
        <>
          <section className={card}>
            <h3 className="text-xl font-bold text-primary">
              نتائج الطلاب — {selWeek ? `الأسبوع ${selWeek.number}` : ''}
            </h3>
            <p className="mt-1 text-sm text-ink-muted">{selAct.title}</p>

            {attempts.length === 0 ? (
              <p className="mt-4 rounded-xl bg-bg p-4 text-center text-base text-ink-muted">لا محاولات بعد لهذا النشاط.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-light-blue text-ink-muted">
                      <th className="p-3 text-start">#</th>
                      <th className="p-3 text-start">اسم الطالب</th>
                      <th className="p-3 text-start">آلية</th>
                      <th className="p-3 text-start">يدوية</th>
                      <th className="p-3 text-start">المجموع</th>
                      <th className="p-3 text-start">الحالة</th>
                      <th className="p-3 text-start">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((a, i) => (
                      <tr key={a.id} className="border-b border-light-blue/50 hover:bg-bg">
                        <td className="p-3">{i + 1}</td>
                        <td className="p-3 text-base font-semibold text-ink">{a.student_name}</td>
                        <td className="p-3 font-semibold text-primary">{a.auto_score}</td>
                        <td className="p-3">{a.manual_score ?? '—'}</td>
                        <td className="p-3 text-lg font-bold text-secondary">{(a.auto_score + (a.manual_score ?? 0)).toFixed(1)}</td>
                        <td className="p-3">
                          {a.status === 'graded' ? (
                            <span className="rounded-lg bg-secondary-soft px-2 py-0.5 text-xs font-semibold text-secondary ring-1 ring-secondary/20">مصحح</span>
                          ) : (
                            <span className="rounded-lg bg-warning-soft px-2 py-0.5 text-xs font-semibold text-ink ring-1 ring-warning">بانتظار التصحيح</span>
                          )}
                        </td>
                        <td className="p-3">
                          <button className={btnOutline} onClick={() => void openGrading(a.id)} disabled={busy}>عرض وتصحيح</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {gradingAttemptId && (
            <section className={card}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl font-bold text-primary">تصحيح المحاولة</h3>
                <button className={btnOutline} onClick={() => { setGradingAttemptId(null); setGradingAnswers([]); setGrades({}) }}>إغلاق</button>
              </div>

              <ul className="space-y-3">
                {gradingAnswers.map((ans, i) => {
                  const q = questions.find((x) => x.id === ans.question_id)
                  if (!q) return null
                  const qOpts = options[q.id] ?? []
                  const chosen = qOpts.find((o) => o.id === ans.option_id)
                  const isEssay = q.type.startsWith('essay')
                  const style = TYPE_STYLE[q.type]
                  return (
                    <li key={ans.id} className="rounded-xl border border-light-blue bg-white p-4">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                        <span className={`rounded-lg border px-2 py-0.5 font-semibold ${style.badgeBg}`}>س{i + 1}</span>
                        <span className="rounded-lg bg-primary-soft px-2 py-0.5 font-semibold text-primary">{q.score} درجة</span>
                        <span className="text-xs">{TYPE_LABEL[q.type]}</span>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-base font-semibold text-ink">{q.text}</div>

                      {q.type === 'mcq' && (
                        <div className="mt-2 text-sm">
                          اختار: <b>{chosen ? `${chosen.label}) ${chosen.text}` : '—'}</b>
                          {' — '}
                          {ans.is_correct ? <span className="font-semibold text-secondary">✓ صحيح</span> : <span className="font-semibold text-error">✗ خطأ</span>}
                        </div>
                      )}
                      {q.type === 'tf' && (
                        <div className="mt-2 text-sm">
                          أجاب: <b>{ans.text_answer === 'true' ? 'صح' : ans.text_answer === 'false' ? 'خطأ' : '—'}</b>
                          {' — '}
                          {ans.is_correct ? <span className="font-semibold text-secondary">✓ صحيح</span> : <span className="font-semibold text-error">✗ خطأ</span>}
                        </div>
                      )}
                      {isEssay && (
                        <>
                          <div className="mt-2 whitespace-pre-wrap rounded-lg bg-bg p-3 text-sm leading-7 text-ink">
                            <b className="text-ink-muted">إجابة الطالب:</b><br />
                            {ans.text_answer || <span className="text-ink-muted">— لم يجب —</span>}
                          </div>
                          {keys[ans.question_id]?.model_answer && (
                            <div className="mt-2 whitespace-pre-wrap rounded-lg bg-primary-soft p-3 text-sm leading-7 text-ink">
                              <b className="text-primary">الإجابة النموذجية: </b>{keys[ans.question_id]?.model_answer}
                            </div>
                          )}
                          <div className="mt-3 flex items-center gap-3">
                            <label className="text-sm font-semibold text-ink">الدرجة (من {q.score}):</label>
                            <input
                              type="number"
                              min={0}
                              max={q.score}
                              step={0.5}
                              className={input + ' mt-0 w-24'}
                              value={grades[ans.question_id] ?? ''}
                              onChange={(e) => setGrades({ ...grades, [ans.question_id]: e.target.value })}
                            />
                          </div>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>

              <div className="mt-4 flex flex-wrap gap-2">
                <button className={btn} onClick={() => void saveGrades()} disabled={busy}>
                  {busy ? 'جارٍ الحفظ...' : 'حفظ الدرجات'}
                </button>
                <button className={btnOutline} onClick={() => { setGradingAttemptId(null); setGradingAnswers([]); setGrades({}) }} disabled={busy}>إلغاء</button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

function DraftEditor({
  draft, setDraft, busy, editing, onSave, onCancel,
}: {
  draft: Draft
  setDraft: (d: Draft) => void
  busy: boolean
  editing: boolean
  onSave: () => void
  onCancel: () => void
}) {
  function setOptionText(i: number, text: string) {
    const next = draft.options.map((o, j) => j === i ? { ...o, text } : o)
    setDraft({ ...draft, options: next })
  }
  function setCorrect(i: number) {
    const next = draft.options.map((o, j) => ({ ...o, isCorrect: j === i }))
    setDraft({ ...draft, options: next })
  }
  return (
    <section className={card}>
      <h3 className="text-2xl font-bold text-primary">{editing ? 'تحرير السؤال' : 'سؤال جديد'}</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label className={label}>النوع</label>
          <select className={input} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as QType })}>
            <option value="mcq">اختيار من متعدد</option>
            <option value="tf">صح/خطأ</option>
            <option value="essay_smart">مقالي ذكي</option>
            <option value="essay_reasoning">مقالي استدلال</option>
          </select>
        </div>
        <div>
          <label className={label}>الدرجة</label>
          <input type="number" min={1} className={input} value={draft.score} onChange={(e) => setDraft({ ...draft, score: parseInt(e.target.value, 10) || 1 })} />
        </div>
      </div>
      <div className="mt-4">
        <label className={label}>نص السؤال</label>
        <textarea rows={4} className={input} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
      </div>

      {draft.type === 'mcq' && (
        <div className="mt-4 space-y-2">
          <div className={label}>الخيارات (اختر الصحيح)</div>
          {draft.options.map((o, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-light-blue bg-bg p-2">
              <input type="radio" name="correct" checked={o.isCorrect} onChange={() => setCorrect(i)} className="h-5 w-5 accent-secondary" />
              <span className="w-8 text-center text-lg font-bold text-primary">{o.label}</span>
              <input className={input + ' mt-0 flex-1'} value={o.text} onChange={(e) => setOptionText(i, e.target.value)} />
            </div>
          ))}
        </div>
      )}

      {draft.type === 'tf' && (
        <div className="mt-4">
          <label className={label}>الإجابة الصحيحة</label>
          <div className="mt-2 flex gap-6 text-lg">
            <label className="flex items-center gap-2"><input type="radio" name="tf" checked={draft.correctTf} onChange={() => setDraft({ ...draft, correctTf: true })} className="h-5 w-5 accent-secondary" /> صح</label>
            <label className="flex items-center gap-2"><input type="radio" name="tf" checked={!draft.correctTf} onChange={() => setDraft({ ...draft, correctTf: false })} className="h-5 w-5 accent-secondary" /> خطأ</label>
          </div>
        </div>
      )}

      {draft.type.startsWith('essay') && (
        <>
          <div className="mt-4">
            <label className={label}>الإجابة النموذجية (اختياري — للأستاذ فقط)</label>
            <textarea rows={4} className={input} value={draft.modelAnswer} onChange={(e) => setDraft({ ...draft, modelAnswer: e.target.value })} />
          </div>
          <div className="mt-4">
            <label className={label}>معايير التصحيح (اختياري)</label>
            <textarea rows={3} className={input} value={draft.gradingCriteria} onChange={(e) => setDraft({ ...draft, gradingCriteria: e.target.value })} />
          </div>
        </>
      )}

      <div className="mt-4">
        <label className={label}>ملاحظة داخلية (اختياري)</label>
        <input className={input} value={draft.internalNote} onChange={(e) => setDraft({ ...draft, internalNote: e.target.value })} />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button className={btn} onClick={onSave} disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ'}</button>
        <button className={btnOutline} onClick={onCancel} disabled={busy}>إلغاء</button>
      </div>
    </section>
  )
}