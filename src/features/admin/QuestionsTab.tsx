import { useState } from 'react'
import DemoBadge from '../../components/DemoBadge'
import Tag from '../../components/Tag'
import { btn, btnOutline, card, field, th } from '../../components/ui'
import {
  demoQuestions, demoTopics, gradingLabel, qTypeLabel,
  type DemoQuestion, type Grading, type QType,
} from '../../demo/data'

export default function QuestionsTab() {
  const [items, setItems] = useState<DemoQuestion[]>(demoQuestions)
  const [topicFilter, setTopicFilter] = useState('all')
  const [openId, setOpenId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [text, setText] = useState('')
  const [type, setType] = useState<QType>('mcq')
  const [topicId, setTopicId] = useState(demoTopics[0].id)
  const [grading, setGrading] = useState<Grading>('auto')
  const [optionsText, setOptionsText] = useState('')
  const [answer, setAnswer] = useState('')

  const topicName = (id: string) => demoTopics.find((t) => t.id === id)?.name ?? ''
  const shown = topicFilter === 'all' ? items : items.filter((q) => q.topicId === topicFilter)

  function add() {
    if (!text.trim()) return
    const options = type === 'mcq' ? optionsText.split('\n').map((s) => s.trim()).filter(Boolean) : undefined
    setItems([...items, { id: 'q' + Date.now(), text: text.trim(), type, topicId, grading, options, answer: answer.trim() || undefined }])
    setText('')
    setOptionsText('')
    setAnswer('')
    setShowAdd(false)
  }

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-primary">بنك الأسئلة</h2>
            <DemoBadge />
          </div>
          <div className="flex items-center gap-2">
            <select className="rounded-xl border border-light-blue bg-white p-2 text-sm" value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)}>
              <option value="all">كل المواضيع</option>
              {demoTopics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
            <button className={btn} onClick={() => setShowAdd((v) => !v)}>+ سؤال</button>
          </div>
        </div>

        {showAdd && (
          <div className="mt-4 space-y-3 rounded-xl border border-light-blue p-4">
            <div>
              <label className="text-sm font-semibold" htmlFor="qt">نص السؤال</label>
              <textarea id="qt" rows={3} className={field} value={text} onChange={(e) => setText(e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div>
                <label className="text-sm font-semibold" htmlFor="qy">نوع السؤال</label>
                <select id="qy" className={field} value={type} onChange={(e) => setType(e.target.value as QType)}>
                  {(Object.keys(qTypeLabel) as QType[]).map((k) => <option key={k} value={k}>{qTypeLabel[k]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold" htmlFor="qp">الموضوع</label>
                <select id="qp" className={field} value={topicId} onChange={(e) => setTopicId(e.target.value)}>
                  {demoTopics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold" htmlFor="qg">التصحيح</label>
                <select id="qg" className={field} value={grading} onChange={(e) => setGrading(e.target.value as Grading)}>
                  {(Object.keys(gradingLabel) as Grading[]).map((k) => <option key={k} value={k}>{gradingLabel[k]}</option>)}
                </select>
              </div>
            </div>
            {type === 'mcq' && (
              <div>
                <label className="text-sm font-semibold" htmlFor="qo">الخيارات (خيار في كل سطر)</label>
                <textarea id="qo" rows={3} className={field} value={optionsText} onChange={(e) => setOptionsText(e.target.value)} />
              </div>
            )}
            {type !== 'essay' && (
              <div>
                <label className="text-sm font-semibold" htmlFor="qa">الإجابة الصحيحة</label>
                <input id="qa" className={field} value={answer} onChange={(e) => setAnswer(e.target.value)} />
                <p className="mt-1 text-xs text-ink/60">في النسخة الحقيقية تُحفظ في جدول مفاتيح منفصل لا يقرؤه الطالب.</p>
              </div>
            )}
            <button className={btn} onClick={add}>حفظ السؤال (تجريبي)</button>
          </div>
        )}

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-light-blue text-ink/70">
                <th className={th}>السؤال</th>
                <th className={th}>النوع</th>
                <th className={th}>الموضوع</th>
                <th className={th}>التصحيح</th>
                <th className={th}>تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((q) => (
                <tr key={q.id} className="border-b border-light-blue/50 align-top">
                  <td className="p-2">
                    {q.text}
                    {openId === q.id && (
                      <div className="mt-2 rounded-xl bg-surface p-3 text-xs text-ink/80">
                        {q.options && q.options.length > 0 && (
                          <ul className="list-disc ps-5">
                            {q.options.map((o) => <li key={o}>{o}</li>)}
                          </ul>
                        )}
                        <p className="mt-1">الإجابة الصحيحة: {q.answer ?? 'تُراجع يدويًا'}</p>
                      </div>
                    )}
                  </td>
                  <td className="p-2">{qTypeLabel[q.type]}</td>
                  <td className="p-2">{topicName(q.topicId)}</td>
                  <td className="p-2"><Tag tone={q.grading === 'auto' ? 'ok' : 'wait'}>{gradingLabel[q.grading]}</Tag></td>
                  <td className="p-2">
                    <button className={btnOutline} onClick={() => setOpenId(openId === q.id ? null : q.id)}>
                      {openId === q.id ? 'إخفاء' : 'عرض'}
                    </button>
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
