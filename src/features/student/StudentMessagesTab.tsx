import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../app/auth-context'
import { MESSAGES_READ_EVENT } from './useUnreadStudentMessages'
import MessageReactions, { type ReactionRow } from '../shared/MessageReactions'

const BUCKET = 'platform-files'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60'
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
  edited_at?: string | null
  allow_replies?: boolean
  allow_reactions?: boolean
  created_at: string
  is_deleted?: boolean | null
  profiles_sender?: { full_name: string | null } | null
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

const normAr = (s: string) =>
  s
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .trim()

export default function StudentMessagesTab() {
  const { profile } = useAuth()
  const meId = profile?.id

  const [messages, setMessages] = useState<Message[]>([])
  const [reactions, setReactions] = useState<ReactionRow[]>([])
  const [teacherId, setTeacherId] = useState<string | null>(null)
  const [isBlocked, setIsBlocked] = useState(false)
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [openCards, setOpenCards] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice>(null)
  const [searchQuery, setSearchQuery] = useState('')

  const [composerOpen, setComposerOpen] = useState(false)
  const [newSubject, setNewSubject] = useState('')
  const [newBody, setNewBody] = useState('')
  const [newFile, setNewFile] = useState<File | null>(null)
  const [newFileKey, setNewFileKey] = useState(0)

  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [replyFile, setReplyFile] = useState<File | null>(null)
  const [replyFileKey, setReplyFileKey] = useState(0)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBody, setEditBody] = useState('')
  const [busy, setBusy] = useState(false)

  const notify = useCallback((type: 'success' | 'error', text: string) => {
    setNotice({ type, text })
    window.setTimeout(() => setNotice(null), 6000)
  }, [])

  const load = useCallback(async (silent = false) => {
    if (!supabase || !meId) return
    if (!silent) setLoading(true)

    const [res, teacherRes, blockRes] = await Promise.all([
      fetchMessages(supabase, `sender_id.eq.${meId},recipient_id.eq.${meId},recipient_id.is.null`),
      supabase.from('profiles').select('id').eq('role', 'teacher').limit(1).maybeSingle(),
      supabase.from('message_blocks').select('student_id').eq('student_id', meId).maybeSingle(),
    ])

    if (!blockRes.error) setIsBlocked(Boolean(blockRes.data))

    if (res.error) {
      notify('error', `تعذّر جلب الرسائل: ${res.error}`)
      if (!silent) setLoading(false)
      return
    }
    const rows = res.rows.filter((m) => !m.is_deleted)

    const tId =
      (teacherRes.data as { id: string } | null)?.id ??
      rows.find((m) => m.sender_id !== meId)?.sender_id ??
      null
    setTeacherId(tId)

    const readRes = await supabase.from('message_reads').select('message_id').eq('student_id', meId)
    const readsOk = !readRes.error
    const readIds = new Set(((readRes.data ?? []) as { message_id: string }[]).map((r) => r.message_id))

    const unreadPrivate = rows
      .filter((m) => m.recipient_id === meId && !m.read_at && !readIds.has(m.id))
      .map((m) => m.id)
    const unreadBroadcast = readsOk
      ? rows.filter((m) => m.recipient_id === null && !readIds.has(m.id)).map((m) => m.id)
      : []

    const toMarkRead = [...unreadPrivate, ...unreadBroadcast]
    setNewIds(new Set(toMarkRead))
    setMessages(rows)

    if (rows.length > 0) {
      const rxRes = await supabase
        .from('message_reactions')
        .select('message_id, user_id, emoji')
        .in('message_id', rows.map((m) => m.id))
      if (!rxRes.error) setReactions((rxRes.data ?? []) as ReactionRow[])
    }

    if (!silent) setLoading(false)

    if (readsOk && toMarkRead.length > 0) {
      await supabase
        .from('message_reads')
        .upsert(
          toMarkRead.map((id) => ({ message_id: id, student_id: meId })),
          { onConflict: 'message_id,student_id', ignoreDuplicates: true },
        )
    }

    window.dispatchEvent(new Event(MESSAGES_READ_EVENT))
  }, [meId, notify])

  useEffect(() => {
    void load(false)
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

  const filteredMessages = useMemo(() => {
    const q = normAr(searchQuery)
    if (!q) return messages
    return messages.filter((m) => {
      const sender = m.sender_id === meId ? 'أنت' : m.profiles_sender?.full_name || 'الأستاذ'
      const hay = normAr(`${sender} ${m.subject ?? ''} ${m.body}`)
      return hay.includes(q)
    })
  }, [messages, searchQuery, meId])

  function toggleCard(id: string) {
    setOpenCards((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

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
      if (error) {
        notify('error', 'تعذّر إضافة التفاعل (قد تكون التفاعلات مغلقة على هذه الرسالة).')
        return
      }
      setReactions((prev) => [...prev, { message_id: messageId, user_id: meId, emoji }])
    }
  }

  async function saveEdit(messageId: string) {
    if (!supabase || !meId) return
    const trimmed = editBody.trim()
    if (!trimmed) {
      notify('error', 'نص الرسالة لا يمكن أن يكون فارغاً.')
      return
    }
    setBusy(true)
    const { error } = await supabase
      .from('messages')
      .update({ body: trimmed })
      .eq('id', messageId)
    setBusy(false)
    if (error) {
      const msg = error.message.includes('CANNOT_EDIT_READ_MESSAGE')
        ? 'لا يمكن تعديل الرسالة بعد أن قرأها الأستاذ.'
        : `تعذّر تعديل الرسالة: ${error.message}`
      notify('error', msg)
      return
    }
    const now = new Date().toISOString()
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, body: trimmed, edited_at: now } : m)))
    setEditingId(null)
    setEditBody('')
    notify('success', 'تم تعديل رسالتك بنجاح.')
  }

  async function sendNewMessage() {
    if (!supabase || !meId) return
    if (!teacherId) {
      notify('error', 'تعذّر تحديد حساب الأستاذ حالياً. حاول تحديث الصفحة.')
      return
    }
    if (!newBody.trim() && !newFile) {
      notify('error', 'اكتب نص الرسالة أو أرفق صورة/ملفاً.')
      return
    }
    setBusy(true)

    let path: string | null = null
    if (newFile) {
      const ext = newFile.name.includes('.') ? newFile.name.split('.').pop() : 'bin'
      path = `messages/${meId}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, newFile)
      if (upErr) {
        notify('error', `فشل رفع المرفق: ${upErr.message}`)
        setBusy(false)
        return
      }
    }

    const { error } = await supabase.from('messages').insert({
      sender_id: meId,
      recipient_id: teacherId,
      subject: newSubject.trim() || null,
      body: newBody.trim() || 'مرفق',
      attachment_path: path,
    })

    if (error) {
      if (path) await supabase.storage.from(BUCKET).remove([path])
      notify('error', `فشل إرسال الرسالة: ${error.message}`)
      setBusy(false)
      return
    }

    setNewSubject('')
    setNewBody('')
    setNewFile(null)
    setNewFileKey((k) => k + 1)
    setComposerOpen(false)
    setBusy(false)
    notify('success', 'تم إرسال رسالتك الخاصة إلى الأستاذ بنجاح.')
    await load(true)
  }

  async function sendReply() {
    if (!supabase || !meId || !replyingTo) return
    if (!replyBody.trim() && !replyFile) {
      notify('error', 'اكتب نص الرد أو أرفق ملفاً.')
      return
    }
    setBusy(true)

    let path: string | null = null
    if (replyFile) {
      const ext = replyFile.name.includes('.') ? replyFile.name.split('.').pop() : 'bin'
      path = `messages/${meId}/${crypto.randomUUID()}.${ext}`
      const { error: upErr } = await supabase.storage.from(BUCKET).upload(path, replyFile)
      if (upErr) {
        notify('error', `فشل رفع المرفق: ${upErr.message}`)
        setBusy(false)
        return
      }
    }

    const { error } = await supabase.from('messages').insert({
      sender_id: meId,
      recipient_id: replyingTo.sender_id === meId ? teacherId : replyingTo.sender_id,
      parent_id: replyingTo.id,
      subject: replyingTo.subject ? `رد: ${replyingTo.subject.replace(/^رد:\s*/, '')}` : null,
      body: replyBody.trim() || 'مرفق',
      attachment_path: path,
    })
    setBusy(false)
    if (error) {
      if (path) await supabase.storage.from(BUCKET).remove([path])
      notify('error', `فشل إرسال الرد: ${error.message}`)
      return
    }
    setReplyingTo(null)
    setReplyBody('')
    setReplyFile(null)
    setReplyFileKey((k) => k + 1)
    notify('success', 'تم إرسال ردك بنجاح.')
    await load(true)
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

  if (!profile || !meId) return null

  return (
    <div className="space-y-4">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-5 text-white shadow-md">
        <div>
          <h2 className="text-2xl font-bold">رسائل الأستاذ</h2>
          <p className="mt-1 text-sm text-white/85">
            {newIds.size > 0 ? `لديك ${newIds.size} رسالة جديدة.` : 'صندوق الوارد وتعميمات المقرر — يمكنك مراسلة الأستاذ وإرسال المرفقات.'}
          </p>
        </div>
        {!isBlocked && (
          <button
            type="button"
            onClick={() => setComposerOpen((v) => !v)}
            className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-primary shadow-sm transition hover:bg-primary-soft"
          >
            {composerOpen ? 'إغلاق النموذج' : '✉️ رسالة جديدة للأستاذ'}
          </button>
        )}
      </section>

      {isBlocked && (
        <p className="rounded-xl border border-error/40 bg-error-soft p-3 text-sm font-semibold text-error">
          تم إيقاف إمكانية إرسال الرسائل والتفاعلات لحسابك مؤقتاً من قِبل الأستاذ. يمكنك متابعة قراءة الرسائل والتعميمات.
        </p>
      )}

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

      {composerOpen && !isBlocked && (
        <section className={card}>
          <h3 className="mb-3 text-lg font-bold text-primary">إرسال رسالة خاصة إلى الأستاذ</h3>
          <div className="space-y-3">
            <div>
              <label htmlFor="stu-msg-subject" className="text-sm font-semibold">الموضوع (اختياري — مثلاً: إذن استئذان)</label>
              <input
                id="stu-msg-subject"
                className={input}
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="مثال: إذن استئذان / استفسار..."
              />
            </div>
            <div>
              <label htmlFor="stu-msg-body" className="text-sm font-semibold">نص الرسالة</label>
              <textarea
                id="stu-msg-body"
                className={input}
                rows={3}
                value={newBody}
                onChange={(e) => setNewBody(e.target.value)}
                placeholder="اكتب رسالتك للأستاذ هنا..."
              />
            </div>
            <div>
              <label htmlFor="stu-msg-file" className="text-sm font-semibold">إرفاق صورة أو ملف (اختياري)</label>
              <input
                key={newFileKey}
                id="stu-msg-file"
                type="file"
                accept="image/jpeg,image/png,image/webp,.pdf"
                className={input}
                onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
              />
            </div>
            <button type="button" className={btn} onClick={() => void sendNewMessage()} disabled={busy}>
              {busy ? 'جارٍ الإرسال...' : 'إرسال إلى الأستاذ'}
            </button>
          </div>
        </section>
      )}

      <section className={card}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-primary">
            الرسائل ({filteredMessages.length}{searchQuery.trim() ? ` من ${messages.length}` : ''})
          </h3>
          <div className="relative">
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="🔍 بحث في الرسائل..."
              className="w-60 rounded-xl border border-light-blue bg-bg/40 px-3 py-1.5 text-sm text-ink focus:border-primary focus:bg-white focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-ink-muted hover:text-error"
                aria-label="مسح البحث"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <p className="text-sm text-ink-muted">جارٍ التحميل...</p>
        ) : filteredMessages.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-muted">
            {searchQuery.trim() ? 'لا توجد رسائل مطابقة لبحثك.' : 'لا توجد رسائل.'}
          </p>
        ) : (
          <ul className="space-y-2.5">
            {filteredMessages.map((m) => {
              const isPublic = m.recipient_id === null
              const isMine = m.sender_id === meId
              const isNew = newIds.has(m.id)
              const isOpen = openCards.has(m.id)
              const canEdit = isMine && !m.read_at
              const repliesAllowed = m.allow_replies !== false
              const reactionsAllowed = m.allow_reactions !== false

              return (
                <li
                  key={m.id}
                  className={
                    'rounded-xl border transition ' +
                    (isNew
                      ? 'border-primary bg-primary-soft/20'
                      : isPublic
                        ? 'border-[#198B48]/70 bg-[#198B48]/5'
                        : 'border-light-blue bg-white')
                  }
                >
                  <button
                    type="button"
                    onClick={() => toggleCard(m.id)}
                    className="flex w-full items-start justify-between gap-3 p-3.5 text-start"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="font-bold text-primary">
                          {isMine ? 'أنت ← الأستاذ' : m.profiles_sender?.full_name || 'الأستاذ'}
                        </span>
                        {isNew && (
                          <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">جديدة</span>
                        )}
                        {isPublic ? (
                          <span className="rounded-full bg-[#198B48] px-2 py-0.5 text-[11px] font-semibold text-white">تعميم</span>
                        ) : (
                          <span className="text-xs text-ink-muted">(خاصة)</span>
                        )}
                        {m.edited_at && (
                          <span
                            title={`عُدّلت في ${fmt(m.edited_at)}`}
                            className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-semibold text-ink-muted"
                          >
                            معدّلة
                          </span>
                        )}
                        {m.attachment_path && (
                          <span className="rounded-full bg-bg px-2 py-0.5 text-[11px] font-semibold text-ink-muted">📎 مرفق</span>
                        )}
                      </div>
                      {!isOpen && (
                        <p className="truncate text-sm text-ink-muted">
                          {m.subject ? `${m.subject} — ` : ''}{m.body}
                        </p>
                      )}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-1">
                      <span className="text-xs text-ink-muted">{fmt(m.created_at)}</span>
                      <span className="text-xs font-semibold text-primary">{isOpen ? '▲ طيّ' : '▼ فتح'}</span>
                    </div>
                  </button>

                  {isOpen && (
                    <div className="border-t border-light-blue/50 px-4 pb-4 pt-3">
                      {m.subject && <div className="mb-1.5 font-bold text-ink">الموضوع: {m.subject}</div>}

                      {editingId === m.id ? (
                        <div className="space-y-2">
                          <textarea
                            className={input}
                            rows={3}
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                          />
                          <div className="flex items-center gap-3">
                            <button
                              type="button"
                              className={btn}
                              onClick={() => void saveEdit(m.id)}
                              disabled={busy}
                            >
                              {busy ? 'جارٍ الحفظ...' : 'حفظ التعديل'}
                            </button>
                            <button
                              type="button"
                              className="text-sm text-error hover:underline"
                              onClick={() => {
                                setEditingId(null)
                                setEditBody('')
                              }}
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink">{m.body}</p>
                      )}

                      {m.attachment_path && (
                        <button
                          type="button"
                          onClick={() => void openAttachment(m.attachment_path as string)}
                          className="mt-2 inline-flex items-center gap-1 rounded-lg bg-primary-soft px-3 py-1.5 text-xs font-bold text-primary hover:bg-primary hover:text-white"
                        >
                          📎 فتح المرفق / الصورة
                        </button>
                      )}

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <MessageReactions
                            messageId={m.id}
                            meId={meId}
                            reactions={reactionsByMsg.get(m.id) ?? []}
                            onToggle={(id, emoji) => void toggleReaction(id, emoji)}
                            disableAdd={isBlocked || !reactionsAllowed}
                          />
                          {!reactionsAllowed && (
                            <span className="text-[11px] font-semibold text-ink-muted">🚫 التفاعلات مغلقة</span>
                          )}
                        </div>

                        <div className="flex items-center gap-3">
                          {canEdit && editingId !== m.id && (
                            <button
                              type="button"
                              className="text-xs font-bold text-primary hover:underline"
                              onClick={() => {
                                setEditingId(m.id)
                                setEditBody(m.body)
                              }}
                            >
                              تعديل
                            </button>
                          )}

                          {!isMine && !isBlocked && (
                            repliesAllowed ? (
                              <button
                                type="button"
                                className="text-xs font-bold text-primary hover:underline"
                                onClick={() => {
                                  setReplyingTo(m)
                                  setReplyBody('')
                                }}
                              >
                                الرد على الرسالة
                              </button>
                            ) : (
                              <span className="text-[11px] font-semibold text-ink-muted">🔒 الردود مغلقة</span>
                            )
                          )}
                        </div>
                      </div>

                      {replyingTo?.id === m.id && !isBlocked && repliesAllowed && (
                        <div className="mt-3 rounded-xl bg-bg p-3">
                          <label htmlFor={`reply-${m.id}`} className="text-sm font-semibold">ردك</label>
                          <textarea
                            id={`reply-${m.id}`}
                            className={input}
                            rows={3}
                            placeholder="اكتب ردك هنا..."
                            value={replyBody}
                            onChange={(e) => setReplyBody(e.target.value)}
                          />
                          <input
                            key={replyFileKey}
                            type="file"
                            accept="image/jpeg,image/png,image/webp,.pdf"
                            className="mt-2 block w-full text-xs text-ink-muted"
                            onChange={(e) => setReplyFile(e.target.files?.[0] ?? null)}
                          />
                          <div className="mt-2 flex items-center gap-3">
                            <button type="button" className={btn} onClick={() => void sendReply()} disabled={busy}>
                              {busy ? 'جارٍ الإرسال...' : 'إرسال الرد'}
                            </button>
                            <button
                              type="button"
                              className="text-sm text-error hover:underline"
                              onClick={() => {
                                setReplyingTo(null)
                                setReplyBody('')
                                setReplyFile(null)
                              }}
                            >
                              إلغاء
                            </button>
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