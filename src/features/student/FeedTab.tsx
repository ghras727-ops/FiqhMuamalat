import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../../app/auth-context'
import { supabase } from '../../lib/supabase'

const BUCKET = 'platform-files'
const CURRICULUM_BUCKET = 'course-files'
const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const btnDanger = 'rounded-xl border border-error bg-white px-3 py-1.5 text-sm font-semibold text-error hover:bg-error-soft disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink'
const label = 'text-sm font-semibold text-primary'

type PostKind = 'announcement' | 'post' | 'image' | 'file' | 'video' | 'link'
type MaterialKind = 'document' | 'slides' | 'link'

interface PostRow {
  id: string
  author_id: string
  kind: PostKind
  title: string | null
  body: string | null
  attachment_path: string | null
  external_url: string | null
  pinned: boolean
  hidden: boolean
  allow_comments: boolean
  show_names: boolean
  linked_type: string | null
  linked_id: string | null
  created_at: string
  updated_at: string | null
}

interface CommentRow {
  id: string
  post_id: string
  author_id: string
  text: string
  hidden: boolean
  created_at: string
}

interface ProfileLite { id: string; full_name: string; role: 'teacher' | 'student' }

interface MaterialRow {
  id: string
  week_id: string
  lesson_id: string | null
  title: string
  kind: MaterialKind
  view_path: string | null
  download_path: string | null
  url: string | null
}

interface MaterialWithCtx extends MaterialRow {
  week_number: number
  lesson_title: string | null
}

interface RankRow { student_id: string; full_name: string; student_no: string | null; earned: number; possible: number; percent: number }
interface BestRow { activity_title: string; student_name: string; percent: number }

interface StatsRow {
  students: number; lessons: number; materials: number
  weeks: number; questions: number; attempts: number
}

const KIND_LABEL: Record<PostKind, string> = {
  announcement: 'إعلان', post: 'منشور', image: 'صورة',
  file: 'ملف', video: 'فيديو', link: 'رابط',
}
const KIND_EMOJI: Record<PostKind, string> = {
  announcement: '📢', post: '📝', image: '🖼️',
  file: '📎', video: '🎥', link: '🔗',
}
const KIND_STYLE: Record<PostKind, string> = {
  announcement: 'bg-accent-soft/60 text-primary border-accent/40',
  post:         'bg-primary-soft text-primary border-primary/20',
  image:        'bg-secondary-soft text-secondary border-secondary/20',
  file:         'bg-warning-soft text-ink border-warning',
  video:        'bg-error-soft text-error border-error/30',
  link:         'bg-ink/5 text-ink border-ink/20',
}

function extOf(name: string): string {
  const i = name.lastIndexOf('.')
  return i > 0 ? name.slice(i + 1).toLowerCase() : 'bin'
}

function timeAgo(iso: string): string {
  const d = new Date(iso).getTime()
  const diff = (Date.now() - d) / 1000
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} دقيقة`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} ساعة`
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} يوم`
  return new Date(iso).toLocaleDateString('ar-SA')
}

function renderWithLinks(text: string): React.ReactNode[] {
  const parts = text.split(/(https?:\/\/[^\s]+)/g)
  return parts.map((part, i) => {
    if (/^https?:\/\//.test(part)) {
      return (
        <a key={i} href={part} target="_blank" rel="noreferrer" className="break-all font-semibold text-primary underline hover:text-primary-hover">
          {part}
        </a>
      )
    }
    return <span key={i}>{part}</span>
  })
}

const AVATAR_COLORS = [
  'from-primary to-primary-hover',
  'from-secondary to-secondary-hover',
  'from-accent to-primary',
  'from-warning to-secondary',
  'from-error to-warning',
  'from-primary to-accent',
]
function avatarGradient(id: string): string {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

export default function FeedTab() {
  const { profile } = useAuth()
  const isTeacher = profile?.role === 'teacher'
  const me = profile?.id ?? ''

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [posts, setPosts] = useState<PostRow[]>([])
  const [comments, setComments] = useState<CommentRow[]>([])
  const [likesByPost, setLikesByPost] = useState<Record<string, string[]>>({})
  const [profilesMap, setProfilesMap] = useState<Record<string, ProfileLite>>({})
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({})
  const [materials, setMaterials] = useState<MaterialWithCtx[]>([])

  const [ranking, setRanking] = useState<RankRow[]>([])
  const [best, setBest] = useState<BestRow | null>(null)
  const [stats, setStats] = useState<StatsRow>({
    students: 0, lessons: 0, materials: 0, weeks: 0, questions: 0, attempts: 0,
  })

  const [showAdd, setShowAdd] = useState(false)

  const loadAll = useCallback(async () => {
    if (!supabase) return
    setLoading(true); setError(null)

    const [pRes, cRes, lRes, rRes, bRes, stRes, lsRes, msRes, wkRes, qRes, atRes] = await Promise.all([
      supabase.from('posts').select('id,author_id,kind,title,body,attachment_path,external_url,pinned,hidden,allow_comments,show_names,linked_type,linked_id,created_at,updated_at').order('pinned', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('post_comments').select('id,post_id,author_id,text,hidden,created_at').order('created_at'),
      supabase.from('post_likes').select('post_id,student_id'),
      supabase.rpc('class_ranking'),
      supabase.rpc('best_activity_score'),
      supabase.from('profiles_public').select('id,full_name,role'),
      supabase.from('lessons').select('id'),
      supabase.from('materials').select('id,week_id,lesson_id,title,kind,view_path,download_path,url'),
      supabase.from('weeks').select('id,number'),
      supabase.from('questions').select('id'),
      supabase.from('attempts').select('id'),
    ])

    if (pRes.error || cRes.error || lRes.error) {
      setError('تعذّر تحميل بيانات المنصة.')
      setLoading(false); return
    }

    const postsList = (pRes.data ?? []) as PostRow[]
    const commentsList = (cRes.data ?? []) as CommentRow[]
    const likesList = (lRes.data ?? []) as { post_id: string; student_id: string }[]

    const profMap: Record<string, ProfileLite> = {}
    for (const p of (stRes.data ?? []) as ProfileLite[]) profMap[p.id] = p

    const signed: Record<string, string> = {}
    for (const p of postsList) {
      if (p.attachment_path) {
        const { data } = await supabase.storage.from(BUCKET).createSignedUrl(p.attachment_path, 86400)
        if (data?.signedUrl) signed[p.id] = data.signedUrl
      }
    }

    const rawMaterials = (msRes.data ?? []) as MaterialRow[]
    const weekMap: Record<string, number> = {}
    for (const w of (wkRes.data ?? []) as { id: string; number: number }[]) weekMap[w.id] = w.number
    const lessonMap: Record<string, string> = {}
    if (rawMaterials.length > 0) {
      const lessonIds = Array.from(new Set(rawMaterials.map((m) => m.lesson_id).filter(Boolean) as string[]))
      if (lessonIds.length > 0) {
        const lRes2 = await supabase.from('lessons').select('id,title').in('id', lessonIds)
        for (const l of (lRes2.data ?? []) as { id: string; title: string }[]) lessonMap[l.id] = l.title
      }
    }
    const mats: MaterialWithCtx[] = rawMaterials.map((m) => ({
      ...m,
      week_number: weekMap[m.week_id] ?? 0,
      lesson_title: m.lesson_id ? lessonMap[m.lesson_id] ?? null : null,
    }))

    const lb: Record<string, string[]> = {}
    for (const l of likesList) (lb[l.post_id] ??= []).push(l.student_id)

    setPosts(postsList)
    setComments(commentsList)
    setLikesByPost(lb)
    setProfilesMap(profMap)
    setSignedUrls(signed)
    setMaterials(mats)

    if (!rRes.error) setRanking((rRes.data ?? []) as RankRow[])
    const bArr = (bRes.data ?? []) as BestRow[]
    setBest(bArr[0] ?? null)

    setStats({
      students: ((stRes.data ?? []) as unknown[]).length,
      lessons: ((lsRes.data ?? []) as unknown[]).length,
      materials: rawMaterials.length,
      weeks: ((wkRes.data ?? []) as unknown[]).length,
      questions: ((qRes.data ?? []) as unknown[]).length,
      attempts: ((atRes.data ?? []) as unknown[]).length,
    })

    setLoading(false)
  }, [])

  useEffect(() => { void loadAll() }, [loadAll])

  async function toggleLike(postId: string) {
    if (!supabase || !me) return
    const liked = (likesByPost[postId] ?? []).includes(me)
    if (liked) {
      const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('student_id', me)
      if (error) setError(error.message)
    } else {
      const { error } = await supabase.from('post_likes').insert({ post_id: postId, student_id: me })
      if (error) setError(error.message)
    }
    await loadAll()
  }

  async function addComment(postId: string, text: string) {
    if (!supabase || !me) return
    const t = text.trim(); if (!t) return
    const { error } = await supabase.from('post_comments').insert({ post_id: postId, author_id: me, text: t })
    if (error) { setError(error.message); return }
    await loadAll()
  }

  async function deleteComment(id: string) {
    if (!supabase) return
    if (!window.confirm('حذف هذا التعليق؟')) return
    const { error } = await supabase.from('post_comments').delete().eq('id', id)
    if (error) setError(error.message); else await loadAll()
  }

  async function togglePin(p: PostRow) {
    if (!supabase) return
    const { error } = await supabase.from('posts').update({ pinned: !p.pinned }).eq('id', p.id)
    if (error) setError(error.message); else await loadAll()
  }

  async function hidePost(p: PostRow) {
    if (!supabase) return
    if (!window.confirm(p.hidden ? 'إظهار المنشور للطلاب؟' : 'إخفاء المنشور عن الطلاب؟')) return
    const { error } = await supabase.from('posts').update({ hidden: !p.hidden }).eq('id', p.id)
    if (error) setError(error.message); else await loadAll()
  }

  async function deletePost(p: PostRow) {
    if (!supabase) return
    if (!window.confirm('حذف المنشور نهائيًا؟ سيُحذف معه كل تعليقاته.')) return
    if (p.attachment_path) await supabase.storage.from(BUCKET).remove([p.attachment_path])
    const { error } = await supabase.from('posts').delete().eq('id', p.id)
    if (error) setError(error.message); else await loadAll()
  }

  async function openLinkedMaterial(m: MaterialWithCtx): Promise<string | null> {
    if (m.kind === 'link' && m.url) return m.url
    if (!supabase) return null
    const path = m.view_path ?? m.download_path
    if (!path) return null
    const { data, error } = await supabase.storage.from(CURRICULUM_BUCKET).createSignedUrl(path, 86400)
    if (error || !data) return null
    const ext = (path.split('.').pop() ?? '').toLowerCase()
    const officeExts = ['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'odt', 'ods', 'odp']
    if (officeExts.includes(ext)) {
      return `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(data.signedUrl)}`
    }
    return data.signedUrl
  }

  if (loading) return <section className={card}><p className="text-ink-muted text-lg">جارٍ التحميل...</p></section>

  const meRank = ranking.findIndex((r) => r.student_id === me) + 1
  const meRow = ranking.find((r) => r.student_id === me)
  const classAvg = ranking.length === 0 ? 0 : Math.round(ranking.reduce((t, r) => t + r.percent, 0) / ranking.length)
  const top = ranking[0]

  const statCards: { label: string; value: string; sub: string; tone: 'primary' | 'secondary' | 'accent' | 'warning' | 'error' | 'ink' }[] = [
    { label: 'أفضل طالب', value: top?.full_name ?? '—', sub: top ? `${top.percent}%` : 'لا بيانات', tone: 'primary' },
    { label: 'أفضل نشاط', value: best ? `${best.percent}%` : '—', sub: best?.student_name ?? '—', tone: 'secondary' },
    { label: 'متوسط الصف', value: `${classAvg}%`, sub: `${ranking.length} طالبًا`, tone: 'accent' },
    { label: 'ترتيبك', value: meRank > 0 ? `#${meRank}` : '—', sub: meRow ? `${meRow.percent}%` : '—', tone: 'warning' },
    { label: 'المواد', value: String(stats.materials), sub: `${stats.lessons} درسًا`, tone: 'ink' },
    { label: 'المشاركون', value: String(stats.students), sub: `${stats.attempts} محاولة`, tone: 'error' },
  ]

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 pb-7 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold">المنصة</h2>
            <p className="mt-1 text-base text-white/85">
              مرحبًا {profile?.full_name ?? ''} — مساحة المقرر المغلقة.
            </p>
          </div>
          {isTeacher && (
            <button
              className="rounded-xl bg-white px-5 py-2.5 text-base font-semibold text-primary shadow-sm hover:bg-primary-soft"
              onClick={() => setShowAdd(!showAdd)}
            >
              {showAdd ? 'إلغاء' : '+ منشور جديد'}
            </button>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex h-1" aria-hidden="true">
          <span className="flex-[3] bg-accent" />
          <span className="flex-1 bg-secondary" />
          <span className="flex-1 bg-warning" />
        </div>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-sm font-semibold text-error">{error}</p>}

      {/* البطاقات الإحصائية — بدون أيقونات */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {statCards.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {isTeacher && showAdd && (
        <AddPostForm
          materials={materials}
          onCreated={async () => { setShowAdd(false); await loadAll() }}
          onCancel={() => setShowAdd(false)}
        />
      )}

      {posts.length === 0 ? (
        <section className={card}>
          <p className="text-ink-muted">لا منشورات بعد.</p>
        </section>
      ) : (
        posts.map((p) => (
          <PostCard
            key={p.id}
            post={p}
            authorName={profilesMap[p.author_id]?.full_name ?? (p.author_id === me ? (profile?.full_name ?? '—') : '—')}
            authorRole={profilesMap[p.author_id]?.role ?? (p.author_id === me ? (profile?.role ?? 'student') : 'student')}
            attachmentUrl={signedUrls[p.id] ?? null}
            comments={comments.filter((c) => c.post_id === p.id)}
            likes={likesByPost[p.id] ?? []}
            me={me}
            isTeacher={isTeacher}
            profilesMap={profilesMap}
            currentProfile={profile}
            linkedMaterial={p.linked_type === 'material' && p.linked_id ? materials.find((m) => m.id === p.linked_id) ?? null : null}
            onOpenMaterial={(m) => void openLinkedMaterial(m).then((url) => { if (url) window.open(url, '_blank', 'noreferrer') })}
            onLike={() => void toggleLike(p.id)}
            onComment={(t) => void addComment(p.id, t)}
            onDeleteComment={(id) => void deleteComment(id)}
            onPin={() => void togglePin(p)}
            onHide={() => void hidePost(p)}
            onDelete={() => void deletePost(p)}
          />
        ))
      )}
    </div>
  )
}

/* البطاقات الإحصائية — بدون أيقونات */
const TONE_STYLES: Record<string, { bar: string; bg: string; text: string; sub: string }> = {
  primary:   { bar: 'border-s-primary',   bg: 'from-primary-soft/60 to-white',   text: 'text-primary',   sub: 'text-ink-muted' },
  secondary: { bar: 'border-s-secondary', bg: 'from-secondary-soft/60 to-white', text: 'text-secondary', sub: 'text-ink-muted' },
  accent:    { bar: 'border-s-accent',    bg: 'from-accent-soft/60 to-white',    text: 'text-primary',   sub: 'text-ink-muted' },
  warning:   { bar: 'border-s-warning',   bg: 'from-warning-soft/70 to-white',   text: 'text-ink',       sub: 'text-ink-muted' },
  error:     { bar: 'border-s-error',     bg: 'from-error-soft/60 to-white',     text: 'text-error',     sub: 'text-ink-muted' },
  ink:       { bar: 'border-s-ink',       bg: 'from-ink/5 to-white',             text: 'text-ink',       sub: 'text-ink-muted' },
}

function StatCard({ label, value, sub, tone }: {
  label: string; value: string; sub: string; tone: string
}) {
  const st = TONE_STYLES[tone] ?? TONE_STYLES.primary
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-light-blue border-s-4 bg-gradient-to-b ${st.bg} p-4 shadow-sm transition hover:shadow-md ${st.bar}`}>
      <div className="text-xs font-semibold text-ink-muted">{label}</div>
      <div className={`mt-1.5 truncate text-xl font-bold ${st.text}`}>{value}</div>
      <div className={`mt-0.5 truncate text-xs ${st.sub}`}>{sub}</div>
    </div>
  )
}

function PostCard({
  post, authorName, authorRole, attachmentUrl, comments, likes, me, isTeacher, profilesMap, currentProfile,
  linkedMaterial, onOpenMaterial, onLike, onComment, onDeleteComment, onPin, onHide, onDelete,
}: {
  post: PostRow
  authorName: string
  authorRole: 'teacher' | 'student'
  attachmentUrl: string | null
  comments: CommentRow[]
  likes: string[]
  me: string
  isTeacher: boolean
  profilesMap: Record<string, ProfileLite>
  currentProfile: { id: string; full_name: string; role: string } | null
  linkedMaterial: MaterialWithCtx | null
  onOpenMaterial: (m: MaterialWithCtx) => void
  onLike: () => void
  onComment: (text: string) => void
  onDeleteComment: (id: string) => void
  onPin: () => void
  onHide: () => void
  onDelete: () => void
}) {
  const [draft, setDraft] = useState('')
  const [showComments, setShowComments] = useState(comments.length > 0)
  const liked = likes.includes(me)

  function send() {
    const t = draft.trim(); if (!t) return
    onComment(t); setDraft(''); setShowComments(true)
  }

  function commenterName(authorId: string): string {
    if (post.show_names || isTeacher) {
      const n = profilesMap[authorId]?.full_name
        ?? (authorId === me ? currentProfile?.full_name : undefined)
        ?? 'طالب'
      return n
    }
    if (authorId === me) return 'أنت'
    return 'طالب'
  }

  function commenterRole(authorId: string): 'teacher' | 'student' {
    if (authorId === me && currentProfile?.role === 'teacher') return 'teacher'
    return profilesMap[authorId]?.role ?? 'student'
  }

  const isTeacherAuthor = authorRole === 'teacher'
  const accentBar = isTeacherAuthor ? 'border-s-secondary' : 'border-s-primary'

  return (
    <section className={`relative overflow-hidden rounded-2xl border border-light-blue border-s-4 bg-white shadow-sm transition hover:shadow-md ${post.pinned ? 'border-warning' : accentBar}`}>
      {post.pinned && (
        <div className="flex items-center justify-between bg-gradient-to-l from-warning-soft to-white px-5 py-2 text-sm font-semibold text-ink">
          <span>📌 منشور مثبّت</span>
        </div>
      )}

      <div className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-lg font-bold text-white shadow-sm ${avatarGradient(post.author_id)}`}>
              {(authorName || '؟').charAt(0)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-base font-bold text-ink">{authorName}</span>
                {isTeacherAuthor && (
                  <span className="rounded-lg bg-gradient-to-l from-secondary to-secondary-hover px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
                    ✓ أستاذ
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-ink-muted">
                {timeAgo(post.created_at)}
                {post.updated_at && ' — عُدّل'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${KIND_STYLE[post.kind]}`}>
              {KIND_EMOJI[post.kind]} {KIND_LABEL[post.kind]}
            </span>
          </div>
        </div>

        {isTeacher && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button className={btnOutline + ' !py-1 !text-xs'} onClick={onPin}>
              {post.pinned ? '📌 إلغاء التثبيت' : '📌 تثبيت'}
            </button>
            <button className={btnOutline + ' !py-1 !text-xs'} onClick={onHide}>
              {post.hidden ? '👁️ إظهار' : '🙈 إخفاء'}
            </button>
            <button className={btnDanger + ' !py-1 !text-xs'} onClick={onDelete}>
              🗑️ حذف
            </button>
          </div>
        )}

        {post.title && (
          <h3 className="mt-4 text-xl font-bold leading-8 text-primary">{post.title}</h3>
        )}
        {post.body && (
          <p className="mt-2 whitespace-pre-wrap break-words text-[15px] leading-8 text-ink">
            {renderWithLinks(post.body)}
          </p>
        )}

        {post.kind === 'image' && attachmentUrl && (
          <div className="mt-4 overflow-hidden rounded-xl border border-light-blue">
            <img src={attachmentUrl} alt={post.title ?? ''} className="max-h-96 w-full object-contain" />
          </div>
        )}

        {post.kind === 'file' && attachmentUrl && (
          <a className="mt-4 flex items-center justify-between gap-3 rounded-xl border-2 border-primary/30 bg-gradient-to-l from-primary-soft to-white p-3 transition hover:border-primary hover:shadow-md" href={attachmentUrl} target="_blank" rel="noreferrer">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-lg text-white">📎</div>
              <span className="text-sm font-semibold text-ink">{post.title ?? 'ملف مرفق'}</span>
            </div>
            <span className="rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white">تحميل</span>
          </a>
        )}

        {(post.kind === 'link' || post.kind === 'video') && post.external_url && (
          <a className="mt-4 flex items-center justify-between gap-3 rounded-xl border-2 border-accent/40 bg-gradient-to-l from-accent-soft/40 to-white p-3 transition hover:border-accent hover:shadow-md" href={post.external_url} target="_blank" rel="noreferrer">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-lg text-white">
                {post.kind === 'video' ? '🎥' : '🔗'}
              </div>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-ink">{post.title ?? 'رابط'}</div>
                <div className="truncate text-xs text-ink-muted" dir="ltr">{post.external_url}</div>
              </div>
            </div>
            <span className="rounded-lg bg-accent px-3 py-1.5 text-sm font-semibold text-white">
              {post.kind === 'video' ? 'مشاهدة' : 'فتح'}
            </span>
          </a>
        )}

        {linkedMaterial && (
          <div className="mt-4 rounded-xl border-2 border-secondary bg-gradient-to-l from-secondary-soft to-white p-3 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-secondary">📚 مادة من المنهج</div>
                <div className="mt-1 truncate text-sm font-semibold text-ink">
                  {linkedMaterial.kind === 'link' ? '🔗 ' : linkedMaterial.kind === 'slides' ? '📊 ' : '📄 '}
                  {linkedMaterial.title}
                </div>
                <div className="mt-0.5 text-xs text-ink-muted">
                  الأسبوع {linkedMaterial.week_number}
                  {linkedMaterial.lesson_title ? ` — ${linkedMaterial.lesson_title}` : ''}
                </div>
              </div>
              <button
                className="rounded-lg bg-secondary px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-secondary-hover"
                onClick={() => onOpenMaterial(linkedMaterial)}
              >
                فتح المادة
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-light-blue/50 pt-3">
          <button
            className={
              'inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition ' +
              (liked
                ? 'border-error bg-error-soft text-error shadow-sm'
                : 'border-light-blue bg-white text-ink-muted hover:border-error/40 hover:bg-error-soft/30 hover:text-error')
            }
            onClick={onLike}
          >
            <span>{liked ? '❤️' : '🤍'}</span>
            <span>{likes.length === 0 ? 'إعجاب' : likes.length}</span>
          </button>
          {post.allow_comments && (
            <button
              className="inline-flex items-center gap-1.5 rounded-full border border-light-blue bg-white px-3.5 py-1.5 text-sm font-semibold text-ink-muted transition hover:border-primary/40 hover:bg-primary-soft/30 hover:text-primary"
              onClick={() => setShowComments(!showComments)}
            >
              <span>💬</span>
              <span>{comments.length === 0 ? 'تعليق' : comments.length}</span>
            </button>
          )}
          {!post.show_names && !isTeacher && (
            <span className="rounded-full bg-bg px-3 py-1 text-xs text-ink-muted">👤 أسماء مخفية</span>
          )}
        </div>

        {!post.allow_comments && (
          <p className="mt-3 rounded-lg bg-bg p-3 text-sm text-ink-muted">🔒 التعليقات معطّلة لهذا المنشور.</p>
        )}

        {post.allow_comments && showComments && (
          <div className="mt-4 space-y-3 border-t border-light-blue/50 pt-4">
            {comments.map((c) => {
              const cName = commenterName(c.author_id)
              const cRole = commenterRole(c.author_id)
              const canDelete = isTeacher || c.author_id === me
              return (
                <div key={c.id} className="flex items-start gap-3 rounded-xl bg-bg p-3">
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-xs font-bold text-white shadow-sm ${avatarGradient(c.author_id)}`}>
                    {(cName || '؟').charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-ink">{cName}</span>
                      {cRole === 'teacher' && (
                        <span className="rounded bg-gradient-to-l from-secondary to-secondary-hover px-1.5 py-0.5 text-[10px] font-bold text-white">✓ أستاذ</span>
                      )}
                      <span className="text-xs text-ink-muted">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-7 text-ink">
                      {renderWithLinks(c.text)}
                    </p>
                  </div>
                  {canDelete && (
                    <button className="shrink-0 text-xs text-error hover:underline" onClick={() => onDeleteComment(c.id)}>
                      حذف
                    </button>
                  )}
                </div>
              )
            })}

            <div className="flex gap-2">
              <input
                className={input + ' mt-0'}
                placeholder="اكتب تعليقًا..."
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') send() }}
              />
              <button className={btn} onClick={send}>إرسال</button>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function AddPostForm({ materials, onCreated, onCancel }: {
  materials: MaterialWithCtx[]
  onCreated: () => void
  onCancel: () => void
}) {
  const [kind, setKind] = useState<PostKind>('announcement')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [pinned, setPinned] = useState(false)
  const [allowComments, setAllowComments] = useState(true)
  const [showNames, setShowNames] = useState(false)
  const [linkedMaterialId, setLinkedMaterialId] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [fileKey, setFileKey] = useState(0)

  function resetAll() {
    setKind('announcement'); setTitle(''); setBody(''); setUrl(''); setFile(null)
    setPinned(false); setAllowComments(true); setShowNames(false); setLinkedMaterialId('')
    setFileKey((k) => k + 1)
  }

  async function submit() {
    if (!supabase) return
    setErr(null)

    if ((kind === 'image' || kind === 'file') && !file) { setErr('اختر ملفًا.'); return }
    if ((kind === 'link' || kind === 'video') && !/^https:\/\//i.test(url.trim())) {
      setErr('الرابط يجب أن يبدأ بـ https://'); return
    }
    if ((kind === 'announcement' || kind === 'post') && !body.trim() && !title.trim()) {
      setErr('اكتب نصًا أو عنوانًا.'); return
    }

    setBusy(true)
    let attachmentPath: string | null = null

    try {
      if ((kind === 'image' || kind === 'file') && file) {
        const uuid = crypto.randomUUID()
        attachmentPath = `posts/${uuid}.${extOf(file.name)}`
        const { error: upErr } = await supabase.storage.from(BUCKET).upload(attachmentPath, file, {
          contentType: file.type || 'application/octet-stream',
          upsert: false,
        })
        if (upErr) { setErr('فشل رفع الملف: ' + upErr.message); setBusy(false); return }
      }

      const u = await supabase.auth.getUser()
      const { error: insErr } = await supabase.from('posts').insert({
        author_id: u.data.user?.id,
        kind,
        title: title.trim() || null,
        body: body.trim() || null,
        attachment_path: attachmentPath,
        external_url: (kind === 'link' || kind === 'video') ? url.trim() : null,
        pinned,
        allow_comments: allowComments,
        show_names: showNames,
        linked_type: linkedMaterialId ? 'material' : null,
        linked_id: linkedMaterialId || null,
      })

      if (insErr) {
        if (attachmentPath) await supabase.storage.from(BUCKET).remove([attachmentPath])
        setErr('فشل النشر: ' + insErr.message); setBusy(false); return
      }

      resetAll()
      onCreated()
    } finally { setBusy(false) }
  }

  const isFileKind = kind === 'image' || kind === 'file'
  const isUrlKind = kind === 'link' || kind === 'video'

  return (
    <section className={card}>
      <h3 className="text-xl font-bold text-primary">منشور جديد</h3>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div>
          <label className={label}>النوع</label>
          <select className={input} value={kind} onChange={(e) => setKind(e.target.value as PostKind)}>
            <option value="announcement">📢 إعلان</option>
            <option value="post">📝 منشور نصي</option>
            <option value="image">🖼️ صورة</option>
            <option value="file">📎 ملف</option>
            <option value="video">🎥 فيديو (رابط)</option>
            <option value="link">🔗 رابط</option>
          </select>
        </div>
        <div>
          <label className={label}>ربط بمادة من المنهج (اختياري)</label>
          <select className={input} value={linkedMaterialId} onChange={(e) => setLinkedMaterialId(e.target.value)}>
            <option value="">— بدون ربط —</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                الأسبوع {m.week_number} — {m.lesson_title ?? 'بدون درس'} — {m.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4">
        <label className={label}>عنوان (اختياري)</label>
        <input className={input} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      <div className="mt-4">
        <label className={label}>النص</label>
        <textarea className={input} rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
        <p className="mt-1 text-xs text-ink-muted">يمكن لصق روابط داخل النص — ستظهر قابلة للنقر تلقائيًا.</p>
      </div>

      {isFileKind && (
        <div className="mt-4">
          <label className={label}>الملف</label>
          <input key={fileKey} type="file" accept={kind === 'image' ? 'image/*' : undefined} className={input} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          {file && <p className="mt-1 text-xs text-ink-muted">{file.name} — {(file.size / (1024 * 1024)).toFixed(2)} MB</p>}
        </div>
      )}

      {isUrlKind && (
        <div className="mt-4">
          <label className={label}>الرابط (https)</label>
          <input className={input} dir="ltr" placeholder="https://..." value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
      )}

      <div className="mt-5 grid gap-3 rounded-xl border border-light-blue bg-bg p-4 md:grid-cols-3">
        <label className="flex items-center gap-2 text-base">
          <input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} className="h-5 w-5" />
          <span>السماح بالتعليق</span>
        </label>
        <label className="flex items-center gap-2 text-base">
          <input type="checkbox" checked={showNames} onChange={(e) => setShowNames(e.target.checked)} className="h-5 w-5" />
          <span>إظهار أسماء المعلّقين</span>
        </label>
        <label className="flex items-center gap-2 text-base">
          <input type="checkbox" checked={pinned} onChange={(e) => setPinned(e.target.checked)} className="h-5 w-5" />
          <span>تثبيت في الأعلى</span>
        </label>
      </div>

      {err && <p className="mt-3 text-sm font-semibold text-error">{err}</p>}

      <div className="mt-5 flex flex-wrap gap-2">
        <button className={btn} onClick={submit} disabled={busy}>{busy ? 'جارٍ النشر...' : 'نشر'}</button>
        <button className={btnOutline} onClick={onCancel} disabled={busy}>إلغاء</button>
      </div>
    </section>
  )
}