import { useState } from 'react'
import DemoBadge from '../../components/DemoBadge'
import Tag from '../../components/Tag'
import { btn, btnOutline, card, field, th } from '../../components/ui'
import {
  demoActivities, demoQuestions, demoWeeks, releaseLabel, statusLabel,
  type ActStatus, type DemoActivity, type Release,
} from '../../demo/data'

const statusTone = { draft: 'wait', open: 'ok', closed: 'info' } as const

export default function ActivitiesTab() {
  const [items, setItems] = useState<DemoActivity[]>(demoActivities)
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<'تدريب' | 'اختبار'>('تدريب')
  const [weekId, setWeekId] = useState(demoWeeks[0].id)
  const [max, setMax] = useState('10')
  const [release, setRelease] = useState<Release>('immediate')
  const [picked, setPicked] = useState<string[]>([])

  const weekLabel = (id: string) => {
    const w = demoWeeks.find((x) => x.id === id)
    return w ? 'الأسبوع ' + w.number : ''
  }

  function togglePick(id: string) {
    setPicked(picked.includes(id) ? picked.filter((x) => x !== id) : [...picked, id])
  }

  function add() {
    const m = parseInt(max, 10)
    if (!title.trim() || !m || m < 1) return
    setItems([
      ...items,
      { id: 'a' + Date.now(), title: title.trim(), kind, weekId, max: m, status: 'draft', release, released: false, questionIds: picked },
    ])
    setTitle('')
    setPicked([])
    setShowAdd(false)
  }

  function setStatus(id: string, status: ActStatus) {
    setItems(
      items.map((a) => {
        if (a.id !== id) return a
        const released =
          a.released || (status === 'open' && a.release === 'immediate') || (status === 'closed' && a.release === 'after_close')
        return { ...a, status, released }
      }),
    )
  }

  function releaseNow(id: string) {
    setItems(items.map((a) => (a.id === id ? { ...a, released: true } : a)))
  }

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-primary">الأنشطة</h2>
            <DemoBadge />
          </div>
          <button className={btn} onClick={() => setShowAdd((v) => !v)}>+ نشاط</button>
        </div>

        {showAdd && (
          <div className="mt-4 space-y-3 rounded-xl border border-light-blue p-4">
            <div>
              <label className="text-sm font-semibold" htmlFor="at">عنوان النشاط</label>
              <input id="at" className={field} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div>
                <label className="text-sm font-semibold" htmlFor="ak">النوع</label>
                <select id="ak" className={field} value={kind} onChange={(e) => setKind(e.target.value as 'تدريب' | 'اختبار')}>
                  <option>تدريب</option>
                  <option>اختبار</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold" htmlFor="aw">الأسبوع</label>
                <select id="aw" className={field} value={weekId} onChange={(e) => setWeekId(e.target.value)}>
                  {demoWeeks.map((w) => <option key={w.id} value={w.id}>الأسبوع {w.number}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold" htmlFor="am">الدرجة العظمى</label>
                <input id="am" type="number" min={1} className={field} value={max} onChange={(e) => setMax(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-semibold" htmlFor="ar">سياسة كشف النتائج</label>
                <select id="ar" className={field} value={release} onChange={(e) => setRelease(e.target.value as Release)}>
                  {(Object.keys(releaseLabel) as Release[]).map((k) => <option key={k} value={k}>{releaseLabel[k]}</option>)}
                </select>
              </div>
            </div>
            <div>
              <div className="text-sm font-semibold">أسئلة النشاط (من بنك الأسئلة)</div>
              <ul className="mt-2 space-y-1">
                {demoQuestions.map((q) => (
                  <li key={q.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={picked.includes(q.id)} onChange={() => togglePick(q.id)} />
                      {q.text}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-xs text-ink/60">الدرجة العظمى تُلتقط وقت بدء كل محاولة في النسخة الحقيقية.</p>
            <button className={btn} onClick={add}>حفظ النشاط (تجريبي)</button>
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-light-blue text-ink/70">
                <th className={th}>النشاط</th>
                <th className={th}>النوع</th>
                <th className={th}>الأسبوع</th>
                <th className={th}>الدرجة العظمى</th>
                <th className={th}>الأسئلة</th>
                <th className={th}>الحالة</th>
                <th className={th}>كشف النتائج</th>
                <th className={th}>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-b border-light-blue/50">
                  <td className="p-2">{a.title}</td>
                  <td className="p-2">{a.kind}</td>
                  <td className="p-2">{weekLabel(a.weekId)}</td>
                  <td className="p-2">{a.max}</td>
                  <td className="p-2">{a.questionIds.length}</td>
                  <td className="p-2"><Tag tone={statusTone[a.status]}>{statusLabel[a.status]}</Tag></td>
                  <td className="p-2">
                    <div>{releaseLabel[a.release]}</div>
                    <Tag tone={a.released ? 'ok' : 'wait'}>{a.released ? 'مكشوفة' : 'غير مكشوفة'}</Tag>
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-1">
                      {a.status === 'draft' && <button className={btnOutline} onClick={() => setStatus(a.id, 'open')}>فتح</button>}
                      {a.status === 'open' && <button className={btnOutline} onClick={() => setStatus(a.id, 'closed')}>إغلاق</button>}
                      {a.status !== 'draft' && !a.released && (
                        <button className={btnOutline} onClick={() => releaseNow(a.id)}>كشف النتائج</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
