import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-hover active:bg-primary-active focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary-soft disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent/40'

type QType = 'mcq' | 'tf' | 'essay_smart' | 'essay_reasoning'

interface Activity { id: string; week_id: string; title: string; release: string }
interface Week { id: string; number: number; title: string }
interface Question { id: string; type: QType; text: string; score: number }
interface Option { id: string; question_id: string; label: string; text: string; position: number }
interface AQ { activity_id: string; question_id: string; position: number }
interface Attempt { id: string; activity_id: string; auto_score: number; manual_score: number | null; status: string; submitted_at: string | null }

interface AnswerRow {
  id: string
  question_id: string
  option_id: string | null
  text_answer: string | null
  is_correct: boolean | null
  awarded_score: number | null
}

interface AnswerState { optionId?: string; text?: string; tf?: string }

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

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function SelfTestTab({ onAttemptSaved }: { onAttemptSaved?: () => void } = {}) {
  const [activities, setActivities] = useState<Activity[]>([])
  const [weeks, setWeeks] = useState<Week[]>([])
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [running, setRunning] = useState<Activity | null>(null)
  const [mode, setMode] = useState<'edit' | 'review'>('edit')
  const [questions, setQuestions] = useState<Question[]>([])
  const [options, setOptions] = useState<Record<string, Option[]>>({})
  const [aq, setAq] = useState<AQ[]>([])
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({})
  const [reviewAnswers, setReviewAnswers] = useState<Record<string, AnswerRow>>({})
  const [busy, setBusy] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [result, setResult] = useState<{ auto: number; total: number; answered: number } | null>(null)
  const [open, setOpen] = useState<Record<QType, boolean>>({
    mcq: false, tf: false, essay_smart: false, essay_reasoning: false,
  })

  const lastSavedRef = useRef<string>('')
  const saveTimerRef = useRef<number | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const [a, w, at] = await Promise.all([
      supabase.from('activities').select('id,week_id,title,release'),
      supabase.from('weeks').select('id,number,title').order('number'),
      supabase.from('attempts').select('id,activity_id,auto_score,manual_score,status,submitted_at'),
    ])
    if (a.error || w.error || at.error) {
      setError('تعذّر التحميل.')
    } else {
      setActivities((a.data ?? []) as Activity[])
      setWeeks((w.data ?? []) as Week[])
      const m: Record<string, Attempt> = {}
      for (const t of (at.data ?? []) as Attempt[]) m[t.activity_id] = t
      setAttempts(m)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

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

  function buildPayload(): { question_id: string; option_id?: string; text_answer?: string }[] {
    const list: { question_id: string; option_id?: string; text_answer?: string }[] = []
    for (const q of questions) {
      const a = answers[q.id]
      if (!a) continue
      if (q.type === 'mcq' && a.optionId) list.push({ question_id: q.id, option_id: a.optionId })
      else if (q.type === 'tf' && a.tf) list.push({ question_id: q.id, text_answer: a.tf })
      else if (q.type.startsWith('essay') && (a.text ?? '').trim()) list.push({ question_id: q.id, text_answer: a.text })
    }
    return list
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
      p_activity_id: running.id,
      p_answers: list,
      p_submit: false,
    })
    if (rpcErr) {
      setSaveStatus('error')
    } else {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 1500)
    }
  }

  // auto-save debounced
  useEffect(() => {
    if (!running || mode !== 'edit') return
    const current = JSON.stringify(answers)
    if (current === lastSavedRef.current) return
    if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    saveTimerRef.current = window.setTimeout(() => {
      lastSavedRef.current = current
      void saveDraft(answers)
    }, 800)
    return () => {
      if (saveTimerRef.current) window.clearTimeout(saveTimerRef.current)
    }
  }, [answers, running, mode]) // eslint-disable-line react-hooks/exhaustive-deps

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
      if (existing.status === 'submitted') {
        setMode('review')
        // load submitted answers
        const an = await supabase
          .from('answers')
          .select('id,question_id,option_id,text_answer,is_correct,awarded_score')
          .eq('attempt_id', existing.id)
        const map: Record<string, AnswerRow> = {}
        for (const row of (an.data ?? []) as AnswerRow[]) map[row.question_id] = row
        setReviewAnswers(map)
        setAnswers({})
        lastSavedRef.current = ''
      } else {
        setMode('edit')
        // load draft answers into editable state
        const an = await supabase
          .from('answers')
          .select('id,question_id,option_id,text_answer,is_correct,awarded_score')
          .eq('attempt_id', existing.id)
        const st: Record<string, AnswerState> = {}
        for (const row of (an.data ?? []) as AnswerRow[]) {
          const q = data.questions.find((x) => x.id === row.question_id)
          if (!q) continue
          if (q.type === 'mcq' && row.option_id) st[row.question_id] = { optionId: row.option_id }
          else if (q.type === 'tf' && row.text_answer) st[row.question_id] = { tf: row.text_answer }
          else if (q.type.startsWith('essay') && row.text_answer) st[row.question_id] = { text: row.text_answer }
        }
        setAnswers(st)
        lastSavedRef.current = JSON.stringify(st)
        setReviewAnswers({})
      }
    } else {
      setMode('edit')
      setAnswers({})
      setReviewAnswers({})
      lastSavedRef.current = ''
    }
    setSaveStatus('idle')
    setRunning(act)
  }

  async function submitFinal() {
    if (!supabase || !running) return
    setBusy(true); setError(null)
    const list = buildPayload()
    const { data, error: rpcErr } = await supabase.rpc('submit_attempt', {
      p_activity_id: running.id,
      p_answers: list,
      p_submit: true,
    })
    setBusy(false)
    if (rpcErr) { setError(rpcErr.message); return }
    const r = data as { auto_score: number } | null
    const totalScore = questions.reduce((s, q) => s + q.score, 0)
    setResult({ auto: r?.auto_score ?? 0, total: totalScore, answered: list.length })
    await load()
    onAttemptSaved?.()
    // reload review answers
    const attemptId = (data as { attempt_id?: string } | null)?.attempt_id
    if (attemptId) {
      const an = await supabase
        .from('answers')
        .select('id,question_id,option_id,text_answer,is_correct,awarded_score')
        .eq('attempt_id', attemptId)
      const map: Record<string, AnswerRow> = {}
      for (const row of (an.data ?? []) as AnswerRow[]) map[row.question_id] = row
      setReviewAnswers(map)
      setMode('review')
    }
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

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>

  /* ============ شاشة النتيجة ============ */
  if (running && result) {
    const essayCount = questions.filter((q) => q.type.startsWith('essay')).length
    return (
      <section className={card}>
        <div className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
          <h2 className="text-3xl font-bold">تم التسليم</h2>
          <p className="mt-1 text-base text-white/85">تم استلام إجاباتك. لا يمكنك تعديلها بعد الآن.</p>
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
          <button className={btnOutline} onClick={() => setResult(null)}>
            مراجعة الإجابات
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
                {isReview && <span className="ms-3 rounded-lg bg-white/20 px-3 py-1 text-base">مراجعة</span>}
              </h2>
              <p className="mt-1 text-base text-white/85">{running.title}</p>
            </div>
            <button
              className="rounded-xl bg-white/15 px-5 py-2.5 text-base font-semibold text-white ring-1 ring-white/30 hover:bg-white/25"
              onClick={() => { setRunning(null); setResult(null); setMode('edit') }}
              disabled={busy}
            >
              عودة
            </button>
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
                {saveStatus === 'saved' && <span className="rounded-xl bg-secondary-soft px-4 py-2 text-sm font-semibold text-secondary ring-1 ring-secondary/20">تم حفظ إجاباتك</span>}
                {saveStatus === 'error' && <span className="rounded-xl bg-error-soft px-4 py-2 text-sm font-semibold text-error ring-1 ring-error/20">فشل الحفظ التلقائي</span>}
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
                              (rev.awarded_score === q.score ? 'bg-secondary-soft text-secondary ring-1 ring-secondary/20'
                                : rev.awarded_score > 0 ? 'bg-accent-soft/40 text-primary ring-1 ring-accent/50'
                                : 'bg-error-soft text-error ring-1 ring-error/30')
                            }>
                              حصلت: {rev.awarded_score}
                            </span>
                          )}
                          {isReview && !rev && (
                            <span className="rounded-lg bg-error-soft px-2 py-0.5 font-semibold text-error ring-1 ring-error/20">
                              لم تجب
                            </span>
                          )}
                        </div>
                        <div className="mt-3 whitespace-pre-wrap text-lg font-semibold leading-8 text-ink">{q.text}</div>

                        {q.type === 'mcq' && (
                          <div className="mt-3 space-y-2">
                            {qOpts.map((o) => {
                              const checked = isReview ? rev?.option_id === o.id : a.optionId === o.id
                              const wrongPick = isReview && checked && rev?.is_correct === false
                              return (
                                <label
                                  key={o.id}
                                  className={
                                    'flex items-center gap-3 rounded-lg border p-3 text-base transition ' +
                                    (checked
                                      ? wrongPick
                                        ? 'border-error bg-error-soft font-semibold text-error'
                                        : 'border-primary bg-primary-soft font-semibold text-primary'
                                      : 'border-light-blue bg-white text-ink ' + (isReview ? '' : 'cursor-pointer hover:bg-primary-soft/40'))
                                  }
                                >
                                  <input
                                    type="radio"
                                    name={'q-' + q.id}
                                    checked={checked}
                                    disabled={isReview}
                                    onChange={() => setAnswers({ ...answers, [q.id]: { optionId: o.id } })}
                                    className="h-5 w-5 accent-primary"
                                  />
                                  <span className="w-8 text-center font-bold text-primary">{o.label}</span>
                                  <span>{o.text}</span>
                                  {isReview && checked && <span className="ms-auto text-sm">{rev?.is_correct ? '✓' : '✗'}</span>}
                                </label>
                              )
                            })}
                          </div>
                        )}

                        {q.type === 'tf' && (
                          <div className="mt-3 grid grid-cols-2 gap-3">
                            {[{ v: 'true', l: 'صح ✓' }, { v: 'false', l: 'خطأ ✗' }].map((c) => {
                              const current = isReview ? rev?.text_answer : a.tf
                              const checked = current === c.v
                              const wrongPick = isReview && checked && rev?.is_correct === false
                              return (
                                <label
                                  key={c.v}
                                  className={
                                    'flex items-center justify-center gap-3 rounded-lg border p-3 text-base font-semibold transition ' +
                                    (checked
                                      ? wrongPick
                                        ? 'border-error bg-error-soft text-error'
                                        : 'border-secondary bg-secondary-soft text-secondary'
                                      : 'border-light-blue bg-white text-ink ' + (isReview ? '' : 'cursor-pointer hover:bg-secondary-soft/40'))
                                  }
                                >
                                  <input
                                    type="radio"
                                    name={'q-' + q.id}
                                    checked={checked}
                                    disabled={isReview}
                                    onChange={() => setAnswers({ ...answers, [q.id]: { tf: c.v } })}
                                    className="h-5 w-5 accent-secondary"
                                  />
                                  {c.l}
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
                            <textarea
                              rows={6}
                              className={input + ' mt-3 text-lg leading-8'}
                              placeholder="اكتب إجابتك هنا..."
                              value={a.text ?? ''}
                              onChange={(e) => setAnswers({ ...answers, [q.id]: { text: e.target.value } })}
                            />
                          )
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
              <b>ملاحظة:</b> يُحفظ تقدمك تلقائيًا. يمكنك الخروج والعودة لاحقًا لإكمال الإجابة. عند الضغط على «تسليم» لن تستطيع التعديل.
            </div>
            <button
              className={btn + ' w-full py-4 text-lg'}
              onClick={() => void submitFinal()}
              disabled={busy || answered === 0}
            >
              {busy ? 'جارٍ الإرسال...' : answered === 0 ? 'أجب على سؤال واحد على الأقل' : `تسليم الإجابات (${answered} / ${questions.length})`}
            </button>
          </>
        )}
      </div>
    )
  }

  /* ============ القائمة الافتراضية ============ */
  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 pb-7 text-white shadow-md">
        <h2 className="text-3xl font-bold">اختبر نفسك</h2>
        <p className="mt-1 text-base text-white/85">اختبر فهمك لدروس الأسابيع المنشورة.</p>
        <div className="absolute inset-x-0 bottom-0 flex h-1" aria-hidden="true">
          <span className="flex-[3] bg-accent" />
          <span className="flex-1 bg-secondary" />
          <span className="flex-1 bg-warning" />
        </div>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-base font-semibold text-error">{error}</p>}

      <section className={card}>
        {activities.length === 0 ? (
          <p className="text-lg text-ink-muted">لا توجد اختبارات متاحة الآن.</p>
        ) : (
          <ul className="space-y-3">
            {activities.map((a) => {
              const w = weeks.find((x) => x.id === a.week_id)
              const at = attempts[a.id]
              const submitted = at?.status === 'submitted'
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-light-blue border-s-4 border-s-primary bg-white p-5 shadow-sm">
                  <div>
                    <div className="text-xl font-bold text-primary">
                      {w ? `بنك أسئلة الأسبوع ${w.number}` : ''}
                    </div>
                    <div className="mt-1 text-base text-ink">{a.title}</div>
                    {submitted && at && (
                      <div className="mt-2 text-sm text-ink-muted">
                        الدرجة الآلية: <b className="text-secondary">{at.auto_score}</b>
                        {at.manual_score !== null && <> — النهائية: <b className="text-secondary">{at.auto_score + at.manual_score}</b></>}
                      </div>
                    )}
                    {!submitted && at && (
                      <div className="mt-2 text-sm text-ink-muted">
                        <b className="text-warning">قيد الإجابة</b> — لم تُسلّم بعد
                      </div>
                    )}
                  </div>
                  {submitted ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-xl bg-secondary-soft px-4 py-2 text-sm font-bold text-secondary ring-1 ring-secondary/20">مُسلَّم ✓</span>
                      <button className={btnOutline} onClick={() => void start(a)} disabled={busy}>مراجعة</button>
                    </div>
                  ) : (
                    <button className={btn} onClick={() => void start(a)}>
                      {at ? 'متابعة الاختبار' : 'ابدأ الاختبار'}
                    </button>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}