export interface ComprehensiveSnapshot {
  student: { full_name: string; student_no: string | null }
  from_week: number
  to_week: number
  generated_at: string
  grades: { week: number; title: string; score: number; max: number; percent: number; status: string }[]
  attendance: { week: number; status: string }[]
  options: { showGrades: boolean; showAttendance: boolean }
}

const STATUS_LABEL: Record<string, string> = {
  present: 'حاضر',
  absent: 'غائب',
  excused: 'معذور',
  graded: 'مصحح',
  submitted: 'بانتظار التصحيح',
  draft: 'مسودة',
}

export default function ComprehensiveReport({ snapshot }: { snapshot: ComprehensiveSnapshot }) {
  const { student, from_week, to_week, grades, attendance, options, generated_at } = snapshot

  return (
    <div className="w-full bg-white p-8 text-ink print:p-0" dir="rtl">
      <header className="mb-8 border-b-2 border-primary pb-4 text-center">
        <h1 className="text-2xl font-bold text-primary">جامعة العلوم والتكنولوجيا</h1>
        <h2 className="mt-1 text-lg font-semibold text-ink">كلية الشريعة والقانون - مقرر فقه المعاملات (1)</h2>
        <p className="mt-2 text-sm font-bold text-ink-muted">تقرير الطالب الشامل — الأسابيع {from_week} إلى {to_week}</p>
      </header>

      <div className="mb-8 flex flex-wrap justify-between gap-4 rounded-xl border border-light-blue bg-bg p-4 text-sm">
        <div><b>اسم الطالب:</b> {student.full_name}</div>
        <div><b>الرقم الجامعي:</b> {student.student_no || '—'}</div>
        <div><b>تاريخ الإصدار:</b> {new Date(generated_at).toLocaleDateString('ar-SA')}</div>
      </div>

      {options.showGrades && (
        <section className="mb-8">
          <h3 className="mb-3 text-lg font-bold text-primary border-r-4 border-primary pr-2">1. الجدول الأكاديمي (الدرجات)</h3>
          {grades.length === 0 ? <p className="text-sm text-ink-muted">لا توجد درجات مسجلة في هذه الفترة.</p> : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-primary-soft text-primary">
                  <th className="border border-light-blue p-2">الأسبوع</th>
                  <th className="border border-light-blue p-2">النشاط</th>
                  <th className="border border-light-blue p-2">الدرجة</th>
                  <th className="border border-light-blue p-2">النسبة</th>
                  <th className="border border-light-blue p-2">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {grades.map((g, i) => (
                  <tr key={i} className="text-center">
                    <td className="border border-light-blue p-2">الأسبوع {g.week}</td>
                    <td className="border border-light-blue p-2 text-start">{g.title}</td>
                    <td className="border border-light-blue p-2 font-bold" dir="ltr">{g.score} / {g.max}</td>
                    <td className="border border-light-blue p-2 font-bold text-secondary" dir="ltr">{g.percent}%</td>
                    <td className="border border-light-blue p-2">{STATUS_LABEL[g.status] || g.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {options.showAttendance && (
        <section className="mb-8">
          <h3 className="mb-3 text-lg font-bold text-primary border-r-4 border-primary pr-2">2. سجل الحضور والغياب</h3>
          {attendance.length === 0 ? <p className="text-sm text-ink-muted">لا يوجد سجل حضور في هذه الفترة.</p> : (
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-primary-soft text-primary">
                  <th className="border border-light-blue p-2">الأسبوع</th>
                  <th className="border border-light-blue p-2">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {attendance.map((a, i) => (
                  <tr key={i} className="text-center">
                    <td className="border border-light-blue p-2">الأسبوع {a.week}</td>
                    <td className="border border-light-blue p-2">
                      <span className={a.status === 'present' ? 'text-secondary font-bold' : a.status === 'absent' ? 'text-error font-bold' : 'text-warning font-bold'}>
                        {STATUS_LABEL[a.status] || a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      <footer className="mt-16 border-t border-light-blue pt-4 text-center text-sm text-ink-muted">
        <p>تم إصدار هذا التقرير آلياً من منصة فقه المعاملات.</p>
        <p className="mt-2">توقيع مدرس المقرر: __________________</p>
      </footer>
    </div>
  )
}