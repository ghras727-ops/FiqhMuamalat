# DISCOVERY — Frontend Architecture
**Generated:** 2026-10-27 04:13:07
**Root:** `D:\FiqhMuamalat`


## 1. File Tree

```
./.oxlintrc.json
./Discover-Frontend.ps1
./package.json
./package-lock.json
./Push.ps1
./src/app/App.tsx
./src/app/auth-context.ts
./src/app/AuthProvider.tsx
./src/app/router.ts
./src/components/AccessDenied.tsx
./src/components/AppShell.tsx
./src/components/AttachmentView.tsx
./src/components/Button.tsx
./src/components/CenteredCard.tsx
./src/components/DemoBadge.tsx
./src/components/Tag.tsx
./src/components/ui.ts
./src/demo/data.ts
./src/demo/files.ts
./src/demo/materials.ts
./src/demo/quizsets.ts
./src/demo/store.ts
./src/demo/weekpack.ts
./src/features/admin/AdminPage.tsx
./src/features/admin/AssignmentsTab.tsx
./src/features/admin/AttendanceTab.tsx
./src/features/admin/GradesTab.tsx
./src/features/admin/HomeTab.tsx
./src/features/admin/MaterialsTab.tsx
./src/features/admin/PostsTab.tsx
./src/features/admin/QuestionsTab.tsx
./src/features/admin/QuizSetsTab.tsx
./src/features/admin/ReportsTab.tsx
./src/features/admin/StudentsTab.tsx
./src/features/admin/TablesTab.tsx
./src/features/admin/WeeksTab.tsx
./src/features/auth/ChangePasswordPage.tsx
./src/features/auth/LoginPage.tsx
./src/features/shared/AssignmentNotification.tsx
./src/features/shared/InstitutionalReport.tsx
./src/features/shared/WeeklyReport.tsx
./src/features/student/FeedTab.tsx
./src/features/student/SelfTestTab.tsx
./src/features/student/StudentAssignmentsTab.tsx
./src/features/student/StudentHomePage.tsx
./src/features/student/WeekPacksView.tsx
./src/index.css
./src/lib/authErrors.ts
./src/lib/supabase.ts
./src/main.tsx
./src/types/index.ts
./src/vite-env.d.ts
./supabase/.temp/linked-project.json
./tsconfig.app.json
./tsconfig.json
./tsconfig.node.json
./vercel.json
./vite.config.ts
```

**إجمالي الملفات المكتشفة:** 58

## 2. Admin & Student Features


### 📄 `src\features\admin\AdminPage.tsx`
```tsx
import { useEffect, useState, type ReactNode } from 'react'
import AppShell, { type ShellTab } from '../../components/AppShell'
import AttendanceTab from './AttendanceTab'
import GradesTab from './GradesTab'
import HomeTab from './HomeTab'
import PostsTab from './PostsTab'
import QuizSetsTab from './QuizSetsTab'
import ReportsTab from './ReportsTab'
import StudentsTab from './StudentsTab'
import TablesTab from './TablesTab'
import WeeksTab from './WeeksTab'
import AssignmentsTab from './AssignmentsTab' // ⬅️ تم استبدال MaterialsTab بـ AssignmentsTab

const TABS: ShellTab[] = [
  { key: 'home', label: 'الرئيسة' },
  { key: 'posts', label: 'المنشورات' },
  { key: 'students', label: 'الطلاب' },
  { key: 'attendance', label: 'الحضور والغياب' },
  { key: 'weeks', label: 'الأسابيع والدروس' },
  { key: 'assignments', label: 'التكاليف' }, // ⬅️ التبويب الجديد
  { key: 'bank', label: 'بنك الأسئلة' },
  { key: 'grades', label: 'الدرجات' },
  { key: 'reports', label: 'التقارير' },
  { key: 'db', label: 'الجداول' },
]

export default function AdminPage() {
  const [tab, setTab] = useState('home')
  const [mounted, setMounted] = useState<string[]>(['home'])

  useEffect(() => {
    setMounted((prev) => (prev.includes(tab) ? prev : [...prev, tab]))
  }, [tab])

  const panels: { key: string; node: ReactNode }[] = [
    { key: 'home', node: <HomeTab /> },
    { key: 'posts', node: <PostsTab /> },
    { key: 'students', node: <StudentsTab /> },
    { key: 'attendance', node: <AttendanceTab /> },
    { key: 'weeks', node: <WeeksTab /> },
    { key: 'assignments', node: <AssignmentsTab /> }, // ⬅️ المكون الجديد
    { key: 'bank', node: <QuizSetsTab /> },
    { key: 'grades', node: <GradesTab /> },
    { key: 'reports', node: <ReportsTab /> },
    { key: 'db', node: <TablesTab /> },
  ]

  return (
    <AppShell tabs={TABS} current={tab} onChange={setTab}>
      {panels.map(({ key, node }) =>
        mounted.includes(key) ? (
          <div key={key} style={{ display: tab === key ? 'block' : 'none' }}>
            {node}
          </div>
        ) : null
      )}
    </AppShell>
  )
}
```

### 📄 `src\features\admin\AssignmentsTab.tsx`
```tsx
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const btnDanger = 'rounded-xl border border-error bg-white px-4 py-2 text-sm font-semibold text-error hover:bg-error-soft disabled:opacity-60'
const btnSuccess = 'rounded-xl bg-secondary px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-secondary-hover disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink'

interface Assignment {
  id: string
  title: string
  description: string | null
  deadline: string | null
  max_score: number
  published: boolean
  created_at: string
}

interface Submission {
  id: string
  assignment_id: string
  student_id: string
  status: 'draft' | 'submitted' | 'graded'
  score: number | null
  teacher_note: string | null
  student_note: string | null
  submitted_at: string | null
  profiles: { full_name: string; student_no: string | null }
  assignment_files: { id: string; file_path: string; file_name: string }[]
}

interface RetakeRequest {
  id: string
  submission_id: string
  student_id: string
  reason: string
  status: string
  created_at: string
  profiles: { full_name: string }
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('ar-SA-u-nu-latn', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AssignmentsTab() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [selectedAsg, setSelectedAsg] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [retakeRequests, setRetakeRequests] = useState<RetakeRequest[]>([])
  
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // نموذج الإنشاء
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [deadline, setDeadline] = useState('')

  // نافذة التصحيح
  const [gradingSub, setGradingSub] = useState<Submission | null>(null)
  const [pdfUrl, setPdfUrl] = useState<string | null>(null)
  const [scoreInput, setScoreInput] = useState('')
  const [noteInput, setNoteInput] = useState('')

  const loadAssignments = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data, error: err } = await supabase
      .from('assignments')
      .select('*')
      .order('created_at', { ascending: false })
    if (err) setError('تعذّر تحميل التكاليف.')
    else setAssignments((data ?? []) as Assignment[])
    setLoading(false)
  }, [])

  const loadSubmissions = useCallback(async (asgId: string) => {
    if (!supabase) return
    setBusy(true)
    const [subsRes, reqsRes] = await Promise.all([
      supabase.from('assignment_submissions')
        .select('*, profiles(full_name, student_no), assignment_files(id, file_path, file_name)')
        .eq('assignment_id', asgId)
        .order('submitted_at', { ascending: false }),
      supabase.from('assignment_retake_requests')
        .select('*, profiles:student_id(full_name)')
        .eq('status', 'pending')
    ])
    if (subsRes.error) setError('تعذّر تحميل التسليمات.')
    else setSubmissions((subsRes.data ?? []) as unknown as Submission[])
    
    if (!reqsRes.error) {
      const filteredReqs = ((reqsRes.data ?? []) as unknown as RetakeRequest[]).filter(
        r => (subsRes.data ?? []).some((s: any) => s.id === r.submission_id)
      )
      setRetakeRequests(filteredReqs)
    }
    setBusy(false)
  }, [])

  useEffect(() => { void loadAssignments() }, [loadAssignments])
  useEffect(() => {
    if (selectedAsg) void loadSubmissions(selectedAsg.id)
  }, [selectedAsg, loadSubmissions])

  async function createAssignment() {
    if (!supabase) return
    if (!title.trim()) { setError('العنوان مطلوب.'); return }
    setBusy(true)
    const { error: err } = await supabase.from('assignments').insert({
      title: title.trim(),
      description: desc.trim() || null,
      deadline: deadline ? new Date(deadline).toISOString() : null,
      published: false
    })
    setBusy(false)
    if (err) { setError(err.message); return }
    setShowAdd(false); setTitle(''); setDesc(''); setDeadline('')
    await loadAssignments()
  }

  async function togglePublish(asg: Assignment) {
    if (!supabase) return
    setBusy(true)
    await supabase.from('assignments').update({ published: !asg.published }).eq('id', asg.id)
    setBusy(false); await loadAssignments()
  }

  async function openGrading(sub: Submission) {
    setGradingSub(sub)
    setScoreInput(sub.score !== null ? String(sub.score) : '')
    setNoteInput(sub.teacher_note || '')
    setPdfUrl(null) // تصفير الرابط السابق
    
    // جلب رابط مؤقت للملف
    if (sub.assignment_files.length > 0 && supabase) {
      const path = sub.assignment_files[0].file_path
      const { data, error } = await supabase.storage.from('course-files').createSignedUrl(path, 3600)
      if (!error && data?.signedUrl) {
        setPdfUrl(data.signedUrl)
      } else {
        setError('تعذّر جلب ملف الـ PDF.')
      }
    }
  }

  async function saveGrade() {
    if (!supabase || !gradingSub) return
    const numScore = Number(scoreInput)
    if (!Number.isFinite(numScore) || numScore < 0 || numScore > 20) {
      setError('الدرجة يجب أن تكون بين 0 و 20.')
      return
    }
    setBusy(true)
    const { error: err } = await supabase.from('assignment_submissions')
      .update({
        status: 'graded',
        score: numScore,
        teacher_note: noteInput.trim() || null,
        graded_at: new Date().toISOString()
      })
      .eq('id', gradingSub.id)
    setBusy(false)
    if (err) { setError(err.message); return }
    setGradingSub(null); setScoreInput(''); setNoteInput(''); setPdfUrl(null)
    if (selectedAsg) await loadSubmissions(selectedAsg.id)
  }

  async function approveRetake(reqId: string) {
    if (!supabase) return
    if (!window.confirm('الموافقة على طلب الإعادة؟ سيتم مسح الدرجة والملفات الحالية للطالب.')) return
    setBusy(true)
    const { error: err } = await supabase.rpc('approve_assignment_retake', { p_request_id: reqId })
    setBusy(false)
    if (err) { setError(err.message); return }
    alert('تمت الموافقة. سيُطلب من الطالب رفع ملف جديد.')
    if (selectedAsg) await loadSubmissions(selectedAsg.id)
  }

  async function rejectRetake(reqId: string) {
    if (!supabase) return
    setBusy(true)
    await supabase.from('assignment_retake_requests').update({ status: 'rejected' }).eq('id', reqId)
    setBusy(false)
    if (selectedAsg) await loadSubmissions(selectedAsg.id)
  }

  if (loading) return <section className={card}><p>جارٍ التحميل...</p></section>

  // عرض التفاصيل
  if (selectedAsg) {
    return (
      <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button className={btnOutline} onClick={() => setSelectedAsg(null)}>← عودة للتكاليف</button>
          <div className="flex flex-wrap gap-2">
            <button className={btnOutline} onClick={() => void togglePublish(selectedAsg)} disabled={busy}>
              {selectedAsg.published ? '🙈 إخفاء' : '📢 نشر'}
            </button>
          </div>
        </div>

        <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
          <h2 className="text-2xl font-bold">{selectedAsg.title}</h2>
          <p className="mt-2 text-white/90">{selectedAsg.description || 'لا يوجد وصف.'}</p>
          <p className="mt-2 text-sm text-white/80">الموعد النهائي: {formatDate(selectedAsg.deadline)}</p>
        </section>

        {error && <p className="rounded-xl bg-error-soft p-3 text-error">{error}</p>}

        {/* طلبات الإعادة المعلقة */}
        {retakeRequests.length > 0 && (
          <section className="rounded-2xl border-2 border-accent bg-accent-soft/30 p-5">
            <h3 className="text-lg font-bold text-primary">📩 طلبات إعادة ({retakeRequests.length})</h3>
            <ul className="mt-3 space-y-3">
              {retakeRequests.map(r => (
                <li key={r.id} className="rounded-xl border border-light-blue bg-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-bold text-ink">{r.profiles?.full_name || 'طالب'}</p>
                      <p className="text-sm text-ink-muted">السبب: {r.reason}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className={btnSuccess} onClick={() => void approveRetake(r.id)}>موافقة</button>
                      <button className={btnDanger} onClick={() => void rejectRetake(r.id)}>رفض</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* جدول التسليمات */}
        <section className={card}>
          <h3 className="mb-4 text-lg font-bold text-primary">تسليمات الطلاب ({submissions.length})</h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-light-blue text-ink-muted">
                <th className="p-3 text-start">الطالب</th>
                <th className="p-3 text-start">الحالة</th>
                <th className="p-3 text-start">تاريخ التسليم</th>
                <th className="p-3 text-start">الدرجة</th>
                <th className="p-3 text-start">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map(s => (
                <tr key={s.id} className="border-b border-light-blue/50 hover:bg-bg">
                  <td className="p-3 font-semibold text-ink">{s.profiles?.full_name}</td>
                  <td className="p-3">
                    {s.status === 'graded' ? <span className="text-secondary font-bold">مصحح</span> : <span className="text-warning font-bold">بانتظار التصحيح</span>}
                  </td>
                  <td className="p-3 text-xs" dir="ltr">{formatDate(s.submitted_at)}</td>
                  <td className="p-3 font-bold">{s.score !== null ? `${s.score} / 20` : '—'}</td>
                  <td className="p-3">
                    <button className={btnOutline} onClick={() => void openGrading(s)}>عرض وتصحيح</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* نافذة التصحيح */}
        {gradingSub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
            <div className="w-full max-w-4xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between border-b border-light-blue p-4">
                <h3 className="text-xl font-bold text-primary">تصحيح — {gradingSub.profiles.full_name}</h3>
                <button className={btnDanger} onClick={() => setGradingSub(null)}>إغلاق</button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 flex gap-4">
                {/* عرض الملف */}
                <div className="w-2/3 bg-bg rounded-xl border border-light-blue flex flex-col">
                  {pdfUrl ? (
                    <>
                      <div className="p-2 bg-white border-b flex justify-between items-center">
                        <span className="text-sm font-bold text-ink">📄 ملف البحث (PDF)</span>
                        <a
                          href={pdfUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-sm font-bold text-primary hover:underline"
                        >
                          ⬇️ تحميل / فتح في نافذة جديدة
                        </a>
                      </div>
                      <iframe src={pdfUrl} className="w-full flex-1 rounded-b-xl min-h-[60vh]" title="PDF" />
                    </>
                  ) : (
                    <div className="flex h-full items-center justify-center text-ink-muted">
                      {gradingSub.assignment_files.length > 0 ? '⏳ جارٍ تحميل الملف...' : 'لا توجد ملفات مرفقة.'}
                    </div>
                  )}
                </div>

                {/* لوحة التقييم */}
                <div className="w-1/3 space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-ink">الدرجة (من 20)</label>
                    <input type="number" min={0} max={20} className={input} value={scoreInput} onChange={e => setScoreInput(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-ink">ملاحظات الأستاذ (ستظهر للطالب)</label>
                    <textarea rows={6} className={input} value={noteInput} onChange={e => setNoteInput(e.target.value)} placeholder="اكتب ملاحظاتك التربوية هنا..." />
                  </div>
                  <div className="rounded-xl bg-warning-soft p-3 text-xs text-ink ring-1 ring-warning">
                    ⚠️ تأكد من فحص البحث يدويًا للتأكد من خلوه من الذكاء الاصطناعي قبل التصحيح.
                  </div>
                  <button className={btnSuccess + ' w-full'} onClick={() => void saveGrade()} disabled={busy}>
                    {busy ? 'جارٍ الحفظ...' : 'حفظ الدرجة وإرسال الإشعار'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // القائمة الرئيسية
  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold">التكاليف والبحوث</h2>
          <p className="mt-1 text-white/85">إدارة تكاليف الفصل، واستلام بحوث الطلاب (PDF).</p>
        </div>
        <button className="rounded-xl bg-white px-5 py-2.5 text-primary font-bold shadow-sm hover:bg-primary-soft" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'إلغاء' : '+ تكليف جديد'}
        </button>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-error">{error}</p>}

      {showAdd && (
        <section className={card}>
          <h3 className="text-lg font-bold text-primary mb-4">إنشاء تكليف جديد</h3>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-semibold">عنوان البحث</label>
              <input className={input} value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold">التعليمات (اختياري)</label>
              <textarea className={input} rows={3} value={desc} onChange={e => setDesc(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold">آخر موعد (اختياري)</label>
              <input type="datetime-local" className={input} value={deadline} onChange={e => setDeadline(e.target.value)} />
            </div>
            <button className={btn} onClick={() => void createAssignment()} disabled={busy}>حفظ التكليف</button>
          </div>
        </section>
      )}

      <section className={card}>
        <h3 className="mb-4 text-lg font-bold text-primary">قائمة التكاليف ({assignments.length})</h3>
        <ul className="space-y-3">
          {assignments.map(a => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-light-blue p-4 hover:shadow-md transition">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-lg font-bold text-ink">{a.title}</h4>
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ${a.published ? 'bg-secondary-soft text-secondary' : 'bg-bg text-ink-muted'}`}>
                    {a.published ? 'منشور' : 'مخفي'}
                  </span>
                </div>
                <p className="text-sm text-ink-muted mt-1">الموعد: {formatDate(a.deadline)}</p>
              </div>
              <div className="flex gap-2">
                <button className={btnOutline} onClick={() => setSelectedAsg(a)}>عرض التسليمات</button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
```

### 📄 `src\features\admin\AttendanceTab.tsx`
```tsx
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import InstitutionalReport, { type InstitutionalSnapshot } from '../shared/InstitutionalReport'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const btnSuccess = 'rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary-hover disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink'

interface Week { id: string; number: number; title: string }
interface Student { id: string; full_name: string; student_no: string | null }
type AttStatus = 'present' | 'absent' | 'excused'
interface AttRow { student_id: string; status: AttStatus }

export default function AttendanceTab() {
  const [weeks, setWeeks] = useState<Week[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [currentWeekId, setCurrentWeekId] = useState<string>('')
  const [marks, setMarks] = useState<Record<string, AttStatus>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // التقرير المؤسسي
  const [instSnapshot, setInstSnapshot] = useState<InstitutionalSnapshot | null>(null)
  const [instFromWeek, setInstFromWeek] = useState(1)
  const [instToWeek, setInstToWeek] = useState(7)
  const [instBusy, setInstBusy] = useState(false)

  const loadBase = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)

    const [wRes, sRes] = await Promise.all([
      supabase.from('weeks').select('id,number,title').order('number'),
      supabase.from('profiles').select('id,full_name,student_no').eq('role', 'student').eq('active', true).order('student_no'),
    ])

    if (wRes.error || sRes.error) {
      setError('تعذّر التحميل.')
      setLoading(false)
      return
    }

    const wList = (wRes.data ?? []) as Week[]
    setWeeks(wList)
    setStudents((sRes.data ?? []) as Student[])
    if (wList.length > 0 && !currentWeekId) setCurrentWeekId(wList[0].id)
    setLoading(false)
  }, [currentWeekId])

  useEffect(() => { void loadBase() }, [loadBase])

  const loadWeek = useCallback(async () => {
    if (!supabase || !currentWeekId) return
    setBusy(true); setError(null); setSuccess(null)
    const { data, error: err } = await supabase
      .from('attendance')
      .select('student_id,status')
      .eq('week_id', currentWeekId)

    if (err) { setError('تعذّر تحميل الحضور.'); setBusy(false); return }

    const m: Record<string, AttStatus> = {}
    for (const r of (data ?? []) as AttRow[]) m[r.student_id] = r.status
    setMarks(m)
    setBusy(false)
  }, [currentWeekId])

  useEffect(() => { void loadWeek() }, [loadWeek])

  async function setStatus(studentId: string, status: AttStatus) {
    if (!supabase || !currentWeekId) return
    const prev = marks[studentId]
    setMarks((m) => ({ ...m, [studentId]: status }))
    setSuccess(null)
    const { error: rpcErr } = await supabase.rpc('mark_attendance', {
      p_student_id: studentId,
      p_week_id: currentWeekId,
      p_status: status,
    })
    if (rpcErr) {
      setError('تعذّر الحفظ: ' + rpcErr.message)
      setMarks((m) => {
        const c = { ...m }
        if (prev) c[studentId] = prev; else delete c[studentId]
        return c
      })
    }
  }

  async function markAllPresent() {
    if (!supabase || !currentWeekId) return
    if (!window.confirm('تحديد الجميع كـ «حاضر» لهذا الأسبوع؟')) return
    setBusy(true); setError(null); setSuccess(null)
    const { error: rpcErr } = await supabase.rpc('mark_all_present', { p_week_id: currentWeekId })
    setBusy(false)
    if (rpcErr) { setError(rpcErr.message); return }
    setSuccess('تم تحديد الجميع كحاضر.')
    await loadWeek()
  }

  async function generateReport() {
    if (!supabase) return
    setError(null)
    setInstBusy(true)
    const { data, error: rpcErr } = await supabase.rpc('institutional_report', {
      p_from_week: instFromWeek,
      p_to_week: instToWeek,
    })
    setInstBusy(false)
    if (rpcErr) { setError('تعذّر إنشاء التقرير: ' + rpcErr.message); return }
    setInstSnapshot(data as InstitutionalSnapshot)
  }

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>

  const currentWeek = weeks.find((w) => w.id === currentWeekId)
  const presentCount = Object.values(marks).filter((s) => s === 'present').length
  const absentCount = Object.values(marks).filter((s) => s === 'absent').length
  const excusedCount = Object.values(marks).filter((s) => s === 'excused').length
  const unmarked = students.length - (presentCount + absentCount + excusedCount)

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold">📋 الحضور والغياب</h2>
            <p className="mt-1 text-base text-white/85">
              سجّل حضور الطلاب لكل أسبوع — حفظ تلقائي.
            </p>
          </div>
          <button
            className="rounded-xl bg-white px-5 py-2.5 text-base font-bold text-primary shadow-md hover:bg-primary-soft disabled:opacity-60"
            onClick={() => void generateReport()}
            disabled={instBusy}
          >
            {instBusy ? '...' : '📊 تقرير الحضور المؤسسي'}
          </button>
        </div>
      </section>

      {/* اختيار المدى للتقرير */}
      <section className={card}>
        <h3 className="text-base font-bold text-primary">📊 إعداد التقرير المؤسسي</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-semibold text-ink">من الأسبوع</label>
            <input type="number" min={1} max={16} className={input} value={instFromWeek} onChange={(e) => setInstFromWeek(parseInt(e.target.value, 10) || 1)} />
          </div>
          <div>
            <label className="text-sm font-semibold text-ink">إلى الأسبوع</label>
            <input type="number" min={1} max={16} className={input} value={instToWeek} onChange={(e) => setInstToWeek(parseInt(e.target.value, 10) || 1)} />
          </div>
          <div className="flex items-end">
            <button className={btn} onClick={() => void generateReport()} disabled={instBusy}>
              {instBusy ? '...' : '📊 إنشاء وعرض'}
            </button>
          </div>
        </div>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-base font-semibold text-error">{error}</p>}
      {success && <p className="rounded-xl bg-secondary-soft p-3 text-base font-semibold text-secondary ring-1 ring-secondary/20">{success}</p>}

      {/* تبويبات الأسابيع */}
      <section className={card}>
        <h3 className="mb-3 text-lg font-bold text-primary">اختر الأسبوع</h3>
        <div className="flex flex-wrap gap-2">
          {weeks.map((w) => {
            const active = w.id === currentWeekId
            return (
              <button
                key={w.id}
                onClick={() => setCurrentWeekId(w.id)}
                className={
                  'rounded-xl border-2 px-4 py-2 text-sm font-bold transition ' +
                  (active
                    ? 'border-primary bg-primary text-white shadow-md'
                    : 'border-light-blue bg-white text-ink-muted hover:border-primary/40 hover:bg-primary-soft')
                }
              >
                الأسبوع {w.number}
              </button>
            )
          })}
        </div>
      </section>

      {/* جدول الحضور */}
      <section className={card}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-xl font-bold text-primary">
              {currentWeek ? `الأسبوع ${currentWeek.number}: ${currentWeek.title}` : 'اختر أسبوعًا'}
            </h3>
            <p className="mt-1 text-sm text-ink-muted">
              {presentCount} حاضر — {absentCount} غائب — {excusedCount} معذور
              {unmarked > 0 && <> — {unmarked} لم يُسجَّل</>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btnSuccess} onClick={() => void markAllPresent()} disabled={busy}>
              ✓ الجميع حاضرون
            </button>
            <button className={btnOutline} onClick={() => void loadWeek()} disabled={busy}>
              🔄 تحديث
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-light-blue">
                <th className="p-3 text-start text-ink-muted">#</th>
                <th className="p-3 text-start text-ink-muted">الطالب</th>
                <th className="p-3 text-start text-ink-muted">الرقم</th>
                <th className="p-3 text-center text-ink-muted">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s, i) => {
                const st = marks[s.id]
                return (
                  <tr key={s.id} className="border-b border-light-blue/50 hover:bg-bg">
                    <td className="p-3">{i + 1}</td>
                    <td className="p-3 text-base font-semibold text-ink">{s.full_name}</td>
                    <td className="p-3 font-mono text-xs text-ink-muted" dir="ltr">{s.student_no ?? '—'}</td>
                    <td className="p-3">
                      <div className="flex flex-wrap justify-center gap-1.5">
                        <StatusButton active={st === 'present'} tone="success" label="حاضر" onClick={() => void setStatus(s.id, 'present')} />
                        <StatusButton active={st === 'absent'} tone="danger" label="غائب" onClick={() => void setStatus(s.id, 'absent')} />
                        <StatusButton active={st === 'excused'} tone="info" label="معذور" onClick={() => void setStatus(s.id, 'excused')} />
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* نافذة التقرير */}
      {instSnapshot && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-2 md:p-6">
          <div className="mx-auto max-w-[900px]">
            <div className="no-print sticky top-0 z-10 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3 shadow-lg">
              <div className="text-base font-bold text-primary">
                📋 تقرير الحضور — الأسابيع {instSnapshot.from_week}–{instSnapshot.to_week}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={btnOutline} onClick={() => window.print()}>
                  🖨️ طباعة / PDF
                </button>
                <button className={btn} onClick={() => setInstSnapshot(null)}>
                  إغلاق
                </button>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
              <InstitutionalReport
                snapshot={instSnapshot}
                generatedAt={instSnapshot.generated_at}
                mode="attendance"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatusButton({ active, tone, label, onClick }: {
  active: boolean
  tone: 'success' | 'danger' | 'info'
  label: string
  onClick: () => void
}) {
  const base = 'rounded-lg border-2 px-3 py-1.5 text-xs font-bold transition min-w-[64px]'
  const styles: Record<string, { on: string; off: string }> = {
    success: {
      on: 'border-secondary bg-secondary text-white shadow-sm',
      off: 'border-secondary/30 bg-white text-secondary hover:bg-secondary-soft',
    },
    danger: {
      on: 'border-error bg-error text-white shadow-sm',
      off: 'border-error/30 bg-white text-error hover:bg-error-soft',
    },
    info: {
      on: 'border-primary bg-primary text-white shadow-sm',
      off: 'border-primary/30 bg-white text-primary hover:bg-primary-soft',
    },
  }
  return (
    <button className={base + ' ' + (active ? styles[tone].on : styles[tone].off)} onClick={onClick}>
      {label}
    </button>
  )
}
```

### 📄 `src\features\admin\GradesTab.tsx`
```tsx
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const btnDanger = 'rounded-xl border border-error bg-white px-5 py-2.5 text-base font-semibold text-error hover:bg-error-soft disabled:opacity-60'
const btnSuccess = 'rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary-hover disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink'

type QType = 'mcq' | 'tf' | 'essay_smart' | 'essay_reasoning'
type WeekFilter = number | 'all'

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

interface WeekInfo { id: string; number: number; title: string }

interface AttemptRow {
  id: string; activity_id: string; student_id: string
  student_name: string; student_no: string | null
  activity_title: string; week_number: number
  auto_score: number; manual_score: number | null
  total_possible: number; status: string; submitted_at: string
}
interface RawAttempt {
  id: string; activity_id: string; student_id: string
  auto_score: number; manual_score: number | null
  status: string; submitted_at: string
}
interface Question { id: string; type: QType; text: string; score: number }
interface Option { id: string; question_id: string; label: string; text: string; position: number }
interface Key { question_id: string; correct_option_id: string | null; correct_tf: boolean | null; model_answer: string | null; grading_criteria: string | null; internal_note: string | null }
interface AQ { activity_id: string; question_id: string; position: number }
interface AnswerRow {
  id: string; question_id: string
  option_id: string | null; text_answer: string | null
  is_correct: boolean | null; awarded_score: number | null
}
interface RetakeRequest {
  id: string; activity_id: string; student_id: string
  attempt_id: string | null; reason: string; created_at: string
  student_name: string; student_no: string | null
  activity_title: string; week_number: number
}

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
  } catch {
    return '—'
  }
}

export default function GradesTab() {
  const [rows, setRows] = useState<AttemptRow[]>([])
  const [retakeRequests, setRetakeRequests] = useState<RetakeRequest[]>([])
  const [weeks, setWeeks] = useState<WeekInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [selectedWeek, setSelectedWeek] = useState<WeekFilter>('all')

  // grading panel
  const [gradingRow, setGradingRow] = useState<AttemptRow | null>(null)
  const [gradingQuestions, setGradingQuestions] = useState<Question[]>([])
  const [gradingOptions, setGradingOptions] = useState<Record<string, Option[]>>({})
  const [gradingKeys, setGradingKeys] = useState<Record<string, Key>>({})
  const [gradingAq, setGradingAq] = useState<AQ[]>([])
  const [gradingAnswers, setGradingAnswers] = useState<Record<string, AnswerRow>>({})
  const [grades, setGrades] = useState<Record<string, string>>({})
  const [open, setOpen] = useState<Record<QType, boolean>>({ mcq: false, tf: false, essay_smart: false, essay_reasoning: false })
  const [busy, setBusy] = useState(false)

  // ⬇️ حالة نافذة التأكيد
  const [showSaveConfirm, setShowSaveConfirm] = useState(false)
  const [saveSummary, setSaveSummary] = useState<{ smartScore: number, smartMax: number, reasoningScore: number, reasoningMax: number, missingGrades: number } | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true); setError(null)

    const [wRes, att, rq] = await Promise.all([
      supabase.from('weeks').select('id,number,title').order('number'),
      // ⬇️ الإصلاح: استبعاد المسودات (draft) تماماً من واجهة الأستاذ
      supabase.from('attempts').select('id,activity_id,student_id,auto_score,manual_score,status,submitted_at').in('status', ['submitted', 'graded']).order('submitted_at', { ascending: false }),
      supabase.from('retake_requests').select('id,activity_id,student_id,attempt_id,reason,created_at,status').eq('status', 'pending').order('created_at', { ascending: true }),
    ])

    if (wRes.error || att.error) { setError('تعذّر تحميل النتائج.'); setLoading(false); return }
    if (rq.error) { setError('تعذّر تحميل طلبات الإعادة.'); setLoading(false); return }

    setWeeks((wRes.data ?? []) as WeekInfo[])

    const attempts = (att.data ?? []) as RawAttempt[]
    const reqs = (rq.data ?? []) as { id: string; activity_id: string; student_id: string; attempt_id: string | null; reason: string; created_at: string }[]

    const studentIds = Array.from(new Set([...attempts.map((a) => a.student_id), ...reqs.map((r) => r.student_id)]))
    const activityIds = Array.from(new Set([...attempts.map((a) => a.activity_id), ...reqs.map((r) => r.activity_id)]))

    const nameMap: Record<string, { name: string; no: string | null }> = {}
    if (studentIds.length > 0) {
      const pr = await supabase.from('profiles').select('id,full_name,student_no').in('id', studentIds)
      for (const p of (pr.data ?? []) as { id: string; full_name: string; student_no: string | null }[]) {
        nameMap[p.id] = { name: p.full_name, no: p.student_no }
      }
    }

    const actMap: Record<string, { title: string; week_id: string }> = {}
    const weekIds = new Set<string>()
    if (activityIds.length > 0) {
      const ac = await supabase.from('activities').select('id,title,week_id').in('id', activityIds)
      for (const a of (ac.data ?? []) as { id: string; title: string; week_id: string }[]) {
        actMap[a.id] = { title: a.title, week_id: a.week_id }
        weekIds.add(a.week_id)
      }
    }

    const weekMap: Record<string, number> = {}
    if (weekIds.size > 0) {
      const wRes2 = await supabase.from('weeks').select('id,number').in('id', Array.from(weekIds))
      for (const w of (wRes2.data ?? []) as { id: string; number: number }[]) weekMap[w.id] = w.number
    }

    const totalByActivity: Record<string, number> = {}
    if (activityIds.length > 0) {
      const aqRes = await supabase.from('activity_questions').select('activity_id,question_id').in('activity_id', activityIds)
      const qIds = Array.from(new Set(((aqRes.data ?? []) as { question_id: string }[]).map((x) => x.question_id)))
      const qRes = qIds.length > 0
        ? await supabase.from('questions').select('id,score').in('id', qIds)
        : { data: [] as { id: string; score: number }[], error: null }
      const scoreMap: Record<string, number> = {}
      for (const q of (qRes.data ?? []) as { id: string; score: number }[]) scoreMap[q.id] = q.score
      for (const link of (aqRes.data ?? []) as { activity_id: string; question_id: string }[]) {
        totalByActivity[link.activity_id] = (totalByActivity[link.activity_id] ?? 0) + (scoreMap[link.question_id] ?? 0)
      }
    }

    const out: AttemptRow[] = attempts.map((a) => {
      const info = nameMap[a.student_id]
      const act = actMap[a.activity_id]
      return {
        id: a.id, activity_id: a.activity_id, student_id: a.student_id,
        student_name: info?.name ?? '—', student_no: info?.no ?? null,
        activity_title: act?.title ?? '—',
        week_number: act ? (weekMap[act.week_id] ?? 0) : 0,
        auto_score: a.auto_score, manual_score: a.manual_score,
        total_possible: totalByActivity[a.activity_id] ?? 0,
        status: a.status, submitted_at: a.submitted_at,
      }
    })
    setRows(out)

    const reqOut: RetakeRequest[] = reqs.map((r) => {
      const info = nameMap[r.student_id]
      const act = actMap[r.activity_id]
      return {
        id: r.id, activity_id: r.activity_id, student_id: r.student_id,
        attempt_id: r.attempt_id, reason: r.reason, created_at: r.created_at,
        student_name: info?.name ?? '—', student_no: info?.no ?? null,
        activity_title: act?.title ?? '—',
        week_number: act ? (weekMap[act.week_id] ?? 0) : 0,
      }
    })
    setRetakeRequests(reqOut)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function approveRetake(id: string) {
    if (!supabase) return
    if (!window.confirm('الموافقة على إعادة الاختبار؟ ستُحذف محاولة الطالب ويبدأ من جديد.')) return
    setBusy(true); setError(null); setSuccess(null)
    const { error: rpcErr } = await supabase.rpc('approve_retake', { p_request_id: id })
    setBusy(false)
    if (rpcErr) { setError('تعذّرت الموافقة: ' + rpcErr.message); return }
    setSuccess('تمت الموافقة على طلب الإعادة.')
    await load()
  }

  async function rejectRetake(id: string) {
    if (!supabase) return
    if (!window.confirm('رفض طلب الإعادة؟')) return
    setBusy(true); setError(null); setSuccess(null)
    const { error: rpcErr } = await supabase.rpc('reject_retake', { p_request_id: id })
    setBusy(false)
    if (rpcErr) { setError('تعذّر الرفض: ' + rpcErr.message); return }
    setSuccess('تم رفض الطلب.')
    await load()
  }

  async function openGrading(row: AttemptRow) {
    if (!supabase) return
    setError(null); setSuccess(null); setBusy(true)
    const [aqRes, qRes, oRes, kRes, anRes] = await Promise.all([
      supabase.from('activity_questions').select('activity_id,question_id,position').eq('activity_id', row.activity_id).order('position'),
      supabase.from('questions').select('id,type,text,score'),
      supabase.from('question_options').select('id,question_id,label,text,position').order('position'),
      supabase.from('question_keys').select('question_id,correct_option_id,correct_tf,model_answer,grading_criteria,internal_note'),
      supabase.from('answers').select('id,question_id,option_id,text_answer,is_correct,awarded_score').eq('attempt_id', row.id),
    ])
    setBusy(false)
    if (aqRes.error || qRes.error || oRes.error || kRes.error || anRes.error) { setError('تعذّر تحميل بيانات التصحيح.'); return }

    const aqList = (aqRes.data ?? []) as AQ[]
    const ids = new Set(aqList.map((x) => x.question_id))
    const qs = ((qRes.data ?? []) as Question[]).filter((q) => ids.has(q.id))
    const om: Record<string, Option[]> = {}
    for (const o of (oRes.data ?? []) as Option[]) if (ids.has(o.question_id)) (om[o.question_id] ??= []).push(o)
    const km: Record<string, Key> = {}
    for (const k of (kRes.data ?? []) as Key[]) if (ids.has(k.question_id)) km[k.question_id] = k
    const am: Record<string, AnswerRow> = {}
    for (const a of (anRes.data ?? []) as AnswerRow[]) am[a.question_id] = a

    const initialGrades: Record<string, string> = {}
    for (const [qid, a] of Object.entries(am)) {
      if (a.awarded_score !== null && a.awarded_score !== undefined) initialGrades[qid] = String(a.awarded_score)
    }

    setGradingRow(row); setGradingAq(aqList); setGradingQuestions(qs)
    setGradingOptions(om); setGradingKeys(km); setGradingAnswers(am); setGrades(initialGrades)
    setOpen({ mcq: false, tf: false, essay_smart: false, essay_reasoning: false })
  }

  // ⬇️ دالة تجهيز الملخص وعرض نافذة التأكيد
  function prepareSaveGrades() {
    if (!gradingRow) return
    let smartScore = 0, smartMax = 0
    let reasoningScore = 0, reasoningMax = 0
    let missingGrades = 0

    for (const q of gradingQuestions) {
      const val = grades[q.id]
      const isAnswered = !!gradingAnswers[q.id]?.text_answer
      const hasGrade = val !== undefined && val.trim() !== ''

      if (q.type === 'essay_smart') {
        smartMax += q.score
        if (hasGrade) smartScore += Number(val)
        else if (isAnswered) missingGrades++
      } else if (q.type === 'essay_reasoning') {
        reasoningMax += q.score
        if (hasGrade) reasoningScore += Number(val)
        else if (isAnswered) missingGrades++
      }
    }

    setSaveSummary({ smartScore, smartMax, reasoningScore, reasoningMax, missingGrades })
    setShowSaveConfirm(true)
  }

  // ⬇️ دالة الحفظ الفعلي (بعد التأكيد)
  async function executeSaveGrades() {
    if (!supabase || !gradingRow) return
    const list: { question_id: string; score: number }[] = []
    for (const [qid, raw] of Object.entries(grades)) {
      const n = Number(raw)
      if (!Number.isFinite(n) || n < 0) continue
      const q = gradingQuestions.find((x) => x.id === qid)
      if (!q) continue
      if (n > q.score) { setError(`الدرجة المدخلة لسؤال تتجاوز الحد (${q.score}).`); setShowSaveConfirm(false); return }
      list.push({ question_id: qid, score: n })
    }
    setBusy(true); setError(null); setShowSaveConfirm(false)
    const { error: rpcErr } = await supabase.rpc('grade_attempt', { p_attempt_id: gradingRow.id, p_grades: list })
    setBusy(false)
    if (rpcErr) { setError(rpcErr.message); return }
    setSuccess('تم حفظ الدرجات بنجاح.')
    setGradingRow(null); setGradingAnswers({}); setGrades({})
    await load()
  }

  async function resetAttempt() {
    if (!supabase || !gradingRow) return

    const { data: activeReports } = await supabase
      .from('weekly_reports')
      .select('id,report_number,from_week_number,to_week_number')
      .eq('student_id', gradingRow.student_id)
      .eq('status', 'active')
      .lte('from_week_number', gradingRow.week_number)
      .gte('to_week_number', gradingRow.week_number)

    let msg = `إعادة تعيين محاولة ${gradingRow.student_name}؟\n\nسيُحذف كل ما أجاب عنه في هذا النشاط.`
    if (activeReports && activeReports.length > 0) {
      const reps = activeReports.map(r =>
        r.report_number ? `• ${r.report_number}` : `• تقرير ${r.from_week_number}–${r.to_week_number}`
      ).join('\n')
      msg += `\n\n⚠️ سيتم إلغاء التقارير المعتمدة الآتية تلقائيًا:\n${reps}\n\nهل أنت متأكد؟`
    }

    if (!window.confirm(msg)) return

    setBusy(true); setError(null); setSuccess(null)
    const { data, error: rpcErr } = await supabase.rpc('reset_attempt', { p_attempt_id: gradingRow.id })
    setBusy(false)
    if (rpcErr) { setError('تعذّر إعادة التعيين: ' + rpcErr.message); return }
    const info = data as { deleted?: number; revoked_reports?: number } | null
    if (!info || info.deleted === 0) { setError('لم يُحذف شيء.'); return }
    const revoked = info.revoked_reports ?? 0
    setSuccess(revoked > 0
      ? `تمت إعادة التعيين + إلغاء ${revoked} تقرير معتمد.`
      : 'تمت إعادة التعيين بنجاح.')
    setGradingRow(null); setGradingAnswers({}); setGrades({})
    await load()
  }

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>

  // تصفية
  const filtered = rows.filter((r) => {
    if (selectedWeek !== 'all' && r.week_number !== selectedWeek) return false
    if (query.trim() && !r.student_name.includes(query) && !(r.student_no ?? '').includes(query)) return false
    return true
  })

  // إحصاءات الأسبوع المحدد
  const statRows = selectedWeek === 'all' ? rows : rows.filter((r) => r.week_number === selectedWeek)
  const totalAttempts = statRows.length
  const gradedCount = statRows.filter((r) => r.status === 'graded').length
  const gradedPercents = statRows
    .filter((r) => r.status === 'graded' && r.total_possible > 0)
    .map((r) => Math.min(100, Math.round(((r.auto_score + (r.manual_score ?? 0)) / r.total_possible) * 100)))
  const avgPercent = gradedPercents.length === 0 ? 0 : Math.round(gradedPercents.reduce((s, x) => s + x, 0) / gradedPercents.length)
  const topPercent = gradedPercents.length === 0 ? 0 : Math.max(...gradedPercents)

  const sortedAq = [...gradingAq].sort((a, b) => a.position - b.position)
  const grouped: Record<QType, AQ[]> = { mcq: [], tf: [], essay_smart: [], essay_reasoning: [] }
  for (const link of sortedAq) {
    const q = gradingQuestions.find((x) => x.id === link.question_id)
    if (q) grouped[q.type].push(link)
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">الدرجات</h2>
        <p className="mt-1 text-base text-white/85">نتائج الطلاب موزّعة حسب الأسبوع.</p>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-base font-semibold text-error">{error}</p>}
      {success && <p className="rounded-xl bg-secondary-soft p-3 text-base font-semibold text-secondary ring-1 ring-secondary/20">{success}</p>}

      {/* طلبات الإعادة */}
      {retakeRequests.length > 0 && (
        <section className="rounded-2xl border-2 border-accent bg-gradient-to-l from-accent-soft/40 to-white p-5 shadow-sm">
          <h3 className="text-xl font-bold text-primary">
            📩 طلبات إعادة الاختبار ({retakeRequests.length})
          </h3>
          <p className="mt-1 text-sm text-ink-muted">الموافقة تحذف محاولة الطالب فيبدأ من جديد.</p>
          <ul className="mt-4 space-y-3">
            {retakeRequests.map((r) => (
              <li key={r.id} className="rounded-xl border border-light-blue bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-ink">{r.student_name}</span>
                      {r.student_no && (
                        <span className="rounded bg-bg px-2 py-0.5 font-mono text-xs text-ink-muted" dir="ltr">{r.student_no}</span>
                      )}
                      <span className="rounded-lg bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                        الأسبوع {r.week_number}
                      </span>
                      <span className="text-xs text-ink-muted">{timeAgo(r.created_at)}</span>
                    </div>
                    <div className="mt-2 whitespace-pre-wrap rounded-lg bg-accent-soft/30 p-3 text-sm leading-7 text-ink">
                      <b className="text-primary">السبب: </b>{r.reason}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button className={btnSuccess} onClick={() => void approveRetake(r.id)} disabled={busy}>موافقة</button>
                    <button className={btnDanger + ' !py-2 !text-sm'} onClick={() => void rejectRetake(r.id)} disabled={busy}>رفض</button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* تبويبات الأسابيع */}
      <section className={card}>
        <h3 className="mb-3 text-lg font-bold text-primary">📅 فلترة حسب الأسبوع</h3>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedWeek('all')}
            className={
              'rounded-xl border-2 px-4 py-2 text-sm font-bold transition ' +
              (selectedWeek === 'all'
                ? 'border-primary bg-primary text-white shadow-md'
                : 'border-light-blue bg-white text-ink-muted hover:border-primary/40 hover:bg-primary-soft')
            }
          >
            الكل ({rows.length})
          </button>
          {weeks.map((w) => {
            const count = rows.filter((r) => r.week_number === w.number).length
            const active = selectedWeek === w.number
            const hasAttempts = count > 0
            return (
              <button
                key={w.id}
                onClick={() => setSelectedWeek(w.number)}
                disabled={!hasAttempts}
                className={
                  'rounded-xl border-2 px-4 py-2 text-sm font-bold transition ' +
                  (active
                    ? 'border-primary bg-primary text-white shadow-md'
                    : hasAttempts
                      ? 'border-light-blue bg-white text-ink-muted hover:border-primary/40 hover:bg-primary-soft'
                      : 'cursor-not-allowed border-ink/10 bg-bg text-ink/30')
                }
              >
                الأسبوع {w.number} ({count})
              </button>
            )
          })}
        </div>
      </section>

      {/* ملخص الأسبوع المحدد */}
      <section className={card}>
        <h3 className="mb-3 text-lg font-bold text-primary">
          📊 ملخص {selectedWeek === 'all' ? 'الإجمالي' : `الأسبوع ${selectedWeek}`}
        </h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="عدد المؤدّين" value={String(totalAttempts)} tone="primary" />
          <StatCard label="مصحّح" value={`${gradedCount} / ${totalAttempts}`} tone="success" />
          <StatCard label="متوسط النسبة" value={`${avgPercent}%`} tone={avgPercent >= 70 ? 'success' : avgPercent >= 50 ? 'info' : 'error'} />
          <StatCard label="أعلى نسبة" value={`${topPercent}%`} tone="success" />
        </div>
      </section>

      {/* جدول الطلاب */}
      <section className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-primary">
            👥 طلاب {selectedWeek === 'all' ? 'جميع الأسابيع' : `الأسبوع ${selectedWeek}`}
          </h3>
          <div className="flex flex-wrap gap-2">
            <input
              className={input + ' mt-0 w-56'}
              placeholder="ابحث باسم الطالب أو رقمه..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className={btnOutline} onClick={() => void load()}>🔄 تحديث</button>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-4 rounded-xl bg-bg p-6 text-center text-base text-ink-muted">
            {selectedWeek === 'all' ? 'لا نتائج بعد.' : `لا محاولات في الأسبوع ${selectedWeek} بعد.`}
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-blue text-ink-muted">
                  <th className="p-3 text-start">#</th>
                  <th className="p-3 text-start">الطالب</th>
                  <th className="p-3 text-start">الرقم</th>
                  {selectedWeek === 'all' && <th className="p-3 text-start">الأسبوع</th>}
                  <th className="p-3 text-start">تاريخ الاختبار</th>
                  <th className="p-3 text-start">المجموع</th>
                  <th className="p-3 text-start">الحالة</th>
                  <th className="p-3 text-start">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const rawTotal = r.auto_score + (r.manual_score ?? 0)
                  const cappedTotal = Math.min(rawTotal, r.total_possible)
                  const overflow = rawTotal > r.total_possible
                  return (
                    <tr key={r.id} className="border-b border-light-blue/50 hover:bg-bg">
                      <td className="p-3">{i + 1}</td>
                      <td className="p-3 text-base font-semibold text-ink">{r.student_name}</td>
                      <td className="p-3 font-mono text-xs text-ink-muted" dir="ltr">{r.student_no ?? '—'}</td>
                      {selectedWeek === 'all' && (
                        <td className="p-3">
                          <span className="rounded-lg bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">
                            أ{r.week_number}
                          </span>
                        </td>
                      )}
                      <td className="p-3 text-sm font-semibold text-ink-muted">
                        <span dir="ltr">{formatTestDate(r.submitted_at)}</span>
                      </td>
                      <td className="p-3 text-lg font-bold text-secondary">
                        {cappedTotal.toFixed(1)} / {r.total_possible}
                        {overflow && <span className="ms-2 text-xs text-error">⚠</span>}
                      </td>
                      <td className="p-3">
                        {r.status === 'graded' ? (
                          <span className="rounded-lg bg-secondary-soft px-2 py-0.5 text-xs font-semibold text-secondary ring-1 ring-secondary/20">مصحح</span>
                        ) : (
                          <span className="rounded-lg bg-warning-soft px-2 py-0.5 text-xs font-semibold text-ink ring-1 ring-warning">بانتظار التصحيح</span>
                        )}
                      </td>
                      <td className="p-3">
                        <button className={btnOutline} onClick={() => void openGrading(r)} disabled={busy}>تصحيح</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* لوحة التصحيح */}
      {gradingRow && (
        <section className={card}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-2xl font-bold text-primary">تصحيح — {gradingRow.student_name}</h3>
              <p className="mt-1 text-sm text-ink-muted">
                <span className="rounded-lg bg-primary-soft px-2 py-0.5 font-bold text-primary">
                  الأسبوع {gradingRow.week_number}
                </span>
                {' '}— {gradingRow.activity_title} — الرقم {gradingRow.student_no ?? '—'}
              </p>
            </div>
            <button className={btnOutline} onClick={() => { setGradingRow(null); setGradingAnswers({}); setGrades({}) }}>إغلاق</button>
          </div>

          <div className="space-y-4">
            {TYPE_ORDER.map((t) => {
              const items = grouped[t]
              if (items.length === 0) return null
              const isOpen = open[t]
              const style = TYPE_STYLE[t]
              const groupScore = items.reduce((s, link) => {
                const q = gradingQuestions.find((x) => x.id === link.question_id)
                return s + (q?.score ?? 0)
              }, 0)
              return (
                <section key={t} className={`overflow-hidden rounded-2xl border border-light-blue border-s-4 bg-white shadow-sm ${style.headerBg}`}>
                  <button className="flex w-full items-center justify-between gap-4 bg-white px-5 py-4 text-start hover:bg-primary-soft" onClick={() => setOpen({ ...open, [t]: !isOpen })}>
                    <div className="flex items-center gap-4">
                      <span className={`rounded-xl border px-4 py-1.5 text-lg font-bold ${style.badgeBg}`}>{TYPE_LABEL[t]}</span>
                      <span className={`text-base font-semibold ${style.headerText}`}>{items.length} سؤال — {groupScore} درجة</span>
                    </div>
                    <span className={`text-2xl ${style.headerText} transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                  </button>

                  {isOpen && (
                    <ul className="space-y-4 border-t border-light-blue bg-bg p-4">
                      {items.map((link, i) => {
                        const q = gradingQuestions.find((x) => x.id === link.question_id)
                        if (!q) return null
                        const qOpts = gradingOptions[q.id] ?? []
                        const k = gradingKeys[q.id]
                        const ans = gradingAnswers[q.id]
                        const answered = !!ans
                        const chosen = qOpts.find((o) => o.id === ans?.option_id)
                        const correctOpt = qOpts.find((o) => o.id === k?.correct_option_id)
                        const isEssay = q.type.startsWith('essay')

                        return (
                          <li key={q.id} className="rounded-xl border border-light-blue bg-white p-4">
                            <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                              <span className={`rounded-lg border px-2 py-0.5 font-semibold ${style.badgeBg}`}>س{i + 1}</span>
                              <span className="rounded-lg bg-primary-soft px-2 py-0.5 font-semibold text-primary">{q.score} درجة</span>
                              {!answered && <span className="rounded-lg bg-error-soft px-2 py-0.5 font-semibold text-error ring-1 ring-error/20">لم يجب</span>}
                            </div>

                            <div className="mt-3 whitespace-pre-wrap text-lg font-semibold leading-8 text-ink">{q.text}</div>

                            {q.type === 'mcq' && (
                              <div className="mt-3 space-y-2 text-sm">
                                {answered ? (
                                  <>
                                    <div className="rounded-lg bg-bg p-2">
                                      <b className="text-ink-muted">إجابة الطالب: </b>
                                      <span className={ans?.is_correct ? 'font-semibold text-secondary' : 'font-semibold text-error'}>
                                        {chosen ? `${chosen.label}) ${chosen.text}` : '—'}
                                        {ans?.is_correct ? ' ✓' : ' ✗'}
                                      </span>
                                    </div>
                                    <div className="rounded-lg bg-secondary-soft p-2 text-secondary">
                                      <b>الإجابة الصحيحة: </b>{correctOpt ? `${correctOpt.label}) ${correctOpt.text}` : '—'}
                                    </div>
                                  </>
                                ) : <p className="rounded-lg bg-error-soft p-2 text-error">الطالب لم يجب عن هذا السؤال.</p>}
                              </div>
                            )}

                            {q.type === 'tf' && (
                              <div className="mt-3 space-y-2 text-sm">
                                {answered ? (
                                  <>
                                    <div className="rounded-lg bg-bg p-2">
                                      <b className="text-ink-muted">إجابة الطالب: </b>
                                      <span className={ans?.is_correct ? 'font-semibold text-secondary' : 'font-semibold text-error'}>
                                        {ans?.text_answer === 'true' ? 'صح ✓' : ans?.text_answer === 'false' ? 'خطأ ✗' : '—'}
                                      </span>
                                    </div>
                                    <div className="rounded-lg bg-secondary-soft p-2 text-secondary">
                                      <b>الإجابة الصحيحة: </b>{k?.correct_tf ? 'صح' : 'خطأ'}
                                    </div>
                                  </>
                                ) : <p className="rounded-lg bg-error-soft p-2 text-error">الطالب لم يجب عن هذا السؤال.</p>}
                              </div>
                            )}

                            {isEssay && (
                              answered ? (
                                <>
                                  <div className="mt-3 whitespace-pre-wrap rounded-lg bg-bg p-3 text-sm leading-7 text-ink">
                                    <b className="text-ink-muted">إجابة الطالب:</b><br />
                                    {ans?.text_answer || <span className="text-ink-muted">— لم يجب —</span>}
                                  </div>
                                  {k?.model_answer && (
                                    <div className="mt-2 whitespace-pre-wrap rounded-lg bg-primary-soft p-3 text-sm leading-7 text-ink">
                                      <b className="text-primary">الإجابة النموذجية: </b>{k.model_answer}
                                    </div>
                                  )}
                                  {k?.grading_criteria && (
                                    <div className="mt-2 whitespace-pre-wrap rounded-lg bg-accent-soft/30 p-3 text-sm leading-7 text-ink">
                                      <b className="text-primary">معايير التصحيح: </b>{k.grading_criteria}
                                    </div>
                                  )}
                                  <div className="mt-3 flex items-center gap-3">
                                    <label className="text-sm font-semibold text-ink">الدرجة (من {q.score}):</label>
                                    <input 
                                      type="number" 
                                      min={0} 
                                      max={q.score} 
                                      step={0.25} 
                                      className={input + ' mt-0 w-32'} 
                                      value={grades[q.id] ?? ''} 
                                      onChange={(e) => setGrades({ ...grades, [q.id]: e.target.value })} 
                                      onWheel={(e) => e.currentTarget.blur()}
                                    />
                                  </div>
                                </>
                              ) : <p className="mt-3 rounded-lg bg-error-soft p-2 text-sm text-error">الطالب لم يجب عن هذا السؤال.</p>
                            )}
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              )
            })}
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button className={btn} onClick={prepareSaveGrades} disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ الدرجات'}</button>
            <button className={btnDanger} onClick={() => void resetAttempt()} disabled={busy}>إعادة تعيين</button>
            <button className={btnOutline} onClick={() => { setGradingRow(null); setGradingAnswers({}); setGrades({}) }} disabled={busy}>إلغاء</button>
          </div>
        </section>
      )}

      {/* ⬇️ نافذة تأكيد الحفظ */}
      {showSaveConfirm && saveSummary && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-center">
            <h3 className="text-xl font-bold text-primary mb-4">تأكيد حفظ درجات المقالي</h3>
            
            <div className="space-y-3 text-start text-sm">
              <div className="rounded-xl border border-light-blue bg-bg p-3 flex justify-between items-center">
                <span className="font-semibold text-ink">درجة المقالي الذكي:</span>
                <span className="font-bold text-secondary text-lg">{saveSummary.smartScore} / {saveSummary.smartMax}</span>
              </div>
              <div className="rounded-xl border border-light-blue bg-bg p-3 flex justify-between items-center">
                <span className="font-semibold text-ink">درجة الاستدلال:</span>
                <span className="font-bold text-secondary text-lg">{saveSummary.reasoningScore} / {saveSummary.reasoningMax}</span>
              </div>
            </div>

            {saveSummary.missingGrades > 0 && (
              <div className="mt-4 rounded-xl bg-error-soft p-3 text-sm font-semibold text-error ring-1 ring-error/20">
                ⚠️ تنبيه: هناك {saveSummary.missingGrades} سؤالاً مقالياً أجاب عنه الطالب ولم تضع له درجة! (سيُحسب صفراً إن أكملت).
              </div>
            )}

            <div className="mt-6 flex gap-2 justify-center">
              <button className={btn} onClick={() => void executeSaveGrades()}>نعم، حفظ الدرجات</button>
              <button className={btnOutline} onClick={() => setShowSaveConfirm(false)}>مراجعة</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ label, value, tone }: { label: string; value: string; tone: 'primary' | 'success' | 'info' | 'error' }) {
  const tones: Record<string, { bg: string; text: string; border: string }> = {
    primary: { bg: 'bg-primary-soft', text: 'text-primary', border: 'border-s-primary' },
    success: { bg: 'bg-secondary-soft', text: 'text-secondary', border: 'border-s-secondary' },
    info:    { bg: 'bg-accent-soft/40', text: 'text-primary', border: 'border-s-accent' },
    error:   { bg: 'bg-error-soft', text: 'text-error', border: 'border-s-error' },
  }
  const t = tones[tone]
  return (
    <div className={`rounded-2xl border border-light-blue border-s-4 ${t.bg} p-4 shadow-sm ${t.border}`}>
      <div className="text-xs font-semibold text-ink-muted">{label}</div>
      <div className={`mt-1 text-2xl font-bold ${t.text}`}>{value}</div>
    </div>
  )
}
```

### 📄 `src\features\admin\HomeTab.tsx`
```tsx
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const th = 'p-3 text-start text-ink-muted'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'

interface Stats {
  students: number
  weeks: number
  lessons: number
  materials: number
  questions: number
  attempts: number
  pendingEssays: number
}

interface PendingRow {
  answer_id: string
  question_text: string
  question_score: number
  student_name: string
  student_no: string | null
  activity_title: string
  week_number: number
  attempt_id: string
  submitted_at: string
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime()
  const diff = (Date.now() - d) / 1000
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`
  return new Date(iso).toLocaleDateString('ar-SA')
}

export default function HomeTab() {
  const [stats, setStats] = useState<Stats>({
    students: 0, weeks: 0, lessons: 0, materials: 0,
    questions: 0, attempts: 0, pendingEssays: 0,
  })
  const [pending, setPending] = useState<PendingRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)

    const [
      stRes, wkRes, lsRes, msRes, qRes, atRes,
    ] = await Promise.all([
      supabase.from('profiles').select('id').eq('role', 'student').eq('active', true),
      supabase.from('weeks').select('id'),
      supabase.from('lessons').select('id'),
      supabase.from('materials').select('id'),
      supabase.from('questions').select('id'),
      supabase.from('attempts').select('id'),
    ])

    // المقالي بانتظار التصحيح
    const anRes = await supabase
      .from('answers')
      .select('id, question_id, attempt_id, text_answer, awarded_score, questions(type, text, score), attempts(submitted_at, student_id, activity_id, profiles(full_name, student_no), activities(title, week_id, weeks(number)))')
      .is('awarded_score', null)
      .not('text_answer', 'is', null)

    if (stRes.error || wkRes.error || lsRes.error || msRes.error || qRes.error || atRes.error) {
      setError('تعذّر تحميل البيانات.')
      setLoading(false)
      return
    }

    let pendingList: PendingRow[] = []
    if (!anRes.error && anRes.data) {
      type AnyRec = Record<string, unknown>
      const rows = anRes.data as unknown as AnyRec[]
      pendingList = rows
        .filter((r) => {
          const q = r.questions as AnyRec | null
          const t = q?.type as string | undefined
          return t === 'essay_smart' || t === 'essay_reasoning'
        })
        .map((r) => {
          const q = (r.questions ?? {}) as AnyRec
          const at = (r.attempts ?? {}) as AnyRec
          const prof = (at.profiles ?? {}) as AnyRec
          const act = (at.activities ?? {}) as AnyRec
          const wk = (act.weeks ?? {}) as AnyRec
          return {
            answer_id: r.id as string,
            question_text: (q.text as string) ?? '—',
            question_score: (q.score as number) ?? 0,
            student_name: (prof.full_name as string) ?? '—',
            student_no: (prof.student_no as string | null) ?? null,
            activity_title: (act.title as string) ?? '—',
            week_number: (wk.number as number) ?? 0,
            attempt_id: r.attempt_id as string,
            submitted_at: (at.submitted_at as string) ?? '',
          }
        })
        .slice(0, 15)
    }

    setStats({
      students: ((stRes.data ?? []) as unknown[]).length,
      weeks: ((wkRes.data ?? []) as unknown[]).length,
      lessons: ((lsRes.data ?? []) as unknown[]).length,
      materials: ((msRes.data ?? []) as unknown[]).length,
      questions: ((qRes.data ?? []) as unknown[]).length,
      attempts: ((atRes.data ?? []) as unknown[]).length,
      pendingEssays: pendingList.length,
    })
    setPending(pendingList)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const cards = [
    { n: stats.students, label: 'طلاب مسجلون', tone: 'text-primary' },
    { n: stats.weeks, label: 'أسابيع', tone: 'text-primary' },
    { n: stats.lessons, label: 'دروس', tone: 'text-primary' },
    { n: stats.materials, label: 'مواد', tone: 'text-primary' },
    { n: stats.questions, label: 'أسئلة', tone: 'text-primary' },
    { n: stats.attempts, label: 'محاولات', tone: 'text-primary' },
    { n: stats.pendingEssays, label: 'بانتظار التصحيح', tone: stats.pendingEssays > 0 ? 'text-error' : 'text-secondary' },
  ]

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">الرئيسة</h2>
        <p className="mt-1 text-base text-white/85">
          نظرة سريعة على حالة المقرر وما يحتاج انتباهك اليوم.
        </p>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-sm font-semibold text-error">{error}</p>}

      {/* بطاقات الإحصاء */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        {cards.map((s) => (
          <div key={s.label} className="rounded-2xl border border-light-blue bg-white p-4 shadow-sm">
            <div className={`text-3xl font-bold ${s.tone}`}>{s.n}</div>
            <div className="mt-1 text-xs text-ink-muted">{s.label}</div>
          </div>
        ))}
      </div>

      {/* بانتظار المراجعة */}
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-bold text-primary">
            📝 بانتظار تصحيحك ({pending.length})
          </h3>
          <button className={btnOutline} onClick={() => void load()}>تحديث</button>
        </div>

        {pending.length === 0 ? (
          <p className="mt-4 rounded-xl bg-secondary-soft p-6 text-center text-base font-semibold text-secondary ring-1 ring-secondary/20">
            ✅ لا توجد إجابات مقالية بانتظار التصحيح حاليًا.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm text-ink-muted">
              اضغط «تصحيح» للانتقال إلى تبويب الدرجات وفتح المحاولة.
            </p>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-light-blue">
                    <th className={th}>الطالب</th>
                    <th className={th}>الرقم</th>
                    <th className={th}>الأسبوع</th>
                    <th className={th}>النشاط</th>
                    <th className={th}>السؤال</th>
                    <th className={th}>الدرجة</th>
                    <th className={th}>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {pending.map((p) => (
                    <tr key={p.answer_id} className="border-b border-light-blue/50 align-top hover:bg-bg">
                      <td className="p-3 text-base font-semibold text-ink">{p.student_name}</td>
                      <td className="p-3 font-mono text-xs text-ink-muted" dir="ltr">{p.student_no ?? '—'}</td>
                      <td className="p-3">الأسبوع {p.week_number}</td>
                      <td className="p-3">{p.activity_title}</td>
                      <td className="p-3 max-w-md">
                        <div className="line-clamp-2 text-ink">{p.question_text}</div>
                      </td>
                      <td className="p-3 font-semibold text-primary">{p.question_score}</td>
                      <td className="p-3 text-xs text-ink-muted">{p.submitted_at ? timeAgo(p.submitted_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {/* توجيهات سريعة */}
      <section className={card}>
        <h3 className="text-lg font-bold text-primary">🔗 إجراءات سريعة</h3>
        <p className="mt-1 text-sm text-ink-muted">
          لتصحيح الإجابات المقالية، انتقل إلى تبويب «الدرجات» ثم اضغط «تصحيح» بجانب أي طالب.
        </p>
      </section>
    </div>
  )
}
```

### 📄 `src\features\admin\MaterialsTab.tsx`
```tsx
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Kind = 'document' | 'slides' | 'link'

interface Material {
  id: string
  week_id: string
  lesson_id: string | null
  title: string
  kind: Kind
  view_path: string | null
  download_path: string | null
  url: string | null
  position: number
  published: boolean
}

interface WeekOption {
  id: string
  number: number
  title: string
}

const BUCKET = 'course-files'
const MAX_BYTES = 50 * 1024 * 1024
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const card = 'rounded-2xl border border-light-blue bg-white p-4'
const btn =
  'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60'
const btnOutline =
  'rounded-xl border border-primary bg-white px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-surface disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue p-2 text-ink'
const label = 'text-sm font-semibold'

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : 'bin'
}

function isPdf(mime: string): boolean {
  return mime === 'application/pdf'
}

function kindLabel(k: Kind): string {
  if (k === 'slides') return 'عرض تقديمي'
  if (k === 'document') return 'مستند'
  return 'رابط'
}

export default function MaterialsTab({ weekId: lockedWeekId }: { weekId?: string } = {}) {
  const [weeks, setWeeks] = useState<WeekOption[]>([])
  const [selectedWeekId, setSelectedWeekId] = useState<string>(lockedWeekId ?? '')
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<Kind>('document')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [fileInputKey, setFileInputKey] = useState(0)

  const effectiveWeekId = lockedWeekId ?? selectedWeekId

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)

    const needWeeks = !lockedWeekId
    const [wRes, mRes] = await Promise.all([
      needWeeks
        ? supabase.from('weeks').select('id,number,title').order('number')
        : Promise.resolve({ data: [] as WeekOption[], error: null }),
      effectiveWeekId
        ? supabase
            .from('materials')
            .select(
              'id,week_id,lesson_id,title,kind,view_path,download_path,url,position,published',
            )
            .eq('week_id', effectiveWeekId)
            .order('position')
        : Promise.resolve({ data: [] as Material[], error: null }),
    ])

    if (wRes.error || mRes.error) {
      setError('تعذّر تحميل المواد.')
    } else {
      setError(null)
      if (needWeeks) setWeeks((wRes.data ?? []) as WeekOption[])
      setMaterials((mRes.data ?? []) as Material[])
    }
    setLoading(false)
  }, [lockedWeekId, effectiveWeekId])

  useEffect(() => {
    void load()
  }, [load])

  function resetForm() {
    setTitle('')
    setKind('document')
    setFile(null)
    setUrl('')
    setFileInputKey((k) => k + 1)
    setShowAdd(false)
  }

  function nextPosition(): number {
    if (materials.length === 0) return 1
    return Math.max(...materials.map((m) => m.position)) + 1
  }

  function pickFile(f: File | null) {
    setError(null)
    if (!f) {
      setFile(null)
      return
    }
    if (!ALLOWED_MIME.has(f.type)) {
      setError('نوع الملف غير مسموح. المسموح: PDF, PPT, PPTX, DOC, DOCX.')
      setFile(null)
      setFileInputKey((k) => k + 1)
      return
    }
    if (f.size > MAX_BYTES) {
      setError('الحجم الأقصى 50 MB.')
      setFile(null)
      setFileInputKey((k) => k + 1)
      return
    }
    setFile(f)
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  async function addMaterial() {
    if (!supabase) return
    if (!effectiveWeekId) {
      setError('اختر أسبوعًا أولًا.')
      return
    }
    if (!title.trim()) {
      setError('العنوان مطلوب.')
      return
    }

    setBusy(true)
    setError(null)

    try {
      if (kind === 'link') {
        const trimmed = url.trim()
        if (!/^https:\/\//i.test(trimmed)) {
          setError('الرابط يجب أن يبدأ بـ https://')
          return
        }
        const { error: err } = await supabase.from('materials').insert({
          week_id: effectiveWeekId,
          lesson_id: null,
          title: title.trim(),
          kind: 'link',
          url: trimmed,
          view_path: null,
          download_path: null,
          position: nextPosition(),
          published: false,
        })
        if (err) {
          setError('تعذّر إدخال الرابط: ' + err.message)
          return
        }
        resetForm()
        await load()
        return
      }

      if (!file) {
        setError('اختر ملفًا.')
        return
      }

      const uuid = crypto.randomUUID()
      const ext = extOf(file.name)
      const path = `weeks/${effectiveWeekId}/${uuid}.${ext}`

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })

      if (upErr) {
        setError('فشل رفع الملف: ' + upErr.message)
        return
      }

      const viewable = isPdf(file.type)
      const { error: insErr } = await supabase.from('materials').insert({
        week_id: effectiveWeekId,
        lesson_id: null,
        title: title.trim(),
        kind,
        url: null,
        view_path: viewable ? path : null,
        download_path: path,
        position: nextPosition(),
        published: false,
      })

      if (insErr) {
        await supabase.storage.from(BUCKET).remove([path])
        setError('فشل إدخال المادة: ' + insErr.message)
        return
      }

      resetForm()
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function togglePublish(m: Material) {
    if (!supabase) return
    setBusy(true)
    setError(null)
    const { error: err } = await supabase
      .from('materials')
      .update({ published: !m.published })
      .eq('id', m.id)
    setBusy(false)
    if (err) setError(err.message)
    else await load()
  }

  async function removeMaterial(m: Material) {
    if (!supabase) return
    if (!window.confirm('حذف هذه المادة؟')) return
    setBusy(true)
    setError(null)

    const { error: delErr } = await supabase.from('materials').delete().eq('id', m.id)
    if (delErr) {
      setError('تعذّر الحذف: ' + delErr.message)
      setBusy(false)
      return
    }

    const paths: string[] = []
    if (m.view_path) paths.push(m.view_path)
    if (m.download_path && m.download_path !== m.view_path) paths.push(m.download_path)
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths)

    setBusy(false)
    await load()
  }

  async function openMaterial(m: Material) {
    if (!supabase) return
    if (m.kind === 'link' && m.url) {
      window.open(m.url, '_blank', 'noreferrer')
      return
    }
    const path = m.view_path ?? m.download_path
    if (!path) {
      setError('لا يوجد مسار للملف.')
      return
    }
    const { data, error: err } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600)
    if (err || !data) {
      setError('تعذّر إنشاء رابط: ' + (err?.message ?? 'unknown'))
      return
    }
    window.open(data.signedUrl, '_blank', 'noreferrer')
  }

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-primary">المواد</h2>
          <div className="flex flex-wrap items-center gap-2">
            {!lockedWeekId && (
              <select
                className="rounded-xl border border-light-blue bg-white p-2 text-sm"
                value={selectedWeekId}
                onChange={(e) => setSelectedWeekId(e.target.value)}
              >
                <option value="">— اختر أسبوعًا —</option>
                {weeks.map((w) => (
                  <option key={w.id} value={w.id}>
                    الأسبوع {w.number}: {w.title}
                  </option>
                ))}
              </select>
            )}
            <button
              className={btn}
              onClick={() => setShowAdd((v) => !v)}
              disabled={!effectiveWeekId}
            >
              + إضافة مادة
            </button>
          </div>
        </div>

        {showAdd && effectiveWeekId && (
          <div className="mt-4 space-y-3 rounded-xl border border-light-blue p-4">
            <div>
              <label className={label}>النوع</label>
              <select
                className={input}
                value={kind}
                onChange={(e) => setKind(e.target.value as Kind)}
              >
                <option value="document">مستند (PDF / Word)</option>
                <option value="slides">عرض تقديمي (PowerPoint)</option>
                <option value="link">رابط خارجي (https)</option>
              </select>
            </div>

            {kind !== 'link' ? (
              <div>
                <label className={label}>الملف</label>
                <input
                  key={fileInputKey}
                  type="file"
                  className={input}
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
                <p className="mt-1 text-xs text-ink/60">PDF, DOC, DOCX, PPT, PPTX — حتى 50 MB.</p>
              </div>
            ) : (
              <div>
                <label className={label}>الرابط</label>
                <input
                  className={input}
                  dir="ltr"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className={label}>العنوان</label>
              <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="flex flex-wrap gap-2">
              <button className={btn} onClick={addMaterial} disabled={busy}>
                {busy ? 'جارٍ الحفظ...' : 'حفظ'}
              </button>
              <button className={btnOutline} onClick={resetForm} disabled={busy}>
                إلغاء
              </button>
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-sm font-semibold text-error">{error}</p>}
      </section>

      <section className={card}>
        {loading ? (
          <p className="text-ink/70">جارٍ التحميل...</p>
        ) : !effectiveWeekId ? (
          <p className="text-ink/70">اختر أسبوعًا لعرض مواده.</p>
        ) : materials.length === 0 ? (
          <p className="text-ink/70">لا مواد لهذا الأسبوع بعد.</p>
        ) : (
          <ul className="space-y-2">
            {materials.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-light-blue p-3"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-ink">
                    {m.position}. {m.title}
                  </div>
                  <div className="mt-1 text-xs text-ink/60">
                    <span className="rounded bg-surface px-2 py-0.5">{kindLabel(m.kind)}</span>
                    {m.url && (
                      <span className="ms-2" dir="ltr">
                        {m.url}
                      </span>
                    )}
                    <span className="ms-2">{m.published ? 'منشور' : 'مخفي'}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className={btnOutline} onClick={() => void openMaterial(m)} disabled={busy}>
                    فتح
                  </button>
                  <button className={btnOutline} onClick={() => void togglePublish(m)} disabled={busy}>
                    {m.published ? 'إخفاء' : 'نشر'}
                  </button>
                  <button className={btnOutline} onClick={() => void removeMaterial(m)} disabled={busy}>
                    حذف
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
```

### 📄 `src\features\admin\PostsTab.tsx`
```tsx
export { default } from '../student/FeedTab'
```

### 📄 `src\features\admin\QuestionsTab.tsx`
```tsx
import { useState } from 'react'
import DemoBadge from '../../components/DemoBadge'
import Tag from '../../components/Tag'
import { btn, btnOutline, card, field, th } from '../../components/ui'
import {
  demoQuestions, demoTopics, gradingLabel, qTypeLabel,
  type DemoQuestion, type Grading, type QType,
} from '../../demo/data'

export default function QuestionsTab() {
  const [items, setItems] = useState<DemoQuestion[]>(demoQuestions)
  const [topicFilter, setTopicFilter] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [text, setText] = useState('')
  const [type, setType] = useState<QType>('mcq')
  const [topicId, setTopicId] = useState(demoTopics[0].id)
  const [grading, setGrading] = useState<Grading>('auto')
  const [optionsText, setOptionsText] = useState('')
  const [answer, setAnswer] = useState('')

  const topicName = (id: string) => demoTopics.find((t) => t.id === id)?.name ?? ''
  const shown = topicFilter === 'all' ? items : items.filter((q) => q.topicId === topicFilter)

  function add() {
    if (!text.trim()) return
    const options = type === 'mcq' ? optionsText.split('\n').map((s) => s.trim()).filter(Boolean) : undefined
    setItems([...items, { id: 'q' + Date.now(), text: text.trim(), type, topicId, grading, options, answer: answer.trim() || undefined }])
    setText('')
    setOptionsText('')
    setAnswer('')
    setShowAdd(false)
  }

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-primary">بنك الأسئلة</h2>
            <DemoBadge />
          </div>
          <div className="flex items-center gap-2">
            <select className="rounded-xl border border-light-blue bg-white p-2 text-sm" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
              <option value="all">كل المواضيع</option>
              {demoTopics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button className={btn} onClick={() => setShowAdd((v) => !v)}>+ سؤال</button>
          </div>
        </div>

        {showAdd && (
          <div className="mt-4 space-y-3 rounded-xl border border-light-blue p-4">
            <div>
              <label className="text-sm font-semibold" htmlFor="qt">نص السؤال</label>
              <textarea id="qt" rows={3} className={field} value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="text-sm font-semibold" htmlFor="qy">نوع السؤال</label>
                <select id="qy" className={field} value={type} onChange={(e) => setType(e.target.value as QType)}>
                  {(Object.keys(qTypeLabel) as QType[]).map((k) => <option key={k} value={k}>{qTypeLabel[k]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold" htmlFor="qp">الموضوع</label>
                <select id="qp" className={field} value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                  {demoTopics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold" htmlFor="qg">التصحيح</label>
                <select id="qg" className={field} value={grading} onChange={(e) => setGrading(e.target.value as Grading)}>
                  {(Object.keys(gradingLabel) as Grading[]).map((k) => <option key={k} value={k}>{gradingLabel[k]}</option>)}
                </select>
              </div>
            </div>
            {type === 'mcq' && (
              <div>
                <label className="text-sm font-semibold" htmlFor="qo">الخيارات (خيار في كل سطر)</label>
                <textarea id="qo" rows={3} className={field} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
              </div>
            )}
            {type !== 'essay' && (
              <div>
                <label className="text-sm font-semibold" htmlFor="qa">الإجابة الصحيحة</label>
                <input id="qa" className={field} value={answer} onChange={(e) => setAnswer(e.target.value)} />
                <p className="mt-1 text-xs text-ink/60">في النسخة الحقيقية تُحفظ في جدول مفاتيح منفصل لا يقرؤه الطالب.</p>
              </div>
            )}
            <button className={btn} onClick={add}>حفظ السؤال (تجريبي)</button>
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-light-blue text-ink/70">
                <th className={th}>السؤال</th>
                <th className={th}>النوع</th>
                <th className={th}>الموضوع</th>
                <th className={th}>التصحيح</th>
                <th className={th}>تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((q) => (
                <tr key={q.id} className="border-b border-light-blue/50 align-top">
                  <td className="p-2">
                    {q.text}
                    {openId === q.id && (
                      <div className="mt-2 rounded-xl bg-surface p-3 text-xs text-ink/80">
                        {q.options && q.options.length > 0 && (
                          <ul className="list-disc ps-5">
                            {q.options.map((o) => <li key={o}>{o}</li>)}
                          </ul>
                        )}
                        <p className="mt-1">الإجابة الصحيحة: {q.answer ?? 'تُراجع يدويًا'}</p>
                      </div>
                    )}
                  </td>
                  <td className="p-2">{qTypeLabel[q.type]}</td>
                  <td className="p-2">{topicName(q.topicId)}</td>
                  <td className="p-2"><Tag tone={q.grading === 'auto' ? 'ok' : 'wait'}>{gradingLabel[q.grading]}</Tag></td>
                  <td className="p-2">
                    <button className={btnOutline} onClick={() => setOpenId(openId === q.id ? null : q.id)}>
                      {openId === q.id ? 'إخفاء' : 'عرض'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

```

### 📄 `src\features\admin\QuizSetsTab.tsx`
```tsx
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-hover active:bg-primary-active focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary-soft active:bg-accent-soft/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60'
const btnDanger = 'rounded-xl border border-error bg-white px-4 py-2 text-sm font-semibold text-error transition hover:bg-error-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-error/40 disabled:cursor-not-allowed disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent/40'
const label = 'text-base font-semibold text-primary'

type QType = 'mcq' | 'tf' | 'essay_smart' | 'essay_reasoning'
type View = 'questions' | 'results'

interface Activity {
  id: string
  week_id: string
  title: string
  open: boolean
  release: string
  published_at: string | null
  randomize_questions?: boolean // ⬅️ السطر الجديد
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
    const an = await supabase
      .from('answers')
      .select('id,question_id,option_id,text_answer,is_correct,awarded_score')
      .eq('attempt_id', attemptId)
    setBusy(false)
    if (an.error) { setError(an.error.message); return }
    const rows = (an.data ?? []) as AnswerRow[]
    setGradingAnswers(rows)
    const g: Record<string, string> = {}
    for (const r of rows) if (r.awarded_score !== null) g[r.question_id] = String(r.awarded_score)
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
  const selWeek = selAct ? weeks.find((w) => w.id === selAct.week_id) : null
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
          {selAct && (
            <div className="flex flex-wrap gap-2">
              <button
                className={(selAct.open
                  ? 'bg-white text-primary hover:bg-primary-soft'
                  : 'bg-white/15 hover:bg-white/25 text-white ring-1 ring-white/30') + ' rounded-xl px-5 py-2.5 text-base font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent'}
                onClick={() => void toggleActivity()}
                disabled={busy}
                title="يسمح للطلاب برؤية النشاط والاختبار فيه أو يمنعهم"
              >
                {selAct.open ? '🔓 مفتوح للطلاب (إغلاق)' : '🔒 مغلق للطلاب (فتح)'}
              </button>
              <button
                className={(selAct.published_at
                  ? 'bg-secondary text-white hover:bg-secondary-hover ring-1 ring-white/40'
                  : 'bg-warning text-ink hover:bg-warning/80') + ' rounded-xl px-5 py-2.5 text-base font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60'}
                onClick={() => void publishActivity()}
                disabled={busy}
                title="يُظهر أوائل هذا الأسبوع في صدارة المنصة"
              >
                {selAct.published_at ? '⭐ منشور في الصدارة (إلغاء)' : '📢 نشر في الصدارة'}
              </button>
              <button
                className={(selAct.randomize_questions
                  ? 'bg-accent text-white hover:bg-accent/80 ring-1 ring-white/40'
                  : 'bg-white/15 text-white hover:bg-white/25') + ' rounded-xl px-5 py-2.5 text-base font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60'}
                onClick={() => void toggleRandomize()}
                disabled={busy}
                title="تفعيل نظام سحب 30 سؤال عشوائي من أصل 60"
              >
                {selAct.randomize_questions ? '🎲 نظام عشوائي (مفعل)' : '🎲 نظام عشوائي (معطل)'}
              </button>
            </div>
          )}
        </div>

        {activities.length > 0 && (
          <>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <select
                className="rounded-xl border border-white/30 bg-white/10 p-3 text-base font-semibold text-white backdrop-blur focus:outline-none focus:ring-2 focus:ring-accent"
                value={selectedId}
                onChange={(e) => setSelectedId(e.target.value)}
              >
                {activities.map((a) => {
                  const w = weeks.find((x) => x.id === a.week_id)
                  const flags = `${a.published_at ? '⭐ (صدارة) ' : ''}${a.open ? '🔓 (متاح) ' : '🔒 (مغلق) '}${a.randomize_questions ? '🎲 (عشوائي) ' : ''}`
                  return <option key={a.id} value={a.id} className="text-ink">{flags} - الأسبوع {w?.number ?? '?'}: {a.title}</option>
                })}
              </select>

              <div className="inline-flex rounded-xl bg-white/15 p-1 ring-1 ring-white/20">
                <button
                  className={(view === 'questions' ? 'bg-white text-primary shadow-sm' : 'text-white') + ' rounded-lg px-4 py-1.5 text-sm font-semibold transition'}
                  onClick={() => setView('questions')}
                >الأسئلة</button>
                <button
                  className={(view === 'results' ? 'bg-white text-primary shadow-sm' : 'text-white') + ' rounded-lg px-4 py-1.5 text-sm font-semibold transition'}
                  onClick={() => setView('results')}
                >النتائج</button>
              </div>

              {view === 'questions' && (
                <button
                  className="ms-auto rounded-xl bg-white px-5 py-2.5 text-base font-semibold text-primary shadow-sm transition hover:bg-primary-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
                  onClick={startAdd}
                  disabled={busy}
                >
                  + سؤال جديد
                </button>
              )}

              {view === 'results' && (
                <button
                  className="ms-auto rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/25 disabled:opacity-60"
                  onClick={() => void loadAttempts()}
                  disabled={busy}
                >
                  تحديث
                </button>
              )}
            </div>

            {view === 'questions' && (
              <div className="mt-5">
                <div className="flex justify-between text-sm text-white/85">
                  <span>تنوع الأسئلة</span>
                  <span>{answeredTypes} من {TYPE_ORDER.length} أنواع — {questions.length} سؤالًا</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/20">
                  <div className="h-full rounded-full bg-gradient-to-l from-accent to-accent-soft transition-all" style={{ width: progressPercent + '%' }} />
                </div>
              </div>
            )}
          </>
        )}

        {error && <p className="mt-4 rounded-xl bg-error-soft p-3 text-base font-semibold text-error">{error}</p>}

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
                  <section key={t} className={`overflow-hidden rounded-2xl border border-light-blue border-s-4 bg-white shadow-sm transition hover:shadow-md ${style.headerBg}`}>
                    <button
                      className="flex w-full items-center justify-between gap-4 bg-white px-5 py-4 text-start transition hover:bg-primary-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
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
                        {items.length === 0 && (
                          <li className="rounded-xl bg-white p-4 text-center text-base text-ink-muted">لا أسئلة من هذا النوع.</li>
                        )}
                        {items.map((link, i) => {
                          const q = questions.find((x) => x.id === link.question_id)
                          if (!q) return null
                          const qOpts = options[q.id] ?? []
                          const k = keys[q.id]
                          return (
                            <li key={q.id} className="rounded-xl border border-light-blue bg-white p-4 shadow-sm">
                              <div className="flex flex-wrap items-start justify-between gap-3">
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                                    <span className={`rounded-lg border px-2 py-0.5 font-semibold ${style.badgeBg}`}>{i + 1}</span>
                                    <span className="rounded-lg bg-primary-soft px-2 py-0.5 font-semibold text-primary">{q.score} درجة</span>
                                    {k?.internal_note && (
                                      <span className="rounded-lg bg-warning-soft px-2 py-0.5 font-semibold text-ink ring-1 ring-warning">⚠ يحتاج مراجعة</span>
                                    )}
                                  </div>
                                  <div className="mt-3 whitespace-pre-wrap text-lg font-semibold leading-8 text-ink">{q.text}</div>
                                  {q.type === 'mcq' && (
                                    <ul className="mt-3 space-y-2 text-base">
                                      {qOpts.map((o) => {
                                        const isCorrect = o.id === k?.correct_option_id
                                        return (
                                          <li key={o.id} className={'flex items-center gap-3 rounded-lg border p-2 ' + (isCorrect ? 'border-secondary/40 bg-secondary-soft font-semibold text-secondary' : 'border-light-blue bg-white text-ink')}>
                                            <span className="w-8 text-center font-bold">{o.label}</span>
                                            <span>{o.text}</span>
                                            {isCorrect && <span className="ms-auto pe-2 text-lg">✓</span>}
                                          </li>
                                        )
                                      })}
                                    </ul>
                                  )}
                                  {q.type === 'tf' && (
                                    <div className="mt-3 text-lg">الإجابة: <b className={k?.correct_tf ? 'text-secondary' : 'text-error'}>{k?.correct_tf ? 'صح ✓' : 'خطأ ✗'}</b></div>
                                  )}
                                  {q.type.startsWith('essay') && k?.model_answer && (
                                    <div className="mt-3 whitespace-pre-wrap rounded-lg border border-light-blue bg-primary-soft p-3 text-base text-ink">
                                      <b className="text-primary">الإجابة النموذجية: </b>{k.model_answer}
                                    </div>
                                  )}
                                  {k?.internal_note && (
                                    <div className="mt-3 rounded-lg bg-warning-soft p-2 text-sm text-ink ring-1 ring-warning"><b>ملاحظة: </b>{k.internal_note}</div>
                                  )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                  <button className={btnOutline} onClick={() => void move(q.id, -1, items)} disabled={busy || i === 0} title="أعلى">▲</button>
                                  <button className={btnOutline} onClick={() => void move(q.id, 1, items)} disabled={busy || i === items.length - 1} title="أسفل">▼</button>
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
                )
              })}
            </div>
          )}
        </>
      )}

      {view === 'results' && selAct && (
        <>
          <section className={card}>
            <h3 className="text-xl font-bold text-primary">
              نتائج الطلاب — {selWeek ? `الأسبوع ${selWeek.number}` : ''}
            </h3>
            <p className="mt-1 text-sm text-ink-muted">{selAct.title}</p>

            {attempts.length === 0 ? (
              <p className="mt-4 rounded-xl bg-bg p-4 text-center text-base text-ink-muted">لا محاولات بعد لهذا النشاط.</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-light-blue text-ink-muted">
                      <th className="p-3 text-start">#</th>
                      <th className="p-3 text-start">اسم الطالب</th>
                      <th className="p-3 text-start">آلية</th>
                      <th className="p-3 text-start">يدوية</th>
                      <th className="p-3 text-start">المجموع</th>
                      <th className="p-3 text-start">الحالة</th>
                      <th className="p-3 text-start">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attempts.map((a, i) => (
                      <tr key={a.id} className="border-b border-light-blue/50 hover:bg-bg">
                        <td className="p-3">{i + 1}</td>
                        <td className="p-3 text-base font-semibold text-ink">{a.student_name}</td>
                        <td className="p-3 font-semibold text-primary">{a.auto_score}</td>
                        <td className="p-3">{a.manual_score ?? '—'}</td>
                        <td className="p-3 text-lg font-bold text-secondary">{(a.auto_score + (a.manual_score ?? 0)).toFixed(1)}</td>
                        <td className="p-3">
                          {a.status === 'graded' ? (
                            <span className="rounded-lg bg-secondary-soft px-2 py-0.5 text-xs font-semibold text-secondary ring-1 ring-secondary/20">مصحح</span>
                          ) : (
                            <span className="rounded-lg bg-warning-soft px-2 py-0.5 text-xs font-semibold text-ink ring-1 ring-warning">بانتظار التصحيح</span>
                          )}
                        </td>
                        <td className="p-3">
                          <button className={btnOutline} onClick={() => void openGrading(a.id)} disabled={busy}>عرض وتصحيح</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {gradingAttemptId && (
            <section className={card}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-xl font-bold text-primary">تصحيح المحاولة</h3>
                <button className={btnOutline} onClick={() => { setGradingAttemptId(null); setGradingAnswers([]); setGrades({}) }}>إغلاق</button>
              </div>

              <ul className="space-y-3">
                {gradingAnswers.map((ans, i) => {
                  const q = questions.find((x) => x.id === ans.question_id)
                  if (!q) return null
                  const qOpts = options[q.id] ?? []
                  const chosen = qOpts.find((o) => o.id === ans.option_id)
                  const isEssay = q.type.startsWith('essay')
                  const style = TYPE_STYLE[q.type]
                  return (
                    <li key={ans.id} className="rounded-xl border border-light-blue bg-white p-4">
                      <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
                        <span className={`rounded-lg border px-2 py-0.5 font-semibold ${style.badgeBg}`}>س{i + 1}</span>
                        <span className="rounded-lg bg-primary-soft px-2 py-0.5 font-semibold text-primary">{q.score} درجة</span>
                        <span className="text-xs">{TYPE_LABEL[q.type]}</span>
                      </div>
                      <div className="mt-2 whitespace-pre-wrap text-base font-semibold text-ink">{q.text}</div>

                      {q.type === 'mcq' && (
                        <div className="mt-2 text-sm">
                          اختار: <b>{chosen ? `${chosen.label}) ${chosen.text}` : '—'}</b>
                          {' — '}
                          {ans.is_correct ? <span className="font-semibold text-secondary">✓ صحيح</span> : <span className="font-semibold text-error">✗ خطأ</span>}
                        </div>
                      )}
                      {q.type === 'tf' && (
                        <div className="mt-2 text-sm">
                          أجاب: <b>{ans.text_answer === 'true' ? 'صح' : ans.text_answer === 'false' ? 'خطأ' : '—'}</b>
                          {' — '}
                          {ans.is_correct ? <span className="font-semibold text-secondary">✓ صحيح</span> : <span className="font-semibold text-error">✗ خطأ</span>}
                        </div>
                      )}
                      {isEssay && (
                        <>
                          <div className="mt-2 whitespace-pre-wrap rounded-lg bg-bg p-3 text-sm leading-7 text-ink">
                            <b className="text-ink-muted">إجابة الطالب:</b><br />
                            {ans.text_answer || <span className="text-ink-muted">— لم يجب —</span>}
                          </div>
                          {keys[ans.question_id]?.model_answer && (
                            <div className="mt-2 whitespace-pre-wrap rounded-lg bg-primary-soft p-3 text-sm leading-7 text-ink">
                              <b className="text-primary">الإجابة النموذجية: </b>{keys[ans.question_id]?.model_answer}
                            </div>
                          )}
                          <div className="mt-3 flex items-center gap-3">
                            <label className="text-sm font-semibold text-ink">الدرجة (من {q.score}):</label>
                            <input
                              type="number"
                              min={0}
                              max={q.score}
                              step={0.5}
                              className={input + ' mt-0 w-24'}
                              value={grades[ans.question_id] ?? ''}
                              onChange={(e) => setGrades({ ...grades, [ans.question_id]: e.target.value })}
                            />
                          </div>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>

              <div className="mt-4 flex flex-wrap gap-2">
                <button className={btn} onClick={() => void saveGrades()} disabled={busy}>
                  {busy ? 'جارٍ الحفظ...' : 'حفظ الدرجات'}
                </button>
                <button className={btnOutline} onClick={() => { setGradingAttemptId(null); setGradingAnswers([]); setGrades({}) }} disabled={busy}>إلغاء</button>
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
    <section className={card}>
      <h3 className="text-2xl font-bold text-primary">{editing ? 'تحرير السؤال' : 'سؤال جديد'}</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
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
      <div className="mt-4">
        <label className={label}>نص السؤال</label>
        <textarea rows={4} className={input} value={draft.text} onChange={(e) => setDraft({ ...draft, text: e.target.value })} />
      </div>

      {draft.type === 'mcq' && (
        <div className="mt-4 space-y-2">
          <div className={label}>الخيارات (اختر الصحيح)</div>
          {draft.options.map((o, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-light-blue bg-bg p-2">
              <input type="radio" name="correct" checked={o.isCorrect} onChange={() => setCorrect(i)} className="h-5 w-5 accent-secondary" />
              <span className="w-8 text-center text-lg font-bold text-primary">{o.label}</span>
              <input className={input + ' mt-0 flex-1'} value={o.text} onChange={(e) => setOptionText(i, e.target.value)} />
            </div>
          ))}
        </div>
      )}

      {draft.type === 'tf' && (
        <div className="mt-4">
          <label className={label}>الإجابة الصحيحة</label>
          <div className="mt-2 flex gap-6 text-lg">
            <label className="flex items-center gap-2"><input type="radio" name="tf" checked={draft.correctTf} onChange={() => setDraft({ ...draft, correctTf: true })} className="h-5 w-5 accent-secondary" /> صح</label>
            <label className="flex items-center gap-2"><input type="radio" name="tf" checked={!draft.correctTf} onChange={() => setDraft({ ...draft, correctTf: false })} className="h-5 w-5 accent-secondary" /> خطأ</label>
          </div>
        </div>
      )}

      {draft.type.startsWith('essay') && (
        <>
          <div className="mt-4">
            <label className={label}>الإجابة النموذجية (اختياري — للأستاذ فقط)</label>
            <textarea rows={4} className={input} value={draft.modelAnswer} onChange={(e) => setDraft({ ...draft, modelAnswer: e.target.value })} />
          </div>
          <div className="mt-4">
            <label className={label}>معايير التصحيح (اختياري)</label>
            <textarea rows={3} className={input} value={draft.gradingCriteria} onChange={(e) => setDraft({ ...draft, gradingCriteria: e.target.value })} />
          </div>
        </>
      )}

      <div className="mt-4">
        <label className={label}>ملاحظة داخلية (اختياري)</label>
        <input className={input} value={draft.internalNote} onChange={(e) => setDraft({ ...draft, internalNote: e.target.value })} />
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <button className={btn} onClick={onSave} disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ'}</button>
        <button className={btnOutline} onClick={onCancel} disabled={busy}>إلغاء</button>
      </div>
    </section>
  )
}
```

### 📄 `src\features\admin\ReportsTab.tsx`
```tsx
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import WeeklyReport, { type ReportSnapshot } from '../shared/WeeklyReport'
import InstitutionalReport, { type InstitutionalSnapshot } from '../shared/InstitutionalReport'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-base font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const btnDanger = 'rounded-xl border border-error bg-white px-4 py-2 text-sm font-semibold text-error hover:bg-error-soft disabled:opacity-60'
const btnSuccess = 'rounded-xl bg-secondary px-5 py-2.5 text-base font-semibold text-white shadow-sm hover:bg-secondary-hover disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink'
const th = 'p-3 text-start text-ink-muted'

interface Student { id: string; full_name: string; student_no: string | null }
interface Week { id: string; number: number; title: string }
interface Activity { id: string; title: string; week_id: string }
interface AttemptRaw {
  id: string; activity_id: string; student_id: string
  auto_score: number; manual_score: number | null
  status: string; submitted_at: string
}
interface ExistingReport {
  id: string; student_id: string
  from_week_number: number; to_week_number: number
  type: string; report_number: string | null
  approved_at: string; status: string
  teacher_note: string | null; seen_at: string | null
  snapshot: ReportSnapshot
}

interface StudentAttemptRow {
  week_number: number; week_title: string
  activity_id: string | null; activity_title: string | null
  total_possible: number; has_attempt: boolean
  auto_score: number; manual_score: number; final_score: number
  percent: number; status: string | null; submitted_at: string | null
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`
  return new Date(iso).toLocaleDateString('ar-SA-u-nu-latn')
}

export default function ReportsTab() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const [students, setStudents] = useState<Student[]>([])
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState<string>('')

  const [weeks, setWeeks] = useState<Week[]>([])
  const [activities, setActivities] = useState<Activity[]>([])
  const [attempts, setAttempts] = useState<AttemptRaw[]>([])
  const [totalsByActivity, setTotalsByActivity] = useState<Record<string, number>>({})

  const [fromWeek, setFromWeek] = useState<number>(1)
  const [toWeek, setToWeek] = useState<number>(1)
  const [teacherNote, setTeacherNote] = useState('')

  const [reports, setReports] = useState<ExistingReport[]>([])
  const [busy, setBusy] = useState(false)

  // التقرير المؤسسي
  const [instSnapshot, setInstSnapshot] = useState<InstitutionalSnapshot | null>(null)
  const [instFromWeek, setInstFromWeek] = useState(1)
  const [instToWeek, setInstToWeek] = useState(7)
  const [instBusy, setInstBusy] = useState(false)

  // معاينة: 'new' للإنشاء، أو report ID للعرض
  const [preview, setPreview] = useState<{
    snapshot: ReportSnapshot
    reportNumber: string | null
    approvedAt: string
    teacherNote: string | null
    mode: 'new' | 'existing'
    reportId?: string
  } | null>(null)

  const loadBaseData = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)

    const [stRes, wkRes, acRes, atRes] = await Promise.all([
      supabase.from('profiles').select('id,full_name,student_no').eq('role', 'student').order('student_no', { ascending: true }),
      supabase.from('weeks').select('id,number,title').order('number'),
      supabase.from('activities').select('id,title,week_id'),
      supabase.from('attempts').select('id,activity_id,student_id,auto_score,manual_score,status,submitted_at'),
    ])

    if (stRes.error || wkRes.error || acRes.error || atRes.error) {
      setError('تعذّر تحميل البيانات.')
      setLoading(false); return
    }

    const stList = (stRes.data ?? []) as Student[]
    setStudents(stList)
    if (stList.length > 0) setSelectedId((prev) => prev || stList[0].id)

    const wkList = (wkRes.data ?? []) as Week[]
    setWeeks(wkList)
    setActivities((acRes.data ?? []) as Activity[])
    setAttempts((atRes.data ?? []) as AttemptRaw[])

    const maxWeek = wkList.length > 0 ? Math.max(...wkList.map((w) => w.number)) : 1
    setToWeek(maxWeek)

    const actIds = ((acRes.data ?? []) as Activity[]).map((a) => a.id)
    const totals: Record<string, number> = {}
    if (actIds.length > 0) {
      const aqRes = await supabase.from('activity_questions').select('activity_id,question_id').in('activity_id', actIds)
      const qIds = Array.from(new Set(((aqRes.data ?? []) as { question_id: string }[]).map((x) => x.question_id)))
      const qRes = qIds.length > 0
        ? await supabase.from('questions').select('id,score').in('id', qIds)
        : { data: [] as { id: string; score: number }[], error: null }
      const scoreMap: Record<string, number> = {}
      for (const q of (qRes.data ?? []) as { id: string; score: number }[]) scoreMap[q.id] = q.score
      for (const link of (aqRes.data ?? []) as { activity_id: string; question_id: string }[]) {
        totals[link.activity_id] = (totals[link.activity_id] ?? 0) + (scoreMap[link.question_id] ?? 0)
      }
    }
    setTotalsByActivity(totals)
    setLoading(false)
  }, [])

  useEffect(() => { void loadBaseData() }, [loadBaseData])

  const loadReports = useCallback(async () => {
    if (!supabase || !selectedId) return
    const { data, error: err } = await supabase
      .from('weekly_reports')
      .select('id,student_id,from_week_number,to_week_number,type,report_number,approved_at,status,teacher_note,seen_at,snapshot')
      .eq('student_id', selectedId)
      .order('approved_at', { ascending: false })
    if (err) return
    setReports((data ?? []) as ExistingReport[])
  }, [selectedId])

  useEffect(() => { void loadReports() }, [loadReports])

  function buildStudentRows(studentId: string): StudentAttemptRow[] {
    const rows: StudentAttemptRow[] = []
    for (const w of weeks) {
      const act = activities.find((a) => a.week_id === w.id)
      const total = act ? (totalsByActivity[act.id] ?? 0) : 0
      const attempt = act ? attempts.find((t) => t.activity_id === act.id && t.student_id === studentId) : null
      const auto = attempt?.auto_score ?? 0
      const manual = attempt?.manual_score ?? 0
      const final = auto + manual
      const percent = total > 0 ? Math.round((final / total) * 100) : 0
      rows.push({
        week_number: w.number, week_title: w.title,
        activity_id: act?.id ?? null, activity_title: act?.title ?? null,
        total_possible: total, has_attempt: !!attempt,
        auto_score: auto, manual_score: manual, final_score: final,
        percent, status: attempt?.status ?? null,
        submitted_at: attempt?.submitted_at ?? null,
      })
    }
    return rows
  }

  /** يبني snapshot محليًا للمعاينة (نفس ما سيبني RPC) */
  function buildPreviewSnapshot(studentId: string, from: number, to: number): ReportSnapshot {
    const student = students.find((s) => s.id === studentId)!
    const rows = buildStudentRows(studentId).filter((r) => r.week_number >= from && r.week_number <= to)

    let sumTotal = 0
    let sumScore = 0
    const weekEntries = rows.map((r) => {
      // حساب متوسط المجموعة وأعلى نتيجة لنفس النشاط
      let classCount = 0
      let classAvg = 0
      let classTop = 0
      let rank: number | null = null

      if (r.activity_id) {
        const classAttempts = attempts.filter(
          (a) => a.activity_id === r.activity_id && a.status === 'graded'
        )
        classCount = classAttempts.length
        if (classCount > 0) {
          const finals = classAttempts.map((a) => a.auto_score + (a.manual_score ?? 0))
          classAvg = Math.round((finals.reduce((s, x) => s + x, 0) / classCount) * 10) / 10
          classTop = Math.max(...finals)
          if (r.status === 'graded') {
            rank = finals.filter((x) => x > r.final_score).length + 1
          }
        }
      }

      // ⬇️ الإصلاح: نضيف المقام دائماً، والدرجة فقط عند التصحيح
      sumTotal += r.total_possible
      if (r.has_attempt && r.status === 'graded') {
        sumScore += r.final_score
      }

      return {
        number: r.week_number,
        title: r.week_title,
        total_possible: r.total_possible,
        has_attempt: r.has_attempt,
        auto_score: r.auto_score,
        manual_score: r.manual_score,
        final_score: r.final_score,
        percent: r.percent,
        status: r.status ?? undefined,
        submitted_at: r.submitted_at,
        rank,
        class_count: classCount,
        class_avg: classAvg,
        class_top: classTop,
      }
    })

    const percent = sumTotal > 0 ? Math.round((sumScore / sumTotal) * 100) : 0

    return {
      student: {
        id: student.id,
        full_name: student.full_name,
        student_no: student.student_no ?? '—',
      },
      from_week: from,
      to_week: to,
      type: from === to ? 'weekly' : 'cumulative',
      weeks: weekEntries,
      totals: { total_possible: sumTotal, student_total: sumScore, percent },
      generated_at: new Date().toISOString(),
    }
  }

  function openPreview() {
    if (!selectedId) { setError('اختر طالبًا أولًا.'); return }
    if (fromWeek > toWeek) { setError('المدى غير صحيح.'); return }
    setError(null)
    const snapshot = buildPreviewSnapshot(selectedId, fromWeek, toWeek)
    setPreview({
      snapshot,
      reportNumber: null,
      approvedAt: new Date().toISOString(),
      teacherNote: teacherNote.trim() || null,
      mode: 'new',
    })
  }

  function openExistingReport(r: ExistingReport) {
    setPreview({
      snapshot: r.snapshot,
      reportNumber: r.report_number,
      approvedAt: r.approved_at,
      teacherNote: r.teacher_note,
      mode: 'existing',
      reportId: r.id,
    })
  }

  async function confirmApprove() {
    if (!supabase || !selectedId || !preview) return
    if (preview.mode !== 'new') return

    setBusy(true); setError(null)
    const { error: rpcErr } = await supabase.rpc('approve_weekly_report', {
      p_student_id: selectedId,
      p_from_week: preview.snapshot.from_week,
      p_to_week: preview.snapshot.to_week,
      p_teacher_note: teacherNote.trim() || null,
    })
    setBusy(false)

    if (rpcErr) { setError('فشل الإصدار: ' + rpcErr.message); return }
    setSuccess('✓ تم إصدار التقرير وإرساله للطالب.')
    setPreview(null)
    setTeacherNote('')
    await loadReports()
  }

  async function revokeReport(reportId: string, reportNumber: string | null) {
    if (!supabase) return
    const reason = window.prompt(
      `إلغاء التقرير ${reportNumber ?? ''}؟\n\nاكتب سبب الإلغاء (اختياري):`, ''
    )
    if (reason === null) return

    setBusy(true); setError(null); setSuccess(null)
    const { error: rpcErr } = await supabase.rpc('revoke_report', {
      p_report_id: reportId,
      p_reason: reason.trim() || null,
    })
    setBusy(false)
    if (rpcErr) { setError('فشل الإلغاء: ' + rpcErr.message); return }
    setSuccess('تم إلغاء التقرير.')
    await loadReports()
  }

  async function generateInstitutional() {
    if (!supabase) return
    setError(null)
    setInstBusy(true)
    const { data, error: rpcErr } = await supabase.rpc('institutional_report', {
      p_from_week: instFromWeek,
      p_to_week: instToWeek,
    })
    setInstBusy(false)
    if (rpcErr) { setError('تعذّر إنشاء التقرير: ' + rpcErr.message); return }
    setInstSnapshot(data as InstitutionalSnapshot)
  }

  function printReport() {
    window.print()
  }

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>

  const selected = students.find((s) => s.id === selectedId)
  const filteredStudents = query.trim().length === 0
    ? students
    : students.filter((s) => s.full_name.includes(query) || (s.student_no ?? '').includes(query))

  const studentRows = selectedId ? buildStudentRows(selectedId) : []
  const activeReports = reports.filter((r) => r.status === 'active')
  const revokedReports = reports.filter((r) => r.status === 'revoked')

  const inRange = studentRows.filter((r) => r.week_number >= fromWeek && r.week_number <= toWeek)
  const sumTotal = inRange.reduce((s, r) => s + r.total_possible, 0)
  const sumScore = inRange.reduce((s, r) => s + (r.has_attempt && r.status === 'graded' ? r.final_score : 0), 0)
  const sumPercent = sumTotal > 0 ? Math.round((sumScore / sumTotal) * 100) : 0

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">التقارير</h2>
        <p className="mt-1 text-base text-white/85">إصدار تقارير أكاديمية رسمية واعتمادها للطلاب.</p>
      </section>

      {/* ============ التقرير المؤسسي ============ */}
      <section className={card}>
        <h3 className="text-xl font-bold text-primary">📊 التقرير المؤسسي للإدارة</h3>
        <p className="mt-1 text-sm text-ink-muted">
          كشف شامل لجميع الطلاب — نتائج + حضور — جاهز للطباعة.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div>
            <label className="text-sm font-semibold text-ink">من الأسبوع</label>
            <input
              type="number" min={1} max={16}
              className={input}
              value={instFromWeek}
              onChange={(e) => setInstFromWeek(parseInt(e.target.value, 10) || 1)}
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-ink">إلى الأسبوع</label>
            <input
              type="number" min={1} max={16}
              className={input}
              value={instToWeek}
              onChange={(e) => setInstToWeek(parseInt(e.target.value, 10) || 1)}
            />
          </div>
          <div className="flex items-end">
            <button className={btn} onClick={() => void generateInstitutional()} disabled={instBusy}>
              {instBusy ? '...' : '📊 تقرير النتائج المؤسسي'}
            </button>
          </div>
        </div>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-base font-semibold text-error">{error}</p>}
      {success && <p className="rounded-xl bg-secondary-soft p-3 text-base font-semibold text-secondary ring-1 ring-secondary/20">{success}</p>}

      <section className={card}>
        <h3 className="text-xl font-bold text-primary">📄 إصدار تقرير رسمي</h3>
        <p className="mt-1 text-sm text-ink-muted">
          اختر الطالب والمدى، اضغط «معاينة التقرير» لرؤيته كما سيظهر للطالب، ثم اعتمده.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-ink">بحث بالاسم أو الرقم</label>
            <input className={input} placeholder="اكتب للبحث..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold text-ink">الطالب</label>
            <select className={input} value={selectedId} onChange={(e) => setSelectedId(e.target.value)}>
              {filteredStudents.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name}{s.student_no ? ` (${s.student_no})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {selected && (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl bg-primary-soft/40 p-3 text-sm">
              <span className="rounded-lg bg-primary-soft px-3 py-1 font-semibold text-primary">{selected.full_name}</span>
              {selected.student_no && (
                <span className="rounded-lg bg-bg px-3 py-1 font-mono text-ink-muted" dir="ltr">{selected.student_no}</span>
              )}
              <span className="text-ink-muted">— {studentRows.filter((r) => r.has_attempt).length} أسبوع بمحاولة</span>
            </div>

            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-light-blue">
                    <th className={th}>الأسبوع</th>
                    <th className={th}>العنوان</th>
                    <th className={th}>الحالة</th>
                    <th className={th}>الدرجة</th>
                    <th className={th}>النسبة</th>
                    <th className={th}>التاريخ</th>
                  </tr>
                </thead>
                <tbody>
                  {studentRows.map((r) => (
                    <tr key={r.week_number} className={'border-b border-light-blue/50 ' + (r.week_number >= fromWeek && r.week_number <= toWeek ? 'bg-accent-soft/20' : '')}>
                      <td className="p-3 font-semibold">الأسبوع {r.week_number}</td>
                      <td className="p-3">{r.week_title}</td>
                      <td className="p-3">
                        {!r.has_attempt ? (
                          <span className="rounded-lg bg-bg px-2 py-0.5 text-xs text-ink-muted">لا محاولة</span>
                        ) : r.status === 'graded' ? (
                          <span className="rounded-lg bg-secondary-soft px-2 py-0.5 text-xs font-semibold text-secondary ring-1 ring-secondary/20">مصحح</span>
                        ) : r.status === 'submitted' ? (
                          <span className="rounded-lg bg-warning-soft px-2 py-0.5 text-xs font-semibold text-ink ring-1 ring-warning">بانتظار التصحيح</span>
                        ) : (
                          <span className="rounded-lg bg-ink/10 px-2 py-0.5 text-xs font-semibold text-ink-muted">مسودة</span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-primary" dir="ltr">
                        {r.has_attempt ? <>{r.final_score} / {r.total_possible}</> : '—'}
                      </td>
                      <td className="p-3 font-semibold">{r.has_attempt ? `${r.percent}%` : '—'}</td>
                      <td className="p-3 text-xs text-ink-muted">{r.submitted_at ? timeAgo(r.submitted_at) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5 rounded-xl border border-light-blue bg-bg p-4">
              <h4 className="text-base font-bold text-primary">إعداد التقرير</h4>
              <div className="mt-3 grid gap-3 md:grid-cols-4">
                <div>
                  <label className="text-sm font-semibold text-ink">من الأسبوع</label>
                  <input type="number" min={1} max={weeks.length} className={input} value={fromWeek} onChange={(e) => setFromWeek(parseInt(e.target.value, 10) || 1)} />
                </div>
                <div>
                  <label className="text-sm font-semibold text-ink">إلى الأسبوع</label>
                  <input type="number" min={1} max={weeks.length} className={input} value={toWeek} onChange={(e) => setToWeek(parseInt(e.target.value, 10) || 1)} />
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-semibold text-ink">نوع التقرير (تلقائي)</label>
                  <div className="mt-1 rounded-xl bg-white px-3 py-2 text-base font-semibold text-primary">
                    {fromWeek === toWeek
                      ? `أسبوعي — الأسبوع ${fromWeek}`
                      : `تراكمي — من ${fromWeek} إلى ${toWeek} (${sumScore} / ${sumTotal} = ${sumPercent}%)`}
                  </div>
                </div>
              </div>
              <div className="mt-3">
                <label className="text-sm font-semibold text-ink">ملاحظة الأستاذ (اختيارية — ستظهر في التقرير)</label>
                <textarea rows={2} className={input} placeholder="مثال: أحسنت، واصل هذا التميز." value={teacherNote} onChange={(e) => setTeacherNote(e.target.value)} />
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                <button className={btn} onClick={openPreview} disabled={busy}>
                  👁️ معاينة التقرير
                </button>
              </div>
            </div>

            {activeReports.length > 0 && (
              <div className="mt-5">
                <h4 className="text-base font-bold text-primary">📋 التقارير المعتمدة</h4>
                <ul className="mt-2 space-y-2">
                  {activeReports.map((r) => (
                    <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-light-blue bg-white p-3">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-ink">
                          {r.type === 'weekly' ? `أسبوعي — الأسبوع ${r.from_week_number}` : `تراكمي — الأسابيع ${r.from_week_number} إلى ${r.to_week_number}`}
                          {r.report_number && <span className="ms-2 rounded bg-bg px-2 py-0.5 font-mono text-xs text-ink-muted" dir="ltr">{r.report_number}</span>}
                        </div>
                        <div className="text-xs text-ink-muted">
                          أُصدر {timeAgo(r.approved_at)}
                          {r.seen_at ? ' — ✓ رآه الطالب' : ' — ⏳ لم يره بعد'}
                        </div>
                        {r.teacher_note && (
                          <div className="mt-1 text-xs text-ink-muted">ملاحظة: {r.teacher_note}</div>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className={btnOutline} onClick={() => openExistingReport(r)} disabled={busy}>
                          عرض
                        </button>
                        <button className={btnDanger} onClick={() => void revokeReport(r.id, r.report_number)} disabled={busy}>
                          إلغاء
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {revokedReports.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-ink-muted">
                  تقارير ملغاة ({revokedReports.length})
                </summary>
                <ul className="mt-2 space-y-1 text-xs text-ink-muted">
                  {revokedReports.map((r) => (
                    <li key={r.id}>
                      {r.type === 'weekly' ? `الأسبوع ${r.from_week_number}` : `تراكمي ${r.from_week_number}–${r.to_week_number}`}
                      {' — '}{timeAgo(r.approved_at)}
                      {r.report_number && <> — <span dir="ltr">{r.report_number}</span></>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </>
        )}
      </section>

      {/* ============ نافذة المعاينة ============ */}
      {preview && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-2 md:p-6">
          <div className="mx-auto max-w-[900px]">
            <div className="no-print sticky top-0 z-10 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3 shadow-lg">
              <div className="text-base font-bold text-primary">
                {preview.mode === 'new' ? '👁️ معاينة التقرير — قبل الاعتماد' : '📄 عرض التقرير'}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={btnOutline} onClick={printReport}>
                  🖨️ طباعة / PDF
                </button>
                {preview.mode === 'new' ? (
                  <button className={btnSuccess} onClick={() => void confirmApprove()} disabled={busy}>
                    {busy ? '...' : '✓ اعتماد وإرسال للطالب'}
                  </button>
                ) : null}
                <button className={btnDanger} onClick={() => setPreview(null)} disabled={busy}>
                  إغلاق
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
              <WeeklyReport
                snapshot={preview.snapshot}
                reportNumber={preview.reportNumber}
                approvedAt={preview.approvedAt}
                teacherNote={preview.teacherNote}
              />
            </div>
          </div>
        </div>
      )}

      {/* نافذة التقرير المؤسسي */}
      {instSnapshot && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-2 md:p-6">
          <div className="mx-auto max-w-[900px]">
            <div className="no-print sticky top-0 z-10 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3 shadow-lg">
              <div className="text-base font-bold text-primary">
                📊 التقرير المؤسسي — الأسابيع {instSnapshot.from_week}–{instSnapshot.to_week}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={btnOutline} onClick={() => window.print()}>
                  🖨️ طباعة / PDF
                </button>
                <button className={btn} onClick={() => setInstSnapshot(null)}>
                  إغلاق
                </button>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
              <InstitutionalReport
                snapshot={instSnapshot}
                generatedAt={instSnapshot.generated_at}
                mode="grades"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 📄 `src\features\admin\StudentsTab.tsx`
```tsx
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

interface StudentRow {
  id: string
  full_name: string
  student_no: string | null
  university_no: string | null
  active: boolean
}

interface CreatedRow {
  full_name: string
  ok: boolean
  student_no?: string
  password?: string
  error?: string
}

const CREATE_FN = 'smooth-task'

const card = 'rounded-2xl border border-light-blue bg-white p-6'
const btn = 'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-surface disabled:opacity-60'
const btnDanger = 'rounded-xl border border-error bg-white px-3 py-1.5 text-sm font-semibold text-error transition hover:bg-error-soft disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue p-2 text-ink'

export default function StudentsTab() {
  const [rows, setRows] = useState<StudentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [names, setNames] = useState('')
  const [busy, setBusy] = useState(false)
  const [created, setCreated] = useState<CreatedRow[] | null>(null)

  // حالة نافذة كلمة المرور المؤقتة
  const [tempPassword, setTempPassword] = useState<{ name: string; pass: string } | null>(null)

  // edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [editUni, setEditUni] = useState('')

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const { data, error: err } = await supabase
      .from('profiles')
      .select('id, full_name, student_no, university_no, active')
      .eq('role', 'student')
      .order('student_no', { ascending: true })
    if (err) setError('تعذّر تحميل قائمة الطلاب.')
    else {
      setError(null)
      setRows((data ?? []) as StudentRow[])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function addStudents() {
    if (!supabase) return
    const list = names
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((full_name) => ({ full_name }))
    if (list.length === 0 || list.length > 100) {
      setError('اكتب من 1 إلى 100 اسم، اسم في كل سطر.')
      return
    }
    setBusy(true)
    setError(null)
    setSuccess(null)
    const { data, error: err } = await supabase.functions.invoke(CREATE_FN, {
      body: { students: list },
    })
    setBusy(false)
    if (err || !data?.results) {
      setError('تعذّرت إضافة الطلاب. حاول مرة أخرى.')
      return
    }
    setCreated(data.results as CreatedRow[])
    setNames('')
    setShowAdd(false)
    void load()
  }

  async function toggleActive(r: StudentRow) {
    if (!supabase) return
    const { error: err } = await supabase
      .from('profiles')
      .update({ active: !r.active })
      .eq('id', r.id)
    if (err) setError('تعذّر تغيير حالة الطالب.')
    else void load()
  }

  function startEdit(r: StudentRow) {
    setEditingId(r.id)
    setEditName(r.full_name)
    setEditUni(r.university_no ?? '')
    setError(null)
    setSuccess(null)
  }

  function cancelEdit() {
    setEditingId(null)
    setEditName('')
    setEditUni('')
  }

  async function saveEdit(r: StudentRow) {
    if (!supabase) return
    if (!editName.trim()) {
      setError('الاسم مطلوب.')
      return
    }
    setBusy(true); setError(null); setSuccess(null)
    const { error: rpcErr } = await supabase.rpc('update_student', {
      p_student_id: r.id,
      p_full_name: editName.trim(),
      p_university_no: editUni.trim() || null,
    })
    setBusy(false)
    if (rpcErr) { setError('تعذّر التعديل: ' + rpcErr.message); return }
    setSuccess('تم تعديل بيانات الطالب.')
    cancelEdit()
    await load()
  }

  async function deleteStudent(r: StudentRow) {
    if (!supabase) return
    const msg = `حذف الطالب «${r.full_name}» نهائيًا؟\n\nسيُحذف حسابه وملفه وكل محاولاته وإجاباته ودرجاته. لا يمكن التراجع.`
    if (!window.confirm(msg)) return
    setBusy(true); setError(null); setSuccess(null)
    const { data, error: rpcErr } = await supabase.rpc('delete_student', {
      p_student_id: r.id,
    })
    setBusy(false)
    if (rpcErr) { setError('تعذّر الحذف: ' + rpcErr.message); return }
    const count = (data as { deleted_attempts?: number } | null)?.deleted_attempts ?? 0
    setSuccess(`تم حذف الطالب و${count} محاولة مرتبطة به.`)
    await load()
  }

  async function resetPassword(r: StudentRow) {
    if (!supabase) return
    if (!window.confirm(`تصفير كلمة مرور الطالب «${r.full_name}»؟\n\nسيتمكن من الدخول بكلمة مرور مؤقتة، وسيُجبر على تغييرها فوراً. بياناته ودرجاته لن تتأثر.`)) return

    setBusy(true); setError(null); setSuccess(null)
    const { data, error: fnErr } = await supabase.functions.invoke('reset-student-password', {
      body: { student_id: r.id }
    })
    setBusy(false)

    if (fnErr || !data?.success) {
      setError('تعذّر تصفير كلمة المرور. حاول مرة أخرى.')
      return
    }

    setTempPassword({ name: r.full_name, pass: data.password })
  }

  function copyCreated() {
    if (!created) return
    const text = created
      .filter((c) => c.ok)
      .map((c) => [c.full_name, c.student_no, c.password].join('\t'))
      .join('\n')
    void navigator.clipboard.writeText(text)
  }

  const statusClass = (active: boolean) =>
    'p-2 font-semibold ' + (active ? 'text-secondary' : 'text-error')

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-primary">الطلاب</h2>
          <button className={btn} onClick={() => setShowAdd((v) => !v)}>
            + إضافة طلاب
          </button>
        </div>

        {showAdd && (
          <div className="mt-4">
            <label className="block text-sm font-semibold text-ink" htmlFor="names">
              أسماء الطلاب (اسم في كل سطر)
            </label>
            <textarea
              id="names"
              rows={6}
              value={names}
              onChange={(e) => setNames(e.target.value)}
              className="mt-2 w-full rounded-xl border border-light-blue p-3 text-ink"
            />
            <button className={btn + ' mt-3'} onClick={addStudents} disabled={busy}>
              {busy ? 'جارٍ الإضافة...' : 'إنشاء الحسابات'}
            </button>
          </div>
        )}

        {error && <p className="mt-3 text-sm font-semibold text-error">{error}</p>}
        {success && <p className="mt-3 text-sm font-semibold text-secondary">{success}</p>}
      </section>

      {created && (
        <section className={card}>
          <h3 className="text-lg font-bold text-primary">الحسابات الجديدة</h3>
          <p className="mt-1 text-sm font-semibold text-error">
            كلمات المرور تظهر هنا مرة واحدة فقط. انسخها أو اطبعها الآن.
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-blue text-ink/70">
                  <th className="p-2 text-start">الاسم</th>
                  <th className="p-2 text-start">الرقم التعريفي</th>
                  <th className="p-2 text-start">كلمة المرور المؤقتة</th>
                </tr>
              </thead>
              <tbody>
                {created.map((c, i) => (
                  <tr key={i} className="border-b border-light-blue/50">
                    <td className="p-2">{c.full_name}</td>
                    {c.ok ? (
                      <>
                        <td className="p-2 font-mono" dir="ltr">{c.student_no}</td>
                        <td className="p-2 font-mono" dir="ltr">{c.password}</td>
                      </>
                    ) : (
                      <td className="p-2 text-error" colSpan={2}>فشل: {c.error}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex gap-2">
            <button className={btnOutline} onClick={copyCreated}>نسخ</button>
            <button className={btnOutline} onClick={() => window.print()}>طباعة</button>
            <button className={btnOutline} onClick={() => setCreated(null)}>إخفاء</button>
          </div>
        </section>
      )}

      <section className={card}>
        {loading ? (
          <p className="text-ink/70">جارٍ التحميل...</p>
        ) : rows.length === 0 ? (
          <p className="text-ink/70">لا يوجد طلاب بعد.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-blue text-ink/70">
                  <th className="p-2 text-start">الاسم</th>
                  <th className="p-2 text-start">الرقم التعريفي</th>
                  <th className="p-2 text-start">الرقم الجامعي</th>
                  <th className="p-2 text-start">الحالة</th>
                  <th className="p-2 text-start">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const isEditing = editingId === r.id
                  return (
                    <tr key={r.id} className="border-b border-light-blue/50 align-top">
                      {isEditing ? (
                        <>
                          <td className="p-2">
                            <input
                              className={input + ' mt-0'}
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                            />
                          </td>
                          <td className="p-2 font-mono" dir="ltr">{r.student_no ?? '—'}</td>
                          <td className="p-2">
                            <input
                              className={input + ' mt-0'}
                              dir="ltr"
                              value={editUni}
                              onChange={(e) => setEditUni(e.target.value)}
                            />
                          </td>
                          <td className={statusClass(r.active)}>
                            {r.active ? 'مفعّل' : 'معطّل'}
                          </td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-1">
                              <button className={btn} onClick={() => void saveEdit(r)} disabled={busy}>حفظ</button>
                              <button className={btnOutline} onClick={cancelEdit} disabled={busy}>إلغاء</button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="p-2">{r.full_name}</td>
                          <td className="p-2 font-mono" dir="ltr">{r.student_no ?? '—'}</td>
                          <td className="p-2 font-mono text-xs" dir="ltr">{r.university_no ?? '—'}</td>
                          <td className={statusClass(r.active)}>
                            {r.active ? 'مفعّل' : 'معطّل'}
                          </td>
                          <td className="p-2">
                            <div className="flex flex-wrap gap-1">
                              <button className={btnOutline} onClick={() => void resetPassword(r)} disabled={busy} title="توليد كلمة مرور مؤقتة للطالب">
                                🔑 تصفير المرور
                              </button>
                              <button className={btnOutline} onClick={() => toggleActive(r)} disabled={busy}>
                                {r.active ? 'تعطيل' : 'تفعيل'}
                              </button>
                              <button className={btnOutline} onClick={() => startEdit(r)} disabled={busy}>
                                تعديل
                              </button>
                              <button className={btnDanger} onClick={() => void deleteStudent(r)} disabled={busy}>
                                حذف
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* نافذة عرض كلمة المرور المؤقتة */}
      {tempPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl text-center">
            <h3 className="text-xl font-bold text-primary mb-2">تم تصفير كلمة المرور</h3>
            <p className="text-ink mb-4">الطالب: <b>{tempPassword.name}</b></p>

            <div className="rounded-xl bg-warning-soft p-4 text-2xl font-mono font-bold text-ink mb-4 ring-1 ring-warning tracking-widest" dir="ltr">
              {tempPassword.pass}
            </div>

            <p className="text-sm text-error font-semibold mb-6">⚠️ اعطِ هذه الكلمة للطالب. سيُطلب منه تغييرها فور دخوله.</p>

            <div className="flex gap-2 justify-center">
              <button className={btn} onClick={() => { navigator.clipboard.writeText(tempPassword.pass); alert('تم النسخ!') }}>نسخ الكلمة</button>
              <button className={btnOutline} onClick={() => setTempPassword(null)}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 📄 `src\features\admin\TablesTab.tsx`
```tsx
import DemoBadge from '../../components/DemoBadge'
import Tag from '../../components/Tag'
import { card, th } from '../../components/ui'
import { demoTables } from '../../demo/data'

export default function TablesTab() {
  const done = demoTables.filter((t) => t[3]).length
  return (
    <section className={card}>
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-primary">جداول قاعدة البيانات ({demoTables.length} جدولًا)</h2>
        <DemoBadge />
      </div>
      <p className="mt-2 text-sm text-ink/70">منفّذ: {done} من {demoTables.length}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-light-blue text-ink/70">
              <th className={th}>الجدول</th>
              <th className={th}>الغرض</th>
              <th className={th}>المرحلة</th>
              <th className={th}>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {demoTables.map((t) => (
              <tr key={t[0]} className="border-b border-light-blue/50">
                <td className="p-2 font-mono" dir="ltr">{t[0]}</td>
                <td className="p-2">{t[1]}</td>
                <td className="p-2">{t[2]}</td>
                <td className="p-2"><Tag tone={t[3] ? 'ok' : 'wait'}>{t[3] ? 'منفّذ' : 'قادم'}</Tag></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

```

### 📄 `src\features\admin\WeeksTab.tsx`
```tsx
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const btnDanger = 'rounded-xl border border-error bg-white px-3 py-1.5 text-sm font-semibold text-error hover:bg-error-soft disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink'
const label = 'text-sm font-semibold text-primary'

type Kind = 'document' | 'slides' | 'link'

interface Week { id: string; number: number; title: string; summary: string | null; published: boolean }
interface Lesson { id: string; week_id: string; title: string; body: string | null; position: number; published: boolean }
interface Material {
  id: string
  week_id: string
  lesson_id: string | null
  title: string
  kind: Kind
  view_path: string | null
  download_path: string | null
  url: string | null
  position: number
  published: boolean
}

interface ViewState {
  material: Material
  url: string
  downloadUrl: string
}

const BUCKET = 'course-files'

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : 'bin'
}

function extFromPath(path: string): string {
  const i = path.lastIndexOf('.')
  return i > 0 ? path.slice(i + 1).toLowerCase() : ''
}

function isOffice(ext: string): boolean {
  return ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'odt', 'ods', 'odp'].includes(ext)
}
function isImage(ext: string): boolean {
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)
}

async function deleteStoragePaths(pathsJson: unknown): Promise<void> {
  if (!supabase) return
  const arr = Array.isArray(pathsJson) ? pathsJson as string[] : []
  if (arr.length === 0) return
  await supabase.storage.from(BUCKET).remove(arr)
}

export default function WeeksTab() {
  const [weeks, setWeeks] = useState<Week[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enteredId, setEnteredId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const [w, l, m] = await Promise.all([
      supabase.from('weeks').select('id,number,title,summary,published').order('number'),
      supabase.from('lessons').select('id,week_id,title,body,position,published').order('position'),
      supabase.from('materials').select('id,week_id,lesson_id,title,kind,view_path,download_path,url,position,published').order('position'),
    ])
    if (w.error || l.error || m.error) {
      setError('تعذّر تحميل البيانات.')
    } else {
      setWeeks((w.data ?? []) as Week[])
      setLessons((l.data ?? []) as Lesson[])
      setMaterials((m.data ?? []) as Material[])
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const nextNumber = weeks.length === 0 ? 1 : Math.max(...weeks.map((w) => w.number)) + 1
  const enteredWeek = enteredId ? weeks.find((w) => w.id === enteredId) ?? null : null

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>

  if (enteredWeek) {
    return (
      <div className="space-y-4">
        <button className={btnOutline} onClick={() => setEnteredId(null)}>
          ← عودة لقائمة الأسابيع
        </button>
        <WeekEditor
          week={enteredWeek}
          lessons={lessons.filter((l) => l.week_id === enteredWeek.id)}
          materials={materials.filter((m) => m.week_id === enteredWeek.id)}
          onChanged={load}
          onDeleted={async () => { setEnteredId(null); await load() }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold">الأسابيع والدروس</h2>
            <p className="mt-1 text-base text-white/85">
              قائمة أسابيع المقرر. اضغط «دخول للتحرير» لإدارة دروس الأسبوع ومواده.
            </p>
          </div>
          <button
            className="rounded-xl bg-white px-5 py-2.5 text-base font-semibold text-primary shadow-sm hover:bg-primary-soft"
            onClick={() => setShowAdd(!showAdd)}
          >
            {showAdd ? 'إلغاء' : '+ إضافة أسبوع جديد'}
          </button>
        </div>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-sm font-semibold text-error">{error}</p>}

      {showAdd && (
        <AddWeekForm
          nextNumber={nextNumber}
          onCreated={async () => { setShowAdd(false); await load() }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {weeks.length === 0 && !showAdd && (
        <section className={card}>
          <p className="text-ink-muted">لا توجد أسابيع بعد. اضغط «+ إضافة أسبوع جديد» للبدء.</p>
        </section>
      )}

      {weeks.length > 0 && (
        <section className={card}>
          <h3 className="text-lg font-bold text-primary">الأسابيع ({weeks.length})</h3>
          <ul className="mt-4 space-y-3">
            {weeks.map((w) => {
              const wLessons = lessons.filter((l) => l.week_id === w.id)
              return (
                <WeekRow
                  key={w.id}
                  week={w}
                  lessonCount={wLessons.length}
                  onEnter={() => setEnteredId(w.id)}
                  onChanged={load}
                />
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

function WeekRow({ week, lessonCount, onEnter, onChanged }: {
  week: Week
  lessonCount: number
  onEnter: () => void
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function deleteWeek() {
    if (!supabase) return
    const msg = `حذف «الأسبوع ${week.number}: ${week.title}»؟\n\nسيُحذف كل ما فيه: ${lessonCount} درس + كل مواده + كل الأنشطة والاختبارات المرتبطة + كل محاولات الطلاب وإجاباتهم. لا يمكن التراجع.`
    if (!window.confirm(msg)) return
    setBusy(true); setErr(null)

    const { data, error } = await supabase.rpc('delete_week_cascade', { p_week_id: week.id })
    if (error) { setErr('فشل الحذف: ' + error.message); setBusy(false); return }
    const paths = (data as { storage_paths?: unknown } | null)?.storage_paths
    await deleteStoragePaths(paths)

    setBusy(false)
    onChanged()
  }

  return (
    <li className="rounded-xl border border-light-blue bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-bold text-primary">
              الأسبوع {week.number}: {week.title}
            </h4>
            <span className={'rounded-lg px-2 py-0.5 text-xs font-semibold ' + (week.published ? 'bg-secondary-soft text-secondary' : 'bg-bg text-ink-muted')}>
              {week.published ? 'منشور' : 'مخفي'}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">{lessonCount} درس</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnOutline} onClick={onEnter} disabled={busy}>دخول للتحرير</button>
          <button className={btnDanger} onClick={deleteWeek} disabled={busy}>
            {busy ? 'جارٍ الحذف...' : 'حذف الأسبوع'}
          </button>
        </div>
      </div>
      {err && <p className="mt-2 text-xs font-semibold text-error">{err}</p>}
    </li>
  )
}

function AddWeekForm({ nextNumber, onCreated, onCancel }: {
  nextNumber: number; onCreated: () => void; onCancel: () => void
}) {
  const [num, setNum] = useState(String(nextNumber))
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    if (!supabase) return
    const n = parseInt(num, 10)
    if (!n || n < 1) { setErr('رقم الأسبوع يجب أن يكون 1 أو أكبر.'); return }
    if (!title.trim()) { setErr('عنوان الأسبوع مطلوب.'); return }
    setBusy(true); setErr(null)
    const { error } = await supabase.from('weeks').insert({
      number: n, title: title.trim(), summary: summary.trim() || null, published: false,
    })
    setBusy(false)
    if (error) { setErr(error.message); return }
    onCreated()
  }

  return (
    <section className={card}>
      <h3 className="text-xl font-bold text-primary">أسبوع جديد</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <label className={label}>رقم الأسبوع</label>
          <input type="number" min={1} className={input} value={num} onChange={(e) => setNum(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className={label}>عنوان الأسبوع</label>
          <input className={input} placeholder="مثال: تمهيد العقود" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>
      <div className="mt-4">
        <label className={label}>ملخص (اختياري)</label>
        <textarea className={input} rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </div>
      {err && <p className="mt-3 text-sm font-semibold text-error">{err}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={btn} onClick={submit} disabled={busy}>{busy ? 'جارٍ الإنشاء...' : 'إنشاء الأسبوع'}</button>
        <button className={btnOutline} onClick={onCancel} disabled={busy}>إلغاء</button>
      </div>
    </section>
  )
}

function WeekEditor({ week, lessons, materials, onChanged, onDeleted }: {
  week: Week
  lessons: Lesson[]
  materials: Material[]
  onChanged: () => void
  onDeleted: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [title, setTitle] = useState(week.title)
  const [summary, setSummary] = useState(week.summary ?? '')
  const [viewing, setViewing] = useState<ViewState | null>(null)

  useEffect(() => setTitle(week.title), [week.title])
  useEffect(() => setSummary(week.summary ?? ''), [week.summary])

  async function saveWeek() {
    if (!supabase) return
    if (!title.trim()) { setErr('العنوان مطلوب.'); return }
    setBusy(true); setErr(null); setSuccess(null)
    const { error } = await supabase.from('weeks')
      .update({ title: title.trim(), summary: summary.trim() || null })
      .eq('id', week.id)
    setBusy(false)
    if (error) setErr(error.message)
    else { setSuccess('تم حفظ معلومات الأسبوع.'); onChanged() }
  }

  async function togglePublish() {
    if (!supabase) return
    setBusy(true); setErr(null); setSuccess(null)
    const { error } = await supabase.from('weeks')
      .update({ published: !week.published })
      .eq('id', week.id)
    setBusy(false)
    if (error) setErr(error.message)
    else { setSuccess(week.published ? 'تم إخفاء الأسبوع.' : 'تم نشر الأسبوع.'); onChanged() }
  }

  async function addLesson() {
    if (!supabase) return
    setBusy(true); setErr(null); setSuccess(null)
    const nextPos = lessons.length === 0 ? 1 : Math.max(...lessons.map((l) => l.position)) + 1
    const { error } = await supabase.from('lessons').insert({
      week_id: week.id, title: `الدرس ${nextPos}`, body: null, position: nextPos, published: false,
    })
    setBusy(false)
    if (error) setErr(error.message)
    else { setSuccess('تمت إضافة درس جديد.'); onChanged() }
  }

  async function deleteThisWeek() {
    if (!supabase) return
    const msg = `حذف «الأسبوع ${week.number}: ${week.title}»؟\n\nسيُحذف كل ما فيه. لا يمكن التراجع.`
    if (!window.confirm(msg)) return
    setBusy(true); setErr(null); setSuccess(null)

    const { data, error } = await supabase.rpc('delete_week_cascade', { p_week_id: week.id })
    if (error) { setErr('فشل الحذف: ' + error.message); setBusy(false); return }
    const paths = (data as { storage_paths?: unknown } | null)?.storage_paths
    await deleteStoragePaths(paths)

    setBusy(false)
    onDeleted()
  }

  async function openViewer(m: Material) {
    if (!supabase) return
    if (m.kind === 'link' && m.url) {
      window.open(m.url, '_blank', 'noreferrer')
      return
    }
    const path = m.view_path ?? m.download_path
    if (!path) { setErr('لا يوجد مسار للملف.'); return }
    setBusy(true); setErr(null)
    const { data: viewData } = await supabase.storage.from(BUCKET).createSignedUrl(path, 86400)
    const { data: dlData } = await supabase.storage.from(BUCKET).createSignedUrl(path, 86400, { download: true })
    setBusy(false)
    if (!viewData?.signedUrl) { setErr('تعذّر إنشاء رابط.'); return }
    setViewing({
      material: m,
      url: viewData.signedUrl,
      downloadUrl: dlData?.signedUrl ?? viewData.signedUrl,
    })
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold">الأسبوع {week.number}: {week.title}</h2>
            <p className="mt-1 text-base text-white/85">
              {lessons.length} درس — {materials.length} مادة
            </p>
          </div>
          <button
            className="rounded-xl bg-error px-5 py-2.5 text-base font-semibold text-white shadow-sm hover:bg-error/90"
            onClick={deleteThisWeek}
            disabled={busy}
          >
            {busy ? 'جارٍ الحذف...' : 'حذف هذا الأسبوع'}
          </button>
        </div>
      </section>

      {err && <p className="rounded-xl bg-error-soft p-3 text-sm font-semibold text-error">{err}</p>}
      {success && <p className="rounded-xl bg-secondary-soft p-3 text-sm font-semibold text-secondary ring-1 ring-secondary/20">{success}</p>}

      <section className={card}>
        <h3 className="text-lg font-bold text-primary">📝 معلومات الأسبوع</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className={label}>عنوان الأسبوع</label>
            <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className={label}>ملخص الأسبوع</label>
            <textarea className={input} rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btn} onClick={saveWeek} disabled={busy}>حفظ</button>
            <button className={btnOutline} onClick={togglePublish} disabled={busy}>
              {week.published ? 'إخفاء الأسبوع' : 'نشر الأسبوع'}
            </button>
          </div>
        </div>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-primary">📚 الدروس ({lessons.length})</h3>
          <button className={btn} onClick={addLesson} disabled={busy}>
            + إضافة درس جديد
          </button>
        </div>

        {lessons.length === 0 ? (
          <p className="mt-4 rounded-xl bg-bg p-6 text-center text-ink-muted">
            لا دروس في هذا الأسبوع بعد. اضغط «+ إضافة درس جديد».
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {lessons.map((l) => (
              <LessonBlock
                key={l.id}
                lesson={l}
                materials={materials.filter((m) => m.lesson_id === l.id)}
                onChanged={onChanged}
                onOpenViewer={openViewer}
              />
            ))}
          </div>
        )}
      </section>

      {viewing && (
        <FileViewerModal
          material={viewing.material}
          url={viewing.url}
          downloadUrl={viewing.downloadUrl}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}

function LessonBlock({ lesson, materials, onChanged, onOpenViewer }: {
  lesson: Lesson
  materials: Material[]
  onChanged: () => void
  onOpenViewer: (m: Material) => void
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState(lesson.title)
  const [body, setBody] = useState(lesson.body ?? '')

  useEffect(() => setTitle(lesson.title), [lesson.title])
  useEffect(() => setBody(lesson.body ?? ''), [lesson.body])

  const docs = materials.filter((m) => m.kind === 'document')
  const slides = materials.filter((m) => m.kind === 'slides')
  const links = materials.filter((m) => m.kind === 'link')

  async function saveLesson() {
    if (!supabase) return
    if (!title.trim()) { setErr('عنوان الدرس مطلوب.'); return }
    setBusy(true); setErr(null)
    const { error } = await supabase.from('lessons')
      .update({ title: title.trim(), body: body.trim() || null })
      .eq('id', lesson.id)
    setBusy(false)
    if (error) setErr(error.message); else onChanged()
  }

  async function togglePublish() {
    if (!supabase) return
    setBusy(true); setErr(null)
    const { error } = await supabase.from('lessons')
      .update({ published: !lesson.published })
      .eq('id', lesson.id)
    setBusy(false)
    if (error) setErr(error.message); else onChanged()
  }

  async function deleteLesson() {
    if (!supabase) return
    const msg = `حذف «${lesson.title}»؟\n\nسيُحذف معه ${materials.length} مادة (ملفات وروابط) من القاعدة وStorage. لا يمكن التراجع.`
    if (!window.confirm(msg)) return
    setBusy(true); setErr(null)

    const { data, error } = await supabase.rpc('delete_lesson_cascade', { p_lesson_id: lesson.id })
    if (error) { setErr('فشل الحذف: ' + error.message); setBusy(false); return }
    const paths = (data as { storage_paths?: unknown } | null)?.storage_paths
    await deleteStoragePaths(paths)

    setBusy(false)
    onChanged()
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-light-blue border-s-4 border-s-primary bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3">
        <button
          className="flex flex-1 items-center gap-3 text-start"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-2xl text-primary">{expanded ? '▼' : '▶'}</span>
          <span className="text-lg font-bold text-primary">📖 الدرس {lesson.position}: {lesson.title}</span>
          <span className={'rounded-lg px-2 py-0.5 text-xs font-semibold ' + (lesson.published ? 'bg-secondary-soft text-secondary' : 'bg-bg text-ink-muted')}>
            {lesson.published ? 'منشور' : 'مخفي'}
          </span>
        </button>
        <button className={btnDanger} onClick={deleteLesson} disabled={busy}>
          {busy ? '...' : 'حذف الدرس'}
        </button>
      </div>

      {expanded && (
        <div className="space-y-5 border-t border-light-blue bg-bg p-4">
          {err && <p className="text-sm font-semibold text-error">{err}</p>}

          <div className="space-y-3 rounded-xl border border-light-blue bg-white p-4">
            <div>
              <label className={label}>عنوان الدرس</label>
              <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className={label}>نص الدرس</label>
              <textarea className={input} rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={btn} onClick={saveLesson} disabled={busy}>حفظ الدرس</button>
              <button className={btnOutline} onClick={togglePublish} disabled={busy}>
                {lesson.published ? 'إخفاء الدرس' : 'نشر الدرس'}
              </button>
            </div>
          </div>

          <MaterialSection
            lessonId={lesson.id} weekId={lesson.week_id} kind="document"
            title="📄 المادة الخام" subtitle="أي صيغة ملف"
            items={docs} onChanged={onChanged} onOpenViewer={onOpenViewer}
          />
          <MaterialSection
            lessonId={lesson.id} weekId={lesson.week_id} kind="slides"
            title="📊 العرض التقديمي" subtitle="PowerPoint أو PDF"
            items={slides} onChanged={onChanged} onOpenViewer={onOpenViewer}
          />
          <MaterialSection
            lessonId={lesson.id} weekId={lesson.week_id} kind="link"
            title="🔗 روابط خارجية" subtitle="فيديوهات، مصادر، شروح"
            items={links} onChanged={onChanged} onOpenViewer={onOpenViewer}
          />
        </div>
      )}
    </section>
  )
}

function MaterialSection({
  lessonId, weekId, kind, title, subtitle, items, onChanged, onOpenViewer,
}: {
  lessonId: string; weekId: string; kind: Kind; title: string; subtitle: string
  items: Material[]; onChanged: () => void; onOpenViewer: (m: Material) => void
}) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="rounded-xl border border-light-blue bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h5 className="text-base font-bold text-primary">{title}</h5>
          <p className="text-xs text-ink-muted">{subtitle} — {items.length} مادة</p>
        </div>
        <button className={btnOutline} onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'إلغاء' : '+ إضافة'}
        </button>
      </div>

      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((m) => (
            <MaterialItem key={m.id} material={m} onChanged={onChanged} onOpenViewer={onOpenViewer} />
          ))}
        </ul>
      )}

      {showAdd && (
        <div className="mt-3 rounded-xl border border-dashed border-light-blue bg-bg p-3">
          {kind === 'link' ? (
            <AddLinkForm lessonId={lessonId} weekId={weekId} onAdded={() => { setShowAdd(false); onChanged() }} />
          ) : (
            <AddFileForm lessonId={lessonId} weekId={weekId} kind={kind} onAdded={() => { setShowAdd(false); onChanged() }} />
          )}
        </div>
      )}
    </div>
  )
}

function MaterialItem({ material, onChanged, onOpenViewer }: {
  material: Material
  onChanged: () => void
  onOpenViewer: (m: Material) => void
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function togglePublish() {
    if (!supabase) return
    setBusy(true); setErr(null)
    const { error } = await supabase.from('materials').update({ published: !material.published }).eq('id', material.id)
    setBusy(false)
    if (error) setErr(error.message); else onChanged()
  }

  async function remove() {
    if (!supabase) return
    if (!window.confirm('حذف هذه المادة؟')) return
    setBusy(true); setErr(null)
    const paths: string[] = []
    if (material.view_path) paths.push(material.view_path)
    if (material.download_path && material.download_path !== material.view_path) paths.push(material.download_path)
    const { error: delErr } = await supabase.from('materials').delete().eq('id', material.id)
    if (delErr) { setErr(delErr.message); setBusy(false); return }
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
    setBusy(false)
    onChanged()
  }

  async function download() {
    if (!supabase) return
    const path = material.view_path ?? material.download_path
    if (!path) return
    setBusy(true)
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600, { download: true })
    setBusy(false)
    if (data?.signedUrl) window.location.href = data.signedUrl
  }

  return (
    <li className="rounded-lg border border-light-blue bg-white p-3 transition hover:border-primary/40 hover:shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <span className="text-lg text-primary">
            {material.kind === 'link' ? '🔗' : material.kind === 'slides' ? '📊' : '📄'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-ink">{material.title}</div>
            {material.kind === 'link' && material.url && (
              <div className="truncate text-xs text-ink-muted" dir="ltr">{material.url}</div>
            )}
          </div>
          <span className={'rounded px-2 py-0.5 text-xs font-semibold ' + (material.published ? 'bg-secondary-soft text-secondary' : 'bg-bg text-ink-muted')}>
            {material.published ? 'منشور' : 'مخفي'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          <button className={btnOutline} onClick={() => onOpenViewer(material)} disabled={busy}>
            📖 عرض
          </button>
          {material.kind !== 'link' && (
            <button className={btnOutline} onClick={download} disabled={busy}>
              ⬇ تحميل
            </button>
          )}
          <button className={btnOutline} onClick={togglePublish} disabled={busy}>
            {material.published ? 'إخفاء' : 'نشر'}
          </button>
          <button className={btnDanger} onClick={remove} disabled={busy}>حذف</button>
        </div>
      </div>
      {err && <p className="mt-2 text-xs font-semibold text-error">{err}</p>}
    </li>
  )
}

function FileViewerModal({ material, url, downloadUrl, onClose }: {
  material: Material
  url: string
  downloadUrl: string
  onClose: () => void
}) {
  const path = material.view_path ?? material.download_path ?? ''
  const ext = extFromPath(path)
  const office = isOffice(ext)
  const image = isImage(ext)
  const pdf = ext === 'pdf'

  const officeViewerUrl = office
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
    : url

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 md:p-6" onClick={onClose}>
      <div className="flex h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-light-blue bg-gradient-to-l from-primary-soft/40 to-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-2xl">
              {material.kind === 'slides' ? '📊' : material.kind === 'document' ? '📄' : '🔗'}
            </span>
            <h3 className="truncate text-base font-bold text-primary md:text-lg">{material.title}</h3>
            {office && <span className="rounded bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">Office</span>}
            {pdf && <span className="rounded bg-error-soft px-2 py-0.5 text-xs font-semibold text-error">PDF</span>}
            {image && <span className="rounded bg-secondary-soft px-2 py-0.5 text-xs font-semibold text-secondary">صورة</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={downloadUrl} download className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary-hover">
              ⬇ تحميل
            </a>
            <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-xl border border-error bg-white px-4 py-2 text-sm font-semibold text-error hover:bg-error-soft">
              ✕ إغلاق
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-bg">
          {image ? (
            <div className="flex h-full items-center justify-center overflow-auto p-4">
              <img src={url} alt={material.title} className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <iframe src={officeViewerUrl} title={material.title} className="h-full w-full border-0" allow="fullscreen" />
          )}
        </div>

        <footer className="border-t border-light-blue bg-white px-4 py-2 text-xs text-ink-muted">
          {pdf && 'يُعرض الملف عبر قارئ PDF المدمج.'}
          {office && 'يُعرض الملف عبر Microsoft Office Viewer.'}
          {image && 'صورة معروضة بالحجم الكامل.'}
        </footer>
      </div>
    </div>
  )
}

function AddFileForm({ lessonId, weekId, kind, onAdded }: {
  lessonId: string; weekId: string; kind: 'document' | 'slides'; onAdded: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [key, setKey] = useState(0)

  function pick(f: File | null) {
    setErr(null)
    if (!f) { setFile(null); return }
    setFile(f)
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  async function submit() {
    if (!supabase || !file) return
    if (!title.trim()) { setErr('العنوان مطلوب.'); return }
    setBusy(true); setErr(null)
    const uuid = crypto.randomUUID()
    const path = `weeks/${weekId}/${uuid}.${extOf(file.name)}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
    if (upErr) { setErr('فشل الرفع: ' + upErr.message); setBusy(false); return }
    const viewable = ['application/pdf'].includes(file.type)
    const { error: insErr } = await supabase.from('materials').insert({
      week_id: weekId, lesson_id: lessonId, title: title.trim(), kind,
      url: null, view_path: viewable ? path : null, download_path: path,
      position: 1, published: false,
    })
    if (insErr) {
      await supabase.storage.from(BUCKET).remove([path])
      setErr('فشل الإدخال: ' + insErr.message); setBusy(false); return
    }
    setBusy(false)
    setFile(null); setTitle(''); setKey((k) => k + 1)
    onAdded()
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={label}>الملف (أي صيغة)</label>
        <input key={key} type="file" className={input} onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        {file && <p className="mt-1 text-xs text-ink-muted">{file.name} — {(file.size / (1024 * 1024)).toFixed(2)} MB</p>}
      </div>
      <div>
        <label className={label}>العنوان</label>
        <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      {err && <p className="text-xs font-semibold text-error">{err}</p>}
      <button className={btn} onClick={submit} disabled={busy || !file}>
        {busy ? 'جارٍ الرفع...' : 'رفع'}
      </button>
    </div>
  )
}

function AddLinkForm({ lessonId, weekId, onAdded }: {
  lessonId: string; weekId: string; onAdded: () => void
}) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    if (!supabase) return
    if (!title.trim()) { setErr('الوصف مطلوب.'); return }
    if (!/^https:\/\//i.test(url.trim())) { setErr('الرابط يجب أن يبدأ بـ https://'); return }
    setBusy(true); setErr(null)
    const { error } = await supabase.from('materials').insert({
      week_id: weekId, lesson_id: lessonId, title: title.trim(), kind: 'link',
      url: url.trim(), view_path: null, download_path: null,
      position: 1, published: false,
    })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setTitle(''); setUrl('')
    onAdded()
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={label}>وصف مختصر للرابط</label>
        <input className={input} placeholder="مثال: شرح الدرس الأول" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className={label}>الرابط (https)</label>
        <input className={input} dir="ltr" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      {err && <p className="text-xs font-semibold text-error">{err}</p>}
      <button className={btn} onClick={submit} disabled={busy}>
        {busy ? 'جارٍ الإضافة...' : 'إضافة الرابط'}
      </button>
    </div>
  )
}
```

### 📄 `src\features\auth\ChangePasswordPage.tsx`
```tsx
import { useState, type FormEvent, type ReactNode } from 'react'
import { useAuth } from '../../app/auth-context'
import Button from '../../components/Button'
import CenteredCard from '../../components/CenteredCard'

const inputClass =
  'w-full rounded-xl border border-light-blue bg-white py-3 pl-4 pr-16 text-base text-ink outline-none transition focus:border-primary'

function Rule({ ok, children }: { ok: boolean; children: ReactNode }) {
  return (
    <li className={`flex items-center gap-2 ${ok ? 'font-semibold text-secondary' : 'text-ink/60'}`}>
      <span
        aria-hidden="true"
        className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-white ${ok ? 'bg-secondary' : 'bg-light-blue'}`}
      >
        {ok ? '✓' : ''}
      </span>
      <span>{children}</span>
    </li>
  )
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  show,
  autoComplete,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  show: boolean
  autoComplete: string
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-sm font-semibold text-ink">
        {label}
      </label>
      <input
        id={id}
        dir="ltr"
        type={show ? 'text' : 'password'}
        className={inputClass}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        autoComplete={autoComplete}
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
      />
    </div>
  )
}

/** شاشة إلزامية: لا يدخل الطالب المقرر قبل تغيير كلمة المرور المؤقتة. */
export default function ChangePasswordPage() {
  const { profile, changePassword, signOut } = useAuth()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const lengthOk = next.length >= 8 && next.length <= 72
  const mixOk = /[A-Za-z]/.test(next) && /[0-9]/.test(next)
  const differentOk = next.length > 0 && next !== current
  const matchOk = next.length > 0 && next === confirm
  const allOk = lengthOk && mixOk && differentOk && matchOk && current.length > 0

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!allOk) {
      setError('أكمل الشروط الموضحة أدناه قبل المتابعة.')
      return
    }
    setSubmitting(true)
    const message = await changePassword(current, next)
    setSubmitting(false)
    if (message) setError(message)
    // عند النجاح يُعاد تحميل الملف تلقائيًا، فيوجّه التطبيق الطالب إلى صفحته.
  }

  return (
    <CenteredCard>
      <div
        className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-white"
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="h-8 w-8" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="9" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </svg>
      </div>
      <h1 className="text-3xl font-bold leading-tight text-primary">تغيير كلمة المرور</h1>
      <p className="mt-3 text-base text-ink">
        {profile?.full_name ? `مرحبًا ${profile.full_name}. ` : ''}
        كلمة المرور الحالية مؤقتة، ولا يمكنك دخول المقرر قبل تغييرها.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5 text-start">
        <div className="relative">
          <PasswordField
            id="current"
            label="كلمة المرور الحالية (المؤقتة)"
            value={current}
            onChange={setCurrent}
            show={show}
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShow((s) => !s)}
            className="absolute right-3 top-[2.6rem] text-sm font-semibold text-primary"
            aria-pressed={show}
          >
            {show ? 'إخفاء' : 'إظهار'}
          </button>
        </div>

        <PasswordField
          id="new"
          label="كلمة المرور الجديدة"
          value={next}
          onChange={setNext}
          show={show}
          autoComplete="new-password"
        />
        <PasswordField
          id="confirm"
          label="تأكيد كلمة المرور الجديدة"
          value={confirm}
          onChange={setConfirm}
          show={show}
          autoComplete="new-password"
        />

        <ul className="space-y-1.5 rounded-xl bg-surface px-4 py-3 text-sm" aria-live="polite">
          <Rule ok={lengthOk}>من 8 إلى 72 محرفًا</Rule>
          <Rule ok={mixOk}>تحتوي حرفًا إنجليزيًا ورقمًا على الأقل</Rule>
          <Rule ok={differentOk}>تختلف عن كلمة المرور المؤقتة</Rule>
          <Rule ok={matchOk}>التأكيد مطابق</Rule>
        </ul>

        {error && (
          <p role="alert" className="rounded-xl border border-error bg-error/10 px-4 py-3 text-sm font-semibold text-ink">
            {error}
          </p>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'جارٍ الحفظ…' : 'حفظ ومتابعة'}
        </Button>
        <Button variant="outline" onClick={signOut} disabled={submitting}>
          تسجيل الخروج
        </Button>
      </form>
    </CenteredCard>
  )
}
```

### 📄 `src\features\auth\LoginPage.tsx`
```tsx
import { useState, type FormEvent } from 'react'
import { useAuth } from '../../app/auth-context'
import { isSupabaseConfigured } from '../../lib/supabase'
import Button from '../../components/Button'
import CenteredCard from '../../components/CenteredCard'

const inputClass =
  'w-full rounded-xl border border-light-blue bg-white px-4 py-3 text-base text-ink outline-none transition focus:border-primary'

export default function LoginPage() {
  const { signIn, notice } = useAuth()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    const message = await signIn(identifier, password)
    setSubmitting(false)
    if (message) setError(message)
  }

  const message = error ?? notice

  return (
    <CenteredCard>
      <div className="mx-auto mb-5 flex h-24 w-24 items-center justify-center rounded-3xl border border-light-blue bg-white p-3 shadow-sm">
        <img
          src="/UST.png"
          alt="شعار جامعة العلوم والتكنولوجيا"
          className="h-full w-full object-contain"
        />
      </div>

      <h1 className="text-4xl font-bold leading-tight text-primary">فقه المعاملات</h1>
      <p className="mt-2 text-lg text-ink-muted">المنصة التعليمية التفاعلية</p>
      <p className="mt-3 text-sm font-semibold text-primary">
        مدرس المقرر: د. محمد إسماعيل
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5 text-start">
        {!isSupabaseConfigured && (
          <p role="alert" className="rounded-xl border border-warning bg-warning/30 px-4 py-3 text-sm text-ink">
            لم يُضبط الاتصال بقاعدة البيانات بعد. أنشئ ملف .env.local كما في README.
          </p>
        )}

        <div>
          <label htmlFor="identifier" className="mb-2 block text-sm font-semibold text-ink">
            الرقم التعريفي / البريد الإلكتروني
          </label>
          <input
            id="identifier"
            dir="ltr"
            className={inputClass}
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="الطالب: FM0001"
            autoComplete="username"
            inputMode="text"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
          <p className="mt-1.5 text-xs text-ink-muted">
            الطالب يكتب الرقم التعريفي الذي سلّمه له الأستاذ، والأستاذ يكتب بريده الإلكتروني.
          </p>
        </div>

        <div>
          <label htmlFor="password" className="mb-2 block text-sm font-semibold text-ink">
            كلمة المرور
          </label>
          <div className="relative">
            <input
              id="password"
              dir="ltr"
              type={showPassword ? 'text' : 'password'}
              className={`${inputClass} pr-16`}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-primary"
              aria-pressed={showPassword}
            >
              {showPassword ? 'إخفاء' : 'إظهار'}
            </button>
          </div>
        </div>

        {message && (
          <p role="alert" className="rounded-xl border border-error bg-error-soft px-4 py-3 text-sm font-semibold text-error">
            {message}
          </p>
        )}

        <Button type="submit" disabled={submitting}>
          {submitting ? 'جارٍ الدخول…' : 'دخول'}
        </Button>
      </form>

      <p className="mt-8 text-xs text-ink-muted">
        المطور: د. محمد إسماعيل — 2026
      </p>
    </CenteredCard>
  )
}
```

### 📄 `src\features\shared\AssignmentNotification.tsx`
```tsx

const C = {
  blue: '#0B6CB3', blueSoft: '#E6F2FA', green: '#198B48', greenSoft: '#E8F5ED',
  red: '#D74050', redSoft: '#FBEAEC', ink: '#123A2E', gray: '#4B5D63',
  line: '#D6E4EC', paper: '#F7FBFD',
}
const TEACHER = 'د. محمد إسماعيل'

export interface AssignmentNotificationProps {
  studentName: string
  studentNo: string
  assignmentTitle: string
  score: number
  maxScore: number
  teacherNote: string | null
  gradedAt: string
}

export default function AssignmentNotification({
  studentName, studentNo, assignmentTitle, score, maxScore, teacherNote, gradedAt
}: AssignmentNotificationProps) {
  
  return (
    <div dir="rtl" className="print-area" style={{
      width: '210mm', minHeight: '297mm', background: 'white', color: C.ink,
      fontFamily: '"Cairo", "IBM Plex Sans Arabic", sans-serif', fontSize: '14px',
      margin: '0 auto', display: 'flex', flexDirection: 'column', boxSizing: 'border-box'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        .print-area, .print-area * { font-family: "Cairo", sans-serif; }
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body { margin: 0; padding: 0; background: white; }
          .print-area { box-shadow: none; border: none; }
        }
      `}</style>

      {/* شريط الهوية */}
      <div style={{ height: '6px', background: `linear-gradient(to left, ${C.blue}, #49CEF3 55%, ${C.green})` }} />

      <div style={{ padding: '10mm 15mm', flex: 1, display: 'flex', flexDirection: 'column' }}>
        
        {/* الترويسة (نفس أسلوب التقرير) */}
        <header style={{ display: 'flex', alignItems: 'center', gap: '15px', paddingBottom: '15px', borderBottom: `2px solid ${C.blue}` }}>
          <img src="/UST.png" alt="شعار الجامعة" style={{ width: '80px', height: '80px', objectFit: 'contain' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '22px', fontWeight: 800, color: C.blue }}>جامعة العلوم والتكنولوجيا</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.ink }}>كلية العلوم الإدارية والإنسانية</div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: C.gray }}>قسم الشريعة والقانون</div>
          </div>
          <div style={{ textAlign: 'center', background: C.blue, color: 'white', padding: '6px 20px', borderRadius: '20px', fontWeight: 800, fontSize: '16px' }}>
            إشعار تصحيح تكليف
          </div>
        </header>

        {/* بيانات الطالب والتكليف */}
        <section style={{ marginTop: '25px', background: C.paper, border: `1px solid ${C.line}`, borderRadius: '12px', padding: '15px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
            <div>
              <span style={{ fontSize: '13px', color: C.gray, fontWeight: 700 }}>اسم الطالب:</span>
              <div style={{ fontSize: '18px', fontWeight: 800, color: C.ink }}>{studentName}</div>
            </div>
            <div>
              <span style={{ fontSize: '13px', color: C.gray, fontWeight: 700 }}>الرقم المعرّف:</span>
              <div dir="ltr" style={{ fontSize: '18px', fontWeight: 800, color: C.blue, textAlign: 'right' }}>{studentNo}</div>
            </div>
            <div style={{ gridColumn: 'span 2', marginTop: '5px' }}>
              <span style={{ fontSize: '13px', color: C.gray, fontWeight: 700 }}>عنوان البحث:</span>
              <div style={{ fontSize: '20px', fontWeight: 800, color: C.blue }}>{assignmentTitle}</div>
            </div>
          </div>
        </section>

        {/* الدرجة */}
        <section style={{ marginTop: '30px', textAlign: 'center' }}>
          <div style={{ display: 'inline-block', background: score >= (maxScore*0.7) ? C.greenSoft : score >= (maxScore*0.5) ? C.blueSoft : C.redSoft, padding: '20px 60px', borderRadius: '20px', border: `2px dashed ${score >= (maxScore*0.7) ? C.green : score >= (maxScore*0.5) ? C.blue : C.red}` }}>
            <div style={{ fontSize: '16px', color: C.gray, fontWeight: 700, marginBottom: '5px' }}>الدرجة المحصلة</div>
            <div dir="ltr" style={{ fontSize: '48px', fontWeight: 800, color: score >= (maxScore*0.7) ? C.green : score >= (maxScore*0.5) ? C.blue : C.red }}>
              {score} / {maxScore}
            </div>
          </div>
        </section>

        {/* الملاحظات */}
        <section style={{ marginTop: '30px', flex: 1 }}>
          <h3 style={{ fontSize: '18px', fontWeight: 800, color: C.blue, borderBottom: `2px solid ${C.line}`, paddingBottom: '5px', marginBottom: '10px' }}>ملاحظات المدرس</h3>
          <div style={{ background: C.paper, padding: '15px', borderRadius: '8px', border: `1px solid ${C.line}`, minHeight: '100px', whiteSpace: 'pre-wrap', fontSize: '16px', lineHeight: 1.8 }}>
            {teacherNote || 'لم يتم إضافة ملاحظات نصية.'}
          </div>
        </section>

        {/* التنبيه */}
        <div style={{ marginTop: '30px', background: C.redSoft, border: `1px solid ${C.red}`, borderRadius: '8px', padding: '12px', fontSize: '13px', color: C.red, fontWeight: 700, textAlign: 'center' }}>
          ⚠️ تنبيه: يُمنع استخدام الذكاء الاصطناعي في كتابة المحتوى. تم فحص البحث.
        </div>

        {/* التذييل والتوقيع */}
        <footer style={{ marginTop: 'auto', paddingTop: '30px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div style={{ fontSize: '14px', color: C.gray }}>
            <div><b>تاريخ التصحيح:</b> {new Date(gradedAt).toLocaleDateString('ar-SA-u-nu-latn')}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <img src="/signature.png" alt="توقيع" style={{ height: '60px', marginBottom: '5px' }} />
            <div style={{ borderTop: `1px solid ${C.blue}`, paddingTop: '5px', width: '200px', fontWeight: 800, color: C.blue }}>
              {TEACHER}
            </div>
          </div>
        </footer>

      </div>
    </div>
  )
}
```

### 📄 `src\features\shared\InstitutionalReport.tsx`
```tsx
import type React from 'react'
import { useEffect, useRef } from 'react'
// خط Cairo محلي (نفس أصل التطبيق) ليُضمَّن داخل صورة التصدير ويطابق الشاشة تمامًا
import '@fontsource/cairo/400.css'
import '@fontsource/cairo/700.css'
import '@fontsource/cairo/800.css'

interface WeekMeta { id: string; number: number; title: string }
interface WeekData {
  week_number: number
  score: number | null
  possible: number
  percent: number | null
  status: string | null
  attendance: string | null
}
interface StudentRow {
  id: string
  full_name: string
  student_no: string | null
  weeks: WeekData[]
  total_score: number
  total_possible: number
  percent: number | null
  attendance_present: number
  attendance_excused: number
}

export interface InstitutionalSnapshot {
  from_week: number
  to_week: number
  weeks: WeekMeta[]
  students: StudentRow[]
  total_students: number
  generated_at: string
}

export type ReportMode = 'grades' | 'attendance'

interface Props {
  snapshot: InstitutionalSnapshot
  generatedAt: string
  mode: ReportMode
}

const C = {
  blue: '#0B6CB3',
  blueSoft: '#E6F2FA',
  cyan: '#49CEF3',
  cyanSoft: '#E8F8FD',
  green: '#198B48',
  greenSoft: '#E8F5ED',
  red: '#D74050',
  redSoft: '#FBEAEC',
  ink: '#123A2E',
  gray: '#4B5D63',
  line: '#D6E4EC',
  lineSoft: '#EEF3F6',
  paper: '#F7FBFD',
  mute: '#B9C6CC',
}

const TEACHER = 'د. محمد إسماعيل'

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('ar-SA-u-nu-latn', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch { return '—' }
}

function pctColor(p: number | null): string {
  if (p === null) return C.mute
  return p >= 70 ? C.green : p >= 50 ? C.blue : C.red
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

export default function InstitutionalReport({ snapshot, generatedAt, mode }: Props) {
  const { weeks, students, from_week, to_week, total_students } = snapshot
  const weeksCount = weeks.length

  // الطباعة عبر iframe معزول يحتوي التقرير وحده، بعيدًا عن أي CSS أو مودال في التطبيق.
  // أثناء عرض هذا المكوّن نستبدل window.print بنسخة تطبع الـ iframe، ثم نعيدها عند الإغلاق.
  const rootRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const originalPrint = window.print.bind(window)

    const printIsolated = () => {
      const el = rootRef.current
      if (!el) { originalPrint(); return }

      const iframe = document.createElement('iframe')
      iframe.setAttribute('aria-hidden', 'true')
      iframe.style.cssText =
        'position:fixed;right:0;bottom:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;'
      iframe.srcdoc =
        '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">' +
        '<style>@page{size:A4 portrait;margin:0}html,body{margin:0;padding:0;background:#fff}</style>' +
        '</head><body>' + el.outerHTML + '</body></html>'

      iframe.onload = async () => {
        const w = iframe.contentWindow
        const d = iframe.contentDocument
        if (!w || !d) { iframe.remove(); return }
        try { await d.fonts.ready } catch { /* تجاهل */ }
        await Promise.all(
          Array.from(d.images).map((img) =>
            img.complete
              ? Promise.resolve()
              : new Promise<void>((res) => { img.onload = () => res(); img.onerror = () => res() }),
          ),
        )
        await new Promise((r) => setTimeout(r, 400)) // مهلة قصيرة لتحميل خط Cairo
        w.focus()
        w.print()
        setTimeout(() => iframe.remove(), 60000)
      }
      document.body.appendChild(iframe)
    }

    // توليد PDF مباشر (صفحة A4 دقيقة) دون المرور بتقسيم المتصفح للصفحات
    const exportPdf = async () => {
      const el = rootRef.current
      if (!el) throw new Error('no element')
      const [{ toJpeg }, { jsPDF }] = await Promise.all([
        import('html-to-image'),
        import('jspdf'),
      ])
      try {
        await Promise.all([
          document.fonts.load('400 12px Cairo', 'أب1'),
          document.fonts.load('700 12px Cairo', 'أب1'),
          document.fonts.load('800 12px Cairo', 'أب1'),
        ])
        await document.fonts.ready
      } catch { /* تجاهل */ }
      // المتصفح نفسه يرسم التقرير (نفس ما تراه على الشاشة تمامًا)، دون أي تعديل على التنسيق
      const opts = {
        pixelRatio: 3, quality: 0.98, backgroundColor: '#ffffff', cacheBust: true,
      }
      // نلغي هامش التوسيط (auto) مؤقتًا كي لا ينتقل إلى الصورة فيزاح التقرير
      const prevMargin = el.style.margin
      el.style.margin = '0'
      let img: string
      try {
        await toJpeg(el, opts) // تسخين: أول استدعاء قد لا يحمّل الخطوط والصور بعد
        img = await toJpeg(el, opts)
      } finally {
        el.style.margin = prevMargin
      }
      const probe = new Image()
      probe.src = img
      await probe.decode()
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pageW = 210
      const pageH = 297
      const imgH = (probe.height * pageW) / probe.width
      if (imgH > pageH && imgH <= pageH * 1.12) {
        // زيادة طفيفة: نصغّر قليلًا ليبقى التقرير في صفحة واحدة
        const w = (pageW * pageH) / imgH
        pdf.addImage(img, 'JPEG', (pageW - w) / 2, 0, w, pageH)
      } else {
        pdf.addImage(img, 'JPEG', 0, 0, pageW, imgH)
        let left = imgH - pageH
        let pos = 0
        while (left > 1) {
          pos -= pageH
          pdf.addPage()
          pdf.addImage(img, 'JPEG', 0, pos, pageW, imgH)
          left -= pageH
        }
      }
      pdf.save(`institutional-report-weeks-${from_week}-${to_week}.pdf`)
    }

    window.print = () => {
      exportPdf().catch((err: unknown) => {
        console.error('PDF export failed:', err)
        const msg = err instanceof Error ? err.message : String(err)
        alert('تعذّر توليد ملف PDF:\n' + msg + '\n\nسيتم فتح نافذة الطباعة بدلًا منه.')
        printIsolated()
      })
    }
    return () => { window.print = originalPrint }
  }, [from_week, to_week])

  // حسابات النتائج
  const graded = students.filter((s) => s.percent !== null)
  const classAvg = graded.length === 0 ? 0
    : Math.round(graded.reduce((t, s) => t + (s.percent ?? 0), 0) / graded.length)
  const topPercent = graded.length === 0 ? 0
    : Math.max(...graded.map((s) => s.percent ?? 0))
  const lowPercent = graded.length === 0 ? 0
    : Math.min(...graded.map((s) => s.percent ?? 0))

  // الترتيب
  const ranked = [...students].sort((a, b) => {
    if (a.percent === null && b.percent === null) return 0
    if (a.percent === null) return 1
    if (b.percent === null) return -1
    return (b.percent ?? 0) - (a.percent ?? 0)
  })
  const rankMap: Record<string, number> = {}
  ranked.forEach((s, i) => { rankMap[s.id] = i + 1 })

  // الحضور
  const totalAttPossible = students.length * weeksCount
  const totalAttPresent = students.reduce((t, s) => t + s.attendance_present, 0)
  const classAttPercent = totalAttPossible === 0 ? 0
    : Math.round((totalAttPresent / totalAttPossible) * 100)

  const isGrades = mode === 'grades'
  const isAtt = mode === 'attendance'

  const titleLine = isGrades
    ? 'التقرير المؤسسي — كشف النتائج'
    : 'التقرير المؤسسي — كشف الحضور والغياب'

  return (
    <div
      ref={rootRef}
      dir="rtl"
      className="print-area"
      style={{
        width: '210mm',
        minHeight: '297mm',
        background: 'white',
        color: C.ink,
        fontFamily: '"Cairo", "IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif',
        fontSize: '11px',
        lineHeight: 1.5,
        boxSizing: 'border-box',
        margin: '0 auto',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
        pageBreakInside: 'avoid',
        breakInside: 'avoid',
      }}
    >
      <style>{`
        .print-area, .print-area * { font-family: "Cairo", "IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif; }
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body { margin: 0 !important; padding: 0 !important; background: white !important; height: auto !important; overflow: visible !important; }
          .print-area {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            position: static !important;
            width: 210mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
          }
        }
      `}</style>

      {/* شريط الهوية العلوي */}
      <div style={{ height: '6px', background: `linear-gradient(to left, ${C.blue}, ${C.cyan} 55%, ${C.green})` }} />

      <div style={{ padding: '8mm 10mm', display: 'flex', flexDirection: 'column', flex: 1 }}>
        {/* ============ الترويسة ============ */}
        <header style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '10px', borderBottom: `2px solid ${C.blue}` }}>
          <img src="/UST.png" alt="شعار الجامعة" style={{ width: '70px', height: '70px', objectFit: 'contain' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '20px', fontWeight: 800, color: C.blue }}>جامعة العلوم والتكنولوجيا</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: C.ink }}>كلية العلوم الإدارية والإنسانية</div>
            <div style={{ fontSize: '13px', fontWeight: 700, color: C.gray }}>قسم الشريعة والقانون</div>
            <div style={{ fontSize: '14px', fontWeight: 800, color: isGrades ? C.blue : C.green, marginTop: '3px' }}>
              {titleLine} — فقه المعاملات (1)
            </div>
          </div>
          <div style={{ textAlign: 'left', fontSize: '11px', color: C.gray, lineHeight: 1.6 }}>
            <div style={{ fontSize: '12px', fontWeight: 800, color: C.blue }}>الأسابيع: {from_week}–{to_week}</div>
            <div>عدد الأسابيع: {weeksCount}</div>
            <div style={{ marginTop: '2px' }}>{fmtDate(generatedAt)}</div>
            <div style={{ marginTop: '2px' }}>1448هـ — 2026م</div>
          </div>
        </header>

        {/* ============ الملخص ============ */}
        <section style={{ marginTop: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            <SummaryCard label="عدد الطلاب" value={String(total_students)} tone="primary" />
            {isGrades && (
              <>
                <SummaryCard label="متوسط النتائج" value={`${classAvg}%`} tone={classAvg >= 70 ? 'success' : classAvg >= 50 ? 'info' : 'error'} />
                <SummaryCard label="أعلى نتيجة" value={graded.length > 0 ? `${topPercent}%` : '—'} tone="success" />
                <SummaryCard label="أدنى نتيجة" value={graded.length > 0 ? `${lowPercent}%` : '—'} tone={lowPercent < 50 ? 'error' : 'info'} />
              </>
            )}
            {isAtt && (
              <>
                <SummaryCard label="متوسط الحضور" value={`${classAttPercent}%`} tone={classAttPercent >= 80 ? 'success' : classAttPercent >= 60 ? 'info' : 'error'} />
                <SummaryCard label="إجمالي الحضور" value={`${totalAttPresent} / ${totalAttPossible}`} tone="success" />
                <SummaryCard label="إجمالي الغياب" value={String(totalAttPossible - totalAttPresent)} tone={classAttPercent >= 80 ? 'ink' : 'error'} />
              </>
            )}
          </div>
        </section>

        {/* ============ جدول النتائج ============ */}
        {isGrades && (
          <section style={{ marginTop: '14px' }}>
            <SectionTitle>📊 كشف النتائج</SectionTitle>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thCell, width: '28px' }}>#</th>
                  <th style={thCell}>الطالب</th>
                  <th style={{ ...thCell, width: '60px' }}>الرقم</th>
                  {weeks.map((w) => (
                    <th key={w.id} style={{ ...thCell, width: '36px', textAlign: 'center' }}>أ{w.number}</th>
                  ))}
                  <th style={{ ...thCell, width: '76px', textAlign: 'center', whiteSpace: 'nowrap' }}>المجموع</th>
                  <th style={{ ...thCell, width: '52px', textAlign: 'center' }}>النسبة</th>
                  <th style={{ ...thCell, width: '44px', textAlign: 'center' }}>الترتيب</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => {
                  const prev = idx > 0 ? students[idx - 1] : null
                  const sameRankAsPrev = prev && prev.percent !== null && s.percent === prev.percent
                  const rank = rankMap[s.id]
                  const total1 = round1(s.total_score)
                  return (
                    <tr key={s.id} style={{ background: idx % 2 === 1 ? C.paper : 'white' }}>
                      <td style={{ ...tdCell, textAlign: 'center', fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ ...tdCell, fontWeight: 700 }}>{s.full_name}</td>
                      <td style={{ ...tdCell, fontFamily: 'monospace', fontSize: '10px' }} dir="ltr">{s.student_no ?? '—'}</td>
                      {s.weeks.map((wd, i) => {
                        const hasScore = wd.status === 'graded' && wd.score !== null
                        return (
                          <td key={i} style={{ ...tdCell, textAlign: 'center', fontWeight: 700, color: hasScore ? pctColor(wd.percent) : C.mute }}>
                            {hasScore ? round1(wd.score ?? 0) : '—'}
                          </td>
                        )
                      })}
                      <td style={{ ...tdCell, textAlign: 'center', fontWeight: 800, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }} dir="ltr">
                        {s.total_possible > 0 ? `${total1} / ${s.total_possible}` : '—'}
                      </td>
                      <td style={{ ...tdCell, textAlign: 'center', fontWeight: 800, color: pctColor(s.percent) }}>
                        {s.percent !== null ? `${s.percent}%` : '—'}
                      </td>
                      <td style={{ ...tdCell, textAlign: 'center', fontWeight: 800, color: C.blue }}>
                        {s.percent !== null ? (sameRankAsPrev ? `=${rank}` : `#${rank}`) : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </section>
        )}

        {/* ============ جدول الحضور ============ */}
        {isAtt && (
          <section style={{ marginTop: '14px' }}>
            <SectionTitle>📋 كشف الحضور والغياب</SectionTitle>
            <table style={tableStyle}>
              <thead>
                <tr>
                  <th style={{ ...thCell, width: '28px' }}>#</th>
                  <th style={thCell}>الطالب</th>
                  <th style={{ ...thCell, width: '60px' }}>الرقم</th>
                  {weeks.map((w) => (
                    <th key={w.id} style={{ ...thCell, width: '38px', textAlign: 'center' }}>أ{w.number}</th>
                  ))}
                  <th style={{ ...thCell, width: '72px', textAlign: 'center', whiteSpace: 'nowrap' }}>الحضور</th>
                  <th style={{ ...thCell, width: '52px', textAlign: 'center' }}>النسبة</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s, idx) => {
                  const presentPercent = weeksCount > 0
                    ? Math.round((s.attendance_present / weeksCount) * 100)
                    : 0
                  const noData = s.weeks.every((w) => w.attendance === null)
                  return (
                    <tr key={s.id} style={{ background: idx % 2 === 1 ? C.paper : 'white' }}>
                      <td style={{ ...tdCell, textAlign: 'center', fontWeight: 700 }}>{idx + 1}</td>
                      <td style={{ ...tdCell, fontWeight: 700 }}>{s.full_name}</td>
                      <td style={{ ...tdCell, fontFamily: 'monospace', fontSize: '10px' }} dir="ltr">{s.student_no ?? '—'}</td>
                      {s.weeks.map((wd, i) => {
                        const st = wd.attendance
                        const color = st === 'present' ? C.green : st === 'absent' ? C.red : st === 'excused' ? C.blue : C.mute
                        const label = st === 'present' ? '✓' : st === 'absent' ? '✗' : st === 'excused' ? 'ع' : '—'
                        return (
                          <td key={i} style={{ ...tdCell, textAlign: 'center', fontWeight: 800, color }}>
                            {label}
                          </td>
                        )
                      })}
                      <td style={{ ...tdCell, textAlign: 'center', fontWeight: 800, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }} dir="ltr">
                        {noData ? '—' : `${s.attendance_present} / ${weeksCount}`}
                      </td>
                      <td style={{ ...tdCell, textAlign: 'center', fontWeight: 800, color: noData ? C.mute : presentPercent >= 80 ? C.green : presentPercent >= 60 ? C.blue : C.red }}>
                        {noData ? '—' : `${presentPercent}%`}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>

            <div style={{ marginTop: '8px', marginBottom: '14px', paddingBottom: '4px', display: 'flex', gap: '16px', fontSize: '10px', lineHeight: 1.8, color: C.gray }}>
              <span><b style={{ color: C.green }}>✓</b> حاضر</span>
              <span><b style={{ color: C.red }}>✗</b> غائب</span>
              <span><b style={{ color: C.blue }}>ع</b> معذور (يُحسب غائبًا في عمود الحضور)</span>
            </div>
          </section>
        )}

        {/* ============ التذييل ============ */}
        <footer style={{ marginTop: 'auto', paddingTop: '10px', borderTop: `2px solid ${C.blue}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '20px' }}>
            <div style={{ fontSize: '11px', color: C.gray, lineHeight: 1.8 }}>
              <div><b style={{ color: C.blue }}>مدرس المقرر:</b> <b>{TEACHER}</b></div>
              <div><b style={{ color: C.blue }}>تاريخ الإصدار:</b> {fmtDate(generatedAt)}</div>
              <div><b style={{ color: C.blue }}>العام الدراسي:</b> 1448هـ — 2026م</div>
            </div>
            <div style={{ width: '240px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <img
                src="/signature.png"
                alt="توقيع المدرس"
                style={{
                  height: '72px', width: 'auto', maxWidth: '240px',
                  display: 'block', opacity: 0.92, marginBottom: '2px',
                }}
              />
              <div style={{ width: '220px', borderTop: `1.5px solid ${C.blue}`, paddingTop: '2px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: C.blue }}>
                {TEACHER}
              </div>
            </div>
          </div>
        </footer>
      </div>

      <div style={{ height: '4px', background: `linear-gradient(to left, ${C.green}, ${C.cyan} 45%, ${C.blue})` }} />
    </div>
  )
}

/* ============ مكونات وأنماط ============ */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      margin: '0 0 6px', fontSize: '14px', fontWeight: 800, color: C.blue,
      display: 'flex', alignItems: 'center', gap: '8px',
    }}>
      <span style={{ width: '4px', height: '14px', borderRadius: '2px', background: C.blue, display: 'inline-block' }} />
      {children}
      <span style={{ flex: 1, height: '1px', background: C.line }} />
    </h2>
  )
}

function SummaryCard({ label, value, tone, hint }: { label: string; value: string; tone: 'primary' | 'success' | 'info' | 'error' | 'ink'; hint?: string }) {
  const tones: Record<string, { soft: string; accent: string; text: string }> = {
    primary: { soft: C.blueSoft, accent: C.blue, text: C.blue },
    success: { soft: C.greenSoft, accent: C.green, text: C.green },
    info:    { soft: C.cyanSoft, accent: C.cyan, text: C.blue },
    error:   { soft: C.redSoft, accent: C.red, text: C.red },
    ink:     { soft: C.paper, accent: C.gray, text: C.ink },
  }
  const t = tones[tone]
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '8px 10px',
      background: `linear-gradient(135deg, #FFFFFF 0%, ${t.soft} 100%)`,
      border: `1px solid ${C.line}`, borderTop: `3px solid ${t.accent}`, borderRadius: '8px',
      boxShadow: '0 1px 2px rgba(11,108,179,0.10)',
    }}>
      <div style={{ flex: 1, textAlign: 'center' }}>
        <div style={{ fontSize: '10px', color: C.gray, fontWeight: 700, lineHeight: 1.4 }}>
          {label}
          {hint && <span style={{ fontSize: '8.5px', fontWeight: 500, marginRight: '3px' }}>{hint}</span>}
        </div>
        <div style={{ fontSize: '18px', fontWeight: 800, color: t.text, lineHeight: 1.3, fontVariantNumeric: 'tabular-nums' }}>
          {value}
        </div>
      </div>
    </div>
  )
}

const tableStyle: React.CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  border: `1px solid ${C.line}`,
  fontSize: '11px',
  background: 'white',
}

const thCell: React.CSSProperties = {
  padding: '5px 6px',
  background: C.blueSoft,
  color: C.blue,
  fontWeight: 800,
  textAlign: 'right',
  borderBottom: `2px solid ${C.blue}`,
  borderLeft: `1px solid ${C.lineSoft}`,
  fontSize: '10.5px',
}

const tdCell: React.CSSProperties = {
  padding: '4px 6px',
  borderBottom: `1px solid ${C.line}`,
  borderLeft: `1px solid ${C.lineSoft}`,
  fontSize: '11px',
  lineHeight: 1.4,
}

```

### 📄 `src\features\shared\WeeklyReport.tsx`
```tsx
import type React from 'react'

interface WeekEntry {
  number: number
  title: string
  total_possible: number
  has_attempt: boolean
  auto_score?: number
  manual_score?: number
  final_score?: number
  percent?: number
  status?: string
  submitted_at?: string | null
  rank?: number | null
  class_count?: number
  class_avg?: number
  class_top?: number
}

export interface ReportSnapshot {
  student: { id: string; full_name: string; student_no: string }
  from_week: number
  to_week: number
  type: 'weekly' | 'cumulative'
  weeks: WeekEntry[]
  totals: { total_possible: number; student_total: number; percent: number }
  generated_at: string
}

interface Props {
  snapshot: ReportSnapshot
  reportNumber: string | null
  approvedAt: string
  teacherNote: string | null
}

/* ============ الهوية اللونية ============ */
const C = {
  blue: '#0B6CB3',
  blueSoft: '#E6F2FA',
  cyan: '#49CEF3',
  cyanSoft: '#E8F8FD',
  green: '#198B48',
  greenSoft: '#E8F5ED',
  red: '#D74050',
  redSoft: '#FBEAEC',
  ink: '#123A2E',
  gray: '#4B5D63',
  line: '#D6E4EC',
  paper: '#F7FBFD',
  mute: '#B9C6CC',
}

const TEACHER = 'د. محمد إسماعيل'

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('ar-SA-u-nu-latn', {
      year: 'numeric', month: 'long', day: 'numeric',
    })
  } catch {
    return '—'
  }
}

function statusLabel(s?: string | null): string {
  if (!s) return '—'
  if (s === 'graded') return 'مصحح'
  if (s === 'submitted') return 'بانتظار التصحيح'
  if (s === 'draft') return 'مسودة'
  return s
}

function statusTone(s?: string | null) {
  if (s === 'graded') return { bg: C.greenSoft, fg: C.green }
  if (s === 'submitted') return { bg: C.blueSoft, fg: C.blue }
  return { bg: '#EEF2F4', fg: C.gray }
}

function percentColor(p: number) {
  return p >= 70 ? C.green : p >= 50 ? C.blue : C.red
}

/* أرقام بصيغة "الدرجة / الكامل" بدون انعكاس الاتجاه في RTL */
function Score({ value, total, style }: { value: React.ReactNode; total: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span dir="ltr" style={{ unicodeBidi: 'isolate', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap', ...style }}>
      {value} <span style={{ opacity: 0.45, fontWeight: 500 }}>/</span> {total}
    </span>
  )
}

export default function WeeklyReport({ snapshot, reportNumber, approvedAt, teacherNote }: Props) {
  const { student, from_week, to_week, type, weeks, totals } = snapshot
  const isWeekly = type === 'weekly'
  const gradedWeeks = weeks.filter((w) => w.has_attempt && w.status === 'graded')
  const totalPossible = totals.total_possible
  const studentTotal = totals.student_total
  const percent = totals.percent
  const accent = C.blue
  const accentSoft = C.blueSoft
  const single = gradedWeeks.length === 1 ? gradedWeeks[0] : null

  return (
    <div
      dir="rtl"
      className="print-area"
      style={{
        width: '210mm',
        height: '297mm',
        background: 'white',
        color: C.ink,
        fontFamily: '"Cairo", "IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif',
        fontSize: '13px',
        lineHeight: 1.6,
        boxSizing: 'border-box',
        margin: '0 auto',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact',
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');
        .print-area, .print-area * { font-family: "Cairo", "IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif; }
        @page { size: A4 portrait; margin: 0; }
        @media print {
          /* اطبع التقرير وحده: أخفِ كل ما سواه دون أن يشغل مساحة صفحة إضافية */
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            width: 210mm !important;
            height: 295mm !important;
            max-height: 295mm !important;
            overflow: hidden !important;
            background: white !important;
          }
          body * { visibility: hidden !important; }
          .print-area, .print-area * { visibility: visible !important; }
          .print-area {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
            /* fixed: يثبّت الورقة على زاوية الصفحة مهما كانت حاويات الواجهة حولها */
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            right: auto !important;
            bottom: auto !important;
            transform: none !important;
            zoom: 1 !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
            width: 210mm !important;
            height: 295mm !important;
            max-height: 295mm !important;
            overflow: hidden !important;
          }
          /* ورقة واحدة فقط: لا حاجة لقواعد منع التقسيم داخلها (كروم قد يحذف أو يزيح عناصر بسببها) */
          .print-area, .print-area * {
            break-inside: auto !important;
            page-break-inside: auto !important;
            break-before: auto !important;
            break-after: auto !important;
          }
        }
      `}</style>

      {/* شريط الهوية العلوي */}
      <div style={{ height: '6px', background: `linear-gradient(to left, ${C.blue}, ${C.cyan} 55%, ${C.green})`, flexShrink: 0 }} />

      <div style={{ padding: '8mm 11mm 8mm', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
        {/* ================= الترويسة ================= */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            paddingBottom: '10px',
            borderBottom: `1px solid ${C.line}`,
          }}
        >
          {/* الشعار + الجهة (ثلاثة أسطر) */}
          <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/UST.png" alt="شعار الجامعة" style={{ width: '72px', height: '72px', objectFit: 'contain', flexShrink: 0 }} />
            <div style={{ lineHeight: 1.5 }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: C.blue }}>جامعة العلوم والتكنولوجيا</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.ink }}>كلية العلوم الإدارية والإنسانية</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: C.gray }}>قسم الشريعة والقانون</div>
            </div>
          </div>

          {/* الوسط: المستوى + المقرر */}
          <div
            style={{
              flexShrink: 0,
              textAlign: 'center',
              padding: '0 16px',
              borderInline: `1px solid ${C.line}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '5px',
            }}
          >
            <span
              style={{
                background: C.blue,
                color: 'white',
                fontWeight: 800,
                fontSize: '14.5px',
                padding: '1px 16px',
                borderRadius: '20px',
              }}
            >
              المستوى الثاني
            </span>
            <span style={{ fontSize: '16px', fontWeight: 800, color: C.green, lineHeight: 1.4 }}>
              المقرر: فقه المعاملات (1)
            </span>
          </div>

          {/* الركن: رقم التقرير + التاريخ */}
          <div
            style={{
              flexShrink: 0,
              minWidth: '118px',
              border: `1px solid ${C.line}`,
              borderRadius: '8px',
              background: C.paper,
              overflow: 'hidden',
              textAlign: 'center',
            }}
          >
            <div style={{ padding: '3px 10px', background: C.blue, color: 'white', fontSize: '10.5px', fontWeight: 700 }}>
              رقم التقرير
            </div>
            <div
              dir="ltr"
              style={{ padding: '3px 10px 0', fontFamily: 'monospace', fontWeight: 800, color: C.blue, fontSize: '12.5px' }}
            >
              {reportNumber ?? '—'}
            </div>
            <div style={{ padding: '0 10px 4px', fontSize: '11px', color: C.gray, fontWeight: 600 }}>
              {fmtDate(approvedAt)}
            </div>
          </div>
        </header>

        {/* ================= شريط المدى ================= */}
        <div
          style={{
            marginTop: '10px',
            padding: '6px 12px',
            background: accentSoft,
            borderInlineStart: `5px solid ${accent}`,
            borderRadius: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '16px', fontWeight: 800, color: accent }}>
            نتيجة الاختبار الأسبوعية
            <span style={{ margin: '0 8px', color: C.mute }}>|</span>
            {isWeekly
              ? `تقرير الأسبوع ${from_week}`
              : `تقرير تراكمي — من الأسبوع ${from_week} إلى الأسبوع ${to_week}`}
          </div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: C.gray,
              background: '#FFFFFF',
              padding: '2px 12px',
              borderRadius: '20px',
              border: `1px solid ${C.line}`,
              whiteSpace: 'nowrap',
            }}
          >
            عدد الأسابيع: {weeks.length}
          </div>
        </div>

        {/* ================= بيانات الطالب (صف واحد) ================= */}
        <section style={{ marginTop: '12px' }}>
          <SectionTitle>بيانات الطالب</SectionTitle>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              padding: '7px 14px',
              border: `1px solid ${C.line}`,
              borderRadius: '8px',
              background: C.paper,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', minWidth: 0 }}>
              <span style={{ fontSize: '12.5px', color: C.gray, fontWeight: 700, whiteSpace: 'nowrap' }}>الاسم الكامل:</span>
              <span style={{ fontSize: '15px', fontWeight: 800, color: C.ink }}>{student.full_name}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexShrink: 0 }}>
              <span style={{ fontSize: '12.5px', color: C.gray, fontWeight: 700, whiteSpace: 'nowrap' }}>الرقم المعرّف:</span>
              <span dir="ltr" style={{ fontFamily: 'monospace', fontSize: '15px', fontWeight: 800, color: C.blue, unicodeBidi: 'isolate' }}>
                {student.student_no}
              </span>
            </div>
          </div>
        </section>

        {/* ================= ملخص النتيجة ================= */}
        <section style={{ marginTop: '12px' }}>
          <SectionTitle>ملخص النتيجة</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1.3fr 1fr', gap: '8px' }}>
            <div style={cardStyle(C.blue, C.blueSoft)}>
              <div style={cardLabel}>الدرجة المحصّلة</div>
              <Score value={studentTotal} total={totalPossible} style={{ ...cardValue, color: C.blue }} />
            </div>
            <div style={cardStyle(percentColor(percent), percent >= 70 ? C.greenSoft : percent >= 50 ? C.blueSoft : C.redSoft)}>
              <div style={cardLabel}>النسبة المئوية</div>
              <div style={{ ...cardValue, color: percentColor(percent) }}>{percent}%</div>
              <div style={{ height: '4px', background: 'rgba(255,255,255,0.9)', borderRadius: '4px', marginTop: '4px', overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, Math.max(0, percent))}%`, height: '100%', background: percentColor(percent) }} />
              </div>
            </div>
            <div style={cardStyle(C.gray, C.paper)}>
              <div style={cardLabel}>ترتيب الطالب</div>
              <div style={{ ...cardValue, color: C.ink }}>
                {single && single.rank ? (
                  <span dir="ltr" style={{ unicodeBidi: 'isolate' }}>
                    #{single.rank} <span style={{ fontSize: '12px', color: C.gray, fontWeight: 600 }}>من {single.class_count ?? '—'}</span>
                  </span>
                ) : '—'}
              </div>
            </div>
          </div>
        </section>

        {/* ================= تفصيل الأسابيع ================= */}
        <section style={{ marginTop: '12px' }}>
          <SectionTitle>تفصيل الأسابيع</SectionTitle>
          <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, border: `1px solid ${C.line}`, borderRadius: '8px', overflow: 'hidden', fontSize: '12.5px' }}>
            <thead>
              <tr>
                <th style={{ ...th, width: '46px', textAlign: 'center' }}>الأسبوع</th>
                <th style={th}>عنوان الدرس</th>
                <th style={{ ...th, width: '80px', textAlign: 'center' }}>الدرجة</th>
                <th style={{ ...th, width: '96px', textAlign: 'center' }}>النسبة</th>
                <th style={{ ...th, width: '92px', textAlign: 'center' }}>الحالة</th>
                <th style={{ ...th, width: '96px', textAlign: 'center' }}>تاريخ الأداء</th>
              </tr>
            </thead>
            <tbody>
              {weeks.map((w, i) => {
                const bg = i % 2 === 1 ? C.paper : 'white'
                const st = w.has_attempt ? statusTone(w.status) : { bg: '#EEF2F4', fg: C.mute }
                const p = w.percent ?? 0
                return (
                  <tr key={w.number} style={{ background: bg }}>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          width: '24px',
                          height: '24px',
                          lineHeight: '24px',
                          borderRadius: '50%',
                          background: C.blueSoft,
                          color: C.blue,
                          fontWeight: 800,
                          fontSize: '12.5px',
                        }}
                      >
                        {w.number}
                      </span>
                    </td>
                    <td style={{ ...td, fontWeight: 700 }}>{w.title || '—'}</td>
                    <td style={{ ...td, textAlign: 'center', fontWeight: 800 }}>
                      <Score
                        value={w.has_attempt ? (w.final_score ?? 0) : '—'}
                        total={w.total_possible}
                        style={{ color: w.has_attempt ? C.ink : C.mute }}
                      />
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      {w.has_attempt ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                          <span style={{ fontWeight: 800, color: percentColor(p), minWidth: '34px', fontVariantNumeric: 'tabular-nums' }}>{p}%</span>
                          <span style={{ width: '34px', height: '6px', background: '#E8EEF2', borderRadius: '3px', overflow: 'hidden', display: 'inline-block' }}>
                            <span style={{ display: 'block', width: `${Math.min(100, p)}%`, height: '100%', background: percentColor(p) }} />
                          </span>
                        </div>
                      ) : (
                        <span style={{ color: C.mute }}>—</span>
                      )}
                    </td>
                    <td style={{ ...td, textAlign: 'center' }}>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '1px 10px',
                          borderRadius: '20px',
                          background: st.bg,
                          color: st.fg,
                          fontSize: '11.5px',
                          fontWeight: 700,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {w.has_attempt ? statusLabel(w.status) : 'لا محاولة'}
                      </span>
                    </td>
                    <td style={{ ...td, textAlign: 'center', fontSize: '11.5px', color: C.gray }}>
                      {w.submitted_at ? fmtDate(w.submitted_at) : '—'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </section>

        {/* ================= المقارنة ================= */}
        {gradedWeeks.length > 0 && (() => {
          const w = gradedWeeks[0]
          const max = Math.max(w.total_possible, w.class_top ?? 0, 1)
          return (
            <section style={{ marginTop: '12px', pageBreakInside: 'avoid' }}>
              <SectionTitle>
                {isWeekly ? 'مقارنة أدائك بالمجموعة' : 'المقارنة (تعتمد على أحدث أسبوع مصحح)'}
              </SectionTitle>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  padding: '8px 12px',
                  border: `1px solid ${C.line}`,
                  borderRadius: '8px',
                  background: C.paper,
                }}
              >
                <BarRow label="أنت" value={w.final_score ?? 0} max={max} color={C.blue} total={w.total_possible} />
                <BarRow label="متوسط المجموعة" value={w.class_avg ?? 0} max={max} color={C.cyan} total={w.total_possible} />
                <BarRow label="أعلى نتيجة" value={w.class_top ?? 0} max={max} color={C.green} total={w.total_possible} />
              </div>
            </section>
          )
        })()}

        {/* ================= ملاحظة المدرس ================= */}
        {teacherNote && (
          <section style={{ marginTop: '12px', pageBreakInside: 'avoid' }}>
            <SectionTitle>ملاحظة المدرس</SectionTitle>
            <div
              style={{
                padding: '8px 12px',
                background: C.paper,
                border: `1px solid ${C.line}`,
                borderInlineStart: `5px solid ${C.blue}`,
                borderRadius: '8px',
                fontSize: '13px',
                lineHeight: 1.8,
                whiteSpace: 'pre-wrap',
                color: C.ink,
                fontWeight: 500,
              }}
            >
              {teacherNote}
            </div>
          </section>
        )}

        {/* ================= التذييل + التوقيع ================= */}
        <footer style={{ marginTop: 'auto', paddingTop: '8px', flexShrink: 0 }}>
          <div
            style={{
              padding: '6px 10px',
              background: C.blueSoft,
              border: `1px solid ${C.line}`,
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '12px',
              fontWeight: 700,
              lineHeight: 1.6,
              color: C.blue,
              flexShrink: 0,
            }}
          >
            مقرر المستوى الثاني - قسم الشريعة والقانون - فقه المعاملات (1) - مدرس المقرر: {TEACHER}
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '16px', marginTop: '6px' }}>
            <div style={{ fontSize: '12px', color: C.gray, fontWeight: 600 }}>
              <b style={{ color: C.blue }}>العام الدراسي:</b> 1448هـ — 2026م
            </div>

            <div style={{ position: 'relative', width: '220px', height: '78px', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <img
                src="/signature.png"
                alt="توقيع المدرس"
                style={{
                  position: 'absolute',
                  top: '-4px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '190px',
                  height: '64px',
                  objectFit: 'contain',
                  opacity: 0.92,
                  pointerEvents: 'none',
                }}
              />
              <div
                style={{
                  width: '210px',
                  borderTop: `1.5px solid ${C.blue}`,
                  paddingTop: '2px',
                  textAlign: 'center',
                  fontSize: '12px',
                  fontWeight: 700,
                  color: C.blue,
                }}
              >
                {TEACHER}
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* شريط الهوية السفلي */}
      <div style={{ height: '4px', background: `linear-gradient(to left, ${C.green}, ${C.cyan} 45%, ${C.blue})`, flexShrink: 0 }} />
    </div>
  )
}

/* ============ مكوّنات وأنماط فرعية ============ */

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        margin: '0 0 6px',
        fontSize: '14.5px',
        fontWeight: 800,
        color: C.blue,
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        lineHeight: 1.4,
      }}
    >
      <span style={{ width: '4px', height: '16px', borderRadius: '2px', background: C.blue, display: 'inline-block' }} />
      {children}
      <span style={{ flex: 1, height: '1px', background: C.line }} />
    </h2>
  )
}

function BarRow({ label, value, max, color, total }: { label: string; value: number; max: number; color: string; total: number }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <span style={{ width: '96px', fontSize: '12.5px', fontWeight: 700, color: C.ink, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: '12px', background: '#E8EEF2', borderRadius: '6px', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: '6px' }} />
      </div>
      <Score value={value} total={total} style={{ width: '64px', textAlign: 'start', fontSize: '12.5px', fontWeight: 800, color: C.ink, flexShrink: 0 }} />
    </div>
  )
}

const cardStyle = (border: string, bg: string): React.CSSProperties => ({
  padding: '7px 10px',
  background: bg,
  borderTop: `4px solid ${border}`,
  borderRadius: '6px',
  textAlign: 'center',
})

const cardLabel: React.CSSProperties = { fontSize: '11.5px', color: C.gray, fontWeight: 700 }

const cardValue: React.CSSProperties = {
  display: 'block',
  fontSize: '20px',
  fontWeight: 800,
  lineHeight: 1.4,
  fontVariantNumeric: 'tabular-nums',
}

const th: React.CSSProperties = {
  padding: '6px 8px',
  background: C.blueSoft,
  color: C.blue,
  fontWeight: 800,
  textAlign: 'right',
  borderBottom: `2px solid ${C.blue}`,
  fontSize: '12px',
}

const td: React.CSSProperties = {
  padding: '5px 8px',
  height: '30px',
  color: C.ink,
  borderBottom: `1px solid ${C.line}`,
  verticalAlign: 'middle',
  lineHeight: 1.4,
}
```

### 📄 `src\features\student\FeedTab.tsx`
```tsx
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../app/auth-context'
import { supabase } from '../../lib/supabase'

const BUCKET = 'platform-files'
const CURRICULUM_BUCKET = 'course-files'
const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const btnDanger = 'rounded-xl border border-error bg-white px-3 py-1.5 text-sm font-semibold text-error hover:bg-error-soft disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink'
const label = 'text-sm font-semibold text-primary'

type PostKind = 'announcement' | 'post' | 'image' | 'file' | 'video' | 'link'
type MaterialKind = 'document' | 'slides' | 'link'

interface PostRow {
  id: string; author_id: string; kind: PostKind
  title: string | null; body: string | null
  attachment_path: string | null; external_url: string | null
  pinned: boolean; hidden: boolean
  allow_comments: boolean; show_names: boolean
  linked_type: string | null; linked_id: string | null
  created_at: string; updated_at: string | null
}

interface CommentRow {
  id: string; post_id: string; author_id: string
  text: string; hidden: boolean; created_at: string
}

interface ProfileLite { id: string; full_name: string; role: 'teacher' | 'student' }

interface MaterialRow {
  id: string; week_id: string; lesson_id: string | null
  title: string; kind: MaterialKind
  view_path: string | null; download_path: string | null; url: string | null
}
interface MaterialWithCtx extends MaterialRow {
  week_number: number; lesson_title: string | null
}

// ⬇️ مُحدَّث: أوائل النشاط المفتوح حاليًا فقط
interface RankRow {
  activity_id: string
  activity_title: string
  week_number: number
  student_id: string
  full_name: string
  student_no: string | null
  earned: number
  possible: number
  percent: number
}

// ⬇️ جديد: بيانات النشاط المفتوح حاليًا (لعرض العنوان في الحالة الفارغة)
interface CurrentActivity {
  id: string
  title: string
  weekNumber: number
}

interface BestRow { activity_title: string; student_name: string; percent: number }
interface StatsRow { students: number; lessons: number; materials: number; weeks: number; questions: number; attempts: number }

const KIND_LABEL: Record<PostKind, string> = {
  announcement: 'إعلان', post: 'منشور', image: 'صورة',
  file: 'ملف', video: 'فيديو', link: 'رابط',
}
const KIND_EMOJI: Record<PostKind, string> = {
  announcement: '📢', post: '📝', image: '🖼️',
  file: '📎', video: '🎥', link: '🔗',
}
const KIND_STYLE: Record<PostKind, string> = {
  announcement: 'bg-accent-soft/60 text-primary border-accent/40',
  post:         'bg-primary-soft text-primary border-primary/20',
  image:        'bg-secondary-soft text-secondary border-secondary/20',
  file:         'bg-warning-soft text-ink border-warning',
  video:        'bg-error-soft text-error border-error/30',
  link:         'bg-ink/5 text-ink border-ink/20',
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : 'bin'
}

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`
  return new Date(iso).toLocaleDateString('ar-SA')
}

function renderWithLinks(text: string): React.ReactNode[] {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noreferrer" className="break-all font-semibold text-primary underline hover:text-primary-hover">
          {part}
        </a>
      )
    }
    return <span key={i}>{part}</span>
  })
}

const AVATAR_COLORS = [
  'from-primary to-primary-hover',
  'from-secondary to-secondary-hover',
  'from-accent to-primary',
  'from-warning to-secondary',
  'from-error to-warning',
  'from-primary to-accent',
]
function avatarGradient(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

export default function FeedTab() {
  const { profile } = useAuth()
  const isTeacher = profile?.role === 'teacher'
  const me = profile?.id ?? ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [comments, setComments] = useState<CommentRow[]>([])
  const [likesByPost, setLikesByPost] = useState<Record<string, string[]>>({})
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileLite>>({})
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [materials, setMaterials] = useState<MaterialWithCtx[]>([])

  const [ranking, setRanking] = useState<RankRow[]>([])
  const [currentActivity, setCurrentActivity] = useState<CurrentActivity | null>(null)
  const [best, setBest] = useState<BestRow | null>(null)
  const [stats, setStats] = useState<StatsRow>({
    students: 0, lessons: 0, materials: 0, weeks: 0, questions: 0, attempts: 0,
  })

  const [showAdd, setShowAdd] = useState(false)

  const loadAll = useCallback(async () => {
    if (!supabase) return
    setLoading(true); setError(null)

    const [
      pRes, cRes, lRes, rRes, curActRes, bRes, stRes, lsRes, msRes, wkRes, qRes, atRes,
    ] = await Promise.all([
      supabase.from('posts').select('id,author_id,kind,title,body,attachment_path,external_url,pinned,hidden,allow_comments,show_names,linked_type,linked_id,created_at,updated_at').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('post_comments').select('id,post_id,author_id,text,hidden,created_at').order('created_at'),
      supabase.from('post_likes').select('post_id,student_id'),
      // ⬇️ RPC الجديد: أوائل النشاط المفتوح حاليًا
      supabase.rpc('current_activity_ranking'),
      // ⬇️ بيانات النشاط المفتوح (لعرض العنوان في الحالة الفارغة)
      supabase
        .from('activities')
        .select('id,title,week_id,weeks(number)')
        .eq('open', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase.rpc('best_activity_score'),
      supabase.from('profiles_public').select('id,full_name,role'),
      supabase.from('lessons').select('id'),
      supabase.from('materials').select('id,week_id,lesson_id,title,kind,view_path,download_path,url'),
      supabase.from('weeks').select('id,number'),
      supabase.from('questions').select('id'),
      supabase.from('attempts').select('id'),
    ])

    if (pRes.error || cRes.error || lRes.error) {
      setError('تعذّر تحميل بيانات المنصة.')
      setLoading(false); return
    }

    const postsList = (pRes.data ?? []) as PostRow[]
    const commentsList = (cRes.data ?? []) as CommentRow[]
    const likesList = (lRes.data ?? []) as { post_id: string; student_id: string }[]

    const profMap: Record<string, ProfileLite> = {}
    for (const p of (stRes.data ?? []) as ProfileLite[]) profMap[p.id] = p

    const signed: Record<string, string> = {}
    for (const p of postsList) {
      if (p.attachment_path) {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(p.attachment_path, 86400)
        if (data?.signedUrl) signed[p.id] = data.signedUrl
      }
    }

    const rawMaterials = (msRes.data ?? []) as MaterialRow[]
    const weekMap: Record<string, number> = {}
    for (const w of (wkRes.data ?? []) as { id: string; number: number }[]) weekMap[w.id] = w.number
    const lessonMap: Record<string, string> = {}
    if (rawMaterials.length > 0) {
      const lessonIds = Array.from(new Set(rawMaterials.map((m) => m.lesson_id).filter(Boolean) as string[]))
      if (lessonIds.length > 0) {
        const lRes2 = await supabase.from('lessons').select('id,title').in('id', lessonIds)
        for (const l of (lRes2.data ?? []) as { id: string; title: string }[]) lessonMap[l.id] = l.title
      }
    }
    const mats: MaterialWithCtx[] = rawMaterials.map((m) => ({
      ...m,
      week_number: weekMap[m.week_id] ?? 0,
      lesson_title: m.lesson_id ? lessonMap[m.lesson_id] ?? null : null,
    }))

    const lb: Record<string, string[]> = {}
    for (const l of likesList) (lb[l.post_id] ??= []).push(l.student_id)

    setPosts(postsList)
    setComments(commentsList)
    setLikesByPost(lb)
    setProfilesMap(profMap)
    setSignedUrls(signed)
    setMaterials(mats)

    // ⬇️ أوائل النشاط المفتوح حاليًا
    if (!rRes.error) setRanking((rRes.data ?? []) as RankRow[])

    // ⬇️ بيانات النشاط المفتوح (للحالة الفارغة)
    type RawAct = { id: string; title: string; week_id: string; weeks: unknown }
    const rawAct = curActRes.data as RawAct | null
    if (rawAct) {
      const wkRel = rawAct.weeks as { number: number } | { number: number }[] | null
      const wkNum = Array.isArray(wkRel) ? (wkRel[0]?.number ?? 0) : (wkRel?.number ?? 0)
      setCurrentActivity({ id: rawAct.id, title: rawAct.title, weekNumber: wkNum })
    } else {
      setCurrentActivity(null)
    }

    const bArr = (bRes.data ?? []) as BestRow[]
    setBest(bArr[0] ?? null)

    setStats({
      students: ((stRes.data ?? []) as unknown[]).length,
      lessons: ((lsRes.data ?? []) as unknown[]).length,
      materials: rawMaterials.length,
      weeks: ((wkRes.data ?? []) as unknown[]).length,
      questions: ((qRes.data ?? []) as unknown[]).length,
      attempts: ((atRes.data ?? []) as unknown[]).length,
    })

    setLoading(false)
  }, [])

  useEffect(() => { void loadAll() }, [loadAll])

  async function toggleLike(postId: string) {
    if (!supabase || !me) return
    const liked = (likesByPost[postId] ?? []).includes(me)
    if (liked) {
      const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('student_id', me)
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.from('post_likes').insert({ post_id: postId, student_id: me })
      if (error) setError(error.message)
    }
    await loadAll()
  }

  async function addComment(postId: string, text: string) {
    if (!supabase || !me) return
    const t = text.trim(); if (!t) return
    const { error } = await supabase.from('post_comments').insert({ post_id: postId, author_id: me, text: t })
    if (error) { setError(error.message); return }
    await loadAll()
  }

  async function deleteComment(id: string) {
    if (!supabase) return
    if (!window.confirm('حذف هذا التعليق؟')) return
    const { error } = await supabase.from('post_comments').delete().eq('id', id)
    if (error) setError(error.message); else await loadAll()
  }

  async function togglePin(p: PostRow) {
    if (!supabase) return
    const { error } = await supabase.from('posts').update({ pinned: !p.pinned }).eq('id', p.id)
    if (error) setError(error.message); else await loadAll()
  }

  async function hidePost(p: PostRow) {
    if (!supabase) return
    if (!window.confirm(p.hidden ? 'إظهار المنشور للطلاب؟' : 'إخفاء المنشور عن الطلاب؟')) return
    const { error } = await supabase.from('posts').update({ hidden: !p.hidden }).eq('id', p.id)
    if (error) setError(error.message); else await loadAll()
  }

  async function deletePost(p: PostRow) {
    if (!supabase) return
    if (!window.confirm('حذف المنشور نهائيًا؟ سيُحذف معه كل تعليقاته.')) return
    if (p.attachment_path) await supabase.storage.from(BUCKET).remove([p.attachment_path])
    const { error } = await supabase.from('posts').delete().eq('id', p.id)
    if (error) setError(error.message); else await loadAll()
  }

  async function openLinkedMaterial(m: MaterialWithCtx): Promise<string | null> {
    if (m.kind === 'link' && m.url) return m.url
    if (!supabase) return null
    const path = m.view_path ?? m.download_path
    if (!path) return null
    const { data, error } = await supabase.storage.from(CURRICULUM_BUCKET).createSignedUrl(path, 86400)
    if (error || !data) return null
    const ext = (path.split('.').pop() ?? '').toLowerCase()
    const officeExts = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'odt', 'ods', 'odp']
    if (officeExts.includes(ext)) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(data.signedUrl)}`
    }
    return data.signedUrl
  }

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>

  // ⬇️ ترتيب الطالب + متوسط الصف — يُبنى على ranking (الأسبوع المفتوح حاليًا)
  const meRank = ranking.findIndex((r) => r.student_id === me) + 1
  const meRow = ranking.find((r) => r.student_id === me)
  const classAvg: number | null = ranking.length === 0
    ? null
    : Math.round(ranking.reduce((t, r) => t + r.percent, 0) / ranking.length)
  const topThree = ranking.slice(0, 3)
  const hasRanking = topThree.length > 0

  // بطاقات إحصائية
  const statCards: { label: string; value: string; sub: string; tone: 'primary' | 'secondary' | 'accent' | 'warning' | 'error' | 'ink' }[] = [
    { label: 'أفضل نشاط', value: best ? `${best.percent}%` : '—', sub: best?.student_name ?? '—', tone: 'secondary' },
    { label: 'متوسط الصف', value: classAvg === null ? '—' : `${classAvg}%`, sub: `${ranking.length} طالبًا`, tone: 'accent' },
    { label: 'ترتيبك', value: meRank > 0 ? `#${meRank}` : '—', sub: meRow ? `${meRow.percent}%` : '—', tone: 'warning' },
    { label: 'المواد', value: String(stats.materials), sub: `${stats.lessons} درسًا`, tone: 'ink' },
    { label: 'المشاركون', value: String(stats.students), sub: `${stats.attempts} محاولة`, tone: 'error' },
  ]

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 pb-7 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">المنصة</h2>
            <p className="mt-1 text-base text-white/85">
              مرحبًا {profile?.full_name ?? ''} — مساحة المقرر المغلقة.
            </p>
          </div>
          {isTeacher && (
            <button
              className="rounded-xl bg-white px-5 py-2.5 text-base font-semibold text-primary shadow-sm hover:bg-primary-soft"
              onClick={() => setShowAdd(!showAdd)}
            >
              {showAdd ? 'إلغاء' : '+ منشور جديد'}
            </button>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex h-1" aria-hidden="true">
          <span className="flex-[3] bg-accent" />
          <span className="flex-1 bg-secondary" />
          <span className="flex-1 bg-warning" />
        </div>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-sm font-semibold text-error">{error}</p>}

      {/* 🏆 بطاقة صدارة المنصة — أوائل الأسبوع المفتوح حاليًا فقط */}
      {hasRanking && (
        <section className="relative overflow-hidden rounded-2xl border-2 border-warning bg-gradient-to-b from-warning-soft/60 to-white p-5 shadow-md">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-2xl font-bold text-primary">
                <span className="text-3xl">🏆</span>
                صدارة الأسبوع {ranking[0].week_number}
              </h3>
              <p className="mt-1 text-sm font-semibold text-ink-muted">
                {ranking[0].activity_title}
              </p>
            </div>
            <span className="rounded-lg bg-white px-3 py-1 text-xs font-semibold text-ink-muted ring-1 ring-warning">
              أعلى 3 نتائج — حسب النسبة المئوية
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {[0, 1, 2].map((idx) => {
              const student = topThree[idx]
              const rank = idx + 1
              const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'
              const rankLabel = rank === 1 ? 'الأول' : rank === 2 ? 'الثاني' : 'الثالث'
              const isMe = student?.student_id === me
              const cardTone =
                rank === 1 ? 'border-warning bg-gradient-to-b from-yellow-50 to-white'
                : rank === 2 ? 'border-light-blue bg-gradient-to-b from-slate-50 to-white'
                : 'border-accent/60 bg-gradient-to-b from-orange-50 to-white'
              const medalBg =
                rank === 1 ? 'bg-warning/30'
                : rank === 2 ? 'bg-light-blue/40'
                : 'bg-accent/20'
              return (
                <div
                  key={rank}
                  className={`relative rounded-2xl border-2 ${cardTone} p-4 text-center shadow-sm ${isMe ? 'ring-2 ring-primary/50' : ''}`}
                >
                  <div className={`mx-auto flex h-16 w-16 items-center justify-center rounded-full ${medalBg} text-4xl shadow-inner`}>
                    {medal}
                  </div>
                  <div className="mt-2 text-sm font-bold text-ink-muted">{rankLabel}</div>
                  {student ? (
                    <>
                      <div className="mt-2 truncate text-base font-bold text-ink" title={student.full_name}>
                        {student.full_name}
                      </div>
                      {student.student_no && (
                        <div className="mt-0.5 font-mono text-xs text-ink-muted" dir="ltr">
                          {student.student_no}
                        </div>
                      )}
                      <div className="mt-2 text-3xl font-bold text-primary" dir="ltr">
                        {student.percent}%
                      </div>
                      <div className="mt-1 text-xs text-ink-muted" dir="ltr">
                        {student.earned.toFixed(1)} / {student.possible}
                      </div>
                      {isMe && (
                        <div className="mt-2 inline-block rounded-full bg-primary px-3 py-0.5 text-xs font-bold text-white">
                          أنت
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="mt-4 text-sm text-ink-muted">— لا طالب —</div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* ⏳ حالة انتظار: نشاط مفتوح لكن لا نتائج مصححة بعد */}
      {!hasRanking && currentActivity && (
        <section className="relative overflow-hidden rounded-2xl border-2 border-dashed border-warning bg-gradient-to-b from-warning-soft/40 to-white p-6 shadow-sm">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="text-5xl">🏆</div>
            <h3 className="text-2xl font-bold text-primary">صدارة المنصة</h3>
            <p className="text-base font-semibold text-ink">
              الأسبوع {currentActivity.weekNumber}: {currentActivity.title}
            </p>
            <p className="mt-1 max-w-md text-sm text-ink-muted">
              ⏳ بانتظار نتائج الطلاب في هذا الأسبوع. بمجرد تصحيح أول محاولة، ستظهر أسماء الأوائل الثلاثة هنا.
            </p>
          </div>
        </section>
      )}

      {/* البطاقات الإحصائية الخمس */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {isTeacher && showAdd && (
        <AddPostForm
          materials={materials}
          onCreated={async () => { setShowAdd(false); await loadAll() }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {posts.length === 0 ? (
        <section className={card}>
          <p className="text-ink-muted">لا منشورات بعد.</p>
        </section>
      ) : (
        posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            authorName={profilesMap[p.author_id]?.full_name ?? (p.author_id === me ? (profile?.full_name ?? '—') : '—')}
            authorRole={profilesMap[p.author_id]?.role ?? (p.author_id === me ? (profile?.role ?? 'student') : 'student')}
            attachmentUrl={signedUrls[p.id] ?? null}
            comments={comments.filter((c) => c.post_id === p.id)}
            likes={likesByPost[p.id] ?? []}
            me={me}
            isTeacher={isTeacher}
            profilesMap={profilesMap}
            currentProfile={profile}
            linkedMaterial={p.linked_type === 'material' && p.linked_id ? materials.find((m) => m.id === p.linked_id) ?? null : null}
            onOpenMaterial={(m) => void openLinkedMaterial(m).then((url) => { if (url) window.open(url, '_blank', 'noreferrer') })}
            onLike={() => void toggleLike(p.id)}
            onComment={(t) => void addComment(p.id, t)}
            onDeleteComment={(id) => void deleteComment(id)}
            onPin={() => void togglePin(p)}
            onHide={() => void hidePost(p)}
            onDelete={() => void deletePost(p)}
          />
        ))
      )}
    </div>
  )
}

/* ============================================================
   بطاقة إحصائية
   ============================================================ */
const TONE_STYLES: Record<string, { bar: string; bg: string; text: string; sub: string }> = {
  primary:   { bar: 'border-s-primary',   bg: 'from-primary-soft/60 to-white',   text: 'text-primary',   sub: 'text-ink-muted' },
  secondary: { bar: 'border-s-secondary', bg: 'from-secondary-soft/60 to-white', text: 'text-secondary', sub: 'text-ink-muted' },
  accent:    { bar: 'border-s-accent',    bg: 'from-accent-soft/60 to-white',    text: 'text-primary',   sub: 'text-ink-muted' },
  warning:   { bar: 'border-s-warning',   bg: 'from-warning-soft/70 to-white',   text: 'text-ink',       sub: 'text-ink-muted' },
  error:     { bar: 'border-s-error',     bg: 'from-error-soft/60 to-white',     text: 'text-error',     sub: 'text-ink-muted' },
  ink:       { bar: 'border-s-ink',       bg: 'from-ink/5 to-white',             text: 'text-ink',       sub: 'text-ink-muted' },
}

function StatCard({ label, value, sub, tone }: {
  label: string; value: string; sub: string; tone: string
}) {
  const st = TONE_STYLES[tone] ?? TONE_STYLES.primary
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-light-blue border-s-4 bg-gradient-to-b ${st.bg} p-4 shadow-sm transition hover:shadow-md ${st.bar}`}>
      <div className="text-xs font-semibold text-ink-muted">{label}</div>
      <div className={`mt-1.5 truncate text-xl font-bold ${st.text}`}>{value}</div>
      <div className={`mt-0.5 truncate text-xs ${st.sub}`}>{sub}</div>
    </div>
  )
}

/* ============================================================
   بطاقة منشور
   ============================================================ */
function PostCard({
  post, authorName, authorRole, attachmentUrl, comments, likes, me, isTeacher, profilesMap, currentProfile,
  linkedMaterial, onOpenMaterial, onLike, onComment, onDeleteComment, onPin, onHide, onDelete,
}: {
  post: PostRow
  authorName: string
  authorRole: 'teacher' | 'student'
  attachmentUrl: string | null
  comments: CommentRow[]
  likes: string[]
  me: string
  isTeacher: boolean
  profilesMap: Record<string, ProfileLite>
  currentProfile: { id: string; full_name: string; role: string } | null
  linkedMaterial: MaterialWithCtx | null
  onOpenMaterial: (m: MaterialWithCtx) => void
  onLike: () => void
  onComment: (text: string) => void
  onDeleteComment: (id: string) => void
  onPin: () => void
  onHide: () => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState('')
  const [showComments, setShowComments] = useState(comments.length > 0)
  const liked = likes.includes(me)

  function send() {
    const t = draft.trim(); if (!t) return
    onComment(t); setDraft(''); setShowComments(true)
  }

  function commenterName(authorId: string): string {
    if (post.show_names || isTeacher) {
      const n = profilesMap[authorId]?.full_name
        ?? (authorId === me ? currentProfile?.full_name : undefined)
        ?? 'طالب'
      return n
    }
    if (authorId === me) return 'أنت'
    return 'طالب'
  }

  function commenterRole(authorId: string): 'teacher' | 'student' {
    if (authorId === me && currentProfile?.role === 'teacher') return 'teacher'
    return profilesMap[authorId]?.role ?? 'student'
  }

  const isTeacherAuthor = authorRole === 'teacher'
  const accentBar = isTeacherAuthor ? 'border-s-secondary' : 'border-s-primary'

  return (
    <section className={`relative overflow-hidden rounded-2xl border border-light-blue border-s-4 bg-white shadow-sm transition hover:shadow-md ${post.pinned ? 'border-warning' : accentBar}`}>
      {post.pinned && (
        <div className="flex items-center justify-between bg-gradient-to-l from-warning-soft to-white px-5 py-2 text-sm font-semibold text-ink">
          <span>📌 منشور مثبّت</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-bold text-white shadow-sm ${avatarGradient(post.author_id)}`}>
              {(authorName || '؟').charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold text-ink">{authorName}</span>
                {isTeacherAuthor && (
                  <span className="rounded-lg bg-gradient-to-l from-secondary to-secondary-hover px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                    ✓ أستاذ
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-ink-muted">
                {timeAgo(post.created_at)}
                {post.updated_at && ' — عُدّل'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${KIND_STYLE[post.kind]}`}>
              {KIND_EMOJI[post.kind]} {KIND_LABEL[post.kind]}
            </span>
          </div>
        </div>

        {isTeacher && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={btnOutline + ' !py-1 !text-xs'} onClick={onPin}>
              {post.pinned ? '📌 إلغاء التثبيت' : '📌 تثبيت'}
            </button>
            <button className={btnOutline + ' !py-1 !text-xs'} onClick={onHide}>
              {post.hidden ? '👁️ إظهار' : '🙈 إخفاء'}
            </button>
            <button className={btnDanger + ' !py-1 !text-xs'} onClick={onDelete}>
              🗑️ حذف
            </button>
          </div>
        )}

        {post.title && (
          <h3 className="mt-4 text-xl font-bold leading-8 text-primary">{post.title}</h3>
        )}
        {post.body && (
          <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-8 text-ink">
            {renderWithLinks(post.body)}
          </p>
        )}

        {post.kind === 'image' && attachmentUrl && (
          <div className="mt-4 overflow-hidden rounded-xl border border-light-blue">
            <img src={attachmentUrl} alt={post.title ?? ''} className="max-h-96 w-full object-contain" />
          </div>
        )}

        {post.kind === 'file' && attachmentUrl && (
          <a className="mt-4 flex items-center justify-between gap-3 rounded-xl border-2 border-primary/30 bg-gradient-to-l from-primary-soft to-white p-3 transition hover:border-primary hover:shadow-md" href={attachmentUrl} target="_blank" rel="noreferrer">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg text-white">📎</div>
              <span className="text-sm font-semibold text-ink">{post.title ?? 'ملف مرفق'}</span>
            </div>
            <span className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white">تحميل</span>
          </a>
        )}

        {(post.kind === 'link' || post.kind === 'video') && post.external_url && (
          <a className="mt-4 flex items-center justify-between gap-3 rounded-xl border-2 border-accent/40 bg-gradient-to-l from-accent-soft/40 to-white p-3 transition hover:border-accent hover:shadow-md" href={post.external_url} target="_blank" rel="noreferrer">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-lg text-white">
                {post.kind === 'video' ? '🎥' : '🔗'}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">{post.title ?? 'رابط'}</div>
                <div className="truncate text-xs text-ink-muted" dir="ltr">{post.external_url}</div>
              </div>
            </div>
            <span className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white">
              {post.kind === 'video' ? 'مشاهدة' : 'فتح'}
            </span>
          </a>
        )}

        {linkedMaterial && (
          <div className="mt-4 rounded-xl border-2 border-secondary bg-gradient-to-l from-secondary-soft to-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-secondary">📚 مادة من المنهج</div>
                <div className="mt-1 truncate text-sm font-semibold text-ink">
                  {linkedMaterial.kind === 'link' ? '🔗 ' : linkedMaterial.kind === 'slides' ? '📊 ' : '📄 '}
                  {linkedMaterial.title}
                </div>
                <div className="mt-0.5 text-xs text-ink-muted">
                  الأسبوع {linkedMaterial.week_number}
                  {linkedMaterial.lesson_title ? ` — ${linkedMaterial.lesson_title}` : ''}
                </div>
              </div>
              <button
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-secondary-hover"
                onClick={() => onOpenMaterial(linkedMaterial)}
              >
                فتح المادة
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-light-blue/50 pt-3">
          <button
            className={
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ' +
              (liked
                ? 'border-error bg-error-soft text-error shadow-sm'
                : 'border-light-blue bg-white text-ink-muted hover:border-error/40 hover:bg-error-soft/30 hover:text-error')
            }
            onClick={onLike}
          >
            <span>{liked ? '❤️' : '🤍'}</span>
            <span>{likes.length === 0 ? 'إعجاب' : likes.length}</span>
          </button>
          {post.allow_comments && (
            <button
              className="inline-flex items-center gap-1.5 rounded-full border border-light-blue bg-white px-3.5 py-1.5 text-sm font-semibold text-ink-muted transition hover:border-primary/40 hover:bg-primary-soft/30 hover:text-primary"
              onClick={() => setShowComments(!showComments)}
            >
              <span>💬</span>
              <span>{comments.length === 0 ? 'تعليق' : comments.length}</span>
            </button>
          )}
          {!post.show_names && !isTeacher && (
            <span className="rounded-full bg-bg px-3 py-1 text-xs text-ink-muted">👤 أسماء مخفية</span>
          )}
        </div>

        {!post.allow_comments && (
          <p className="mt-3 rounded-lg bg-bg p-3 text-sm text-ink-muted">🔒 التعليقات معطّلة لهذا المنشور.</p>
        )}

        {post.allow_comments && showComments && (
          <div className="mt-4 space-y-3 border-t border-light-blue/50 pt-4">
            {comments.map((c) => {
              const cName = commenterName(c.author_id)
              const cRole = commenterRole(c.author_id)
              const canDelete = isTeacher || c.author_id === me
              return (
                <div key={c.id} className="flex items-start gap-3 rounded-xl bg-bg p-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-sm ${avatarGradient(c.author_id)}`}>
                    {(cName || '؟').charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{cName}</span>
                      {cRole === 'teacher' && (
                        <span className="rounded bg-gradient-to-l from-secondary to-secondary-hover px-1.5 py-0.5 text-[10px] font-bold text-white">✓ أستاذ</span>
                      )}
                      <span className="text-xs text-ink-muted">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-7 text-ink">
                      {renderWithLinks(c.text)}
                    </p>
                  </div>
                  {canDelete && (
                    <button className="shrink-0 text-xs text-error hover:underline" onClick={() => onDeleteComment(c.id)}>
                      حذف
                    </button>
                  )}
                </div>
              )
            })}

            <div className="flex gap-2">
              <input
                className={input + ' mt-0'}
                placeholder="اكتب تعليقًا..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send() }}
              />
              <button className={btn} onClick={send}>إرسال</button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

/* ============================================================
   نموذج إضافة منشور
   ============================================================ */
function AddPostForm({ materials, onCreated, onCancel }: {
  materials: MaterialWithCtx[]
  onCreated: () => void
  onCancel: () => void
}) {
  const [kind, setKind] = useState<PostKind>('announcement')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [pinned, setPinned] = useState(false)
  const [allowComments, setAllowComments] = useState(true)
  const [showNames, setShowNames] = useState(false)
  const [linkedMaterialId, setLinkedMaterialId] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [fileKey, setFileKey] = useState(0)

  function resetAll() {
    setKind('announcement'); setTitle(''); setBody(''); setUrl(''); setFile(null)
    setPinned(false); setAllowComments(true); setShowNames(false); setLinkedMaterialId('')
    setFileKey((k) => k + 1)
  }

  async function submit() {
    if (!supabase) return
    setErr(null)

    if ((kind === 'image' || kind === 'file') && !file) { setErr('اختر ملفًا.'); return }
    if ((kind === 'link' || kind === 'video') && !/^https:\/\//i.test(url.trim())) {
      setErr('الرابط يجب أن يبدأ بـ https://'); return
    }
    if ((kind === 'announcement' || kind === 'post') && !body.trim() && !title.trim()) {
      setErr('اكتب نصًا أو عنوانًا.'); return
    }

    setBusy(true)
    let attachmentPath: string | null = null

    try {
      if ((kind === 'image' || kind === 'file') && file) {
        const uuid = crypto.randomUUID()
        attachmentPath = `posts/${uuid}.${extOf(file.name)}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(attachmentPath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })
        if (upErr) { setErr('فشل رفع الملف: ' + upErr.message); setBusy(false); return }
      }

      const u = await supabase.auth.getUser()
      const { error: insErr } = await supabase.from('posts').insert({
        author_id: u.data.user?.id,
        kind,
        title: title.trim() || null,
        body: body.trim() || null,
        attachment_path: attachmentPath,
        external_url: (kind === 'link' || kind === 'video') ? url.trim() : null,
        pinned,
        allow_comments: allowComments,
        show_names: showNames,
        linked_type: linkedMaterialId ? 'material' : null,
        linked_id: linkedMaterialId || null,
      })

      if (insErr) {
        if (attachmentPath) await supabase.storage.from(BUCKET).remove([attachmentPath])
        setErr('فشل النشر: ' + insErr.message); setBusy(false); return
      }

      resetAll()
      onCreated()
    } finally { setBusy(false) }
  }

  const isFileKind = kind === 'image' || kind === 'file'
  const isUrlKind = kind === 'link' || kind === 'video'

  return (
    <section className={card}>
      <h3 className="text-xl font-bold text-primary">منشور جديد</h3>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className={label}>النوع</label>
          <select className={input} value={kind} onChange={(e) => setKind(e.target.value as PostKind)}>
            <option value="announcement">📢 إعلان</option>
            <option value="post">📝 منشور نصي</option>
            <option value="image">🖼️ صورة</option>
            <option value="file">📎 ملف</option>
            <option value="video">🎥 فيديو (رابط)</option>
            <option value="link">🔗 رابط</option>
          </select>
        </div>
        <div>
          <label className={label}>ربط بمادة من المنهج (اختياري)</label>
          <select className={input} value={linkedMaterialId} onChange={(e) => setLinkedMaterialId(e.target.value)}>
            <option value="">— بدون ربط —</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                الأسبوع {m.week_number} — {m.lesson_title ?? 'بدون درس'} — {m.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className={label}>عنوان (اختياري)</label>
        <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="mt-4">
        <label className={label}>النص</label>
        <textarea className={input} rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
        <p className="mt-1 text-xs text-ink-muted">يمكن لصق روابط داخل النص — ستظهر قابلة للنقر تلقائيًا.</p>
      </div>

      {isFileKind && (
        <div className="mt-4">
          <label className={label}>الملف</label>
          <input key={fileKey} type="file" accept={kind === 'image' ? 'image/*' : undefined} className={input} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {file && <p className="mt-1 text-xs text-ink-muted">{file.name} — {(file.size / (1024 * 1024)).toFixed(2)} MB</p>}
        </div>
      )}

      {isUrlKind && (
        <div className="mt-4">
          <label className={label}>الرابط (https)</label>
          <input className={input} dir="ltr" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
      )}

      <div className="mt-5 grid gap-3 rounded-xl border border-light-blue bg-bg p-4 md:grid-cols-3">
        <label className="flex items-center gap-2 text-base">
          <input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} className="h-5 w-5" />
          <span>السماح بالتعليق</span>
        </label>
        <label className="flex items-center gap-2 text-base">
          <input type="checkbox" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} className="h-5 w-5" />
          <span>إظهار أسماء المعلّقين</span>
        </label>
        <label className="flex items-center gap-2 text-base">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-5 w-5" />
          <span>تثبيت في الأعلى</span>
        </label>
      </div>

      {err && <p className="mt-3 text-sm font-semibold text-error">{err}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} onClick={submit} disabled={busy}>{busy ? 'جارٍ النشر...' : 'نشر'}</button>
        <button className={btnOutline} onClick={onCancel} disabled={busy}>إلغاء</button>
      </div>
    </section>
  )
}
```

### 📄 `src\features\student\SelfTestTab.tsx`
```tsx
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

interface TypeStyle {
  headerBg: string
  headerText: string
  badgeBg: string
  barBg: string
  emoji: string
}
const TYPE_STYLE: Record<QType, TypeStyle> = {
  mcq:             { headerBg: 'border-s-primary',   headerText: 'text-primary',     badgeBg: 'bg-primary-soft text-primary border-primary/30',     barBg: 'bg-primary',   emoji: '🟦' },
  tf:              { headerBg: 'border-s-secondary', headerText: 'text-secondary',   badgeBg: 'bg-secondary-soft text-secondary border-secondary/30', barBg: 'bg-secondary', emoji: '🟩' },
  essay_smart:     { headerBg: 'border-s-accent',    headerText: 'text-primary',     badgeBg: 'bg-accent-soft/50 text-primary border-accent/40',     barBg: 'bg-accent',    emoji: '🟪' },
  essay_reasoning: { headerBg: 'border-s-ink',       headerText: 'text-ink',         badgeBg: 'bg-ink/10 text-ink border-ink/20',                     barBg: 'bg-ink',       emoji: '🟨' },
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
    mcq: true, tf: true, essay_smart: true, essay_reasoning: true,
  })

  const [retakeModal, setRetakeModal] = useState<{ activityId: string; attemptId: string; activityTitle: string } | null>(null)
  const [retakeReason, setRetakeReason] = useState('')
  const [retakeError, setRetakeError] = useState<string | null>(null)
  const [retakeSubmitting, setRetakeSubmitting] = useState(false)

  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false)

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
      const acts = (a.data ?? []) as Activity[]
      const wks = (w.data ?? []) as Week[]

      // ⬇️ ترتيب الأنشطة تنازلياً حسب رقم الأسبوع (الأحدث أولاً)
      const sortedActs = acts.sort((act1, act2) => {
        const num1 = wks.find(x => x.id === act1.week_id)?.number || 0
        const num2 = wks.find(x => x.id === act2.week_id)?.number || 0
        return num2 - num1
      })

      setActivities(sortedActs)
      setWeeks(wks)
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
    if (running && supabase) {
      const fresh = (await supabase.from('attempts')
        .select('id,activity_id,auto_score,manual_score,status,submitted_at')
        .eq('activity_id', running.id)
        .maybeSingle()).data as Attempt | null
      if (fresh && fresh.status === 'graded' && mode === 'edit') {
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
    setRefreshing(false)
  }, [load, running, mode])

  useEffect(() => { void initialLoad() }, [initialLoad])

  async function loadExamData(activityId: string) {
    if (!supabase) return null
    
    // ⬇️ استخدام دالة السحب الذكية الجديدة
    const { data, error } = await supabase.rpc('get_activity_questions', { p_activity_id: activityId })
    if (error || !data) {
      console.error(error)
      return null
    }

    // تحويل البيانات القادمة من الدالة إلى الشكل الذي تفهمه الواجهة
    const rawQuestions = data as any[]
    const qs: Question[] = []
    const om: Record<string, Option[]> = {}
    const aqs: AQ[] = []

    for (const item of rawQuestions) {
      qs.push({
        id: item.id,
        type: item.type as QType,
        text: item.text,
        score: item.score
      })
      om[item.id] = item.options || []
      aqs.push({
        activity_id: activityId,
        question_id: item.id,
        position: item.position
      })
    }

    return { questions: qs, options: om, aq: aqs }
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
    setOpen({ mcq: true, tf: true, essay_smart: true, essay_reasoning: true })

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

  function countAnsweredByType(): Record<QType, { answered: number; total: number }> {
    const result: Record<QType, { answered: number; total: number }> = {
      mcq: { answered: 0, total: 0 },
      tf: { answered: 0, total: 0 },
      essay_smart: { answered: 0, total: 0 },
      essay_reasoning: { answered: 0, total: 0 },
    }
    for (const q of questions) {
      result[q.type].total++
      const a = answers[q.id]
      if (!a) continue
      if (q.type === 'mcq' && a.optionId) result[q.type].answered++
      else if (q.type === 'tf' && a.tf) result[q.type].answered++
      else if (q.type.startsWith('essay') && (a.text ?? '').trim()) result[q.type].answered++
    }
    return result
  }

  function countAnswered(): number {
    const stats = countAnsweredByType()
    return TYPE_ORDER.reduce((s, t) => s + stats[t].answered, 0)
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
    
    if (rpcErr) {
      if (rpcErr.message.includes('already_graded_use_retake_request')) {
        setSaveStatus('error')
        void refresh() // سيقوم بجلب الحالة الجديدة وتحويلها لمراجعة
        return
      }
      setSaveStatus('error')
    } else {
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus((s) => (s === 'saved' ? 'idle' : s)), 1500)
    }
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
    setShowSubmitConfirm(false)
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
    
    if (rpcErr) {
      if (rpcErr.message.includes('already_graded_use_retake_request')) {
        setShowSubmitConfirm(false)
        setError('⚠️ لقد قام الأستاذ بتصحيح اختبارك بالفعل. سيتم الآن عرض إجاباتك ومراجعتها.')
        await refresh() // تحديث فوري لعرض المراجعة
        return
      }
      setError(rpcErr.message); return 
    }
    const r = data as { auto_score: number } | null
    setResult({ auto: r?.auto_score ?? 0, total: questions.reduce((s, q) => s + q.score, 0), answered: list.length })
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
    const answered = countAnswered()
    const isReview = mode === 'review'
    const stats = countAnsweredByType()

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

          {/* شريط تقدم شامل + عدادات لكل نوع */}
          {!isReview && (
            <div className="mt-5 space-y-3">
              <div className="flex items-center justify-between text-sm text-white/90">
                <span>إجمالي التقدم</span>
                <span>{answered} / {questions.length} مُجاب</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-white/20">
                <div
                  className="h-full rounded-full bg-gradient-to-l from-accent to-secondary transition-all"
                  style={{ width: questions.length === 0 ? '0%' : `${Math.round((answered / questions.length) * 100)}%` }}
                />
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {TYPE_ORDER.map((t) => (
                  <div key={t} className="rounded-lg bg-white/10 px-3 py-2 text-xs backdrop-blur">
                    <div className="flex items-center justify-between">
                      <span>{TYPE_STYLE[t].emoji} {TYPE_LABEL[t]}</span>
                      <span className="font-bold">{stats[t].answered} / {stats[t].total}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {isReview && (
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <span className="rounded-xl bg-white/15 px-4 py-2 text-sm text-white ring-1 ring-white/20">
                مجاب: {Object.keys(reviewAnswers).length} / {questions.length}
              </span>
            </div>
          )}

          {!isReview && saveStatus !== 'idle' && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {saveStatus === 'saving' && <span className="rounded-xl bg-white/15 px-4 py-1.5 text-xs text-white ring-1 ring-white/20">جارٍ الحفظ...</span>}
              {saveStatus === 'saved' && <span className="rounded-xl bg-secondary px-4 py-1.5 text-xs font-semibold text-white">✓ تم الحفظ</span>}
              {saveStatus === 'error' && <span className="rounded-xl bg-error px-4 py-1.5 text-xs font-semibold text-white">✗ فشل الحفظ</span>}
            </div>
          )}

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
          const answeredInGroup = stats[t].answered
          const totalInGroup = stats[t].total
          const percent = totalInGroup === 0 ? 0 : Math.round((answeredInGroup / totalInGroup) * 100)

          return (
            <section key={t} className={`overflow-hidden rounded-2xl border-2 border-light-blue border-s-4 bg-white shadow-sm ${style.headerBg}`}>
              <button
                className="flex w-full items-center justify-between gap-4 bg-white px-5 py-4 text-start transition hover:bg-primary-soft"
                onClick={() => setOpen({ ...open, [t]: !isOpen })}
              >
                <div className="flex flex-wrap items-center gap-4">
                  <span className={`rounded-xl border-2 px-4 py-1.5 text-lg font-bold ${style.badgeBg}`}>
                    {style.emoji} {TYPE_LABEL[t]}
                  </span>
                  <span className={`text-base font-semibold ${style.headerText}`}>
                    {groupScore} درجة
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {!isReview && (
                    <span className={`rounded-lg border-2 px-3 py-1 text-sm font-bold ${style.badgeBg}`}>
                      {answeredInGroup} / {totalInGroup} مُجاب
                    </span>
                  )}
                  <span className={`text-3xl ${style.headerText} transition-transform ${isOpen ? 'rotate-180' : ''}`}>▾</span>
                </div>
              </button>

              {!isReview && (
                <div className="px-5">
                  <div className="h-2 overflow-hidden rounded-full bg-bg">
                    <div className={`h-full rounded-full transition-all ${style.barBg}`} style={{ width: `${percent}%` }} />
                  </div>
                </div>
              )}

              {isOpen && (
                <ul className="mt-4 space-y-3 border-t-2 border-light-blue bg-bg p-4">
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

                        {isReview && rev && (rev.option_id || rev.text_answer) && notes[q.id] && (
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
              <b>ملاحظة:</b> يمكنك تعديل إجاباتك في أي وقت قبل أن يصحح الأستاذ. عند الضغط على «تسليم» ستظهر لك خلاصة كاملة قبل التأكيد.
            </div>
            <button
              className={btn + ' w-full py-4 text-lg'}
              onClick={() => setShowSubmitConfirm(true)}
              disabled={busy || answered === 0}
            >
              {busy
                ? 'جارٍ الحفظ...'
                : answered === 0
                  ? 'أجب على سؤال واحد على الأقل'
                  : `مراجعة الإجابات وتسليم (${answered} / ${questions.length})`}
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

        {/* نافذة تأكيد التسليم */}
        {showSubmitConfirm && (() => {
          const totalAnswered = countAnswered()
          const totalRemaining = questions.length - totalAnswered
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => !busy && setShowSubmitConfirm(false)}>
              <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-2xl font-bold text-primary">📋 خلاصة إجاباتك</h3>
                <p className="mt-1 text-sm text-ink-muted">راجع إجاباتك قبل التسليم النهائي.</p>

                <div className="mt-5 space-y-3">
                  {TYPE_ORDER.map((t) => {
                    const s = stats[t]
                    if (s.total === 0) return null
                    const remaining = s.total - s.answered
                    const complete = remaining === 0
                    return (
                      <div key={t} className={`rounded-xl border-2 p-3 ${complete ? 'border-secondary/40 bg-secondary-soft/40' : 'border-warning/40 bg-warning-soft/40'}`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-ink">
                            {TYPE_STYLE[t].emoji} {TYPE_LABEL[t]}
                          </span>
                          <span className={`text-sm font-bold ${complete ? 'text-secondary' : 'text-ink'}`}>
                            {s.answered} / {s.total} مُجاب
                          </span>
                        </div>
                        {!complete && (
                          <div className="mt-1 text-xs text-ink-muted">
                            ⚠️ متبقٍ: {remaining} سؤال{remaining > 1 ? '' : ''}
                          </div>
                        )}
                        {complete && (
                          <div className="mt-1 text-xs font-semibold text-secondary">
                            ✓ أكملت هذا القسم
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                {totalRemaining > 0 ? (
                  <div className="mt-4 rounded-xl border-2 border-warning bg-warning-soft p-3 text-sm text-ink">
                    <b>⚠️ تنبيه:</b> لم تُجب على <b>{totalRemaining}</b> سؤالًا. الأسئلة غير المُجابة لن تُحسب لك.
                  </div>
                ) : (
                  <div className="mt-4 rounded-xl border-2 border-secondary bg-secondary-soft p-3 text-sm font-semibold text-secondary">
                    🎉 أكملت جميع الأسئلة. بالتوفيق!
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-3">
                  <button className={btn} onClick={() => void submitFinal()} disabled={busy}>
                    {busy ? 'جارٍ التسليم...' : 'تسليم الآن'}
                  </button>
                  <button className={btnOutline} onClick={() => setShowSubmitConfirm(false)} disabled={busy}>
                    متابعة الإجابة
                  </button>
                </div>
              </div>
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
```

### 📄 `src\features\student\StudentAssignmentsTab.tsx`
```tsx
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import AssignmentNotification from '../shared/AssignmentNotification'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const btnDanger = 'rounded-xl border border-error bg-white px-4 py-2 text-sm font-semibold text-error hover:bg-error-soft disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink'

interface Assignment {
  id: string
  title: string
  description: string | null
  deadline: string | null
  max_score: number
}

interface Submission {
  id: string
  assignment_id: string
  status: 'draft' | 'submitted' | 'graded'
  score: number | null
  teacher_note: string | null
  student_note: string | null
  submitted_at: string | null
  graded_at: string | null
  assignment_files: { id: string; file_path: string; file_name: string }[]
}

interface RetakeRequest {
  id: string
  status: string
  reason: string
}

export default function StudentAssignmentsTab() {
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [submissions, setSubmissions] = useState<Record<string, Submission>>({})
  const [retakes, setRetakes] = useState<Record<string, RetakeRequest>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadMessage, setUploadMessage] = useState('')

  // حالة الرفع
  const [activeAsg, setActiveAsg] = useState<Assignment | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [note, setNote] = useState('')
  
  // حالة الإشعار
  const [viewingNotification, setViewingNotification] = useState<{ sub: Submission; asg: Assignment } | null>(null)

  // حالة طلب الإعادة
  const [retakeModal, setRetakeModal] = useState<{ sub: Submission; asg: Assignment } | null>(null)
  const [retakeReason, setRetakeReason] = useState('')

  const loadData = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    
    // جلب التكاليف المنشورة فقط
    const { data: asgData, error: asgErr } = await supabase
      .from('assignments')
      .select('id, title, description, deadline, max_score')
      .eq('published', true)
      .order('created_at', { ascending: false })

    if (asgErr) { setError('تعذّر تحميل التكاليف.'); setLoading(false); return }
    const asgList = (asgData ?? []) as Assignment[]
    setAssignments(asgList)

    if (asgList.length > 0) {
      // جلب تسليمات الطالب لهذه التكاليف
      const { data: subData, error: subErr } = await supabase
        .from('assignment_submissions')
        .select('*, assignment_files(id, file_path, file_name)')
        .in('assignment_id', asgList.map(a => a.id))

      if (!subErr) {
        const subMap: Record<string, Submission> = {}
        for (const s of (subData ?? []) as unknown as Submission[]) {
          subMap[s.assignment_id] = s
        }
        setSubmissions(subMap)

        // جلب طلبات الإعادة
        const subIds = Object.values(subMap).map(s => s.id)
        if (subIds.length > 0) {
          const { data: rqData } = await supabase
            .from('assignment_retake_requests')
            .select('id, status, reason')
            .in('submission_id', subIds)
          const rqMap: Record<string, RetakeRequest> = {}
          if (rqData) {
            for (const r of rqData) {
              // نربط الطلب بمعرف التسليم عبر البحث (لأننا لم نجلبه صراحة)
              const sub = Object.values(subMap).find(s => s.id === (r as any).submission_id)
              if (sub) rqMap[sub.assignment_id] = r as RetakeRequest
            }
          }
          setRetakes(rqMap)
        }
      }
    }
    setLoading(false)
  }, [])

  useEffect(() => { void loadData() }, [loadData])

  async function submitAssignment() {
    if (!supabase || !activeAsg) return
    if (!file) { setError('الرجاء اختيار ملف PDF.'); return }
    if (file.type !== 'application/pdf') { setError('يُسمح بملفات PDF فقط.'); return }

    setBusy(true); setError(null)
    setUploadStatus('uploading'); setUploadMessage('جارٍ رفع الملف...')
    
    try {
      // جلب معرف الطالب من الجلسة بدقة
      const { data: { session } } = await supabase.auth.getSession()
      const userId = session?.user?.id
      
      if (!userId) throw new Error('انتهت الجلسة. يرجى تسجيل الدخول من جديد.')

      const uuid = crypto.randomUUID()
      const path = `assignments/${activeAsg.id}/${userId}/${uuid}.pdf`

      // 1. رفع الملف
      const { error: upErr } = await supabase.storage.from('course-files').upload(path, file, { contentType: 'application/pdf' })
      if (upErr) throw new Error('فشل رفع الملف: ' + upErr.message)

      setUploadMessage('جارٍ حفظ البيانات...')

      // 2. إنشاء أو تحديث التسليم
      const existing = submissions[activeAsg.id]
      let subId = existing?.id

      if (existing) {
        const { error: upErr2 } = await supabase.from('assignment_submissions').update({
          status: 'submitted', 
          student_note: note.trim() || null, 
          submitted_at: new Date().toISOString()
        }).eq('id', existing.id)
        if (upErr2) throw upErr2
        
        // مسح الملفات القديمة
        await supabase.from('assignment_files').delete().eq('submission_id', existing.id)
      } else {
        const { data: newSub, error: insErr } = await supabase.from('assignment_submissions').insert({
          assignment_id: activeAsg.id, 
          student_id: userId, 
          status: 'submitted', 
          student_note: note.trim() || null, 
          submitted_at: new Date().toISOString()
        }).select('id').single()
        
        if (insErr) throw insErr
        subId = newSub.id
      }

      // 3. ربط الملف
      const { error: fileErr } = await supabase.from('assignment_files').insert({
        submission_id: subId, 
        file_path: path, 
        file_name: file.name, 
        file_size: file.size
      })
      if (fileErr) throw fileErr

      setUploadStatus('success'); setUploadMessage('✅ تم تسليم البحث بنجاح!')
      
      setTimeout(() => {
        setActiveAsg(null); setFile(null); setNote('')
        setUploadStatus('idle'); setUploadMessage('')
        void loadData()
      }, 2000)

    } catch (err: any) {
      setUploadStatus('error'); setUploadMessage('❌ ' + (err.message || 'حدث خطأ غير متوقع.'))
      setBusy(false)
    }
  }

  async function deleteSubmission(asg: Assignment) {
    if (!supabase) return
    const sub = submissions[asg.id]
    if (!sub || sub.status === 'graded') return
    if (!window.confirm('حذف التسليم والبدء من جديد؟')) return

    setBusy(true)
    // مسح الملفات من Storage
    for (const f of sub.assignment_files) {
      await supabase.storage.from('course-files').remove([f.file_path])
    }
    // مسح السجل
    await supabase.from('assignment_submissions').delete().eq('id', sub.id)
    setBusy(false); await loadData()
  }

  async function sendRetakeRequest() {
    if (!supabase || !retakeModal) return
    if (retakeReason.trim().length < 3) { setError('اكتب سببًا واضحًا.'); return }
    setBusy(true)
    await supabase.from('assignment_retake_requests').insert({
      submission_id: retakeModal.sub.id, student_id: (await supabase.auth.getUser()).data.user?.id, reason: retakeReason.trim()
    })
    setRetakeModal(null); setRetakeReason('')
    setBusy(false); await loadData()
  }

  if (loading) return <section className={card}><p>جارٍ التحميل...</p></section>

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 pb-7 text-white shadow-md">
        <h2 className="text-3xl font-bold">التكاليف والبحوث</h2>
        <p className="mt-1 text-base text-white/85">ارفع بحثك بصيغة PDF. يُمنع استخدام الذكاء الاصطناعي.</p>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-error">{error}</p>}

      {assignments.length === 0 ? (
        <p className="rounded-xl bg-bg p-6 text-center text-ink-muted">لا توجد تكاليف منشورة حاليًا.</p>
      ) : (
        <div className="grid gap-4">
          {assignments.map(asg => {
            const sub = submissions[asg.id]
            const retake = retakes[asg.id]
            return (
              <section key={asg.id} className="rounded-2xl border border-light-blue bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-bold text-primary">{asg.title}</h3>
                    {asg.description && <p className="mt-2 text-sm text-ink-muted whitespace-pre-wrap">{asg.description}</p>}
                    {asg.deadline && (
                      <p className="mt-2 text-sm font-semibold text-error">
                        الموعد النهائي: {new Date(asg.deadline).toLocaleDateString('ar-SA-u-nu-latn', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {!sub && (
                      <button className={btn} onClick={() => setActiveAsg(asg)}>رفع البحث (PDF)</button>
                    )}

                    {sub && sub.status === 'draft' && (
                      <button className={btn} onClick={() => setActiveAsg(asg)}>إكمال الرفع</button>
                    )}

                    {sub && sub.status === 'submitted' && (
                      <div className="text-end">
                        <span className="rounded-lg bg-warning-soft px-3 py-1 text-sm font-bold text-ink ring-1 ring-warning">بانتظار التصحيح</span>
                        <div className="mt-2 flex gap-2">
                          <button className={btnOutline + ' !text-xs'} onClick={() => setActiveAsg(asg)} disabled={busy}>استبدال</button>
                          <button className={btnDanger + ' !text-xs'} onClick={() => void deleteSubmission(asg)} disabled={busy}>حذف</button>
                        </div>
                      </div>
                    )}

                    {sub && sub.status === 'graded' && (
                      <div className="text-end space-y-2">
                        <span className="rounded-lg bg-secondary-soft px-3 py-1 text-sm font-bold text-secondary ring-1 ring-secondary/20">مصحح ✓</span>
                        <div>
                          <button className={btnOutline} onClick={() => setViewingNotification({ sub, asg })}>عرض الإشعار والملاحظات</button>
                        </div>
                        {!retake && (
                          <button className="text-xs text-primary hover:underline" onClick={() => setRetakeModal({ sub, asg })}>طلب إعادة البحث</button>
                        )}
                        {retake?.status === 'pending' && (
                          <span className="block text-xs font-bold text-warning">📩 طلب الإعادة قيد المراجعة</span>
                        )}
                        {retake?.status === 'rejected' && (
                          <span className="block text-xs font-bold text-error">❌ تم رفض طلب الإعادة</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </section>
            )
          })}
        </div>
      )}

      {/* نافذة الرفع */}
      {activeAsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-primary">رفع البحث — {activeAsg.title}</h3>
            <p className="mt-1 text-xs text-error font-semibold">⚠️ يُسمح بملفات PDF فقط، ويُمنع استخدام الذكاء الاصطناعي.</p>
            
            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-semibold text-ink">ملف البحث (PDF)</label>
                <input type="file" accept=".pdf,application/pdf" className={input} onChange={e => setFile(e.target.files?.[0] || null)} />
              </div>
              <div>
                <label className="text-sm font-semibold text-ink">ملاحظة للدكتور (اختياري)</label>
                <textarea rows={3} className={input} value={note} onChange={e => setNote(e.target.value)} placeholder="مثال: هذا البحث يتناول..." />
              </div>
            </div>

            {uploadStatus !== 'idle' && (
              <div className={`mt-4 rounded-xl p-3 text-center font-bold ${uploadStatus === 'success' ? 'bg-secondary-soft text-secondary' : uploadStatus === 'error' ? 'bg-error-soft text-error' : 'bg-primary-soft text-primary'}`}>
                {uploadMessage}
              </div>
            )}

            <div className="mt-6 flex gap-2">
              <button className={btn} onClick={() => void submitAssignment()} disabled={busy || uploadStatus === 'success'}>
                {uploadStatus === 'uploading' ? 'جارٍ الرفع...' : 'تسليم البحث'}
              </button>
              <button className={btnOutline} onClick={() => { setActiveAsg(null); setFile(null); setNote(''); setUploadStatus('idle'); setUploadMessage(''); }} disabled={busy}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* نافذة الإشعار (التقرير) */}
      {viewingNotification && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-2 md:p-6">
          <div className="mx-auto max-w-[900px]">
            <div className="no-print sticky top-0 z-10 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3 shadow-lg">
              <div className="text-base font-bold text-primary">📄 إشعار تصحيح التكليف</div>
              <div className="flex flex-wrap gap-2">
                <button className={btnOutline} onClick={() => window.print()}>🖨️ طباعة / PDF</button>
                <button className={btn} onClick={() => setViewingNotification(null)}>إغلاق</button>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
              <AssignmentNotification
                studentName="مستخدم المنصة" /* يمكن جلبه من useAuth لاحقًا */
                studentNo="FM-XXX"
                assignmentTitle={viewingNotification.asg.title}
                score={viewingNotification.sub.score || 0}
                maxScore={viewingNotification.asg.max_score}
                teacherNote={viewingNotification.sub.teacher_note}
                gradedAt={viewingNotification.sub.graded_at || new Date().toISOString()}
              />
            </div>
          </div>
        </div>
      )}

      {/* نافذة طلب الإعادة */}
      {retakeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-primary">طلب إعادة البحث</h3>
            <p className="mt-1 text-sm text-ink-muted">{retakeModal.asg.title}</p>
            <textarea rows={4} className={input} placeholder="اكتب سبب طلب الإعادة..." value={retakeReason} onChange={e => setRetakeReason(e.target.value)} />
            <div className="mt-4 flex gap-2">
              <button className={btn} onClick={() => void sendRetakeRequest()} disabled={busy}>إرسال الطلب</button>
              <button className={btnOutline} onClick={() => setRetakeModal(null)} disabled={busy}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
```

### 📄 `src\features\student\StudentHomePage.tsx`
```tsx
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

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const th = 'p-3 text-start text-ink-muted'

interface ActivityRow { id: string; title: string; week_number: number; total_possible: number }
interface AttemptRow { id: string; activity_id: string; auto_score: number; manual_score: number | null; status: string; submitted_at: string | null }
interface MyReport { id: string; type: string; from_week_number: number; to_week_number: number; report_number: string | null; approved_at: string; seen_at: string | null; teacher_note: string | null; snapshot: ReportSnapshot }

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
  const [tab, setTab] = useState('feed')
  const [refreshKey, setRefreshKey] = useState(0)
  const [mounted, setMounted] = useState<string[]>(['feed'])
  
  // شارات "جديد"
  const [hasNewAssignments, setHasNewAssignments] = useState(false)
  const [hasNewReports, setHasNewReports] = useState(false)

  const [activities, setActivities] = useState<ActivityRow[]>([])
  const [attempts, setAttempts] = useState<Record<string, AttemptRow>>({})
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reports, setReports] = useState<MyReport[]>([])
  const [viewingReport, setViewingReport] = useState<MyReport | null>(null)

  useEffect(() => { setMounted((prev) => (prev.includes(tab) ? prev : [...prev, tab])) }, [tab])

  const load = useCallback(async () => {
    if (!supabase) return
    setError(null)

    const [aRes, atRes, rpRes, asgRes] = await Promise.all([
      supabase.from('activities').select('id,title,week_id'),
      supabase.from('attempts').select('id,activity_id,auto_score,manual_score,status,submitted_at'),
      supabase.from('weekly_reports').select('id,type,from_week_number,to_week_number,report_number,approved_at,seen_at,teacher_note,snapshot').eq('status', 'active').order('approved_at', { ascending: false }),
      supabase.from('assignments').select('id, created_at').eq('published', true).order('created_at', { ascending: false }).limit(1)
    ])

    if (aRes.error || atRes.error || rpRes.error) { setError('تعذّر تحميل البيانات.'); return }

    const acts = (aRes.data ?? []) as { id: string; title: string; week_id: string }[]
    const weekIds = Array.from(new Set(acts.map((a) => a.week_id)))
    const wRes = weekIds.length > 0 ? await supabase.from('weeks').select('id,number').in('id', weekIds) : { data: [], error: null }
    const weekMap: Record<string, number> = {}
    for (const w of (wRes.data ?? []) as { id: string; number: number }[]) weekMap[w.id] = w.number

    const actIds = acts.map((a) => a.id)
    const aqRes = actIds.length > 0 ? await supabase.from('activity_questions').select('activity_id,question_id').in('activity_id', actIds) : { data: [], error: null }
    const qIds = Array.from(new Set(((aqRes.data ?? []) as { question_id: string }[]).map((x) => x.question_id)))
    const qRes = qIds.length > 0 ? await supabase.from('questions').select('id,score').in('id', qIds) : { data: [], error: null }
    const scoreMap: Record<string, number> = {}
    for (const q of (qRes.data ?? []) as { id: string; score: number }[]) scoreMap[q.id] = q.score
    const totalByAct: Record<string, number> = {}
    for (const link of (aqRes.data ?? []) as { activity_id: string; question_id: string }[]) totalByAct[link.activity_id] = (totalByAct[link.activity_id] ?? 0) + (scoreMap[link.question_id] ?? 0)

    setActivities(acts.map((a) => ({ id: a.id, title: a.title, week_number: weekMap[a.week_id] ?? 0, total_possible: totalByAct[a.id] ?? 0 })))
    
    const am: Record<string, AttemptRow> = {}
    for (const t of (atRes.data ?? []) as AttemptRow[]) am[t.activity_id] = t
    setAttempts(am)

    const reps = (rpRes.data ?? []) as MyReport[]
    setReports(reps)

    // فحص الإشعارات (شارة حمراء)
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

  // ⬇️ التحديث التلقائي (F5) عند الانتقال بين التبويبات
  useEffect(() => {
    setRefreshKey((prev) => prev + 1)
    void refresh() // تحديث البيانات الرئيسية (الدرجات، التقارير)
  }, [tab, refresh])

  // إخفاء الإشعار عند فتح التبويب
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
  }

  const TABS: ShellTab[] = [
    { key: 'feed', label: 'المنصة' },
    { key: 'lessons', label: 'دروس الأسابيع' },
    { key: 'selftest', label: 'اختبر نفسك' },
    { key: 'assignments', label: hasNewAssignments ? '🔴 التكاليف' : 'التكاليف' },
    { key: 'acts', label: 'أنشطتي' },
    { key: 'grades', label: hasNewReports ? '🔴 درجاتي' : 'درجاتي' },
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
      
      {/* تبويب التكاليف الجديد */}
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
                <button className="rounded-xl bg-white px-5 py-2.5 text-base font-bold text-primary shadow-md hover:bg-primary-soft disabled:opacity-60" onClick={() => void refresh()} disabled={refreshing}>{refreshing ? '⏳ جارٍ التحديث...' : '🔄 تحديث'}</button>
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
              <WeeklyReport snapshot={viewingReport.snapshot} reportNumber={viewingReport.report_number} approvedAt={viewingReport.approved_at} teacherNote={viewingReport.teacher_note} />
            </div>
          </div>
        </div>
      )}
    </AppShell>
  )
}
```

### 📄 `src\features\student\WeekPacksView.tsx`
```tsx
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { card } from '../../components/ui'

interface Week { id: string; number: number; title: string; summary: string | null }
interface Lesson { id: string; week_id: string; title: string; body: string | null; position: number }
type Kind = 'slides' | 'document' | 'link'
interface Material {
  id: string
  week_id: string
  lesson_id: string | null
  title: string
  kind: Kind
  view_path: string | null
  download_path: string | null
  url: string | null
  position: number
}

interface ViewState {
  material: Material
  url: string
  downloadUrl: string
}

const BUCKET = 'course-files'

function extFromPath(path: string): string {
  const i = path.lastIndexOf('.')
  return i > 0 ? path.slice(i + 1).toLowerCase() : ''
}

function isOffice(ext: string): boolean {
  return ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'odt', 'ods', 'odp'].includes(ext)
}
function isImage(ext: string): boolean {
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)
}

export default function WeekPacksView() {
  const [weeks, setWeeks] = useState<Week[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [viewUrls, setViewUrls] = useState<Record<string, string | null>>({})
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<ViewState | null>(null)
  const [openWeekId, setOpenWeekId] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      const [w, l, m] = await Promise.all([
        supabase.from('weeks').select('id,number,title,summary').order('number'),
        supabase.from('lessons').select('id,week_id,title,body,position').order('position'),
        supabase.from('materials').select('id,week_id,lesson_id,title,kind,view_path,download_path,url,position').order('position'),
      ])
      if (cancelled) return
      if (w.error || l.error || m.error) {
        setError('تعذّر تحميل المحتوى.')
        setLoading(false)
        return
      }
      setWeeks((w.data ?? []) as Week[])
      setLessons((l.data ?? []) as Lesson[])
      const mats = (m.data ?? []) as Material[]
      setMaterials(mats)

      const nextView: Record<string, string | null> = {}
      const nextDownload: Record<string, string | null> = {}

      for (const mat of mats) {
        if (mat.kind === 'link') {
          nextView[mat.id] = mat.url
          nextDownload[mat.id] = null
          continue
        }
        const path = mat.view_path ?? mat.download_path
        if (!path) {
          nextView[mat.id] = null
          nextDownload[mat.id] = null
          continue
        }

        const { data: viewData } = await supabase.storage.from(BUCKET).createSignedUrl(path, 86400)
        nextView[mat.id] = viewData?.signedUrl ?? null

        const { data: dlData } = await supabase.storage.from(BUCKET).createSignedUrl(path, 86400, { download: true })
        nextDownload[mat.id] = dlData?.signedUrl ?? null
      }

      if (cancelled) return
      setViewUrls(nextView)
      setDownloadUrls(nextDownload)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  function openViewer(m: Material) {
    const view = viewUrls[m.id]
    if (!view) return
    const dl = downloadUrls[m.id] ?? view
    setViewing({ material: m, url: view, downloadUrl: dl })
  }

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>
  if (error) return <section className={card}><p className="text-sm font-semibold text-error">{error}</p></section>
  if (weeks.length === 0) return <section className={card}><p className="text-ink-muted">لم يُنشر أي أسبوع بعد.</p></section>

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-primary">📚 دروس الأسابيع</h2>

      {weeks.map((w) => {
        const wLessons = lessons.filter((l) => l.week_id === w.id)
        const isOpen = openWeekId === w.id
        return (
          <section key={w.id} className="overflow-hidden rounded-2xl border border-light-blue bg-white shadow-sm">
            <button
              className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-start transition ${
                isOpen
                  ? 'bg-gradient-to-l from-primary to-primary-hover text-white'
                  : 'bg-white hover:bg-primary-soft'
              }`}
              onClick={() => setOpenWeekId(isOpen ? null : w.id)}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className={`text-2xl ${isOpen ? 'text-white' : 'text-primary'}`}>
                  {isOpen ? '▼' : '▶'}
                </span>
                <span className={`text-lg font-bold ${isOpen ? 'text-white' : 'text-primary'}`}>
                  الأسبوع {w.number}: {w.title}
                </span>
                <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${
                  isOpen ? 'bg-white/20 text-white' : 'bg-primary-soft text-primary'
                }`}>
                  {wLessons.length} درس
                </span>
              </div>
              <span className={`text-sm ${isOpen ? 'text-white/80' : 'text-ink-muted'}`}>
                {isOpen ? 'إغلاق' : 'عرض'}
              </span>
            </button>

            {isOpen && (
              <div className="border-t border-light-blue bg-bg p-4">
                {w.summary && (
                  <p className="mb-4 rounded-xl bg-white p-4 text-sm leading-7 text-ink-muted">
                    {w.summary}
                  </p>
                )}

                <div className="space-y-4">
                  {wLessons.length === 0 ? (
                    <p className="rounded-xl bg-white p-4 text-center text-sm text-ink-muted">
                      لا دروس في هذا الأسبوع بعد.
                    </p>
                  ) : (
                    wLessons.map((l) => (
                      <LessonView
                        key={l.id}
                        lesson={l}
                        materials={materials.filter((m) => m.lesson_id === l.id)}
                        viewUrls={viewUrls}
                        downloadUrls={downloadUrls}
                        onOpen={openViewer}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </section>
        )
      })}

      {viewing && (
        <FileViewerModal
          material={viewing.material}
          url={viewing.url}
          downloadUrl={viewing.downloadUrl}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}

/* ============================================================
   قسم الدرس — مطوي بخلفية خضراء خفيفة
   ============================================================ */
function LessonView({ lesson, materials, viewUrls, downloadUrls, onOpen }: {
  lesson: Lesson
  materials: Material[]
  viewUrls: Record<string, string | null>
  downloadUrls: Record<string, string | null>
  onOpen: (m: Material) => void
}) {
  const [open, setOpen] = useState(false)

  const docs = materials.filter((m) => m.kind === 'document')
  const slides = materials.filter((m) => m.kind === 'slides')
  const links = materials.filter((m) => m.kind === 'link')
  const totalCount = docs.length + slides.length + links.length

  return (
    <section className="overflow-hidden rounded-xl border-2 border-secondary/25 border-s-4 border-s-secondary shadow-sm">
      <button
        className="flex w-full items-center justify-between gap-3 bg-secondary-soft/60 px-4 py-3 text-start transition hover:bg-secondary-soft/90"
        onClick={() => setOpen(!open)}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xl text-secondary">{open ? '▼' : '▶'}</span>
          <span className="text-base font-bold text-secondary">
            {(() => {
              const isDefaultTitle = !lesson.title || lesson.title === `الدرس ${lesson.position}`
              return `📖 ${isDefaultTitle ? `الدرس ${lesson.position}` : `الدرس ${lesson.position}: ${lesson.title}`}`
            })()}
          </span>
          <span className="rounded-lg bg-white/80 px-2 py-0.5 text-xs font-semibold text-secondary ring-1 ring-secondary/20">
            {totalCount} مادة
          </span>
        </div>
        <span className="text-sm font-semibold text-secondary/80">{open ? 'إغلاق' : 'عرض'}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-secondary/15 bg-secondary-soft/20 p-4">
          {lesson.body && (
            <div className="whitespace-pre-wrap rounded-xl bg-white p-4 text-base leading-8 text-ink">
              {lesson.body}
            </div>
          )}

          {docs.length > 0 && (
            <MaterialGroup title="📄 المادة الخام" items={docs} viewUrls={viewUrls} downloadUrls={downloadUrls} onOpen={onOpen} />
          )}
          {slides.length > 0 && (
            <MaterialGroup title="📊 العرض التقديمي" items={slides} viewUrls={viewUrls} downloadUrls={downloadUrls} onOpen={onOpen} />
          )}
          {links.length > 0 && (
            <MaterialGroup title="🔗 روابط خارجية" items={links} viewUrls={viewUrls} downloadUrls={downloadUrls} onOpen={onOpen} />
          )}
        </div>
      )}
    </section>
  )
}

/* ============================================================
   مجموعة مواد
   ============================================================ */
function MaterialGroup({ title, items, viewUrls, downloadUrls, onOpen }: {
  title: string
  items: Material[]
  viewUrls: Record<string, string | null>
  downloadUrls: Record<string, string | null>
  onOpen: (m: Material) => void
}) {
  return (
    <div className="rounded-xl border border-light-blue bg-white p-4">
      <h5 className="mb-3 text-base font-bold text-primary">{title}</h5>
      <ul className="space-y-2">
        {items.map((m) => {
          const view = viewUrls[m.id]
          const dl = downloadUrls[m.id]
          const canView = !!view
          const isLink = m.kind === 'link'
          return (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-light-blue p-3 transition hover:border-primary/40 hover:shadow-sm">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink">
                  {m.kind === 'link' && '🔗 '}{m.kind === 'slides' && '📊 '}{m.kind === 'document' && '📄 '}
                  {m.title}
                </div>
                {isLink && m.url && (
                  <div className="mt-1 break-all text-xs text-ink-muted" dir="ltr">{m.url}</div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canView}
                  onClick={() => isLink && view
                    ? window.open(view, '_blank', 'noreferrer')
                    : onOpen(m)}
                  className={
                    'inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition ' +
                    (canView
                      ? 'border-primary bg-white text-primary hover:bg-primary-soft'
                      : 'cursor-not-allowed border-ink/20 text-ink/40')
                  }
                >
                  {isLink ? '🔗 فتح الرابط ↗' : '📖 عرض'}
                </button>

                {!isLink && dl && (
                  <a
                    href={dl}
                    download
                    className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:bg-secondary-hover"
                  >
                    ⬇ تحميل
                  </a>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ============================================================
   نافذة العرض المدمج
   ============================================================ */
function FileViewerModal({ material, url, downloadUrl, onClose }: {
  material: Material
  url: string
  downloadUrl: string
  onClose: () => void
}) {
  const path = material.view_path ?? material.download_path ?? ''
  const ext = extFromPath(path)
  const office = isOffice(ext)
  const image = isImage(ext)
  const pdf = ext === 'pdf'

  const officeViewerUrl = office
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
    : url

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 md:p-6" onClick={onClose}>
      <div className="flex h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-light-blue bg-gradient-to-l from-primary-soft/40 to-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-2xl">
              {material.kind === 'slides' ? '📊' : material.kind === 'document' ? '📄' : '🔗'}
            </span>
            <h3 className="truncate text-base font-bold text-primary md:text-lg">{material.title}</h3>
            {office && <span className="rounded bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">Office Viewer</span>}
            {pdf && <span className="rounded bg-error-soft px-2 py-0.5 text-xs font-semibold text-error">PDF</span>}
            {image && <span className="rounded bg-secondary-soft px-2 py-0.5 text-xs font-semibold text-secondary">صورة</span>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:bg-secondary-hover"
            >
              ⬇ تحميل
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl border border-error bg-white px-4 py-2 text-sm font-semibold text-error transition hover:bg-error-soft"
            >
              ✕ إغلاق
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-bg">
          {image ? (
            <div className="flex h-full items-center justify-center overflow-auto p-4">
              <img src={url} alt={material.title} className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <iframe
              src={officeViewerUrl}
              title={material.title}
              className="h-full w-full border-0"
              allow="fullscreen"
            />
          )}
        </div>

        <footer className="border-t border-light-blue bg-white px-4 py-2 text-xs text-ink-muted">
          {pdf && 'يُعرض الملف عبر قارئ PDF المدمج في المتصفح.'}
          {office && 'يُعرض الملف عبر Microsoft Office Viewer.'}
          {image && 'صورة معروضة بالحجم الكامل.'}
        </footer>
      </div>
    </div>
  )
}
```

## 3. Shared & App Core


### 📄 `src\app\App.tsx`
```tsx
import { useEffect } from 'react'
import { useAuth } from './auth-context'
import { navigate, usePath } from './router'
import type { UserRole } from '../types'
import AccessDenied from '../components/AccessDenied'
import CenteredCard from '../components/CenteredCard'
import LoginPage from '../features/auth/LoginPage'
import ChangePasswordPage from '../features/auth/ChangePasswordPage'
import AdminPage from '../features/admin/AdminPage'
import StudentHomePage from '../features/student/StudentHomePage'

const homeFor = (role: UserRole) => (role === 'teacher' ? '/admin' : '/student')

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, true), [to])
  return null
}

function Splash() {
  return (
    <CenteredCard>
      <p className="text-lg text-primary" role="status">جارٍ التحميل…</p>
    </CenteredCard>
  )
}

export default function App() {
  const { session, profile, loading } = useAuth()
  const path = usePath()

  // جلسة بلا ملف: إما قيد التحميل أو في طريقها للرفض وتسجيل الخروج.
  if (loading || (session && !profile)) return <Splash />

  // طالب بكلمة مرور مؤقتة: لا يرى شيئًا غير شاشة التغيير، مهما كان المسار.
  if (profile?.role === 'student' && profile.must_change_password) {
    return <ChangePasswordPage />
  }

  if (path === '/login') {
    return profile ? <Redirect to={homeFor(profile.role)} /> : <LoginPage />
  }

  if (path === '/admin') {
    if (!profile) return <Redirect to="/login" />
    return profile.role === 'teacher' ? <AdminPage /> : <AccessDenied />
  }

  if (path === '/student') {
    if (!profile) return <Redirect to="/login" />
    return profile.role === 'student' ? <StudentHomePage /> : <Redirect to="/admin" />
  }

  return <Redirect to={profile ? homeFor(profile.role) : '/login'} />
}
```

### 📄 `src\app\AuthProvider.tsx`
```tsx
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { FunctionsHttpError, type Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { arabicAuthError } from '../lib/authErrors'
import type { Profile } from '../types'
import { AuthContext } from './auth-context'

/**
 * اسم Edge Function الخاصة بتغيير كلمة المرور كما يظهر في لوحة Supabase.
 * (لوحة Supabase تسمّي الدوال أسماء عشوائية، فنحفظ الاسم في مكان واحد.)
 */
const CHANGE_PASSWORD_FUNCTION = 'dynamic-responder'

const STUDENT_NO_PATTERN = /^[A-Z]{2}[0-9]{4,8}$/

/** يحوّل ما يكتبه المستخدم إلى بريد الدخول: بريد الأستاذ كما هو، أو بريد الطالب المشتق من رقمه التعريفي. */
function toLoginEmail(identifier: string): string | null {
  const value = identifier.trim()
  if (value.includes('@')) return value
  const studentNo = value.toUpperCase()
  if (!STUDENT_NO_PATTERN.test(studentNo)) return null
  return `${studentNo.toLowerCase()}@students.invalid`
}

const FUNCTION_ERRORS: Record<string, string> = {
  current_password_incorrect: 'كلمة المرور الحالية غير صحيحة.',
  password_length_8_to_72: 'كلمة المرور الجديدة يجب أن تكون من 8 إلى 72 محرفًا.',
  password_needs_letter_and_digit: 'كلمة المرور الجديدة يجب أن تحتوي حرفًا ورقمًا على الأقل.',
  password_same_as_current: 'كلمة المرور الجديدة يجب أن تختلف عن الحالية.',
  missing_fields: 'أدخل كلمة المرور الحالية والجديدة.',
  flag_update_failed_contact_teacher:
    'تغيّرت كلمة المرور لكن تعذّر إكمال التفعيل. تواصل مع الأستاذ.',
  unauthorized: 'انتهت الجلسة. سجّل الدخول من جديد.',
  forbidden: 'هذا الحساب غير مسموح له بتغيير كلمة المرور من هنا.',
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [sessionLoading, setSessionLoading] = useState(Boolean(supabase))
  const [profile, setProfile] = useState<Profile | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)

  // 1) متابعة الجلسة
  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setSessionLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => data.subscription.unsubscribe()
  }, [])

  // 2) تحميل الملف والدور من القاعدة. القراءة محكومة بسياسات RLS.
  const userId = session?.user.id ?? null
  useEffect(() => {
    if (!supabase) return
    if (!userId) return
    let cancelled = false
    supabase
      .from('profiles')
      .select('id, full_name, student_no, role, active, must_change_password, created_at')
      .eq('id', userId)
      .maybeSingle()
      .then(async ({ data, error }) => {
        if (cancelled) return
        let problem: string | null = null
        if (error) problem = 'تعذّر تحميل بيانات الحساب. حاول مرة أخرى.'
        else if (!data) problem = 'هذا الحساب غير مسجَّل في المنصة. تواصل مع الأستاذ.'
        else if (!data.active) problem = 'هذا الحساب غير مفعّل. تواصل مع الأستاذ.'

        if (problem) {
          setNotice(problem)
          await supabase!.auth.signOut({ scope: 'local' })
          return
        }
        setNotice(null)
        setProfile(data as Profile)
      })
    return () => {
      cancelled = true
    }
  }, [userId, reloadTick])

  const signIn = useCallback(async (identifier: string, password: string) => {
    if (!supabase) return 'لم يُضبط الاتصال بقاعدة البيانات. راجع ملف .env.local.'
    if (!identifier.trim() || !password) return 'أدخل اسم المستخدم وكلمة المرور.'
    const email = toLoginEmail(identifier)
    if (!email) return 'الرقم التعريفي غير صحيح. مثال: FM0001'
    setNotice(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return error ? arabicAuthError(error) : null
  }, [])

  const changePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!supabase) return 'لم يُضبط الاتصال بقاعدة البيانات. راجع ملف .env.local.'
      const studentNo = profile?.student_no
      if (!studentNo) return 'تعذّر تحديد الحساب. سجّل الدخول من جديد.'
      if (!currentPassword || !newPassword) return 'أدخل كلمة المرور الحالية والجديدة.'

      const { error } = await supabase.functions.invoke(CHANGE_PASSWORD_FUNCTION, {
        body: { current_password: currentPassword, new_password: newPassword },
      })

      if (error) {
        if (error instanceof FunctionsHttpError) {
          try {
            const body = await error.context.json()
            const known = FUNCTION_ERRORS[String(body?.error ?? '')]
            if (known) return known
          } catch {
            // نتجاهل: نعرض الرسالة العامة أدناه
          }
        }
        return 'تعذّر تغيير كلمة المرور. حاول مرة أخرى.'
      }

      // نجح التغيير: ندخل بالكلمة الجديدة للحصول على جلسة سليمة، ثم نعيد تحميل الملف.
      const email = `${studentNo.toLowerCase()}@students.invalid`
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: newPassword,
      })
      if (signInError) {
        await supabase.auth.signOut({ scope: 'local' })
        setProfile(null)
        return 'تغيّرت كلمة المرور. سجّل الدخول بالكلمة الجديدة.'
      }
      setReloadTick((n) => n + 1)
      return null
    },
    [profile],
  )

  const signOut = useCallback(async () => {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    // عند فشل الشبكة لا تُحذف الجلسة المحلية تلقائيًا، فنحذفها يدويًا.
    if (error) await supabase.auth.signOut({ scope: 'local' })
    setProfile(null)
  }, [])

  // الملف يُعدّ صالحًا فقط إن كان لمستخدم الجلسة الحالية.
  const currentProfile = userId && profile?.id === userId ? profile : null
  const loading = sessionLoading || (userId !== null && currentProfile === null)

  return (
    <AuthContext.Provider
      value={{ session, profile: currentProfile, loading, notice, signIn, changePassword, signOut }}
    >
      {children}
    </AuthContext.Provider>
  )
}
```

### 📄 `src\lib\supabase.ts`
```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** هل ضُبطت متغيرات Supabase في ملف .env.local؟ */
export const isSupabaseConfigured = Boolean(url && publishableKey)

/** حاجز أمان: يرفض أي مفتاح سري (sb_secret_ أو service_role) في تطبيق المتصفح. */
function isSecretKey(key: string): boolean {
  if (key.startsWith('sb_secret_')) return true
  try {
    const payload = JSON.parse(atob(key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload?.role === 'service_role'
  } catch {
    return false
  }
}

if (publishableKey && isSecretKey(publishableKey)) {
  throw new Error(
    'مفتاح سري في VITE_SUPABASE_PUBLISHABLE_KEY. استخدم المفتاح العام (sb_publishable_ أو anon) فقط، وغيّر المفتاح المكشوف فورًا.',
  )
}

/**
 * عميل Supabase بالمفتاح العام فقط. الصلاحيات الفعلية تحكمها سياسات RLS في القاعدة.
 * يكون null إذا لم تُضبط المتغيرات، فيعمل المشروع دون خطأ.
 */
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, publishableKey!)
  : null

```

### 📄 `src\components\AccessDenied.tsx`
```tsx
import { useAuth } from '../app/auth-context'
import { navigate } from '../app/router'
import Button from './Button'
import CenteredCard from './CenteredCard'

export default function AccessDenied() {
  const { signOut } = useAuth()
  return (
    <CenteredCard>
      <h1 className="text-2xl font-bold text-primary">لا تملك صلاحية الوصول</h1>
      <p className="mt-3 text-ink">هذه الصفحة مخصصة للأستاذ فقط.</p>
      <div className="mt-8 space-y-3">
        <Button onClick={() => navigate('/student')}>العودة إلى صفحتي</Button>
        <Button variant="outline" onClick={signOut}>تسجيل الخروج</Button>
      </div>
    </CenteredCard>
  )
}

```

### 📄 `src\components\AppShell.tsx`
```tsx
import type { ReactNode } from 'react'
import { useAuth } from '../app/auth-context'

export interface ShellTab {
  key: string
  label: string
}

interface Props {
  tabs?: ShellTab[]
  current?: string
  onChange?: (key: string) => void
  children: ReactNode
}

/** هيكل التطبيق: شريط علوي (الشعار، المقرر، المدرس، المستخدم، تسجيل الخروج) وتبويبات ومحتوى. */
export default function AppShell({ tabs, current, onChange, children }: Props) {
  const { profile, signOut } = useAuth()
  const roleLabel = profile?.role === 'teacher' ? 'أستاذ' : 'طالب'

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-light-blue bg-white">
        <div className="flex h-1.5" aria-hidden="true">
          <span className="flex-[3] bg-primary" />
          <span className="flex-1 bg-secondary" />
          <span className="flex-1 bg-accent" />
        </div>

        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          {/* الشعار + المقرر + المدرس */}
          <div className="flex items-center gap-3">
            <img
              src="/UST.png"
              alt="شعار جامعة العلوم والتكنولوجيا"
              className="h-14 w-14 rounded-2xl border border-light-blue bg-white object-contain p-1 shadow-sm"
            />
            <div className="leading-tight">
              <div className="text-xl font-bold text-primary">فقه المعاملات</div>
              <div className="mt-0.5 text-xs font-semibold text-ink-muted">
                مدرس المقرر: د. محمد إسماعيل
              </div>
            </div>
          </div>

          {/* المستخدم */}
          <div className="flex items-center gap-3">
            <div className="text-end leading-tight">
              <div className="text-sm font-semibold text-ink">{profile?.full_name}</div>
              <div className="text-xs text-ink-muted">{roleLabel}</div>
            </div>
            <button
              type="button"
              onClick={signOut}
              className="rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary-soft"
            >
              تسجيل الخروج
            </button>
          </div>
        </div>

        {tabs && tabs.length > 0 && (
          <nav className="mx-auto max-w-6xl overflow-x-auto px-4" aria-label="التبويبات">
            <ul className="flex gap-1">
              {tabs.map((t) => {
                const active = t.key === current
                return (
                  <li key={t.key}>
                    <button
                      type="button"
                      onClick={() => onChange?.(t.key)}
                      aria-current={active ? 'page' : undefined}
                      className={`whitespace-nowrap border-b-4 px-4 py-3 text-base transition ${
                        active
                          ? 'border-primary font-bold text-primary'
                          : 'border-transparent text-ink-muted hover:text-primary'
                      }`}
                    >
                      {t.label}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>
        )}
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">{children}</main>

      <footer className="mt-8 border-t border-light-blue bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-ink-muted">
          <span>© 2026 — مقرر فقه المعاملات</span>
          <span>المطور: د. محمد إسماعيل</span>
        </div>
      </footer>
    </div>
  )
}
```

### 📄 `src\components\AttachmentView.tsx`
```tsx
import { useEffect, useState } from 'react'
import { loadFile, type Attachment } from '../demo/files'

const link =
  'rounded-xl border border-primary bg-white px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-surface'

function sizeLabel(n: number) {
  if (n < 1024 * 1024) return Math.max(1, Math.round(n / 1024)) + ' KB'
  return (n / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function AttachmentView({ att }: { att: Attachment }) {
  const [url, setUrl] = useState<string | null>(null)
  const [missing, setMissing] = useState(false)

  useEffect(() => {
    let alive = true
    let made: string | null = null
    loadFile(att.id)
      .then((b) => {
        if (!alive) return
        if (!b) {
          setMissing(true)
          return
        }
        made = URL.createObjectURL(b)
        setUrl(made)
      })
      .catch(() => {
        if (alive) setMissing(true)
      })
    return () => {
      alive = false
      if (made) URL.revokeObjectURL(made)
    }
  }, [att.id])

  const isImage = att.type.startsWith('image/')
  const isPdf = att.type === 'application/pdf'

  return (
    <div className="rounded-xl border border-light-blue p-3">
      {isImage && url && (
        <img src={url} alt={att.name} className="mb-3 max-h-96 max-w-full rounded-xl border border-light-blue" />
      )}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm">
          {att.name} <span className="text-xs text-ink/60" dir="ltr">({sizeLabel(att.size)})</span>
        </span>
        {missing && <span className="text-xs text-ink/60">الملف غير متوفر في هذا المتصفح.</span>}
        {url && (
          <span className="flex gap-2">
            {(isPdf || isImage) && (
              <a className={link} href={url} target="_blank" rel="noreferrer">فتح</a>
            )}
            <a className={link} href={url} download={att.name}>تنزيل</a>
          </span>
        )}
      </div>
    </div>
  )
}

```

### 📄 `src\components\Button.tsx`
```tsx
import type { ButtonHTMLAttributes } from 'react'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'outline' }

export default function Button({ variant = 'primary', className = '', type = 'button', ...props }: Props) {
  const base =
    'inline-flex w-full items-center justify-center rounded-xl px-5 py-3 text-base font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60'
  const styles =
    variant === 'primary'
      ? 'bg-primary text-white shadow-sm hover:bg-primary-hover active:bg-primary-active'
      : 'border border-primary bg-white text-primary hover:bg-primary-soft active:bg-accent-soft/50'
  return <button type={type} className={`${base} ${styles} ${className}`} {...props} />
}
```

### 📄 `src\components\CenteredCard.tsx`
```tsx
import type { ReactNode } from 'react'

/** بطاقة مركزية بشريط الهوية، تُستخدم في صفحات هذه المرحلة. */
export default function CenteredCard({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-bg px-5 py-10">
      <section className="w-full max-w-md overflow-hidden rounded-2xl border border-light-blue bg-white shadow-md">
        <div className="flex h-1.5" aria-hidden="true">
          <span className="flex-[3] bg-primary" />
          <span className="flex-1 bg-secondary" />
          <span className="flex-1 bg-accent" />
        </div>
        <div className="px-6 py-10 text-center sm:px-10 sm:py-12">{children}</div>
      </section>
    </main>
  )
}
```

### 📄 `src\components\DemoBadge.tsx`
```tsx
/** Marks a screen or section that is not yet connected to the database. */
export default function DemoBadge() {
  return (
    <span className="inline-block rounded-full bg-warning px-3 py-0.5 text-xs font-bold text-ink">
      تجريبي
    </span>
  )
}

```

### 📄 `src\components\Tag.tsx`
```tsx
import type { ReactNode } from 'react'

type Tone = 'ok' | 'wait' | 'off' | 'info'

const tones: Record<Tone, string> = {
  ok: 'bg-secondary-soft text-secondary ring-1 ring-secondary/20',
  wait: 'bg-warning-soft text-ink ring-1 ring-warning',
  off: 'bg-error-soft text-error ring-1 ring-error/20',
  info: 'bg-primary-soft text-primary ring-1 ring-primary/20',
}

export default function Tag({ children, tone }: { children: ReactNode; tone: Tone }) {
  return (
    <span className={'inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ' + tones[tone]}>
      {children}
    </span>
  )
}
```
