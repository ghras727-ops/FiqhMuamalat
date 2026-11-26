import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../app/auth-context'

/** يُطلقه تبويب الرسائل بعد تسجيل القراءة ليُحدّث الشارة فوراً. */
export const MESSAGES_READ_EVENT = 'student-messages-read'

/**
 * عدّاد الرسائل غير المقروءة للطالب:
 * - الخاصة: recipient_id = أنا و read_at فارغ.
 * - التعميمات: recipient_id فارغ ولا يوجد لها سجل في message_reads لهذا الطالب.
 */
export function useUnreadStudentMessages() {
  const { profile } = useAuth()
  const meId = profile?.id
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!supabase || !meId) return
    const [priv, bc, reads] = await Promise.all([
      supabase.from('messages').select('id, is_deleted').eq('recipient_id', meId).is('read_at', null),
      supabase.from('messages').select('id, is_deleted').is('recipient_id', null),
      supabase.from('message_reads').select('message_id').eq('student_id', meId),
    ])
    if (priv.error || bc.error) return

    const privateUnread = ((priv.data ?? []) as { id: string; is_deleted: boolean | null }[]).filter(
      (m) => !m.is_deleted,
    ).length

    // إن تعذّر جلب message_reads (الجدول غير منشأ) لا نعدّ التعميمات حتى لا تبقى الشارة ظاهرة دائماً
    let broadcastUnread = 0
    if (!reads.error) {
      const read = new Set(((reads.data ?? []) as { message_id: string }[]).map((r) => r.message_id))
      broadcastUnread = ((bc.data ?? []) as { id: string; is_deleted: boolean | null }[]).filter(
        (m) => !m.is_deleted && !read.has(m.id),
      ).length
    }

    setCount(privateUnread + broadcastUnread)
  }, [meId])

  useEffect(() => {
    void refresh()
    if (!supabase || !meId) return

    const client = supabase
    const onRead = () => void refresh()
    window.addEventListener(MESSAGES_READ_EVENT, onRead)

    const channel = client
      .channel(`student-msg-badge-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        void refresh()
      })
      .subscribe()

    return () => {
      window.removeEventListener(MESSAGES_READ_EVENT, onRead)
      void client.removeChannel(channel)
    }
  }, [refresh, meId])

  return { count, refresh }
}
