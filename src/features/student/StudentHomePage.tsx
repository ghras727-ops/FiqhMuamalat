import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../app/auth-context'
import { supabase } from '../../lib/supabase'
import FeedTab from './FeedTab'
import WeekPacksView from './WeekPacksView'
import SelfTestTab from './SelfTestTab'
import StudentAssignmentsTab from './StudentAssignmentsTab'
import AppShell, { type ShellTab } from '../../components/AppShell'
import Tag from '../../components/Tag'
import WeeklyReport, { type ReportSnapshot } from '../shared/WeeklyReport'
import MessagesTab from '../shared/MessagesTab'
import { useUnreadMessages } from '../shared/useUnreadMessages'
import ComprehensiveReport, { type ComprehensiveSnapshot } from '../shared/ComprehensiveReport'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const btnDanger = 'rounded-xl border border-error bg-white px-4 py-2 text-sm font-semibold text-error hover:bg-error-soft disabled:opacity-60'
const th = 'p-3 text-start text-ink-muted'

interface ActivityRow { id: string; title: string; week_number: number; total_possible: number }
interface AttemptRow { id: string; activity_id: string; auto_score: number; manual_score: number | null; status: string; submitted_at: string | null }
interface MyReport { id: string; type: string; from_week_number: number; to_week_number: number; report_number: string | null; approved_at: string; seen_at: string | null; teacher_note: string | null; snapshot?: ReportSnapshot }

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`
  return new Date(iso).toLocaleDateString('ar-SA-u-nu-latn')
}

function formatTestDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    let hours = d.getHours()
    const minutes = String(d.getMinutes()).padStart(2, '0')
    const ampm = hours >= 12 ? 'م' : 'ص'
    hours = hours % 12 || 12
    return `${day}/${month} - ${hours}:${minutes} ${ampm}`
  } catch { return '—' }
}

export default function StudentHomePage() {
  const { profile } = useAuth()
  const { counts: msgCounts } = useUnreadMessages()
  const [tab, setTab] = useState('feed')
  const [refreshKey, setRefreshKey] = useState(0)
  const [mounted, setMounted] = useState<string[]>(['feed'])
  
  const [hasNewAssignments, setHasNewAssignments] = useState(false)
  const [hasNewReports, setHasNewReports] = useState(false)

  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [attempts, setAttempts] = useState<Record<string, AttemptRow>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reports, setReports] = useState<MyReport[]>([])
  const [viewingReport, setViewingReport] = useState<MyReport | null>(null)
  const [reportLoading, setReportLoading] = useState(false)

  const [studentCompSnapshot, setStudentCompSnapshot] = useState<ComprehensiveSnapshot | null>(null)
  const [compBusy, setCompBusy] = useState(false)
  const [weeks, setWeeks] = useState<{id: string, number: number, title: string}[]>([])

  useEffect(() => { setMounted((prev) => (prev.includes(tab) ? prev : [...prev, tab])) }, [tab])

  const load = useCallback(async () => {
    if (!supabase) return
    setError(null)

    // تم إزالة snapshot من هنا لتسريع التحميل
    const [aRes, atRes, rpRes, asgRes, wRes] = await Promise.all([
      supabase.from('activities').select('id,title,week_id'),
      supabase.from('attempts').select('id,activity_id,auto_score,manual_score,status,submitted_at'),
      supabase.from('weekly_reports').select('id,type,from_week_number,to_week_number,report_number,approved_at,seen_at,teacher_note').eq('status', 'active').order('approved_at', { ascending: false }),
      supabase.from('assignments').select('id, created_at').eq('published', true).order('created_at', { ascending: false }).limit(1),
      supabase.from('weeks').select('id,number,title').order('number')
    ])

    if (aRes.error || atRes.error || rpRes.error) { setError('تعذّر تحميل البيانات.'); return }

    const acts = (aRes.data ?? []) as { id: string; title: string; week_id: string }[]
    const wMap: Record<string, {num: number, title: string}> = {}
    for (const w of (wRes.data ?? []) as {id: string, number: number, title: string}[]) wMap[w.id] = {num: w.number, title: w.title}

    setWeeks((wRes.data ?? []) as {id: string, number: number, title: string}[])

    const am: Record<string, AttemptRow> = {}
    for (const t of (atRes.data ?? []) as AttemptRow[]) am[t.activity_id] = t

    // إلغاء سلسلة الاستعلامات وتسريع الواجهة، الدرجة الكاملة ثابتة 60
    setActivities(acts.map((a) => ({ id: a.id, title: a.title, week_number: wMap[a.week_id]?.num ?? 0, total_possible: 60 })))
    setAttempts(am)

    const reps = (rpRes.data ?? []) as MyReport[]
    setReports(reps)

    const lastSeenAsg = localStorage.getItem('last_seen_assignments')
    if (asgRes.data && asgRes.data.length > 0) {
      const latestAsg = asgRes.data[0].created_at
      if (!lastSeenAsg || new Date(latestAsg) > new Date(lastSeenAsg)) setHasNewAssignments(true)
    }
    if (reps.some(r => !r.seen_at)) setHasNewReports(true)
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

  useEffect(() => {
    setRefreshKey((prev) => prev + 1)
    void refresh()
  }, [tab, refresh])

  useEffect(() => {
    if (tab === 'assignments' && hasNewAssignments) {
      localStorage.setItem('last_seen_assignments', new Date().toISOString())
      setHasNewAssignments(false)
    }
    if (tab === 'grades' && hasNewReports) {
      setHasNewReports(false)
    }
  }, [tab, hasNewAssignments, hasNewReports])

  async function openReport(r: MyReport) {
    setViewingReport(r)
    if (!r.seen_at && supabase) {
      await supabase.rpc('mark_report_seen', { p_report_id: r.id })
      setReports((prev) => prev.map((x) => x.id === r.id ? { ...x, seen_at: new Date().toISOString() } : x))
    }
    // جلب التقرير الكامل فقط عند الضغط عليه
    if (!r.snapshot && supabase) {
      setReportLoading(true)
      const { data } = await supabase.from('weekly_reports').select('snapshot').eq('id', r.id).single()
      if (data) {
        setViewingReport({ ...r, snapshot: data.snapshot })
      }
      setReportLoading(false)
    }
  }

  async function openMyComprehensiveReport() {
    if (!supabase || !profile) return
    setCompBusy(true); setError(null)
    try {
      const grades = activities.filter(a => attempts[a.id]?.status === 'graded').map(a => {
        const at = attempts[a.id]!
        const score = at.auto_score + (at.manual_score ?? 0)
        const max = a.total_possible || 60
        const weekName = weeks.find(w => w.number === a.week_number)?.title || a.title
        return { week: a.week_number, title: weekName, score, max, percent: Math.min(100, Math.round((score/max)*100)), status: at.status }
      })

      const { data: att } = await supabase.from('attendance').select('week_id, status').eq('student_id', profile.id)
      const attendance = (att ?? []).map(a => {
         const week = weeks.find(w => w.id === a.week_id)
         return { week: week ? week.number : 0, status: a.status }
      }).filter(a => a.week > 0).sort((a,b) => a.week - b.week)

      setStudentCompSnapshot({
        student: { full_name: profile.full_name, student_no: profile.student_no },
        from_week: 1, to_week: weeks.length ? Math.max(...weeks.map(w=>w.number)) : 1,
        generated_at: new Date().toISOString(),
        grades: grades.sort((a,b) => a.week - b.week),
        attendance,
        options: { showGrades: true, showAttendance: true }
      })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setCompBusy(false)
    }
  }

  const TABS: ShellTab[] = [
    { key: 'feed', label: 'المنصة' },
    { key: 'lessons', label: 'دروس الأسابيع' },
    { key: 'selftest', label: 'اختبر نفسك' },
    { key: 'assignments', label: hasNewAssignments ? '🔴 التكاليف' : 'التكاليف' },
    { key: 'acts', label: 'أنشطتي' },
    { key: 'grades', label: hasNewReports ? '🔴 درجاتي' : 'درجاتي' },
    { key: 'messages', label: msgCounts.total > 0 ? `🔴 مراسلة الأستاذ (${msgCounts.total})` : 'مراسلة الأستاذ' },
  ]

  const doneCount = activities.filter((a) => { const at = attempts[a.id]; return at?.status === 'submitted' || at?.status === 'graded' }).length
  const gradedCount = activities.filter((a) => attempts[a.id]?.status === 'graded').length
  const unseenReports = reports.filter((r) => !r.seen_at).length
  const show = (key: string) => ({ display: tab === key ? 'block' : 'none' }) as const

  return (
    <AppShell tabs={TABS} current={tab} onChange={setTab}>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <p className="text-ink-muted">مرحبًا {profile?.full_name ?? ''}</p>
        {profile?.student_no && <span className="rounded-lg bg-primary-soft px-2 py-0.5 font-mono text-xs text-primary" dir="ltr">{profile.student_no}</span>}
      </div>

      {mounted.includes('feed') && <div key={refreshKey} style={show('feed')}><FeedTab /></div>}
      {mounted.includes('lessons') && <div key={refreshKey} style={show('lessons')}><WeekPacksView /></div>}
      {mounted.includes('selftest') && <div key={refreshKey} style={show('selftest')}><SelfTestTab onAttemptSaved={load} /></div>}
      {mounted.includes('messages') && <div style={show('messages')}><MessagesTab /></div>}
      
      {mounted.includes('assignments') && <div key={refreshKey} style={show('assignments')}><StudentAssignmentsTab /></div>}

      {mounted.includes('acts') && (
        <div style={show('acts')}>
          <div className="space-y-4">
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 pb-7 text-white shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold">أنشطتي</h2>
                  <p className="mt-1 text-base text-white/85">{doneCount} من {activities.length} نشاطًا مُنجَزًا {gradedCount > 0 && <> — {gradedCount} مصحّح</>}</p>
                </div>
                <button className="rounded-xl bg-white px-5 py-2.5 text-base font-bold text-primary shadow-md hover:bg-primary-soft disabled:opacity-60" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? '⏳ جارٍ التحديث...' : '🔄 تحديث'}</button>
              </div>
            </section>
            <section className={card}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-bold text-primary">قائمة الأنشطة</h3>
                <button className={btnOutline} onClick={() => void refresh()} disabled={refreshing}>{refreshing ? '⏳ جارٍ...' : '🔄 تحديث'}</button>
              </div>
              {loading ? <p className="mt-4 text-ink-muted">جارٍ التحميل...</p> : error ? <p className="mt-4 rounded-xl bg-error-soft p-3 font-semibold text-error">{error}</p> : activities.length === 0 ? <p className="mt-4 text-ink-muted">لا توجد أنشطة متاحة الآن.</p> : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-light-blue"><th className={th}>النشاط</th><th className={th}>الأسبوع</th><th className={th}>الحالة</th><th className={th}>إجراء</th></tr></thead>
                    <tbody>
                      {activities.map((a) => {
                        const at = attempts[a.id]
                        const isDraft = at?.status === 'draft', isSubmitted = at?.status === 'submitted', isGraded = at?.status === 'graded'
                        return (
                          <tr key={a.id} className="border-b border-light-blue/50 hover:bg-bg">
                            <td className="p-3 text-base font-semibold text-ink">{a.title}</td>
                            <td className="p-3">الأسبوع {a.week_number}</td>
                            <td className="p-3">{isGraded ? <Tag tone="ok">مصحح ✓</Tag> : isSubmitted ? <Tag tone="wait">بانتظار التصحيح</Tag> : isDraft ? <Tag tone="info">قيد الإجابة</Tag> : <Tag tone="ok">متاح</Tag>}</td>
                            <td className="p-3"><button className={isGraded ? btnOutline : btn} onClick={() => setTab('selftest')}>{isGraded ? 'عرض إجاباتي' : isSubmitted ? 'تعديل الإجابات' : isDraft ? 'متابعة' : 'ابدأ'}</button></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {mounted.includes('grades') && (
        <div style={show('grades')}>
          <div className="space-y-4">
            <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 pb-7 text-white shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div><h2 className="text-3xl font-bold">درجاتي</h2><p className="mt-1 text-base text-white/85">نتائجك في الأنشطة المصححة.</p></div>
                <div className="flex flex-wrap gap-2">
                  <button className="rounded-xl bg-white/20 px-5 py-2.5 text-base font-bold text-white shadow-md hover:bg-white/30 disabled:opacity-60" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? '⏳ جارٍ التحديث...' : '🔄 تحديث'}</button>
                  <button className="rounded-xl bg-secondary px-5 py-2.5 text-base font-bold text-white shadow-md hover:bg-secondary-hover disabled:opacity-60" onClick={() => void openMyComprehensiveReport()} disabled={compBusy}>
                    {compBusy ? '...' : '📄 استخراج تقريري الشامل'}
                  </button>
                </div>
              </div>
            </section>

            {reports.length > 0 && (
              <section className="rounded-2xl border-2 border-accent bg-gradient-to-l from-accent-soft/40 to-white p-5 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-primary">📄 تقاريري الرسمية {unseenReports > 0 && <span className="ms-2 rounded-full bg-error px-2 py-0.5 text-xs font-bold text-white">{unseenReports} جديد</span>}</h3>
                    <p className="mt-1 text-sm text-ink-muted">تقارير أكاديمية معتمدة من مدرس المقرر.</p>
                  </div>
                </div>
                <ul className="mt-4 space-y-3">
                  {reports.map((r) => (
                    <li key={r.id} className={'flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 bg-white p-4 transition hover:shadow-md ' + (r.seen_at ? 'border-light-blue' : 'border-accent')}>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-base font-bold text-ink">{r.type === 'weekly' ? `تقرير الأسبوع ${r.from_week_number}` : `تقرير تراكمي — الأسابيع ${r.from_week_number} – ${r.to_week_number}`}</span>
                          {!r.seen_at && <span className="rounded-full bg-error px-2 py-0.5 text-xs font-bold text-white">جديد</span>}
                          {r.report_number && <span className="rounded bg-bg px-2 py-0.5 font-mono text-xs text-ink-muted" dir="ltr">{r.report_number}</span>}
                        </div>
                        <div className="mt-1 text-xs text-ink-muted">صدر {timeAgo(r.approved_at)}</div>
                      </div>
                      <button className={btn} onClick={() => void openReport(r)}>عرض التقرير</button>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <section className={card}>
              <h3 className="text-lg font-bold text-primary">جدول الدرجات</h3>
              {loading ? <p className="mt-4 text-ink-muted">جارٍ التحميل...</p> : error ? <p className="mt-4 rounded-xl bg-error-soft p-3 font-semibold text-error">{error}</p> : activities.filter((a) => { const s = attempts[a.id]?.status; return s === 'submitted' || s === 'graded' }).length === 0 ? <p className="mt-4 text-ink-muted">لا نتائج بعد.</p> : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="border-b border-light-blue"><th className={th}>النشاط</th><th className={th}>الأسبوع</th><th className={th}>تاريخ الاختبار</th><th className={th}>المجموع</th><th className={th}>الحالة</th></tr></thead>
                    <tbody>
                      {activities.filter((a) => { const s = attempts[a.id]?.status; return s === 'submitted' || s === 'graded' }).map((a) => {
                        const at = attempts[a.id]!, rawTotal = at.auto_score + (at.manual_score ?? 0), cappedTotal = Math.min(rawTotal, a.total_possible), graded = at.status === 'graded'
                        return (
                          <tr key={a.id} className="border-b border-light-blue/50 hover:bg-bg">
                            <td className="p-3 text-base font-semibold text-ink">{a.title}</td>
                            <td className="p-3">الأسبوع {a.week_number}</td>
                            <td className="p-3 text-sm font-semibold text-ink-muted"><span dir="ltr">{formatTestDate(at.submitted_at)}</span></td>
                            <td className="p-3 text-lg font-bold text-secondary" dir="ltr">{graded ? <>{cappedTotal.toFixed(1)} / {a.total_possible}</> : <>— / {a.total_possible}</>}</td>
                            <td className="p-3">{graded ? <Tag tone="ok">مصحح ✓</Tag> : <Tag tone="wait">بانتظار التصحيح</Tag>}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        </div>
      )}

      {viewingReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-2 md:p-6">
          <div className="mx-auto max-w-[900px]">
            <div className="no-print sticky top-0 z-10 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3 shadow-lg">
              <div className="text-base font-bold text-primary">📄 {viewingReport.type === 'weekly' ? `تقرير الأسبوع ${viewingReport.from_week_number}` : `تقرير تراكمي — الأسابيع ${viewingReport.from_week_number} – ${viewingReport.to_week_number}`}</div>
              <div className="flex flex-wrap gap-2"><button className={btnOutline} onClick={() => window.print()}>🖨️ طباعة / PDF</button><button className={btn} onClick={() => setViewingReport(null)}>إغلاق</button></div>
            </div>
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
              {reportLoading || !viewingReport.snapshot ? (
                <div className="p-12 text-center text-primary font-bold text-lg">⏳ جارٍ تحميل التقرير...</div>
              ) : (
                <WeeklyReport snapshot={viewingReport.snapshot} reportNumber={viewingReport.report_number} approvedAt={viewingReport.approved_at} teacherNote={viewingReport.teacher_note} />
              )}
            </div>
          </div>
        </div>
      )}

      {studentCompSnapshot && (
        <div className="fixed inset-0 z-[60] overflow-y-auto bg-black/70 p-2 md:p-6 print:bg-white print:p-0">
           <div className="mx-auto max-w-[210mm]">
             <div className="no-print sticky top-0 z-10 mb-3 flex justify-between rounded-2xl bg-white p-3 shadow-lg">
                <div className="font-bold text-primary">تقريري الشامل</div>
                <div className="flex gap-2">
                  <button className={btnOutline} onClick={() => window.print()}>🖨️ طباعة / PDF</button>
                  <button className={btnDanger} onClick={() => setStudentCompSnapshot(null)}>إغلاق</button>
                </div>
             </div>
             <div className="bg-white shadow-2xl print:shadow-none">
               <ComprehensiveReport snapshot={studentCompSnapshot} />
             </div>
           </div>
        </div>
      )}
    </AppShell>
  )
}