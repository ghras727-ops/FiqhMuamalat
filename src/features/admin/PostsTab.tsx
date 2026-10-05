import { useState } from 'react'
import AttachmentView from '../../components/AttachmentView'
import DemoBadge from '../../components/DemoBadge'
import Tag from '../../components/Tag'
import { btn, btnOutline, card, field } from '../../components/ui'
import type { PostKind } from '../../demo/data'
import { saveFile, type Attachment } from '../../demo/files'
import { isBlocked, useMaterials } from '../../demo/materials'
import { addPost, resetFeed, toggleHideComment, toggleHidePost, togglePin, useFeed } from '../../demo/store'

const KINDS: PostKind[] = ['إعلان', 'درس', 'ملف', 'نقاش']
const MAX_FILES = 5
const MAX_BYTES = 50 * 1024 * 1024

export default function PostsTab() {
  const feed = useFeed()
  const materials = useMaterials().filter((m) => m.file)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [kind, setKind] = useState<PostKind>('إعلان')
  const [files, setFiles] = useState<File[]>([])
  const [pickedIds, setPickedIds] = useState<string[]>([])
  const [inputKey, setInputKey] = useState(0)
  const [pinned, setPinned] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function pick(list: FileList | null) {
    const chosen = list ? Array.from(list) : []
    const reset = (msg: string) => {
      setError(msg)
      setFiles([])
      setInputKey((k) => k + 1)
    }
    if (chosen.length > MAX_FILES) return reset('الحد الأقصى ' + MAX_FILES + ' ملفات في المنشور.')
    if (chosen.some((f) => f.size > MAX_BYTES)) return reset('حجم الملف الواحد حتى 50 MB.')
    if (chosen.some((f) => isBlocked(f.name))) return reset('الملفات التنفيذية أو البرمجية غير مسموحة.')
    setError(null)
    setFiles(chosen)
  }

  function togglePicked(id: string) {
    setPickedIds(pickedIds.includes(id) ? pickedIds.filter((x) => x !== id) : [...pickedIds, id])
  }

  async function publish() {
    if (!title.trim()) {
      setError('اكتب عنوان المنشور.')
      return
    }
    if (files.length + pickedIds.length > MAX_FILES) {
      setError('الحد الأقصى ' + MAX_FILES + ' ملفات في المنشور.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const attachments: Attachment[] = []
      materials.forEach((m) => {
        if (pickedIds.includes(m.id) && m.file) attachments.push(m.file)
      })
      for (const f of files) attachments.push(await saveFile(f))
      addPost({
        title: title.trim(),
        body: body.trim(),
        kind,
        pinned,
        attachments: attachments.length > 0 ? attachments : undefined,
      })
      setTitle('')
      setBody('')
      setFiles([])
      setPickedIds([])
      setInputKey((k) => k + 1)
      setPinned(false)
    } catch {
      setError('تعذّر حفظ الملفات في المتصفح.')
    }
    setBusy(false)
  }

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-primary">المنشورات</h2>
            <DemoBadge />
          </div>
          <button className={btnOutline} onClick={resetFeed}>إعادة البيانات التجريبية</button>
        </div>
        <p className="mt-2 text-sm text-ink/70">
          ما تنشره هنا يظهر لجميع الطلاب في تبويب «المنصة». في هذه المرحلة يُحفظ في هذا المتصفح فقط.
        </p>

        <div className="mt-4 space-y-3 rounded-xl border border-light-blue p-4">
          <div>
            <label className="text-sm font-semibold" htmlFor="pt">العنوان</label>
            <input id="pt" className={field} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold" htmlFor="pb">النص</label>
            <textarea id="pb" rows={4} className={field} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold" htmlFor="pk">النوع</label>
            <select id="pk" className={field} value={kind} onChange={(e) => setKind(e.target.value as PostKind)}>
              {KINDS.map((k) => <option key={k}>{k}</option>)}
            </select>
          </div>

          <details className="rounded-xl border border-light-blue p-3">
            <summary className="cursor-pointer text-sm font-semibold">
              إرفاق من المواد ({pickedIds.length} محددة)
            </summary>
            {materials.length === 0 ? (
              <p className="mt-2 text-sm text-ink/60">لا توجد مواد بملفات بعد. ارفع ملفًا من تبويب «المواد» أولًا.</p>
            ) : (
              <ul className="mt-2 space-y-1">
                {materials.map((m) => (
                  <li key={m.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={pickedIds.includes(m.id)} onChange={() => togglePicked(m.id)} />
                      {m.title} <span className="text-xs text-ink/60" dir="ltr">({m.kind}، {m.size})</span>
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </details>

          <div>
            <label className="text-sm font-semibold" htmlFor="pf">أو إرفاق ملفات مباشرة من جهازك (أي نوع)</label>
            <input key={inputKey} id="pf" type="file" multiple className={field} onChange={(e) => pick(e.target.files)} />
            {files.length > 0 && (
              <ul className="mt-2 list-disc ps-5 text-sm text-ink/80">
                {files.map((f) => <li key={f.name + f.size}>{f.name}</li>)}
              </ul>
            )}
            <p className="mt-1 text-xs text-ink/60">حتى 5 ملفات في المنشور، وكل ملف حتى 50 MB. تُمنع الملفات التنفيذية.</p>
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} />
            تثبيت المنشور في الأعلى
          </label>
          {error && <p className="text-sm font-semibold text-error">{error}</p>}
          <button className={btn} onClick={publish} disabled={busy}>
            {busy ? 'جارٍ النشر...' : 'نشر للطلاب'}
          </button>
        </div>
      </section>

      {feed.posts.map((p) => {
        const list = feed.comments.filter((c) => c.postId === p.id)
        return (
          <section key={p.id} className={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Tag tone="info">{p.kind}</Tag>
                {p.pinned && <Tag tone="wait">مثبّت</Tag>}
                <Tag tone={p.hidden ? 'off' : 'ok'}>{p.hidden ? 'مخفي عن الطلاب' : 'ظاهر للطلاب'}</Tag>
                <span className="text-xs text-ink/60">{p.date} · {p.likes} إعجاب</span>
              </div>
              <div className="flex gap-2">
                <button className={btnOutline} onClick={() => togglePin(p.id)}>{p.pinned ? 'إلغاء التثبيت' : 'تثبيت'}</button>
                <button className={btnOutline} onClick={() => toggleHidePost(p.id)}>{p.hidden ? 'إظهار' : 'إخفاء'}</button>
              </div>
            </div>
            <h3 className="mt-2 text-lg font-bold text-primary">{p.title}</h3>
            <p className="mt-1 whitespace-pre-line text-sm text-ink/80">{p.body}</p>

            {p.attachments && p.attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {p.attachments.map((a) => <AttachmentView key={a.id} att={a} />)}
              </div>
            )}

            <div className="mt-3 space-y-2 border-t border-light-blue/50 pt-3">
              <div className="text-sm font-semibold text-ink/70">تعليقات الطلاب ({list.length})</div>
              {list.length === 0 && <p className="text-sm text-ink/60">لا توجد تعليقات.</p>}
              {list.map((c) => (
                <div key={c.id} className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-surface p-3 text-sm">
                  <div>
                    <div className="font-semibold">{c.author}</div>
                    <div className={'mt-1 ' + (c.hidden ? 'text-ink/40 line-through' : 'text-ink/80')}>{c.text}</div>
                  </div>
                  <button className={btnOutline} onClick={() => toggleHideComment(c.id)}>{c.hidden ? 'إظهار' : 'إخفاء'}</button>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}

