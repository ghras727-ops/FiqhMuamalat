import { useCallback, useEffect, useMemo, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../app/auth-context'

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

/**
 * الجلب المطلوب: select('*, profiles_sender:sender_id(full_name)').
 * إن فشل التضمين (لعدم وجود مفتاح أجنبي sender_id → profiles) نرجع لجلب عادي
 * ثم نملأ الأسماء من جدول profiles حتى لا تتعطل الشاشة.
 */
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

export default function AdminMessagesTab() {
  const { profile } = useAuth()
  const meId = profile?.id

  const [messages, setMessages] = useState<Message[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState<Notice>(null)

  const [to, setTo] = useState<string>('all')
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileKey, setFileKey] = useState(0) // لتفريغ حقل الملف بعد الإرسال

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
    if (mRes.error) notify('error', `تعذّر جلب الرسائل: ${mRes.error}`)
    else setMessages(mRes.rows.filter((m) => !m.is_deleted))
    if (sRes.error) notify('error', `تعذّر جلب قائمة الطلاب: ${sRes.error.message}`)
    else setStudents((sRes.data ?? []) as Student[])
    setLoading(false)
  }, [meId, notify])

  useEffect(() => {
    void load()
  }, [load])

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
      if (path) await supabase.storage.from(BUCKET).remove([path]) // لا نترك مرفقاً يتيماً
      const nullProblem = /recipient_id/.test(insErr.message) && /null/i.test(insErr.message)
      notify(
        'error',
        nullProblem
          ? 'قاعدة البيانات لا تقبل recipient_id فارغاً (التعميم). نفّذ أمر SQL الخاص بإلغاء NOT NULL أولاً.'
          : `فشل الإرسال: ${insErr.message}`,
      )
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

  if (!profile) return null

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
        ) : messages.length === 0 ? (
          <p className="text-center text-ink-muted">لا توجد رسائل بعد.</p>
        ) : (
          <ul className="space-y-3">
            {messages.map((m) => {
              const isPublic = m.recipient_id === null
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
                      className="mt-2 text-sm font-semibold text-primary hover:underline"
                    >
                      عرض المرفق
                    </button>
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