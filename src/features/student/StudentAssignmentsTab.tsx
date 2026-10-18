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