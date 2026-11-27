import { useEffect, useMemo, useState, type ReactNode } from 'react'
import AppShell, { type ShellTab } from '../../components/AppShell'
import AttendanceTab from './AttendanceTab'
import GradesTab from './GradesTab'
import HomeTab from './HomeTab'
import PostsTab from './PostsTab'
import QuizSetsTab from './QuizSetsTab'
import ReportsTab from './ReportsTab'
import StudentsTab from './StudentsTab'
// مخفي مؤقتاً (الملف محفوظ للاسترجاع): import TablesTab from './TablesTab'
import WeeksTab from './WeeksTab'
import AssignmentsTab from './AssignmentsTab'
import AdminMessagesTab from './AdminMessagesTab'
import FinalGradesTab from './FinalGradesTab'
import AdminPracticeExamsTab from './AdminPracticeExamsTab'
import { useUnreadMessages } from '../shared/useUnreadMessages'

const BASE_TABS: ShellTab[] = [
  { key: 'home', label: 'الرئيسة', group: 'عام' },
  { key: 'weeks', label: 'الأسابيع والدروس', group: 'التدريس' },
  { key: 'bank', label: 'بنك الأسئلة', group: 'التقييم' },
  { key: 'practice', label: 'الاختبارات التدريبية', group: 'التقييم' },
  { key: 'assignments', label: 'التكاليف', group: 'التقييم' },
  { key: 'grades', label: 'التصحيح', group: 'التقييم' },
  { key: 'students', label: 'الطلاب', group: 'الطلاب' },
  { key: 'attendance', label: 'الحضور والغياب', group: 'الطلاب' },
  { key: 'final', label: 'النتائج النهائية', group: 'النتائج' },
  { key: 'reports', label: 'التقارير', group: 'النتائج' },
  { key: 'comm', label: 'التواصل', group: 'المتابعة' }
]

function CommHub({ unreadCount, onRead }: { unreadCount: number; onRead: () => void }) {
  const [sub, setSub] = useState<'posts' | 'messages'>('posts')
  const [loaded, setLoaded] = useState<string[]>(['posts'])

  useEffect(() => {
    setLoaded((prev) => (prev.includes(sub) ? prev : [...prev, sub]))
  }, [sub])

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-xl border border-light-blue bg-white p-1 shadow-sm">
        <button
          type="button"
          onClick={() => setSub('posts')}
          className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
            sub === 'posts' ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary-soft'
          }`}
        >
          📢 المنصة (عامة)
        </button>
        <button
          type="button"
          onClick={() => setSub('messages')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-bold transition ${
            sub === 'messages' ? 'bg-primary text-white shadow-sm' : 'text-primary hover:bg-primary-soft'
          }`}
        >
          <span>💬 المراسلة والتعميمات</span>
          {unreadCount > 0 && (
            <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-error px-1.5 py-0.5 text-xs font-bold text-white">
              {unreadCount}
            </span>
          )}
        </button>
      </div>
      {loaded.includes('posts') && (
        <div style={{ display: sub === 'posts' ? 'block' : 'none' }}>
          <PostsTab />
        </div>
      )}
      {loaded.includes('messages') && (
        <div style={{ display: sub === 'messages' ? 'block' : 'none' }}>
          <AdminMessagesTab onRead={onRead} />
        </div>
      )}
    </div>
  )
}

export default function AdminPage() {
  const [tab, setTab] = useState('home')
  const [mounted, setMounted] = useState<string[]>(['home'])
  const { counts: unreadCounts, refresh: refreshUnread } = useUnreadMessages()

  useEffect(() => {
    setMounted((prev) => (prev.includes(tab) ? prev : [...prev, tab]))
  }, [tab])

  const tabs = useMemo<ShellTab[]>(
    () =>
      BASE_TABS.map((t) =>
        t.key === 'comm' && unreadCounts.directCount > 0
          ? { ...t, label: `🔴 التواصل (${unreadCounts.directCount})` }
          : t,
      ),
    [unreadCounts.directCount],
  )

  const panels: { key: string; node: ReactNode }[] = [
    { key: 'home', node: <HomeTab /> },
    { key: 'weeks', node: <WeeksTab /> },
    { key: 'bank', node: <QuizSetsTab /> },
    { key: 'practice', node: <AdminPracticeExamsTab /> },
    { key: 'assignments', node: <AssignmentsTab /> },
    { key: 'grades', node: <GradesTab /> },
    { key: 'students', node: <StudentsTab /> },
    { key: 'attendance', node: <AttendanceTab /> },
    { key: 'final', node: <FinalGradesTab /> },
    { key: 'reports', node: <ReportsTab /> },
    { key: 'comm', node: <CommHub unreadCount={unreadCounts.directCount} onRead={refreshUnread} /> },
  ]

  return (
    <AppShell tabs={tabs} current={tab} onChange={setTab}>
      {panels.map(({ key, node }) =>
        mounted.includes(key) ? (
          <div key={key} style={{ display: tab === key ? 'block' : 'none' }}>
            {node}
          </div>
        ) : null
      )}
    </AppShell>
  )
}
