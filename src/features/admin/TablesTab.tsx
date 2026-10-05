import DemoBadge from '../../components/DemoBadge'
import Tag from '../../components/Tag'
import { card, th } from '../../components/ui'
import { demoTables } from '../../demo/data'

export default function TablesTab() {
  const done = demoTables.filter((t) => t[3]).length
  return (
    <section className={card}>
      <div className="flex items-center gap-2">
        <h2 className="text-xl font-bold text-primary">جداول قاعدة البيانات ({demoTables.length} جدولًا)</h2>
        <DemoBadge />
      </div>
      <p className="mt-2 text-sm text-ink/70">منفّذ: {done} من {demoTables.length}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-light-blue text-ink/70">
              <th className={th}>الجدول</th>
              <th className={th}>الغرض</th>
              <th className={th}>المرحلة</th>
              <th className={th}>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {demoTables.map((t) => (
              <tr key={t[0]} className="border-b border-light-blue/50">
                <td className="p-2 font-mono" dir="ltr">{t[0]}</td>
                <td className="p-2">{t[1]}</td>
                <td className="p-2">{t[2]}</td>
                <td className="p-2"><Tag tone={t[3] ? 'ok' : 'wait'}>{t[3] ? 'منفّذ' : 'قادم'}</Tag></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
