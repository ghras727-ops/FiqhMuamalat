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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 p-4 print:bg-white print:p-0">
      <div className="mx-auto max-w-[900px]">
        
        {/* شريط التحكم (يختفي عند الطباعة) */}
        <div className="no-print sticky top-0 z-10 mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3 shadow-lg">
          <div className="text-base font-bold text-error">
            ⚠️ نسخة محمية - يمنع التداول
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft" onClick={() => window.print()}>🖨️ طباعة / حفظ PDF</button>
            <button className="rounded-xl bg-error px-4 py-2 text-sm font-semibold text-white hover:bg-error/90" onClick={onClose}>إغلاق</button>
          </div>
        </div>

        {/* ورقة A4 */}
        <div className="print-area relative overflow-hidden rounded-2xl bg-white p-8 shadow-2xl print:shadow-none" dir="rtl" style={{ minHeight: '297mm' }}>
          
          {/* ⬇️ العلامة المائية (تظهر في خلفية الورقة) */}
          <div className="pointer-events-none absolute inset-0 z-0 flex flex-wrap items-center justify-center overflow-hidden opacity-[0.06]">
            {Array.from({ length: 20 }).map((_, i) => (
              <div key={i} className="m-10 -rotate-45 whitespace-nowrap text-4xl font-bold text-primary">
                خاص بالطالب: {studentName} - {studentNo}
              </div>
            ))}
          </div>

          {/* محتوى الورقة (فوق العلامة المائية) */}
          <div className="relative z-10">
            <header className="mb-6 border-b-2 border-primary pb-4 text-center">
              <h1 className="text-2xl font-bold text-primary">جامعة العلوم والتكنولوجيا</h1>
              <h2 className="text-lg font-semibold text-ink">مقرر فقه المعاملات (1)</h2>
              <div className="mt-2 text-sm text-ink-muted">
                <b>الطالب:</b> {studentName} ({studentNo}) | <b>الدرس:</b> {activityTitle}
              </div>
            </header>

            <div className="space-y-6">
              {questions.map((q, i) => (
                <div key={q.id} className="rounded-xl border border-light-blue bg-white/90 p-4">
                  <div className="flex items-start gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-sm font-bold text-primary">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-lg font-semibold text-ink">{q.text}</p>
                      <p className="mt-1 text-xs font-semibold text-ink-muted">({q.score} درجات)</p>
                      
                      <div className="mt-3 space-y-2 text-sm">
                        <div className={`rounded-lg p-2 ${q.studentAnswer === q.correctAnswer ? 'bg-secondary-soft text-secondary' : 'bg-error-soft text-error'}`}>
                          <b>إجابة الطالب: </b> {q.studentAnswer || '— لم يجب —'}
                        </div>
                        <div className="rounded-lg bg-primary-soft p-2 text-primary">
                          <b>الإجابة النموذجية: </b> {q.correctAnswer}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <footer className="mt-8 border-t border-light-blue pt-4 text-center text-xs text-ink-muted">
              هذا المستند تم تصديره للاستخدام الشخصي فقط. يمنع تداوله أو مشاركته.
            </footer>
          </div>
        </div>
      </div>
    </div>
  )
}