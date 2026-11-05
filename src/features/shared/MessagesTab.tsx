import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../app/auth-context'
import { supabase } from '../../lib/supabase'
import type { Announcement, AnnouncementRead, Message, MessageReaction, UserBrief } from '../../types'
import { useUnreadMessages } from './useUnreadMessages'

interface AnnouncementReaction {
  id: string
  announcement_id: string
  student_id: string
  emoji: string
  created_at: string
}

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const input = 'w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent/40'
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
  { char: '😓', name: 'صعب / تعبت' },
]

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return 'الآن'
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} د`
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} س`
  if (diff < 604800) return `قبل ${Math.floor(diff / 86400)} ي`
  return new Date(iso).toLocaleDateString('ar-SA-u-nu-latn')
}

function ConnectionBanner({
  status,
  lastError,
  onRetry,
}: {
  status: 'connecting' | 'connected' | 'error'
  lastError: string | null
  onRetry: () => void
}) {
  if (status === 'connected') return null
  return (
    <div
      className={
        'mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl p-3 text-sm font-semibold ' +
        (status === 'error'
          ? 'bg-error-soft text-error ring-1 ring-error/30'
          : 'bg-warning-soft text-ink ring-1 ring-warning')
      }
    >
      <div className="flex items-center gap-2">
        <span
          className={
            'inline-block h-2 w-2 rounded-full ' +
            (status === 'error' ? 'bg-error animate-pulse' : 'bg-warning')
          }
        />
        <span>{status === 'error' ? '⚠️ تعذّر الاتصال بالخادم' : '⏳ جارٍ الاتصال...'}</span>
        {lastError && <span className="text-xs font-normal opacity-80"> — {lastError}</span>}
      </div>
      {status === 'error' && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-error ring-1 ring-error/30 hover:bg-error-soft"
        >
          🔄 إعادة المحاولة
        </button>
      )}
    </div>
  )
}

export default function MessagesTab() {
  const { profile } = useAuth()
  if (!profile) return null
  return profile.role === 'teacher' ? <TeacherView /> : <StudentView />
}

// ═══════════════════════════════════════════════════════════════
// Shared: useAnnouncementReactions (مع Realtime + معالجة أخطاء)
// ═══════════════════════════════════════════════════════════════
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
    if (ids.length === 0) {
      setReactions([])
      return
    }
    try {
      const { data, error: err } = await supabase
        .from('announcement_reactions')
        .select('*')
        .in('announcement_id', ids)
      if (err) {
        setError('تعذّر جلب التفاعلات: ' + err.message)
        return
      }
      setReactions((data ?? []) as AnnouncementReaction[])
      setError(null)
    } catch (e: unknown) {
      setError(String(e))
    }
  }, [idsKey])

  useEffect(() => {
    void fetchReactions()
  }, [fetchReactions])

  useEffect(() => {
    if (!supabase) return
    const ch = supabase
      .channel('ann-reacts-' + Math.random().toString(36).slice(2))
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcement_reactions' },
        (payload: { new?: unknown }) => {
          const row = payload.new as AnnouncementReaction | undefined
          if (!row?.id || !idsRef.current.has(row.announcement_id)) return
          setReactions((prev) => (prev.some((r) => r.id === row.id) ? prev : [...prev, row]))
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'announcement_reactions' },
        (payload: { old?: unknown }) => {
          const old = payload.old as Partial<AnnouncementReaction> | undefined
          if (!old?.id) return
          setReactions((prev) => prev.filter((r) => r.id !== old.id))
        },
      )
      .subscribe()
    return () => {
      void supabase!.removeChannel(ch)
    }
  }, [])

  const toggle = useCallback(
    async (announcementId: string, emoji: string) => {
      if (!supabase || !userId) return
      setError(null)
      const existing = reactionsRef.current.find(
        (r) => r.announcement_id === announcementId && r.student_id === userId && r.emoji === emoji,
      )

      try {
        if (existing) {
          setReactions((prev) => prev.filter((r) => r.id !== existing.id))
          const { error: err } = await supabase
            .from('announcement_reactions')
            .delete()
            .eq('id', existing.id)
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
            if (err.code === '23505') {
              await fetchReactions()
              return
            }
            setError('تعذّر حفظ التفاعل: ' + err.message)
            return
          }
          if (data) {
            const row = data as AnnouncementReaction
            setReactions((prev) => (prev.some((r) => r.id === row.id) ? prev : [...prev, row]))
          }
        }
      } catch (e: unknown) {
        setError(String(e))
      }
    },
    [userId, fetchReactions],
  )

  return { reactions, toggle, error, clearError: () => setError(null) }
}

function ReactionBar({
  reactions,
  meId,
  pickerOpen,
  onTogglePicker,
  onClosePicker,
  onToggle,
  heading,
}: {
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
            className={`flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-bold transition-transform hover:scale-105 active:scale-95 ${
              mine
                ? 'border-primary/40 bg-primary-soft text-primary shadow-sm'
                : 'border-light-blue bg-white text-ink shadow-sm hover:border-primary/50'
            }`}
          >
            <span>{char}</span>
            <span>{count}</span>
          </button>
        ))}
        <button
          type="button"
          onClick={onTogglePicker}
          aria-expanded={pickerOpen}
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
              onClick={() => {
                onToggle(char)
                onClosePicker()
              }}
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

// ═══════════════════════════════════════════════════════════════
// STUDENT VIEW
// ═══════════════════════════════════════════════════════════════
function StudentView() {
  const { profile } = useAuth()
  const { counts, status, lastError, refresh: refreshCounts } = useUnreadMessages()
  const profileId = profile?.id
  const [teacher, setTeacher] = useState<UserBrief | null>(null)
  const [teacherErr, setTeacherErr] = useState<string | null>(null)
  const [loadingTeacher, setLoadingTeacher] = useState(true)
  const [view, setView] = useState<'announcements' | 'chat'>('chat')
  const prevAnnCountRef = useRef(0)

  // فتح تبويب الإعلانات تلقائياً عند وجود إعلانات غير مقروءة جديدة
  useEffect(() => {
    if (counts.announcementCount > 0 && counts.announcementCount > prevAnnCountRef.current) {
      setView('announcements')
    }
    prevAnnCountRef.current = counts.announcementCount
  }, [counts.announcementCount])

  const loadTeacherAcc = useCallback(async () => {
    if (!supabase || !profileId) return
    setLoadingTeacher(true)
    setTeacherErr(null)
    try {
      const { data, error: err } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'teacher')
        .eq('active', true)
        .limit(1)
        .maybeSingle()

      if (err) {
        setTeacherErr(err.message)
        setTeacher(null)
      } else {
        setTeacher(data as UserBrief | null)
      }
    } catch (e: unknown) {
      setTeacherErr(String(e))
    } finally {
      setLoadingTeacher(false)
    }
  }, [profileId])

  useEffect(() => {
    void loadTeacherAcc()
  }, [loadTeacherAcc])

  if (!profile) return null

  return (
    <div className="space-y-4">
      <ConnectionBanner status={status} lastError={lastError} onRetry={() => void refreshCounts()} />

      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">مراسلة الأستاذ</h2>
        <p className="mt-1 text-base text-white/85">
          هنا يمكنك إرسال رسالة للأستاذ تشرح ما تريده، وسيجيبك هنا. الرسائل خاصة، يراها الأستاذ فقط. كما تجد الإعلانات الموجهة لكل الطلاب.
        </p>
      </section>

      <div className="inline-flex rounded-xl border border-light-blue bg-white p-1 shadow-sm">
        <button
          type="button"
          className={
            (view === 'chat' ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary-soft') +
            ' relative rounded-lg px-4 py-2 text-sm font-semibold transition-all'
          }
          onClick={() => setView('chat')}
        >
          💬 محادثتي
          {counts.directCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
              {counts.directCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className={
            (view === 'announcements'
              ? 'bg-primary text-white shadow-sm'
              : 'text-primary hover:bg-primary-soft') +
            ' relative rounded-lg px-4 py-2 text-sm font-semibold transition-all'
          }
          onClick={() => setView('announcements')}
        >
          📢 الإعلانات
          {counts.announcementCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
              {counts.announcementCount}
            </span>
          )}
        </button>
      </div>

      {view === 'announcements' && <StudentAnnouncements onChanged={() => void refreshCounts()} />}

      {view === 'chat' && loadingTeacher && (
        <section className={card}>
          <p className="text-ink-muted font-medium text-center py-6">⏳ جارٍ تجهيز المحادثة...</p>
        </section>
      )}

      {view === 'chat' && !loadingTeacher && teacherErr && (
        <section className={card}>
          <p className="mb-3 rounded-xl bg-error-soft p-3 text-error text-sm font-semibold">⚠️ {teacherErr}</p>
          <button type="button" onClick={() => void loadTeacherAcc()} className={btn}>
            🔄 إعادة المحاولة
          </button>
        </section>
      )}

      {view === 'chat' && !loadingTeacher && !teacherErr && teacher && (
        <DirectChat
          meId={profile.id}
          themId={teacher.id}
          themName={teacher.full_name}
          myRole="student"
          onReadOrSent={() => void refreshCounts()}
        />
      )}

      {view === 'chat' && !loadingTeacher && !teacherErr && !teacher && (
        <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-warning bg-warning-soft p-5 text-ink shadow-sm">
          <div>
            <h4 className="text-lg font-bold text-warning-dark">تعذّر جلب حساب الأستاذ مؤقتاً</h4>
            <p className="text-sm font-medium mt-1">
              قد يكون الاتصال بطيئاً أو لم تكتمل مصادقة الدخول بعد.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadTeacherAcc()}
            className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-warning shadow hover:bg-bg transition-all"
          >
            🔄 إعادة البحث
          </button>
        </div>
      )}
    </div>
  )
}

function StudentAnnouncements({ onChanged }: { onChanged: () => void }) {
  const { profile } = useAuth()
  const profileId = profile?.id
  const [items, setItems] = useState<Announcement[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [openId, setOpenId] = useState<string | null>(null)
  const [pickerOpenId, setPickerOpenId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { reactions, toggle, error: reactError, clearError } = useAnnouncementReactions(
    items.map((a) => a.id),
    profileId,
  )

  const load = useCallback(async () => {
    if (!supabase || !profileId) return
    setLoading(true)
    setError(null)
    try {
      const [aRes, rRes] = await Promise.all([
        supabase
          .from('announcements')
          .select('*')
          .eq('is_deleted', false)
          .order('created_at', { ascending: false }),
        supabase.from('announcement_reads').select('announcement_id').eq('student_id', profileId),
      ])

      if (aRes.error) {
        setError(aRes.error.message)
        return
      }
      if (rRes.error) {
        setError(rRes.error.message)
        return
      }

      setItems((aRes.data ?? []) as Announcement[])
      setReadIds(
        new Set(((rRes.data ?? []) as { announcement_id: string }[]).map((r) => r.announcement_id)),
      )
    } catch (e: unknown) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [profileId])

  useEffect(() => {
    void load()
  }, [load])

  async function open(ann: Announcement) {
    setOpenId(openId === ann.id ? null : ann.id)
    setPickerOpenId(null)
    if (!readIds.has(ann.id) && supabase && profileId) {
      try {
        const { error: err } = await supabase
          .from('announcement_reads')
          .insert({ announcement_id: ann.id, student_id: profileId })
        if (!err || err.code === '23505') {
          setReadIds((prev) => new Set([...prev, ann.id]))
          onChanged()
        }
      } catch {
        // تجاهل الخطأ العابر؛ سيُعاد التحديث في الدورة القادمة
      }
    }
  }

  if (loading) {
    return (
      <section className={card}>
        <p className="text-ink-muted text-center py-6">⏳ جارٍ تحميل الإعلانات...</p>
      </section>
    )
  }

  if (error) {
    return (
      <section className={card}>
        <p className="mb-3 rounded-xl bg-error-soft p-3 text-error text-sm font-semibold">⚠️ {error}</p>
        <button type="button" onClick={() => void load()} className={btn}>
          🔄 إعادة المحاولة
        </button>
      </section>
    )
  }

  if (items.length === 0) {
    return (
      <section className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-primary">📢 الإعلانات (0)</h3>
          <button type="button" onClick={() => void load()} className={btnOutline}>
            🔄 تحديث
          </button>
        </div>
        <p className="text-ink-muted text-center py-6">لا توجد إعلانات بعد.</p>
      </section>
    )
  }

  return (
    <section className={card} onClick={() => setPickerOpenId(null)}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-primary">📢 الإعلانات ({items.length})</h3>
        <button type="button" onClick={() => void load()} className={btnOutline}>
          🔄 تحديث
        </button>
      </div>

      {reactError && (
        <p className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-error-soft p-2 text-sm font-semibold text-error">
          <span>⚠️ {reactError}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              clearError()
            }}
            className="px-2"
          >
            ✕
          </button>
        </p>
      )}

      <ul className="space-y-3">
        {items.map((ann) => {
          const isNew = !readIds.has(ann.id)
          const isOpen = openId === ann.id
          const annReactions = reactions.filter((r) => r.announcement_id === ann.id)
          const isPickerOpen = pickerOpenId === ann.id

          return (
            <li
              key={ann.id}
              className={
                'rounded-xl border-2 transition-all duration-300 ' +
                (isNew ? 'border-error bg-error-soft/20' : 'border-light-blue')
              }
            >
              <button
                type="button"
                className="w-full text-start p-4 hover:bg-bg/50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation()
                  void open(ann)
                }}
              >
                <div className="flex items-center gap-2">
                  {isNew && (
                    <span className="rounded-full bg-error px-2 py-0.5 text-xs font-bold text-white shadow-sm">
                      جديد
                    </span>
                  )}
                  <span className="text-base font-bold text-ink">{ann.title}</span>
                  {!isOpen && annReactions.length > 0 && (
                    <span className="text-xs font-bold text-ink-muted">· {annReactions.length} تفاعل</span>
                  )}
                  <span className="ms-auto text-xs text-ink-muted font-medium">
                    {timeAgo(ann.created_at)}
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-light-blue p-4 space-y-3 bg-bg/30">
                  <div className="whitespace-pre-wrap rounded-xl bg-white shadow-sm border border-light-blue p-4 text-sm leading-relaxed text-ink">
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

// ═══════════════════════════════════════════════════════════════
// TEACHER VIEW
// ═══════════════════════════════════════════════════════════════
function TeacherView() {
  const { profile } = useAuth()
  const { counts, status, lastError, refresh: refreshCounts } = useUnreadMessages()
  const [view, setView] = useState<'announcements' | 'conversations'>('conversations')

  if (!profile) return null

  return (
    <div className="space-y-4">
      <ConnectionBanner status={status} lastError={lastError} onRetry={() => void refreshCounts()} />

      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">مراسلة الطلاب</h2>
        <p className="mt-1 text-base text-white/85">
          أرسل إعلاناً لكل الطلاب، أو راسل طالباً بعينه. تابع من قرأ إعلاناتك.
        </p>
      </section>

      <div className="inline-flex rounded-xl border border-light-blue bg-white p-1 shadow-sm">
        <button
          type="button"
          className={
            (view === 'conversations'
              ? 'bg-primary text-white shadow-sm'
              : 'text-primary hover:bg-primary-soft') +
            ' relative rounded-lg px-4 py-2 text-sm font-semibold transition-all'
          }
          onClick={() => setView('conversations')}
        >
          💬 محادثات الطلاب
          {counts.directCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
              {counts.directCount}
            </span>
          )}
        </button>
        <button
          type="button"
          className={
            (view === 'announcements'
              ? 'bg-primary text-white shadow-sm'
              : 'text-primary hover:bg-primary-soft') +
            ' rounded-lg px-4 py-2 text-sm font-semibold transition-all'
          }
          onClick={() => setView('announcements')}
        >
          📢 الإعلانات
        </button>
      </div>

      {view === 'conversations' && (
        <TeacherConversations meId={profile.id} onChanged={() => void refreshCounts()} />
      )}
      {view === 'announcements' && <TeacherAnnouncements meId={profile.id} />}
    </div>
  )
}

function TeacherConversations({ meId, onChanged }: { meId: string; onChanged: () => void }) {
  const [students, setStudents] = useState<UserBrief[]>([])
  const [selected, setSelected] = useState<UserBrief | null>(null)
  const [unreadByStudent, setUnreadByStudent] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    setError(null)

    try {
      const [mRes, allMsgs] = await Promise.all([
        supabase
          .from('messages')
          .select('sender_id')
          .eq('recipient_id', meId)
          .is('read_at', null)
          .eq('is_deleted', false),
        supabase
          .from('messages')
          .select('sender_id, recipient_id')
          .or(`sender_id.eq.${meId},recipient_id.eq.${meId}`)
          .eq('is_deleted', false),
      ])

      if (mRes.error) {
        setError(mRes.error.message)
        return
      }
      if (allMsgs.error) {
        setError(allMsgs.error.message)
        return
      }

      const counts: Record<string, number> = {}
      for (const row of (mRes.data ?? []) as { sender_id: string }[]) {
        counts[row.sender_id] = (counts[row.sender_id] ?? 0) + 1
      }
      setUnreadByStudent(counts)

      const interactedIds = new Set<string>()
      for (const m of (allMsgs.data ?? []) as { sender_id: string; recipient_id: string }[]) {
        if (m.sender_id !== meId) interactedIds.add(m.sender_id)
        if (m.recipient_id !== meId) interactedIds.add(m.recipient_id)
      }

      if (search.trim()) {
        const sRes = await supabase
          .from('profiles')
          .select('id, full_name, student_no')
          .eq('role', 'student')
          .eq('active', true)
          .or(`full_name.ilike.%${search.trim()}%,student_no.ilike.%${search.trim()}%`)
          .order('full_name')
        if (sRes.error) setError(sRes.error.message)
        else setStudents((sRes.data ?? []) as UserBrief[])
      } else if (interactedIds.size > 0) {
        const sRes = await supabase
          .from('profiles')
          .select('id, full_name, student_no')
          .in('id', Array.from(interactedIds))
          .order('full_name')
        if (sRes.error) setError(sRes.error.message)
        else setStudents((sRes.data ?? []) as UserBrief[])
      } else {
        setStudents([])
      }
    } catch (e: unknown) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [meId, search])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!supabase) return
    const ch = supabase
      .channel('teacher-conv-' + meId)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${meId}` },
        () => {
          void load()
        },
      )
      .subscribe()
    return () => {
      void supabase!.removeChannel(ch)
    }
  }, [meId, load])

  if (selected) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          className={btnOutline}
          onClick={() => {
            setSelected(null)
            void load()
            onChanged()
          }}
        >
          ← رجوع للقائمة
        </button>
        <DirectChat
          meId={meId}
          themId={selected.id}
          themName={selected.full_name + (selected.student_no ? ` (${selected.student_no})` : '')}
          myRole="teacher"
          onReadOrSent={() => {
            void load()
            onChanged()
          }}
        />
      </div>
    )
  }

  return (
    <section className={card}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-primary">المحادثات ({students.length})</h3>
        <div className="flex items-center gap-2">
          <input
            className={input + ' max-w-xs mt-0'}
            placeholder="ابحث باسم الطالب أو رقمه لبدء محادثة..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button type="button" onClick={() => void load()} className={btnOutline}>
            🔄 تحديث
          </button>
        </div>
      </div>

      {error && (
        <p className="mb-3 rounded-xl bg-error-soft p-3 text-sm font-semibold text-error">⚠️ {error}</p>
      )}

      {loading ? (
        <p className="text-ink-muted py-4 text-center">⏳ جارٍ التحميل...</p>
      ) : students.length === 0 ? (
        <p className="text-ink-muted text-center py-6">
          {search ? 'لا طلاب مطابقون للبحث.' : 'لا توجد محادثات. ابحث باسم الطالب لبدء واحدة.'}
        </p>
      ) : (
        <ul className="space-y-2">
          {students.map((s) => {
            const n = unreadByStudent[s.id] ?? 0
            return (
              <li key={s.id}>
                <button
                  type="button"
                  className="w-full rounded-xl border-2 border-light-blue bg-white p-3 text-start hover:border-primary hover:bg-primary-soft/20 transition-all duration-200"
                  onClick={() => setSelected(s)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-base font-bold text-ink">{s.full_name}</div>
                      {s.student_no && (
                        <div className="text-xs font-mono text-ink-muted" dir="ltr">
                          {s.student_no}
                        </div>
                      )}
                    </div>
                    {n > 0 && (
                      <span className="rounded-full bg-error px-2.5 py-1 text-xs font-bold text-white shadow-sm">
                        {n} رسالة جديدة
                      </span>
                    )}
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
  const [studentNames, setStudentNames] = useState<Record<string, string>>({})
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pickerOpenId, setPickerOpenId] = useState<string | null>(null)
  const [reads, setReads] = useState<
    Record<string, { readers: { name: string; read_at: string }[]; nonReaders: string[]; total: number }>
  >({})

  const { reactions, toggle, error: reactError, clearError } = useAnnouncementReactions(
    items.map((a) => a.id),
    meId,
  )

  const load = useCallback(async () => {
    if (!supabase) return
    setError(null)
    try {
      const [aRes, pRes] = await Promise.all([
        supabase
          .from('announcements')
          .select('*')
          .eq('sender_id', meId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false }),
        supabase.from('profiles').select('id, full_name').eq('role', 'student'),
      ])

      if (aRes.error) {
        setError(aRes.error.message)
        return
      }

      const anns = (aRes.data ?? []) as Announcement[]
      setItems(anns)

      const names: Record<string, string> = {}
      for (const p of (pRes.data ?? []) as { id: string; full_name: string }[]) {
        names[p.id] = p.full_name
      }
      setStudentNames(names)
    } catch (e: unknown) {
      setError(String(e))
    }
  }, [meId])

  useEffect(() => {
    void load()
  }, [load])

  async function send() {
    if (!supabase || !title.trim() || !body.trim()) {
      setError('العنوان والنص مطلوبان.')
      return
    }
    setBusy(true)
    setError(null)
    setSuccess(null)
    try {
      const { error: insErr } = await supabase
        .from('announcements')
        .insert({ sender_id: meId, title: title.trim(), body: body.trim() })
      if (insErr) {
        setError(insErr.message)
        return
      }
      setTitle('')
      setBody('')
      setSuccess('✓ تم نشر الإعلان لكل الطلاب بنجاح.')
      await load()
    } catch (e: unknown) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function loadReads(annId: string) {
    if (!supabase) return
    try {
      const [readRes, studentsRes] = await Promise.all([
        supabase.from('announcement_reads').select('student_id, read_at').eq('announcement_id', annId),
        supabase
          .from('profiles')
          .select('id, full_name')
          .eq('role', 'student')
          .eq('active', true)
          .order('full_name'),
      ])
      if (readRes.error || studentsRes.error) return
      const loadedReads = (readRes.data ?? []) as AnnouncementRead[]
      const students = (studentsRes.data ?? []) as { id: string; full_name: string }[]
      const readIds = new Set(loadedReads.map((r) => r.student_id))
      const readers = students
        .filter((s) => readIds.has(s.id))
        .map((s) => ({
          name: s.full_name,
          read_at: loadedReads.find((r) => r.student_id === s.id)!.read_at,
        }))
      const nonReaders = students.filter((s) => !readIds.has(s.id)).map((s) => s.full_name)
      setReads((prev) => ({ ...prev, [annId]: { readers, nonReaders, total: students.length } }))
    } catch {
      // ignore
    }
  }

  async function toggleExpand(annId: string) {
    if (expandedId === annId) {
      setExpandedId(null)
      return
    }
    setExpandedId(annId)
    setPickerOpenId(null)
    await loadReads(annId)
  }

  return (
    <div className="space-y-4" onClick={() => setPickerOpenId(null)}>
      <section className={card}>
        <h3 className="text-lg font-bold text-primary mb-3">نشر إعلان جديد</h3>
        <div className="space-y-3">
          <div>
            <label className={label}>العنوان</label>
            <input
              className={input + ' mt-1'}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="عنوان الإعلان..."
            />
          </div>
          <div>
            <label className={label}>النص</label>
            <textarea
              className={input + ' mt-1'}
              rows={4}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="نص الإعلان..."
            />
          </div>
          {error && (
            <p className="rounded-lg bg-error-soft p-2 text-error text-sm font-semibold">⚠️ {error}</p>
          )}
          {success && (
            <p className="rounded-lg bg-secondary-soft p-2 text-secondary text-sm font-semibold">
              {success}
            </p>
          )}
          <button type="button" className={btn} onClick={() => void send()} disabled={busy}>
            {busy ? 'جارٍ النشر...' : '📢 نشر لكل الطلاب'}
          </button>
        </div>
      </section>

      <section className={card}>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-lg font-bold text-primary">الإعلانات المنشورة ({items.length})</h3>
          <button type="button" onClick={() => void load()} className={btnOutline}>
            🔄 تحديث
          </button>
        </div>

        {reactError && (
          <p className="mb-3 flex items-center justify-between gap-2 rounded-lg bg-error-soft p-2 text-sm font-semibold text-error">
            <span>⚠️ {reactError}</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                clearError()
              }}
              className="px-2"
            >
              ✕
            </button>
          </p>
        )}

        {items.length === 0 ? (
          <p className="text-ink-muted text-center py-6">لم تنشر إعلانات بعد.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((ann) => {
              const info = reads[ann.id]
              const isOpen = expandedId === ann.id
              const isPickerOpen = pickerOpenId === ann.id
              const annReactions = reactions.filter((r) => r.announcement_id === ann.id)

              const groupedReacts = annReactions.reduce(
                (acc, r) => {
                  acc[r.emoji] = (acc[r.emoji] || 0) + 1
                  return acc
                },
                {} as Record<string, number>,
              )
              const hasReactions = Object.keys(groupedReacts).length > 0

              return (
                <li
                  key={ann.id}
                  className="rounded-xl border-2 border-light-blue transition-all duration-300"
                >
                  <button
                    type="button"
                    className="w-full p-4 text-start hover:bg-bg/50 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation()
                      void toggleExpand(ann.id)
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-ink">{ann.title}</span>
                      {!isOpen && annReactions.length > 0 && (
                        <span className="text-xs font-bold text-ink-muted">
                          · {annReactions.length} تفاعل
                        </span>
                      )}
                      <span className="ms-auto text-xs text-ink-muted font-medium">
                        {timeAgo(ann.created_at)}
                      </span>
                      {info && (
                        <span className="rounded-lg bg-secondary-soft px-2.5 py-1 text-xs font-bold text-secondary shadow-sm">
                          قرأه {info.readers.length} من {info.total}
                        </span>
                      )}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-light-blue p-4 space-y-3 bg-bg/30">
                      <div className="whitespace-pre-wrap rounded-xl bg-white shadow-sm border border-light-blue p-4 text-sm leading-relaxed text-ink">
                        {ann.body}
                      </div>

                      <ReactionBar
                        reactions={annReactions}
                        meId={meId}
                        pickerOpen={isPickerOpen}
                        onTogglePicker={() => setPickerOpenId(isPickerOpen ? null : ann.id)}
                        onClosePicker={() => setPickerOpenId(null)}
                        onToggle={(emoji) => void toggle(ann.id, emoji)}
                      />

                      {hasReactions && (
                        <div
                          className="mt-4 rounded-xl border border-secondary/20 bg-secondary-soft/10 p-4 shadow-sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="mb-3 text-sm font-bold text-secondary flex items-center gap-1">
                            <span>✨</span> تفصيل تفاعلات الطلاب
                          </div>
                          <div className="flex flex-col gap-2.5">
                            {Object.entries(groupedReacts).map(([char]) => {
                              const reactors = annReactions
                                .filter((r) => r.emoji === char)
                                .map((r) =>
                                  r.student_id === meId ? 'أنت' : studentNames[r.student_id] || 'طالب',
                                )

                              return (
                                <div key={char} className="flex items-start gap-2.5 text-sm">
                                  <span className="flex-shrink-0 flex items-center justify-center bg-white rounded-full min-w-[2.5rem] px-2 py-0.5 border border-light-blue font-bold shadow-sm">
                                    {char}
                                  </span>
                                  <span className="text-ink-muted mt-0.5 leading-relaxed font-medium">
                                    {reactors.join('، ')}
                                  </span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {info && (
                        <div
                          className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="rounded-xl border border-secondary/30 bg-secondary-soft/30 p-4 shadow-sm">
                            <div className="mb-2 text-sm font-bold text-secondary flex items-center gap-1">
                              <span>✅</span> قرأوا ({info.readers.length})
                            </div>
                            {info.readers.length === 0 ? (
                              <p className="text-xs text-ink-muted">لا أحد بعد.</p>
                            ) : (
                              <ul className="space-y-1.5 text-sm">
                                {info.readers.map((r, i) => (
                                  <li key={i} className="flex justify-between font-medium">
                                    <span>{r.name}</span>
                                    <span className="text-xs text-ink-muted">{timeAgo(r.read_at)}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="rounded-xl border border-warning bg-warning-soft/40 p-4 shadow-sm">
                            <div className="mb-2 text-sm font-bold text-ink flex items-center gap-1">
                              <span>⏳</span> لم يقرأوا ({info.nonReaders.length})
                            </div>
                            {info.nonReaders.length === 0 ? (
                              <p className="text-xs text-ink-muted">الجميع قرأ.</p>
                            ) : (
                              <ul className="space-y-1.5 text-sm">
                                {info.nonReaders.map((n, i) => (
                                  <li key={i} className="font-medium">
                                    {n}
                                  </li>
                                ))}
                              </ul>
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

// ═══════════════════════════════════════════════════════════════
// DIRECT CHAT (محدث — بدون حلقات لا نهائية + Polling احتياطي)
// ═══════════════════════════════════════════════════════════════
function DirectChat({
  meId,
  themId,
  themName,
  myRole,
  onReadOrSent,
}: {
  meId: string
  themId: string
  themName: string
  myRole: 'student' | 'teacher'
  onReadOrSent?: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [reactions, setReactions] = useState<MessageReaction[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pickerOpenId, setPickerOpenId] = useState<string | null>(null)

  const bottomRef = useRef<HTMLDivElement>(null)
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null)
  const onReadOrSentRef = useRef(onReadOrSent)
  onReadOrSentRef.current = onReadOrSent

  const load = useCallback(async () => {
    if (!supabase) return
    try {
      const { data, error: err } = await supabase
        .from('messages')
        .select('*')
        .or(
          `and(sender_id.eq.${meId},recipient_id.eq.${themId}),and(sender_id.eq.${themId},recipient_id.eq.${meId})`,
        )
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (err) {
        setError(err.message)
        return
      }

      const msgs = (data ?? []) as Message[]
      setMessages(msgs)
      setError(null)

      if (msgs.length > 0) {
        const mIds = msgs.map((m) => m.id)
        const { data: reacts } = await supabase
          .from('message_reactions')
          .select('*')
          .in('message_id', mIds)
        setReactions((reacts ?? []) as MessageReaction[])
      } else {
        setReactions([])
      }

      // تحديث read_at فقط إذا وُجدت رسائل غير مقروءة فعلياً (لمنع الحلقة اللانهائية مع Realtime)
      const hasUnreadFromThem = msgs.some(
        (m) => m.recipient_id === meId && m.sender_id === themId && !m.read_at,
      )
      if (hasUnreadFromThem) {
        const nowIso = new Date().toISOString()
        const { error: updErr } = await supabase
          .from('messages')
          .update({ read_at: nowIso })
          .eq('recipient_id', meId)
          .eq('sender_id', themId)
          .is('read_at', null)
        if (!updErr) {
          setMessages((prev) =>
            prev.map((m) =>
              m.recipient_id === meId && m.sender_id === themId && !m.read_at
                ? { ...m, read_at: nowIso }
                : m,
            ),
          )
          onReadOrSentRef.current?.()
        }
      }
    } catch (e: unknown) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [meId, themId])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!supabase) return
    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const ch = supabase
      .channel(`chat-${meId}-${themId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        void load()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => {
        void load()
      })
      .subscribe()

    channelRef.current = ch

    // Polling احتياطي كل 10 ثوانٍ
    const timer = setInterval(() => {
      void load()
    }, 10000)

    return () => {
      clearInterval(timer)
      if (channelRef.current && supabase) {
        void supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [meId, themId, load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function send() {
    if (!supabase || !text.trim()) return
    setBusy(true)
    setError(null)
    try {
      const { error: err } = await supabase
        .from('messages')
        .insert({ sender_id: meId, recipient_id: themId, body: text.trim() })
      if (err) {
        setError(err.message)
        return
      }
      setText('')
      await load()
      onReadOrSentRef.current?.()
    } catch (e: unknown) {
      setError(String(e))
    } finally {
      setBusy(false)
    }
  }

  async function toggleReaction(messageId: string, emoji: string) {
    if (!supabase) return
    const existing = reactions.find(
      (r) => r.message_id === messageId && r.user_id === meId && r.emoji === emoji,
    )

    try {
      if (existing) {
        setReactions((prev) => prev.filter((r) => r.id !== existing.id))
        const { error: err } = await supabase.from('message_reactions').delete().eq('id', existing.id)
        if (err) {
          setError(err.message)
          void load()
        }
      } else {
        const { data, error: err } = await supabase
          .from('message_reactions')
          .insert({ message_id: messageId, user_id: meId, emoji })
          .select()
          .single()
        if (err) {
          setError(err.message)
          return
        }
        if (data) {
          const row = data as MessageReaction
          setReactions((prev) => (prev.some((r) => r.id === row.id) ? prev : [...prev, row]))
        }
      }
    } catch (e: unknown) {
      setError(String(e))
    }
  }

  return (
    <section className={card}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-primary">
          محادثة مع {myRole === 'student' ? 'الأستاذ' : themName}
        </h3>
        <button type="button" onClick={() => void load()} className={btnOutline}>
          🔄 تحديث
        </button>
      </div>

      {error && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-error-soft p-3 text-sm font-semibold text-error">
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={() => {
              setError(null)
              void load()
            }}
            className="rounded-lg bg-white px-3 py-1 text-xs font-bold text-error ring-1 ring-error/30"
          >
            🔄 إعادة المحاولة
          </button>
        </div>
      )}

      <div
        className="max-h-[500px] min-h-[200px] overflow-y-auto rounded-xl border-2 border-light-blue bg-bg/50 p-4 space-y-6 relative"
        onClick={() => setPickerOpenId(null)}
      >
        {loading ? (
          <p className="text-center text-ink-muted py-8 font-medium">⏳ جارٍ تحميل الرسائل...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-ink-muted py-8 font-medium">
            لا رسائل بعد. ابدأ المحادثة أدناه.
          </p>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === meId
            const msgReactions = reactions.filter((r) => r.message_id === m.id)
            const isPickerOpen = pickerOpenId === m.id

            const groupedReacts = msgReactions.reduce(
              (acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1
                return acc
              },
              {} as Record<string, number>,
            )

            return (
              <div
                key={m.id}
                className={'group relative flex flex-col ' + (mine ? 'items-start' : 'items-end')}
              >
                <div className="relative">
                  {isPickerOpen && (
                    <div
                      className={`absolute z-30 bottom-full mb-2 flex w-[280px] flex-wrap justify-center gap-1.5 rounded-2xl bg-white p-2.5 shadow-2xl border border-light-blue transition-all ${
                        mine ? 'right-0 origin-bottom-right' : 'left-0 origin-bottom-left'
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {TOP_EMOJIS.map(({ char, name }) => (
                        <button
                          key={char}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            void toggleReaction(m.id, char)
                            setPickerOpenId(null)
                          }}
                          className="flex h-9 w-9 items-center justify-center rounded-full text-xl transition-transform hover:scale-125 hover:bg-primary-soft active:scale-90"
                          title={name}
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                  )}

                  <div
                    className={
                      'relative max-w-full sm:max-w-[85%] px-4 py-3 shadow-sm transition-transform active:scale-[0.98] ' +
                      (mine
                        ? 'rounded-2xl rounded-tr-sm bg-primary text-white hover:bg-primary-hover'
                        : 'rounded-2xl rounded-tl-sm bg-white border border-light-blue text-ink hover:bg-bg')
                    }
                  >
                    <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</div>
                    <div
                      className={
                        'mt-1.5 flex items-center justify-end gap-1.5 text-[10px] font-medium ' +
                        (mine ? 'text-white/80' : 'text-ink-muted')
                      }
                    >
                      <span>{timeAgo(m.created_at)}</span>
                      {mine && m.read_at && <span>✓✓</span>}
                    </div>
                  </div>
                </div>

                <div className={`mt-1.5 flex flex-wrap gap-1.5 px-1 ${mine ? 'justify-start' : 'justify-end'}`}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      setPickerOpenId(isPickerOpen ? null : m.id)
                    }}
                    className="flex items-center gap-1 rounded-full border border-light-blue bg-white px-2 py-0.5 text-xs font-bold text-ink-muted shadow-sm hover:border-primary/50 hover:text-primary"
                  >
                    😊 تفاعل
                  </button>

                  {Object.entries(groupedReacts).map(([char, count]) => {
                    const isMine = msgReactions.some((r) => r.user_id === meId && r.emoji === char)
                    return (
                      <button
                        key={char}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          void toggleReaction(m.id, char)
                        }}
                        className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold transition-transform hover:scale-105 active:scale-95 ${
                          isMine
                            ? 'border-primary/40 bg-primary-soft text-primary shadow-sm'
                            : 'border-light-blue bg-white text-ink shadow-sm hover:border-primary/50'
                        }`}
                      >
                        <span>{char}</span>
                        <span>{count}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-4 flex gap-2">
        <textarea
          className={input + ' mt-0 flex-1 resize-none'}
          rows={2}
          placeholder="اكتب رسالتك..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
        />
        <button
          type="button"
          className={btn + ' px-6'}
          onClick={() => void send()}
          disabled={busy || !text.trim()}
        >
          {busy ? '...' : 'إرسال'}
        </button>
      </div>
    </section>
  )
}