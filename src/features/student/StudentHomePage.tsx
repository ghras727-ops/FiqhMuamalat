import { useState } from 'react'
import { useAuth } from '../../app/auth-context'
import FeedTab from './FeedTab'
import WeekPacksView from './WeekPacksView'
import SelfTestTab from './SelfTestTab'
import AppShell, { type ShellTab } from '../../components/AppShell'
import DemoBadge from '../../components/DemoBadge'
import Tag from '../../components/Tag'
import { btn, btnOutline, card, field, th } from '../../components/ui'
import {
  demoActivities, demoMaterials, demoQuestions, demoResults, demoTopicScores,
  demoTopics, demoWeeks, releaseLabel, type DemoActivity,
} from '../../demo/data'

const TABS: ShellTab[] = [
  { key: 'feed', label: 'المنصة' },
  { key: 'lessons', label: 'دروس الأسابيع' },
  { key: 'selftest', label: 'اختبر نفسك' },
  { key: 'acts', label: 'أنشطتي' },
  { key: 'grades', label: 'درجاتي' },
]

const ME = 'FM0001'

interface Attempt {
  score: number
  pendingReview: boolean
}

function initialAttempts(): Record<string, Attempt> {
  const out: Record<string, Attempt> = {}
  demoResults
    .filter((r) => r.studentNo === ME)
    .forEach((r) => {
      const act = demoActivities.find((a) => a.id === r.activityId)
      if (act && act.status === 'closed') out[r.activityId] = { score: r.score, pendingReview: false }
    })
  return out
}

function canSee(a: DemoActivity, at: Attempt | undefined): boolean {
  if (!at) return false
  if (a.release === 'immediate') return true
  if (a.release === 'after_close') return a.status === 'closed'
  return a.released
}

function barColor(p: number) {
  if (p < 50) return 'bg-error'
  if (p < 70) return 'bg-warning'
  return 'bg-secondary'
}

export default function StudentHomePage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('feed')
  const [openLesson, setOpenLesson] = useState<string | null>(null)
  const [attempts, setAttempts] = useState<Record<string, Attempt>>(initialAttempts)
  const [doing, setDoing] = useState<string | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [shownResult, setShownResult] = useState<string | null>(null)

  const weeks = demoWeeks.filter((w) => w.published)
  const acts = demoActivities.filter((a) => a.status !== 'draft')
  const weekLabel = (id: string) => {
    const w = demoWeeks.find((x) => x.id === id)
    return w ? 'الأسبوع ' + w.number : ''
  }

  function start(id: string) {
    setAnswers({})
    setDoing(id)
  }

  function submit(a: DemoActivity) {
    const qs = a.questionIds
      .map((id) => demoQuestions.find((q) => q.id === id))
      .filter((q) => q !== undefined)
    let correct = 0
    let pending = false
    qs.forEach((q) => {
      const given = (answers[q!.id] ?? '').trim()
      if (q!.type === 'essay') {
        pending = true
      } else if (given !== '' && given === q!.answer) {
        correct += 1
      } else if (q!.type === 'short') {
        pending = true
      }
    })
    const score = qs.length === 0 ? 0 : Math.round((correct / qs.length) * a.max * 10) / 10
    setAttempts({ ...attempts, [a.id]: { score, pendingReview: pending } })
    setDoing(null)
    setShownResult(a.id)
  }

  const doingAct = acts.find((a) => a.id === doing)

  return (
    <AppShell tabs={TABS} current={tab} onChange={setTab}>
      <div className="mb-4 flex items-center gap-2">
        <p className="text-ink/70">مرحبًا {profile?.full_name}</p>
        <DemoBadge />
      </div>

      {tab === 'feed' && <FeedTab />}
      {tab === 'lessons' && <WeekPacksView />}
      {tab === 'selftest' && <SelfTestTab />}
      {tab === 'weeks' && (
        <div className="space-y-4">
          {weeks.map((w) => {
            const mats = demoMaterials.filter((m) => m.weekId === w.id && m.published)
            return (
              <section key={w.id} className={card}>
                <h2 className="text-lg font-bold text-primary">الأسبوع {w.number}: {w.title}</h2>
                <ul className="mt-3 space-y-2">
                  {w.lessons.filter((l) => l.published).map((l) => (
                    <li key={l.id} className="rounded-xl bg-surface p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span>{l.title}</span>
                        <button className={btnOutline} onClick={() => setOpenLesson(openLesson === l.id ? null : l.id)}>
                          {openLesson === l.id ? 'إغلاق' : 'عرض الدرس'}
                        </button>
                      </div>
                      {openLesson === l.id && (
                        <p className="mt-3 text-sm leading-7 text-ink/80">
                          هذا نص تجريبي لمحتوى الدرس «{l.title}». في النسخة الحقيقية يظهر هنا المحتوى الذي كتبه الأستاذ.
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-sm text-ink/70">
                  المواد: {mats.length === 0 ? 'لا توجد' : mats.map((m) => m.title + ' (' + m.kind + ')').join('، ')}
                </p>
              </section>
            )
          })}
        </div>
      )}

      {tab === 'acts' && (
        <div className="space-y-4">
          {doingAct ? (
            <section className={card}>
              <h2 className="text-lg font-bold text-primary">{doingAct.title}</h2>
              <p className="mt-1 text-sm text-ink/70">الدرجة العظمى: {doingAct.max}</p>
              <div className="mt-4 space-y-5">
                {doingAct.questionIds.map((id, i) => {
                  const q = demoQuestions.find((x) => x.id === id)
                  if (!q) return null
                  const choices = q.type === 'mcq' ? q.options ?? [] : q.type === 'tf' ? ['صح', 'خطأ'] : []
                  return (
                    <div key={q.id}>
                      <div className="font-semibold">{i + 1}. {q.text}</div>
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
                      {q.type === 'short' && (
                        <input className={field} value={answers[q.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                      )}
                      {q.type === 'essay' && (
                        <textarea rows={4} className={field} value={answers[q.id] ?? ''} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} />
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="mt-5 flex gap-2">
                <button className={btn} onClick={() => submit(doingAct)}>تسليم</button>
                <button className={btnOutline} onClick={() => setDoing(null)}>إلغاء</button>
              </div>
            </section>
          ) : (
            <section className={card}>
              <h2 className="text-xl font-bold text-primary">أنشطتي</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-light-blue text-ink/70">
                      <th className={th}>النشاط</th>
                      <th className={th}>النوع</th>
                      <th className={th}>الأسبوع</th>
                      <th className={th}>الحالة</th>
                      <th className={th}>إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {acts.map((a) => {
                      const at = attempts[a.id]
                      return (
                        <tr key={a.id} className="border-b border-light-blue/50">
                          <td className="p-2">{a.title}</td>
                          <td className="p-2">{a.kind}</td>
                          <td className="p-2">{weekLabel(a.weekId)}</td>
                          <td className="p-2">
                            {at ? <Tag tone="info">أُنجز</Tag> : a.status === 'open' ? <Tag tone="ok">متاح</Tag> : <Tag tone="off">مغلق</Tag>}
                          </td>
                          <td className="p-2">
                            {!at && a.status === 'open' && <button className={btn} onClick={() => start(a.id)}>ابدأ</button>}
                            {at && (
                              <button className={btnOutline} onClick={() => setShownResult(shownResult === a.id ? null : a.id)}>
                                النتيجة
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {shownResult && (() => {
                const a = acts.find((x) => x.id === shownResult)
                const at = attempts[shownResult]
                if (!a || !at) return null
                return (
                  <div className="mt-4 rounded-xl border border-light-blue p-4">
                    <div className="font-semibold">{a.title}</div>
                    {canSee(a, at) ? (
                      <>
                        <div className="mt-2 text-2xl font-bold text-primary" dir="ltr">{at.score}/{a.max}</div>
                        {at.pendingReview && (
                          <p className="mt-1 text-sm text-ink/70">الدرجة مؤقتة: بعض إجاباتك بانتظار مراجعة الأستاذ.</p>
                        )}
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-ink/70">
                        النتيجة غير متاحة بعد. سياسة الكشف: {releaseLabel[a.release]}.
                      </p>
                    )}
                    <p className="mt-2 text-xs text-ink/60">لا تظهر الإجابات الصحيحة إلا وفق سياسة كل نشاط.</p>
                  </div>
                )
              })()}
            </section>
          )}
        </div>
      )}

      {tab === 'grades' && (
        <div className="space-y-4">
          <section className={card}>
            <h2 className="text-xl font-bold text-primary">درجاتي</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-light-blue text-ink/70">
                    <th className={th}>النشاط</th>
                    <th className={th}>الدرجة</th>
                  </tr>
                </thead>
                <tbody>
                  {acts.filter((a) => attempts[a.id]).map((a) => (
                    <tr key={a.id} className="border-b border-light-blue/50">
                      <td className="p-2">{a.title}</td>
                      <td className="p-2" dir="ltr">
                        {canSee(a, attempts[a.id]) ? attempts[a.id].score + '/' + a.max : 'بانتظار الكشف'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {acts.filter((a) => attempts[a.id]).length === 0 && (
                <p className="text-sm text-ink/60">لا توجد نتائج بعد.</p>
              )}
            </div>
          </section>

          <section className={card}>
            <h3 className="text-lg font-bold text-primary">نقاط تحتاج مراجعة</h3>
            <div className="mt-3 space-y-4">
              {demoTopicScores.map((t) => (
                <div key={t.topicId}>
                  <div className="flex justify-between text-sm">
                    <span>{demoTopics.find((x) => x.id === t.topicId)?.name}</span>
                    <b>{t.percent}%</b>
                  </div>
                  <div className="mt-1 h-3 overflow-hidden rounded-full bg-surface">
                    <div className={'h-full ' + barColor(t.percent)} style={{ width: t.percent + '%' }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  )
}



