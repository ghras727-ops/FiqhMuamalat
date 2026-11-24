import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../app/auth-context'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-hover disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink'

interface Message {
  id: string; subject: string | null; body: string; attachment_path: string | null;
  read_at: string | null; created_at: string; sender_id: string; recipient_id: string | null;
  profiles_sender?: { full_name: string };
}

export default function StudentMessagesTab() {
  const { profile } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!supabase || !profile) return
    setLoading(true)
    const { data } = await supabase.from('messages')
      .select('*, profiles_sender:sender_id(full_name)')
      .order('created_at', { ascending: false })
    
    if (data) {
      setMessages(data)
      // تحديث الرسائل غير المقروءة إلى مقروءة
      const unreadIds = data.filter(m => !m.read_at && m.recipient_id === profile.id).map(m => m.id)
      if (unreadIds.length > 0) {
        await supabase.from('messages').update({ read_at: new Date().toISOString() }).in('id', unreadIds)
      }
    }
    setLoading(false)
  }, [profile])

  useEffect(() => { void load() }, [load])

  async function sendReply() {
    if (!supabase || !profile || !replyingTo || !replyBody.trim()) return
    setBusy(true)
    await supabase.from('messages').insert({
      sender_id: profile.id,
      recipient_id: replyingTo.sender_id, // ⬅️ الرد يذهب للأستاذ
      parent_id: replyingTo.id,
      body: replyBody.trim(),
    })
    setBusy(false)
    setReplyingTo(null)
    setReplyBody('')
    await load()
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">مراسلة الأستاذ</h2>
        <p className="mt-1 text-base text-white/85">صندوق الوارد الخاص بك وإشعارات المقرر.</p>
      </section>

      <section className={card}>
        {loading ? <p>جارٍ التحميل...</p> : messages.length === 0 ? <p className="text-center text-ink-muted">لا توجد رسائل.</p> : (
          <ul className="space-y-4">
            {messages.map(m => (
              <li key={m.id} className={`rounded-xl border p-4 ${m.read_at ? 'border-light-blue bg-white' : 'border-primary bg-primary-soft/20'}`}>
                <div className="flex flex-wrap justify-between border-b border-light-blue/50 pb-2 mb-2">
                  <div className="font-bold text-primary">
                    {m.profiles_sender?.full_name} {m.recipient_id ? '(رسالة خاصة)' : '(تعميم)'}
                  </div>
                  <span className="text-xs text-ink-muted">{new Date(m.created_at).toLocaleString('ar-SA')}</span>
                </div>
                {m.subject && <div className="font-bold text-ink mb-1">الموضوع: {m.subject}</div>}
                <p className="whitespace-pre-wrap text-sm text-ink">{m.body}</p>
                {m.attachment_path && (
                  <a href={m.attachment_path} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">📎 عرض المرفق</a>
                )}
                
                {m.sender_id !== profile?.id && (
                  <div className="mt-3">
                    {replyingTo?.id === m.id ? (
                      <div className="mt-2 rounded-xl bg-bg p-3">
                        <textarea className={input} rows={3} placeholder="اكتب ردك هنا..." value={replyBody} onChange={(e) => setReplyBody(e.target.value)} />
                        <div className="mt-2 flex gap-2">
                          <button className={btn} onClick={() => void sendReply()} disabled={busy}>إرسال الرد</button>
                          <button className="text-sm text-error hover:underline" onClick={() => setReplyingTo(null)}>إلغاء</button>
                        </div>
                      </div>
                    ) : (
                      <button className="text-sm font-semibold text-primary hover:underline" onClick={() => setReplyingTo(m)}>↩️ الرد على الرسالة</button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}