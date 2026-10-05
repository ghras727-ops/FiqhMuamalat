import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

type Kind = 'document' | 'slides' | 'link'

interface Material {
  id: string
  week_id: string
  lesson_id: string | null
  title: string
  kind: Kind
  view_path: string | null
  download_path: string | null
  url: string | null
  position: number
  published: boolean
}

interface WeekOption {
  id: string
  number: number
  title: string
}

const BUCKET = 'course-files'
const MAX_BYTES = 50 * 1024 * 1024
const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
])

const card = 'rounded-2xl border border-light-blue bg-white p-4'
const btn =
  'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:opacity-60'
const btnOutline =
  'rounded-xl border border-primary bg-white px-3 py-1.5 text-sm font-semibold text-primary transition hover:bg-surface disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue p-2 text-ink'
const label = 'text-sm font-semibold'

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : 'bin'
}

function isPdf(mime: string): boolean {
  return mime === 'application/pdf'
}

function kindLabel(k: Kind): string {
  if (k === 'slides') return 'عرض تقديمي'
  if (k === 'document') return 'مستند'
  return 'رابط'
}

export default function MaterialsTab({ weekId: lockedWeekId }: { weekId?: string } = {}) {
  const [weeks, setWeeks] = useState<WeekOption[]>([])
  const [selectedWeekId, setSelectedWeekId] = useState<string>(lockedWeekId ?? '')
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [showAdd, setShowAdd] = useState(false)
  const [title, setTitle] = useState('')
  const [kind, setKind] = useState<Kind>('document')
  const [file, setFile] = useState<File | null>(null)
  const [url, setUrl] = useState('')
  const [fileInputKey, setFileInputKey] = useState(0)

  const effectiveWeekId = lockedWeekId ?? selectedWeekId

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)

    const needWeeks = !lockedWeekId
    const [wRes, mRes] = await Promise.all([
      needWeeks
        ? supabase.from('weeks').select('id,number,title').order('number')
        : Promise.resolve({ data: [] as WeekOption[], error: null }),
      effectiveWeekId
        ? supabase
            .from('materials')
            .select(
              'id,week_id,lesson_id,title,kind,view_path,download_path,url,position,published',
            )
            .eq('week_id', effectiveWeekId)
            .order('position')
        : Promise.resolve({ data: [] as Material[], error: null }),
    ])

    if (wRes.error || mRes.error) {
      setError('تعذّر تحميل المواد.')
    } else {
      setError(null)
      if (needWeeks) setWeeks((wRes.data ?? []) as WeekOption[])
      setMaterials((mRes.data ?? []) as Material[])
    }
    setLoading(false)
  }, [lockedWeekId, effectiveWeekId])

  useEffect(() => {
    void load()
  }, [load])

  function resetForm() {
    setTitle('')
    setKind('document')
    setFile(null)
    setUrl('')
    setFileInputKey((k) => k + 1)
    setShowAdd(false)
  }

  function nextPosition(): number {
    if (materials.length === 0) return 1
    return Math.max(...materials.map((m) => m.position)) + 1
  }

  function pickFile(f: File | null) {
    setError(null)
    if (!f) {
      setFile(null)
      return
    }
    if (!ALLOWED_MIME.has(f.type)) {
      setError('نوع الملف غير مسموح. المسموح: PDF, PPT, PPTX, DOC, DOCX.')
      setFile(null)
      setFileInputKey((k) => k + 1)
      return
    }
    if (f.size > MAX_BYTES) {
      setError('الحجم الأقصى 50 MB.')
      setFile(null)
      setFileInputKey((k) => k + 1)
      return
    }
    setFile(f)
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  async function addMaterial() {
    if (!supabase) return
    if (!effectiveWeekId) {
      setError('اختر أسبوعًا أولًا.')
      return
    }
    if (!title.trim()) {
      setError('العنوان مطلوب.')
      return
    }

    setBusy(true)
    setError(null)

    try {
      if (kind === 'link') {
        const trimmed = url.trim()
        if (!/^https:\/\//i.test(trimmed)) {
          setError('الرابط يجب أن يبدأ بـ https://')
          return
        }
        const { error: err } = await supabase.from('materials').insert({
          week_id: effectiveWeekId,
          lesson_id: null,
          title: title.trim(),
          kind: 'link',
          url: trimmed,
          view_path: null,
          download_path: null,
          position: nextPosition(),
          published: false,
        })
        if (err) {
          setError('تعذّر إدخال الرابط: ' + err.message)
          return
        }
        resetForm()
        await load()
        return
      }

      if (!file) {
        setError('اختر ملفًا.')
        return
      }

      const uuid = crypto.randomUUID()
      const ext = extOf(file.name)
      const path = `weeks/${effectiveWeekId}/${uuid}.${ext}`

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, file, { contentType: file.type, upsert: false })

      if (upErr) {
        setError('فشل رفع الملف: ' + upErr.message)
        return
      }

      const viewable = isPdf(file.type)
      const { error: insErr } = await supabase.from('materials').insert({
        week_id: effectiveWeekId,
        lesson_id: null,
        title: title.trim(),
        kind,
        url: null,
        view_path: viewable ? path : null,
        download_path: path,
        position: nextPosition(),
        published: false,
      })

      if (insErr) {
        await supabase.storage.from(BUCKET).remove([path])
        setError('فشل إدخال المادة: ' + insErr.message)
        return
      }

      resetForm()
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function togglePublish(m: Material) {
    if (!supabase) return
    setBusy(true)
    setError(null)
    const { error: err } = await supabase
      .from('materials')
      .update({ published: !m.published })
      .eq('id', m.id)
    setBusy(false)
    if (err) setError(err.message)
    else await load()
  }

  async function removeMaterial(m: Material) {
    if (!supabase) return
    if (!window.confirm('حذف هذه المادة؟')) return
    setBusy(true)
    setError(null)

    const { error: delErr } = await supabase.from('materials').delete().eq('id', m.id)
    if (delErr) {
      setError('تعذّر الحذف: ' + delErr.message)
      setBusy(false)
      return
    }

    const paths: string[] = []
    if (m.view_path) paths.push(m.view_path)
    if (m.download_path && m.download_path !== m.view_path) paths.push(m.download_path)
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths)

    setBusy(false)
    await load()
  }

  async function openMaterial(m: Material) {
    if (!supabase) return
    if (m.kind === 'link' && m.url) {
      window.open(m.url, '_blank', 'noreferrer')
      return
    }
    const path = m.view_path ?? m.download_path
    if (!path) {
      setError('لا يوجد مسار للملف.')
      return
    }
    const { data, error: err } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path, 3600)
    if (err || !data) {
      setError('تعذّر إنشاء رابط: ' + (err?.message ?? 'unknown'))
      return
    }
    window.open(data.signedUrl, '_blank', 'noreferrer')
  }

  return (
    <div className="space-y-4">
      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-primary">المواد</h2>
          <div className="flex flex-wrap items-center gap-2">
            {!lockedWeekId && (
              <select
                className="rounded-xl border border-light-blue bg-white p-2 text-sm"
                value={selectedWeekId}
                onChange={(e) => setSelectedWeekId(e.target.value)}
              >
                <option value="">— اختر أسبوعًا —</option>
                {weeks.map((w) => (
                  <option key={w.id} value={w.id}>
                    الأسبوع {w.number}: {w.title}
                  </option>
                ))}
              </select>
            )}
            <button
              className={btn}
              onClick={() => setShowAdd((v) => !v)}
              disabled={!effectiveWeekId}
            >
              + إضافة مادة
            </button>
          </div>
        </div>

        {showAdd && effectiveWeekId && (
          <div className="mt-4 space-y-3 rounded-xl border border-light-blue p-4">
            <div>
              <label className={label}>النوع</label>
              <select
                className={input}
                value={kind}
                onChange={(e) => setKind(e.target.value as Kind)}
              >
                <option value="document">مستند (PDF / Word)</option>
                <option value="slides">عرض تقديمي (PowerPoint)</option>
                <option value="link">رابط خارجي (https)</option>
              </select>
            </div>

            {kind !== 'link' ? (
              <div>
                <label className={label}>الملف</label>
                <input
                  key={fileInputKey}
                  type="file"
                  className={input}
                  accept=".pdf,.doc,.docx,.ppt,.pptx"
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
                <p className="mt-1 text-xs text-ink/60">PDF, DOC, DOCX, PPT, PPTX — حتى 50 MB.</p>
              </div>
            ) : (
              <div>
                <label className={label}>الرابط</label>
                <input
                  className={input}
                  dir="ltr"
                  placeholder="https://..."
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                />
              </div>
            )}

            <div>
              <label className={label}>العنوان</label>
              <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>

            <div className="flex flex-wrap gap-2">
              <button className={btn} onClick={addMaterial} disabled={busy}>
                {busy ? 'جارٍ الحفظ...' : 'حفظ'}
              </button>
              <button className={btnOutline} onClick={resetForm} disabled={busy}>
                إلغاء
              </button>
            </div>
          </div>
        )}

        {error && <p className="mt-3 text-sm font-semibold text-error">{error}</p>}
      </section>

      <section className={card}>
        {loading ? (
          <p className="text-ink/70">جارٍ التحميل...</p>
        ) : !effectiveWeekId ? (
          <p className="text-ink/70">اختر أسبوعًا لعرض مواده.</p>
        ) : materials.length === 0 ? (
          <p className="text-ink/70">لا مواد لهذا الأسبوع بعد.</p>
        ) : (
          <ul className="space-y-2">
            {materials.map((m) => (
              <li
                key={m.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-light-blue p-3"
              >
                <div className="min-w-0">
                  <div className="font-semibold text-ink">
                    {m.position}. {m.title}
                  </div>
                  <div className="mt-1 text-xs text-ink/60">
                    <span className="rounded bg-surface px-2 py-0.5">{kindLabel(m.kind)}</span>
                    {m.url && (
                      <span className="ms-2" dir="ltr">
                        {m.url}
                      </span>
                    )}
                    <span className="ms-2">{m.published ? 'منشور' : 'مخفي'}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button className={btnOutline} onClick={() => void openMaterial(m)} disabled={busy}>
                    فتح
                  </button>
                  <button className={btnOutline} onClick={() => void togglePublish(m)} disabled={busy}>
                    {m.published ? 'إخفاء' : 'نشر'}
                  </button>
                  <button className={btnOutline} onClick={() => void removeMaterial(m)} disabled={busy}>
                    حذف
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}