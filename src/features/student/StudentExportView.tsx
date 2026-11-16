import { useEffect, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
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
  const [status, setStatus] = useState<'loading' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  const generatePdf = async () => {
    if (!printRef.current) return
    setStatus('loading')

    try {
      await document.fonts.ready
      await new Promise(r => setTimeout(r, 800))

      const imgData = await toPng(printRef.current, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        style: { transform: 'scale(1)', transformOrigin: 'top left' }
      })

      if (!imgData || imgData.length < 5000) {
        throw new Error('فشل التقاط الصفحة (الصورة فارغة).')
      }

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

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
      heightLeft -= pdfHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight)
        heightLeft -= pdfHeight
      }

      const safeTitle = activityTitle.replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, '_')
      pdf.save(`اختبار_${studentName}_${safeTitle}.pdf`)
      
      setTimeout(() => onClose(), 1000)

    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'حدث خطأ غير متوقع أثناء إنشاء الملف.')
      setStatus('error')
    }
  }

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    void generatePdf()
    return () => { document.body.style.overflow = '' }
  }, [])

  const printStyles = {
    container: {
      width: '794px', 
      minHeight: '1123px', 
      background: 'white',
      padding: '50px 60px',
      position: 'absolute' as const,
      top: 0,
      left: 0,
      zIndex: 1, 
      fontFamily: '"Cairo", "IBM Plex Sans Arabic", "Segoe UI", Tahoma, sans-serif',
      boxSizing: 'border-box' as const,
      color: '#123A2E',
      direction: 'rtl' as const,
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
      marginBottom: '20px',
      padding: '15px',
      border: '1px solid #D6E4EC',
      borderRadius: '8px',
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
    }
  }

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden bg-white">
      
      {/* الورقة التي سيتم التقاطها */}
      <div ref={printRef} style={printStyles.container}>
        {/* العلامة المائية */}
        <div style={printStyles.watermarkContainer}>
          {Array.from({ length: 40 }).map((_, i) => (
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
            {questions.map((q, index) => {
              // تحديد ما إذا كان السؤال مقالياً أم لا
              const isEssay = q.type.startsWith('essay')
              // مقارنة نص إجابة الطالب بالنص النموذجي (للأسئلة الموضوعية فقط)
              const isCorrect = q.studentAnswer?.trim() === q.correctAnswer?.trim()

              // إعدادات لون إجابة الطالب
              let studentBg = '#FBEAEC' // أحمر افتراضي
              let studentColor = '#D74050'
              let studentBorder = '1px solid rgba(215,64,80,0.2)'

              if (isEssay) {
                // إذا كان مقالياً، نستخدم لوناً محايداً لأن المقارنة النصية لا تنطبق
                studentBg = '#F7FBFD'
                studentColor = '#123A2E'
                studentBorder = '1px solid #D6E4EC'
              } else if (isCorrect) {
                // إذا كانت الإجابة صحيحة، نستخدم اللون الأخضر
                studentBg = '#E8F5ED'
                studentColor = '#198B48'
                studentBorder = '1px solid rgba(25,139,72,0.2)'
              }

              return (
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
                    {/* إجابة الطالب (ديناميكية اللون) */}
                    <div style={{ fontSize: '14px', padding: '8px 12px', backgroundColor: studentBg, color: studentColor, borderRadius: '6px', border: studentBorder }}>
                      <b>إجابة الطالب: </b> 
                      <span style={{ whiteSpace: 'pre-wrap' }}>
                        {q.studentAnswer || '— لم يجب —'}
                        {!isEssay && isCorrect && ' ✓'}
                        {!isEssay && !isCorrect && ' ✗'}
                      </span>
                    </div>
                    {/* الإجابة النموذجية (دائماً خضراء) */}
                    <div style={{ fontSize: '14px', padding: '8px 12px', backgroundColor: '#E8F5ED', color: '#198B48', borderRadius: '6px', border: '1px solid rgba(25,139,72,0.2)' }}>
                      <b>الإجابة النموذجية: </b> <span style={{ whiteSpace: 'pre-wrap' }}>{q.correctAnswer}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: '30px', paddingTop: '10px', borderTop: '1px solid #D6E4EC', textAlign: 'center', fontSize: '12px', color: '#4B5D63' }}>
            هذا المستند تم تصديره للاستخدام الشخصي فقط. يمنع تداوله أو مشاركته.
          </div>
        </div>
      </div>

      {/* شاشة التحميل */}
      <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-md">
        <div className="rounded-3xl bg-white p-10 text-center shadow-2xl max-w-md w-full mx-4">
          
          {status === 'loading' && (
            <>
              <div className="mx-auto mb-6 h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
              <h3 className="text-2xl font-bold text-primary mb-2">جارٍ تجهيز ملف الـ PDF</h3>
              <p className="text-ink-muted">يتم الآن تصدير الأسئلة والإجابات، سيبدأ التنزيل تلقائياً خلال لحظات...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-error-soft text-error">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-error mb-2">فشل إنشاء الملف</h3>
              <p className="text-sm text-ink-muted mb-6">{errorMsg}</p>
              <div className="flex gap-2 justify-center">
                <button 
                  className="rounded-xl bg-primary px-6 py-2.5 font-bold text-white shadow-md hover:bg-primary-hover transition" 
                  onClick={() => void generatePdf()}
                >
                  إعادة المحاولة
                </button>
                <button 
                  className="rounded-xl border border-light-blue bg-white px-6 py-2.5 font-bold text-ink hover:bg-bg transition" 
                  onClick={onClose}
                >
                  إغلاق
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}