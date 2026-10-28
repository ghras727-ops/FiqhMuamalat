import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../../app/auth-context'
import { supabase } from '../../lib/supabase'
import type { Announcement, AnnouncementRead, Message, UserBrief } from '../../types'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60'
const btnOutline = 'rounded-xl border border-primary bg-white px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-soft disabled:opacity-60'
const input = 'w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-accent/40'
const label = 'text-sm font-semibold text-primary'

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

// ============================== STUDENT ==============================
function StudentView() {
  const { profile } = useAuth()
  const [teacher, setTeacher] = useState<UserBrief | null>(null)
  // هنا التعديل: جعلنا "محادثتي" هي الصفحة الافتراضية
  const [view, setView] = useState<'announcements' | 'chat'>('chat')

  useEffect(() => {
    if (!supabase || !profile) return
    void (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('role', 'teacher')
        .eq('active', true)
        .limit(1)
        .maybeSingle()
      setTeacher(data as UserBrief | null)
    })()
  }, [profile])

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
          className={(view === 'chat' ? 'bg-primary text-white' : 'text-primary') + ' rounded-lg px-4 py-2 text-sm font-semibold transition'}
          onClick={() => setView('chat')}
        >💬 محادثتي</button>
        <button
          className={(view === 'announcements' ? 'bg-primary text-white' : 'text-primary') + ' rounded-lg px-4 py-2 text-sm font-semibold transition'}
          onClick={() => setView('announcements')}
        >📢 الإعلانات</button>
      </div>

      {view === 'announcements' && <StudentAnnouncements />}
      {view === 'chat' && teacher && (
        <DirectChat
          meId={profile.id}
          themId={teacher.id}
          themName={teacher.full_name}
          myRole="student"
        />
      )}
      {view === 'chat' && !teacher && (
        <p className="rounded-xl bg-warning-soft p-4 text-ink">تعذّر العثور على حساب الأستاذ.</p>
      )}
    </div>
  )
}

function StudentAnnouncements() {
  const { profile } = useAuth()
  const [items, setItems] = useState<Announcement[]>([])
  const [readIds, setReadIds] = useState<Set<string>>(new Set())
  const [openId, setOpenId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    if (!supabase || !profile) return
    setLoading(true)
    const [aRes, rRes] = await Promise.all([
      supabase.from('announcements').select('*').order('created_at', { ascending: false }),
      supabase.from('announcement_reads').select('announcement_id').eq('student_id', profile.id),
    ])
    setItems((aRes.data ?? []) as Announcement[])
    setReadIds(new Set(((rRes.data ?? []) as { announcement_id: string }[]).map((r) => r.announcement_id)))
    setLoading(false)
  }, [profile])

  useEffect(() => { void load() }, [load])

  async function open(ann: Announcement) {
    setOpenId(openId === ann.id ? null : ann.id)
    if (!readIds.has(ann.id) && supabase && profile) {
      await supabase.from('announcement_reads').insert({
        announcement_id: ann.id,
        student_id: profile.id,
      })
      setReadIds((prev) => new Set([...prev, ann.id]))
    }
  }

  if (loading) return <section className={card}><p className="text-ink-muted">جارٍ التحميل...</p></section>
  if (items.length === 0) return <section className={card}><p className="text-ink-muted text-center py-6">لا توجد إعلانات بعد.</p></section>

  return (
    <section className={card}>
      <h3 className="text-lg font-bold text-primary mb-3">الإعلانات ({items.length})</h3>
      <ul className="space-y-2">
        {items.map((ann) => {
          const isNew = !readIds.has(ann.id)
          const isOpen = openId === ann.id
          return (
            <li key={ann.id} className={'rounded-xl border-2 p-4 ' + (isNew ? 'border-error bg-error-soft/20' : 'border-light-blue')}>
              <button className="w-full text-start" onClick={() => void open(ann)}>
                <div className="flex items-center gap-2">
                  {isNew && <span className="rounded-full bg-error px-2 py-0.5 text-xs font-bold text-white">جديد</span>}
                  <span className="text-base font-bold text-ink">{ann.title}</span>
                  <span className="ms-auto text-xs text-ink-muted">{timeAgo(ann.created_at)}</span>
                </div>
              </button>
              {isOpen && (
                <div className="mt-3 whitespace-pre-wrap rounded-lg bg-bg p-3 text-ink">{ann.body}</div>
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
        <p className="mt-1 text-base text-white/85">
          أرسل إعلاناً لكل الطلاب، أو راسل طالباً بعينه. تابع من قرأ إعلاناتك.
        </p>
      </section>

      <div className="inline-flex rounded-xl border border-light-blue bg-white p-1 shadow-sm">
        <button
          className={(view === 'conversations' ? 'bg-primary text-white' : 'text-primary') + ' rounded-lg px-4 py-2 text-sm font-semibold transition'}
          onClick={() => setView('conversations')}
        >💬 محادثات الطلاب</button>
        <button
          className={(view === 'announcements' ? 'bg-primary text-white' : 'text-primary') + ' rounded-lg px-4 py-2 text-sm font-semibold transition'}
          onClick={() => setView('announcements')}
        >📢 الإعلانات</button>
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
    const [sRes, mRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, student_no').eq('role', 'student').eq('active', true).order('full_name'),
      supabase.from('messages').select('sender_id').eq('recipient_id', meId).is('read_at', null),
    ])
    setStudents((sRes.data ?? []) as UserBrief[])
    const counts: Record<string, number> = {}
    for (const row of (mRes.data ?? []) as { sender_id: string }[]) {
      counts[row.sender_id] = (counts[row.sender_id] ?? 0) + 1
    }
    setUnreadByStudent(counts)
    setLoading(false)
  }, [meId])

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
        <DirectChat
          meId={meId}
          themId={selected.id}
          themName={selected.full_name + (selected.student_no ? ` (${selected.student_no})` : '')}
          myRole="teacher"
          onSent={() => { void load() }}
        />
      </div>
    )
  }

  const filtered = students.filter((s) =>
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (s.student_no ?? '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <section className={card}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-lg font-bold text-primary">محادثات الطلاب ({students.length})</h3>
        <input
          className={input + ' max-w-xs mt-0'}
          placeholder="ابحث باسم الطالب أو رقمه..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {loading ? <p className="text-ink-muted">جارٍ التحميل...</p> : filtered.length === 0 ? (
        <p className="text-ink-muted text-center py-6">لا طلاب مطابقون.</p>
      ) : (
        <ul className="space-y-2">
          {filtered.map((s) => {
            const n = unreadByStudent[s.id] ?? 0
            return (
              <li key={s.id}>
                <button
                  className="w-full rounded-xl border-2 border-light-blue bg-white p-3 text-start hover:border-primary hover:bg-primary-soft/20 transition"
                  onClick={() => setSelected(s)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-base font-bold text-ink">{s.full_name}</div>
                      {s.student_no && <div className="text-xs font-mono text-ink-muted" dir="ltr">{s.student_no}</div>}
                    </div>
                    {n > 0 && <span className="rounded-full bg-error px-2 py-0.5 text-xs font-bold text-white">{n} جديد</span>}
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
  const [reads, setReads] = useState<Record<string, { readers: { name: string; read_at: string }[]; nonReaders: string[]; total: number }>>({})

  const load = useCallback(async () => {
    if (!supabase) return
    const aRes = await supabase.from('announcements').select('*').eq('sender_id', meId).order('created_at', { ascending: false })
    setItems((aRes.data ?? []) as Announcement[])
  }, [meId])

  useEffect(() => { void load() }, [load])

  async function send() {
    if (!supabase || !title.trim() || !body.trim()) { setError('العنوان والنص مطلوبان.'); return }
    setBusy(true); setError(null)
    const { error: insErr } = await supabase.from('announcements').insert({
      sender_id: meId, title: title.trim(), body: body.trim(),
    })
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
    const reads = (readRes.data ?? []) as AnnouncementRead[]
    const students = (studentsRes.data ?? []) as { id: string; full_name: string }[]
    const readIds = new Set(reads.map((r) => r.student_id))
    const readers = students
      .filter((s) => readIds.has(s.id))
      .map((s) => ({ name: s.full_name, read_at: reads.find((r) => r.student_id === s.id)!.read_at }))
    const nonReaders = students.filter((s) => !readIds.has(s.id)).map((s) => s.full_name)
    setReads((prev) => ({ ...prev, [annId]: { readers, nonReaders, total: students.length } }))
  }

  async function toggleExpand(annId: string) {
    if (expandedId === annId) { setExpandedId(null); return }
    setExpandedId(annId)
    if (!reads[annId]) await loadReads(annId)
  }

  return (
    <div className="space-y-4">
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
          {error && <p className="rounded-lg bg-error-soft p-2 text-error">{error}</p>}
          <button className={btn} onClick={() => void send()} disabled={busy}>{busy ? 'جارٍ النشر...' : '📢 نشر لكل الطلاب'}</button>
        </div>
      </section>

      <section className={card}>
        <h3 className="text-lg font-bold text-primary mb-3">الإعلانات المنشورة ({items.length})</h3>
        {items.length === 0 ? <p className="text-ink-muted text-center py-6">لم تنشر إعلانات بعد.</p> : (
          <ul className="space-y-2">
            {items.map((ann) => {
              const info = reads[ann.id]
              const isOpen = expandedId === ann.id
              return (
                <li key={ann.id} className="rounded-xl border-2 border-light-blue">
                  <button className="w-full p-4 text-start" onClick={() => void toggleExpand(ann.id)}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-bold text-ink">{ann.title}</span>
                      <span className="ms-auto text-xs text-ink-muted">{timeAgo(ann.created_at)}</span>
                      {info && (
                        <span className="rounded-lg bg-secondary-soft px-2 py-0.5 text-xs font-semibold text-secondary">
                          قرأه {info.readers.length} من {info.total}
                        </span>
                      )}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="border-t border-light-blue p-4 space-y-3">
                      <div className="whitespace-pre-wrap rounded-lg bg-bg p-3 text-ink">{ann.body}</div>
                      {info && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="rounded-lg border border-secondary/30 bg-secondary-soft/30 p-3">
                            <div className="mb-1 text-sm font-bold text-secondary">✅ قرأوا ({info.readers.length})</div>
                            {info.readers.length === 0 ? <p className="text-xs text-ink-muted">لا أحد بعد.</p> : (
                              <ul className="space-y-1 text-sm">
                                {info.readers.map((r, i) => (
                                  <li key={i} className="flex justify-between">
                                    <span>{r.name}</span>
                                    <span className="text-xs text-ink-muted">{timeAgo(r.read_at)}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          <div className="rounded-lg border border-warning bg-warning-soft/40 p-3">
                            <div className="mb-1 text-sm font-bold text-ink">⏳ لم يقرأوا ({info.nonReaders.length})</div>
                            {info.nonReaders.length === 0 ? <p className="text-xs text-ink-muted">الجميع قرأ.</p> : (
                              <ul className="space-y-1 text-sm">
                                {info.nonReaders.map((n, i) => <li key={i}>{n}</li>)}
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

// ============================== CHAT ==============================
function DirectChat({ meId, themId, themName, myRole, onSent }: {
  meId: string
  themId: string
  themName: string
  myRole: 'student' | 'teacher'
  onSent?: () => void
}) {
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    const { data, error: err } = await supabase
      .from('messages')
      .select('*')
      .or(`and(sender_id.eq.${meId},recipient_id.eq.${themId}),and(sender_id.eq.${themId},recipient_id.eq.${meId})`)
      .order('created_at', { ascending: true })
    if (err) { setError(err.message); return }
    setMessages((data ?? []) as Message[])
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
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => { void load() })
      .subscribe()
    return () => { void supabase!.removeChannel(ch) }
  }, [meId, themId, load])

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages.length])

  async function send() {
    if (!supabase || !text.trim()) return
    setBusy(true); setError(null)
    const { error: err } = await supabase.from('messages').insert({
      sender_id: meId, recipient_id: themId, body: text.trim(),
    })
    setBusy(false)
    if (err) { setError(err.message); return }
    setText('')
    await load()
    onSent?.()
  }

  return (
    <section className={card}>
      <h3 className="text-lg font-bold text-primary mb-3">محادثة مع {myRole === 'student' ? 'الأستاذ' : themName}</h3>
      <div className="max-h-[500px] overflow-y-auto rounded-xl border border-light-blue bg-bg p-3 space-y-2">
        {messages.length === 0 ? (
          <p className="text-center text-ink-muted py-6">لا رسائل بعد. ابدأ المحادثة أدناه.</p>
        ) : messages.map((m) => {
          const mine = m.sender_id === meId
          return (
            <div key={m.id} className={'flex ' + (mine ? 'justify-start' : 'justify-end')}>
              <div className={'max-w-[75%] rounded-2xl px-4 py-2 ' + (mine ? 'bg-primary text-white' : 'bg-white border border-light-blue text-ink')}>
                <div className="whitespace-pre-wrap text-sm">{m.body}</div>
                <div className={'mt-1 text-[10px] ' + (mine ? 'text-white/70' : 'text-ink-muted')}>
                  {timeAgo(m.created_at)}{mine && m.read_at && ' · قُرئت'}
                </div>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>
      {error && <p className="mt-2 rounded-lg bg-error-soft p-2 text-error text-sm">{error}</p>}
      <div className="mt-3 flex gap-2">
        <textarea
          className={input + ' mt-0 flex-1'}
          rows={2}
          placeholder="اكتب رسالتك..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send() } }}
        />
        <button className={btn} onClick={() => void send()} disabled={busy || !text.trim()}>
          {busy ? '...' : 'إرسال'}
        </button>
      </div>
    </section>
  )
}