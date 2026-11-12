import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../app/auth-context'
import { supabase } from '../../lib/supabase'
import type { Announcement, AnnouncementComment, Message, MessageReaction, UserBrief } from '../../types'
import { useUnreadMessages } from './useUnreadMessages'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const input = 'w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent/40'

const QUICK_EMOJIS = ['👍', '❤️', '👏', '✅', '💡', '🔥']
const MORE_EMOJIS = ['🙏', '❓', '💯', '👀', '🙌', '🤝', '😓', '🎯', '⭐', '💪']

function timeAgo(iso: string): string {
  const d = (Date.now() - new Date(iso).getTime()) / 1000
  if (d < 60) return 'الآن'
  if (d < 3600) return `قبل ${Math.floor(d / 60)} د`
  if (d < 86400) return `قبل ${Math.floor(d / 3600)} س`
  if (d < 604800) return `قبل ${Math.floor(d / 86400)} ي`
  return new Date(iso).toLocaleDateString('ar-SA-u-nu-latn')
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s
}

export default function MessagesTab() {
  const { profile } = useAuth()
  if (!profile) return null
  return profile.role === 'teacher' ? <TeacherView /> : <StudentView />
}

// ═══════════════════════════════════════════════════════════════
// STUDENT VIEW
// ═══════════════════════════════════════════════════════════════
function StudentView() {
  const { profile } = useAuth()
  const { counts, status, lastError, refresh: refreshCounts } = useUnreadMessages()
  const profileId = profile?.id
  const [teacher, setTeacher] = useState<UserBrief | null>(null)
  const [loadingTeacher, setLoadingTeacher] = useState(true)
  const [view, setView] = useState<'announcements' | 'chat'>('chat')
  const prevAnnRef = useRef(0)

  useEffect(() => {
    if (counts.announcementCount > 0 && counts.announcementCount > prevAnnRef.current) {
      setView('announcements')
    }
    prevAnnRef.current = counts.announcementCount
  }, [counts.announcementCount])

  useEffect(() => {
    if (!supabase || !profileId) return
    void (async () => {
      setLoadingTeacher(true)
      const { data } = await supabase
        .from('profiles').select('id, full_name')
        .eq('role', 'teacher').eq('active', true).limit(1).maybeSingle()
      setTeacher(data as UserBrief | null)
      setLoadingTeacher(false)
    })()
  }, [profileId])

  if (!profile) return null

  return (
    <div className="space-y-4">
      {status === 'error' && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-error-soft p-3 text-sm font-semibold text-error">
          <span>⚠️ {lastError || 'تعذّر الاتصال'}</span>
          <button onClick={() => void refreshCounts()} className="rounded-lg bg-white px-3 py-1 text-xs font-bold">🔄 إعادة</button>
        </div>
      )}

      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">مراسلة الأستاذ وإعلانات المقرر</h2>
        <p className="mt-1 text-base text-white/85">محادثة خاصة مع الأستاذ، وإعلانات مع إمكانية التفاعل والتعليق.</p>
      </section>

      <div className="inline-flex rounded-xl border border-light-blue bg-white p-1 shadow-sm">
        <button onClick={() => setView('chat')}
          className={(view === 'chat' ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary-soft') + ' relative rounded-lg px-4 py-2 text-sm font-semibold transition-all'}>
          💬 محادثتي
          {counts.directCount > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white ring-2 ring-white">{counts.directCount}</span>}
        </button>
        <button onClick={() => setView('announcements')}
          className={(view === 'announcements' ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary-soft') + ' relative rounded-lg px-4 py-2 text-sm font-semibold transition-all'}>
          📢 الإعلانات
          {counts.announcementCount > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white ring-2 ring-white">{counts.announcementCount}</span>}
        </button>
      </div>

      {view === 'announcements' && <StudentAnnouncements onChanged={() => void refreshCounts()} />}
      {view === 'chat' && loadingTeacher && <section className={card}><p className="text-center py-6 text-ink-muted">⏳ جارٍ تجهيز المحادثة...</p></section>}
      {view === 'chat' && !loadingTeacher && teacher && (
        <DirectChat meId={profile.id} themId={teacher.id} themName={teacher.full_name} onReadOrSent={() => void refreshCounts()} />
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
  const [comments, setComments] = useState<Record<string, AnnouncementComment[]>>({})
  const [namesMap, setNamesMap] = useState<Record<string, string>>({})
  const [commentTexts, setCommentTexts] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!supabase || !profileId) return
    setLoading(true)
    const [aRes, rRes, cRes] = await Promise.all([
      supabase.from('announcements').select('*').eq('is_deleted', false).order('created_at', { ascending: false }),
      supabase.from('announcement_reads').select('announcement_id').eq('student_id', profileId),
      supabase.from('announcement_comments').select('*').eq('is_deleted', false).order('created_at', { ascending: true }),
    ])
    if (!aRes.error) setItems((aRes.data ?? []) as Announcement[])
    if (!rRes.error) setReadIds(new Set(((rRes.data ?? []) as { announcement_id: string }[]).map(r => r.announcement_id)))
    
    if (!cRes.error) {
      const map: Record<string, AnnouncementComment[]> = {}
      const uids = new Set<string>()
      for (const c of (cRes.data ?? []) as AnnouncementComment[]) {
        if (!map[c.announcement_id]) map[c.announcement_id] = []
        map[c.announcement_id].push(c)
        uids.add(c.user_id)
      }
      setComments(map)
      
      if (uids.size > 0) {
        const pRes = await supabase.from('profiles').select('id, full_name').in('id', Array.from(uids))
        if (!pRes.error) {
          const nm: Record<string, string> = {}
          for (const p of (pRes.data ?? []) as { id: string; full_name: string }[]) nm[p.id] = p.full_name
          setNamesMap(nm)
        }
      }
    }
    setLoading(false)
  }, [profileId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!supabase || !profileId) return
    const ch = supabase.channel('student-ann-' + profileId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => { void load() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'announcement_comments' }, () => { void load() })
      .subscribe()
    return () => { void supabase!.removeChannel(ch) }
  }, [profileId, load])

  async function open(ann: Announcement) {
    setOpenId(openId === ann.id ? null : ann.id)
    if (!readIds.has(ann.id) && supabase && profileId) {
      await supabase.from('announcement_reads').insert({ announcement_id: ann.id, student_id: profileId })
      setReadIds(prev => new Set([...prev, ann.id]))
      onChanged()
    }
  }

  async function sendComment(annId: string) {
    const text = (commentTexts[annId] || '').trim()
    if (!supabase || !profileId || !text) return
    const { data, error } = await supabase
      .from('announcement_comments')
      .insert({ announcement_id: annId, user_id: profileId, body: text })
      .select().single()
    if (!error && data) {
      setComments(prev => ({ ...prev, [annId]: [...(prev[annId] || []), data as AnnouncementComment] }))
      setCommentTexts(prev => ({ ...prev, [annId]: '' }))
      setNamesMap(prev => ({ ...prev, [profileId]: profile?.full_name || 'أنا' }))
    }
  }

  async function deleteComment(commentId: string, annId: string) {
    if (!supabase || !window.confirm('حذف تعليقك؟')) return
    await supabase.from('announcement_comments').update({ is_deleted: true }).eq('id', commentId)
    setComments(prev => ({ ...prev, [annId]: (prev[annId] || []).filter(c => c.id !== commentId) }))
  }

  if (loading) return <section className={card}><p className="text-center py-6 text-ink-muted">⏳ جارٍ التحميل...</p></section>
  if (items.length === 0) return <section className={card}><p className="text-center py-6 text-ink-muted">لا توجد إعلانات بعد.</p></section>

  return (
    <section className={card}>
      <h3 className="text-lg font-bold text-primary mb-4">📢 الإعلانات ({items.length})</h3>
      <ul className="space-y-3">
        {items.map(ann => {
          const isNew = !readIds.has(ann.id)
          const isOpen = openId === ann.id
          const annComments = comments[ann.id] || []

          return (
            <li key={ann.id} className={'rounded-xl border-2 transition-all ' + (isNew ? 'border-error bg-error-soft/10' : 'border-light-blue')}>
              <button className="w-full text-start p-4 hover:bg-bg/50" onClick={() => void open(ann)}>
                <div className="flex items-center gap-2">
                  {isNew && <span className="rounded-full bg-error px-2 py-0.5 text-xs font-bold text-white">جديد</span>}
                  <span className="text-base font-bold text-ink">{ann.title}</span>
                  {!isOpen && annComments.length > 0 && <span className="text-xs text-ink-muted">· {annComments.length} تعليق</span>}
                  <span className="ms-auto text-xs text-ink-muted">{timeAgo(ann.created_at)}</span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-light-blue p-4 space-y-4 bg-bg/30">
                  <div className="whitespace-pre-wrap rounded-xl bg-white p-4 text-sm leading-relaxed text-ink shadow-sm">{ann.body}</div>

                  {ann.allow_comments ? (
                    <div className="space-y-3 border-t border-light-blue pt-3">
                      <h4 className="text-sm font-bold text-primary">💬 التعليقات ({annComments.length})</h4>
                      {annComments.length === 0 ? (
                        <p className="text-xs text-ink-muted">لا توجد تعليقات. كن أول من يعلّق.</p>
                      ) : (
                        <div className="space-y-2">
                          {annComments.map(c => {
                            const authorName = ann.show_commenter_names ? (namesMap[c.user_id] || 'طالب') : 'طالب مشارك'
                            return (
                              <div key={c.id} className="flex items-start justify-between rounded-xl bg-white p-3 shadow-sm border border-light-blue/50 text-sm">
                                <div className="min-w-0 flex-1">
                                  <div className="font-bold text-primary text-xs mb-1">{authorName}</div>
                                  <div className="text-ink whitespace-pre-wrap">{c.body}</div>
                                  <div className="text-[10px] text-ink-muted mt-1">{timeAgo(c.created_at)}</div>
                                </div>
                                {c.user_id === profileId && (
                                  <button onClick={() => void deleteComment(c.id, ann.id)} className="text-xs text-error hover:underline ms-2 shrink-0">حذف</button>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <input
                          className={input + ' mt-0 flex-1 text-sm'}
                          placeholder="اكتب تعليقك..."
                          value={commentTexts[ann.id] || ''}
                          onChange={e => setCommentTexts(p => ({ ...p, [ann.id]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendComment(ann.id) } }}
                        />
                        <button className={btn} onClick={() => void sendComment(ann.id)} disabled={!(commentTexts[ann.id] || '').trim()}>إرسال</button>
                      </div>
                    </div>
                  ) : (
                    <p className="rounded-lg bg-warning-soft p-3 text-xs text-ink ring-1 ring-warning">🔒 التعليقات معطّلة لهذا الإعلان.</p>
                  )}
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
      {status === 'error' && (
        <div className="flex items-center justify-between gap-2 rounded-xl bg-error-soft p-3 text-sm font-semibold text-error">
          <span>⚠️ {lastError}</span>
          <button onClick={() => void refreshCounts()} className="rounded-lg bg-white px-3 py-1 text-xs font-bold">🔄 إعادة</button>
        </div>
      )}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">لوحة المراسلة والإعلانات</h2>
        <p className="mt-1 text-base text-white/85">محادثات فردية + إعلانات جماعية مع تعليقات وإدارة كاملة.</p>
      </section>
      <div className="inline-flex rounded-xl border border-light-blue bg-white p-1 shadow-sm">
        <button onClick={() => setView('conversations')}
          className={(view === 'conversations' ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary-soft') + ' relative rounded-lg px-4 py-2 text-sm font-semibold'}>
          💬 المحادثات
          {counts.directCount > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white ring-2 ring-white">{counts.directCount}</span>}
        </button>
        <button onClick={() => setView('announcements')}
          className={(view === 'announcements' ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary-soft') + ' rounded-lg px-4 py-2 text-sm font-semibold'}>
          📢 الإعلانات والتعليقات
        </button>
      </div>
      {view === 'conversations' && <TeacherConversations meId={profile.id} onChanged={() => void refreshCounts()} />}
      {view === 'announcements' && <TeacherAnnouncements meId={profile.id} />}
    </div>
  )
}

interface ConvCard { student: UserBrief; lastMsg: Message | null; unread: number }

function TeacherConversations({ meId, onChanged }: { meId: string; onChanged: () => void }) {
  const [cards, setCards] = useState<ConvCard[]>([])
  const [selected, setSelected] = useState<UserBrief | null>(null)
  const [search, setSearch] = useState('')
  const [searchResults, setSearchResults] = useState<UserBrief[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const [msgsRes, unreadRes] = await Promise.all([
      supabase.from('messages').select('*').or(`sender_id.eq.${meId},recipient_id.eq.${meId}`).order('created_at', { ascending: false }),
      supabase.from('messages').select('sender_id').eq('recipient_id', meId).is('read_at', null).eq('is_deleted', false),
    ])

    const msgs = (msgsRes.data ?? []) as Message[]
    const unread: Record<string, number> = {}
    for (const r of (unreadRes.data ?? []) as { sender_id: string }[]) unread[r.sender_id] = (unread[r.sender_id] || 0) + 1

    const lastMsg: Record<string, Message> = {}
    for (const m of msgs) {
      const other = m.sender_id === meId ? m.recipient_id : m.sender_id
      if (!lastMsg[other] || new Date(m.created_at) > new Date(lastMsg[other].created_at)) {
        lastMsg[other] = m
      }
    }

    const ids = Object.keys(lastMsg)
    if (ids.length === 0) { setCards([]); setLoading(false); return }

    const profRes = await supabase.from('profiles').select('id, full_name, student_no').in('id', ids)
    const profMap: Record<string, UserBrief> = {}
    for (const p of (profRes.data ?? []) as UserBrief[]) profMap[p.id] = p

    const out: ConvCard[] = ids
      .filter(id => profMap[id])
      .map(id => ({ student: profMap[id], lastMsg: lastMsg[id], unread: unread[id] || 0 }))
      .sort((a, b) => new Date(b.lastMsg!.created_at).getTime() - new Date(a.lastMsg!.created_at).getTime())

    setCards(out)
    setLoading(false)
  }, [meId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!supabase) return
    const ch = supabase.channel('teacher-msg-' + meId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { void load() })
      .subscribe()
    return () => { void supabase!.removeChannel(ch) }
  }, [meId, load])

  useEffect(() => {
    if (!supabase || !search.trim()) { setSearchResults([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase!.from('profiles').select('id, full_name, student_no')
        .eq('role', 'student').eq('active', true)
        .or(`full_name.ilike.%${search.trim()}%,student_no.ilike.%${search.trim()}%`)
        .order('full_name').limit(10)
      setSearchResults((data ?? []) as UserBrief[])
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  if (selected) {
    return (
      <div className="space-y-3">
        <button className={btnOutline} onClick={() => { setSelected(null); void load(); onChanged(); }}>← رجوع للمحادثات</button>
        <DirectChat meId={meId} themId={selected.id} themName={selected.full_name} onReadOrSent={() => { void load(); onChanged(); }} />
      </div>
    )
  }

  return (
    <section className={card}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-primary">💬 المحادثات النشطة ({cards.length})</h3>
        <input className={input + ' max-w-xs mt-0'} placeholder="🔍 ابحث باسم طالب لبدء محادثة..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {search.trim() && (
        <div className="mb-4 rounded-xl border border-primary/30 bg-primary-soft/20 p-3">
          <h4 className="text-sm font-bold text-primary mb-2">بدء محادثة جديدة مع:</h4>
          {searchResults.length === 0 ? (
            <p className="text-xs text-ink-muted">لا طلاب مطابقون.</p>
          ) : (
            <ul className="space-y-1">
              {searchResults.map(s => (
                <li key={s.id}>
                  <button onClick={() => { setSelected(s); setSearch('') }} className="w-full text-start rounded-lg bg-white p-2 text-sm font-semibold hover:bg-primary-soft/40 transition">
                    {s.full_name} {s.student_no && <span className="text-xs text-ink-muted font-mono" dir="ltr">({s.student_no})</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {loading ? <p className="text-center py-6 text-ink-muted">⏳ جارٍ التحميل...</p>
        : cards.length === 0 ? <p className="text-center py-6 text-ink-muted">لا محادثات بعد. ابحث عن طالب لبدء محادثة.</p>
        : (
          <div className="grid grid-cols-1 gap-2">
            {cards.map(c => (
              <button key={c.student.id} onClick={() => setSelected(c.student)}
                className="flex items-center gap-3 rounded-xl border-2 border-light-blue bg-white p-3 text-start hover:border-primary hover:bg-primary-soft/10 transition-all shadow-sm">
                <div className={'flex h-11 w-11 shrink-0 items-center justify-center rounded-full font-bold text-white ' + (c.unread > 0 ? 'bg-error' : 'bg-primary')}>
                  {c.student.full_name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-ink truncate">{c.student.full_name}</span>
                    {c.student.student_no && <span className="text-xs font-mono text-ink-muted shrink-0" dir="ltr">{c.student.student_no}</span>}
                  </div>
                  {c.lastMsg && (
                    <div className="text-xs text-ink-muted truncate mt-0.5">
                      {c.lastMsg.sender_id === meId && <span className="text-primary font-bold">أنت: </span>}
                      {truncate(c.lastMsg.body, 50)}
                    </div>
                  )}
                </div>
                <div className="shrink-0 text-end">
                  {c.lastMsg && <div className="text-[10px] text-ink-muted">{timeAgo(c.lastMsg.created_at)}</div>}
                  {c.unread > 0 && <span className="mt-1 inline-block rounded-full bg-error px-2 py-0.5 text-[10px] font-bold text-white">{c.unread}</span>}
                </div>
              </button>
            ))}
          </div>
        )}
    </section>
  )
}

function TeacherAnnouncements({ meId }: { meId: string }) {
  const [items, setItems] = useState<Announcement[]>([])
  const [comments, setComments] = useState<Record<string, AnnouncementComment[]>>({})
  const [namesMap, setNamesMap] = useState<Record<string, string>>({})
  const [expanded, setExpanded] = useState<string | null>(null)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [allowComments, setAllowComments] = useState(true)
  const [showNames, setShowNames] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!supabase) return
    const [aRes, cRes] = await Promise.all([
      supabase.from('announcements').select('*').eq('sender_id', meId).eq('is_deleted', false).order('created_at', { ascending: false }),
      supabase.from('announcement_comments').select('*').eq('is_deleted', false).order('created_at', { ascending: true }),
    ])
    setItems((aRes.data ?? []) as Announcement[])
    const map: Record<string, AnnouncementComment[]> = {}
    const uids = new Set<string>()
    for (const c of (cRes.data ?? []) as AnnouncementComment[]) {
      if (!map[c.announcement_id]) map[c.announcement_id] = []
      map[c.announcement_id].push(c)
      uids.add(c.user_id)
    }
    setComments(map)
    if (uids.size > 0) {
      const pRes = await supabase.from('profiles').select('id, full_name').in('id', Array.from(uids))
      const nm: Record<string, string> = {}
      for (const p of (pRes.data ?? []) as { id: string; full_name: string }[]) nm[p.id] = p.full_name
      setNamesMap(nm)
    }
  }, [meId])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!supabase) return
    const ch = supabase.channel('teacher-ann-' + meId)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_comments' }, () => { void load() })
      .subscribe()
    return () => { void supabase!.removeChannel(ch) }
  }, [meId, load])

  async function send() {
    if (!supabase || !title.trim() || !body.trim()) return
    setBusy(true)
    await supabase.from('announcements').insert({
      sender_id: meId, title: title.trim(), body: body.trim(),
      allow_comments: allowComments, show_commenter_names: showNames,
    })
    setTitle(''); setBody('')
    setBusy(false)
    await load()
  }

  async function deleteAnn(id: string) {
    if (!supabase || !window.confirm('حذف هذا الإعلان وكل تعليقاته؟')) return
    await supabase.from('announcements').update({ is_deleted: true }).eq('id', id)
    await load()
  }

  async function toggleComments(ann: Announcement) {
    if (!supabase) return
    await supabase.from('announcements').update({ allow_comments: !ann.allow_comments }).eq('id', ann.id)
    await load()
  }

  async function deleteComment(commentId: string) {
    if (!supabase || !window.confirm('حذف هذا التعليق؟')) return
    await supabase.from('announcement_comments').update({ is_deleted: true }).eq('id', commentId)
    await load()
  }

  return (
    <div className="space-y-4">
      <section className={card}>
        <h3 className="text-lg font-bold text-primary mb-3">📢 نشر إعلان جديد</h3>
        <div className="space-y-3">
          <input className={input} placeholder="عنوان الإعلان..." value={title} onChange={e => setTitle(e.target.value)} />
          <textarea className={input} rows={3} placeholder="نص الإعلان..." value={body} onChange={e => setBody(e.target.value)} />
          <div className="flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink cursor-pointer">
              <input type="checkbox" checked={allowComments} onChange={e => setAllowComments(e.target.checked)} className="h-4 w-4" />
              السماح بالتعليق
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink cursor-pointer">
              <input type="checkbox" checked={showNames} onChange={e => setShowNames(e.target.checked)} className="h-4 w-4" />
              إظهار أسماء المعلّقين
            </label>
          </div>
          <button className={btn} onClick={() => void send()} disabled={busy || !title.trim() || !body.trim()}>
            {busy ? 'جارٍ النشر...' : '📢 نشر لكل الطلاب'}
          </button>
        </div>
      </section>

      <section className={card}>
        <h3 className="text-lg font-bold text-primary mb-3">الإعلانات ({items.length})</h3>
        {items.length === 0 ? <p className="text-center py-6 text-ink-muted">لم تنشر إعلانات بعد.</p> : (
          <ul className="space-y-2">
            {items.map(ann => {
              const annComments = comments[ann.id] || []
              const isOpen = expanded === ann.id
              return (
                <li key={ann.id} className="rounded-xl border-2 border-light-blue overflow-hidden">
                  <div className="flex items-center gap-2 p-3 hover:bg-bg/50">
                    <button onClick={() => setExpanded(isOpen ? null : ann.id)} className="flex-1 text-start">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-ink">{ann.title}</span>
                        {annComments.length > 0 && <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-bold text-primary">{annComments.length} تعليق</span>}
                        {!ann.allow_comments && <span className="rounded-full bg-warning-soft px-2 py-0.5 text-xs font-bold text-ink">🔒 مغلق</span>}
                        <span className="ms-auto text-xs text-ink-muted">{timeAgo(ann.created_at)}</span>
                      </div>
                    </button>
                    <button onClick={() => void toggleComments(ann)} className="rounded-lg bg-bg px-2 py-1 text-xs font-bold text-ink hover:bg-primary-soft" title="تبديل حالة التعليقات">
                      {ann.allow_comments ? '🔒' : '🔓'}
                    </button>
                    <button onClick={() => void deleteAnn(ann.id)} className="rounded-lg bg-error-soft px-2 py-1 text-xs font-bold text-error">🗑️</button>
                  </div>
                  {isOpen && (
                    <div className="border-t border-light-blue bg-bg/30 p-3 space-y-3">
                      <div className="whitespace-pre-wrap rounded-lg bg-white p-3 text-sm text-ink">{ann.body}</div>
                      {annComments.length === 0 ? (
                        <p className="text-xs text-ink-muted">لا تعليقات بعد.</p>
                      ) : (
                        <div className="space-y-2">
                          <h4 className="text-sm font-bold text-primary">💬 التعليقات ({annComments.length})</h4>
                          {annComments.map(c => (
                            <div key={c.id} className="flex items-start justify-between rounded-lg bg-white p-2 text-sm border border-light-blue/50">
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-bold text-primary mb-0.5">{namesMap[c.user_id] || 'طالب'}</div>
                                <div className="text-ink">{c.body}</div>
                                <div className="text-[10px] text-ink-muted mt-1">{timeAgo(c.created_at)}</div>
                              </div>
                              <button onClick={() => void deleteComment(c.id)} className="text-xs text-error hover:underline ms-2 shrink-0">حذف</button>
                            </div>
                          ))}
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
// DIRECT CHAT (fixed height, click-to-react, delete with confirm)
// ═══════════════════════════════════════════════════════════════
function DirectChat({ meId, themId, themName, onReadOrSent }: {
  meId: string; themId: string; themName: string; onReadOrSent?: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [reactions, setReactions] = useState<MessageReaction[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [openPicker, setOpenPicker] = useState<string | null>(null)
  const [showMore, setShowMore] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase.from('messages').select('*')
      .or(`and(sender_id.eq.${meId},recipient_id.eq.${themId}),and(sender_id.eq.${themId},recipient_id.eq.${meId})`)
      .order('created_at', { ascending: true })
    const msgs = (data ?? []) as Message[]
    setMessages(msgs)
    if (msgs.length > 0) {
      const { data: rx } = await supabase.from('message_reactions').select('*').in('message_id', msgs.map(m => m.id))
      setReactions((rx ?? []) as MessageReaction[])
    } else setReactions([])
    
    const hasUnread = msgs.some(m => m.recipient_id === meId && !m.read_at)
    if (hasUnread) {
      await supabase.from('messages').update({ read_at: new Date().toISOString() })
        .eq('recipient_id', meId).eq('sender_id', themId).is('read_at', null)
      onReadOrSent?.()
    }
    setLoading(false)
  }, [meId, themId, onReadOrSent])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    if (!supabase) return
    const ch = supabase.channel('chat-' + meId + '-' + themId)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => { void load() })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'message_reactions' }, () => { void load() })
      .subscribe()
    const poll = setInterval(() => { void load() }, 15000)
    return () => { void supabase!.removeChannel(ch); clearInterval(poll) }
  }, [meId, themId, load])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  async function send() {
    if (!supabase || !text.trim()) return
    setBusy(true)
    await supabase.from('messages').insert({ sender_id: meId, recipient_id: themId, body: text.trim() })
    setText('')
    await load()
    setBusy(false)
  }

  async function delMsg(id: string) {
    if (!supabase || !window.confirm('حذف هذه الرسالة؟')) return
    await supabase.from('messages').update({ is_deleted: true }).eq('id', id)
    await load()
  }

  async function toggleReaction(messageId: string, emoji: string) {
    if (!supabase) return
    const existing = reactions.find(r => r.message_id === messageId && r.user_id === meId && r.emoji === emoji)
    if (existing) await supabase.from('message_reactions').delete().eq('id', existing.id)
    else await supabase.from('message_reactions').insert({ message_id: messageId, user_id: meId, emoji })
    await load()
  }

  return (
    <section className={card}>
      <div className="mb-3 flex items-center justify-between border-b border-light-blue pb-3">
        <h3 className="text-lg font-bold text-primary">💬 {themName}</h3>
        <button onClick={() => void load()} className={btnOutline}>🔄 تحديث</button>
      </div>

      <div className="flex flex-col" style={{ height: '600px' }}>
        <div className="flex-1 overflow-y-auto rounded-xl border-2 border-light-blue bg-bg/50 p-3 space-y-3" onClick={() => { setOpenPicker(null); setShowMore(null) }}>
          {loading ? <p className="text-center py-8 text-ink-muted">⏳ جارٍ التحميل...</p>
            : messages.length === 0 ? <p className="text-center py-8 text-ink-muted">لا رسائل بعد. ابدأ المحادثة.</p>
            : messages.map(m => {
              const mine = m.sender_id === meId
              const msgRx = reactions.filter(r => r.message_id === m.id)
              const grouped: Record<string, number> = {}
              for (const r of msgRx) grouped[r.emoji] = (grouped[r.emoji] || 0) + 1
              const isPicker = openPicker === m.id
              const isMore = showMore === m.id

              return (
                <div key={m.id} className={'flex flex-col ' + (mine ? 'items-start' : 'items-end')}>
                  <div className="relative" onClick={e => e.stopPropagation()}>
                    {isPicker && (
                      <div className={'absolute z-30 bottom-full mb-1 rounded-2xl bg-white p-2 shadow-xl border border-light-blue ' + (mine ? 'right-0' : 'left-0')}>
                        <div className="flex gap-1 mb-1">
                          {QUICK_EMOJIS.map(e => (
                            <button key={e} onClick={() => { void toggleReaction(m.id, e); setOpenPicker(null) }} className="h-8 w-8 rounded-full text-lg hover:bg-primary-soft transition">{e}</button>
                          ))}
                        </div>
                        {isMore && (
                          <div className="flex flex-wrap gap-1 pt-1 border-t border-light-blue">
                            {MORE_EMOJIS.map(e => (
                              <button key={e} onClick={() => { void toggleReaction(m.id, e); setOpenPicker(null); setShowMore(null) }} className="h-8 w-8 rounded-full text-lg hover:bg-primary-soft transition">{e}</button>
                            ))}
                          </div>
                        )}
                        {!isMore && (
                          <button onClick={() => setShowMore(m.id)} className="w-full text-xs text-primary font-bold py-1 hover:underline">المزيد...</button>
                        )}
                      </div>
                    )}

                    <div
                      onClick={() => { setOpenPicker(isPicker ? null : m.id); setShowMore(null) }}
                      className={'relative max-w-[85%] cursor-pointer rounded-2xl px-4 py-2 shadow-sm transition-transform hover:scale-[1.01] ' + (mine ? 'rounded-tr-sm bg-primary text-white' : 'rounded-tl-sm bg-white border border-light-blue text-ink')}
                    >
                      {m.is_deleted ? (
                        <em className="opacity-70">🚫 تم حذف هذه الرسالة</em>
                      ) : (
                        <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</div>
                      )}
                      <div className={'mt-1 flex items-center justify-end gap-1 text-[10px] ' + (mine ? 'text-white/80' : 'text-ink-muted')}>
                        <span>{timeAgo(m.created_at)}</span>
                        {mine && m.read_at && <span>✓✓</span>}
                      </div>
                    </div>
                  </div>

                  <div className={`mt-1 flex flex-wrap items-center gap-1.5 px-1 ${mine ? 'justify-start' : 'justify-end'}`}>
                    {Object.entries(grouped).map(([e, count]) => {
                      const isMine = msgRx.some(r => r.user_id === meId && r.emoji === e)
                      return (
                        <button key={e} onClick={() => void toggleReaction(m.id, e)}
                          className={'rounded-full border px-2 py-0.5 text-xs font-bold transition ' + (isMine ? 'border-primary/40 bg-primary-soft text-primary' : 'border-light-blue bg-white text-ink')}>
                          {e} {count}
                        </button>
                      )
                    })}
                    {!m.is_deleted && (mine || meId) && m.sender_id === meId && (
                      <button onClick={() => void delMsg(m.id)} className="text-[10px] text-error hover:underline">حذف</button>
                    )}
                  </div>
                </div>
              )
            })
          }
          <div ref={bottomRef} />
        </div>

        <div className="mt-3 flex flex-col gap-2 flex-shrink-0">
          <div className="flex gap-2">
            <textarea
              className={input + ' mt-0 flex-1 resize-none'}
              rows={3}
              placeholder="اكتب رسالتك هنا (ملاحظاتك التفصيلية)..."
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
              maxLength={5000}
            />
            <button className={btn + ' px-6 self-end h-12'} onClick={() => void send()} disabled={busy || !text.trim()}>
              {busy ? '...' : 'إرسال'}
            </button>
          </div>
          <div className="flex justify-between items-center px-1 text-[11px] font-semibold text-ink-muted">
            <span>اضغط Enter للإرسال، و Shift+Enter لسطر جديد.</span>
            <span className={text.length > 4500 ? 'text-error font-bold' : ''}>
              {text.length} / 5000 حرف
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}