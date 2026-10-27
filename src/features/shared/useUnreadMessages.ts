import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../app/auth-context'

export interface UnreadCounts {
  directCount: number
  announcementCount: number
  total: number
}

/**
 * عدّاد الشارة الحمراء.
 * - طالب: رسائل مباشرة غير مقروءة + إعلانات لم يفتحها.
 * - أستاذ: رسائل مباشرة غير مقروءة فقط.
 * يُحدَّث تلقائياً عند أي تغيير في الجداول الثلاثة (Realtime).
 */
export function useUnreadMessages() {
  const { profile } = useAuth()
  const [counts, setCounts] = useState<UnreadCounts>({
    directCount: 0,
    announcementCount: 0,
    total: 0,
  })

  const refresh = useCallback(async () => {
    if (!supabase || !profile) {
      setCounts({ directCount: 0, announcementCount: 0, total: 0 })
      return
    }

    const directRes = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('recipient_id', profile.id)
      .is('read_at', null)
    const directCount = directRes.count ?? 0

    let announcementCount = 0
    if (profile.role === 'student') {
      const [totalRes, readRes] = await Promise.all([
        supabase.from('announcements').select('id', { count: 'exact', head: true }),
        supabase.from('announcement_reads').select('announcement_id').eq('student_id', profile.id),
      ])
      const total = totalRes.count ?? 0
      const read = (readRes.data ?? []).length
      announcementCount = Math.max(0, total - read)
    }

    setCounts({
      directCount,
      announcementCount,
      total: directCount + announcementCount,
    })
  }, [profile])

  useEffect(() => {
    void refresh()
    if (!supabase || !profile) return

    const channel = supabase
      .channel('unread-messages-badge')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        void refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        void refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_reads' }, () => {
        void refresh()
      })
      .subscribe()

    return () => {
      supabase!.removeChannel(channel)
    }
  }, [refresh, profile])

  return { counts, refresh }
}