import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-hover active:bg-primary-active focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent/40'

type QType = 'mcq' | 'tf' | 'essay_smart' | 'essay_reasoning'
type View = 'questions' | 'results'

interface Activity {
  id: string
  week_id: string
  title: string
  open: boolean
  release: string
  published_at: string | null
  randomize_questions?: boolean
}
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
      supabase.from('activities').select('id,week_id,title,open,release,published_at,randomize_questions').order('created_at'),
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
    
    // 1. جلب الأسئلة الـ 30 المخصصة لهذه المحاولة فقط
    const aqRes = await supabase
      .from('attempt_questions')
      .select('question_id, position')
      .eq('attempt_id', attemptId)
      .order('position')
    
    // 2. جلب إجابات الطالب (للمقارنة)
    const an = await supabase
      .from('answers')
      .select('id,question_id,option_id,text_answer,is_correct,awarded_score')
      .eq('attempt_id', attemptId)
      
    setBusy(false)
    
    if (aqRes.error || an.error) { 
      setError('تعذر جلب بيانات التصحيح: ' + (aqRes.error?.message || an.error?.message)); 
      return 
    }
    
    const attemptQs = (aqRes.data ?? []) as { question_id: string, position: number }[]
    const answers = (an.data ?? []) as AnswerRow[]
    
    // خريطة سريعة للبحث عن إجابات الطالب
    const ansMap = new Map<string, AnswerRow>()
    for (const a of answers) ansMap.set(a.question_id, a)
    
    // بناء قائمة العرض بناءً على الأسئلة التي رآها الطالب فقط
    const finalRows: AnswerRow[] = []
    const g: Record<string, string> = {}
    
    for (const aq of attemptQs) {
      const existing = ansMap.get(aq.question_id)
      if (existing) {
        finalRows.push(existing)
        if (existing.awarded_score !== null) g[aq.question_id] = String(existing.awarded_score)
      } else {
        // السؤال موجود في المحاولة ولكن الطالب لم يجب عنه
        finalRows.push({
          id: 'temp-' + aq.question_id,
          question_id: aq.question_id,
          option_id: null,
          text_answer: null,
          is_correct: null,
          awarded_score: null
        })
      }
    }
    
    setGradingAnswers(finalRows)
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

  async function publishActivity() {
    if (!supabase || !selectedId) return
    const act = activities.find((a) => a.id === selectedId)
    if (!act) return
    const alreadyPublished = !!act.published_at
    const msg = alreadyPublished
      ? `إلغاء نشر «${act.title}»؟\n\nلن يظهر في صدارة المنصة حتى تنشر نشاطًا آخر.`
      : `نشر «${act.title}» كصدارة المنصة الحالية؟\n\nسيتحوّل إليه عرض الأوائل، ويفتح تلقائيًا للطلاب.`
    if (!window.confirm(msg)) return
    setBusy(true); setError(null)
    const { error: rpcErr } = await supabase.rpc('publish_activity', {
      p_activity_id: selectedId,
      p_publish: !alreadyPublished,
    })
    setBusy(false)
    if (rpcErr) { setError('تعذّر التغيير: ' + rpcErr.message); return }
    await loadActivities()
  }

  async function toggleRandomize() {
    if (!supabase || !selectedId) return
    const act = activities.find((a) => a.id === selectedId)
    if (!act) return

    setBusy(true)
    await supabase.from('activities').update({ randomize_questions: !act.randomize_questions }).eq('id', act.id)
    setBusy(false); await loadActivities()
  }

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>

  const selAct = activities.find((a) => a.id === selectedId)
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
          
          <div className="flex items-center gap-2 rounded-xl bg-white/10 p-1.5 backdrop-blur-sm">
            <button
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${view === 'questions' ? 'bg-white text-primary shadow-sm' : 'text-white hover:bg-white/20'}`}
              onClick={() => setView('questions')}
            >
              الأسئلة
            </button>
            <button
              className={`rounded-lg px-4 py-2 text-sm font-bold transition-all ${view === 'results' ? 'bg-white text-primary shadow-sm' : 'text-white hover:bg-white/20'}`}
              onClick={() => setView('results')}
            >
              النتائج
            </button>
          </div>
        </div>

        {activities.length > 0 && (
          <div className="mt-5 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="flex-1 rounded-xl border border-white/30 bg-white/10 p-3 text-base font-semibold text-white backdrop-blur focus:outline-none focus:ring-2 focus:ring-accent md:max-w-md cursor-pointer"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {activities.map((a) => {
                  const w = weeks.find((x) => x.id === a.week_id)
                  const flags = `${a.published_at ? '⭐ ' : ''}${a.open ? '🔓 ' : '🔒 '}${a.randomize_questions ? '🎲 ' : ''}`
                  return <option key={a.id} value={a.id} className="text-ink">{flags} الأسبوع {w?.number ?? '?'}: {a.title}</option>
                })}
              </select>

              {view === 'questions' && (
                <button
                  className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-primary shadow-sm transition hover:bg-primary-soft active:scale-95 disabled:opacity-60 flex-shrink-0"
                  onClick={startAdd}
                  disabled={busy}
                >
                  + سؤال جديد
                </button>
              )}

              {view === 'results' && (
                <button
                  className="rounded-xl bg-white/15 px-4 py-3 text-sm font-bold text-white ring-1 ring-white/30 transition hover:bg-white/25 active:scale-95 disabled:opacity-60 flex-shrink-0"
                  onClick={() => void loadAttempts()}
                  disabled={busy}
                >
                  🔄 تحديث النتائج
                </button>
              )}
            </div>

            {selAct && view === 'questions' && (
              <div className="flex flex-wrap items-center gap-2 rounded-xl bg-black/10 p-2">
                <button
                  className={`flex-1 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold transition-all ${selAct.open ? 'bg-white text-primary shadow-sm' : 'text-white hover:bg-white/20'}`}
                  onClick={() => void toggleActivity()}
                  disabled={busy}
                >
                  {selAct.open ? '🔓 متاح للطلاب' : '🔒 مغلق للطلاب'}
                </button>
                <button
                  className={`flex-1 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold transition-all ${selAct.published_at ? 'bg-secondary text-white shadow-sm' : 'text-white hover:bg-white/20'}`}
                  onClick={() => void publishActivity()}
                  disabled={busy}
                >
                  {selAct.published_at ? '⭐ في الصدارة' : '📢 نشر بالصدارة'}
                </button>
                <button
                  className={`flex-1 rounded-lg px-3 py-2 text-xs sm:text-sm font-bold transition-all ${selAct.randomize_questions ? 'bg-accent text-white shadow-sm' : 'text-white hover:bg-white/20'}`}
                  onClick={() => void toggleRandomize()}
                  disabled={busy}
                >
                  {selAct.randomize_questions ? '🎲 عشوائي' : 'ترتيب ثابت'}
                </button>
              </div>
            )}

            {view === 'questions' && (
              <div className="mt-4">
                <div className="flex justify-between text-xs font-bold text-white/85 mb-2">
                  <span>تغطية أنواع الأسئلة</span>
                  <span>{answeredTypes} من {TYPE_ORDER.length} أنواع — الإجمالي: {questions.length} سؤال</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/20">
                  <div className="h-full rounded-full bg-accent transition-all duration-500" style={{ width: progressPercent + '%' }} />
                </div>
              </div>
            )}
          </div>
        )}

        {error && <p className="mt-4 rounded-xl bg-error-soft/90 backdrop-blur-sm p-3 text-sm font-bold text-error border border-error/20">{error}</p>}

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
                  <section key={t} className={`overflow-hidden rounded-2xl border border-light-blue border-s-4 bg-white shadow-sm transition-all duration-300 ${isOpen ? 'shadow-md' : 'hover:shadow-md'} ${style.headerBg}`}>
                    <button
                      className="flex w-full items-center justify-between gap-4 bg-white px-5 py-4 text-start transition-colors hover:bg-primary-soft/50 focus:outline-none"
                      onClick={() => setOpen({ ...open, [t]: !isOpen })}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`rounded-xl border px-4 py-1.5 text-sm font-bold shadow-sm ${style.badgeBg}`}>
                          {TYPE_LABEL[t]}
                        </span>
                        <span className={`text-sm font-bold ${style.headerText}`}>
                          {items.length} سؤال <span className="mx-1 text-light-blue opacity-50">|</span> {groupScore} درجة
                        </span>
                      </div>
                      <span className={`text-lg font-bold text-light-blue transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : ''}`}>▼</span>
                    </button>

                    {isOpen && (
                      <ul className="space-y-3 border-t border-light-blue bg-bg/50 p-4">
                        {items.length === 0 && (
                          <li className="rounded-xl border border-dashed border-light-blue bg-white p-6 text-center text-sm font-bold text-ink-muted">لا توجد أسئلة من هذا النوع.</li>
                        )}
                        {items.map((link, i) => {
                          const q = questions.find((x) => x.id === link.question_id)
                          if (!q) return null
                          const qOpts = options[q.id] ?? []
                          const k = keys[q.id]
                          return (
                            <li key={q.id} className="rounded-xl border border-light-blue bg-white p-4 shadow-sm transition-shadow hover:shadow-md group">
                              <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                                    <span className={`rounded-lg border px-2 py-0.5 shadow-sm ${style.badgeBg}`}>رقم {i + 1}</span>
                                    <span className="rounded-lg bg-primary-soft px-2 py-0.5 text-primary border border-primary/10 shadow-sm">{q.score} درجة</span>
                                    {k?.internal_note && (
                                      <span className="rounded-lg bg-warning-soft px-2 py-0.5 text-warning-dark border border-warning/20 shadow-sm flex items-center gap-1"><span>⚠️</span> ملاحظة</span>
                                    )}
                                  </div>
                                  <div className="mt-3 whitespace-pre-wrap text-base font-semibold leading-relaxed text-ink">{q.text}</div>
                                  
                                  {q.type === 'mcq' && (
                                    <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                      {qOpts.map((o) => {
                                        const isCorrect = o.id === k?.correct_option_id
                                        return (
                                          <li key={o.id} className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors ${isCorrect ? 'border-secondary bg-secondary-soft text-secondary font-bold shadow-sm' : 'border-light-blue bg-bg/50 text-ink'}`}>
                                            <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${isCorrect ? 'bg-secondary text-white' : 'bg-white border border-light-blue'}`}>{o.label}</span>
                                            <span className="flex-1">{o.text}</span>
                                          </li>
                                        )
                                      })}
                                    </ul>
                                  )}
                                  
                                  {q.type === 'tf' && (
                                    <div className="mt-3 flex items-center gap-2 text-sm font-bold bg-bg/50 p-2 rounded-xl border border-light-blue w-fit">
                                      <span className="text-ink-muted">الإجابة الصحيحة:</span>
                                      <span className={`px-2 py-0.5 rounded-md ${k?.correct_tf ? 'bg-secondary-soft text-secondary border border-secondary/20' : 'bg-error-soft text-error border border-error/20'}`}>{k?.correct_tf ? 'صحيح ✓' : 'خطأ ✗'}</span>
                                    </div>
                                  )}
                                  
                                  {q.type.startsWith('essay') && k?.model_answer && (
                                    <div className="mt-4 rounded-xl border border-primary/20 bg-primary-soft/30 p-3 text-sm">
                                      <div className="text-xs font-bold text-primary mb-1 flex items-center gap-1"><span>💡</span> الإجابة النموذجية:</div>
                                      <div className="whitespace-pre-wrap leading-relaxed text-ink font-medium">{k.model_answer}</div>
                                    </div>
                                  )}
                                  
                                  {k?.internal_note && (
                                    <div className="mt-3 rounded-xl bg-warning-soft/30 p-3 text-sm text-ink border border-warning/20">
                                      <span className="font-bold text-warning-dark text-xs mb-1 block">ملاحظة داخلية:</span>
                                      <span className="font-medium">{k.internal_note}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-1.5 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity bg-bg/50 p-1 rounded-xl border border-light-blue">
                                  <div className="flex sm:flex-col gap-1">
                                    <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-ink-muted hover:bg-primary-soft hover:text-primary transition-colors disabled:opacity-30 border border-light-blue/50" onClick={() => void move(q.id, -1, items)} disabled={busy || i === 0} title="تحريك لأعلى">▲</button>
                                    <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-ink-muted hover:bg-primary-soft hover:text-primary transition-colors disabled:opacity-30 border border-light-blue/50" onClick={() => void move(q.id, 1, items)} disabled={busy || i === items.length - 1} title="تحريك لأسفل">▼</button>
                                  </div>
                                  <div className="w-[1px] h-full sm:w-full sm:h-[1px] bg-light-blue mx-0.5"></div>
                                  <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-ink-muted hover:bg-primary hover:text-white transition-colors border border-light-blue/50" onClick={() => startEdit(q)} disabled={busy} title="تعديل السؤال">✏️</button>
                                  <button className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-ink-muted hover:bg-error hover:text-white transition-colors border border-light-blue/50" onClick={() => void deleteQuestion(q.id)} disabled={busy} title="حذف السؤال">🗑️</button>
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
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-light-blue pb-3 mb-4">
              <div>
                <h3 className="text-xl font-bold text-primary">نتائج الطلاب</h3>
                <p className="mt-1 text-xs font-bold text-ink-muted">{selAct.title}</p>
              </div>
            </div>

            {attempts.length === 0 ? (
              <div className="rounded-xl border border-dashed border-light-blue bg-bg p-8 text-center">
                <p className="text-sm font-bold text-ink-muted">لا توجد أي محاولات لهذا النشاط حتى الآن.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-light-blue">
                <table className="w-full text-sm text-start">
                  <thead className="bg-bg/80 border-b border-light-blue">
                    <tr>
                      <th className="p-3 text-start font-bold text-ink-muted w-10">#</th>
                      <th className="p-3 text-start font-bold text-ink-muted">اسم الطالب</th>
                      <th className="p-3 text-center font-bold text-ink-muted">التصحيح الآلي</th>
                      <th className="p-3 text-center font-bold text-ink-muted">التصحيح اليدوي</th>
                      <th className="p-3 text-center font-bold text-ink-muted">المجموع النهائي</th>
                      <th className="p-3 text-center font-bold text-ink-muted">الحالة</th>
                      <th className="p-3 text-end font-bold text-ink-muted">إجراء</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-light-blue/50">
                    {attempts.map((a, i) => {
                      const total = a.auto_score + (a.manual_score ?? 0)
                      const isGraded = a.status === 'graded'
                      return (
                        <tr key={a.id} className="hover:bg-primary-soft/10 transition-colors bg-white">
                          <td className="p-3 font-bold text-ink-muted">{i + 1}</td>
                          <td className="p-3 font-bold text-ink">{a.student_name}</td>
                          <td className="p-3 text-center font-bold text-primary bg-primary-soft/10">{a.auto_score}</td>
                          <td className="p-3 text-center font-bold text-ink-muted">{a.manual_score ?? '—'}</td>
                          <td className="p-3 text-center text-lg font-bold text-secondary bg-secondary-soft/10">{total.toFixed(1)}</td>
                          <td className="p-3 text-center">
                            <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-bold border ${isGraded ? 'bg-secondary-soft text-secondary border-secondary/20' : 'bg-warning-soft text-warning-dark border-warning/20'}`}>
                              {isGraded ? 'مصحح' : 'بانتظار التصحيح'}
                            </span>
                          </td>
                          <td className="p-3 text-end">
                            <button 
                              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${isGraded ? 'bg-white border border-light-blue text-ink-muted hover:border-primary hover:text-primary' : 'bg-primary text-white shadow-sm hover:bg-primary-hover'}`}
                              onClick={() => void openGrading(a.id)} 
                              disabled={busy}
                            >
                              {isGraded ? 'مراجعة' : 'تصحيح الآن'}
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {gradingAttemptId && (
            <section className={`${card} border-primary/30 shadow-lg ring-1 ring-primary/10 relative overflow-hidden`}>
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-accent to-secondary"></div>
              
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-light-blue pb-4">
                <div>
                  <h3 className="text-xl font-bold text-primary">تصحيح ومراجعة إجابات الطالب</h3>
                  <p className="text-xs font-bold text-ink-muted mt-1">يُرجى مراجعة الأسئلة المقالية وإعطاء الدرجة المستحقة.</p>
                </div>
                <button className="flex h-8 w-8 items-center justify-center rounded-full bg-bg text-ink-muted hover:bg-error hover:text-white transition-colors" onClick={() => { setGradingAttemptId(null); setGradingAnswers([]); setGrades({}) }} title="إغلاق">✕</button>
              </div>

              <ul className="space-y-4">
                {gradingAnswers.map((ans, i) => {
                  const q = questions.find((x) => x.id === ans.question_id)
                  if (!q) return null
                  const qOpts = options[q.id] ?? []
                  const chosen = qOpts.find((o) => o.id === ans.option_id)
                  const isEssay = q.type.startsWith('essay')
                  const style = TYPE_STYLE[q.type]
                  
                  return (
                    <li key={ans.id} className="rounded-xl border border-light-blue bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`rounded-lg border px-2.5 py-1 text-xs font-bold shadow-sm ${style.badgeBg}`}>السؤال {i + 1}</span>
                          <span className="text-xs font-bold text-ink-muted px-2 border-r border-light-blue">{TYPE_LABEL[q.type]}</span>
                        </div>
                        <span className="rounded-lg bg-primary-soft border border-primary/20 px-2 py-1 text-xs font-bold text-primary shadow-sm">{q.score} درجة</span>
                      </div>
                      
                      <div className="mb-4 whitespace-pre-wrap text-sm font-bold leading-relaxed text-ink">{q.text}</div>

                      {q.type === 'mcq' && (
                        <div className="flex items-center justify-between rounded-xl bg-bg p-3 border border-light-blue/50">
                          <div className="text-sm font-medium">
                            <span className="text-ink-muted ml-2">اختيار الطالب:</span>
                            <span className="font-bold">{chosen ? `${chosen.label}) ${chosen.text}` : '—'}</span>
                          </div>
                          <div className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold border ${ans.is_correct ? 'bg-secondary-soft text-secondary border-secondary/20' : 'bg-error-soft text-error border-error/20'}`}>
                            {ans.is_correct ? '✓ إجابة صحيحة' : '✗ إجابة خاطئة'}
                          </div>
                        </div>
                      )}
                      
                      {q.type === 'tf' && (
                        <div className="flex items-center justify-between rounded-xl bg-bg p-3 border border-light-blue/50">
                          <div className="text-sm font-medium">
                            <span className="text-ink-muted ml-2">إجابة الطالب:</span>
                            <span className="font-bold">{ans.text_answer === 'true' ? 'صح' : ans.text_answer === 'false' ? 'خطأ' : '—'}</span>
                          </div>
                          <div className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs font-bold border ${ans.is_correct ? 'bg-secondary-soft text-secondary border-secondary/20' : 'bg-error-soft text-error border-error/20'}`}>
                            {ans.is_correct ? '✓ إجابة صحيحة' : '✗ إجابة خاطئة'}
                          </div>
                        </div>
                      )}
                      
                      {isEssay && (
                        <div className="space-y-3">
                          <div className="rounded-xl border border-ink/10 bg-bg/50 p-4">
                            <div className="text-xs font-bold text-ink-muted mb-2 flex items-center gap-1"><span>✍️</span> إجابة الطالب:</div>
                            <div className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-ink">
                              {ans.text_answer ? ans.text_answer : <span className="text-error italic">— لم يقم الطالب بالإجابة —</span>}
                            </div>
                          </div>
                          
                          {keys[ans.question_id]?.model_answer && (
                            <div className="rounded-xl border border-primary/20 bg-primary-soft/30 p-4">
                              <div className="text-xs font-bold text-primary mb-2 flex items-center gap-1"><span>💡</span> الإجابة النموذجية (للمطابقة):</div>
                              <div className="whitespace-pre-wrap text-sm font-medium leading-relaxed text-ink/80">
                                {keys[ans.question_id]?.model_answer}
                              </div>
                            </div>
                          )}
                          
                          <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-light-blue border-dashed">
                            <label className="text-sm font-bold text-ink">تحديد الدرجة:</label>
                            <div className="relative">
                              <input
                                type="number"
                                min={0}
                                max={q.score}
                                step={0.5}
                                className="w-24 rounded-lg border border-primary bg-white px-3 py-2 text-center text-lg font-bold text-primary shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                                value={grades[ans.question_id] ?? ''}
                                onChange={(e) => setGrades({ ...grades, [ans.question_id]: e.target.value })}
                                placeholder="0"
                              />
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">/{q.score}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </li>
                  )
                })}
              </ul>

              <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-light-blue pt-4">
                <button className="rounded-xl border border-light-blue bg-white px-5 py-2.5 text-sm font-bold text-ink hover:bg-bg transition-colors" onClick={() => { setGradingAttemptId(null); setGradingAnswers([]); setGrades({}) }} disabled={busy}>إلغاء وتراجع</button>
                <button className={btn + " flex items-center gap-2"} onClick={() => void saveGrades()} disabled={busy}>
                  <span>{busy ? '⏳' : '💾'}</span> <span>{busy ? 'جارٍ الحفظ...' : 'حفظ درجات الطالب'}</span>
                </button>
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
    <section className="rounded-2xl border-2 border-primary/20 bg-white p-6 shadow-lg">
      <div className="flex items-center justify-between border-b border-light-blue pb-4 mb-5">
        <h3 className="text-xl font-bold text-primary flex items-center gap-2">
          <span>{editing ? '✏️' : '➕'}</span>
          <span>{editing ? 'تحرير السؤال' : 'إضافة سؤال جديد'}</span>
        </h3>
      </div>
      
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 bg-bg/30 p-4 rounded-xl border border-light-blue mb-5">
        <div>
          <label className="text-sm font-bold text-ink-muted mb-1.5 block">نوع السؤال</label>
          <select className={input + " font-bold text-primary"} value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value as QType })}>
            <option value="mcq">اختيار من متعدد</option>
            <option value="tf">صح / خطأ</option>
            <option value="essay_smart">مقالي ذكي (تصحيح آلي)</option>
            <option value="essay_reasoning">مقالي استدلال (تصحيح يدوي)</option>
          </select>
        </div>
        <div>
          <label className="text-sm font-bold text-ink-muted mb-1.5 block">درجة السؤال</label>
          <div className="relative">
            <input type="number" min={1} className={input + " font-bold text-primary text-center pe-10"} value={draft.score} onChange={(e) => setDraft({ ...draft, score: parseInt(e.target.value, 10) || 1 })} />
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted">درجات</span>
          </div>
        </div>
      </div>
      
      <div className="mb-5">
        <label className="text-sm font-bold text-ink-muted mb-1.5 flex items-center gap-1"><span>📝</span> نص السؤال الأساسي <span className="text-error">*</span></label>
        <textarea rows={4} className={input + " resize-none font-medium leading-relaxed"} placeholder="اكتب صيغة السؤال بوضوح هنا..." value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
      </div>

      {draft.type === 'mcq' && (
        <div className="mb-5 space-y-3 bg-primary-soft/10 p-4 rounded-xl border border-primary/20">
          <div className="text-sm font-bold text-primary mb-2 flex items-center justify-between">
            <span>الخيارات</span>
            <span className="text-xs font-medium text-ink-muted bg-white px-2 py-1 rounded-md shadow-sm border border-light-blue">حدد الإجابة الصحيحة بالدائرة</span>
          </div>
          {draft.options.map((o, i) => (
            <div key={i} className={`flex items-center gap-3 rounded-xl border p-2 transition-colors ${o.isCorrect ? 'border-secondary bg-secondary-soft/20 shadow-sm' : 'border-light-blue bg-white'}`}>
              <div className="flex items-center justify-center ps-2">
                <input type="radio" name="correct" checked={o.isCorrect} onChange={() => setCorrect(i)} className="h-5 w-5 accent-secondary cursor-pointer" title="تحديد كإجابة صحيحة" />
              </div>
              <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${o.isCorrect ? 'bg-secondary text-white' : 'bg-bg text-ink-muted border border-light-blue'}`}>{o.label}</span>
              <input className="flex-1 bg-transparent px-2 py-1.5 text-sm font-medium focus:outline-none placeholder:text-ink-muted/50" placeholder={`اكتب الخيار ${o.label}...`} value={o.text} onChange={(e) => setOptionText(i, e.target.value)} />
            </div>
          ))}
        </div>
      )}

      {draft.type === 'tf' && (
        <div className="mb-5 bg-primary-soft/10 p-5 rounded-xl border border-primary/20 text-center">
          <label className="text-sm font-bold text-primary mb-4 block">ما هي الإجابة الصحيحة لهذا السؤال؟</label>
          <div className="flex justify-center gap-4">
            <button 
              className={`flex items-center justify-center gap-2 w-32 py-3 rounded-xl border-2 font-bold transition-all ${draft.correctTf ? 'border-secondary bg-secondary-soft text-secondary shadow-md' : 'border-light-blue bg-white text-ink-muted hover:border-secondary/50'}`}
              onClick={() => setDraft({ ...draft, correctTf: true })}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${draft.correctTf ? 'border-secondary' : 'border-ink-muted'}`}>
                {draft.correctTf && <div className="w-2 h-2 rounded-full bg-secondary"></div>}
              </div>
              صح
            </button>
            <button 
              className={`flex items-center justify-center gap-2 w-32 py-3 rounded-xl border-2 font-bold transition-all ${!draft.correctTf ? 'border-error bg-error-soft text-error shadow-md' : 'border-light-blue bg-white text-ink-muted hover:border-error/50'}`}
              onClick={() => setDraft({ ...draft, correctTf: false })}
            >
              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${!draft.correctTf ? 'border-error' : 'border-ink-muted'}`}>
                {!draft.correctTf && <div className="w-2 h-2 rounded-full bg-error"></div>}
              </div>
              خطأ
            </button>
          </div>
        </div>
      )}

      {draft.type.startsWith('essay') && (
        <div className="mb-5 space-y-4 bg-primary-soft/10 p-4 rounded-xl border border-primary/20">
          <div>
            <label className="text-sm font-bold text-primary mb-1.5 flex items-center gap-1"><span>💡</span> الإجابة النموذجية <span className="text-[10px] font-normal text-ink-muted bg-white px-2 py-0.5 rounded border ml-2">(للاسترشاد بها أثناء التصحيح اليدوي)</span></label>
            <textarea rows={3} className={input + " resize-none text-sm"} placeholder="اكتب الإجابة المثالية التي تتوقعها من الطالب..." value={draft.modelAnswer} onChange={(e) => setDraft({ ...draft, modelAnswer: e.target.value })} />
          </div>
          <div>
            <label className="text-sm font-bold text-primary mb-1.5 flex items-center gap-1"><span>⚖️</span> معايير التصحيح والتوزيع <span className="text-[10px] font-normal text-ink-muted bg-white px-2 py-0.5 rounded border ml-2">(مثال: نصف درجة على التعريف، ونصف على المثال)</span></label>
            <textarea rows={2} className={input + " resize-none text-sm"} placeholder="كيف ستوزع الدرجات على أجزاء الإجابة..." value={draft.gradingCriteria} onChange={(e) => setDraft({ ...draft, gradingCriteria: e.target.value })} />
          </div>
        </div>
      )}

      <div className="mb-6">
        <label className="text-sm font-bold text-ink-muted mb-1.5 flex items-center gap-1"><span>📌</span> ملاحظة داخلية <span className="text-[10px] font-normal bg-bg px-2 py-0.5 rounded border ml-2">(لا تظهر للطالب أبداً)</span></label>
        <input className={input + " text-sm bg-bg"} placeholder="أي ملاحظة تود تذكرها عن هذا السؤال..." value={draft.internalNote} onChange={(e) => setDraft({ ...draft, internalNote: e.target.value })} />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-3 border-t border-light-blue pt-5">
        <button className="rounded-xl border border-light-blue bg-white px-6 py-2.5 text-sm font-bold text-ink hover:bg-bg transition-colors" onClick={onCancel} disabled={busy}>إلغاء وتراجع</button>
        <button className={btn + " flex items-center gap-2 px-8"} onClick={onSave} disabled={busy}>
          <span>{busy ? '⏳' : '💾'}</span> <span>{busy ? 'جارٍ الحفظ...' : 'حفظ السؤال'}</span>
        </button>
      </div>
    </section>
  )
}