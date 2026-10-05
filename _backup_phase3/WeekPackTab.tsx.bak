import { useState } from 'react'
import AttachmentView from '../../components/AttachmentView'
import DemoBadge from '../../components/DemoBadge'
import Tag from '../../components/Tag'
import { btn, btnOutline, card, field } from '../../components/ui'
import { saveFile, type Attachment } from '../../demo/files'
import { isBlocked } from '../../demo/materials'
import { getQuiz, kindLabel, kindOrder, summarize, useQuizSets } from '../../demo/quizsets'
import { getPack, updatePack, useWeekPacks, type PackLink } from '../../demo/weekpack'

const MAX_BYTES = 50 * 1024 * 1024
const WEEKS = Array.from({ length: 16 }, (_, i) => i + 1)
const LINK_KINDS: PackLink['kind'][] = ['كتاب', 'فيديو', 'مقال', 'أخرى']

function checkFile(f: File): string | null {
  if (isBlocked(f.name)) return 'الملفات التنفيذية أو البرمجية غير مسموحة.'
  if (f.size > MAX_BYTES) {
    return 'حجم الملف ' + (f.size / (1024 * 1024)).toFixed(1) + ' MB ويتجاوز الحد (50 MB).'
  }
  return null
}

function Err({ msg }: { msg: string | null }) {
  if (!msg) return null
  return <p className="mt-2 rounded-xl border border-error bg-white p-2 text-sm font-semibold text-error">{msg}</p>
}

interface SingleProps {
  label: string
  att: Attachment | null
  onSet: (a: Attachment) => void
  onRemove: () => void
}

function SingleFile({ label, att, onSet, onRemove }: SingleProps) {
  const [busy, setBusy] = useState(false)
  const [key, setKey] = useState(0)
  const [error, setError] = useState<string | null>(null)

  async function pick(f: File | null) {
    if (!f) return
    const bad = checkFile(f)
    if (bad) {
      setError(bad)
      setKey((k) => k + 1)
      return
    }
    setError(null)
    setBusy(true)
    try {
      onSet(await saveFile(f))
    } catch {
      setError('تعذّر حفظ الملف في المتصفح.')
    }
    setBusy(false)
    setKey((k) => k + 1)
  }

  return (
    <div className="space-y-2">
      {att && (
        <div className="space-y-2">
          <AttachmentView att={att} />
          <button className={btnOutline} onClick={onRemove}>إزالة</button>
        </div>
      )}
      <label className="text-sm font-semibold">{att ? 'استبدال ' + label : 'رفع ' + label}</label>
      <input key={key} type="file" className={field} disabled={busy} onChange={(e) => void pick(e.target.files?.[0] ?? null)} />
      {busy && <p className="text-sm text-ink/70">جارٍ الرفع...</p>}
      <Err msg={error} />
    </div>
  )
}

function WeekEditor({ week }: { week: number }) {
  const packs = useWeekPacks()
  const quizzes = useQuizSets()
  const pack = getPack(packs, week)
  const quiz = getQuiz(quizzes, week)
  const sum = summarize(quiz.questions)
  const [title, setTitle] = useState(pack.title)
  const [extraError, setExtraError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [fileKey, setFileKey] = useState(0)
  const [lTitle, setLTitle] = useState('')
  const [lUrl, setLUrl] = useState('')
  const [lKind, setLKind] = useState<PackLink['kind']>('كتاب')

  async function addFiles(list: FileList | null) {
    const chosen = list ? Array.from(list) : []
    if (chosen.length === 0) return
    for (const f of chosen) {
      const bad = checkFile(f)
      if (bad) {
        setExtraError(bad)
        setFileKey((k) => k + 1)
        return
      }
    }
    setExtraError(null)
    setBusy(true)
    try {
      const saved: Attachment[] = []
      for (const f of chosen) saved.push(await saveFile(f))
      updatePack(week, { files: [...pack.files, ...saved] })
    } catch {
      setExtraError('تعذّر حفظ الملفات في المتصفح.')
    }
    setBusy(false)
    setFileKey((k) => k + 1)
  }

  function addLink() {
    const url = lUrl.trim()
    if (!lTitle.trim()) {
      setExtraError('اكتب عنوان الرابط.')
      return
    }
    if (!/^https?:\/\//i.test(url)) {
      setExtraError('الرابط يجب أن يبدأ بـ http:// أو https://')
      return
    }
    setExtraError(null)
    updatePack(week, { links: [...pack.links, { id: 'l' + Date.now(), title: lTitle.trim(), url, kind: lKind }] })
    setLTitle('')
    setLUrl('')
  }

  return (
    <div className="space-y-4">
      <section className={card}>
        <h3 className="text-lg font-bold text-primary">عنوان الأسبوع</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className={field + ' mt-0 max-w-md flex-1'} value={title} onChange={(e) => setTitle(e.target.value)} />
          <button className={btn} onClick={() => updatePack(week, { title: title.trim() || 'الأسبوع ' + week })}>حفظ العنوان</button>
        </div>
        <p className="mt-2 text-xs text-ink/60">اكتب عنوان الأسبوع كما في خطة الإدارة، أو اتركه «الأسبوع {week}».</p>
      </section>

      <section className={card}>
        <h3 className="text-lg font-bold text-primary">الكتاب (فصل هذا الدرس)</h3>
        <div className="mt-3">
          <SingleFile label="ملف الكتاب" att={pack.book} onSet={(a) => updatePack(week, { book: a })} onRemove={() => updatePack(week, { book: null })} />
        </div>
      </section>

      <section className={card}>
        <h3 className="text-lg font-bold text-primary">العرض التقديمي (PowerPoint)</h3>
        <div className="mt-3">
          <SingleFile label="ملف العرض" att={pack.slides} onSet={(a) => updatePack(week, { slides: a })} onRemove={() => updatePack(week, { slides: null })} />
        </div>
      </section>

      <section className={card}>
        <h3 className="text-lg font-bold text-primary">أسئلة الدرس</h3>
        {quiz.questions.length === 0 ? (
          <p className="mt-2 text-sm text-ink/70">لا توجد أسئلة لهذا الأسبوع بعد. أضفها من تبويب «بنك الأسئلة».</p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {kindOrder.map((k) => (
              sum.counts[k] > 0 ? <Tag key={k} tone="info">{kindLabel[k]}: {sum.counts[k]}</Tag> : null
            ))}
            <Tag tone="ok">المجموع: {sum.total} درجة</Tag>
            <Tag tone={quiz.open ? 'ok' : 'wait'}>{quiz.open ? 'متاح للطلاب' : 'غير متاح'}</Tag>
          </div>
        )}
      </section>

      <section className={card}>
        <h3 className="text-lg font-bold text-primary">مواد وروابط إضافية</h3>

        {pack.files.length > 0 && (
          <div className="mt-3 space-y-2">
            {pack.files.map((a) => (
              <div key={a.id} className="space-y-1">
                <AttachmentView att={a} />
                <button className={btnOutline} onClick={() => updatePack(week, { files: pack.files.filter((x) => x.id !== a.id) })}>إزالة</button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3">
          <label className="text-sm font-semibold" htmlFor="wf">إضافة ملفات (أي نوع)</label>
          <input key={fileKey} id="wf" type="file" multiple className={field} disabled={busy} onChange={(e) => void addFiles(e.target.files)} />
          {busy && <p className="mt-1 text-sm text-ink/70">جارٍ الرفع...</p>}
        </div>

        {pack.links.length > 0 && (
          <ul className="mt-4 space-y-2">
            {pack.links.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface p-3 text-sm">
                <span>
                  <Tag tone="info">{l.kind}</Tag> {l.title}
                  <span className="ms-2 text-xs text-ink/60" dir="ltr">{l.url}</span>
                </span>
                <button className={btnOutline} onClick={() => updatePack(week, { links: pack.links.filter((x) => x.id !== l.id) })}>إزالة</button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-4 space-y-3 rounded-xl border border-light-blue p-4">
          <div className="text-sm font-semibold">إضافة رابط</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <input className={field + ' mt-0'} placeholder="العنوان" value={lTitle} onChange={(e) => setLTitle(e.target.value)} />
            <input className={field + ' mt-0'} placeholder="https://..." dir="ltr" value={lUrl} onChange={(e) => setLUrl(e.target.value)} />
            <select className={field + ' mt-0'} value={lKind} onChange={(e) => setLKind(e.target.value as PackLink['kind'])}>
              {LINK_KINDS.map((k) => <option key={k}>{k}</option>)}
            </select>
          </div>
          <button className={btn} onClick={addLink}>إضافة الرابط</button>
        </div>
        <Err msg={extraError} />
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-primary">النشر</h3>
            <Tag tone={pack.published ? 'ok' : 'wait'}>{pack.published ? 'منشور للطلاب' : 'مسودة'}</Tag>
          </div>
          <button className={btn} onClick={() => updatePack(week, { published: !pack.published })}>
            {pack.published ? 'إلغاء النشر' : 'نشر الأسبوع'}
          </button>
        </div>
        <p className="mt-2 text-sm text-ink/70">عند النشر يظهر الأسبوع بكل محتوياته للطلاب في تبويب «دروس الأسابيع».</p>
      </section>
    </div>
  )
}

export default function WeekPackTab() {
  const packs = useWeekPacks()
  const [week, setWeek] = useState(1)

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold text-primary">محتوى الأسبوع</h2>
          <DemoBadge />
        </div>
        <p className="mt-2 text-sm text-ink/70">اختر الأسبوع (الدرس) ثم غذِّه بالكتاب والعرض والمواد، ثم انشره.</p>
        <div className="mt-3 max-w-xl">
          <label className="text-sm font-semibold" htmlFor="wk">الأسبوع</label>
          <select id="wk" className={field} value={week} onChange={(e) => setWeek(parseInt(e.target.value, 10))}>
            {WEEKS.map((n) => {
              const p = packs[n]
              const t = p && p.title !== 'الأسبوع ' + n ? ' — ' + p.title : ''
              return (
                <option key={n} value={n}>
                  {'الأسبوع ' + n + t + (p && p.published ? '  ✓ منشور' : '')}
                </option>
              )
            })}
          </select>
        </div>
      </section>
      <WeekEditor key={week} week={week} />
    </div>
  )
}
