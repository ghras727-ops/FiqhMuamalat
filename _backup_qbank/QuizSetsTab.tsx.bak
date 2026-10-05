import { useState } from 'react'
import DemoBadge from '../../components/DemoBadge'
import Tag from '../../components/Tag'
import { btn, btnOutline, card, field } from '../../components/ui'
import {
  addQuestion, defaultPoints, getQuiz, isObjective, kindLabel, kindOrder,
  removeQuestion, setQuizOpen, summarize, useQuizSets, type QKind,
} from '../../demo/quizsets'
import { getPack, useWeekPacks } from '../../demo/weekpack'

const WEEKS = Array.from({ length: 16 }, (_, i) => i + 1)

export default function QuizSetsTab() {
  const quizzes = useQuizSets()
  const packs = useWeekPacks()
  const [week, setWeek] = useState(1)
  const [kind, setKind] = useState<QKind>('mcq')
  const [text, setText] = useState('')
  const [optionsText, setOptionsText] = useState('')
  const [answer, setAnswer] = useState('')
  const [points, setPoints] = useState(String(defaultPoints.mcq))
  const [error, setError] = useState<string | null>(null)

  const quiz = getQuiz(quizzes, week)
  const sum = summarize(quiz.questions)
  const options = optionsText.split('\n').map((s) => s.trim()).filter(Boolean)

  function weekLabel(n: number) {
    const t = getPack(packs, n).title
    const count = getQuiz(quizzes, n).questions.length
    const name = t === 'الأسبوع ' + n ? t : 'الأسبوع ' + n + ' — ' + t
    return name + (count > 0 ? ' (' + count + ' سؤال)' : '')
  }

  function changeKind(k: QKind) {
    setKind(k)
    setPoints(String(defaultPoints[k]))
    setAnswer('')
    setError(null)
  }

  function add() {
    if (!text.trim()) {
      setError('اكتب نص السؤال.')
      return
    }
    const pts = parseFloat(points)
    if (!pts || pts <= 0) {
      setError('اكتب درجة صحيحة للسؤال.')
      return
    }
    const ans = answer.trim()
    if (kind === 'mcq') {
      if (options.length < 2) {
        setError('اكتب خيارين على الأقل، خيار في كل سطر.')
        return
      }
      if (!options.includes(ans)) {
        setError('اختر الإجابة الصحيحة من الخيارات.')
        return
      }
    }
    if (kind === 'tf' && ans !== 'صح' && ans !== 'خطأ') {
      setError('اختر الإجابة الصحيحة: صح أو خطأ.')
      return
    }
    addQuestion(week, { kind, text: text.trim(), options: kind === 'mcq' ? options : [], answer: ans, points: pts })
    setError(null)
    setText('')
    setOptionsText('')
    setAnswer('')
  }

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-primary">بنك الأسئلة</h2>
          <DemoBadge />
        </div>
        <p className="mt-2 text-sm text-ink/70">اختر الدرس (الأسبوع) ثم أضف أسئلته. ما تتيحه يظهر للطالب في «اختبر نفسك».</p>
        <div className="mt-3 max-w-xl">
          <label className="text-sm font-semibold" htmlFor="qw">الأسبوع</label>
          <select id="qw" className={field} value={week} onChange={(e) => setWeek(parseInt(e.target.value, 10))}>
            {WEEKS.map((n) => <option key={n} value={n}>{weekLabel(n)}</option>)}
          </select>
        </div>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {kindOrder.map((k) => (
              <Tag key={k} tone="info">{kindLabel[k]}: {sum.counts[k]}</Tag>
            ))}
            <Tag tone="ok">المجموع: {sum.total} درجة</Tag>
          </div>
          <div className="flex items-center gap-2">
            <Tag tone={quiz.open ? 'ok' : 'wait'}>{quiz.open ? 'متاح للطلاب' : 'غير متاح'}</Tag>
            <button className={btn} onClick={() => setQuizOpen(week, !quiz.open)}>
              {quiz.open ? 'إيقاف الإتاحة' : 'إتاحة الاختبار للطلاب'}
            </button>
          </div>
        </div>
      </section>

      <section className={card}>
        <h3 className="text-lg font-bold text-primary">إضافة سؤال</h3>
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold" htmlFor="qk">نوع السؤال</label>
              <select id="qk" className={field} value={kind} onChange={(e) => changeKind(e.target.value as QKind)}>
                {kindOrder.map((k) => <option key={k} value={k}>{kindLabel[k]}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="qp">الدرجة</label>
              <input id="qp" type="number" min={0.5} step={0.5} className={field} value={points} onChange={(e) => setPoints(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold" htmlFor="qt">نص السؤال</label>
            <textarea id="qt" rows={3} className={field} value={text} onChange={(e) => setText(e.target.value)} />
          </div>
          {kind === 'mcq' && (
            <>
              <div>
                <label className="text-sm font-semibold" htmlFor="qo">الخيارات (خيار في كل سطر)</label>
                <textarea id="qo" rows={4} className={field} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-semibold" htmlFor="qa">الإجابة الصحيحة</label>
                <select id="qa" className={field} value={answer} onChange={(e) => setAnswer(e.target.value)}>
                  <option value="">اختر</option>
                  {options.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            </>
          )}
          {kind === 'tf' && (
            <div>
              <label className="text-sm font-semibold" htmlFor="qa">الإجابة الصحيحة</label>
              <select id="qa" className={field} value={answer} onChange={(e) => setAnswer(e.target.value)}>
                <option value="">اختر</option>
                <option>صح</option>
                <option>خطأ</option>
              </select>
            </div>
          )}
          {!isObjective(kind) && (
            <div>
              <label className="text-sm font-semibold" htmlFor="qa">معايير التصحيح أو الإجابة النموذجية (اختياري، للأستاذ فقط)</label>
              <textarea id="qa" rows={3} className={field} value={answer} onChange={(e) => setAnswer(e.target.value)} />
            </div>
          )}
          {error && <p className="text-sm font-semibold text-error">{error}</p>}
          <button className={btn} onClick={add}>إضافة السؤال</button>
        </div>
      </section>

      {quiz.questions.length > 0 && (
        <section className={card}>
          <h3 className="text-lg font-bold text-primary">أسئلة هذا الدرس</h3>
          {kindOrder.map((k) => {
            const list = quiz.questions.filter((q) => q.kind === k)
            if (list.length === 0) return null
            return (
              <div key={k} className="mt-4">
                <div className="text-sm font-bold text-primary">{kindLabel[k]} ({list.length})</div>
                <ul className="mt-2 space-y-2">
                  {list.map((q, i) => (
                    <li key={q.id} className="rounded-xl bg-surface p-3 text-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div>{i + 1}. {q.text}</div>
                          {q.kind === 'mcq' && (
                            <ul className="mt-1 list-disc ps-5 text-xs text-ink/80">
                              {q.options.map((o) => (
                                <li key={o} className={o === q.answer ? 'font-bold text-secondary' : ''}>{o}</li>
                              ))}
                            </ul>
                          )}
                          {q.kind === 'tf' && <div className="mt-1 text-xs text-secondary">الإجابة: {q.answer}</div>}
                          {!isObjective(q.kind) && q.answer && (
                            <div className="mt-1 text-xs text-ink/70">معايير التصحيح: {q.answer}</div>
                          )}
                          <div className="mt-1 text-xs text-ink/60">الدرجة: {q.points}</div>
                        </div>
                        <button className={btnOutline} onClick={() => removeQuestion(week, q.id)}>إزالة</button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </section>
      )}
    </div>
  )
}
