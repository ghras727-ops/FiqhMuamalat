import DemoBadge from '../../components/DemoBadge'
import { card, th } from '../../components/ui'
import { demoMaterials, demoQuestions, demoReviews, demoStudents, demoWeeks, qTypeLabel } from '../../demo/data'

export default function HomeTab() {
  const stats = [
    { n: demoStudents.length, label: 'طلاب مسجلون' },
    { n: demoWeeks.length, label: 'أسابيع' },
    { n: demoMaterials.filter((m) => m.published).length, label: 'مواد منشورة' },
    { n: demoReviews.length, label: 'بانتظار مراجعتك' },
  ]
  const question = (id: string) => demoQuestions.find((q) => q.id === id)

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold text-primary">الرئيسية</h1>
        <DemoBadge />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-2xl border border-light-blue bg-white p-4">
            <div className="text-3xl font-bold text-primary">{s.n}</div>
            <div className="mt-1 text-sm text-ink/70">{s.label}</div>
          </div>
        ))}
      </div>
      <section className={card}>
        <h2 className="text-lg font-bold text-primary">بانتظار المراجعة</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-light-blue text-ink/70">
                <th className={th}>الطالب</th>
                <th className={th}>السؤال</th>
                <th className={th}>النوع</th>
              </tr>
            </thead>
            <tbody>
              {demoReviews.map((r) => {
                const q = question(r.questionId)
                return (
                  <tr key={r.id} className="border-b border-light-blue/50">
                    <td className="p-2 font-mono" dir="ltr">{r.studentNo}</td>
                    <td className="p-2">{q?.text}</td>
                    <td className="p-2">{q ? qTypeLabel[q.type] : ''}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
