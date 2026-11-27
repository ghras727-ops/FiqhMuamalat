import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../app/auth-context'
import MessageReactions, { type ReactionRow } from '../shared/MessageReactions'

const BUCKET = 'platform-files'
const GREEN = '#198B48'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20'

interface Message {
  id: string
  sender_id: string
  recipient_id: string | null
  parent_id: string | null
  subject: string | null
  body: string
  attachment_path: string | null
  read_at: string | null
  created_at: string
  is_deleted?: boolean | null
  profiles_sender?: { full_name: string | null } | null
}

interface Student {
  id: string
  full_name: string
  student_no: string | null
}

type Notice = { type: 'success' | 'error'; text: string } | null

async function fetchMessages(
  client: SupabaseClient,
  filter: string,
): Promise<{ rows: Message[]; error: string | null }> {
  const withEmbed = await client
    .from('messages')
    .select('*, profiles_sender:sender_id(full_name)')
    .or(filter)
    .order('created_at', { ascending: false })
  if (!withEmbed.error) return { rows: (withEmbed.data ?? []) as Message[], error: null }

  const plain = await client
    .from('messages')
    .select('*')
    .or(filter)
    .order('created_at', { ascending: false })
  if (plain.error) return { rows: [], error: plain.error.message }

  const rows = (plain.data ?? []) as Message[]
  const ids = [...new Set(rows.map((r) => r.sender_id))]
  if (ids.length > 0) {
    const { data } = await client.from('profiles').select('id, full_name').in('id', ids)
    const names = new Map(((data ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]))
    for (const r of rows) r.profiles_sender = { full_name: names.get(r.sender_id) ?? null }
  }
  return { rows, error: null }
}

const fmt = (iso: string) => new Date(iso).toLocaleString('ar-SA-u-nu-latn')

export default function AdminMessagesTab({ onRead }: { onRead?: () => void }) {
  const { profile } = useAuth()
  const meId = profile?.id

  const [messages, setMessages] = useState<Message[]>([])
  const [reactions, setReactions] = useState<ReactionRow[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  const [to, setTo] = useState<string>('all')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0)

  const [expandedThreads, setExpandedThreads] = useState<Set<string>>(new Set())
  const [replyTarget, setReplyTarget] = useState<{ rootId: string; studentId: string; studentName: string; subject: string | null } | null>(null)
  const [replyBody, setReplyBody] = useState('')

  const notify = useCallback((type: 'success' | 'error', text: string) => {
    setNotice({ type, text })
    window.setTimeout(() => setNotice(null), 6000)
  }, [])

  const studentName = useMemo(() => {
    const map = new Map<string, string>()
    for (const s of students) map.set(s.id, s.full_name)
    return map
  }, [students])

  const load = useCallback(async () => {
    if (!supabase || !meId) return
    setLoading(true)
    const [mRes, sRes] = await Promise.all([
      fetchMessages(supabase, `sender_id.eq.${meId},recipient_id.eq.${meId},recipient_id.is.null`),
      supabase
        .from('profiles')
        .select('id, full_name, student_no')
        .eq('role', 'student')
        .eq('active', true)
        .order('student_no'),
    ])

    let activeRows: Message[] = []
    if (mRes.error) notify('error', `تعذّر جلب الرسائل: ${mRes.error}`)
    else {
      activeRows = mRes.rows.filter((m) => !m.is_deleted)
      setMessages(activeRows)
    }

    if (sRes.error) notify('error', `تعذّر جلب قائمة الطلاب: ${sRes.error.message}`)
    else setStudents((sRes.data ?? []) as Student[])

    if (activeRows.length > 0) {
      const ids = activeRows.map((m) => m.id)
      const rxRes = await supabase
        .from('message_reactions')
        .select('message_id, user_id, emoji')
        .in('message_id', ids)
      if (!rxRes.error) setReactions((rxRes.data ?? []) as ReactionRow[])

      // تعليم الرسائل الواردة للأستاذ كمقروءة وتحديث الشارة الحمراء
      const unreadIncoming = activeRows
        .filter((m) => m.recipient_id === meId && !m.read_at)
        .map((m) => m.id)

      if (unreadIncoming.length > 0) {
        const now = new Date().toISOString()
        const { error: readErr } = await supabase
          .from('messages')
          .update({ read_at: now })
          .in('id', unreadIncoming)
          .is('read_at', null)
        if (!readErr) {
          setMessages((prev) => prev.map((m) => (unreadIncoming.includes(m.id) ? { ...m, read_at: now } : m)))
          onRead?.()
        }
      }
    }

    setLoading(false)
  }, [meId, notify, onRead])

  useEffect(() => {
    void load()
  }, [load])

  const reactionsByMsg = useMemo(() => {
    const map = new Map<string, ReactionRow[]>()
    for (const r of reactions) {
      const list = map.get(r.message_id) ?? []
      list.push(r)
      map.set(r.message_id, list)
    }
    return map
  }, [reactions])

  const { topMessages, repliesByParent } = useMemo(() => {
    const byId = new Map(messages.map((m) => [m.id, m]))
    const replies = new Map<string, Message[]>()
    const tops: Message[] = []

    for (const m of messages) {
      if (m.parent_id && byId.has(m.parent_id)) {
        const list = replies.get(m.parent_id) ?? []
        list.push(m)
        replies.set(m.parent_id, list)
      } else {
        tops.push(m)
      }
    }

    for (const list of replies.values()) {
      list.sort((a, b) => a.created_at.localeCompare(b.created_at))
    }

    return { topMessages: tops, repliesByParent: replies }
  }, [messages])

  async function toggleReaction(messageId: string, emoji: string) {
    if (!supabase || !meId) return
    const exists = reactions.some((r) => r.message_id === messageId && r.user_id === meId && r.emoji === emoji)
    if (exists) {
      const { error } = await supabase
        .from('message_reactions')
        .delete()
        .eq('message_id', messageId)
        .eq('user_id', meId)
        .eq('emoji', emoji)
      if (!error) {
        setReactions((prev) => prev.filter((r) => !(r.message_id === messageId && r.user_id === meId && r.emoji === emoji)))
      }
    } else {
      const { error } = await supabase
        .from('message_reactions')
        .insert({ message_id: messageId, user_id: meId, emoji })
      if (!error) {
        setReactions((prev) => [...prev, { message_id: messageId, user_id: meId, emoji }])
      }
    }
  }

  async function sendMessage() {
    if (!supabase || !meId) return
    if (!body.trim()) {
      notify('error', 'نص الرسالة مطلوب.')
      return
    }
    setBusy(true)

    let path: string | null = null
    if (file) {
      const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin'
      path = `messages/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, file)
      if (upErr) {
        notify('error', `فشل رفع المرفق: ${upErr.message}`)
        setBusy(false)
        return
      }
    }

    const { error: insErr } = await supabase.from('messages').insert({
      sender_id: meId,
      recipient_id: to === 'all' ? null : to,
      subject: subject.trim() || null,
      body: body.trim(),
      attachment_path: path,
    })

    if (insErr) {
      if (path) await supabase.storage.from(BUCKET).remove([path])
      notify('error', `فشل الإرسال: ${insErr.message}`)
      setBusy(false)
      return
    }

    setSubject('')
    setBody('')
    setFile(null)
    setFileKey((k) => k + 1)
    setTo('all')
    setBusy(false)
    notify('success', 'تم إرسال الرسالة بنجاح.')
    await load()
  }

  async function sendPrivateReply() {
    if (!supabase || !meId || !replyTarget) return
    if (!replyBody.trim()) {
      notify('error', 'اكتب نص الرد الخاص أولاً.')
      return
    }
    setBusy(true)
    const { error } = await supabase.from('messages').insert({
      sender_id: meId,
      recipient_id: replyTarget.studentId,
      parent_id: replyTarget.rootId,
      subject: replyTarget.subject ? `رد: ${replyTarget.subject.replace(/^رد:\s*/, '')}` : null,
      body: replyBody.trim(),
    })
    setBusy(false)
    if (error) {
      notify('error', `فشل إرسال الرد: ${error.message}`)
      return
    }
    setReplyTarget(null)
    setReplyBody('')
    notify('success', 'تم إرسال الرد الخاص للطالب.')
    await load()
  }

  async function openAttachment(path: string) {
    if (!supabase) return
    const signed = await supabase.storage.from(BUCKET).createSignedUrl(path, 600)
    const url = signed.data?.signedUrl ?? supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl
    if (!url) {
      notify('error', 'تعذّر فتح المرفق.')
      return
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  function toggleThread(id: string) {
    setExpandedThreads((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (!profile || !meId) return null

  const senderLabel = (m: Message) =>
    m.sender_id === meId ? 'أنت' : m.profiles_sender?.full_name || studentName.get(m.sender_id) || 'مستخدم'
  const targetLabel = (m: Message) =>
    m.recipient_id === null
      ? 'جميع الطلاب (تعميم)'
      : m.recipient_id === meId
        ? 'أنت'
        : studentName.get(m.recipient_id) || 'طالب'

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">مراسلة الطلاب</h2>
        <p className="mt-1 text-base text-white/85">إرسال رسائل خاصة أو تعميمات لجميع الطلاب، والاطلاع على ردودهم.</p>
      </section>

      {notice && (
        <p
          role="status"
          className={
            'rounded-xl p-3 text-sm font-semibold ' +
            (notice.type === 'success' ? 'bg-[#198B48]/10 text-[#198B48]' : 'bg-error-soft text-error')
          }
        >
          {notice.text}
        </p>
      )}

      <section className={card}>
        <h3 className="mb-4 text-xl font-bold text-primary">رسالة جديدة</h3>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="msg-to" className="text-sm font-semibold">المرسل إليه</label>
              <select id="msg-to" className={input} value={to} onChange={(e) => setTo(e.target.value)}>
                <option value="all">جميع الطلاب (تعميم)</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.full_name}
                    {s.student_no ? ` (${s.student_no})` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="msg-subject" className="text-sm font-semibold">الموضوع (اختياري)</label>
              <input
                id="msg-subject"
                className={input}
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="عنوان الرسالة..."
              />
            </div>
          </div>
          <div>
            <label htmlFor="msg-body" className="text-sm font-semibold">نص الرسالة</label>
            <textarea id="msg-body" className={input} rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div>
            <label htmlFor="msg-file" className="text-sm font-semibold">مرفق (اختياري)</label>
            <input
              key={fileKey}
              id="msg-file"
              type="file"
              className={input}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <button type="button" className={btn} onClick={() => void sendMessage()} disabled={busy}>
            {busy ? 'جارٍ الإرسال...' : 'إرسال'}
          </button>
        </div>
      </section>

      <section className={card}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-xl font-bold text-primary">سجل المراسلات</h3>
          <div className="flex gap-4 text-xs text-ink-muted">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm border" style={{ borderColor: GREEN, background: `${GREEN}22` }} />
              تعميم
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm border border-light-blue bg-white" />
              خاصة
            </span>
          </div>
        </div>

        {loading ? (
          <p>جارٍ التحميل...</p>
        ) : topMessages.length === 0 ? (
          <p className="text-center text-ink-muted">لا توجد رسائل بعد.</p>
        ) : (
          <ul className="space-y-3">
            {topMessages.map((m) => {
              const isPublic = m.recipient_id === null
              const replies = repliesByParent.get(m.id) ?? []
              const isExpanded = expandedThreads.has(m.id) || replies.length <= 2
              return (
                <li
                  key={m.id}
                  className={
                    'rounded-xl border p-4 ' +
                    (isPublic ? 'border-[#198B48] bg-[#198B48]/10' : 'border-light-blue bg-white')
                  }
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-light-blue/50 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-primary">{senderLabel(m)}</span>
                      <span className="text-ink-muted">←</span>
                      <span className="font-semibold text-ink">{targetLabel(m)}</span>
                      {m.parent_id && (
                        <span className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-semibold text-primary">رد</span>
                      )}
                      {isPublic && (
                        <span className="rounded-full bg-[#198B48] px-2 py-0.5 text-xs font-semibold text-white">تعميم</span>
                      )}
                    </div>
                    <span className="text-xs text-ink-muted">{fmt(m.created_at)}</span>
                  </div>
                  {m.subject && <div className="mb-1 font-bold text-ink">الموضوع: {m.subject}</div>}
                  <p className="whitespace-pre-wrap text-sm text-ink">{m.body}</p>
                  {m.attachment_path && (
                    <button
                      type="button"
                      onClick={() => void openAttachment(m.attachment_path as string)}
                      className="mt-2 block text-sm font-semibold text-primary hover:underline"
                    >
                      عرض المرفق
                    </button>
                  )}

                  <MessageReactions
                    messageId={m.id}
                    meId={meId}
                    reactions={reactionsByMsg.get(m.id) ?? []}
                    onToggle={(id, emoji) => void toggleReaction(id, emoji)}
                  />

                  {replies.length > 0 && (
                    <div className="mt-3 border-t border-light-blue/60 pt-3">
                      <button
                        type="button"
                        onClick={() => toggleThread(m.id)}
                        className="mb-2 text-xs font-bold text-primary hover:underline"
                      >
                        {isExpanded ? `إخفاء الردود (${replies.length})` : `عرض الردود (${replies.length})`}
                      </button>

                      {isExpanded && (
                        <ul className="space-y-2 border-s-2 border-primary/30 ps-3">
                          {replies.map((r) => {
                            const fromStudent = r.sender_id !== meId
                            const isReplyingHere = replyTarget?.rootId === m.id && replyTarget.studentId === r.sender_id
                            return (
                              <li key={r.id} className="rounded-lg border border-light-blue/70 bg-white/90 p-3">
                                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                                  <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                    <span className="font-bold text-primary">{senderLabel(r)}</span>
                                    <span className="text-ink-muted">←</span>
                                    <span className="font-semibold text-ink">{targetLabel(r)}</span>
                                  </div>
                                  <span className="text-[11px] text-ink-muted">{fmt(r.created_at)}</span>
                                </div>
                                <p className="whitespace-pre-wrap text-sm text-ink">{r.body}</p>

                                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                                  <MessageReactions
                                    messageId={r.id}
                                    meId={meId}
                                    reactions={reactionsByMsg.get(r.id) ?? []}
                                    onToggle={(id, emoji) => void toggleReaction(id, emoji)}
                                  />
                                  {fromStudent && !isReplyingHere && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setReplyTarget({
                                          rootId: m.id,
                                          studentId: r.sender_id,
                                          studentName: senderLabel(r),
                                          subject: m.subject,
                                        })
                                        setReplyBody('')
                                      }}
                                      className="text-xs font-semibold text-primary hover:underline"
                                    >
                                      رد خاص على {senderLabel(r)}
                                    </button>
                                  )}
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  )}

                  {replyTarget?.rootId === m.id && (
                    <div className="mt-3 rounded-xl border border-primary/30 bg-bg p-3">
                      <label className="text-xs font-bold text-primary">
                        رد خاص إلى: {replyTarget.studentName}
                      </label>
                      <textarea
                        className={input}
                        rows={2}
                        placeholder="اكتب ردك الخاص هنا..."
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                      />
                      <div className="mt-2 flex items-center gap-3">
                        <button type="button" className={btn} onClick={() => void sendPrivateReply()} disabled={busy}>
                          {busy ? 'جارٍ الإرسال...' : 'إرسال الرد الخاص'}
                        </button>
                        <button
                          type="button"
                          className="text-sm text-error hover:underline"
                          onClick={() => {
                            setReplyTarget(null)
                            setReplyBody('')
                          }}
                        >
                          إلغاء
                        </button>
                      </div>
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
