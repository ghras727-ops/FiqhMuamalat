import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { card } from '../../components/ui'

interface Week { id: string; number: number; title: string; summary: string | null }
interface Lesson { id: string; week_id: string; title: string; body: string | null; position: number }
type Kind = 'slides' | 'document' | 'link'
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
}

interface ViewState {
  material: Material
  url: string
  downloadUrl: string
}

const BUCKET = 'course-files'

function extFromPath(path: string): string {
  const i = path.lastIndexOf('.')
  return i > 0 ? path.slice(i + 1).toLowerCase() : ''
}

function isOffice(ext: string): boolean {
  return ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'odt', 'ods', 'odp'].includes(ext)
}
function isImage(ext: string): boolean {
  return ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp'].includes(ext)
}

export default function WeekPacksView() {
  const [weeks, setWeeks] = useState<Week[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [viewUrls, setViewUrls] = useState<Record<string, string | null>>({})
  const [downloadUrls, setDownloadUrls] = useState<Record<string, string | null>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewing, setViewing] = useState<ViewState | null>(null)
  // مفتاح الأسبوع المفتوح حاليًا — null يعني كلها مغلقة
  const [openWeekId, setOpenWeekId] = useState<string | null>(null)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    ;(async () => {
      const [w, l, m] = await Promise.all([
        supabase.from('weeks').select('id,number,title,summary').order('number'),
        supabase.from('lessons').select('id,week_id,title,body,position').order('position'),
        supabase.from('materials').select('id,week_id,lesson_id,title,kind,view_path,download_path,url,position').order('position'),
      ])
      if (cancelled) return
      if (w.error || l.error || m.error) {
        setError('تعذّر تحميل المحتوى.')
        setLoading(false)
        return
      }
      setWeeks((w.data ?? []) as Week[])
      setLessons((l.data ?? []) as Lesson[])
      const mats = (m.data ?? []) as Material[]
      setMaterials(mats)

      const nextView: Record<string, string | null> = {}
      const nextDownload: Record<string, string | null> = {}

      for (const mat of mats) {
        if (mat.kind === 'link') {
          nextView[mat.id] = mat.url
          nextDownload[mat.id] = null
          continue
        }
        const path = mat.view_path ?? mat.download_path
        if (!path) {
          nextView[mat.id] = null
          nextDownload[mat.id] = null
          continue
        }

        const { data: viewData } = await supabase.storage.from(BUCKET).createSignedUrl(path, 86400)
        nextView[mat.id] = viewData?.signedUrl ?? null

        const { data: dlData } = await supabase.storage.from(BUCKET).createSignedUrl(path, 86400, { download: true })
        nextDownload[mat.id] = dlData?.signedUrl ?? null
      }

      if (cancelled) return
      setViewUrls(nextView)
      setDownloadUrls(nextDownload)
      setLoading(false)
    })()
    return () => { cancelled = true }
  }, [])

  function openViewer(m: Material) {
    const view = viewUrls[m.id]
    if (!view) return
    const dl = downloadUrls[m.id] ?? view
    setViewing({ material: m, url: view, downloadUrl: dl })
  }

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>
  if (error) return <section className={card}><p className="text-sm font-semibold text-error">{error}</p></section>
  if (weeks.length === 0) return <section className={card}><p className="text-ink-muted">لم يُنشر أي أسبوع بعد.</p></section>

  return (
    <div className="space-y-5">
      <h2 className="text-2xl font-bold text-primary">📚 دروس الأسابيع</h2>

      {weeks.map((w) => {
        const wLessons = lessons.filter((l) => l.week_id === w.id)
        const isOpen = openWeekId === w.id
        return (
          <section key={w.id} className="overflow-hidden rounded-2xl border border-light-blue bg-white shadow-sm">
            {/* رأس الأسبوع — قابل للنقر */}
            <button
              className={`flex w-full items-center justify-between gap-3 px-5 py-4 text-start transition ${
                isOpen
                  ? 'bg-gradient-to-l from-primary to-primary-hover text-white'
                  : 'bg-white hover:bg-primary-soft'
              }`}
              onClick={() => setOpenWeekId(isOpen ? null : w.id)}
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className={`text-2xl ${isOpen ? 'text-white' : 'text-primary'}`}>
                  {isOpen ? '▼' : '▶'}
                </span>
                <span className={`text-lg font-bold ${isOpen ? 'text-white' : 'text-primary'}`}>
                  الأسبوع {w.number}: {w.title}
                </span>
                <span className={`rounded-lg px-2 py-0.5 text-xs font-semibold ${
                  isOpen ? 'bg-white/20 text-white' : 'bg-primary-soft text-primary'
                }`}>
                  {wLessons.length} درس
                </span>
              </div>
              <span className={`text-sm ${isOpen ? 'text-white/80' : 'text-ink-muted'}`}>
                {isOpen ? 'إغلاق' : 'عرض'}
              </span>
            </button>

            {/* محتوى الأسبوع */}
            {isOpen && (
              <div className="border-t border-light-blue bg-bg p-4">
                {w.summary && (
                  <p className="mb-4 rounded-xl bg-white p-4 text-sm leading-7 text-ink-muted">
                    {w.summary}
                  </p>
                )}

                <div className="space-y-4">
                  {wLessons.length === 0 ? (
                    <p className="rounded-xl bg-white p-4 text-center text-sm text-ink-muted">
                      لا دروس في هذا الأسبوع بعد.
                    </p>
                  ) : (
                    wLessons.map((l) => (
                      <LessonView
                        key={l.id}
                        lesson={l}
                        materials={materials.filter((m) => m.lesson_id === l.id)}
                        viewUrls={viewUrls}
                        downloadUrls={downloadUrls}
                        onOpen={openViewer}
                      />
                    ))
                  )}
                </div>
              </div>
            )}
          </section>
        )
      })}

      {viewing && (
        <FileViewerModal
          material={viewing.material}
          url={viewing.url}
          downloadUrl={viewing.downloadUrl}
          onClose={() => setViewing(null)}
        />
      )}
    </div>
  )
}

/* ============================================================
   قسم الدرس — مطوي أيضًا
   ============================================================ */
function LessonView({ lesson, materials, viewUrls, downloadUrls, onOpen }: {
  lesson: Lesson
  materials: Material[]
  viewUrls: Record<string, string | null>
  downloadUrls: Record<string, string | null>
  onOpen: (m: Material) => void
}) {
  const [open, setOpen] = useState(false)

  const docs = materials.filter((m) => m.kind === 'document')
  const slides = materials.filter((m) => m.kind === 'slides')
  const links = materials.filter((m) => m.kind === 'link')
  const totalCount = docs.length + slides.length + links.length

  return (
    <section className="overflow-hidden rounded-xl border border-light-blue bg-white">
      <button
        className="flex w-full items-center justify-between gap-3 bg-white px-4 py-3 text-start transition hover:bg-primary-soft"
        onClick={() => setOpen(!open)}
      >
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xl text-primary">{open ? '▼' : '▶'}</span>
          <span className="text-base font-bold text-primary">📖 {lesson.title}</span>
          <span className="rounded-lg bg-bg px-2 py-0.5 text-xs text-ink-muted">
            {totalCount} مادة
          </span>
        </div>
        <span className="text-sm text-ink-muted">{open ? 'إغلاق' : 'عرض'}</span>
      </button>

      {open && (
        <div className="space-y-4 border-t border-light-blue bg-bg p-4">
          {lesson.body && (
            <div className="whitespace-pre-wrap rounded-xl bg-white p-4 text-base leading-8 text-ink">
              {lesson.body}
            </div>
          )}

          {docs.length > 0 && (
            <MaterialGroup title="📄 المادة الخام" items={docs} viewUrls={viewUrls} downloadUrls={downloadUrls} onOpen={onOpen} />
          )}
          {slides.length > 0 && (
            <MaterialGroup title="📊 العرض التقديمي" items={slides} viewUrls={viewUrls} downloadUrls={downloadUrls} onOpen={onOpen} />
          )}
          {links.length > 0 && (
            <MaterialGroup title="🔗 روابط خارجية" items={links} viewUrls={viewUrls} downloadUrls={downloadUrls} onOpen={onOpen} />
          )}
        </div>
      )}
    </section>
  )
}

/* ============================================================
   مجموعة مواد
   ============================================================ */
function MaterialGroup({ title, items, viewUrls, downloadUrls, onOpen }: {
  title: string
  items: Material[]
  viewUrls: Record<string, string | null>
  downloadUrls: Record<string, string | null>
  onOpen: (m: Material) => void
}) {
  return (
    <div className="rounded-xl border border-light-blue bg-white p-4">
      <h5 className="mb-3 text-base font-bold text-primary">{title}</h5>
      <ul className="space-y-2">
        {items.map((m) => {
          const view = viewUrls[m.id]
          const dl = downloadUrls[m.id]
          const canView = !!view
          const isLink = m.kind === 'link'
          return (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-light-blue p-3 transition hover:border-primary/40 hover:shadow-sm">
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-ink">
                  {m.kind === 'link' && '🔗 '}{m.kind === 'slides' && '📊 '}{m.kind === 'document' && '📄 '}
                  {m.title}
                </div>
                {isLink && m.url && (
                  <div className="mt-1 break-all text-xs text-ink-muted" dir="ltr">{m.url}</div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!canView}
                  onClick={() => isLink && view
                    ? window.open(view, '_blank', 'noreferrer')
                    : onOpen(m)}
                  className={
                    'inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition ' +
                    (canView
                      ? 'border-primary bg-white text-primary hover:bg-primary-soft'
                      : 'cursor-not-allowed border-ink/20 text-ink/40')
                  }
                >
                  {isLink ? '🔗 فتح الرابط ↗' : '📖 عرض'}
                </button>

                {!isLink && dl && (
                  <a
                    href={dl}
                    download
                    className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:bg-secondary-hover"
                  >
                    ⬇ تحميل
                  </a>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/* ============================================================
   نافذة العرض المدمج
   ============================================================ */
function FileViewerModal({ material, url, downloadUrl, onClose }: {
  material: Material
  url: string
  downloadUrl: string
  onClose: () => void
}) {
  const path = material.view_path ?? material.download_path ?? ''
  const ext = extFromPath(path)
  const office = isOffice(ext)
  const image = isImage(ext)
  const pdf = ext === 'pdf'

  const officeViewerUrl = office
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
    : url

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 md:p-6" onClick={onClose}>
      <div className="flex h-[95vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-light-blue bg-gradient-to-l from-primary-soft/40 to-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-2xl">
              {material.kind === 'slides' ? '📊' : material.kind === 'document' ? '📄' : '🔗'}
            </span>
            <h3 className="truncate text-base font-bold text-primary md:text-lg">{material.title}</h3>
            {office && <span className="rounded bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">Office Viewer</span>}
            {pdf && <span className="rounded bg-error-soft px-2 py-0.5 text-xs font-semibold text-error">PDF</span>}
            {image && <span className="rounded bg-secondary-soft px-2 py-0.5 text-xs font-semibold text-secondary">صورة</span>}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a
              href={downloadUrl}
              download
              className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white transition hover:bg-secondary-hover"
            >
              ⬇ تحميل
            </a>
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl border border-error bg-white px-4 py-2 text-sm font-semibold text-error transition hover:bg-error-soft"
            >
              ✕ إغلاق
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-hidden bg-bg">
          {image ? (
            <div className="flex h-full items-center justify-center overflow-auto p-4">
              <img src={url} alt={material.title} className="max-h-full max-w-full object-contain" />
            </div>
          ) : (
            <iframe
              src={officeViewerUrl}
              title={material.title}
              className="h-full w-full border-0"
              allow="fullscreen"
            />
          )}
        </div>

        <footer className="border-t border-light-blue bg-white px-4 py-2 text-xs text-ink-muted">
          {pdf && 'يُعرض الملف عبر قارئ PDF المدمج في المتصفح.'}
          {office && 'يُعرض الملف عبر Microsoft Office Viewer.'}
          {image && 'صورة معروضة بالحجم الكامل.'}
        </footer>
      </div>
    </div>
  )
}