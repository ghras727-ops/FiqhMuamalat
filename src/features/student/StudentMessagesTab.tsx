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

export default function StudentMessagesTab() {
  const { profile } = useAuth()
  const meId = profile?.id

  const [messages, setMessages] = useState<Message[]>([])
  const [reactions, setReactions] = useState<ReactionRow[]>([])
  const [newIds, setNewIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [notice, setNotice] = useState<Notice>(null)

  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [busy, setBusy] = useState(false)

  const notify = useCallback((type: 'success' | 'error', text: string) => {
    setNotice({ type, text })
    window.setTimeout(() => setNotice(null), 6000)
  }, [])

  const load = useCallback(async () => {
    if (!supabase || !meId) return
    setLoading(true)

    const res = await fetchMessages(supabase, `recipient_id.eq.${meId},recipient_id.is.null`)
    if (res.error) {
      notify('error', `تعذّر جلب الرسائل: ${res.error}`)
      setLoading(false)
      return
    }
    const rows = res.rows.filter((m) => !m.is_deleted)

    const readRes = await supabase.from('message_reads').select('message_id').eq('student_id', meId)
    const readsOk = !readRes.error
    const readIds = new Set(((readRes.data ?? []) as { message_id: string }[]).map((r) => r.message_id))

    const unreadPrivate = rows.filter((m) => m.recipient_id === meId && !m.read_at).map((m) => m.id)
    const unreadBroadcast = readsOk
      ? rows.filter((m) => m.recipient_id === null && !readIds.has(m.id)).map((m) => m.id)
      : []

    setNewIds(new Set([...unreadPrivate, ...unreadBroadcast]))
    setMessages(rows)

    if (rows.length > 0) {
      const rxRes = await supabase
        .from('message_reactions')
        .select('message_id, user_id, emoji')
        .in('message_id', rows.map((m) => m.id))
      if (!rxRes.error) setReactions((rxRes.data ?? []) as ReactionRow[])
    }

    setLoading(false)

    if (unreadPrivate.length > 0) {
      const now = new Date().toISOString()
      const { error } = await supabase
        .from('messages')
        .update({ read_at: now })
        .in('id', unreadPrivate)
        .is('read_at', null)
      if (error) notify('error', `تعذّر تحديث حالة القراءة: ${error.message}`)
      else setMessages((prev) => prev.map((m) => (unreadPrivate.includes(m.id) ? { ...m, read_at: now } : m)))
    }

    if (unreadBroadcast.length > 0) {
      const { error } = await supabase
        .from('message_reads')
        .upsert(
          unreadBroadcast.map((id) => ({ message_id: id, student_id: meId })),
          { onConflict: 'message_id,student_id', ignoreDuplicates: true },
        )
      if (error) notify('error', `تعذّر تسجيل قراءة التعميمات: ${error.message}`)
    }

    window.dispatchEvent(new Event(MESSAGES_READ_EVENT))
  }, [meId, notify])

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

  async function sendReply() {
    if (!supabase || !meId || !replyingTo) return
    if (!replyBody.trim()) {
      notify('error', 'اكتب نص الرد أولاً.')
      return
    }
    setBusy(true)
    const { error } = await supabase.from('messages').insert({
      sender_id: meId,
      recipient_id: replyingTo.sender_id,
      parent_id: replyingTo.id,
      subject: replyingTo.subject ? `رد: ${replyingTo.subject.replace(/^رد:\s*/, '')}` : null,
      body: replyBody.trim(),
    })
    setBusy(false)
    if (error) {
      notify('error', `فشل إرسال الرد: ${error.message}`)
      return
    }
    setReplyingTo(null)
    setReplyBody('')
    notify('success', 'تم إرسال ردك بنجاح.')
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
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">رسائل الأستاذ</h2>
        <p className="mt-1 text-base text-white/85">
          {newIds.size > 0 ? `لديك ${newIds.size} رسالة جديدة.` : 'صندوق الوارد الخاص بك وتعميمات المقرر.'}
        </p>
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
        {loading ? (
          <p>جارٍ التحميل...</p>
        ) : messages.length === 0 ? (
          <p className="text-center text-ink-muted">لا توجد رسائل.</p>
        ) : (
          <ul className="space-y-4">
            {messages.map((m) => {
              const isPublic = m.recipient_id === null
              const isNew = newIds.has(m.id)
              return (
                <li
                  key={m.id}
                  className={
                    'rounded-xl border p-4 ' +
                    (isNew
                      ? 'border-primary bg-primary-soft/20'
                      : isPublic
                        ? 'border-[#198B48] bg-[#198B48]/10'
                        : 'border-light-blue bg-white')
                  }
                >
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-light-blue/50 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-primary">{m.profiles_sender?.full_name || 'الأستاذ'}</span>
                      {isNew && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-white">جديدة</span>
                      )}
                      {isPublic ? (
                        <span className="rounded-full bg-[#198B48] px-2 py-0.5 text-xs font-semibold text-white">تعميم</span>
                      ) : (
                        <span className="text-xs text-ink-muted">(رسالة خاصة)</span>
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

                  <div className="mt-3">
                    {replyingTo?.id === m.id ? (
                      <div className="rounded-xl bg-bg p-3">
                        <label htmlFor={`reply-${m.id}`} className="text-sm font-semibold">ردك</label>
                        <textarea
                          id={`reply-${m.id}`}
                          className={input}
                          rows={3}
                          placeholder="اكتب ردك هنا..."
                          value={replyBody}
                          onChange={(e) => setReplyBody(e.target.value)}
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
                            }}
                          >
                            إلغاء
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="text-sm font-semibold text-primary hover:underline"
                        onClick={() => {
                          setReplyingTo(m)
                          setReplyBody('')
                        }}
                      >
                        الرد على الرسالة
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </div>
  )
}
