import DemoBadge from '../../components/DemoBadge'
import { card, th } from '../../components/ui'
import { demoActivities, demoResults, demoStudents } from '../../demo/data'

export default function GradesTab() {
  const acts = demoActivities.filter((a) => a.status !== 'draft')
  const students = demoStudents.filter((s) => s.active)
  const scoreOf = (no: string, actId: string) =>
    demoResults.find((r) => r.studentNo === no && r.activityId === actId)?.score

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-primary">الدرجات التراكمية</h2>
          <DemoBadge />
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-light-blue text-ink/70">
                <th className={th}>الطالب</th>
                {acts.map((a) => (
                  <th key={a.id} className={th}>{a.title} ({a.max})</th>
                ))}
                <th className={th}>المجموع</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                let sum = 0
                let maxSum = 0
                const cells = acts.map((a) => {
                  const v = scoreOf(s.no, a.id)
                  if (v !== undefined) {
                    sum += v
                    maxSum += a.max
                  }
                  return (
                    <td key={a.id} className="p-2" dir="ltr">
                      {v === undefined ? '—' : v + '/' + a.max}
                    </td>
                  )
                })
                return (
                  <tr key={s.no} className="border-b border-light-blue/50">
                    <td className="p-2">
                      {s.name} <span className="font-mono text-xs text-ink/60" dir="ltr">{s.no}</span>
                    </td>
                    {cells}
                    <td className="p-2 font-bold text-primary" dir="ltr">
                      {maxSum === 0 ? '—' : sum + '/' + maxSum}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-ink/60">
          التراكمي يُحسب عند الطلب من نتائج الأنشطة ولا يُخزَّن. «—» تعني أن الطالب لم يؤدِّ النشاط.
        </p>
      </section>
    </div>
  )
}
