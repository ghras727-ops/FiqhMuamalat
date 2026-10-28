import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../app/auth-context'
import { supabase } from '../../lib/supabase'
import type { Announcement, AnnouncementRead, Message, MessageReaction, UserBrief } from '../../types'

interface AnnouncementReaction {
  id: string
  announcement_id: string
  student_id: string
  emoji: string
  created_at: string
}

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60 transition-all active:scale-95'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60 transition-all active:scale-95'

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

  useEffect(() => {
    const tick = () => { if (document.visibilityState === 'visible') void fetchReactions() }
    const timer = window.setInterval(tick, 10000)
    document.addEventListener('visibilitychange', tick)
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', tick) }
  }, [fetchReactions])

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
        if (err.code === '23505') { await fetchReactions(); return }
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

function ReactionBar({ reactions, meId, pickerOpen, onTogglePicker, onClosePicker, onToggle }: {
  reactions: AnnouncementReaction[]
  meId: string | undefined
  pickerOpen: boolean
  onTogglePicker: () => void
  onClosePicker: () => void
  onToggle: (emoji: string) => void
}) {
  const grouped: Record<string, { count: number; mine: boolean }> = {}
  for (const r of reactions) {
    const g = grouped[r.emoji] ?? { count: 0, mine: false }
    g.count += 1
    if (r.student_id === meId) g.mine = true
    grouped[r.emoji] = g
  }

  return (
    <div className="relative mt-2" onClick={(e) => e.stopPropagation()}>
      <div className="flex flex-wrap items-center gap-1.5">
        {Object.entries(grouped).map(([char, { count, mine }]) => (
          <button
            key={char}
            type="button"
            onClick={() => onToggle(char)}
            className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-bold transition-transform hover:scale-105 active:scale-95 ${mine ? 'border-primary/40 bg-primary-soft text-primary shadow-sm' : 'border-light-blue bg-white text-ink shadow-sm hover:border-primary/50'}`}
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
          className="flex h-7 w-7 items-center justify-center rounded-full border border-dashed border-light-blue bg-bg text-ink-muted transition-all hover:border-primary hover:bg-primary-soft hover:text-primary active:scale-95"
        >
          <span className="text-sm">+</span>
        </button>
      </div>

      {pickerOpen && (
        <div className="absolute z-20 top-full mt-2 left-0 flex w-[260px] flex-wrap justify-center gap-1.5 rounded-2xl border border-light-blue bg-white p-2 shadow-xl">
          {TOP_EMOJIS.map(({ char, name }) => (
            <button
              key={char}
              type="button"
              onClick={() => { onToggle(char); onClosePicker() }}
              className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-125 hover:bg-bg active:scale-90"
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
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-5 text-white shadow-md">
        <h2 className="text-2xl font-bold">التواصل والأخبار</h2>
        <p className="mt-1 text-sm text-white/90">
          تواصل مع أستاذك مباشرة عبر الرسائل الخاصة، أو تابع أحدث الإعلانات الجماعية هنا.
        </p>
      </section>

      <div className="flex rounded-xl border border-light-blue bg-white p-1 shadow-sm w-fit">
        <button
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all ${view === 'chat' ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary-soft'}`}
          onClick={() => setView('chat')}
        >💬 محادثتي</button>
        <button
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all ${view === 'announcements' ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary-soft'}`}
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
            <h4 className="text-sm font-bold text-warning-dark">تعذّر جلب حساب الأستاذ مؤقتاً</h4>
          </div>
          <button onClick={() => void loadTeacherAcc()} className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-warning shadow hover:bg-bg transition-all">
            🔄 إعادة المحاولة
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
      supabase.from('announcements').select('*').eq('is_deleted', false).order('created_at', { ascending: false }),
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
  if (items.length === 0) return <section className={card}><p className="text-ink-muted text-center py-6">لا توجد إعلانات منشورة بعد.</p></section>

  return (
    <section className={card} onClick={() => setPickerOpenId(null)}>
      <div className="mb-4 flex items-center justify-between border-b border-light-blue pb-3">
        <h3 className="text-lg font-bold text-primary">الإعلانات ({items.length})</h3>
      </div>

      {reactError && (
        <div className="mb-4 flex items-center justify-between rounded-lg bg-error-soft p-3 text-sm font-semibold text-error">
          <span>{reactError}</span>
          <button type="button" onClick={(e) => { e.stopPropagation(); clearError() }} className="px-2">✕</button>
        </div>
      )}

      <ul className="space-y-3">
        {items.map((ann) => {
          const isNew = !readIds.has(ann.id)
          const isOpen = openId === ann.id
          const annReactions = reactions.filter((r) => r.announcement_id === ann.id)
          const isPickerOpen = pickerOpenId === ann.id

          return (
            <li key={ann.id} className={`overflow-hidden rounded-xl border transition-all duration-200 ${isNew ? 'border-primary/40 bg-primary-soft/10' : 'border-light-blue hover:border-primary/30'} ${isOpen ? 'shadow-md' : 'shadow-sm'}`}>
              <button className="w-full text-start p-4 hover:bg-bg/50 transition-colors" onClick={(e) => { e.stopPropagation(); void open(ann) }}>
                <div className="flex items-center gap-3">
                  {isNew && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 animate-pulse"></span>}
                  <div className="flex-1 min-w-0">
                    <p className={`truncate text-sm font-bold ${isNew ? 'text-primary' : 'text-ink'}`}>{ann.title}</p>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-ink-muted font-medium">
                      <span>{timeAgo(ann.created_at)}</span>
                      {!isOpen && annReactions.length > 0 && (
                        <span className="flex items-center gap-1">
                          <span>·</span> <span>{annReactions.length} تفاعل</span>
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-light-blue transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-light-blue/50 bg-bg/20 p-4">
                  <div className="whitespace-pre-wrap text-sm leading-relaxed text-ink mb-4">
                    {ann.body}
                  </div>

                  <div className="border-t border-light-blue/30 pt-3">
                    <ReactionBar
                      reactions={annReactions}
                      meId={profileId}
                      pickerOpen={isPickerOpen}
                      onTogglePicker={() => setPickerOpenId(isPickerOpen ? null : ann.id)}
                      onClosePicker={() => setPickerOpenId(null)}
                      onToggle={(emoji) => void toggle(ann.id, emoji)}
                    />
                  </div>
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
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-5 text-white shadow-md">
        <h2 className="text-2xl font-bold">مركز التواصل</h2>
        <p className="mt-1 text-sm text-white/90">إدارة الرسائل المباشرة مع الطلاب ونشر الإعلانات الجماعية.</p>
      </section>

      <div className="flex rounded-xl border border-light-blue bg-white p-1 shadow-sm w-fit">
        <button className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all ${view === 'conversations' ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary-soft'}`} onClick={() => setView('conversations')}>💬 المحادثات</button>
        <button className={`rounded-lg px-5 py-2 text-sm font-semibold transition-all ${view === 'announcements' ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary-soft'}`} onClick={() => setView('announcements')}>📢 الإعلانات</button>
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

    const mRes = await supabase.from('messages').select('sender_id').eq('recipient_id', meId).is('read_at', null).eq('is_deleted', false)
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
      const allMsgs = await supabase.from('messages').select('sender_id, recipient_id').or(`sender_id.eq.${meId},recipient_id.eq.${meId}`).eq('is_deleted', false)
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
      <div className="space-y-4">
        <button className={btnOutline + ' flex items-center gap-2'} onClick={() => { setSelected(null); void load() }}>
          <span>←</span> <span>رجوع للقائمة</span>
        </button>
        <DirectChat meId={meId} themId={selected.id} themName={selected.full_name + (selected.student_no ? ` (${selected.student_no})` : '')} myRole="teacher" onSent={() => { void load() }} />
      </div>
    )
  }

  return (
    <section className={card}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-light-blue pb-3">
        <h3 className="text-lg font-bold text-primary">المحادثات المفتوحة ({students.length})</h3>
        <div className="relative w-full sm:w-64">
          <input
            className="w-full rounded-xl border border-light-blue bg-bg/50 py-2 ps-10 pe-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all"
            placeholder="ابحث باسم الطالب..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted opacity-50">🔍</span>
        </div>
      </div>
      
      {loading ? <p className="text-ink-muted">جارٍ التحميل...</p> : students.length === 0 ? (
        <p className="text-ink-muted text-center py-8 bg-bg/30 rounded-xl border border-dashed border-light-blue">
          {search ? 'لا طلاب مطابقون للبحث.' : 'لا توجد محادثات سابقة. استخدم البحث لبدء محادثة جديدة.'}
        </p>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {students.map((s) => {
            const n = unreadByStudent[s.id] ?? 0
            return (
              <li key={s.id}>
                <button className="w-full h-full rounded-xl border border-light-blue bg-white p-3 text-start hover:border-primary hover:shadow-md transition-all duration-200 group" onClick={() => setSelected(s)}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-soft text-primary font-bold">
                        {s.full_name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-ink group-hover:text-primary transition-colors">{s.full_name}</div>
                        {s.student_no && <div className="text-[11px] font-mono text-ink-muted" dir="ltr">{s.student_no}</div>}
                      </div>
                    </div>
                    {n > 0 && <span className="flex h-5 items-center justify-center rounded-full bg-error px-2 text-[10px] font-bold text-white shadow-sm animate-pulse">{n}</span>}
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
  
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [pickerOpenId, setPickerOpenId] = useState<string | null>(null)
  const [reads, setReads] = useState<Record<string, { readers: { name: string; read_at: string }[]; nonReaders: string[]; total: number }>>({})

  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedAnns, setSelectedAnns] = useState<Set<string>>(new Set())

  const { reactions, toggle, error: reactError, clearError } = useAnnouncementReactions(
    items.map((a) => a.id),
    meId,
  )

  const load = useCallback(async () => {
    if (!supabase) return
    const [aRes, pRes] = await Promise.all([
      supabase.from('announcements').select('*').eq('sender_id', meId).order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name').eq('role', 'student')
    ])
    
    const anns = (aRes.data ?? []) as Announcement[]
    setItems(anns)
    
    const names: Record<string, string> = {}
    for (const p of (pRes.data ?? [])) {
      names[p.id] = p.full_name
    }
    setStudentNames(names)
  }, [meId])

  useEffect(() => { void load() }, [load])

  async function send() {
    if (!supabase || !title.trim() || !body.trim()) { setError('يجب كتابة عنوان ونص للإعلان.'); return }
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
    if (isSelectionMode) { toggleSelect(annId); return }
    if (expandedId === annId) { setExpandedId(null); return }
    setExpandedId(annId)
    setPickerOpenId(null)
    if (!reads[annId]) await loadReads(annId)
  }

  const toggleSelect = (id: string) => {
    setSelectedAnns(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    const activeIds = items.filter(i => !i.is_deleted).map(i => i.id)
    setSelectedAnns(new Set(activeIds))
  }

  const deleteSelected = async () => {
    if (!supabase || selectedAnns.size === 0) return
    if (!window.confirm(`هل أنت متأكد من حذف ${selectedAnns.size} إعلان؟`)) return
    setBusy(true)
    const ids = Array.from(selectedAnns)
    const { error: err } = await supabase.from('announcements').update({ is_deleted: true }).in('id', ids)
    setBusy(false)
    if (err) { setError(err.message); return }
    setSelectedAnns(new Set())
    setIsSelectionMode(false)
    await load()
  }

  return (
    <div className="space-y-4" onClick={() => setPickerOpenId(null)}>
      <section className={card}>
        <h3 className="text-lg font-bold text-primary mb-3">نشر إعلان جديد</h3>
        <div className="space-y-3 bg-bg/30 p-4 rounded-xl border border-light-blue/50">
          <div>
            <input className="w-full rounded-lg border border-light-blue bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all font-bold text-ink" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان الإعلان..." />
          </div>
          <div>
            <textarea className="w-full rounded-lg border border-light-blue bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all resize-none text-ink" rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="اكتب تفاصيل الإعلان هنا..." />
          </div>
          {error && <p className="rounded-lg bg-error-soft p-2 text-error text-xs font-bold">{error}</p>}
          <div className="flex justify-end">
            <button className={btn + ' px-6'} onClick={() => void send()} disabled={busy || !title.trim() || !body.trim()}>
              {busy ? 'جارٍ النشر...' : '📢 نشر الإعلان'}
            </button>
          </div>
        </div>
      </section>

      <section className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4 border-b border-light-blue pb-3">
          <h3 className="text-lg font-bold text-primary">سجل الإعلانات ({items.length})</h3>
          {items.length > 0 && (
            <button onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedAnns(new Set()) }} className="text-xs font-bold text-ink-muted hover:text-primary transition-colors bg-bg px-3 py-1.5 rounded-lg border border-light-blue">
              {isSelectionMode ? 'إلغاء الإدارة' : '⚙️ إدارة الإعلانات'}
            </button>
          )}
        </div>

        {isSelectionMode && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-warning-soft/30 p-2.5 border border-warning/20 shadow-sm animate-pulse-once">
            <div className="flex items-center gap-3">
              <input type="checkbox" className="w-4 h-4 accent-error cursor-pointer ms-1" checked={selectedAnns.size > 0 && selectedAnns.size === items.filter(i => !i.is_deleted).length} onChange={(e) => e.target.checked ? selectAll() : setSelectedAnns(new Set())} />
              <span className="text-xs font-bold text-ink-muted">تحديد الكل</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-warning-dark">{selectedAnns.size} محدد</span>
              <button className="rounded-lg bg-error px-3 py-1.5 text-xs font-bold text-white hover:bg-error/90 disabled:opacity-50 transition-all" onClick={deleteSelected} disabled={selectedAnns.size === 0 || busy}>
                حذف المحدد
              </button>
            </div>
          </div>
        )}

        {reactError && (
          <div className="mb-4 flex items-center justify-between rounded-lg bg-error-soft p-3 text-sm font-semibold text-error">
            <span>{reactError}</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); clearError() }} className="px-2">✕</button>
          </div>
        )}

        {items.length === 0 ? <p className="text-ink-muted text-center py-8 bg-bg/30 rounded-xl border border-dashed border-light-blue">لم تقم بنشر أي إعلانات بعد.</p> : (
          <ul className="space-y-3">
            {items.map((ann) => {
              const info = reads[ann.id]
              const isOpen = expandedId === ann.id
              const isPickerOpen = pickerOpenId === ann.id
              const annReactions = reactions.filter((r) => r.announcement_id === ann.id)
              
              const groupedReacts = annReactions.reduce((acc, r) => {
                acc[r.emoji] = (acc[r.emoji] || 0) + 1
                return acc
              }, {} as Record<string, number>)
              
              const hasReactions = Object.keys(groupedReacts).length > 0
              const isSelected = selectedAnns.has(ann.id)

              return (
                <li key={ann.id} className={`overflow-hidden rounded-xl border transition-all duration-200 ${isSelected ? 'border-warning shadow-md' : 'border-light-blue hover:border-primary/30'} ${isOpen && !isSelectionMode ? 'shadow-md' : 'shadow-sm'} ${ann.is_deleted ? 'opacity-60 bg-bg/50' : 'bg-white'}`}>
                  
                  <div className="flex items-stretch w-full">
                    {isSelectionMode && !ann.is_deleted && (
                      <div className="flex items-center justify-center ps-4 pe-2 bg-warning-soft/10 border-e border-warning/10 cursor-pointer" onClick={() => toggleSelect(ann.id)}>
                        <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 accent-error cursor-pointer pointer-events-none" />
                      </div>
                    )}
                    
                    <button className="flex-1 text-start p-4 hover:bg-bg/30 transition-colors" onClick={(e) => { e.stopPropagation(); void toggleExpand(ann.id) }}>
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <span className={`block truncate text-sm font-bold ${ann.is_deleted ? 'text-error line-through' : 'text-ink'}`}>
                            {ann.is_deleted ? '🚫 إعلان محذوف' : ann.title}
                          </span>
                          <div className="mt-1 flex items-center gap-3 text-[11px] font-medium text-ink-muted">
                            <span>{timeAgo(ann.created_at)}</span>
                            {!isOpen && !ann.is_deleted && hasReactions && (
                              <span className="flex items-center gap-1 bg-bg px-1.5 rounded text-ink/70">
                                <span>{annReactions.length}</span><span>تفاعل</span>
                              </span>
                            )}
                          </div>
                        </div>
                        
                        {!ann.is_deleted && info && !isOpen && (
                          <div className="flex items-center self-start sm:self-auto flex-shrink-0 bg-secondary-soft/50 px-2 py-1 rounded-md border border-secondary/10">
                            <span className="text-[10px] font-bold text-secondary-dark">قراءة: {info.readers.length}/{info.total}</span>
                          </div>
                        )}
                        {!ann.is_deleted && !info && !isOpen && (
                          <span className="text-light-blue text-xs flex-shrink-0">▼ تفاصيل</span>
                        )}
                      </div>
                    </button>
                  </div>

                  {isOpen && !ann.is_deleted && !isSelectionMode && (
                    <div className="border-t border-light-blue/40 bg-bg/10 p-4">
                      <div
                        onClick={(e) => { e.stopPropagation(); setPickerOpenId(isPickerOpen ? null : ann.id) }}
                        className="cursor-pointer whitespace-pre-wrap rounded-lg bg-white border border-light-blue/50 p-4 text-sm leading-relaxed text-ink hover:border-primary/30 transition-colors"
                        title="اضغط لإضافة تفاعل"
                      >
                        {ann.body}
                      </div>

                      <div className="mt-3">
                        <ReactionBar
                          reactions={annReactions}
                          meId={meId}
                          pickerOpen={isPickerOpen}
                          onTogglePicker={() => setPickerOpenId(isPickerOpen ? null : ann.id)}
                          onClosePicker={() => setPickerOpenId(null)}
                          onToggle={(emoji) => void toggle(ann.id, emoji)}
                        />
                      </div>

                      {hasReactions && (
                        <div className="mt-4 rounded-lg bg-white border border-light-blue/40 p-3" onClick={(e) => e.stopPropagation()}>
                          <div className="mb-2 text-xs font-bold text-ink-muted border-b border-light-blue/30 pb-2">تفاصيل تفاعلات الطلاب:</div>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(groupedReacts).map(([char]) => {
                              const reactors = annReactions
                                .filter(r => r.emoji === char)
                                .map(r => r.student_id === meId ? 'أنت' : (studentNames[r.student_id] ? studentNames[r.student_id].split(' ')[0] : 'طالب'))
                              
                              return (
                                <div key={char} className="flex items-center gap-1.5 bg-bg px-2 py-1 rounded-md text-[11px] border border-light-blue/50">
                                  <span className="font-bold">{char}</span>
                                  <span className="text-ink font-medium max-w-[120px] truncate" title={reactors.join('، ')}>{reactors.join('، ')}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )}

                      {info && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3" onClick={(e) => e.stopPropagation()}>
                          <div className="rounded-lg border border-secondary/20 bg-secondary-soft/20 p-3">
                            <div className="mb-1.5 text-xs font-bold text-secondary-dark flex items-center justify-between border-b border-secondary/10 pb-1.5">
                              <span>✅ قرأوا</span>
                              <span className="bg-white rounded px-1.5 py-0.5">{info.readers.length}</span>
                            </div>
                            {info.readers.length === 0 ? <p className="text-[10px] text-ink-muted mt-2">لم يقرأه أحد بعد.</p> : (
                              <div className="max-h-24 overflow-y-auto pr-1 text-[11px] space-y-1 mt-2">
                                {info.readers.map((r, i) => <div key={i} className="flex justify-between font-medium"><span>{r.name}</span><span className="text-ink-muted">{timeAgo(r.read_at)}</span></div>)}
                              </div>
                            )}
                          </div>
                          <div className="rounded-lg border border-warning/30 bg-warning-soft/20 p-3">
                            <div className="mb-1.5 text-xs font-bold text-warning-dark flex items-center justify-between border-b border-warning/10 pb-1.5">
                              <span>⏳ بانتظار القراءة</span>
                              <span className="bg-white rounded px-1.5 py-0.5">{info.nonReaders.length}</span>
                            </div>
                            {info.nonReaders.length === 0 ? <p className="text-[10px] text-ink-muted mt-2">قرأه الجميع.</p> : (
                              <div className="max-h-24 overflow-y-auto pr-1 text-[11px] space-y-1 mt-2 text-ink/70">
                                {info.nonReaders.map((n, i) => <div key={i} className="truncate" title={n}>{n}</div>)}
                              </div>
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
  const [searchTerm, setSearchTerm] = useState('')

  const [isSelectionMode, setIsSelectionMode] = useState(false)
  const [selectedMsgs, setSelectedMsgs] = useState<Set<string>>(new Set())

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

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length, isSelectionMode])

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

  async function deleteMessage(messageId: string) {
    if (!supabase) return
    if (!window.confirm('حذف هذه الرسالة؟')) return
    
    const { error: err } = await supabase.from('messages').update({ is_deleted: true }).eq('id', messageId)
    if (err) {
      setError('تعذّر الحذف: ' + err.message)
      return
    }
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, is_deleted: true } : m))
  }

  const toggleSelect = (id: string) => {
    setSelectedMsgs(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const selectAll = () => {
    const deletable = messages.filter(m => !m.is_deleted && (m.sender_id === meId || myRole === 'teacher')).map(m => m.id)
    setSelectedMsgs(new Set(deletable))
  }

  const deleteSelected = async () => {
    if (!supabase || selectedMsgs.size === 0) return
    if (!window.confirm(`حذف ${selectedMsgs.size} رسالة؟`)) return
    setBusy(true)
    const ids = Array.from(selectedMsgs)
    const { error: err } = await supabase.from('messages').update({ is_deleted: true }).in('id', ids)
    setBusy(false)
    if (err) { setError(err.message); return }
    setSelectedMsgs(new Set())
    setIsSelectionMode(false)
    await load()
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
        setReactions(prev => (prev.some(r => r.id === data.id) ? prev : [...prev, data as MessageReaction]))
      }
    }
  }

  const displayedMessages = messages.filter(m => 
    !searchTerm.trim() || 
    (m.body && m.body.includes(searchTerm.trim()))
  )

  return (
    <section className={card}>
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-light-blue pb-3">
        <h3 className="text-lg font-bold text-primary flex items-center gap-2">
          <span>المحادثة مع</span>
          <span className="bg-bg px-2 py-0.5 rounded-md text-sm">{myRole === 'student' ? 'الأستاذ' : themName}</span>
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 sm:flex-none">
            <input
              type="text"
              className="w-full sm:w-40 rounded-lg border border-light-blue bg-bg/50 py-1.5 ps-8 pe-2 text-xs focus:border-primary focus:outline-none transition-all"
              placeholder="ابحث..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] opacity-50">🔍</span>
          </div>
          <button 
            onClick={() => { setIsSelectionMode(!isSelectionMode); setSelectedMsgs(new Set()) }} 
            className="rounded-lg border border-light-blue bg-white px-3 py-1.5 text-xs font-bold text-ink-muted hover:border-primary hover:text-primary transition-all"
          >
            {isSelectionMode ? 'إلغاء الإدارة' : '⚙️ إدارة'}
          </button>
        </div>
      </div>

      {isSelectionMode && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-warning-soft/30 p-2.5 border border-warning/20 shadow-sm animate-pulse-once">
          <div className="flex items-center gap-3">
            <input 
              type="checkbox" 
              className="w-4 h-4 accent-error cursor-pointer ms-1" 
              checked={selectedMsgs.size > 0 && selectedMsgs.size === messages.filter(m => !m.is_deleted && (m.sender_id === meId || myRole === 'teacher')).length} 
              onChange={(e) => e.target.checked ? selectAll() : setSelectedMsgs(new Set())} 
            />
            <span className="text-xs font-bold text-ink-muted">تحديد الكل</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-warning-dark">{selectedMsgs.size} محدد</span>
            <button className="rounded-lg bg-error px-3 py-1.5 text-xs font-bold text-white hover:bg-error/90 disabled:opacity-50 transition-all" onClick={deleteSelected} disabled={selectedMsgs.size === 0 || busy}>
              حذف المحدد
            </button>
          </div>
        </div>
      )}

      <div
        className="max-h-[450px] min-h-[300px] overflow-y-auto rounded-xl border border-light-blue/50 bg-bg/30 p-3 sm:p-4 space-y-4 relative shadow-inner"
        onClick={() => setPickerOpenId(null)}
      >
        {messages.length === 0 ? (
          <div className="flex h-full min-h-[250px] items-center justify-center">
            <p className="text-ink-muted/70 font-medium text-sm border border-dashed border-light-blue rounded-xl p-6 bg-white/50">ابدأ المحادثة بكتابة رسالة أدناه ✍️</p>
          </div>
        ) : displayedMessages.length === 0 ? (
          <p className="text-center text-ink-muted py-8 font-medium text-sm">لا توجد رسائل تطابق بحثك.</p>
        ) : displayedMessages.map((m) => {
          const mine = m.sender_id === meId
          const msgReactions = reactions.filter(r => r.message_id === m.id)
          const isPickerOpen = pickerOpenId === m.id
          const isSelected = selectedMsgs.has(m.id)

          const groupedReacts = msgReactions.reduce((acc, r) => {
            acc[r.emoji] = (acc[r.emoji] || 0) + 1
            return acc
          }, {} as Record<string, number>)
          const hasReactions = Object.keys(groupedReacts).length > 0

          const canDelete = !m.is_deleted && (mine || myRole === 'teacher')
          const canSelect = canDelete && isSelectionMode

          return (
            <div key={m.id} className={`group relative flex flex-col ${mine ? 'items-start' : 'items-end'} ${isSelected ? 'bg-warning-soft/20 rounded-xl p-1.5 -mx-1.5 border border-warning/20' : 'transition-colors hover:bg-white/40 rounded-xl p-1 -mx-1'}`}>

              <div className="relative max-w-full sm:max-w-[85%] flex items-start gap-2 w-full justify-start">
                
                {canSelect && (
                  <div className={`pt-2 ${mine ? 'order-first pr-2' : 'order-last pl-2'} flex-shrink-0`}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleSelect(m.id)}
                      className="w-4 h-4 accent-error cursor-pointer"
                    />
                  </div>
                )}

                <div className={`relative flex flex-col ${mine ? 'items-start' : 'items-end'} flex-1 min-w-0`}>
                  
                  {isPickerOpen && !m.is_deleted && !isSelectionMode && (
                    <div
                      className={`absolute z-30 bottom-full mb-1 flex w-[260px] flex-wrap justify-center gap-1 rounded-2xl bg-white p-2 shadow-xl border border-light-blue transition-all ${mine ? 'left-0 origin-bottom-left' : 'right-0 origin-bottom-right'}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {TOP_EMOJIS.map(({ char, name }) => (
                        <button
                          key={char}
                          onClick={(e) => { e.stopPropagation(); void toggleReaction(m.id, char); setPickerOpenId(null) }}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-lg transition-transform hover:scale-125 hover:bg-bg active:scale-90"
                          title={name}
                        >
                          {char}
                        </button>
                      ))}
                    </div>
                  )}

                  {m.is_deleted ? (
                    <div className={`px-3 py-2 text-xs italic border shadow-sm ${mine ? 'bg-bg/80 text-ink-muted border-light-blue rounded-2xl rounded-tr-sm' : 'bg-white text-ink-muted border-light-blue rounded-2xl rounded-tl-sm'}`}>
                      🚫 تم حذف هذه الرسالة
                    </div>
                  ) : (
                    <div className="group/msg relative">
                      <div
                        onClick={(e) => { 
                          e.stopPropagation();
                          if (isSelectionMode) { toggleSelect(m.id); return; }
                          setPickerOpenId(isPickerOpen ? null : m.id);
                        }}
                        className={`cursor-pointer px-3.5 py-2.5 shadow-sm transition-transform active:scale-[0.98] ${isSelected ? 'ring-2 ring-warning' : ''} ${mine ? 'rounded-2xl rounded-tr-sm bg-primary text-white hover:bg-primary-hover' : 'rounded-2xl rounded-tl-sm bg-white border border-light-blue text-ink hover:bg-bg/80'}`}
                        title={isSelectionMode ? "اضغط للتحديد" : "اضغط لإضافة تفاعل"}
                      >
                        <div className="whitespace-pre-wrap text-[13px] leading-relaxed break-words">{m.body}</div>
                      </div>

                      {canDelete && !isSelectionMode && (
                        <button
                          onClick={(e) => { e.stopPropagation(); void deleteMessage(m.id) }}
                          className={`absolute top-1/2 -translate-y-1/2 opacity-0 group-hover/msg:opacity-100 transition-opacity flex h-6 w-6 items-center justify-center rounded-full bg-white border border-error/20 text-error hover:bg-error hover:text-white shadow-sm ${mine ? '-right-8' : '-left-8'}`}
                          title="حذف سريع"
                        >
                          <span className="text-[10px]">✕</span>
                        </button>
                      )}
                    </div>
                  )}

                  <div className={`mt-0.5 flex items-center gap-1.5 px-1 text-[9px] font-medium text-ink-muted ${mine ? 'self-start' : 'self-end'}`}>
                    <span>{timeAgo(m.created_at)}</span>
                    {mine && m.read_at && !m.is_deleted && <span className="text-primary font-bold tracking-tighter">✓✓</span>}
                  </div>

                  {hasReactions && !m.is_deleted && (
                    <div className={`mt-1 flex flex-wrap gap-1 px-1 ${mine ? 'self-start' : 'self-end'}`}>
                      {Object.entries(groupedReacts).map(([char, count]) => {
                        const isMine = msgReactions.some(r => r.user_id === meId && r.emoji === char)
                        return (
                          <button
                            key={char}
                            onClick={(e) => { e.stopPropagation(); void toggleReaction(m.id, char) }}
                            className={`flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-bold transition-transform hover:scale-105 active:scale-95 ${isMine ? 'border-primary/40 bg-primary-soft text-primary shadow-sm' : 'border-light-blue bg-white text-ink shadow-sm hover:border-primary/50'}`}
                          >
                            <span>{char}</span>
                            <span>{count}</span>
                          </button>
                        )
                      })}
                    </div>
                  )}

                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      
      {error && <div className="mt-3 rounded-lg bg-error-soft p-2.5 text-error text-xs font-bold border border-error/20">{error}</div>}
      
      {!isSelectionMode && (
        <div className="mt-3 pt-3 border-t border-light-blue flex gap-2 items-end">
          <textarea
            className="w-full rounded-xl border border-light-blue bg-white p-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/20 resize-none max-h-24 min-h-[44px]"
            rows={1}
            placeholder="رسالة جديدة..."
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 96) + 'px';
            }}
            onKeyDown={(e) => { 
              if (e.key === 'Enter' && !e.shiftKey) { 
                e.preventDefault(); 
                void send();
                e.currentTarget.style.height = 'auto';
              } 
            }}
          />
          <button 
            className="rounded-xl bg-primary px-4 h-[44px] text-sm font-bold text-white hover:bg-primary-hover disabled:opacity-50 transition-all active:scale-95 flex-shrink-0" 
            onClick={() => { void send(); const ta = document.querySelector('textarea'); if(ta) ta.style.height = 'auto' }} 
            disabled={busy || !text.trim()}
          >
            {busy ? '...' : 'إرسال'}
          </button>
        </div>
      )}
    </section>
  )
}