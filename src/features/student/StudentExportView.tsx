import { useEffect } from 'react'

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
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // هندسة الطباعة المخصصة
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
    <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/80 p-4 print:bg-white print:p-0 print:static print:overflow-visible">
      
      {/* شريط التحكم العلوي (يختفي عند الطباعة) */}
      <div className="no-print sticky top-0 z-50 mb-4 mx-auto max-w-[900px] flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-xl">
        <div>
          <h2 className="text-xl font-bold text-error">⚠️ معاينة الطباعة</h2>
          <p className="text-sm text-ink-muted">تأكد من اختيار مقاس A4 وإلغاء "الترويسة والتذييل" في إعدادات المتصفح.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button 
            className="rounded-xl bg-primary px-6 py-2.5 font-bold text-white shadow-md hover:bg-primary-hover" 
            onClick={() => window.print()}
          >
            🖨️ طباعة / حفظ PDF
          </button>
          <button 
            className="rounded-xl border border-error bg-white px-6 py-2.5 font-bold text-error hover:bg-error-soft" 
            onClick={onClose}
          >
            إغلاق
          </button>
        </div>
      </div>

      {/* ورقة A4 */}
      <div className="print-area mx-auto shadow-2xl print:shadow-none" style={printStyles.container}>
        
        {/* قواعد CSS خاصة بالطباعة (تطبق فقط عند الطبع) */}
        <style dangerouslySetInnerHTML={{__html: `
          @page { size: A4 portrait; margin: 0; }
          @media print {
            html, body { 
              margin: 0 !important; 
              padding: 0 !important; 
              background: white !important; 
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact;
            }
            .print-area {
              box-shadow: none !important;
              border: none !important;
              margin: 0 !important;
            }
          }
        `}} />

        {/* ⬇️ العلامة المائية (مغطاة بـ overflow) */}
        <div style={printStyles.watermarkContainer}>
          {Array.from({ length: 30 }).map((_, i) => (
            <div key={i} style={printStyles.watermarkText}>
              {studentName} - {studentNo}
            </div>
          ))}
        </div>

        {/* ⬇️ محتوى الورقة (فوق العلامة المائية) */}
        <div style={printStyles.content}>
          
          {/* الترويسة */}
          <header style={{ borderBottom: '2px solid #0B6CB3', paddingBottom: '10px', marginBottom: '20px', textAlign: 'center' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0B6CB3', margin: 0 }}>جامعة العلوم والتكنولوجيا</h1>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#123A2E', margin: '4px 0' }}>مقرر فقه المعاملات (1)</h2>
            <div style={{ fontSize: '14px', color: '#4B5D63' }}>
              <b>الطالب:</b> {studentName} ({studentNo}) | <b>الاختبار:</b> {activityTitle}
            </div>
          </header>

          {/* الأسئلة */}
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

          {/* التذييل */}
          <div style={{ marginTop: '30px', paddingTop: '10px', borderTop: '1px solid #D6E4EC', textAlign: 'center', fontSize: '12px', color: '#4B5D63' }}>
            هذا المستند تم تصديره للاستخدام الشخصي فقط. يمنع تداوله أو مشاركته.
          </div>
        </div>
      </div>
    </div>
  )
}