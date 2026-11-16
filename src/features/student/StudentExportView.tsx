import { useEffect, useRef, useState } from 'react'
import { toJpeg } from 'html-to-image'
import { jsPDF } from 'jspdf'

interface Question {
  id: string
  type: string
  text: string
  score: number
  studentAnswer: string
  correctAnswer: string
}

interface Props {
  studentName: string
  studentNo: string
  activityTitle: string
  questions: Question[]
  onClose: () => void
}

export default function StudentExportView({ studentName, studentNo, activityTitle, questions, onClose }: Props) {
  const printRef = useRef<HTMLDivElement>(null)
  const [downloading, setDownloading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // دالة توليد وتنزيل الـ PDF مباشرة
  const downloadPdf = async () => {
    if (!printRef.current) return
    setDownloading(true)
    setError(null)

    try {
      // 1. التقاط صورة عالية الدقة للورقة
      const imgData = await toJpeg(printRef.current, {
        pixelRatio: 3,
        quality: 1,
        backgroundColor: '#ffffff',
      })

      // 2. إنشاء مستند A4
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      })

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgProps = pdf.getImageProperties(imgData)
      const imgHeight = (imgProps.height * pdfWidth) / imgProps.width

      let heightLeft = imgHeight
      let position = 0

      // 3. إضافة الصورة للصفحة الأولى
      pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight)
      heightLeft -= pdfHeight

      // 4. إذا كانت الورقة أطول من صفحة واحدة، نضيف صفحات جديدة
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeight)
        heightLeft -= pdfHeight
      }

      // 5. حفظ الملف مباشرة
      const safeTitle = activityTitle.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_')
      pdf.save(`اختبار_${studentName}_${safeTitle}.pdf`)
      
      // إغلاق النافذة بعد التنزيل
      setTimeout(() => onClose(), 1000)

    } catch (err: any) {
      console.error('PDF Generation Error:', err)
      setError('حدث خطأ أثناء إنشاء ملف الـ PDF. يرجى المحاولة مرة أخرى.')
      setDownloading(false)
    }
  }

  // بدء التنزيل تلقائياً بمجرد فتح الشاشة
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    
    // تأخير بسيط للتأكد من تحميل الخطوط والصور قبل الالتقاط
    const timer = setTimeout(() => {
      void downloadPdf()
    }, 800)

    return () => { 
      document.body.style.overflow = '' 
      clearTimeout(timer)
    }
  }, [])

  // هندسة الطباعة
  const printStyles = {
    container: {
      width: '210mm',
      minHeight: '297mm',
      background: 'white',
      margin: '0 auto',
      padding: '15mm 15mm 20mm 15mm',
      position: 'relative' as const,
      fontFamily: '"Cairo", "IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif',
      boxSizing: 'border-box' as const,
      color: '#123A2E',
    },
    watermarkContainer: {
      position: 'absolute' as const,
      top: 0, left: 0, right: 0, bottom: 0,
      overflow: 'hidden',
      pointerEvents: 'none' as const,
      zIndex: 0,
      display: 'flex',
      flexWrap: 'wrap' as const,
      justifyContent: 'center',
      alignItems: 'center',
      opacity: 0.08,
    },
    watermarkText: {
      fontSize: '28px',
      fontWeight: 800,
      color: '#0B6CB3',
      transform: 'rotate(-45deg)',
      whiteSpace: 'nowrap' as const,
      margin: '40px',
    },
    content: {
      position: 'relative' as const,
      zIndex: 10,
    },
    questionBlock: {
      pageBreakInside: 'avoid' as const,
      breakInside: 'avoid' as const,
      marginBottom: '20px',
      padding: '15px',
      border: '1px solid #D6E4EC',
      borderRadius: '8px',
      backgroundColor: 'rgba(255, 255, 255, 0.95)', // شفافية خفيفة لتظهر العلامة المائية
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4">
      
      {/* شاشة التحميل (تغطي الشاشة أثناء إنشاء الملف) */}
      {downloading && (
        <div className="absolute inset-0 z-[110] flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="rounded-2xl bg-white p-8 text-center shadow-2xl">
            <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <h3 className="text-xl font-bold text-primary">جارٍ توليد ملف PDF...</h3>
            <p className="mt-2 text-sm text-ink-muted">يرجى الانتظار، سيبدأ التنزيل تلقائياً.</p>
            
            {error && (
              <div className="mt-4">
                <p className="text-sm font-semibold text-error">{error}</p>
                <button 
                  className="mt-4 rounded-xl bg-primary px-6 py-2 font-bold text-white shadow-md hover:bg-primary-hover" 
                  onClick={() => void downloadPdf()}
                >
                  إعادة المحاولة
                </button>
                <button 
                  className="mt-4 ms-2 rounded-xl border border-error bg-white px-6 py-2 font-bold text-error hover:bg-error-soft" 
                  onClick={onClose}
                >
                  إغلاق
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ورقة A4 (تظل مخفية خلف شاشة التحميل، ولا تُرى إلا إذا فشل التحميل) */}
      <div 
        ref={printRef} 
        className="shadow-2xl" 
        style={{ ...printStyles.container, position: 'absolute', top: '-9999px', left: '-9999px' }} // نخفيها خارج الشاشة لنلتقطها فقط
      >
        {/* العلامة المائية */}
        <div style={printStyles.watermarkContainer}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} style={printStyles.watermarkText}>
              {studentName} - {studentNo}
            </div>
          ))}
        </div>

        {/* محتوى الورقة */}
        <div style={printStyles.content}>
          <header style={{ borderBottom: '2px solid #0B6CB3', paddingBottom: '10px', marginBottom: '20px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0B6CB3', margin: 0 }}>جامعة العلوم والتكنولوجيا</h1>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#123A2E', margin: '4px 0' }}>مقرر فقه المعاملات (1)</h2>
            <div style={{ fontSize: '14px', color: '#4B5D63' }}>
              <b>الطالب:</b> {studentName} ({studentNo}) | <b>الاختبار:</b> {activityTitle}
            </div>
          </header>

          <div>
            {questions.map((q, index) => (
              <div key={q.id} style={printStyles.questionBlock}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 800, color: '#0B6CB3' }}>السؤال {index + 1}</span>
                  <span style={{ fontSize: '12px', fontWeight: 700, color: '#4B5D63', backgroundColor: '#E6F2FA', padding: '2px 8px', borderRadius: '4px' }}>
                    {q.score} درجات
                  </span>
                </div>
                
                <p style={{ fontSize: '16px', fontWeight: 700, margin: '0 0 12px 0', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {q.text}
                </p>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '14px', padding: '8px 12px', backgroundColor: '#FBEAEC', color: '#D74050', borderRadius: '6px', border: '1px solid rgba(215,64,80,0.2)' }}>
                    <b>إجابة الطالب: </b> <span style={{ whiteSpace: 'pre-wrap' }}>{q.studentAnswer || '— لم يجب —'}</span>
                  </div>
                  <div style={{ fontSize: '14px', padding: '8px 12px', backgroundColor: '#E8F5ED', color: '#198B48', borderRadius: '6px', border: '1px solid rgba(25,139,72,0.2)' }}>
                    <b>الإجابة النموذجية: </b> <span style={{ whiteSpace: 'pre-wrap' }}>{q.correctAnswer}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '30px', paddingTop: '10px', borderTop: '1px solid #D6E4EC', textAlign: 'center', fontSize: '12px', color: '#4B5D63' }}>
            هذا المستند تم تصديره للاستخدام الشخصي فقط. يمنع تداوله أو مشاركته.
          </div>
        </div>
      </div>
    </div>
  )
}