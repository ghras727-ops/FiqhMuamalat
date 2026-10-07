import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-3 py-1.5 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const btnDanger = 'rounded-xl border border-error bg-white px-3 py-1.5 text-sm font-semibold text-error hover:bg-error-soft disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink'
const label = 'text-sm font-semibold text-primary'

type Kind = 'document' | 'slides' | 'link'

interface Week { id: string; number: number; title: string; summary: string | null; published: boolean }
interface Lesson { id: string; week_id: string; title: string; body: string | null; position: number; published: boolean }
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

interface ViewState {
  material: Material
  url: string
  downloadUrl: string
}

const BUCKET = 'course-files'

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : 'bin'
}

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

async function deleteStoragePaths(pathsJson: unknown): Promise<void> {
  if (!supabase) return
  const arr = Array.isArray(pathsJson) ? pathsJson as string[] : []
  if (arr.length === 0) return
  await supabase.storage.from(BUCKET).remove(arr)
}

export default function WeeksTab() {
  const [weeks, setWeeks] = useState<Week[]>([])
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [enteredId, setEnteredId] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const [w, l, m] = await Promise.all([
      supabase.from('weeks').select('id,number,title,summary,published').order('number'),
      supabase.from('lessons').select('id,week_id,title,body,position,published').order('position'),
      supabase.from('materials').select('id,week_id,lesson_id,title,kind,view_path,download_path,url,position,published').order('position'),
    ])
    if (w.error || l.error || m.error) {
      setError('تعذّر تحميل البيانات.')
    } else {
      setWeeks((w.data ?? []) as Week[])
      setLessons((l.data ?? []) as Lesson[])
      setMaterials((m.data ?? []) as Material[])
      setError(null)
    }
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const nextNumber = weeks.length === 0 ? 1 : Math.max(...weeks.map((w) => w.number)) + 1
  const enteredWeek = enteredId ? weeks.find((w) => w.id === enteredId) ?? null : null

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>

  if (enteredWeek) {
    return (
      <div className="space-y-4">
        <button className={btnOutline} onClick={() => setEnteredId(null)}>
          ← عودة لقائمة الأسابيع
        </button>
        <WeekEditor
          week={enteredWeek}
          lessons={lessons.filter((l) => l.week_id === enteredWeek.id)}
          materials={materials.filter((m) => m.week_id === enteredWeek.id)}
          onChanged={load}
          onDeleted={async () => { setEnteredId(null); await load() }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold">الأسابيع والدروس</h2>
            <p className="mt-1 text-base text-white/85">
              قائمة أسابيع المقرر. اضغط «دخول للتحرير» لإدارة دروس الأسبوع ومواده.
            </p>
          </div>
          <button
            className="rounded-xl bg-white px-5 py-2.5 text-base font-semibold text-primary shadow-sm hover:bg-primary-soft"
            onClick={() => setShowAdd(!showAdd)}
          >
            {showAdd ? 'إلغاء' : '+ إضافة أسبوع جديد'}
          </button>
        </div>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-sm font-semibold text-error">{error}</p>}

      {showAdd && (
        <AddWeekForm
          nextNumber={nextNumber}
          onCreated={async () => { setShowAdd(false); await load() }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {weeks.length === 0 && !showAdd && (
        <section className={card}>
          <p className="text-ink-muted">لا توجد أسابيع بعد. اضغط «+ إضافة أسبوع جديد» للبدء.</p>
        </section>
      )}

      {weeks.length > 0 && (
        <section className={card}>
          <h3 className="text-lg font-bold text-primary">الأسابيع ({weeks.length})</h3>
          <ul className="mt-4 space-y-3">
            {weeks.map((w) => {
              const wLessons = lessons.filter((l) => l.week_id === w.id)
              return (
                <WeekRow
                  key={w.id}
                  week={w}
                  lessonCount={wLessons.length}
                  onEnter={() => setEnteredId(w.id)}
                  onChanged={load}
                />
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}

function WeekRow({ week, lessonCount, onEnter, onChanged }: {
  week: Week
  lessonCount: number
  onEnter: () => void
  onChanged: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function deleteWeek() {
    if (!supabase) return
    const msg = `حذف «الأسبوع ${week.number}: ${week.title}»؟\n\nسيُحذف كل ما فيه: ${lessonCount} درس + كل مواده + كل الأنشطة والاختبارات المرتبطة + كل محاولات الطلاب وإجاباتهم. لا يمكن التراجع.`
    if (!window.confirm(msg)) return
    setBusy(true); setErr(null)

    const { data, error } = await supabase.rpc('delete_week_cascade', { p_week_id: week.id })
    if (error) { setErr('فشل الحذف: ' + error.message); setBusy(false); return }
    const paths = (data as { storage_paths?: unknown } | null)?.storage_paths
    await deleteStoragePaths(paths)

    setBusy(false)
    onChanged()
  }

  return (
    <li className="rounded-xl border border-light-blue bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-lg font-bold text-primary">
              الأسبوع {week.number}: {week.title}
            </h4>
            <span className={'rounded-lg px-2 py-0.5 text-xs font-semibold ' + (week.published ? 'bg-secondary-soft text-secondary' : 'bg-bg text-ink-muted')}>
              {week.published ? 'منشور' : 'مخفي'}
            </span>
          </div>
          <p className="mt-1 text-xs text-ink-muted">{lessonCount} درس</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className={btnOutline} onClick={onEnter} disabled={busy}>دخول للتحرير</button>
          <button className={btnDanger} onClick={deleteWeek} disabled={busy}>
            {busy ? 'جارٍ الحذف...' : 'حذف الأسبوع'}
          </button>
        </div>
      </div>
      {err && <p className="mt-2 text-xs font-semibold text-error">{err}</p>}
    </li>
  )
}

function AddWeekForm({ nextNumber, onCreated, onCancel }: {
  nextNumber: number; onCreated: () => void; onCancel: () => void
}) {
  const [num, setNum] = useState(String(nextNumber))
  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    if (!supabase) return
    const n = parseInt(num, 10)
    if (!n || n < 1) { setErr('رقم الأسبوع يجب أن يكون 1 أو أكبر.'); return }
    if (!title.trim()) { setErr('عنوان الأسبوع مطلوب.'); return }
    setBusy(true); setErr(null)
    const { error } = await supabase.from('weeks').insert({
      number: n, title: title.trim(), summary: summary.trim() || null, published: false,
    })
    setBusy(false)
    if (error) { setErr(error.message); return }
    onCreated()
  }

  return (
    <section className={card}>
      <h3 className="text-xl font-bold text-primary">أسبوع جديد</h3>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <label className={label}>رقم الأسبوع</label>
          <input type="number" min={1} className={input} value={num} onChange={(e) => setNum(e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <label className={label}>عنوان الأسبوع</label>
          <input className={input} placeholder="مثال: تمهيد العقود" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
      </div>
      <div className="mt-4">
        <label className={label}>ملخص (اختياري)</label>
        <textarea className={input} rows={2} value={summary} onChange={(e) => setSummary(e.target.value)} />
      </div>
      {err && <p className="mt-3 text-sm font-semibold text-error">{err}</p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className={btn} onClick={submit} disabled={busy}>{busy ? 'جارٍ الإنشاء...' : 'إنشاء الأسبوع'}</button>
        <button className={btnOutline} onClick={onCancel} disabled={busy}>إلغاء</button>
      </div>
    </section>
  )
}

function WeekEditor({ week, lessons, materials, onChanged, onDeleted }: {
  week: Week
  lessons: Lesson[]
  materials: Material[]
  onChanged: () => void
  onDeleted: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [title, setTitle] = useState(week.title)
  const [summary, setSummary] = useState(week.summary ?? '')
  const [viewing, setViewing] = useState<ViewState | null>(null)

  useEffect(() => setTitle(week.title), [week.title])
  useEffect(() => setSummary(week.summary ?? ''), [week.summary])

  async function saveWeek() {
    if (!supabase) return
    if (!title.trim()) { setErr('العنوان مطلوب.'); return }
    setBusy(true); setErr(null); setSuccess(null)
    const { error } = await supabase.from('weeks')
      .update({ title: title.trim(), summary: summary.trim() || null })
      .eq('id', week.id)
    setBusy(false)
    if (error) setErr(error.message)
    else { setSuccess('تم حفظ معلومات الأسبوع.'); onChanged() }
  }

  async function togglePublish() {
    if (!supabase) return
    setBusy(true); setErr(null); setSuccess(null)
    const { error } = await supabase.from('weeks')
      .update({ published: !week.published })
      .eq('id', week.id)
    setBusy(false)
    if (error) setErr(error.message)
    else { setSuccess(week.published ? 'تم إخفاء الأسبوع.' : 'تم نشر الأسبوع.'); onChanged() }
  }

  async function addLesson() {
    if (!supabase) return
    setBusy(true); setErr(null); setSuccess(null)
    const nextPos = lessons.length === 0 ? 1 : Math.max(...lessons.map((l) => l.position)) + 1
    const { error } = await supabase.from('lessons').insert({
      week_id: week.id, title: `الدرس ${nextPos}`, body: null, position: nextPos, published: false,
    })
    setBusy(false)
    if (error) setErr(error.message)
    else { setSuccess('تمت إضافة درس جديد.'); onChanged() }
  }

  async function deleteThisWeek() {
    if (!supabase) return
    const msg = `حذف «الأسبوع ${week.number}: ${week.title}»؟\n\nسيُحذف كل ما فيه. لا يمكن التراجع.`
    if (!window.confirm(msg)) return
    setBusy(true); setErr(null); setSuccess(null)

    const { data, error } = await supabase.rpc('delete_week_cascade', { p_week_id: week.id })
    if (error) { setErr('فشل الحذف: ' + error.message); setBusy(false); return }
    const paths = (data as { storage_paths?: unknown } | null)?.storage_paths
    await deleteStoragePaths(paths)

    setBusy(false)
    onDeleted()
  }

  async function openViewer(m: Material) {
    if (!supabase) return
    if (m.kind === 'link' && m.url) {
      window.open(m.url, '_blank', 'noreferrer')
      return
    }
    const path = m.view_path ?? m.download_path
    if (!path) { setErr('لا يوجد مسار للملف.'); return }
    setBusy(true); setErr(null)
    const { data: viewData } = await supabase.storage.from(BUCKET).createSignedUrl(path, 86400)
    const { data: dlData } = await supabase.storage.from(BUCKET).createSignedUrl(path, 86400, { download: true })
    setBusy(false)
    if (!viewData?.signedUrl) { setErr('تعذّر إنشاء رابط.'); return }
    setViewing({
      material: m,
      url: viewData.signedUrl,
      downloadUrl: dlData?.signedUrl ?? viewData.signedUrl,
    })
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-3xl font-bold">الأسبوع {week.number}: {week.title}</h2>
            <p className="mt-1 text-base text-white/85">
              {lessons.length} درس — {materials.length} مادة
            </p>
          </div>
          <button
            className="rounded-xl bg-error px-5 py-2.5 text-base font-semibold text-white shadow-sm hover:bg-error/90"
            onClick={deleteThisWeek}
            disabled={busy}
          >
            {busy ? 'جارٍ الحذف...' : 'حذف هذا الأسبوع'}
          </button>
        </div>
      </section>

      {err && <p className="rounded-xl bg-error-soft p-3 text-sm font-semibold text-error">{err}</p>}
      {success && <p className="rounded-xl bg-secondary-soft p-3 text-sm font-semibold text-secondary ring-1 ring-secondary/20">{success}</p>}

      <section className={card}>
        <h3 className="text-lg font-bold text-primary">📝 معلومات الأسبوع</h3>
        <div className="mt-4 space-y-3">
          <div>
            <label className={label}>عنوان الأسبوع</label>
            <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div>
            <label className={label}>ملخص الأسبوع</label>
            <textarea className={input} rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-2">
            <button className={btn} onClick={saveWeek} disabled={busy}>حفظ</button>
            <button className={btnOutline} onClick={togglePublish} disabled={busy}>
              {week.published ? 'إخفاء الأسبوع' : 'نشر الأسبوع'}
            </button>
          </div>
        </div>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-primary">📚 الدروس ({lessons.length})</h3>
          <button className={btn} onClick={addLesson} disabled={busy}>
            + إضافة درس جديد
          </button>
        </div>

        {lessons.length === 0 ? (
          <p className="mt-4 rounded-xl bg-bg p-6 text-center text-ink-muted">
            لا دروس في هذا الأسبوع بعد. اضغط «+ إضافة درس جديد».
          </p>
        ) : (
          <div className="mt-4 space-y-4">
            {lessons.map((l) => (
              <LessonBlock
                key={l.id}
                lesson={l}
                materials={materials.filter((m) => m.lesson_id === l.id)}
                onChanged={onChanged}
                onOpenViewer={openViewer}
              />
            ))}
          </div>
        )}
      </section>

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

function LessonBlock({ lesson, materials, onChanged, onOpenViewer }: {
  lesson: Lesson
  materials: Material[]
  onChanged: () => void
  onOpenViewer: (m: Material) => void
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState(lesson.title)
  const [body, setBody] = useState(lesson.body ?? '')

  useEffect(() => setTitle(lesson.title), [lesson.title])
  useEffect(() => setBody(lesson.body ?? ''), [lesson.body])

  const docs = materials.filter((m) => m.kind === 'document')
  const slides = materials.filter((m) => m.kind === 'slides')
  const links = materials.filter((m) => m.kind === 'link')

  async function saveLesson() {
    if (!supabase) return
    if (!title.trim()) { setErr('عنوان الدرس مطلوب.'); return }
    setBusy(true); setErr(null)
    const { error } = await supabase.from('lessons')
      .update({ title: title.trim(), body: body.trim() || null })
      .eq('id', lesson.id)
    setBusy(false)
    if (error) setErr(error.message); else onChanged()
  }

  async function togglePublish() {
    if (!supabase) return
    setBusy(true); setErr(null)
    const { error } = await supabase.from('lessons')
      .update({ published: !lesson.published })
      .eq('id', lesson.id)
    setBusy(false)
    if (error) setErr(error.message); else onChanged()
  }

  async function deleteLesson() {
    if (!supabase) return
    const msg = `حذف «${lesson.title}»؟\n\nسيُحذف معه ${materials.length} مادة (ملفات وروابط) من القاعدة وStorage. لا يمكن التراجع.`
    if (!window.confirm(msg)) return
    setBusy(true); setErr(null)

    const { data, error } = await supabase.rpc('delete_lesson_cascade', { p_lesson_id: lesson.id })
    if (error) { setErr('فشل الحذف: ' + error.message); setBusy(false); return }
    const paths = (data as { storage_paths?: unknown } | null)?.storage_paths
    await deleteStoragePaths(paths)

    setBusy(false)
    onChanged()
  }

  return (
    <section className="overflow-hidden rounded-2xl border border-light-blue border-s-4 border-s-primary bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white px-4 py-3">
        <button
          className="flex flex-1 items-center gap-3 text-start"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="text-2xl text-primary">{expanded ? '▼' : '▶'}</span>
          <span className="text-lg font-bold text-primary">📖 الدرس {lesson.position}: {lesson.title}</span>
          <span className={'rounded-lg px-2 py-0.5 text-xs font-semibold ' + (lesson.published ? 'bg-secondary-soft text-secondary' : 'bg-bg text-ink-muted')}>
            {lesson.published ? 'منشور' : 'مخفي'}
          </span>
        </button>
        <button className={btnDanger} onClick={deleteLesson} disabled={busy}>
          {busy ? '...' : 'حذف الدرس'}
        </button>
      </div>

      {expanded && (
        <div className="space-y-5 border-t border-light-blue bg-bg p-4">
          {err && <p className="text-sm font-semibold text-error">{err}</p>}

          <div className="space-y-3 rounded-xl border border-light-blue bg-white p-4">
            <div>
              <label className={label}>عنوان الدرس</label>
              <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div>
              <label className={label}>نص الدرس</label>
              <textarea className={input} rows={6} value={body} onChange={(e) => setBody(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-2">
              <button className={btn} onClick={saveLesson} disabled={busy}>حفظ الدرس</button>
              <button className={btnOutline} onClick={togglePublish} disabled={busy}>
                {lesson.published ? 'إخفاء الدرس' : 'نشر الدرس'}
              </button>
            </div>
          </div>

          <MaterialSection
            lessonId={lesson.id} weekId={lesson.week_id} kind="document"
            title="📄 المادة الخام" subtitle="أي صيغة ملف"
            items={docs} onChanged={onChanged} onOpenViewer={onOpenViewer}
          />
          <MaterialSection
            lessonId={lesson.id} weekId={lesson.week_id} kind="slides"
            title="📊 العرض التقديمي" subtitle="PowerPoint أو PDF"
            items={slides} onChanged={onChanged} onOpenViewer={onOpenViewer}
          />
          <MaterialSection
            lessonId={lesson.id} weekId={lesson.week_id} kind="link"
            title="🔗 روابط خارجية" subtitle="فيديوهات، مصادر، شروح"
            items={links} onChanged={onChanged} onOpenViewer={onOpenViewer}
          />
        </div>
      )}
    </section>
  )
}

function MaterialSection({
  lessonId, weekId, kind, title, subtitle, items, onChanged, onOpenViewer,
}: {
  lessonId: string; weekId: string; kind: Kind; title: string; subtitle: string
  items: Material[]; onChanged: () => void; onOpenViewer: (m: Material) => void
}) {
  const [showAdd, setShowAdd] = useState(false)

  return (
    <div className="rounded-xl border border-light-blue bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h5 className="text-base font-bold text-primary">{title}</h5>
          <p className="text-xs text-ink-muted">{subtitle} — {items.length} مادة</p>
        </div>
        <button className={btnOutline} onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'إلغاء' : '+ إضافة'}
        </button>
      </div>

      {items.length > 0 && (
        <ul className="mt-3 space-y-2">
          {items.map((m) => (
            <MaterialItem key={m.id} material={m} onChanged={onChanged} onOpenViewer={onOpenViewer} />
          ))}
        </ul>
      )}

      {showAdd && (
        <div className="mt-3 rounded-xl border border-dashed border-light-blue bg-bg p-3">
          {kind === 'link' ? (
            <AddLinkForm lessonId={lessonId} weekId={weekId} onAdded={() => { setShowAdd(false); onChanged() }} />
          ) : (
            <AddFileForm lessonId={lessonId} weekId={weekId} kind={kind} onAdded={() => { setShowAdd(false); onChanged() }} />
          )}
        </div>
      )}
    </div>
  )
}

function MaterialItem({ material, onChanged, onOpenViewer }: {
  material: Material
  onChanged: () => void
  onOpenViewer: (m: Material) => void
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function togglePublish() {
    if (!supabase) return
    setBusy(true); setErr(null)
    const { error } = await supabase.from('materials').update({ published: !material.published }).eq('id', material.id)
    setBusy(false)
    if (error) setErr(error.message); else onChanged()
  }

  async function remove() {
    if (!supabase) return
    if (!window.confirm('حذف هذه المادة؟')) return
    setBusy(true); setErr(null)
    const paths: string[] = []
    if (material.view_path) paths.push(material.view_path)
    if (material.download_path && material.download_path !== material.view_path) paths.push(material.download_path)
    const { error: delErr } = await supabase.from('materials').delete().eq('id', material.id)
    if (delErr) { setErr(delErr.message); setBusy(false); return }
    if (paths.length) await supabase.storage.from(BUCKET).remove(paths)
    setBusy(false)
    onChanged()
  }

  async function download() {
    if (!supabase) return
    const path = material.view_path ?? material.download_path
    if (!path) return
    setBusy(true)
    const { data } = await supabase.storage.from(BUCKET).createSignedUrl(path, 3600, { download: true })
    setBusy(false)
    if (data?.signedUrl) window.location.href = data.signedUrl
  }

  return (
    <li className="rounded-lg border border-light-blue bg-white p-3 transition hover:border-primary/40 hover:shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-1 items-center gap-2 min-w-0">
          <span className="text-lg text-primary">
            {material.kind === 'link' ? '🔗' : material.kind === 'slides' ? '📊' : '📄'}
          </span>
          <div className="min-w-0 flex-1">
            <div className="truncate font-semibold text-ink">{material.title}</div>
            {material.kind === 'link' && material.url && (
              <div className="truncate text-xs text-ink-muted" dir="ltr">{material.url}</div>
            )}
          </div>
          <span className={'rounded px-2 py-0.5 text-xs font-semibold ' + (material.published ? 'bg-secondary-soft text-secondary' : 'bg-bg text-ink-muted')}>
            {material.published ? 'منشور' : 'مخفي'}
          </span>
        </div>
        <div className="flex flex-wrap gap-1">
          <button className={btnOutline} onClick={() => onOpenViewer(material)} disabled={busy}>
            📖 عرض
          </button>
          {material.kind !== 'link' && (
            <button className={btnOutline} onClick={download} disabled={busy}>
              ⬇ تحميل
            </button>
          )}
          <button className={btnOutline} onClick={togglePublish} disabled={busy}>
            {material.published ? 'إخفاء' : 'نشر'}
          </button>
          <button className={btnDanger} onClick={remove} disabled={busy}>حذف</button>
        </div>
      </div>
      {err && <p className="mt-2 text-xs font-semibold text-error">{err}</p>}
    </li>
  )
}

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
            {office && <span className="rounded bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">Office</span>}
            {pdf && <span className="rounded bg-error-soft px-2 py-0.5 text-xs font-semibold text-error">PDF</span>}
            {image && <span className="rounded bg-secondary-soft px-2 py-0.5 text-xs font-semibold text-secondary">صورة</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <a href={downloadUrl} download className="inline-flex items-center gap-1.5 rounded-xl bg-secondary px-4 py-2 text-sm font-semibold text-white hover:bg-secondary-hover">
              ⬇ تحميل
            </a>
            <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 rounded-xl border border-error bg-white px-4 py-2 text-sm font-semibold text-error hover:bg-error-soft">
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
            <iframe src={officeViewerUrl} title={material.title} className="h-full w-full border-0" allow="fullscreen" />
          )}
        </div>

        <footer className="border-t border-light-blue bg-white px-4 py-2 text-xs text-ink-muted">
          {pdf && 'يُعرض الملف عبر قارئ PDF المدمج.'}
          {office && 'يُعرض الملف عبر Microsoft Office Viewer.'}
          {image && 'صورة معروضة بالحجم الكامل.'}
        </footer>
      </div>
    </div>
  )
}

function AddFileForm({ lessonId, weekId, kind, onAdded }: {
  lessonId: string; weekId: string; kind: 'document' | 'slides'; onAdded: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [key, setKey] = useState(0)

  function pick(f: File | null) {
    setErr(null)
    if (!f) { setFile(null); return }
    setFile(f)
    if (!title.trim()) setTitle(f.name.replace(/\.[^.]+$/, ''))
  }

  async function submit() {
    if (!supabase || !file) return
    if (!title.trim()) { setErr('العنوان مطلوب.'); return }
    setBusy(true); setErr(null)
    const uuid = crypto.randomUUID()
    const path = `weeks/${weekId}/${uuid}.${extOf(file.name)}`
    const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type || 'application/octet-stream', upsert: false })
    if (upErr) { setErr('فشل الرفع: ' + upErr.message); setBusy(false); return }
    const viewable = ['application/pdf'].includes(file.type)
    const { error: insErr } = await supabase.from('materials').insert({
      week_id: weekId, lesson_id: lessonId, title: title.trim(), kind,
      url: null, view_path: viewable ? path : null, download_path: path,
      position: 1, published: false,
    })
    if (insErr) {
      await supabase.storage.from(BUCKET).remove([path])
      setErr('فشل الإدخال: ' + insErr.message); setBusy(false); return
    }
    setBusy(false)
    setFile(null); setTitle(''); setKey((k) => k + 1)
    onAdded()
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={label}>الملف (أي صيغة)</label>
        <input key={key} type="file" className={input} onChange={(e) => pick(e.target.files?.[0] ?? null)} />
        {file && <p className="mt-1 text-xs text-ink-muted">{file.name} — {(file.size / (1024 * 1024)).toFixed(2)} MB</p>}
      </div>
      <div>
        <label className={label}>العنوان</label>
        <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      {err && <p className="text-xs font-semibold text-error">{err}</p>}
      <button className={btn} onClick={submit} disabled={busy || !file}>
        {busy ? 'جارٍ الرفع...' : 'رفع'}
      </button>
    </div>
  )
}

function AddLinkForm({ lessonId, weekId, onAdded }: {
  lessonId: string; weekId: string; onAdded: () => void
}) {
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function submit() {
    if (!supabase) return
    if (!title.trim()) { setErr('الوصف مطلوب.'); return }
    if (!/^https:\/\//i.test(url.trim())) { setErr('الرابط يجب أن يبدأ بـ https://'); return }
    setBusy(true); setErr(null)
    const { error } = await supabase.from('materials').insert({
      week_id: weekId, lesson_id: lessonId, title: title.trim(), kind: 'link',
      url: url.trim(), view_path: null, download_path: null,
      position: 1, published: false,
    })
    setBusy(false)
    if (error) { setErr(error.message); return }
    setTitle(''); setUrl('')
    onAdded()
  }

  return (
    <div className="space-y-3">
      <div>
        <label className={label}>وصف مختصر للرابط</label>
        <input className={input} placeholder="مثال: شرح الدرس الأول" value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>
      <div>
        <label className={label}>الرابط (https)</label>
        <input className={input} dir="ltr" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
      </div>
      {err && <p className="text-xs font-semibold text-error">{err}</p>}
      <button className={btn} onClick={submit} disabled={busy}>
        {busy ? 'جارٍ الإضافة...' : 'إضافة الرابط'}
      </button>
    </div>
  )
}