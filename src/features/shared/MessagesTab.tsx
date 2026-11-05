import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../app/auth-context'
import { supabase } from '../../lib/supabase'
import type { Announcement, AnnouncementComment, Message, MessageReaction, UserBrief } from '../../types'
import { useUnreadMessages } from './useUnreadMessages'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const input = 'w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent/40'

const TOP_EMOJIS = ['👍', '❤️', '👏', '✅', '💡', '🔥']

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

function StudentView() {
  const { profile } = useAuth()
  const { counts, refresh: refreshCounts } = useUnreadMessages()
  const profileId = profile?.id
  const [teacher, setTeacher] = useState<UserBrief | null>(null)
  const [loadingTeacher, setLoadingTeacher] = useState(true)
  const [view, setView] = useState<'announcements' | 'chat'>('chat')
  const prevAnnCountRef = useRef(0)

  useEffect(() => {
    if (counts.announcementCount > 0 && counts.announcementCount > prevAnnCountRef.current) {
      setView('announcements')
    }
    prevAnnCountRef.current = counts.announcementCount
  }, [counts.announcementCount])

  const loadTeacherAcc = useCallback(async () => {
    if (!supabase || !profileId) return
    setLoadingTeacher(true)
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'teacher')
        .eq('active', true)
        .limit(1)
        .maybeSingle()
      setTeacher(data as UserBrief | null)
    } finally {
      setLoadingTeacher(false)
    }
  }, [profileId])

  useEffect(() => { void loadTeacherAcc() }, [loadTeacherAcc])

  if (!profile) return null

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">مراسلة الأستاذ وإعلانات المقرر</h2>
        <p className="mt-1 text-base text-white/85">تواصل بشكل خاص ومباشر مع الأستاذ، وتابع إعلانات المقرر وتفاعل معها.</p>
      </section>

      <div className="inline-flex rounded-xl border border-light-blue bg-white p-1 shadow-sm">
        <button
          type="button"
          className={(view === 'chat' ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary-soft') + ' relative rounded-lg px-4 py-2 text-sm font-semibold transition-all'}
          onClick={() => setView('chat')}
        >
          💬 محادثتي الخاصة
          {counts.directCount > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white shadow-sm ring-2 ring-white">{counts.directCount}</span>}
        </button>
        <button
          type="button"
          className={(view === 'announcements' ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary-soft') + ' relative rounded-lg px-4 py-2 text-sm font-semibold transition-all'}
          onClick={() => setView('announcements')}
        >
          📢 الإعلانات العامة
          {counts.announcementCount > 0 && <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-error text-[10px] font-bold text-white shadow-sm ring-2 ring-white">{counts.announcementCount}</span>}
        </button>
      </div>

      {view === 'announcements' && <StudentAnnouncements onChanged={() => void refreshCounts()} />}
      {view === 'chat' && loadingTeacher && <section className={card}><p className="text-center py-6">⏳ جارٍ تجهيز المحادثة...</p></section>}
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
  const [commentText, setCommentText] = useState('')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!supabase || !profileId) return
    setLoading(true)
    const [aRes, rRes, cRes] = await Promise.all([
      supabase.from('announcements').select('*').eq('is_deleted', false).order('created_at', { ascending: false }),
      supabase.from('announcement_reads').select('announcement_id').eq('student_id', profileId),
      supabase.from('announcement_comments').select('*').eq('is_deleted', false).order('created_at', { ascending: true })
    ])

    if (!aRes.error) setItems((aRes.data ?? []) as Announcement[])
    if (!rRes.error) setReadIds(new Set(((rRes.data ?? []) as { announcement_id: string }[]).map(r => r.announcement_id)))
    
    if (!cRes.error) {
      const map: Record<string, AnnouncementComment[]> = {}
      for (const c of (cRes.data ?? []) as AnnouncementComment[]) {
        if (!map[c.announcement_id]) map[c.announcement_id] = []
        map[c.announcement_id].push(c)
      }
      setComments(map)
    }
    setLoading(false)
  }, [profileId])

  useEffect(() => { void load() }, [load])

  async function open(ann: Announcement) {
    setOpenId(openId === ann.id ? null : ann.id)
    if (!readIds.has(ann.id) && supabase && profileId) {
      await supabase.from('announcement_reads').insert({ announcement_id: ann.id, student_id: profileId })
      setReadIds(prev => new Set([...prev, ann.id]))
      onChanged()
    }
  }

  async function sendComment(annId: string) {
    if (!supabase || !profileId || !commentText.trim()) return
    const { data, error } = await supabase
      .from('announcement_comments')
      .insert({ announcement_id: annId, user_id: profileId, body: commentText.trim() })
      .select()
      .single()
    if (!error && data) {
      setComments(prev => ({ ...prev, [annId]: [...(prev[annId] || []), data as AnnouncementComment] }))
      setCommentText('')
    }
  }

  async function deleteComment(commentId: string, annId: string) {
    if (!supabase) return
    await supabase.from('announcement_comments').update({ is_deleted: true }).eq('id', commentId)
    setComments(prev => ({ ...prev, [annId]: (prev[annId] || []).filter(c => c.id !== commentId) }))
  }

  if (loading) return <section className={card}><p className="text-center py-6">⏳ جارٍ التحميل...</p></section>

  return (
    <section className={card}>
      <h3 className="text-lg font-bold text-primary mb-4">📢 الإعلانات العامة ({items.length})</h3>
      <ul className="space-y-3">
        {items.map(ann => {
          const isNew = !readIds.has(ann.id)
          const isOpen = openId === ann.id
          const annComments = comments[ann.id] || []

          return (
            <li key={ann.id} className={'rounded-xl border-2 transition-all ' + (isNew ? 'border-error bg-error-soft/10' : 'border-light-blue')}>
              <button type="button" className="w-full text-start p-4 hover:bg-bg/50" onClick={() => void open(ann)}>
                <div className="flex items-center gap-2">
                  {isNew && <span className="rounded-full bg-error px-2 py-0.5 text-xs font-bold text-white">جديد</span>}
                  <span className="text-base font-bold text-ink">{ann.title}</span>
                  <span className="ms-auto text-xs text-ink-muted">{timeAgo(ann.created_at)}</span>
                </div>
              </button>

              {isOpen && (
                <div className="border-t border-light-blue p-4 space-y-4 bg-bg/30">
                  <div className="whitespace-pre-wrap rounded-xl bg-white p-4 text-sm leading-relaxed text-ink shadow-sm">{ann.body}</div>

                  {ann.allow_comments && (
                    <div className="space-y-3 border-t border-light-blue pt-3">
                      <h4 className="text-sm font-bold text-primary">💬 التعليقات والردود</h4>
                      <div className="space-y-2">
                        {annComments.map(c => (
                          <div key={c.id} className="flex items-start justify-between rounded-xl bg-white p-3 shadow-sm border border-light-blue/50 text-sm">
                            <div>
                              {ann.show_commenter_names && <div className="font-bold text-primary text-xs mb-1">طالب مشارك</div>}
                              <div className="text-ink">{c.body}</div>
                            </div>
                            {c.user_id === profileId && (
                              <button type="button" onClick={() => void deleteComment(c.id, ann.id)} className="text-xs text-error hover:underline">حذف</button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2 mt-2">
                        <input className={input + ' mt-0 flex-1 text-sm'} placeholder="اكتب تعليقك..." value={commentText} onChange={e => setCommentText(e.target.value)} />
                        <button type="button" className={btn} onClick={() => void sendComment(ann.id)}>إرسال</button>
                      </div>
                    </div>
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

function TeacherView() {
  const { profile } = useAuth()
  const { counts, refresh: refreshCounts } = useUnreadMessages()
  const [view, setView] = useState<'announcements' | 'conversations'>('conversations')

  if (!profile) return null

  return (
    <div className="space-y-4">
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">لوحة مراسلة الطلاب والإعلانات</h2>
        <p className="mt-1 text-base text-white/85">إدارة محادثات الطلاب الفردية ونشر الإعلانات العامة مع كامل خيارات التحكم والتعليقات.</p>
      </section>

      <div className="inline-flex rounded-xl border border-light-blue bg-white p-1 shadow-sm">
        <button
          type="button"
          className={(view === 'conversations' ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary-soft') + ' rounded-lg px-4 py-2 text-sm font-semibold'}
          onClick={() => setView('conversations')}
        >
          💬 محادثات الطلاب {counts.directCount > 0 && <span className="ms-1 rounded-full bg-error px-2 py-0.5 text-xs text-white">{counts.directCount}</span>}
        </button>
        <button
          type="button"
          className={(view === 'announcements' ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary-soft') + ' rounded-lg px-4 py-2 text-sm font-semibold'}
          onClick={() => setView('announcements')}
        >
          📢 إدارة الإعلانات والتعليقات
        </button>
      </div>

      {view === 'conversations' && <TeacherConversations meId={profile.id} onChanged={() => void refreshCounts()} />}
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

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const [mRes, allMsgs] = await Promise.all([
      supabase.from('messages').select('sender_id').eq('recipient_id', meId).is('read_at', null).eq('is_deleted', false),
      supabase.from('messages').select('sender_id, recipient_id').or(`sender_id.eq.${meId},recipient_id.eq.${meId}`).eq('is_deleted', false)
    ])

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

    let query = supabase.from('profiles').select('id, full_name, student_no').eq('role', 'student').eq('active', true)
    if (search.trim()) {
      query = query.or(`full_name.ilike.%${search.trim()}%,student_no.ilike.%${search.trim()}%`)
    } else if (interactedIds.size > 0) {
      query = query.in('id', Array.from(interactedIds))
    } else {
      query = query.limit(10)
    }

    const { data } = await query.order('full_name')
    setStudents((data ?? []) as UserBrief[])
    setLoading(false)
  }, [meId, search])

  useEffect(() => { void load() }, [load])

  if (selected) {
    return (
      <div className="space-y-3">
        <button type="button" className={btnOutline} onClick={() => { setSelected(null); void load(); onChanged(); }}>← رجوع لقائمة المحادثات</button>
        <DirectChat meId={meId} themId={selected.id} themName={selected.full_name} onReadOrSent={() => { void load(); onChanged(); }} />
      </div>
    )
  }

  return (
    <section className={card}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-lg font-bold text-primary">المحادثات النشطة ({students.length})</h3>
        <input className={input + ' max-w-xs mt-0'} placeholder="ابحث باسم الطالب أو رقمه..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? <p className="text-center py-6">⏳ جارٍ التحميل...</p> : students.length === 0 ? <p className="text-center py-6 text-ink-muted">لا توجد محادثات حالية.</p> : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {students.map(s => {
            const unread = unreadByStudent[s.id] ?? 0
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSelected(s)}
                className="flex items-center justify-between rounded-xl border-2 border-light-blue bg-white p-4 text-start hover:border-primary hover:bg-primary-soft/10 transition-all shadow-sm"
              >
                <div>
                  <div className="text-base font-bold text-ink">{s.full_name}</div>
                  {s.student_no && <div className="text-xs font-mono text-ink-muted" dir="ltr">{s.student_no}</div>}
                </div>
                {unread > 0 && <span className="rounded-full bg-error px-2.5 py-1 text-xs font-bold text-white shadow-sm">{unread} رسالة</span>}
              </button>
            )
          })}
        </div>
      )}
    </section>
  )
}

function TeacherAnnouncements({ meId }: { meId: string }) {
  const [items, setItems] = useState<Announcement[]>([])
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [allowComments, setAllowComments] = useState(true)
  const [showNames, setShowNames] = useState(true)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase.from('announcements').select('*').eq('sender_id', meId).eq('is_deleted', false).order('created_at', { ascending: false })
    setItems((data ?? []) as Announcement[])
  }, [meId])

  useEffect(() => { void load() }, [load])

  async function send() {
    if (!supabase || !title.trim() || !body.trim()) return
    setBusy(true)
    await supabase.from('announcements').insert({
      sender_id: meId,
      title: title.trim(),
      body: body.trim(),
      allow_comments: allowComments,
      show_commenter_names: showNames
    })
    setTitle('')
    setBody('')
    setBusy(false)
    await load()
  }

  async function deleteAnn(id: string) {
    if (!supabase) return
    await supabase.from('announcements').update({ is_deleted: true }).eq('id', id)
    await load()
  }

  return (
    <div className="space-y-4">
      <section className={card}>
        <h3 className="text-lg font-bold text-primary mb-3">نشر إعلان عام جديد</h3>
        <div className="space-y-3">
          <input className={input} placeholder="عنوان الإعلان..." value={title} onChange={e => setTitle(e.target.value)} />
          <textarea className={input} rows={3} placeholder="نص الإعلان..." value={body} onChange={e => setBody(e.target.value)} />
          
          <div className="flex flex-wrap gap-6 pt-2">
            <label className="flex items-center gap-2 text-sm font-semibold text-ink cursor-pointer">
              <input type="checkbox" checked={allowComments} onChange={e => setAllowComments(e.target.checked)} className="h-4 w-4 rounded border-light-blue text-primary focus:ring-accent" />
              السماح للطلاب بالتعليق والرد
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold text-ink cursor-pointer">
              <input type="checkbox" checked={showNames} onChange={e => setShowNames(e.target.checked)} className="h-4 w-4 rounded border-light-blue text-primary focus:ring-accent" />
              إظهار أسماء الطلاب المعلقين
            </label>
          </div>

          <button type="button" className={btn} onClick={() => void send()} disabled={busy}>{busy ? 'جارٍ النشر...' : '📢 نشر الإعلان لكل الطلاب'}</button>
        </div>
      </section>

      <section className={card}>
        <h3 className="text-lg font-bold text-primary mb-3">الإعلانات المنشورة ({items.length})</h3>
        <ul className="space-y-3">
          {items.map(ann => (
            <li key={ann.id} className="flex items-start justify-between rounded-xl border border-light-blue p-4 shadow-sm bg-white">
              <div>
                <h4 className="font-bold text-ink text-base">{ann.title}</h4>
                <p className="text-sm text-ink-muted mt-1 whitespace-pre-wrap">{ann.body}</p>
              </div>
              <button type="button" onClick={() => void deleteAnn(ann.id)} className="rounded-lg bg-error-soft px-3 py-1.5 text-xs font-bold text-error">حذف الإعلان</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

function DirectChat({
  meId,
  themId,
  themName,
  onReadOrSent,
}: {
  meId: string
  themId: string
  themName: string
  onReadOrSent?: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [reactions, setReactions] = useState<MessageReaction[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)

  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${meId},recipient_id.eq.${themId}),and(sender_id.eq.${themId},recipient_id.eq.${meId})`)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true })

    const msgs = (data ?? []) as Message[]
    setMessages(msgs)

    if (msgs.length > 0) {
      const mIds = msgs.map(m => m.id)
      const { data: reacts } = await supabase.from('message_reactions').select('*').in('message_id', mIds)
      setReactions((reacts ?? []) as MessageReaction[])
    }

    await supabase.from('messages').update({ read_at: new Date().toISOString() }).eq('recipient_id', meId).eq('sender_id', themId).is('read_at', null)
    onReadOrSent?.()
    setLoading(false)
  }, [meId, themId, onReadOrSent])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  async function send() {
    if (!supabase || !text.trim()) return
    setBusy(true)
    await supabase.from('messages').insert({ sender_id: meId, recipient_id: themId, body: text.trim() })
    setText('')
    await load()
    setBusy(false)
  }

  async function deleteMsg(id: string) {
    if (!supabase) return
    await supabase.from('messages').update({ is_deleted: true }).eq('id', id)
    await load()
  }

  async function toggleReaction(messageId: string, emoji: string) {
    if (!supabase) return
    const existing = reactions.find(r => r.message_id === messageId && r.user_id === meId && r.emoji === emoji)
    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('message_reactions').insert({ message_id: messageId, user_id: meId, emoji })
    }
    await load()
  }

  return (
    <section className={card}>
      <div className="mb-3 flex items-center justify-between border-b border-light-blue pb-3">
        <h3 className="text-lg font-bold text-primary">محادثة مع: {themName}</h3>
        <button type="button" onClick={() => void load()} className={btnOutline}>🔄 تحديث</button>
      </div>

      <div className="max-h-[450px] min-h-[250px] overflow-y-auto rounded-xl border-2 border-light-blue bg-bg/50 p-4 space-y-4">
        {loading ? <p className="text-center py-8">⏳ جارٍ التحميل...</p> : messages.length === 0 ? <p className="text-center py-8 text-ink-muted">لا توجد رسائل بعد. ابدأ المحادثة الآن.</p> : (
          messages.map(m => {
            const mine = m.sender_id === meId
            const msgReactions = reactions.filter(r => r.message_id === m.id)

            return (
              <div key={m.id} className={'flex flex-col ' + (mine ? 'items-start' : 'items-end')}>
                <div className={'relative max-w-[85%] rounded-2xl px-4 py-3 shadow-sm ' + (mine ? 'rounded-tr-sm bg-primary text-white' : 'rounded-tl-sm bg-white border border-light-blue text-ink')}>
                  <div className="whitespace-pre-wrap text-sm leading-relaxed">{m.body}</div>
                  <div className={'mt-1 flex items-center justify-end gap-1 text-[10px] ' + (mine ? 'text-white/80' : 'text-ink-muted')}>
                    <span>{timeAgo(m.created_at)}</span>
                    {mine && m.read_at && <span>✓✓</span>}
                  </div>
                </div>

                <div className="mt-1 flex items-center gap-2 px-1">
                  <div className="flex gap-1">
                    {TOP_EMOJIS.map(emoji => (
                      <button key={emoji} type="button" onClick={() => void toggleReaction(m.id, emoji)} className="text-xs hover:scale-125 transition-transform">
                        {emoji}
                      </button>
                    ))}
                  </div>
                  {msgReactions.map(r => (
                    <span key={r.id} className="rounded-full bg-white px-2 py-0.5 text-xs border border-light-blue shadow-sm">{r.emoji}</span>
                  ))}
                  {mine && (
                    <button type="button" onClick={() => void deleteMsg(m.id)} className="text-[10px] text-error hover:underline ms-2">حذف</button>
                  )}
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
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
        />
        <button type="button" className={btn + ' px-6'} onClick={() => void send()} disabled={busy || !text.trim()}>إرسال</button>
      </div>
    </section>
  )
}