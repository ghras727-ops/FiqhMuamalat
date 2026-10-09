import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../app/auth-context'
import { supabase } from '../../lib/supabase'
import FeedTab from './FeedTab'
import WeekPacksView from './WeekPacksView'
import SelfTestTab from './SelfTestTab'
import AppShell, { type ShellTab } from '../../components/AppShell'
import Tag from '../../components/Tag'
import WeeklyReport, { type ReportSnapshot } from '../shared/WeeklyReport'

const TABS: ShellTab[] = [
  { key: 'feed', label: 'المنصة' },
  { key: 'lessons', label: 'دروس الأسابيع' },
  { key: 'selftest', label: 'اختبر نفسك' },
  { key: 'acts', label: 'أنشطتي' },
  { key: 'grades', label: 'درجاتي' },
]

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
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
  submitted_at: string | null
}

interface MyReport {
  id: string
  type: string
  from_week_number: number
  to_week_number: number
  report_number: string | null
  approved_at: string
  seen_at: string | null
  teacher_note: string | null
  snapshot: ReportSnapshot
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`
  return new Date(iso).toLocaleDateString('ar-SA-u-nu-latn')
}

export default function StudentHomePage() {
  const { profile } = useAuth()
  const [tab, setTab] = useState('feed')

  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [attempts, setAttempts] = useState<Record<string, AttemptRow>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [reports, setReports] = useState<MyReport[]>([])
  const [viewingReport, setViewingReport] = useState<MyReport | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setError(null)

    const [aRes, atRes, rpRes] = await Promise.all([
      supabase.from('activities').select('id,title,week_id'),
      supabase.from('attempts').select('id,activity_id,auto_score,manual_score,status,submitted_at'),
      supabase.from('weekly_reports')
        .select('id,type,from_week_number,to_week_number,report_number,approved_at,seen_at,teacher_note,snapshot')
        .eq('status', 'active')
        .order('approved_at', { ascending: false }),
    ])

    if (aRes.error || atRes.error || rpRes.error) {
      setError('تعذّر تحميل البيانات.')
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

    setReports((rpRes.data ?? []) as MyReport[])
  }, [])

  const initialLoad = useCallback(async () => {
    setLoading(true)
    await load()
    setLoading(false)
  }, [load])

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }, [load])

  useEffect(() => { void initialLoad() }, [initialLoad])

  async function openReport(r: MyReport) {
    setViewingReport(r)
    if (!r.seen_at && supabase) {
      await supabase.rpc('mark_report_seen', { p_report_id: r.id })
      // حدّث محليًا بلا إعادة تحميل
      setReports((prev) => prev.map((x) => x.id === r.id ? { ...x, seen_at: new Date().toISOString() } : x))
    }
  }

  const doneCount = activities.filter((a) => {
    const at = attempts[a.id]
    return at?.status === 'submitted' || at?.status === 'graded'
  }).length

  const gradedCount = activities.filter((a) => attempts[a.id]?.status === 'graded').length
  const unseenReports = reports.filter((r) => !r.seen_at).length

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
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 pb-7 text-white shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold">أنشطتي</h2>
                <p className="mt-1 text-base text-white/85">
                  {doneCount} من {activities.length} نشاطًا مُنجَزًا
                  {gradedCount > 0 && <> — {gradedCount} مصحّح</>}
                </p>
              </div>
              <button
                className="rounded-xl bg-white px-5 py-2.5 text-base font-bold text-primary shadow-md hover:bg-primary-soft disabled:opacity-60"
                onClick={() => void refresh()}
                disabled={refreshing}
              >
                {refreshing ? '⏳ جارٍ التحديث...' : '🔄 تحديث'}
              </button>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex h-1" aria-hidden="true">
              <span className="flex-[3] bg-accent" />
              <span className="flex-1 bg-secondary" />
              <span className="flex-1 bg-warning" />
            </div>
          </section>

          <section className={card}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-primary">قائمة الأنشطة</h3>
              <button className={btnOutline} onClick={() => void refresh()} disabled={refreshing}>
                {refreshing ? '⏳ جارٍ...' : '🔄 تحديث'}
              </button>
            </div>

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
                      const isDraft = at?.status === 'draft'
                      const isSubmitted = at?.status === 'submitted'
                      const isGraded = at?.status === 'graded'
                      return (
                        <tr key={a.id} className="border-b border-light-blue/50 hover:bg-bg">
                          <td className="p-3 text-base font-semibold text-ink">{a.title}</td>
                          <td className="p-3">الأسبوع {a.week_number}</td>
                          <td className="p-3">
                            {isGraded
                              ? <Tag tone="ok">مصحح ✓</Tag>
                              : isSubmitted
                                ? <Tag tone="wait">بانتظار التصحيح</Tag>
                                : isDraft
                                  ? <Tag tone="info">قيد الإجابة</Tag>
                                  : <Tag tone="ok">متاح</Tag>}
                          </td>
                          <td className="p-3">
                            <button className={isGraded ? btnOutline : btn} onClick={() => setTab('selftest')}>
                              {isGraded ? 'عرض إجاباتي' : isSubmitted ? 'تعديل الإجابات' : isDraft ? 'متابعة' : 'ابدأ'}
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
        </div>
      )}

      {tab === 'grades' && (
        <div className="space-y-4">
          <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 pb-7 text-white shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-3xl font-bold">درجاتي</h2>
                <p className="mt-1 text-base text-white/85">نتائجك في الأنشطة المصححة.</p>
              </div>
              <button
                className="rounded-xl bg-white px-5 py-2.5 text-base font-bold text-primary shadow-md hover:bg-primary-soft disabled:opacity-60"
                onClick={() => void refresh()}
                disabled={refreshing}
              >
                {refreshing ? '⏳ جارٍ التحديث...' : '🔄 تحديث'}
              </button>
            </div>
            <div className="absolute inset-x-0 bottom-0 flex h-1" aria-hidden="true">
              <span className="flex-[3] bg-accent" />
              <span className="flex-1 bg-secondary" />
              <span className="flex-1 bg-warning" />
            </div>
          </section>

          {/* قسم التقارير الرسمية */}
          {reports.length > 0 && (
            <section className="rounded-2xl border-2 border-accent bg-gradient-to-l from-accent-soft/40 to-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-primary">
                    📄 تقاريري الرسمية {unseenReports > 0 && (
                      <span className="ms-2 rounded-full bg-error px-2 py-0.5 text-xs font-bold text-white">
                        {unseenReports} جديد
                      </span>
                    )}
                  </h3>
                  <p className="mt-1 text-sm text-ink-muted">
                    تقارير أكاديمية معتمدة من مدرس المقرر — يمكنك طباعتها أو حفظها PDF.
                  </p>
                </div>
              </div>
              <ul className="mt-4 space-y-3">
                {reports.map((r) => (
                  <li
                    key={r.id}
                    className={
                      'flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 bg-white p-4 transition hover:shadow-md ' +
                      (r.seen_at ? 'border-light-blue' : 'border-accent')
                    }
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-base font-bold text-ink">
                          {r.type === 'weekly'
                            ? `تقرير الأسبوع ${r.from_week_number}`
                            : `تقرير تراكمي — الأسابيع ${r.from_week_number} – ${r.to_week_number}`}
                        </span>
                        {!r.seen_at && (
                          <span className="rounded-full bg-error px-2 py-0.5 text-xs font-bold text-white">جديد</span>
                        )}
                        {r.report_number && (
                          <span className="rounded bg-bg px-2 py-0.5 font-mono text-xs text-ink-muted" dir="ltr">
                            {r.report_number}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-ink-muted">
                        صدر {timeAgo(r.approved_at)}
                      </div>
                    </div>
                    <button className={btn} onClick={() => void openReport(r)}>
                      عرض التقرير
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className={card}>
            <h3 className="text-lg font-bold text-primary">جدول الدرجات</h3>
            {loading ? (
              <p className="mt-4 text-ink-muted">جارٍ التحميل...</p>
            ) : error ? (
              <p className="mt-4 rounded-xl bg-error-soft p-3 font-semibold text-error">{error}</p>
            ) : activities.filter((a) => {
              const s = attempts[a.id]?.status
              return s === 'submitted' || s === 'graded'
            }).length === 0 ? (
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
                    {activities
                      .filter((a) => {
                        const s = attempts[a.id]?.status
                        return s === 'submitted' || s === 'graded'
                      })
                      .map((a) => {
                        const at = attempts[a.id]!
                        const rawTotal = at.auto_score + (at.manual_score ?? 0)
                        const cappedTotal = Math.min(rawTotal, a.total_possible)
                        const graded = at.status === 'graded'
                        return (
                          <tr key={a.id} className="border-b border-light-blue/50 hover:bg-bg">
                            <td className="p-3 text-base font-semibold text-ink">{a.title}</td>
                            <td className="p-3">الأسبوع {a.week_number}</td>
                            <td className="p-3 font-semibold text-primary">{graded ? at.auto_score : '—'}</td>
                            <td className="p-3">{graded ? (at.manual_score ?? '—') : '—'}</td>
                            <td className="p-3 text-lg font-bold text-secondary" dir="ltr">
                              {graded
                                ? <>{cappedTotal.toFixed(1)} / {a.total_possible}</>
                                : <>— / {a.total_possible}</>}
                            </td>
                            <td className="p-3">
                              {graded
                                ? <Tag tone="ok">مصحح ✓</Tag>
                                : <Tag tone="wait">بانتظار التصحيح</Tag>}
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

      {/* نافذة عرض التقرير للطالب */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-2 md:p-6">
          <div className="mx-auto max-w-[900px]">
            <div className="no-print sticky top-0 z-10 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3 shadow-lg">
              <div className="text-base font-bold text-primary">
                📄 {viewingReport.type === 'weekly'
                  ? `تقرير الأسبوع ${viewingReport.from_week_number}`
                  : `تقرير تراكمي — الأسابيع ${viewingReport.from_week_number} – ${viewingReport.to_week_number}`}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={btnOutline} onClick={() => window.print()}>
                  🖨️ طباعة / PDF
                </button>
                <button className={btn} onClick={() => setViewingReport(null)}>
                  إغلاق
                </button>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
              <WeeklyReport
                snapshot={viewingReport.snapshot}
                reportNumber={viewingReport.report_number}
                approvedAt={viewingReport.approved_at}
                teacherNote={viewingReport.teacher_note}
              />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}