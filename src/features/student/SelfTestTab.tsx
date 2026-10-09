import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-hover active:bg-primary-active focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary-soft disabled:opacity-60'
const btnDanger = 'rounded-xl border border-error bg-white px-3 py-1.5 text-sm font-semibold text-error transition hover:bg-error-soft disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent/40'

type QType = 'mcq' | 'tf' | 'essay_smart' | 'essay_reasoning'

interface Activity { id: string; week_id: string; title: string; release: string }
interface Week { id: string; number: number; title: string }
interface Question { id: string; type: QType; text: string; score: number }
interface Option { id: string; question_id: string; label: string; text: string; position: number }
interface AQ { activity_id: string; question_id: string; position: number }
interface Attempt { id: string; activity_id: string; auto_score: number; manual_score: number | null; status: string; submitted_at: string | null }
interface AnswerRow { id: string; question_id: string; option_id: string | null; text_answer: string | null; is_correct: boolean | null; awarded_score: number | null }
interface AnswerState { optionId?: string; text?: string; tf?: string }
interface RetakeRow { id: string; activity_id: string; status: string; reason: string; created_at: string }

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

export default function SelfTestTab({ onAttemptSaved }: { onAttemptSaved?: () => void } = {}) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [weeks, setWeeks] = useState<Week[]>([])
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({})
  const [retakes, setRetakes] = useState<Record<string, RetakeRow>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [running, setRunning] = useState<Activity | null>(null)
  const [mode, setMode] = useState<'edit' | 'review'>('edit')
  const [questions, setQuestions] = useState<Question[]>([])
  const [options, setOptions] = useState<Record<string, Option[]>>({})
  const [aq, setAq] = useState<AQ[]>([])
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({})
  const [reviewAnswers, setReviewAnswers] = useState<Record<string, AnswerRow>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [busy, setBusy] = useState(false)
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [result, setResult] = useState<{ auto: number; total: number; answered: number } | null>(null)
  const [open, setOpen] = useState<Record<QType, boolean>>({
    mcq: false, tf: false, essay_smart: false, essay_reasoning: false,
  })

  const [retakeModal, setRetakeModal] = useState<{ activityId: string; attemptId: string; activityTitle: string } | null>(null)
  const [retakeReason, setRetakeReason] = useState('')
  const [retakeError, setRetakeError] = useState<string | null>(null)
  const [retakeSubmitting, setRetakeSubmitting] = useState(false)

  const load = useCallback(async () => {
    if (!supabase) return
    const [a, w, at, rq] = await Promise.all([
      supabase.from('activities').select('id,week_id,title,release'),
      supabase.from('weeks').select('id,number,title').order('number'),
      supabase.from('attempts').select('id,activity_id,auto_score,manual_score,status,submitted_at'),
      supabase.from('retake_requests').select('id,activity_id,status,reason,created_at').order('created_at', { ascending: false }),
    ])
    if (a.error || w.error || at.error || rq.error) {
      setError('تعذّر التحميل.')
    } else {
      setActivities((a.data ?? []) as Activity[])
      setWeeks((w.data ?? []) as Week[])
      const m: Record<string, Attempt> = {}
      for (const t of (at.data ?? []) as Attempt[]) m[t.activity_id] = t
      setAttempts(m)
      const rm: Record<string, RetakeRow> = {}
      for (const r of (rq.data ?? []) as RetakeRow[]) {
        if (!rm[r.activity_id]) rm[r.activity_id] = r
      }
      setRetakes(rm)
      setError(null)
    }
  }, [])

  const initialLoad = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    await load()
    setLoading(false)
  }, [load])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    // إعادة تحميل حالة النشاط الحالي إن كنا داخله
    if (running && supabase) {
      const fresh = (await supabase.from('attempts')
        .select('id,activity_id,auto_score,manual_score,status,submitted_at')
        .eq('activity_id', running.id)
        .maybeSingle()).data as Attempt | null
      if (fresh) {
        // لو الحالة تغيرت من submitted إلى graded → نُحدّث الواجهة للمراجعة
        if (fresh.status === 'graded' && mode === 'edit') {
          const stored = await supabase.from('answers')
            .select('id,question_id,option_id,text_answer,is_correct,awarded_score')
            .eq('attempt_id', fresh.id)
          const map: Record<string, AnswerRow> = {}
          for (const row of (stored.data ?? []) as AnswerRow[]) map[row.question_id] = row
          setReviewAnswers(map)
          setMode('review')
          setAnswers({})
          await loadNotes(running.id)
        }
      }
    }
    setRefreshing(false)
  }, [load, running, mode])

  useEffect(() => { void initialLoad() }, [initialLoad])

  async function loadExamData(activityId: string) {
    if (!supabase) return null
    const [qRes, aqRes, oRes] = await Promise.all([
      supabase.from('questions').select('id,type,text,score'),
      supabase.from('activity_questions').select('activity_id,question_id,position').eq('activity_id', activityId).order('position'),
      supabase.from('question_options').select('id,question_id,label,text,position').order('position'),
    ])
    if (qRes.error || aqRes.error || oRes.error) return null
    const aqList = (aqRes.data ?? []) as AQ[]
    const ids = new Set(aqList.map((x) => x.question_id))
    const qs = ((qRes.data ?? []) as Question[]).filter((q) => ids.has(q.id))
    const om: Record<string, Option[]> = {}
    for (const o of (oRes.data ?? []) as Option[]) {
      if (ids.has(o.question_id)) (om[o.question_id] ??= []).push(o)
    }
    return { questions: qs, options: om, aq: aqList }
  }

  async function loadNotes(activityId: string) {
    if (!supabase) return
    const { data, error: rpcErr } = await supabase.rpc('get_my_question_notes', { p_activity_id: activityId })
    if (rpcErr) { setNotes({}); return }
    const nm: Record<string, string> = {}
    for (const row of (data ?? []) as { question_id: string; note: string }[]) {
      if (row.note) nm[row.question_id] = row.note
    }
    setNotes(nm)
  }

  async function start(act: Activity) {
    if (!supabase) return
    setError(null)
    const data = await loadExamData(act.id)
    if (!data) { setError('تعذّر تحميل الأسئلة.'); return }
    setQuestions(data.questions)
    setOptions(data.options)
    setAq(data.aq)
    setResult(null)
    setOpen({ mcq: false, tf: false, essay_smart: false, essay_reasoning: false })

    const existing = attempts[act.id]
    if (existing) {
      const stored = await supabase.from('answers')
        .select('id,question_id,option_id,text_answer,is_correct,awarded_score')
        .eq('attempt_id', existing.id)
      const rows = (stored.data ?? []) as AnswerRow[]

      if (existing.status === 'graded') {
        setMode('review')
        const map: Record<string, AnswerRow> = {}
        for (const row of rows) map[row.question_id] = row
        setReviewAnswers(map)
        setAnswers({})
        await loadNotes(act.id)
      } else {
        setMode('edit')
        const st: Record<string, AnswerState> = {}
        for (const row of rows) {
          const q = data.questions.find((x) => x.id === row.question_id)
          if (!q) continue
          if (q.type === 'mcq' && row.option_id) st[row.question_id] = { optionId: row.option_id }
          else if (q.type === 'tf' && row.text_answer) st[row.question_id] = { tf: row.text_answer }
          else if (q.type.startsWith('essay') && row.text_answer) st[row.question_id] = { text: row.text_answer }
        }
        setAnswers(st)
        setReviewAnswers({})
        setNotes({})
      }
    } else {
      setMode('edit')
      setAnswers({})
      setReviewAnswers({})
      setNotes({})
    }
    setSaveStatus('idle')
    setRunning(act)
  }

  function countAnswered(): number {
    let n = 0
    for (const q of questions) {
      const a = answers[q.id]
      if (!a) continue
      if (q.type === 'mcq' && a.optionId) n++
      else if (q.type === 'tf' && a.tf) n++
      else if (q.type.startsWith('essay') && (a.text ?? '').trim()) n++
    }
    return n
  }

  async function saveDraft(answersState: Record<string, AnswerState>) {
    if (!supabase || !running) return
    const list: { question_id: string; option_id?: string; text_answer?: string }[] = []
    for (const q of questions) {
      const a = answersState[q.id]
      if (!a) continue
      if (q.type === 'mcq' && a.optionId) list.push({ question_id: q.id, option_id: a.optionId })
      else if (q.type === 'tf' && a.tf) list.push({ question_id: q.id, text_answer: a.tf })
      else if (q.type.startsWith('essay') && (a.text ?? '').trim()) list.push({ question_id: q.id, text_answer: a.text })
    }
    setSaveStatus('saving')
    const { error: rpcErr } = await supabase.rpc('submit_attempt', {
      p_activity_id: running.id, p_answers: list, p_submit: false,
    })
    setSaveStatus(rpcErr ? 'error' : 'saved')
    if (!rpcErr) setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 1500)
  }

  useEffect(() => {
    if (!running || mode !== 'edit') return
    const timer = setTimeout(() => { void saveDraft(answers) }, 800)
    return () => clearTimeout(timer)
  }, [answers, running, mode]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submitFinal() {
    if (!supabase || !running) return
    const answeredCount = countAnswered()
    if (answeredCount === 0) { setError('أجب على سؤال واحد على الأقل.'); return }
    setBusy(true); setError(null)
    const list: { question_id: string; option_id?: string; text_answer?: string }[] = []
    for (const q of questions) {
      const a = answers[q.id]
      if (!a) continue
      if (q.type === 'mcq' && a.optionId) list.push({ question_id: q.id, option_id: a.optionId })
      else if (q.type === 'tf' && a.tf) list.push({ question_id: q.id, text_answer: a.tf })
      else if (q.type.startsWith('essay')) list.push({ question_id: q.id, text_answer: a.text ?? '' })
    }
    const { data, error: rpcErr } = await supabase.rpc('submit_attempt', {
      p_activity_id: running.id, p_answers: list, p_submit: true,
    })
    setBusy(false)
    if (rpcErr) { setError(rpcErr.message); return }
    const r = data as { auto_score: number } | null
    const totalScore = questions.reduce((s, q) => s + q.score, 0)
    setResult({ auto: r?.auto_score ?? 0, total: totalScore, answered: list.length })
    await load()
    onAttemptSaved?.()
  }

  async function retakeMyself(act: Activity) {
    if (!supabase) return
    if (!window.confirm('إعادة الاختبار؟ سيُحذف ما أجبت عنه حاليًا ويمكنك البدء من جديد.')) return
    setBusy(true); setError(null)
    const { error: rpcErr } = await supabase.rpc('reset_my_attempt', { p_activity_id: act.id })
    setBusy(false)
    if (rpcErr) { setError(rpcErr.message); return }
    await load()
    onAttemptSaved?.()
    void start(act)
  }

  function openRetakeModal(act: Activity, attemptId: string) {
    setRetakeModal({ activityId: act.id, attemptId, activityTitle: act.title })
    setRetakeReason(''); setRetakeError(null)
  }

  async function submitRetakeRequest() {
    if (!supabase || !retakeModal) return
    const r = retakeReason.trim()
    if (r.length < 3) { setRetakeError('اكتب سببًا واضحًا (3 أحرف على الأقل).'); return }
    setRetakeSubmitting(true); setRetakeError(null)
    const { error: rpcErr } = await supabase.rpc('request_retake', {
      p_attempt_id: retakeModal.attemptId, p_reason: r,
    })
    setRetakeSubmitting(false)
    if (rpcErr) {
      const msg = rpcErr.message.includes('already_requested')
        ? 'طلبت الإعادة سابقًا — بانتظار الأستاذ.'
        : rpcErr.message
      setRetakeError(msg); return
    }
    setRetakeModal(null)
    await load()
  }

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>

  /* ============ شاشة النتيجة ============ */
  if (running && result) {
    const essayCount = questions.filter((q) => q.type.startsWith('essay')).length
    return (
      <section className={card}>
        <div className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
          <h2 className="text-3xl font-bold">تم حفظ الإجابات</h2>
          <p className="mt-1 text-base text-white/85">يمكنك تعديل إجاباتك حتى يصحح الأستاذ.</p>
        </div>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-light-blue bg-bg p-5">
            <div className="text-sm text-ink-muted">الدرجة الآلية</div>
            <div className="mt-1 text-4xl font-bold text-primary" dir="ltr">{result.auto} / {result.total}</div>
          </div>
          <div className="rounded-2xl border border-light-blue bg-bg p-5">
            <div className="text-sm text-ink-muted">عدد الأسئلة المُجاب عنها</div>
            <div className="mt-1 text-4xl font-bold text-primary" dir="ltr">{result.answered} / {questions.length}</div>
          </div>
          {essayCount > 0 && (
            <div className="rounded-2xl border border-warning bg-warning-soft p-5">
              <div className="text-sm font-semibold text-ink">بانتظار تصحيح الأستاذ</div>
              <div className="mt-1 text-2xl font-bold text-ink">{essayCount} سؤالًا</div>
            </div>
          )}
        </div>
        <div className="mt-5 flex flex-wrap gap-3">
          <button className={btn} onClick={() => { setRunning(null); setResult(null); setMode('edit') }}>
            عودة للاختبارات
          </button>
        </div>
      </section>
    )
  }

  /* ============ شاشة الاختبار / المراجعة ============ */
  if (running) {
    const sortedAq = [...aq].sort((a, b) => a.position - b.position)
    const grouped: Record<QType, AQ[]> = { mcq: [], tf: [], essay_smart: [], essay_reasoning: [] }
    for (const link of sortedAq) {
      const q = questions.find((x) => x.id === link.question_id)
      if (q) grouped[q.type].push(link)
    }
    const week = weeks.find((w) => w.id === running.week_id)
    const totalScore = questions.reduce((s, q) => s + q.score, 0)
    const answered = countAnswered()
    const isReview = mode === 'review'

    return (
      <div className="space-y-5">
        <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 pb-7 text-white shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-bold">
                {week ? `بنك أسئلة الأسبوع ${week.number}` : 'بنك الأسئلة'}
                {isReview && <span className="ms-3 rounded-lg bg-white/20 px-3 py-1 text-base">مراجعة بعد التصحيح</span>}
              </h2>
              <p className="mt-1 text-base text-white/85">{running.title}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                className="rounded-xl bg-white/15 px-5 py-2.5 text-base font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/25 disabled:opacity-60"
                onClick={() => void refresh()}
                disabled={refreshing || busy}
              >
                {refreshing ? '⏳ جارٍ التحديث...' : '🔄 تحديث'}
              </button>
              <button
                className="rounded-xl bg-white/15 px-5 py-2.5 text-base font-semibold text-white ring-1 ring-white/30 transition hover:bg-white/25"
                onClick={() => { setRunning(null); setResult(null); setMode('edit') }}
                disabled={busy}
              >
                عودة
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="rounded-xl bg-white/15 px-4 py-2 text-sm text-white ring-1 ring-white/20">
              {isReview ? `مجاب: ${Object.keys(reviewAnswers).length} / ${questions.length}` : `أجبت: ${answered} / ${questions.length}`}
            </span>
            {!isReview && (
              <>
                <span className="rounded-xl bg-white/15 px-4 py-2 text-sm text-white ring-1 ring-white/20">
                  الدرجة العظمى: {totalScore}
                </span>
                {saveStatus === 'saving' && <span className="rounded-xl bg-white/15 px-4 py-2 text-sm text-white ring-1 ring-white/20">جارٍ الحفظ...</span>}
                {saveStatus === 'saved' && <span className="rounded-xl bg-secondary-soft px-4 py-2 text-sm font-semibold text-secondary ring-1 ring-secondary/20">تم الحفظ</span>}
                {saveStatus === 'error' && <span className="rounded-xl bg-error-soft px-4 py-2 text-sm font-semibold text-error ring-1 ring-error/20">فشل الحفظ</span>}
              </>
            )}
          </div>
          <div className="absolute inset-x-0 bottom-0 flex h-1" aria-hidden="true">
            <span className="flex-[3] bg-accent" />
            <span className="flex-1 bg-secondary" />
            <span className="flex-1 bg-warning" />
          </div>
        </section>

        {TYPE_ORDER.map((t) => {
          const items = grouped[t]
          if (items.length === 0) return null
          const groupScore = items.reduce((s, link) => {
            const q = questions.find((x) => x.id === link.question_id)
            return s + (q?.score ?? 0)
          }, 0)
          const isOpen = open[t]
          const style = TYPE_STYLE[t]
          return (
            <section key={t} className={`overflow-hidden rounded-2xl border border-light-blue border-s-4 bg-white shadow-sm ${style.headerBg}`}>
              <button
                className="flex w-full items-center justify-between gap-4 bg-white px-5 py-4 text-start hover:bg-primary-soft"
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
                  {items.map((link, i) => {
                    const q = questions.find((x) => x.id === link.question_id)
                    if (!q) return null
                    const qOpts = options[q.id] ?? []
                    const a = answers[q.id] ?? {}
                    const rev = reviewAnswers[q.id]

                    return (
                      <li key={q.id} className="rounded-xl border border-light-blue bg-white p-4 shadow-sm">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                          <span className={`rounded-lg border px-2 py-0.5 font-semibold ${style.badgeBg}`}>{i + 1}</span>
                          <span className="rounded-lg bg-primary-soft px-2 py-0.5 font-semibold text-primary">{q.score} درجة</span>
                          {isReview && rev?.awarded_score !== null && rev?.awarded_score !== undefined && (
                            <span className={
                              'rounded-lg px-2 py-0.5 font-semibold ' +
                              (rev.awarded_score === q.score
                                ? 'bg-secondary-soft text-secondary ring-1 ring-secondary/20'
                                : rev.awarded_score > 0
                                  ? 'bg-accent-soft/40 text-primary ring-1 ring-accent/50'
                                  : 'bg-error-soft text-error ring-1 ring-error/30')
                            }>
                              حصلت: {rev.awarded_score}
                            </span>
                          )}
                          {isReview && !rev && (
                            <span className="rounded-lg bg-error-soft px-2 py-0.5 font-semibold text-error ring-1 ring-error/20">لم تجب</span>
                          )}
                        </div>

                        <div className="mt-3 whitespace-pre-wrap text-lg font-semibold leading-8 text-ink">{q.text}</div>

                        {q.type === 'mcq' && (
                          <div className="mt-3 space-y-2">
                            {qOpts.map((o) => {
                              const checked = isReview ? rev?.option_id === o.id : a.optionId === o.id
                              const wrongPick = isReview && checked && rev?.is_correct === false
                              const rightPick = isReview && checked && rev?.is_correct === true
                              return (
                                <label key={o.id} className={
                                  'flex items-center gap-3 rounded-lg border p-3 text-base transition ' +
                                  (checked
                                    ? wrongPick
                                      ? 'border-error bg-error-soft font-semibold text-error'
                                      : rightPick
                                        ? 'border-secondary bg-secondary-soft font-semibold text-secondary'
                                        : 'border-primary bg-primary-soft font-semibold text-primary'
                                    : 'border-light-blue bg-white text-ink ' + (isReview ? '' : 'cursor-pointer hover:bg-primary-soft/40'))
                                }>
                                  <input type="radio" name={'q-' + q.id} checked={checked} disabled={isReview} onChange={() => setAnswers({ ...answers, [q.id]: { optionId: o.id } })} className="h-5 w-5 accent-primary" />
                                  <span className="w-8 text-center font-bold text-primary">{o.label}</span>
                                  <span>{o.text}</span>
                                  {isReview && checked && <span className="ms-auto text-sm font-bold">{rev?.is_correct ? '✓' : '✗'}</span>}
                                </label>
                              )
                            })}
                          </div>
                        )}

                        {q.type === 'tf' && (
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            {[{ v: 'true', l: 'صح' }, { v: 'false', l: 'خطأ' }].map((c) => {
                              const current = isReview ? rev?.text_answer : a.tf
                              const checked = current === c.v
                              const wrongPick = isReview && checked && rev?.is_correct === false
                              const rightPick = isReview && checked && rev?.is_correct === true
                              return (
                                <label key={c.v} className={
                                  'flex items-center justify-center gap-3 rounded-lg border p-3 text-base font-semibold transition ' +
                                  (checked
                                    ? wrongPick
                                      ? 'border-error bg-error-soft text-error'
                                      : rightPick
                                        ? 'border-secondary bg-secondary-soft text-secondary'
                                        : 'border-primary bg-primary-soft text-primary'
                                    : 'border-light-blue bg-white text-ink ' + (isReview ? '' : 'cursor-pointer hover:bg-secondary-soft/40'))
                                }>
                                  <input type="radio" name={'q-' + q.id} checked={checked} disabled={isReview} onChange={() => setAnswers({ ...answers, [q.id]: { tf: c.v } })} className="h-5 w-5 accent-secondary" />
                                  {c.l}
                                  {isReview && checked && <span className="ms-1 text-sm font-bold">{rev?.is_correct ? '✓' : '✗'}</span>}
                                </label>
                              )
                            })}
                          </div>
                        )}

                        {q.type.startsWith('essay') && (
                          isReview ? (
                            <div className="mt-3 whitespace-pre-wrap rounded-lg bg-bg p-3 text-base leading-7 text-ink">
                              {rev?.text_answer || <span className="text-ink-muted">— لم تجب —</span>}
                            </div>
                          ) : (
                            <textarea rows={6} className={input + ' mt-3 text-lg leading-8'} placeholder="اكتب إجابتك هنا..." value={a.text ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: { text: e.target.value } })} />
                          )
                        )}

                        {isReview && notes[q.id] && (
                          <div className="mt-3 rounded-lg border border-accent/40 bg-accent-soft/30 p-3 text-sm leading-7 text-ink">
                            <b className="text-primary">💡 التوضيح: </b>
                            {notes[q.id]}
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          )
        })}

        {error && <p className="rounded-xl bg-error-soft p-3 text-base font-semibold text-error">{error}</p>}

        {!isReview && (
          <>
            <div className="rounded-2xl border border-light-blue bg-primary-soft/40 p-4 text-sm text-ink">
              <b>ملاحظة:</b> يمكنك تعديل إجاباتك في أي وقت قبل أن يصحح الأستاذ.
            </div>
            <button className={btn + ' w-full py-4 text-lg'} onClick={() => void submitFinal()} disabled={busy || answered === 0}>
              {busy ? 'جارٍ الحفظ...' : answered === 0 ? 'أجب على سؤال واحد على الأقل' : `حفظ الإجابات (${answered} / ${questions.length})`}
            </button>
          </>
        )}

        {isReview && running && (() => {
          const at = attempts[running.id]
          const retake = retakes[running.id]
          const hasPendingRetake = retake?.status === 'pending'
          if (!at || at.status !== 'graded') return null
          return (
            <div className="rounded-2xl border-2 border-accent bg-gradient-to-l from-accent-soft/40 to-white p-5 shadow-sm">
              <h3 className="text-lg font-bold text-primary">هل تريد إعادة الاختبار؟</h3>
              <p className="mt-1 text-sm text-ink-muted">
                يمكنك طلب إعادة محاولة جديدة. سيُرسل الطلب للأستاذ مع العذر الذي تكتبه.
              </p>
              {hasPendingRetake && (
                <div className="mt-3 rounded-lg bg-accent-soft/40 px-3 py-2 text-sm font-semibold text-primary ring-1 ring-accent/50">
                  📩 طلب الإعادة قيد المراجعة عند الأستاذ
                </div>
              )}
              {retake?.status === 'rejected' && !hasPendingRetake && (
                <div className="mt-3 rounded-lg bg-error-soft px-3 py-2 text-sm font-semibold text-error ring-1 ring-error/20">
                  ❌ رُفض آخر طلب إعادة — يمكنك طلب إعادة جديدة.
                </div>
              )}
              {!hasPendingRetake && (
                <button className={btn + ' mt-3'} onClick={() => openRetakeModal(running, at.id)}>
                  طلب إعادة
                </button>
              )}
            </div>
          )
        })()}
      </div>
    )
  }

  /* ============ القائمة الافتراضية ============ */
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 pb-7 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">اختبر نفسك</h2>
            <p className="mt-1 text-base text-white/85">اختبر فهمك لدروس الأسابيع المنشورة.</p>
          </div>
          <button
            className="rounded-xl bg-white px-6 py-3 text-base font-bold text-primary shadow-md transition hover:bg-primary-soft disabled:opacity-60"
            onClick={() => void refresh()}
            disabled={refreshing}
          >
            {refreshing ? '⏳ جارٍ التحديث...' : '🔄 تحديث الصفحة'}
          </button>
        </div>
        <div className="absolute inset-x-0 bottom-0 flex h-1" aria-hidden="true">
          <span className="flex-[3] bg-accent" />
          <span className="flex-1 bg-secondary" />
          <span className="flex-1 bg-warning" />
        </div>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-base font-semibold text-error">{error}</p>}

      <section className={card}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-lg font-bold text-primary">قائمة الاختبارات</h3>
          <button
            className="rounded-xl border border-primary bg-white px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60"
            onClick={() => void refresh()}
            disabled={refreshing}
          >
            {refreshing ? '⏳ جارٍ...' : '🔄 تحديث'}
          </button>
        </div>

        {activities.length === 0 ? (
          <p className="text-lg text-ink-muted">لا توجد اختبارات متاحة الآن.</p>
        ) : (
          <ul className="space-y-3">
            {activities.map((a) => {
              const w = weeks.find((x) => x.id === a.week_id)
              const at = attempts[a.id]
              const retake = retakes[a.id]
              const isDraft = at?.status === 'draft'
              const isSubmitted = at?.status === 'submitted'
              const isGraded = at?.status === 'graded'
              const hasPendingRetake = retake?.status === 'pending'

              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-light-blue border-s-4 border-s-primary bg-white p-5 shadow-sm">
                  <div className="min-w-0 flex-1">
                    <div className="text-xl font-bold text-primary">
                      {w ? `بنك أسئلة الأسبوع ${w.number}` : ''}
                    </div>
                    <div className="mt-1 text-base text-ink">{a.title}</div>

                    {isDraft && (
                      <div className="mt-2 text-sm text-ink-muted"><b className="text-warning">قيد الإجابة</b> — لم تُسلّم بعد</div>
                    )}

                    {isSubmitted && (
                      <div className="mt-2 text-sm text-ink-muted">
                        <b className="text-warning">بانتظار التصحيح</b> — يمكنك التعديل حتى يصحح الأستاذ.
                      </div>
                    )}

                    {isGraded && at && (
                      <div className="mt-2 text-sm text-ink-muted">
                        ✓ مصحح — الدرجة النهائية: <b className="text-secondary">{at.auto_score + (at.manual_score ?? 0)}</b>
                      </div>
                    )}

                    {hasPendingRetake && (
                      <div className="mt-2 rounded-lg bg-accent-soft/40 px-3 py-1 text-xs font-semibold text-primary ring-1 ring-accent/50">
                        📩 طلب الإعادة قيد المراجعة عند الأستاذ
                      </div>
                    )}
                    {retake?.status === 'rejected' && !hasPendingRetake && (
                      <div className="mt-2 rounded-lg bg-error-soft px-3 py-1 text-xs font-semibold text-error ring-1 ring-error/20">
                        ❌ رُفض آخر طلب إعادة
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {!at && (
                      <button className={btn} onClick={() => void start(a)}>ابدأ الاختبار</button>
                    )}

                    {isDraft && (
                      <>
                        <button className={btn} onClick={() => void start(a)}>متابعة</button>
                        <button className={btnDanger} onClick={() => void retakeMyself(a)} disabled={busy}>إعادة</button>
                      </>
                    )}

                    {isSubmitted && (
                      <>
                        <button className={btn} onClick={() => void start(a)}>تعديل الإجابات</button>
                        <button className={btnDanger} onClick={() => void retakeMyself(a)} disabled={busy}>إعادة</button>
                      </>
                    )}

                    {isGraded && (
                      <>
                        <button className={btnOutline} onClick={() => void start(a)}>عرض إجاباتي</button>
                        {!hasPendingRetake && (
                          <button className={btn} onClick={() => openRetakeModal(a, at!.id)}>
                            {retake?.status === 'rejected' ? 'طلب إعادة جديد' : 'طلب إعادة'}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {retakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !retakeSubmitting && setRetakeModal(null)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-bold text-primary">طلب إعادة الاختبار</h3>
            <p className="mt-1 text-sm text-ink-muted">{retakeModal.activityTitle}</p>
            <p className="mt-3 rounded-xl bg-accent-soft/40 p-3 text-sm text-ink ring-1 ring-accent/30">
              اكتب سببًا مختصرًا. سيظهر طلبك للأستاذ فقط.
            </p>
            <textarea rows={4} className={input} placeholder="مثال: لم أفهم بعض الأسئلة، وأريد فرصة أخرى." value={retakeReason} onChange={(e) => setRetakeReason(e.target.value)} />
            {retakeError && <p className="mt-3 text-sm font-semibold text-error">{retakeError}</p>}
            <div className="mt-5 flex flex-wrap gap-2">
              <button className={btn} onClick={() => void submitRetakeRequest()} disabled={retakeSubmitting}>
                {retakeSubmitting ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
              </button>
              <button className={btnOutline} onClick={() => setRetakeModal(null)} disabled={retakeSubmitting}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}