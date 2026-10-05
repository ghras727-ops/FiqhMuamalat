import { useState } from 'react'
import { useAuth } from '../../app/auth-context'
import DemoBadge from '../../components/DemoBadge'
import { btn, btnOutline, card, field } from '../../components/ui'
import {
  getQuiz, isObjective, kindLabel, kindOrder, saveAttempt, summarize,
  useAttempts, useQuizSets,
} from '../../demo/quizsets'
import { getPack, useWeekPacks } from '../../demo/weekpack'

export default function SelfTestTab() {
  const { profile } = useAuth()
  const quizzes = useQuizSets()
  const packs = useWeekPacks()
  const attempts = useAttempts()
  const [week, setWeek] = useState<number | null>(null)
  const [mode, setMode] = useState<'take' | 'result'>('take')
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const me = profile?.id ?? 'demo'

  const available = Object.values(quizzes)
    .filter((q) => q.open && q.questions.length > 0)
    .sort((a, b) => a.week - b.week)

  function title(n: number) {
    const t = getPack(packs, n).title
    return t === 'الأسبوع ' + n ? t : 'الأسبوع ' + n + ': ' + t
  }

  function open(n: number, m: 'take' | 'result') {
    setAnswers({})
    setMode(m)
    setWeek(n)
  }

  if (week === null) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-primary">اختبر نفسك</h2>
          <DemoBadge />
        </div>
        {available.length === 0 && (
          <section className={card}>
            <p className="text-ink/70">لا توجد اختبارات متاحة الآن.</p>
          </section>
        )}
        {available.map((q) => {
          const s = summarize(q.questions)
          const a = attempts[me + ':' + q.week]
          return (
            <section key={q.week} className={card}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-primary">{title(q.week)}</h3>
                  <p className="mt-1 text-sm text-ink/70">{q.questions.length} سؤالًا · مجموع الدرجات {s.total}</p>
                  {a && a.autoMax > 0 && (
                    <p className="mt-1 text-sm">
                      آخر نتيجة: {a.last}/{a.autoMax} · أفضل نتيجة: {a.best}/{a.autoMax} · المحاولات: {a.count}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {a && <button className={btnOutline} onClick={() => open(q.week, 'result')}>عرض النتيجة</button>}
                  <button className={btn} onClick={() => open(q.week, 'take')}>{a ? 'محاولة جديدة' : 'ابدأ'}</button>
                </div>
              </div>
            </section>
          )
        })}
      </div>
    )
  }

  const quiz = getQuiz(quizzes, week)
  const key = me + ':' + week
  const att = attempts[key]
  const ordered = kindOrder.flatMap((k) => quiz.questions.filter((q) => q.kind === k))

  function submit() {
    const marks: Record<string, boolean> = {}
    let score = 0
    let autoMax = 0
    let essayMax = 0
    let essayCount = 0
    quiz.questions.forEach((q) => {
      if (isObjective(q.kind)) {
        autoMax += q.points
        const ok = (answers[q.id] ?? '') === q.answer
        marks[q.id] = ok
        if (ok) score += q.points
      } else {
        essayMax += q.points
        essayCount += 1
      }
    })
    saveAttempt(key, { last: score, autoMax, essayMax, essayCount, marks })
    setMode('result')
  }

  if (mode === 'result' && att) {
    return (
      <div className="space-y-4">
        <section className={card}>
          <h2 className="text-xl font-bold text-primary">{title(week)}</h2>
          <div className="mt-3 text-3xl font-bold text-primary" dir="ltr">
            {att.autoMax > 0 ? att.last + '/' + att.autoMax : '—'}
          </div>
          <p className="mt-1 text-sm text-ink/70">
            درجة الأسئلة الموضوعية · أفضل نتيجة: {att.best}/{att.autoMax} · المحاولات: {att.count}
          </p>
          {att.essayCount > 0 && (
            <p className="mt-2 text-sm">لديك {att.essayCount} أسئلة مقالية ({att.essayMax} درجة) بانتظار تصحيح الأستاذ.</p>
          )}
          <ul className="mt-4 space-y-1 text-sm">
            {quiz.questions.filter((q) => isObjective(q.kind)).map((q) => {
              const m = att.marks[q.id]
              return (
                <li key={q.id} className="flex gap-2">
                  <span className={m === undefined ? 'text-ink/50' : m ? 'font-bold text-secondary' : 'font-bold text-error'}>
                    {m === undefined ? '—' : m ? '✓' : '✗'}
                  </span>
                  <span>{q.text}</span>
                </li>
              )
            })}
          </ul>
          <p className="mt-3 text-xs text-ink/60">تظهر علامة الصواب أو الخطأ فقط، والإجابات الصحيحة لا تُعرض.</p>
          <div className="mt-4 flex gap-2">
            <button className={btn} onClick={() => open(week, 'take')}>محاولة جديدة</button>
            <button className={btnOutline} onClick={() => setWeek(null)}>رجوع إلى القائمة</button>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold text-primary">{title(week)}</h2>
          <button className={btnOutline} onClick={() => setWeek(null)}>رجوع</button>
        </div>
        <div className="mt-4 space-y-5">
          {ordered.map((q, i) => {
            const choices = q.kind === 'mcq' ? q.options : q.kind === 'tf' ? ['صح', 'خطأ'] : []
            const header = i === 0 || ordered[i - 1].kind !== q.kind
            return (
              <div key={q.id}>
                {header && <h3 className="mb-2 mt-2 border-b border-light-blue pb-1 text-base font-bold text-secondary">{kindLabel[q.kind]}</h3>}
                <div className="font-semibold">{i + 1}. {q.text} <span className="text-xs font-normal text-ink/60">({q.points} درجة)</span></div>
                {choices.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {choices.map((c) => (
                      <label key={c} className="flex items-center gap-2 text-sm">
                        <input
                          type="radio"
                          name={'q-' + q.id}
                          checked={answers[q.id] === c}
                          onChange={() => setAnswers({ ...answers, [q.id]: c })}
                        />
                        {c}
                      </label>
                    ))}
                  </div>
                )}
                {!isObjective(q.kind) && (
                  <textarea rows={4} className={field} value={answers[q.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-5">
          <button className={btn} onClick={submit}>تسليم</button>
        </div>
      </section>
    </div>
  )
}
