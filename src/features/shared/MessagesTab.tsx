import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../app/auth-context'
import { supabase } from '../../lib/supabase'
import type { Announcement, AnnouncementRead, Message, MessageReaction, UserBrief } from '../../types'

// تعريف نوع تفاعلات الإعلانات محلياً
interface AnnouncementReaction {
  id: string
  announcement_id: string
  student_id: string // معرف المستخدم (طالب أو أستاذ)
  emoji: string
  created_at: string
}

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60 transition-all active:scale-95'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60 transition-all active:scale-95'
const input = 'w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent/40 transition-shadow'
const label = 'text-sm font-semibold text-primary'

const TOP_EMOJIS = [
  { char: '👍', name: 'موافق / إعجاب' },
  { char: '🙏', name: 'شكراً لك' },
  { char: '👏', name: 'أحسنت' },
  { char: '✅', name: 'عُلم / تم' },
  { char: '💡', name: 'فهمت / فكرة' },
  { char: '❓', name: 'لدي سؤال / لم أفهم' },
  { char: '💯', name: 'ممتاز / درجة كاملة' },
  { char: '👀', name: 'اطلعت عليه / جاري المراجعة' },
  { char: '🙌', name: 'رائع / ممتن' },
  { char: '🤝', name: 'اتفقنا' },
  { char: '❤️', name: 'أعجبني' },
  { char: '😓', name: 'صعب / تعبت' }
]

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} د`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} س`
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} ي`
  return new Date(iso).toLocaleDateString('ar-SA-u-nu-latn')
}

export default function MessagesTab() {
  const { profile } = useAuth()
  if (!profile) return null
  return profile.role === 'teacher' ? <TeacherView /> : <StudentView />
}

// ====================== تفاعلات الإعلانات (مشتركة) ======================

/**
 * هوك مشترك بين الطالب والأستاذ:
 * - يجلب تفاعلات قائمة الإعلانات المعروضة.
 * - يستمع لأحداث INSERT/DELETE ويطبّقها مباشرة على الحالة (بدون إعادة تحميل كل شيء).
 * - يمنع تكرار التفاعل نفسه (dedupe بالـ id) عند وصول حدث الـ realtime قبل رد الـ insert.
 * - يعرض أي خطأ من Supabase بدل تجاهله بصمت.
 */
function useAnnouncementReactions(announcementIds: string[], userId: string | undefined) {
  const [reactions, setReactions] = useState<AnnouncementReaction[]>([])
  const [error, setError] = useState<string | null>(null)

  const idsKey = announcementIds.join(',')
  const idsRef = useRef<Set<string>>(new Set())
  const reactionsRef = useRef<AnnouncementReaction[]>([])
  reactionsRef.current = reactions

  useEffect(() => {
    idsRef.current = new Set(idsKey ? idsKey.split(',') : [])
  }, [idsKey])

  const fetchReactions = useCallback(async () => {
    if (!supabase) return
    const ids = idsKey ? idsKey.split(',') : []
    if (ids.length === 0) { setReactions([]); return }
    const { data, error: err } = await supabase
      .from('announcement_reactions')
      .select('*')
      .in('announcement_id', ids)
    if (err) { setError('تعذّر جلب التفاعلات: ' + err.message); return }
    setReactions((data ?? []) as AnnouncementReaction[])
  }, [idsKey])

  useEffect(() => { void fetchReactions() }, [fetchReactions])

  // شبكة أمان: إن لم يكن الـ realtime مفعّلاً على الجدول، نحدّث دورياً وعند العودة للصفحة
  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') void fetchReactions() }
    const timer = window.setInterval(tick, 10000)
    document.addEventListener('visibilitychange', tick)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [fetchReactions])

  // الاستماع الفوري (اشتراك واحد ثابت، لا يُعاد إنشاؤه عند تغيّر الإعلانات)
  useEffect(() => {
    if (!supabase) return
    const ch = supabase
      .channel('ann-reacts-' + Math.random().toString(36).slice(2))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcement_reactions' }, (payload: { new?: unknown }) => {
        const row = payload.new as AnnouncementReaction | undefined
        if (!row?.id || !idsRef.current.has(row.announcement_id)) return
        setReactions((prev) => (prev.some((r) => r.id === row.id) ? prev : [...prev, row]))
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'announcement_reactions' }, (payload: { old?: unknown }) => {
        const old = payload.old as Partial<AnnouncementReaction> | undefined
        if (!old?.id) return
        setReactions((prev) => prev.filter((r) => r.id !== old.id))
      })
      .subscribe((status: string) => {
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('[announcement_reactions] realtime غير متاح:', status)
        }
      })
    return () => { void supabase!.removeChannel(ch) }
  }, [])

  const toggle = useCallback(async (announcementId: string, emoji: string) => {
    if (!supabase || !userId) return
    setError(null)
    const existing = reactionsRef.current.find(
      (r) => r.announcement_id === announcementId && r.student_id === userId && r.emoji === emoji,
    )

    if (existing) {
      // حذف تفاؤلي مع تراجع عند الفشل
      setReactions((prev) => prev.filter((r) => r.id !== existing.id))
      const { error: err } = await supabase.from('announcement_reactions').delete().eq('id', existing.id)
      if (err) {
        setError('تعذّر حذف التفاعل: ' + err.message)
        setReactions((prev) => (prev.some((r) => r.id === existing.id) ? prev : [...prev, existing]))
      }
    } else {
      const { data, error: err } = await supabase
        .from('announcement_reactions')
        .insert({ announcement_id: announcementId, student_id: userId, emoji })
        .select()
        .single()
      if (err) {
        if (err.code === '23505') { await fetchReactions(); return } // موجود مسبقاً
        console.error('[announcement_reactions] insert failed:', err)
        setError('تعذّر حفظ التفاعل: ' + err.message)
        return
      }
      if (data) {
        const row = data as AnnouncementReaction
        setReactions((prev) => (prev.some((r) => r.id === row.id) ? prev : [...prev, row]))
      }
    }
  }, [userId, fetchReactions])

  return { reactions, toggle, error, clearError: () => setError(null) }
}

function ReactionBar({ reactions, meId, pickerOpen, onTogglePicker, onClosePicker, onToggle, heading }: {
  reactions: AnnouncementReaction[]
  meId: string | undefined
  pickerOpen: boolean
  onTogglePicker: () => void
  onClosePicker: () => void
  onToggle: (emoji: string) => void
  heading?: string
}) {
  const grouped: Record<string, { count: number; mine: boolean }> = {}
  for (const r of reactions) {
    const g = grouped[r.emoji] ?? { count: 0, mine: false }
    g.count += 1
    if (r.student_id === meId) g.mine = true
    grouped[r.emoji] = g
  }

  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-1.5 px-1">
        {heading && Object.keys(grouped).length > 0 && (
          <span className="text-sm font-bold text-ink-muted ms-1">{heading}</span>
        )}
        {Object.entries(grouped).map(([char, { count, mine }]) => (
          <button
            key={char}
            type="button"
            onClick={() => onToggle(char)}
            className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-bold transition-transform hover:scale-105 active:scale-95 ${mine ? 'border-primary/40 bg-primary-soft text-primary shadow-sm' : 'border-light-blue bg-white text-ink shadow-sm hover:border-primary/50'}`}
          >
            <span>{char}</span>
            <span>{count}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={onTogglePicker}
          aria-expanded={pickerOpen}
          title="إضافة تفاعل"
          className="flex items-center gap-1 rounded-full border border-dashed border-primary/50 bg-white px-3 py-1 text-sm font-bold text-primary transition-all hover:bg-primary-soft active:scale-95"
        >
          <span>😊</span>
          <span>＋ تفاعل</span>
        </button>
      </div>

      {pickerOpen && (
        <div className="flex flex-wrap justify-center gap-1.5 rounded-2xl border border-light-blue bg-white p-2.5 shadow-md">
          {TOP_EMOJIS.map(({ char, name }) => (
            <button
              key={char}
              type="button"
              onClick={() => { onToggle(char); onClosePicker() }}
              className="flex h-10 w-10 items-center justify-center rounded-full text-xl transition-transform hover:scale-125 hover:bg-primary-soft active:scale-90"
              title={name}
            >
              {char}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================== STUDENT ==============================
function StudentView() {
  const { profile } = useAuth()
  const profileId = profile?.id
  const [teacher, setTeacher] = useState<UserBrief | null>(null)
  const [loadingTeacher, setLoadingTeacher] = useState(true)
  const [view, setView] = useState<'announcements' | 'chat'>('chat')

  const loadTeacherAcc = useCallback(async () => {
    if (!supabase || !profileId) return
    setLoadingTeacher(true)
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'teacher')
      .eq('active', true)
      .limit(1)
      .maybeSingle()

    setTeacher(data as UserBrief | null)
    setLoadingTeacher(false)
  }, [profileId])

  useEffect(() => {
    void loadTeacherAcc()
  }, [loadTeacherAcc])

  if (!profile) return null

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">مراسلة الأستاذ</h2>
        <p className="mt-1 text-base text-white/85">
          هنا يمكنك إرسال رسالة للأستاذ تشرح ما تريده، وسيجيبك هنا. الرسائل خاصة، يراها الأستاذ فقط. كما تجد الإعلانات الموجهة لكل الطلاب.
        </p>
      </section>

      <div className="inline-flex rounded-xl border border-light-blue bg-white p-1 shadow-sm">
        <button
          className={(view === 'chat' ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary-soft') + ' rounded-lg px-4 py-2 text-sm font-semibold transition-all'}
          onClick={() => setView('chat')}
        >💬 محادثتي</button>
        <button
          className={(view === 'announcements' ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary-soft') + ' rounded-lg px-4 py-2 text-sm font-semibold transition-all'}
          onClick={() => setView('announcements')}
        >📢 الإعلانات</button>
      </div>

      {view === 'announcements' && <StudentAnnouncements />}

      {view === 'chat' && loadingTeacher && (
        <section className={card}><p className="text-ink-muted font-medium text-center py-6">جارٍ تجهيز المحادثة...</p></section>
      )}

      {view === 'chat' && !loadingTeacher && teacher && (
        <DirectChat meId={profile.id} themId={teacher.id} themName={teacher.full_name} myRole="student" />
      )}

      {view === 'chat' && !loadingTeacher && !teacher && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-warning bg-warning-soft p-5 text-ink shadow-sm">
          <div>
            <h4 className="text-lg font-bold text-warning-dark">تعذّر جلب حساب الأستاذ مؤقتاً</h4>
            <p className="text-sm font-medium mt-1">قد يكون الاتصال بطيئاً أو لم تكتمل مصادقة الدخول بعد.</p>
          </div>
          <button onClick={() => void loadTeacherAcc()} className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-warning shadow hover:bg-bg transition-all">
            🔄 إعادة البحث
          </button>
        </div>
      )}
    </div>
  )
}

function StudentAnnouncements() {
  const { profile } = useAuth()
  const profileId = profile?.id
  const [items, setItems] = useState<Announcement[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [openId, setOpenId] = useState<string | null>(null)
  const [pickerOpenId, setPickerOpenId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const { reactions, toggle, error: reactError, clearError } = useAnnouncementReactions(
    items.map((a) => a.id),
    profileId,
  )

  const load = useCallback(async () => {
    if (!supabase || !profileId) return
    const [aRes, rRes] = await Promise.all([
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('announcement_reads').select('announcement_id').eq('student_id', profileId),
    ])

    setItems((aRes.data ?? []) as Announcement[])
    setReadIds(new Set(((rRes.data ?? []) as { announcement_id: string }[]).map((r) => r.announcement_id)))
    setLoading(false)
  }, [profileId])

  useEffect(() => { void load() }, [load])

  async function open(ann: Announcement) {
    setOpenId(openId === ann.id ? null : ann.id)
    setPickerOpenId(null)
    if (!readIds.has(ann.id) && supabase && profileId) {
      await supabase.from('announcement_reads').insert({ announcement_id: ann.id, student_id: profileId })
      setReadIds((prev) => new Set([...prev, ann.id]))
    }
  }

  if (loading) return <section className={card}><p className="text-ink-muted">جارٍ التحميل...</p></section>
  if (items.length === 0) return <section className={card}><p className="text-ink-muted text-center py-6">لا توجد إعلانات بعد.</p></section>

  return (
    <section className={card} onClick={() => setPickerOpenId(null)}>
      <h3 className="text-lg font-bold text-primary mb-3">الإعلانات ({items.length})</h3>

      {reactError && (
        <p className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-error-soft p-2 text-sm font-semibold text-error">
          <span>{reactError}</span>
          <button type="button" onClick={(e) => { e.stopPropagation(); clearError() }} className="px-2">✕</button>
        </p>
      )}

      <ul className="space-y-3">
        {items.map((ann) => {
          const isNew = !readIds.has(ann.id)
          const isOpen = openId === ann.id
          const annReactions = reactions.filter((r) => r.announcement_id === ann.id)
          const isPickerOpen = pickerOpenId === ann.id

          return (
            <li key={ann.id} className={'rounded-xl border-2 transition-all duration-300 ' + (isNew ? 'border-error bg-error-soft/20' : 'border-light-blue')}>
              <button className="w-full text-start p-4 hover:bg-bg/50 transition-colors" onClick={(e) => { e.stopPropagation(); void open(ann) }}>
                <div className="flex items-center gap-2">
                  {isNew && <span className="rounded-full bg-error px-2 py-0.5 text-xs font-bold text-white shadow-sm">جديد</span>}
                  <span className="text-base font-bold text-ink">{ann.title}</span>
                  {!isOpen && annReactions.length > 0 && (
                    <span className="text-xs font-bold text-ink-muted">· {annReactions.length} تفاعل</span>
                  )}
                  <span className="ms-auto text-xs text-ink-muted font-medium">{timeAgo(ann.created_at)}</span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-light-blue p-4 space-y-3 bg-bg/30">
                  <div
                    onClick={(e) => { e.stopPropagation(); setPickerOpenId(isPickerOpen ? null : ann.id) }}
                    className="cursor-pointer whitespace-pre-wrap rounded-xl bg-white shadow-sm border border-light-blue p-4 text-sm leading-relaxed text-ink hover:bg-primary-soft/10 transition-colors"
                    title="اضغط لإضافة تفاعل"
                  >
                    {ann.body}
                  </div>

                  <ReactionBar
                    reactions={annReactions}
                    meId={profileId}
                    pickerOpen={isPickerOpen}
                    onTogglePicker={() => setPickerOpenId(isPickerOpen ? null : ann.id)}
                    onClosePicker={() => setPickerOpenId(null)}
                    onToggle={(emoji) => void toggle(ann.id, emoji)}
                  />
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

// ============================== TEACHER ==============================
function TeacherView() {
  const { profile } = useAuth()
  const [view, setView] = useState<'announcements' | 'conversations'>('conversations')

  if (!profile) return null

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">مراسلة الطلاب</h2>
        <p className="mt-1 text-base text-white/85">أرسل إعلاناً لكل الطلاب، أو راسل طالباً بعينه. تابع من قرأ إعلاناتك.</p>
      </section>

      <div className="inline-flex rounded-xl border border-light-blue bg-white p-1 shadow-sm">
        <button className={(view === 'conversations' ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary-soft') + ' rounded-lg px-4 py-2 text-sm font-semibold transition-all'} onClick={() => setView('conversations')}>💬 محادثات الطلاب</button>
        <button className={(view === 'announcements' ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary-soft') + ' rounded-lg px-4 py-2 text-sm font-semibold transition-all'} onClick={() => setView('announcements')}>📢 الإعلانات</button>
      </div>

      {view === 'conversations' && <TeacherConversations meId={profile.id} />}
      {view === 'announcements' && <TeacherAnnouncements meId={profile.id} />}
    </div>
  )
}

function TeacherConversations({ meId }: { meId: string }) {
  const [students, setStudents] = useState<UserBrief[]>([])
  const [selected, setSelected] = useState<UserBrief | null>(null)
  const [unreadByStudent, setUnreadByStudent] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)

    const mRes = await supabase.from('messages').select('sender_id').eq('recipient_id', meId).is('read_at', null)
    const counts: Record<string, number> = {}
    for (const row of (mRes.data ?? []) as { sender_id: string }[]) {
      counts[row.sender_id] = (counts[row.sender_id] ?? 0) + 1
    }
    setUnreadByStudent(counts)

    if (search.trim()) {
      const sRes = await supabase.from('profiles')
        .select('id, full_name, student_no')
        .eq('role', 'student')
        .eq('active', true)
        .or(`full_name.ilike.%${search}%,student_no.ilike.%${search}%`)
        .order('full_name')
      setStudents((sRes.data ?? []) as UserBrief[])
    } else {
      const allMsgs = await supabase.from('messages').select('sender_id, recipient_id').or(`sender_id.eq.${meId},recipient_id.eq.${meId}`)
      const interactedIds = new Set<string>()
      for (const m of (allMsgs.data ?? []) as { sender_id: string, recipient_id: string }[]) {
        if (m.sender_id !== meId) interactedIds.add(m.sender_id)
        if (m.recipient_id !== meId) interactedIds.add(m.recipient_id)
      }

      if (interactedIds.size > 0) {
        const sRes = await supabase.from('profiles')
          .select('id, full_name, student_no')
          .in('id', Array.from(interactedIds))
          .order('full_name')
        setStudents((sRes.data ?? []) as UserBrief[])
      } else {
        setStudents([])
      }
    }
    setLoading(false)
  }, [meId, search])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!supabase) return
    const ch = supabase.channel('teacher-conv-' + meId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${meId}` }, () => { void load() })
      .subscribe()
    return () => { void supabase!.removeChannel(ch) }
  }, [meId, load])

  if (selected) {
    return (
      <div className="space-y-3">
        <button className={btnOutline} onClick={() => { setSelected(null); void load() }}>← رجوع للقائمة</button>
        <DirectChat meId={meId} themId={selected.id} themName={selected.full_name + (selected.student_no ? ` (${selected.student_no})` : '')} myRole="teacher" onSent={() => { void load() }} />
      </div>
    )
  }

  return (
    <section className={card}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-primary">المحادثات ({students.length})</h3>
        <input
          className={input + ' max-w-xs mt-0'}
          placeholder="ابحث باسم الطالب أو رقمه لبدء محادثة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {loading ? <p className="text-ink-muted">جارٍ التحميل...</p> : students.length === 0 ? (
        <p className="text-ink-muted text-center py-6">{search ? 'لا طلاب مطابقون للبحث.' : 'لا توجد محادثات. ابحث باسم الطالب لبدء واحدة.'}</p>
      ) : (
        <ul className="space-y-2">
          {students.map((s) => {
            const n = unreadByStudent[s.id] ?? 0
            return (
              <li key={s.id}>
                <button className="w-full rounded-xl border-2 border-light-blue bg-white p-3 text-start hover:border-primary hover:bg-primary-soft/20 transition-all duration-200" onClick={() => setSelected(s)}>
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-base font-bold text-ink">{s.full_name}</div>
                      {s.student_no && <div className="text-xs font-mono text-ink-muted" dir="ltr">{s.student_no}</div>}
                    </div>
                    {n > 0 && <span className="rounded-full bg-error px-2.5 py-1 text-xs font-bold text-white shadow-sm">{n} رسالة جديدة</span>}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function TeacherAnnouncements({ meId }: { meId: string }) {
  const [items, setItems] = useState<Announcement[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pickerOpenId, setPickerOpenId] = useState<string | null>(null)
  const [reads, setReads] = useState<Record<string, { readers: { name: string; read_at: string }[]; nonReaders: string[]; total: number }>>({})

  const { reactions, toggle, error: reactError, clearError } = useAnnouncementReactions(
    items.map((a) => a.id),
    meId,
  )

  const load = useCallback(async () => {
    if (!supabase) return
    const aRes = await supabase.from('announcements').select('*').eq('sender_id', meId).order('created_at', { ascending: false })
    setItems((aRes.data ?? []) as Announcement[])
  }, [meId])

  useEffect(() => { void load() }, [load])

  async function send() {
    if (!supabase || !title.trim() || !body.trim()) { setError('العنوان والنص مطلوبان.'); return }
    setBusy(true); setError(null)
    const { error: insErr } = await supabase.from('announcements').insert({ sender_id: meId, title: title.trim(), body: body.trim() })
    setBusy(false)
    if (insErr) { setError(insErr.message); return }
    setTitle(''); setBody('')
    await load()
  }

  async function loadReads(annId: string) {
    if (!supabase) return
    const [readRes, studentsRes] = await Promise.all([
      supabase.from('announcement_reads').select('student_id, read_at').eq('announcement_id', annId),
      supabase.from('profiles').select('id, full_name').eq('role', 'student').eq('active', true).order('full_name'),
    ])
    const loadedReads = (readRes.data ?? []) as AnnouncementRead[]
    const students = (studentsRes.data ?? []) as { id: string; full_name: string }[]
    const readIds = new Set(loadedReads.map((r) => r.student_id))
    const readers = students.filter((s) => readIds.has(s.id)).map((s) => ({ name: s.full_name, read_at: loadedReads.find((r) => r.student_id === s.id)!.read_at }))
    const nonReaders = students.filter((s) => !readIds.has(s.id)).map((s) => s.full_name)
    setReads((prev) => ({ ...prev, [annId]: { readers, nonReaders, total: students.length } }))
  }

  async function toggleExpand(annId: string) {
    if (expandedId === annId) { setExpandedId(null); return }
    setExpandedId(annId)
    setPickerOpenId(null)
    if (!reads[annId]) await loadReads(annId)
  }

  return (
    <div className="space-y-4" onClick={() => setPickerOpenId(null)}>
      <section className={card}>
        <h3 className="text-lg font-bold text-primary mb-3">نشر إعلان جديد</h3>
        <div className="space-y-3">
          <div>
            <label className={label}>العنوان</label>
            <input className={input + ' mt-1'} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الإعلان..." />
          </div>
          <div>
            <label className={label}>النص</label>
            <textarea className={input + ' mt-1'} rows={4} value={body} onChange={(e) => setBody(e.target.value)} placeholder="نص الإعلان..." />
          </div>
          {error && <p className="rounded-lg bg-error-soft p-2 text-error text-sm font-semibold">{error}</p>}
          <button className={btn} onClick={() => void send()} disabled={busy}>{busy ? 'جارٍ النشر...' : '📢 نشر لكل الطلاب'}</button>
        </div>
      </section>

      <section className={card}>
        <h3 className="text-lg font-bold text-primary mb-3">الإعلانات المنشورة ({items.length})</h3>

        {reactError && (
          <p className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-error-soft p-2 text-sm font-semibold text-error">
            <span>{reactError}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); clearError() }} className="px-2">✕</button>
          </p>
        )}

        {items.length === 0 ? <p className="text-ink-muted text-center py-6">لم تنشر إعلانات بعد.</p> : (
          <ul className="space-y-2">
            {items.map((ann) => {
              const info = reads[ann.id]
              const isOpen = expandedId === ann.id
              const isPickerOpen = pickerOpenId === ann.id
              const annReactions = reactions.filter((r) => r.announcement_id === ann.id)

              return (
                <li key={ann.id} className="rounded-xl border-2 border-light-blue transition-all duration-300">
                  <button className="w-full p-4 text-start hover:bg-bg/50 transition-colors" onClick={(e) => { e.stopPropagation(); void toggleExpand(ann.id) }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-ink">{ann.title}</span>
                      {!isOpen && annReactions.length > 0 && (
                        <span className="text-xs font-bold text-ink-muted">· {annReactions.length} تفاعل</span>
                      )}
                      <span className="ms-auto text-xs text-ink-muted font-medium">{timeAgo(ann.created_at)}</span>
                      {info && <span className="rounded-lg bg-secondary-soft px-2.5 py-1 text-xs font-bold text-secondary shadow-sm">قرأه {info.readers.length} من {info.total}</span>}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-light-blue p-4 space-y-3 bg-bg/30">
                      <div
                        onClick={(e) => { e.stopPropagation(); setPickerOpenId(isPickerOpen ? null : ann.id) }}
                        className="cursor-pointer whitespace-pre-wrap rounded-xl bg-white shadow-sm border border-light-blue p-4 text-sm leading-relaxed text-ink hover:bg-primary-soft/10 transition-colors"
                        title="اضغط لإضافة تفاعل"
                      >
                        {ann.body}
                      </div>

                      <ReactionBar
                        reactions={annReactions}
                        meId={meId}
                        heading="تفاعلات الإعلان:"
                        pickerOpen={isPickerOpen}
                        onTogglePicker={() => setPickerOpenId(isPickerOpen ? null : ann.id)}
                        onClosePicker={() => setPickerOpenId(null)}
                        onToggle={(emoji) => void toggle(ann.id, emoji)}
                      />

                      {info && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4" onClick={(e) => e.stopPropagation()}>
                          <div className="rounded-xl border border-secondary/30 bg-secondary-soft/30 p-4 shadow-sm">
                            <div className="mb-2 text-sm font-bold text-secondary flex items-center gap-1"><span>✅</span> قرأوا ({info.readers.length})</div>
                            {info.readers.length === 0 ? <p className="text-xs text-ink-muted">لا أحد بعد.</p> : (
                              <ul className="space-y-1.5 text-sm">{info.readers.map((r, i) => <li key={i} className="flex justify-between font-medium"><span>{r.name}</span><span className="text-xs text-ink-muted">{timeAgo(r.read_at)}</span></li>)}</ul>
                            )}
                          </div>
                          <div className="rounded-xl border border-warning bg-warning-soft/40 p-4 shadow-sm">
                            <div className="mb-2 text-sm font-bold text-ink flex items-center gap-1"><span>⏳</span> لم يقرأوا ({info.nonReaders.length})</div>
                            {info.nonReaders.length === 0 ? <p className="text-xs text-ink-muted">الجميع قرأ.</p> : (
                              <ul className="space-y-1.5 text-sm">{info.nonReaders.map((n, i) => <li key={i} className="font-medium">{n}</li>)}</ul>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}

// ============================== CHAT ==============================
function DirectChat({ meId, themId, themName, myRole, onSent }: {
  meId: string
  themId: string
  themName: string
  myRole: 'student' | 'teacher'
  onSent?: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [reactions, setReactions] = useState<MessageReaction[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [pickerOpenId, setPickerOpenId] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    const { data, error: err } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${meId},recipient_id.eq.${themId}),and(sender_id.eq.${themId},recipient_id.eq.${meId})`)
      .order('created_at', { ascending: true })

    if (err) { setError(err.message); return }
    const msgs = (data ?? []) as Message[]
    setMessages(msgs)

    if (msgs.length > 0) {
      const mIds = msgs.map(m => m.id)
      const { data: reacts } = await supabase.from('message_reactions').select('*').in('message_id', mIds)
      setReactions((reacts ?? []) as MessageReaction[])
    } else {
      setReactions([])
    }

    await supabase
      .from('messages')
      .update({ read_at: new Date().toISOString() })
      .eq('recipient_id', meId)
      .eq('sender_id', themId)
      .is('read_at', null)
  }, [meId, themId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!supabase) return
    const ch = supabase.channel(`chat-${meId}-${themId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { void load() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => { void load() })
      .subscribe()
    return () => { void supabase!.removeChannel(ch) }
  }, [meId, themId, load])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  async function send() {
    if (!supabase || !text.trim()) return
    setBusy(true); setError(null)
    const { error: err } = await supabase.from('messages').insert({ sender_id: meId, recipient_id: themId, body: text.trim() })
    setBusy(false)
    if (err) { setError(err.message); return }
    setText('')
    await load()
    onSent?.()
  }

  async function toggleReaction(messageId: string, emoji: string) {
    if (!supabase) return
    const existing = reactions.find(r => r.message_id === messageId && r.user_id === meId && r.emoji === emoji)

    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id)
      setReactions(prev => prev.filter(r => r.id !== existing.id))
    } else {
      const { data, error } = await supabase.from('message_reactions').insert({ message_id: messageId, user_id: meId, emoji }).select().single()
      if (!error && data) {
        const row = data as MessageReaction
        // منع التكرار إن كان حدث الـ realtime قد أضافه قبل رجوع الـ insert
        setReactions(prev => (prev.some(r => r.id === row.id) ? prev : [...prev, row]))
      }
    }
  }

  return (
    <section className={card}>
      <h3 className="text-lg font-bold text-primary mb-3">محادثة مع {myRole === 'student' ? 'الأستاذ' : themName}</h3>
      <div
        className="max-h-[500px] overflow-y-auto rounded-xl border-2 border-light-blue bg-bg/50 p-4 space-y-6 relative"
        onClick={() => setPickerOpenId(null)}
      >
        {messages.length === 0 ? (
          <p className="text-center text-ink-muted py-8 font-medium">لا رسائل بعد. ابدأ المحادثة أدناه.</p>
        ) : messages.map((m) => {
          const mine = m.sender_id === meId
          const msgReactions = reactions.filter(r => r.message_id === m.id)
          const isPickerOpen = pickerOpenId === m.id

          const groupedReacts = msgReactions.reduce((acc, r) => {
            acc[r.emoji] = (acc[r.emoji] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          const hasReactions = Object.keys(groupedReacts).length > 0

          return (
            <div key={m.id} className={'group relative flex flex-col ' + (mine ? 'items-start' : 'items-end')}>

              <div className="relative">
                {isPickerOpen && (
                  <div
                    className={`absolute z-30 bottom-full mb-2 flex w-[280px] flex-wrap justify-center gap-1.5 rounded-2xl bg-white p-2.5 shadow-2xl border border-light-blue transition-all ${mine ? 'right-0 origin-bottom-right' : 'left-0 origin-bottom-left'}`}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {TOP_EMOJIS.map(({ char, name }) => (
                      <button
                        key={char}
                        onClick={(e) => { e.stopPropagation(); void toggleReaction(m.id, char); setPickerOpenId(null) }}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition-transform hover:scale-125 hover:bg-primary-soft active:scale-90"
                        title={name}
                      >
                        {char}
                      </button>
                    ))}
                  </div>
                )}

                <div
                  onClick={(e) => { e.stopPropagation(); setPickerOpenId(isPickerOpen ? null : m.id) }}
                  className={'cursor-pointer relative max-w-full sm:max-w-[85%] px-4 py-3 shadow-sm transition-transform active:scale-[0.98] ' + (mine ? 'rounded-2xl rounded-tr-sm bg-primary text-white hover:bg-primary-hover' : 'rounded-2xl rounded-tl-sm bg-white border border-light-blue text-ink hover:bg-bg')}
                  title="اضغط لإضافة تفاعل"
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</div>
                  <div className={'mt-1.5 flex items-center justify-end gap-1.5 text-[10px] font-medium ' + (mine ? 'text-white/80' : 'text-ink-muted')}>
                    <span>{timeAgo(m.created_at)}</span>
                    {mine && m.read_at && <span>✓✓</span>}
                  </div>
                </div>
              </div>

              {hasReactions && (
                <div className={`mt-1.5 flex flex-wrap gap-1.5 px-1 ${mine ? 'justify-start' : 'justify-end'}`}>
                  {Object.entries(groupedReacts).map(([char, count]) => {
                    const isMine = msgReactions.some(r => r.user_id === meId && r.emoji === char)
                    return (
                      <button
                        key={char}
                        onClick={(e) => { e.stopPropagation(); void toggleReaction(m.id, char) }}
                        className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold transition-transform hover:scale-105 active:scale-95 ${isMine ? 'border-primary/40 bg-primary-soft text-primary shadow-sm' : 'border-light-blue bg-white text-ink shadow-sm hover:border-primary/50'}`}
                      >
                        <span>{char}</span>
                        <span>{count}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      {error && <p className="mt-3 rounded-xl bg-error-soft p-3 text-error text-sm font-semibold">{error}</p>}
      <div className="mt-4 flex gap-2">
        <textarea
          className={input + ' mt-0 flex-1 resize-none'}
          rows={2}
          placeholder="اكتب رسالتك..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
        />
        <button className={btn + ' px-6'} onClick={() => void send()} disabled={busy || !text.trim()}>
          {busy ? '...' : 'إرسال'}
        </button>
      </div>
    </section>
  )
}