import { useState } from 'react'
import AttachmentView from '../../components/AttachmentView'
import DemoBadge from '../../components/DemoBadge'
import Tag from '../../components/Tag'
import { btn, btnOutline, card, field, th } from '../../components/ui'
import { demoWeeks } from '../../demo/data'
import { saveFile } from '../../demo/files'
import { addMaterial, isBlocked, resetMaterials, toggleMaterial, useMaterials } from '../../demo/materials'

const MAX_BYTES = 50 * 1024 * 1024

export default function MaterialsTab() {
  const items = useMaterials()
  const [weekFilter, setWeekFilter] = useState('all')
  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [weekId, setWeekId] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [inputKey, setInputKey] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weekLabel = (id: string) => {
    const w = demoWeeks.find((x) => x.id === id)
    return w ? 'الأسبوع ' + w.number : 'بدون أسبوع'
  }
  const shown = weekFilter === 'all' ? items : items.filter((m) => m.weekId === weekFilter)

  function pick(f: File | null) {
    setError(null)
    if (!f) {
      setFile(null)
      return
    }
    if (isBlocked(f.name)) {
      setError('هذا النوع من الملفات (تنفيذي أو برمجي) غير مسموح.')
      setFile(null)
      setInputKey((k) => k + 1)
      return
    }
    if (f.size > MAX_BYTES) {
      setError('حجم الملف حتى 50 MB.')
      setFile(null)
      setInputKey((k) => k + 1)
      return
    }
    setFile(f)
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  async function add() {
    if (!file) {
      setError('اختر ملفًا من جهازك.')
      return
    }
    if (!title.trim()) {
      setError('اكتب عنوان المادة.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const att = await saveFile(file)
      addMaterial(title.trim(), weekId, att)
      setTitle('')
      setFile(null)
      setInputKey((k) => k + 1)
      setShowAdd(false)
    } catch {
      setError('تعذّر حفظ الملف في المتصفح.')
    }
    setBusy(false)
  }

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-primary">المواد</h2>
            <DemoBadge />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select className="rounded-xl border border-light-blue bg-white p-2 text-sm" value={weekFilter} onChange={(e) => setWeekFilter(e.target.value)}>
              <option value="all">كل الأسابيع</option>
              {demoWeeks.map((w) => (
                <option key={w.id} value={w.id}>الأسبوع {w.number}</option>
              ))}
            </select>
            <button className={btnOutline} onClick={resetMaterials}>إعادة البيانات التجريبية</button>
            <button className={btn} onClick={() => setShowAdd((v) => !v)}>+ رفع ملف</button>
          </div>
        </div>

        {showAdd && (
          <div className="mt-4 space-y-3 rounded-xl border border-light-blue p-4">
            <div>
              <label className="text-sm font-semibold" htmlFor="mf">الملف (أي نوع)</label>
              <input key={inputKey} id="mf" type="file" className={field} onChange={(e) => pick(e.target.files?.[0] ?? null)} />
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="mt">عنوان المادة</label>
              <input id="mt" className={field} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className="text-sm font-semibold" htmlFor="mw">الأسبوع</label>
              <select id="mw" className={field} value={weekId} onChange={(e) => setWeekId(e.target.value)}>
                <option value="">بدون أسبوع</option>
                {demoWeeks.map((w) => <option key={w.id} value={w.id}>الأسبوع {w.number}</option>)}
              </select>
            </div>
            <p className="text-xs text-ink/60">حتى 50 MB. تُحفظ في هذا المتصفح فقط في المرحلة التجريبية، وتمنع الملفات التنفيذية.</p>
            {error && <p className="text-sm font-semibold text-error">{error}</p>}
            <button className={btn} onClick={add} disabled={busy}>{busy ? 'جارٍ الحفظ...' : 'حفظ المادة'}</button>
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-light-blue text-ink/70">
                <th className={th}>المادة</th>
                <th className={th}>النوع</th>
                <th className={th}>الحجم</th>
                <th className={th}>الأسبوع</th>
                <th className={th}>الحالة</th>
                <th className={th}>إجراء</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((m) => (
                <tr key={m.id} className="border-b border-light-blue/50 align-top">
                  <td className="p-2">
                    {m.title}
                    {m.file ? (
                      <div className="mt-2"><AttachmentView att={m.file} /></div>
                    ) : (
                      <div className="mt-1 text-xs text-ink/50">مادة وهمية بلا ملف</div>
                    )}
                  </td>
                  <td className="p-2 font-mono" dir="ltr">{m.kind}</td>
                  <td className="p-2" dir="ltr">{m.size}</td>
                  <td className="p-2">{weekLabel(m.weekId)}</td>
                  <td className="p-2"><Tag tone={m.published ? 'ok' : 'wait'}>{m.published ? 'منشور' : 'مخفي'}</Tag></td>
                  <td className="p-2">
                    <button className={btnOutline} onClick={() => toggleMaterial(m.id)}>{m.published ? 'إخفاء' : 'نشر'}</button>
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

