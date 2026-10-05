# =====================================================================
# Run-QuestionBank.ps1
# =====================================================================
$ErrorActionPreference = 'Stop'
$root = 'D:\FiqhMuamalat'
$backup = Join-Path $root '_backup_qbank'
if (-not (Test-Path $backup)) { New-Item -ItemType Directory -Path $backup | Out-Null }

foreach ($f in @('src\features\admin\QuizSetsTab.tsx','src\features\student\SelfTestTab.tsx')) {
  $full = Join-Path $root $f
  if (Test-Path $full) {
    Copy-Item $full (Join-Path $backup ((Split-Path $f -Leaf) + '.bak')) -Force
    Write-Host "  backed up: $f"
  }
}

$enc = New-Object System.Text.UTF8Encoding($false)

# -------- 1) QuizSetsTab.tsx (admin) --------
$quizTab = @'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-4'
const btn = 'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-3 py-1.5 text-sm font-semibold text-primary hover:bg-surface disabled:opacity-60'
const btnDanger = 'rounded-xl border border-error bg-white px-3 py-1.5 text-sm font-semibold text-error disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue p-2 text-ink'
const label = 'text-sm font-semibold'

type QType = 'mcq' | 'tf' | 'essay_smart' | 'essay_reasoning'

interface Activity { id: string; week_id: string; title: string; open: boolean; release: string }
interface Week { id: string; number: number; title: string }
interface Question { id: string; type: QType; text: string; score: number }
interface Option { id: string; question_id: string; label: string; text: string; position: number }
interface Key { question_id: string; correct_option_id: string | null; correct_tf: boolean | null; model_answer: string | null; grading_criteria: string | null; internal_note: string | null }
interface AQ { activity_id: string; question_id: string; position: number }

const TYPE_LABEL: Record<QType, string> = {
  mcq: 'اختيار من متعدد',
  tf: 'صح/خطأ',
  essay_smart: 'مقالي ذكي',
  essay_reasoning: 'مقالي استدلال',
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

  const loadActivities = useCallback(async () => {
    if (!supabase) return
    const [a, w] = await Promise.all([
      supabase.from('activities').select('id,week_id,title,open,release').order('created_at'),
      supabase.from('weeks').select('id,number,title').order('number'),
    ])
    if (a.error || w.error) {
      setError('تعذّر التحميل.')
      setLoading(false)
      return
    }
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
    if (aqRes.error || qRes.error || oRes.error || kRes.error) {
      setError('تعذّر تحميل الأسئلة.')
      return
    }
    const aqList = (aqRes.data ?? []) as AQ[]
    const ids = new Set(aqList.map((x) => x.question_id))
    setAq(aqList)
    setQuestions(((qRes.data ?? []) as Question[]).filter((q) => ids.has(q.id)))
    const om: Record<string, Option[]> = {}
    for (const o of (oRes.data ?? []) as Option[]) {
      if (ids.has(o.question_id)) (om[o.question_id] ??= []).push(o)
    }
    setOptions(om)
    const km: Record<string, Key> = {}
    for (const k of (kRes.data ?? []) as Key[]) {
      if (ids.has(k.question_id)) km[k.question_id] = k
    }
    setKeys(km)
  }, [selectedId])

  useEffect(() => { void loadActivities() }, [loadActivities])
  useEffect(() => { void loadQuestions() }, [loadQuestions])

  function startAdd() {
    setDraft(emptyDraft())
    setEditingId(null)
    setMode('add')
  }

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
    setEditingId(q.id)
    setMode('add')
  }

  function cancel() {
    setMode('list')
    setEditingId(null)
    setDraft(emptyDraft())
  }

  async function saveDraft() {
    if (!supabase) return
    if (!draft.text.trim()) { setError('نص السؤال مطلوب.'); return }
    if (draft.score < 1) { setError('الدرجة يجب أن تكون 1 على الأقل.'); return }
    if (draft.type === 'mcq') {
      for (const o of draft.options) {
        if (!o.text.trim()) { setError('كل خيارات MCQ يجب أن تحتوي نصًّا.'); return }
      }
      if (!draft.options.some((o) => o.isCorrect)) { setError('اختر إجابة صحيحة واحدة.'); return }
    }
    setBusy(true); setError(null)
    try {
      let qid: string | null = editingId
      if (editingId) {
        const { error: upErr } = await supabase.from('questions').update({
          type: draft.type, text: draft.text.trim(), score: draft.score,
        }).eq('id', editingId)
        if (upErr) { setError(upErr.message); return }
        await supabase.from('question_keys').delete().eq('question_id', editingId)
        await supabase.from('question_options').delete().eq('question_id', editingId)
      } else {
        const { data, error: insErr } = await supabase.from('questions').insert({
          type: draft.type, text: draft.text.trim(), score: draft.score,
        }).select('id').single()
        if (insErr || !data) { setError(insErr?.message ?? 'فشل الإدراج'); return }
        qid = (data as { id: string }).id
        const nextPos = aq.length === 0 ? 1 : Math.max(...aq.map((x) => x.position)) + 1
        const { error: aqErr } = await supabase.from('activity_questions').insert({
          activity_id: selectedId, question_id: qid, position: nextPos,
        })
        if (aqErr) { setError(aqErr.message); return }
      }
      if (!qid) return

      if (draft.type === 'mcq') {
        const optRows = draft.options.map((o, i) => ({
          question_id: qid, label: o.label, text: o.text.trim(), position: i + 1,
        }))
        const { data: optData, error: oErr } = await supabase.from('question_options').insert(optRows).select('id,position')
        if (oErr || !optData) { setError(oErr?.message ?? 'فشل حفظ الخيارات'); return }
        const correctIdx = draft.options.findIndex((o) => o.isCorrect)
        const correctId = (optData as { id: string; position: number }[]).find((o) => o.position === correctIdx + 1)?.id ?? null
        await supabase.from('question_keys').insert({
          question_id: qid, correct_option_id: correctId,
          internal_note: draft.internalNote.trim() || null,
        })
      } else if (draft.type === 'tf') {
        await supabase.from('question_keys').insert({
          question_id: qid, correct_tf: draft.correctTf,
          internal_note: draft.internalNote.trim() || null,
        })
      } else {
        await supabase.from('question_keys').insert({
          question_id: qid,
          model_answer: draft.modelAnswer.trim() || null,
          grading_criteria: draft.gradingCriteria.trim() || null,
          internal_note: draft.internalNote.trim() || null,
        })
      }
      cancel()
      await loadQuestions()
    } finally { setBusy(false) }
  }

  async function deleteQuestion(qid: string) {
    if (!supabase) return
    if (!window.confirm('حذف السؤال؟')) return
    setBusy(true); setError(null)
    await supabase.from('activity_questions').delete().eq('activity_id', selectedId).eq('question_id', qid)
    await supabase.from('questions').delete().eq('id', qid)
    setBusy(false)
    await loadQuestions()
  }

  async function move(qid: string, dir: -1 | 1) {
    if (!supabase) return
    const sorted = [...aq].sort((a, b) => a.position - b.position)
    const idx = sorted.findIndex((x) => x.question_id === qid)
    const other = sorted[idx + dir]
    if (!other) return
    const cur = sorted[idx]
    const TEMP = 999999
    setBusy(true)
    await supabase.from('activity_questions').update({ position: TEMP }).eq('activity_id', selectedId).eq('question_id', cur.question_id)
    await supabase.from('activity_questions').update({ position: cur.position }).eq('activity_id', selectedId).eq('question_id', other.question_id)
    await supabase.from('activity_questions').update({ position: other.position }).eq('activity_id', selectedId).eq('question_id', cur.question_id)
    setBusy(false)
    await loadQuestions()
  }

  async function toggleActivity() {
    if (!supabase || !selectedId) return
    const act = activities.find((a) => a.id === selectedId)
    if (!act) return
    setBusy(true)
    await supabase.from('activities').update({ open: !act.open }).eq('id', act.id)
    setBusy(false)
    await loadActivities()
  }

  if (loading) return <section className={card}><p className="text-ink/70">جارٍ التحميل...</p></section>

  const selAct = activities.find((a) => a.id === selectedId)
  const selWeek = selAct ? weeks.find((w) => w.id === selAct.week_id) : null
  const sortedAq = [...aq].sort((a, b) => a.position - b.position)
  const totalScore = questions.reduce((s, q) => s + q.score, 0)

  return (
    <div className="space-y-4">
      <section className={card}>
        <h2 className="text-xl font-bold text-primary">بنك الأسئلة</h2>
        {activities.length === 0 ? (
          <p className="mt-2 text-ink/70">لا توجد أنشطة بعد.</p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select className="rounded-xl border border-light-blue bg-white p-2 text-sm" value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {activities.map((a) => {
                const w = weeks.find((x) => x.id === a.week_id)
                return <option key={a.id} value={a.id}>الأسبوع {w?.number ?? '?'}: {a.title}</option>
              })}
            </select>
            {selAct && (
              <button className={btnOutline} onClick={() => void toggleActivity()} disabled={busy}>
                {selAct.open ? 'إغلاق النشاط للطلاب' : 'فتح النشاط للطلاب'}
              </button>
            )}
            {selAct && (
              <span className="text-xs text-ink/60">
                {selWeek ? `الأسبوع ${selWeek.number} — ` : ''}{questions.length} سؤال — {totalScore} درجة
              </span>
            )}
          </div>
        )}
        {error && <p className="mt-3 text-sm font-semibold text-error">{error}</p>}
      </section>

      {mode === 'add' && (
        <DraftEditor
          draft={draft}
          setDraft={setDraft}
          busy={busy}
          editing={!!editingId}
          onSave={() => void saveDraft()}
          onCancel={cancel}
        />
      )}

      {mode === 'list' && selAct && (
        <section className={card}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-primary">الأسئلة</h3>
            <button className={btn} onClick={startAdd}>+ سؤال جديد</button>
          </div>
          {sortedAq.length === 0 ? (
            <p className="mt-3 text-ink/70">لا أسئلة بعد.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {sortedAq.map((link, i) => {
                const q = questions.find((x) => x.id === link.question_id)
                if (!q) return null
                const qOpts = options[q.id] ?? []
                const k = keys[q.id]
                return (
                  <li key={q.id} className="rounded-xl border border-light-blue p-3">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-xs text-ink/60">
                          {i + 1}. {TYPE_LABEL[q.type]} — {q.score} درجة
                          {k?.internal_note && <span className="ms-2 rounded bg-warning/20 px-2 py-0.5 text-warning">يحتاج مراجعة</span>}
                        </div>
                        <div className="mt-1 whitespace-pre-wrap font-semibold text-ink">{q.text}</div>
                        {q.type === 'mcq' && (
                          <ul className="mt-2 space-y-1 text-sm">
                            {qOpts.map((o) => (
                              <li key={o.id} className={o.id === k?.correct_option_id ? 'text-secondary font-semibold' : 'text-ink/70'}>
                                {o.label}) {o.text}{o.id === k?.correct_option_id && ' ✓'}
                              </li>
                            ))}
                          </ul>
                        )}
                        {q.type === 'tf' && (
                          <div className="mt-2 text-sm">الإجابة: <b>{k?.correct_tf ? 'صح' : 'خطأ'}</b></div>
                        )}
                        {q.type.startsWith('essay') && k?.model_answer && (
                          <div className="mt-2 whitespace-pre-wrap text-sm text-ink/70">الإجابة النموذجية: {k.model_answer}</div>
                        )}
                        {k?.internal_note && (
                          <div className="mt-2 text-xs text-warning">ملاحظة: {k.internal_note}</div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className={btnOutline} onClick={() => void move(q.id, -1)} disabled={busy || i === 0}>▲</button>
                        <button className={btnOutline} onClick={() => void move(q.id, 1)} disabled={busy || i === sortedAq.length - 1}>▼</button>
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
      <h3 className="text-lg font-bold text-primary">{editing ? 'تحرير السؤال' : 'سؤال جديد'}</h3>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
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
      <div className="mt-3">
        <label className={label}>نص السؤال</label>
        <textarea rows={4} className={input} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
      </div>

      {draft.type === 'mcq' && (
        <div className="mt-3 space-y-2">
          <div className={label}>الخيارات (اختر الصحيح)</div>
          {draft.options.map((o, i) => (
            <div key={i} className="flex items-center gap-2">
              <input type="radio" name="correct" checked={o.isCorrect} onChange={() => setCorrect(i)} />
              <span className="w-6 text-center font-semibold">{o.label}</span>
              <input className={input + ' mt-0 flex-1'} value={o.text} onChange={(e) => setOptionText(i, e.target.value)} />
            </div>
          ))}
        </div>
      )}

      {draft.type === 'tf' && (
        <div className="mt-3">
          <label className={label}>الإجابة الصحيحة</label>
          <div className="mt-1 flex gap-4">
            <label className="flex items-center gap-2"><input type="radio" name="tf" checked={draft.correctTf} onChange={() => setDraft({ ...draft, correctTf: true })} /> صح</label>
            <label className="flex items-center gap-2"><input type="radio" name="tf" checked={!draft.correctTf} onChange={() => setDraft({ ...draft, correctTf: false })} /> خطأ</label>
          </div>
        </div>
      )}

      {draft.type.startsWith('essay') && (
        <>
          <div className="mt-3">
            <label className={label}>الإجابة النموذجية (اختياري — للأستاذ فقط)</label>
            <textarea rows={4} className={input} value={draft.modelAnswer} onChange={(e) => setDraft({ ...draft, modelAnswer: e.target.value })} />
          </div>
          <div className="mt-3">
            <label className={label}>معايير التصحيح (اختياري)</label>
            <textarea rows={3} className={input} value={draft.gradingCriteria} onChange={(e) => setDraft({ ...draft, gradingCriteria: e.target.value })} />
          </div>
        </>
      )}

      <div className="mt-3">
        <label className={label}>ملاحظة داخلية (اختياري)</label>
        <input className={input} value={draft.internalNote} onChange={(e) => setDraft({ ...draft, internalNote: e.target.value })} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <button className={btn} onClick={onSave} disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ'}</button>
        <button className={btnOutline} onClick={onCancel} disabled={busy}>إلغاء</button>
      </div>
    </section>
  )
}
'@
[System.IO.File]::WriteAllText((Join-Path $root 'src\features\admin\QuizSetsTab.tsx'), $quizTab, $enc)
Write-Host "WROTE QuizSetsTab.tsx" -ForegroundColor Green

# -------- 2) SelfTestTab.tsx (student) --------
$selfTab = @'
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-4'
const btn = 'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-3 py-1.5 text-sm font-semibold text-primary hover:bg-surface disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue p-2 text-ink'

type QType = 'mcq' | 'tf' | 'essay_smart' | 'essay_reasoning'

interface Activity { id: string; week_id: string; title: string; release: string }
interface Week { id: string; number: number; title: string }
interface Question { id: string; type: QType; text: string; score: number }
interface Option { id: string; question_id: string; label: string; text: string; position: number }
interface AQ { activity_id: string; question_id: string; position: number }
interface Attempt { id: string; activity_id: string; auto_score: number; manual_score: number | null; status: string }

interface AnswerState { optionId?: string; text?: string; tf?: string }

export default function SelfTestTab() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [weeks, setWeeks] = useState<Week[]>([])
  const [attempts, setAttempts] = useState<Record<string, Attempt>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState<Activity | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [options, setOptions] = useState<Record<string, Option[]>>({})
  const [aq, setAq] = useState<AQ[]>([])
  const [answers, setAnswers] = useState<Record<string, AnswerState>>({})
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<{ auto: number; total: number } | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const [a, w, at] = await Promise.all([
      supabase.from('activities').select('id,week_id,title,release'),
      supabase.from('weeks').select('id,number,title').order('number'),
      supabase.from('attempts').select('id,activity_id,auto_score,manual_score,status'),
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

  async function start(act: Activity) {
    if (!supabase) return
    setError(null)
    const [qRes, aqRes, oRes] = await Promise.all([
      supabase.from('questions').select('id,type,text,score'),
      supabase.from('activity_questions').select('activity_id,question_id,position').eq('activity_id', act.id).order('position'),
      supabase.from('question_options').select('id,question_id,label,text,position').order('position'),
    ])
    if (qRes.error || aqRes.error || oRes.error) { setError('تعذّر تحميل الأسئلة.'); return }
    const aqList = (aqRes.data ?? []) as AQ[]
    const ids = new Set(aqList.map((x) => x.question_id))
    setQuestions(((qRes.data ?? []) as Question[]).filter((q) => ids.has(q.id)))
    const om: Record<string, Option[]> = {}
    for (const o of (oRes.data ?? []) as Option[]) {
      if (ids.has(o.question_id)) (om[o.question_id] ??= []).push(o)
    }
    setOptions(om)
    setAq(aqList)
    setAnswers({})
    setResult(null)
    setRunning(act)
  }

  async function submit() {
    if (!supabase || !running) return
    const list: { question_id: string; option_id?: string; text_answer?: string }[] = []
    for (const q of questions) {
      const a = answers[q.id]
      if (!a) continue
      if (q.type === 'mcq' && a.optionId) list.push({ question_id: q.id, option_id: a.optionId })
      else if (q.type === 'tf' && a.tf) list.push({ question_id: q.id, text_answer: a.tf })
      else if (q.type.startsWith('essay')) list.push({ question_id: q.id, text_answer: a.text ?? '' })
    }
    setBusy(true); setError(null)
    const { data, error: rpcErr } = await supabase.rpc('submit_attempt', {
      p_activity_id: running.id,
      p_answers: list,
    })
    setBusy(false)
    if (rpcErr) { setError(rpcErr.message); return }
    const r = data as { auto_score: number; total_possible: number } | null
    setResult({ auto: r?.auto_score ?? 0, total: r?.total_possible ?? 0 })
    await load()
  }

  if (loading) return <section className={card}><p className="text-ink/70">جارٍ التحميل...</p></section>

  if (running && result) {
    const total = questions.reduce((s, q) => s + q.score, 0)
    const essayCount = questions.filter((q) => q.type.startsWith('essay')).length
    return (
      <section className={card}>
        <h2 className="text-xl font-bold text-primary">نتيجة الاختبار</h2>
        <p className="mt-3">الدرجة الآلية: <b>{result.auto}</b> من <b>{total}</b></p>
        {essayCount > 0 && (
          <p className="mt-2 text-sm text-ink/70">
            لديك {essayCount} سؤالًا مقاليًّا بانتظار تصحيح الأستاذ. الدرجة النهائية ستُضاف لاحقًا.
          </p>
        )}
        <button className={btn + ' mt-4'} onClick={() => { setRunning(null); setResult(null) }}>عودة</button>
      </section>
    )
  }

  if (running) {
    const sorted = [...aq].sort((a, b) => a.position - b.position)
    return (
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-primary">{running.title}</h2>
          <button className={btnOutline} onClick={() => setRunning(null)} disabled={busy}>إلغاء</button>
        </div>
        <div className="mt-4 space-y-5">
          {sorted.map((link, i) => {
            const q = questions.find((x) => x.id === link.question_id)
            if (!q) return null
            const qOpts = options[q.id] ?? []
            const a = answers[q.id] ?? {}
            return (
              <div key={q.id} className="rounded-xl border border-light-blue p-3">
                <div className="whitespace-pre-wrap font-semibold">{i + 1}. {q.text}</div>
                <div className="mt-1 text-xs text-ink/60">{q.score} درجة</div>
                {q.type === 'mcq' && (
                  <div className="mt-2 space-y-1">
                    {qOpts.map((o) => (
                      <label key={o.id} className="flex items-center gap-2 text-sm">
                        <input type="radio" name={'q-' + q.id} checked={a.optionId === o.id} onChange={() => setAnswers({ ...answers, [q.id]: { optionId: o.id } })} />
                        {o.label}) {o.text}
                      </label>
                    ))}
                  </div>
                )}
                {q.type === 'tf' && (
                  <div className="mt-2 space-y-1">
                    <label className="flex items-center gap-2 text-sm"><input type="radio" name={'q-' + q.id} checked={a.tf === 'true'} onChange={() => setAnswers({ ...answers, [q.id]: { tf: 'true' } })} /> صح</label>
                    <label className="flex items-center gap-2 text-sm"><input type="radio" name={'q-' + q.id} checked={a.tf === 'false'} onChange={() => setAnswers({ ...answers, [q.id]: { tf: 'false' } })} /> خطأ</label>
                  </div>
                )}
                {q.type.startsWith('essay') && (
                  <textarea rows={5} className={input} value={a.text ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: { text: e.target.value } })} />
                )}
              </div>
            )
          })}
        </div>
        {error && <p className="mt-3 text-sm font-semibold text-error">{error}</p>}
        <button className={btn + ' mt-4'} onClick={() => void submit()} disabled={busy}>
          {busy ? 'جارٍ الإرسال...' : 'تسليم الإجابات'}
        </button>
      </section>
    )
  }

  return (
    <div className="space-y-4">
      <section className={card}>
        <h2 className="text-xl font-bold text-primary">اختبر نفسك</h2>
        {error && <p className="mt-3 text-sm font-semibold text-error">{error}</p>}
        {activities.length === 0 ? (
          <p className="mt-2 text-ink/70">لا توجد اختبارات متاحة الآن.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {activities.map((a) => {
              const w = weeks.find((x) => x.id === a.week_id)
              const at = attempts[a.id]
              return (
                <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-light-blue p-3">
                  <div>
                    <div className="font-semibold">{w ? `الأسبوع ${w.number}: ` : ''}{a.title}</div>
                    {at && (
                      <div className="mt-1 text-xs text-ink/60">
                        الدرجة الآلية: {at.auto_score}
                        {at.manual_score !== null && ` — الدرجة النهائية: ${at.auto_score + at.manual_score}`}
                      </div>
                    )}
                  </div>
                  {at ? (
                    <span className="text-sm text-ink/60">أُنجز</span>
                  ) : (
                    <button className={btn} onClick={() => void start(a)}>ابدأ الاختبار</button>
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
'@
[System.IO.File]::WriteAllText((Join-Path $root 'src\features\student\SelfTestTab.tsx'), $selfTab, $enc)
Write-Host "WROTE SelfTestTab.tsx" -ForegroundColor Green

# -------- 3) npm run build --------
Write-Host ""
Write-Host "==> Running npm run build..." -ForegroundColor Cyan
Push-Location $root
try {
  npm run build
  Write-Host ""
  Write-Host "==> BUILD FINISHED" -ForegroundColor Green
} finally {
  Pop-Location
}