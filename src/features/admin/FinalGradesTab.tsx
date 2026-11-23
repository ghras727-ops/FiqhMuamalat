import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { toPng } from 'html-to-image'
import { jsPDF } from 'jspdf'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const input = 'w-20 rounded-xl border border-light-blue p-2 text-center text-sm font-bold text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent/40'
const btnOutline = 'rounded-xl border border-primary bg-white px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'

interface StudentGrade {
  student_id: string
  full_name: string
  student_no: string
  assignments_10: number
  attendance_10: number
  midterm_20: number | null
  final_60: number | null
  total_100: number
}

export default function FinalGradesTab() {
  const [data, setData] = useState<StudentGrade[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const reportRef = useRef<HTMLDivElement>(null)
  const [showReport, setShowReport] = useState(false)
  const [reportType, setReportType] = useState<'general' | 'individual'>('general')
  const [selectedStudent, setSelectedStudent] = useState<StudentGrade | null>(null)
  const [generatingPdf, setGeneratingPdf] = useState(false)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true); setError(null)

    const { data: grades, error: gErr } = await supabase
      .from('final_grades')
      .select('*, profiles(full_name, student_no)')
      .order('profiles(student_no)')

    if (gErr) { setError(gErr.message); setLoading(false); return }

    const formatted = (grades || []).map((g: any) => ({
      student_id: g.student_id,
      full_name: g.profiles.full_name,
      student_no: g.profiles.student_no,
      assignments_10: g.assignments_10 || 0,
      attendance_10: g.attendance_10 || 0,
      midterm_20: g.midterm_20,
      final_60: g.final_60,
      total_100: g.total_100 || 0
    }))

    setData(formatted)
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function syncData() {
    if (!supabase) return
    if (!window.confirm('سيتم سحب درجات التكاليف والحضور آلياً. هل تريد المتابعة؟')) return
    setBusy(true); setError(null); setSuccess(null)
    
    const { error: rpcErr } = await supabase.rpc('sync_final_grades')
    setBusy(false)
    if (rpcErr) { setError(rpcErr.message); return }
    setSuccess('تم مزامنة الدرجات الآلية بنجاح!')
    await load()
  }

  async function updateManualGrade(studentId: string, field: 'midterm_20' | 'final_60', value: string) {
    if (!supabase) return
    const num = value === '' ? null : Number(value)
    
    setData(prev => prev.map(d => {
      if (d.student_id === studentId) {
        const newData = { ...d, [field]: num }
        const a = Math.min(10, newData.assignments_10)
        const at = Math.min(10, newData.attendance_10)
        const m = Math.min(20, newData.midterm_20 || 0)
        const f = Math.min(60, newData.final_60 || 0)
        newData.total_100 = a + at + m + f
        return newData
      }
      return d
    }))

    await supabase.from('final_grades').update({ [field]: num, updated_at: new Date().toISOString() }).eq('student_id', studentId)
  }

  const openReport = (type: 'general' | 'individual', student?: StudentGrade) => {
    setReportType(type)
    setSelectedStudent(student || null)
    setShowReport(true)
  }

  const downloadPdf = async () => {
    if (!reportRef.current) return
    setGeneratingPdf(true)
    
    try {
      await document.fonts.ready
      const imgData = await toPng(reportRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' })
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgProps = pdf.getImageProperties(imgData)
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width

      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
      heightLeft -= pdfHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
        heightLeft -= pdfHeight
      }

      pdf.save(reportType === 'general' ? 'التقرير_العام_للنتائج.pdf' : `نتيجة_${selectedStudent?.full_name}.pdf`)
    } catch (err) {
      console.error(err)
      alert('فشل إنشاء التقرير.')
    } finally {
      setGeneratingPdf(false)
    }
  }

  if (loading) return <section className={card}><p>جارٍ التحميل...</p></section>

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold">النتائج النهائية والتجميعية</h2>
          <p className="mt-1 text-base text-white/85">تجميع درجات التكاليف والاختبارات، الحضور، والاختبار النصفي والنهائي.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="rounded-xl bg-white px-5 py-2.5 text-primary font-bold shadow-sm hover:bg-primary-soft" onClick={() => void syncData()} disabled={busy}>
            {busy ? '⏳ جاري المزامنة...' : '🔄 مزامنة الدرجات'}
          </button>
          <button className="rounded-xl border-2 border-white bg-primary-hover px-5 py-2.5 font-bold text-white shadow-sm hover:bg-primary-active" onClick={() => openReport('general')}>
            📄 تصدير التقرير العام (PDF)
          </button>
        </div>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-error">{error}</p>}
      {success && <p className="rounded-xl bg-secondary-soft p-3 text-secondary">{success}</p>}

      <section className={card}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-center">
            <thead>
              <tr className="border-b-2 border-primary bg-primary-soft/30 text-primary">
                <th className="p-3 text-start">الطالب</th>
                <th className="p-3">التكاليف والاختبارات (10)</th>
                <th className="p-3">الحضور (10)</th>
                <th className="p-3">الاختبار النصفي (20)</th>
                <th className="p-3">النهائي (60)</th>
                <th className="p-3 font-bold text-lg">المجموع (100)</th>
                <th className="p-3">إجراء</th>
              </tr>
            </thead>
            <tbody>
              {data.map(d => (
                <tr key={d.student_id} className="border-b border-light-blue/50 hover:bg-bg">
                  <td className="p-3 text-start">
                    <div className="font-bold text-ink">{d.full_name}</div>
                    <div className="text-xs text-ink-muted font-mono">{d.student_no}</div>
                  </td>
                  <td className="p-3 font-semibold text-primary">{d.assignments_10.toFixed(1)}</td>
                  <td className="p-3 font-semibold text-primary">{d.attendance_10.toFixed(1)}</td>
                  <td className="p-3">
                    <input 
                      type="number" min={0} max={20} className={input} 
                      value={d.midterm_20 ?? ''} 
                      onChange={(e) => void updateManualGrade(d.student_id, 'midterm_20', e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="0"
                    />
                  </td>
                  <td className="p-3">
                    <input 
                      type="number" min={0} max={60} className={input} 
                      value={d.final_60 ?? ''} 
                      onChange={(e) => void updateManualGrade(d.student_id, 'final_60', e.target.value)}
                      onWheel={(e) => e.currentTarget.blur()}
                      placeholder="0"
                    />
                  </td>
                  <td className="p-3">
                    <span className="inline-block rounded-lg bg-secondary px-4 py-1.5 text-base font-bold text-white shadow-sm">
                      {d.total_100.toFixed(1)}
                    </span>
                  </td>
                  <td className="p-3">
                    <button className={btnOutline} onClick={() => openReport('individual', d)}>تقرير</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ⬇️ نافذة معاينة التقرير (تظهر فوق الشاشة لالتقاطها) */}
      {showReport && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-2 md:p-6">
          <div className="mx-auto max-w-[900px]">
            <div className="no-print sticky top-0 z-10 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3 shadow-lg">
              <div className="text-base font-bold text-primary">
                {reportType === 'general' ? '📄 معاينة التقرير العام' : `📄 معاينة تقرير: ${selectedStudent?.full_name}`}
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary" onClick={() => void downloadPdf()} disabled={generatingPdf}>
                  {generatingPdf ? '⏳ جاري التحميل...' : '🖨️ تنزيل PDF'}
                </button>
                <button className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white" onClick={() => setShowReport(false)}>إغلاق</button>
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl bg-white shadow-2xl">
              <div ref={reportRef} style={{ width: '794px', background: 'white', padding: '40px', fontFamily: '"Cairo", sans-serif', direction: 'rtl', margin: '0 auto' }}>
                
                <div style={{ borderBottom: '2px solid #0B6CB3', paddingBottom: '10px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#0B6CB3', margin: 0 }}>جامعة العلوم والتكنولوجيا</h1>
                    <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#123A2E', margin: '4px 0' }}>مقرر فقه المعاملات (1)</h2>
                    <p style={{ fontSize: '14px', color: '#4B5D63', margin: 0 }}>
                      {reportType === 'general' ? 'التقرير العام للنتائج' : `كشف درجات الطالب: ${selectedStudent?.full_name}`}
                    </p>
                  </div>
                  <img src="/UST.png" alt="Logo" style={{ width: '60px', height: '60px' }} />
                </div>

                {reportType === 'general' && (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                    <thead>
                      <tr style={{ background: '#E6F2FA', color: '#0B6CB3' }}>
                        <th style={{ border: '1px solid #D6E4EC', padding: '8px', textAlign: 'right' }}>الطالب</th>
                        <th style={{ border: '1px solid #D6E4EC', padding: '8px' }}>التكاليف (10)</th>
                        <th style={{ border: '1px solid #D6E4EC', padding: '8px' }}>الحضور (10)</th>
                        <th style={{ border: '1px solid #D6E4EC', padding: '8px' }}>النصفي (20)</th>
                        <th style={{ border: '1px solid #D6E4EC', padding: '8px' }}>النهائي (60)</th>
                        <th style={{ border: '1px solid #D6E4EC', padding: '8px' }}>المجموع (100)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map(d => (
                        <tr key={d.student_id} style={{ textAlign: 'center' }}>
                          <td style={{ border: '1px solid #D6E4EC', padding: '6px', textAlign: 'right' }}>{d.full_name}</td>
                          <td style={{ border: '1px solid #D6E4EC', padding: '6px' }}>{d.assignments_10.toFixed(1)}</td>
                          <td style={{ border: '1px solid #D6E4EC', padding: '6px' }}>{d.attendance_10.toFixed(1)}</td>
                          <td style={{ border: '1px solid #D6E4EC', padding: '6px' }}>{d.midterm_20 || '0'}</td>
                          <td style={{ border: '1px solid #D6E4EC', padding: '6px' }}>{d.final_60 || '0'}</td>
                          <td style={{ border: '1px solid #D6E4EC', padding: '6px', fontWeight: 800, color: '#198B48' }}>{d.total_100.toFixed(1)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                {reportType === 'individual' && selectedStudent && (
                  <div>
                    <div style={{ background: '#F7FBFD', padding: '15px', borderRadius: '8px', marginBottom: '20px', border: '1px solid #D6E4EC' }}>
                      <p style={{ margin: '5px 0', fontSize: '14px' }}><b>الاسم:</b> {selectedStudent.full_name}</p>
                      <p style={{ margin: '5px 0', fontSize: '14px' }}><b>الرقم الجامعي:</b> {selectedStudent.student_no}</p>
                    </div>
                    
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
                      <thead>
                        <tr style={{ background: '#E6F2FA', color: '#0B6CB3' }}>
                          <th style={{ border: '1px solid #D6E4EC', padding: '10px', textAlign: 'right' }}>البند</th>
                          <th style={{ border: '1px solid #D6E4EC', padding: '10px' }}>الدرجة</th>
                          <th style={{ border: '1px solid #D6E4EC', padding: '10px' }}>من</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ textAlign: 'center' }}>
                          <td style={{ border: '1px solid #D6E4EC', padding: '10px', textAlign: 'right' }}>التكاليف والاختبارات القصيرة</td>
                          <td style={{ border: '1px solid #D6E4EC', padding: '10px' }}>{selectedStudent.assignments_10.toFixed(1)}</td>
                          <td style={{ border: '1px solid #D6E4EC', padding: '10px' }}>10</td>
                        </tr>
                        <tr style={{ textAlign: 'center' }}>
                          <td style={{ border: '1px solid #D6E4EC', padding: '10px', textAlign: 'right' }}>الحضور والغياب</td>
                          <td style={{ border: '1px solid #D6E4EC', padding: '10px' }}>{selectedStudent.attendance_10.toFixed(1)}</td>
                          <td style={{ border: '1px solid #D6E4EC', padding: '10px' }}>10</td>
                        </tr>
                        <tr style={{ textAlign: 'center' }}>
                          <td style={{ border: '1px solid #D6E4EC', padding: '10px', textAlign: 'right' }}>الاختبار النصفي</td>
                          <td style={{ border: '1px solid #D6E4EC', padding: '10px' }}>{selectedStudent.midterm_20 || '0'}</td>
                          <td style={{ border: '1px solid #D6E4EC', padding: '10px' }}>20</td>
                        </tr>
                        <tr style={{ textAlign: 'center' }}>
                          <td style={{ border: '1px solid #D6E4EC', padding: '10px', textAlign: 'right' }}>الاختبار النهائي</td>
                          <td style={{ border: '1px solid #D6E4EC', padding: '10px' }}>{selectedStudent.final_60 || '0'}</td>
                          <td style={{ border: '1px solid #D6E4EC', padding: '10px' }}>60</td>
                        </tr>
                        <tr style={{ textAlign: 'center', background: '#E8F5ED', fontWeight: 800 }}>
                          <td style={{ border: '1px solid #D6E4EC', padding: '10px', textAlign: 'right', color: '#198B48' }}>المجموع النهائي</td>
                          <td style={{ border: '1px solid #D6E4EC', padding: '10px', color: '#198B48' }}>{selectedStudent.total_100.toFixed(1)}</td>
                          <td style={{ border: '1px solid #D6E4EC', padding: '10px', color: '#198B48' }}>100</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                )}

                <div style={{ marginTop: '30px', borderTop: '1px solid #D6E4EC', paddingTop: '10px', textAlign: 'center', fontSize: '12px', color: '#4B5D63' }}>
                  تم إصدار هذا التقرير آلياً من منصة فقه المعاملات.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}