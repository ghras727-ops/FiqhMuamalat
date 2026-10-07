import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../app/auth-context'
import { supabase } from '../../lib/supabase'
import FeedTab from './FeedTab'
import WeekPacksView from './WeekPacksView'
import SelfTestTab from './SelfTestTab'
import AppShell, { type ShellTab } from '../../components/AppShell'
import Tag from '../../components/Tag'

const TABS: ShellTab[] = [
  { key: 'feed', label: 'المنصة' },
  { key: 'lessons', label: 'دروس الأسابيع' },
  { key: 'selftest', label: 'اختبر نفسك' },
  { key: 'acts', label: 'أنشطتي' },
  { key: 'grades', label: 'درجاتي' },
]

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const th = 'p-3 text-start text-ink-muted'

interface ActivityRow {
  id: string
  title: string
  week_number: number
  total_possible: number
}

interface AttemptRow {
  id: string
  activity_id: string
  auto_score: number
  manual_score: number | null
  status: string
  submitted_at: string
}

export default function StudentHomePage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('feed')

  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [attempts, setAttempts] = useState<Record<string, AttemptRow>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)

    const [aRes, atRes] = await Promise.all([
      supabase.from('activities').select('id,title,week_id'),
      supabase.from('attempts').select('id,activity_id,auto_score,manual_score,status,submitted_at'),
    ])

    if (aRes.error || atRes.error) {
      setError('تعذّر تحميل البيانات.')
      setLoading(false)
      return
    }

    const acts = (aRes.data ?? []) as { id: string; title: string; week_id: string }[]
    const weekIds = Array.from(new Set(acts.map((a) => a.week_id)))
    const wRes = weekIds.length > 0
      ? await supabase.from('weeks').select('id,number').in('id', weekIds)
      : { data: [] as { id: string; number: number }[], error: null }
    const weekMap: Record<string, number> = {}
    for (const w of (wRes.data ?? []) as { id: string; number: number }[]) weekMap[w.id] = w.number

    const actIds = acts.map((a) => a.id)
    const aqRes = actIds.length > 0
      ? await supabase.from('activity_questions').select('activity_id,question_id').in('activity_id', actIds)
      : { data: [] as { activity_id: string; question_id: string }[], error: null }
    const qIds = Array.from(new Set(((aqRes.data ?? []) as { question_id: string }[]).map((x) => x.question_id)))
    const qRes = qIds.length > 0
      ? await supabase.from('questions').select('id,score').in('id', qIds)
      : { data: [] as { id: string; score: number }[], error: null }
    const scoreMap: Record<string, number> = {}
    for (const q of (qRes.data ?? []) as { id: string; score: number }[]) scoreMap[q.id] = q.score
    const totalByAct: Record<string, number> = {}
    for (const link of (aqRes.data ?? []) as { activity_id: string; question_id: string }[]) {
      totalByAct[link.activity_id] = (totalByAct[link.activity_id] ?? 0) + (scoreMap[link.question_id] ?? 0)
    }

    setActivities(acts.map((a) => ({
      id: a.id,
      title: a.title,
      week_number: weekMap[a.week_id] ?? 0,
      total_possible: totalByAct[a.id] ?? 0,
    })))

    const am: Record<string, AttemptRow> = {}
    for (const t of (atRes.data ?? []) as AttemptRow[]) am[t.activity_id] = t
    setAttempts(am)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const doneCount = activities.filter((a) => attempts[a.id]).length

  return (
    <AppShell tabs={TABS} current={tab} onChange={setTab}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="text-ink-muted">مرحبًا {profile?.full_name ?? ''}</p>
        {profile?.student_no && (
          <span className="rounded-lg bg-primary-soft px-2 py-0.5 font-mono text-xs text-primary" dir="ltr">
            {profile.student_no}
          </span>
        )}
      </div>

      {tab === 'feed' && <FeedTab />}
      {tab === 'lessons' && <WeekPacksView />}
      {tab === 'selftest' && <SelfTestTab onAttemptSaved={load} />}

      {tab === 'acts' && (
        <div className="space-y-4">
          <section className={card}>
            <h2 className="text-xl font-bold text-primary">أنشطتي</h2>
            <p className="mt-1 text-sm text-ink-muted">
              {doneCount} من {activities.length} نشاطًا مُنجَزًا
            </p>

            {loading ? (
              <p className="mt-4 text-ink-muted">جارٍ التحميل...</p>
            ) : error ? (
              <p className="mt-4 rounded-xl bg-error-soft p-3 font-semibold text-error">{error}</p>
            ) : activities.length === 0 ? (
              <p className="mt-4 text-ink-muted">لا توجد أنشطة متاحة الآن.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-light-blue">
                      <th className={th}>النشاط</th>
                      <th className={th}>الأسبوع</th>
                      <th className={th}>الحالة</th>
                      <th className={th}>إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.map((a) => {
                      const at = attempts[a.id]
                      return (
                        <tr key={a.id} className="border-b border-light-blue/50 hover:bg-bg">
                          <td className="p-3 text-base font-semibold text-ink">{a.title}</td>
                          <td className="p-3">الأسبوع {a.week_number}</td>
                          <td className="p-3">
                            {at ? <Tag tone="info">أُنجز ✓</Tag> : <Tag tone="ok">متاح</Tag>}
                          </td>
                          <td className="p-3">
                            {at ? (
                              <button
                                className="rounded-xl border border-primary bg-white px-4 py-1.5 text-sm font-semibold text-primary hover:bg-primary-soft"
                                onClick={() => setTab('selftest')}
                              >
                                مراجعة
                              </button>
                            ) : (
                              <button
                                className="rounded-xl bg-primary px-4 py-1.5 text-sm font-semibold text-white hover:bg-primary-hover"
                                onClick={() => setTab('selftest')}
                              >
                                ابدأ
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'grades' && (
        <div className="space-y-4">
          <section className={card}>
            <h2 className="text-xl font-bold text-primary">درجاتي</h2>

            {loading ? (
              <p className="mt-4 text-ink-muted">جارٍ التحميل...</p>
            ) : error ? (
              <p className="mt-4 rounded-xl bg-error-soft p-3 font-semibold text-error">{error}</p>
            ) : activities.filter((a) => attempts[a.id]).length === 0 ? (
              <p className="mt-4 text-ink-muted">لا نتائج بعد.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-light-blue">
                      <th className={th}>النشاط</th>
                      <th className={th}>الأسبوع</th>
                      <th className={th}>الدرجة الآلية</th>
                      <th className={th}>الدرجة اليدوية</th>
                      <th className={th}>المجموع</th>
                      <th className={th}>الحالة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activities.filter((a) => attempts[a.id]).map((a) => {
                      const at = attempts[a.id]!
                      const total = at.auto_score + (at.manual_score ?? 0)
                      const graded = at.status === 'graded'
                      return (
                        <tr key={a.id} className="border-b border-light-blue/50 hover:bg-bg">
                          <td className="p-3 text-base font-semibold text-ink">{a.title}</td>
                          <td className="p-3">الأسبوع {a.week_number}</td>
                          <td className="p-3 font-semibold text-primary">{at.auto_score}</td>
                          <td className="p-3">{at.manual_score ?? '—'}</td>
                          <td className="p-3 text-lg font-bold text-secondary" dir="ltr">
                            {total.toFixed(1)} / {a.total_possible}
                          </td>
                          <td className="p-3">
                            {graded
                              ? <Tag tone="ok">مصحح ✓</Tag>
                              : <Tag tone="wait">بانتظار المقالي</Tag>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}
    </AppShell>
  )
}