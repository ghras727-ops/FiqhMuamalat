import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../app/auth-context'

export interface UnreadCounts {
  directCount: number
  announcementCount: number
  total: number
}

export interface UnreadState {
  counts: UnreadCounts
  status: 'connecting' | 'connected' | 'error'
  lastError: string | null
  lastSync: Date | null
}

export function useUnreadMessages() {
  const { profile } = useAuth()
  const [state, setState] = useState<UnreadState>({
    counts: { directCount: 0, announcementCount: 0, total: 0 },
    status: 'connecting',
    lastError: null,
    lastSync: null,
  })

  const mountedRef = useRef(true)
  const channelRef = useRef<ReturnType<NonNullable<typeof supabase>['channel']> | null>(null)

  const refresh = useCallback(async () => {
    if (!supabase || !profile) {
      if (mountedRef.current) {
        setState((s) => ({
          ...s,
          status: 'connected',
          counts: { directCount: 0, announcementCount: 0, total: 0 },
        }))
      }
      return
    }

    try {
      const results = await Promise.allSettled([
        supabase
          .from('messages')
          .select('id', { count: 'exact', head: true })
          .eq('recipient_id', profile.id)
          .is('read_at', null)
          .eq('is_deleted', false),

        profile.role === 'student'
          ? supabase.from('announcements').select('id').eq('is_deleted', false)
          : Promise.resolve({ data: [] as { id: string }[], error: null }),

        profile.role === 'student'
          ? supabase.from('announcement_reads').select('announcement_id').eq('student_id', profile.id)
          : Promise.resolve({ data: [] as { announcement_id: string }[], error: null }),
      ])

      let directCount = 0
      let activeAnnIds: string[] = []
      const readAnnIds = new Set<string>()
      let firstError: string | null = null

      const [directRes, activeAnnRes, readRes] = results

      if (directRes.status === 'fulfilled') {
        if (directRes.value.error) firstError = directRes.value.error.message
        else directCount = directRes.value.count ?? 0
      } else {
        firstError = String(directRes.reason)
      }

      if (activeAnnRes.status === 'fulfilled') {
        if (activeAnnRes.value.error) firstError = firstError ?? activeAnnRes.value.error.message
        else activeAnnIds = ((activeAnnRes.value.data ?? []) as { id: string }[]).map((a) => a.id)
      } else {
        firstError = firstError ?? String(activeAnnRes.reason)
      }

      if (readRes.status === 'fulfilled') {
        if (readRes.value.error) firstError = firstError ?? readRes.value.error.message
        else {
          for (const r of (readRes.value.data ?? []) as { announcement_id: string }[]) {
            readAnnIds.add(r.announcement_id)
          }
        }
      } else {
        firstError = firstError ?? String(readRes.reason)
      }

      const announcementCount =
        profile.role === 'student'
          ? activeAnnIds.filter((id) => !readAnnIds.has(id)).length
          : 0

      if (!mountedRef.current) return
      setState({
        counts: {
          directCount,
          announcementCount,
          total: directCount + announcementCount,
        },
        status: firstError ? 'error' : 'connected',
        lastError: firstError,
        lastSync: new Date(),
      })
    } catch (err: unknown) {
      if (!mountedRef.current) return
      setState((s) => ({ ...s, status: 'error', lastError: String(err) }))
    }
  }, [profile])

  useEffect(() => {
    mountedRef.current = true
    void refresh()

    if (!supabase || !profile) {
      return () => {
        mountedRef.current = false
      }
    }

    if (channelRef.current) {
      void supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    const channel = supabase
      .channel('unread-badge-' + profile.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        void refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcements' }, () => {
        void refresh()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'announcement_reads' }, () => {
        void refresh()
      })
      .subscribe((status: string) => {
        if (!mountedRef.current) return
        if (status === 'SUBSCRIBED') {
          setState((s) => ({ ...s, status: s.lastError ? 'error' : 'connected' }))
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          void refresh()
        }
      })

    channelRef.current = channel

    const pollTimer = setInterval(() => {
      void refresh()
    }, 15000)

    return () => {
      mountedRef.current = false
      clearInterval(pollTimer)
      if (channelRef.current && supabase) {
        void supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [refresh, profile])

  return { ...state, refresh }
}