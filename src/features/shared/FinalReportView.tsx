// D:\FiqhMuamalat\src\features\shared\FinalReportView.tsx
const C = {
  blue: '#0B6CB3', blueSoft: '#E6F2FA', green: '#198B48', greenSoft: '#E8F5ED',
  ink: '#123A2E', gray: '#4B5D63', line: '#D6E4EC', paper: '#F7FBFD',
}

const TEACHER = 'د. محمد إسماعيل'

export default function FinalReportView({ snapshot, reportNumber, approvedAt }: { snapshot: any, reportNumber: string, approvedAt: string }) {
  return (
    <div dir="rtl" className="print-area" style={{ width: '210mm', minHeight: '297mm', background: 'white', padding: '40px', fontFamily: '"Cairo", sans-serif', margin: '0 auto', boxSizing: 'border-box' }}>
      
      <div style={{ borderBottom: `2px solid ${C.blue}`, paddingBottom: '15px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: C.blue, margin: 0 }}>جامعة العلوم والتكنولوجيا</h1>
          <h2 style={{ fontSize: '16px', fontWeight: 700, color: C.ink, margin: '4px 0' }}>كلية العلوم الإدارية والإنسانية - قسم الشريعة والقانون</h2>
          <p style={{ fontSize: '15px', color: C.gray, margin: 0 }}>مقرر فقه المعاملات (1)</p>
        </div>
        <img src="/UST.png" alt="Logo" style={{ width: '70px', height: '70px' }} />
      </div>

      <h3 style={{ textAlign: 'center', fontSize: '18px', fontWeight: 800, color: C.blue, marginBottom: '15px' }}>كشف الدرجات النهائي</h3>
      
      <div style={{ background: C.paper, padding: '15px', borderRadius: '8px', marginBottom: '20px', border: `1px solid ${C.line}`, display: 'flex', justifyContent: 'space-between' }}>
        <p style={{ margin: 0, fontSize: '15px' }}><b>اسم الطالب:</b> {snapshot.student_name}</p>
        <p style={{ margin: 0, fontSize: '15px' }}><b>الرقم الجامعي:</b> {snapshot.student_no}</p>
      </div>
      
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr style={{ background: C.blueSoft, color: C.blue }}>
            <th style={{ border: `1px solid ${C.line}`, padding: '10px', textAlign: 'right' }}>البند التقييمي</th>
            <th style={{ border: `1px solid ${C.line}`, padding: '10px' }}>الدرجة المحصلة</th>
            <th style={{ border: `1px solid ${C.line}`, padding: '10px' }}>الدرجة العظمى</th>
          </tr>
        </thead>
        <tbody>
          <tr style={{ textAlign: 'center' }}>
            <td style={{ border: `1px solid ${C.line}`, padding: '10px', textAlign: 'right' }}>التكاليف والاختبارات الأسبوعية</td>
            <td style={{ border: `1px solid ${C.line}`, padding: '10px' }}>{Number(snapshot.assignments_10).toFixed(1)}</td>
            <td style={{ border: `1px solid ${C.line}`, padding: '10px' }}>10</td>
          </tr>
          <tr style={{ textAlign: 'center' }}>
            <td style={{ border: `1px solid ${C.line}`, padding: '10px', textAlign: 'right' }}>الحضور والغياب</td>
            <td style={{ border: `1px solid ${C.line}`, padding: '10px' }}>{Number(snapshot.attendance_10).toFixed(1)}</td>
            <td style={{ border: `1px solid ${C.line}`, padding: '10px' }}>10</td>
          </tr>
          <tr style={{ textAlign: 'center' }}>
            <td style={{ border: `1px solid ${C.line}`, padding: '10px', textAlign: 'right' }}>الاختبار النصفي</td>
            <td style={{ border: `1px solid ${C.line}`, padding: '10px' }}>{Number(snapshot.midterm_20).toFixed(1)}</td>
            <td style={{ border: `1px solid ${C.line}`, padding: '10px' }}>20</td>
          </tr>
          <tr style={{ textAlign: 'center' }}>
            <td style={{ border: `1px solid ${C.line}`, padding: '10px', textAlign: 'right' }}>الاختبار النهائي</td>
            <td style={{ border: `1px solid ${C.line}`, padding: '10px' }}>{Number(snapshot.final_60).toFixed(1)}</td>
            <td style={{ border: `1px solid ${C.line}`, padding: '10px' }}>60</td>
          </tr>
          <tr style={{ textAlign: 'center', background: C.greenSoft, fontWeight: 800 }}>
            <td style={{ border: `1px solid ${C.line}`, padding: '12px', textAlign: 'right', color: C.green }}>المجموع النهائي</td>
            <td style={{ border: `1px solid ${C.line}`, padding: '12px', color: C.green }}>{Number(snapshot.total_100).toFixed(1)}</td>
            <td style={{ border: `1px solid ${C.line}`, padding: '12px', color: C.green }}>100</td>
          </tr>
        </tbody>
      </table>

      <div style={{ marginTop: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div style={{ fontSize: '14px', color: C.gray }}>
          <p>رقم التقرير: <span style={{ fontFamily: 'monospace' }}>{reportNumber}</span></p>
          <p>التاريخ: {new Date(approvedAt).toLocaleDateString('ar-SA-u-nu-latn')}</p>
        </div>
        <div style={{ textAlign: 'center' }}>
          <img src="/signature.png" alt="Signature" style={{ height: '60px', marginBottom: '5px' }} />
          <p style={{ margin: 0, fontWeight: 800, color: C.blue, borderTop: `1px solid ${C.blue}`, paddingTop: '5px', width: '200px' }}>{TEACHER}</p>
        </div>
      </div>
    </div>
  )
}