import { useState } from 'react'
import DemoBadge from '../../components/DemoBadge'
import { card, field, th } from '../../components/ui'
import { demoActivities, demoResults, demoStudents, demoTopics, demoTopicScores } from '../../demo/data'

function barColor(p: number) {
  if (p < 50) return 'bg-error'
  if (p < 70) return 'bg-warning'
  return 'bg-secondary'
}

export default function ReportsTab() {
  const students = demoStudents.filter((s) => s.active)
  const [studentNo, setStudentNo] = useState(students[0].no)
  const acts = demoActivities.filter((a) => a.status !== 'draft')

  const mine = acts
    .map((a) => ({ a, r: demoResults.find((x) => x.studentNo === studentNo && x.activityId === a.id) }))
    .filter((x) => x.r !== undefined)

  const group = acts.map((a) => {
    const rs = demoResults.filter((r) => r.activityId === a.id)
    const avg = rs.length === 0 ? 0 : rs.reduce((t, r) => t + r.score, 0) / rs.length
    return { a, count: rs.length, avg }
  })

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-primary">التقارير</h2>
          <DemoBadge />
        </div>
        <button className="cursor-not-allowed rounded-xl border border-light-blue bg-white px-4 py-2 text-sm font-semibold text-ink/50" disabled>
          تصدير PDF / Excel (قريبًا)
        </button>
      </div>

      <section className={card}>
        <h3 className="text-lg font-bold text-primary">تقرير فردي</h3>
        <div className="mt-3 max-w-sm">
          <label className="text-sm font-semibold" htmlFor="rs">الطالب</label>
          <select id="rs" className={field} value={studentNo} onChange={(e) => setStudentNo(e.target.value)}>
            {students.map((s) => <option key={s.no} value={s.no}>{s.name} ({s.no})</option>)}
          </select>
        </div>
        <div className="mt-4 overflow-x-auto">
          {mine.length === 0 ? (
            <p className="text-sm text-ink/60">لا توجد نتائج لهذا الطالب بعد.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-light-blue text-ink/70">
                  <th className={th}>النشاط</th>
                  <th className={th}>الدرجة</th>
                  <th className={th}>النسبة</th>
                </tr>
              </thead>
              <tbody>
                {mine.map(({ a, r }) => (
                  <tr key={a.id} className="border-b border-light-blue/50">
                    <td className="p-2">{a.title}</td>
                    <td className="p-2" dir="ltr">{r!.score}/{a.max}</td>
                    <td className="p-2">{Math.round((r!.score / a.max) * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className={card}>
        <h3 className="text-lg font-bold text-primary">تقرير جماعي</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-light-blue text-ink/70">
                <th className={th}>النشاط</th>
                <th className={th}>عدد المؤدّين</th>
                <th className={th}>المتوسط</th>
                <th className={th}>النسبة</th>
              </tr>
            </thead>
            <tbody>
              {group.map(({ a, count, avg }) => (
                <tr key={a.id} className="border-b border-light-blue/50">
                  <td className="p-2">{a.title}</td>
                  <td className="p-2">{count}</td>
                  <td className="p-2" dir="ltr">{avg.toFixed(1)}/{a.max}</td>
                  <td className="p-2">{Math.round((avg / a.max) * 100)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className={card}>
        <h3 className="text-lg font-bold text-primary">تحليل نقاط الضعف (حسب الموضوع)</h3>
        <div className="mt-3 space-y-4">
          {demoTopicScores.map((t) => {
            const name = demoTopics.find((x) => x.id === t.topicId)?.name
            return (
              <div key={t.topicId}>
                <div className="flex justify-between text-sm">
                  <span>{name}</span>
                  <b>{t.percent}%</b>
                </div>
                <div className="mt-1 h-3 overflow-hidden rounded-full bg-surface">
                  <div className={'h-full ' + barColor(t.percent)} style={{ width: t.percent + '%' }} />
                </div>
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
