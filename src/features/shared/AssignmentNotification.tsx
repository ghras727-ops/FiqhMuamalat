
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