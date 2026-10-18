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
    
    // توليد رابط مؤقت لملف PDF (بافتراض ملف واحد حالياً)
    if (sub.assignment_files.length > 0 && supabase) {
      const path = sub.assignment_files[0].file_path
      const { data } = await supabase.storage.from('course-files').createSignedUrl(path, 3600)
      if (data?.signedUrl) {
        // سنحتفظ بالرابط في الـ state
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
    setGradingSub(null); setScoreInput(''); setNoteInput('')
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
                <div className="w-2/3 bg-bg rounded-xl border border-light-blue">
                  {gradingSub.assignment_files.length > 0 ? (
                    <iframe src={gradingSub.assignment_files[0].file_path} className="w-full h-[60vh] rounded-xl" title="PDF" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-ink-muted">لا توجد ملفات مرفقة.</div>
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