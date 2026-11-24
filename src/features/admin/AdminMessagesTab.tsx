import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'

const card = 'rounded-2xl border border-light-blue bg-white p-5 shadow-sm'
const btn = 'rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-hover disabled:opacity-60'
const input = 'mt-1 w-full rounded-xl border border-light-blue bg-white p-3 text-base text-ink'

interface Message {
  id: string; sender_id: string; recipient_id: string | null; parent_id: string | null;
  subject: string | null; body: string; attachment_path: string | null;
  read_at: string | null; created_at: string;
  profiles_sender?: { full_name: string };
}

export default function AdminMessagesTab() {
  const [messages, setMessages] = useState<Message[]>([])
  const [students, setStudents] = useState<{ id: string, full_name: string, student_no: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [to, setTo] = useState<string>('all')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const [mRes, sRes] = await Promise.all([
      supabase.from('messages').select('*, profiles_sender:sender_id(full_name)').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, full_name, student_no').eq('role', 'student').eq('active', true).order('student_no')
    ])
    if (!mRes.error) setMessages(mRes.data || [])
    if (!sRes.error) setStudents(sRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  async function sendMessage() {
    if (!supabase) return
    if (!body.trim()) { setError('نص الرسالة مطلوب.'); return }
    setBusy(true); setError(null)

    let path: string | null = null
    if (file) {
      const uuid = crypto.randomUUID()
      path = `messages/${uuid}.${file.name.split('.').pop()}`
      const { error: upErr } = await supabase.storage.from('platform-files').upload(path, file)
      if (upErr) { setError('فشل رفع المرفق: ' + upErr.message); setBusy(false); return }
    }

    const { error: insErr } = await supabase.from('messages').insert({
      sender_id: (await supabase.auth.getUser()).data.user?.id,
      recipient_id: to === 'all' ? null : to, // ⬅️ تم التعديل هنا
      subject: subject.trim() || null,
      body: body.trim(),
      attachment_path: path
    })

    setBusy(false)
    if (insErr) { setError(insErr.message); return }
    setSubject(''); setBody(''); setFile(null); setTo('all');
    await load()
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-gradient-to-l from-primary to-primary-hover p-6 text-white shadow-md">
        <h2 className="text-3xl font-bold">مراسلة الطلاب</h2>
        <p className="mt-1 text-base text-white/85">إرسال رسائل خاصة أو تعميمات لجميع الطلاب، والاطلاع على ردودهم.</p>
      </section>

      {error && <p className="rounded-xl bg-error-soft p-3 text-error">{error}</p>}

      <section className={card}>
        <h3 className="mb-4 text-xl font-bold text-primary">✉️ رسالة جديدة</h3>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-semibold">المرسل إليه</label>
              <select className={input} value={to} onChange={(e) => setTo(e.target.value)}>
                <option value="all">📢 جميع الطلاب (تعميم)</option>
                {students.map(s => (
                  <option key={s.id} value={s.id}>{s.full_name} ({s.student_no})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-semibold">الموضوع (اختياري)</label>
              <input className={input} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="عنوان الرسالة..." />
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold">نص الرسالة أو الملاحظة</label>
            <textarea className={input} rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-semibold">مرفق (اختياري)</label>
            <input type="file" className={input} onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <button className={btn} onClick={() => void sendMessage()} disabled={busy}>{busy ? 'جارٍ الإرسال...' : 'إرسال'}</button>
        </div>
      </section>

      <section className={card}>
        <h3 className="mb-4 text-xl font-bold text-primary">📥 سجل المراسلات</h3>
        {loading ? <p>جارٍ التحميل...</p> : (
          <ul className="space-y-3">
            {messages.map(m => (
              <li key={m.id} className={`rounded-xl border p-4 ${m.recipient_id ? 'border-light-blue bg-white' : 'border-warning bg-warning-soft/10'}`}>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-light-blue/50 pb-2 mb-2">
                  <div>
                    <span className="font-bold text-primary">{m.profiles_sender?.full_name}</span>
                    <span className="mx-2 text-ink-muted">←</span>
                    <span className="font-semibold text-ink">{m.recipient_id ? students.find(s => s.id === m.recipient_id)?.full_name : 'جميع الطلاب (تعميم)'}</span>
                  </div>
                  <span className="text-xs text-ink-muted">{new Date(m.created_at).toLocaleString('ar-SA')}</span>
                </div>
                {m.subject && <div className="font-bold text-ink mb-1">الموضوع: {m.subject}</div>}
                <p className="whitespace-pre-wrap text-sm text-ink">{m.body}</p>
                {m.attachment_path && (
                  <a href={m.attachment_path} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-primary hover:underline">📎 عرض المرفق</a>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}