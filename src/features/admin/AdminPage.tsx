import { useEffect, useState, type ReactNode } from 'react'
import AppShell, { type ShellTab } from '../../components/AppShell'
import AttendanceTab from './AttendanceTab'
import GradesTab from './GradesTab'
import HomeTab from './HomeTab'
import PostsTab from './PostsTab'
import QuizSetsTab from './QuizSetsTab'
import ReportsTab from './ReportsTab'
import StudentsTab from './StudentsTab'
import TablesTab from './TablesTab'
import WeeksTab from './WeeksTab'
import AssignmentsTab from './AssignmentsTab'
import MessagesTab from '../shared/MessagesTab'
import { useUnreadMessages } from '../shared/useUnreadMessages'

export default function AdminPage() {
  const [tab, setTab] = useState('home')
  const [mounted, setMounted] = useState<string[]>(['home'])
  const { counts: msgCounts } = useUnreadMessages()

  const TABS: ShellTab[] = [
    { key: 'home', label: 'الرئيسة' },
    { key: 'posts', label: 'المنشورات' },
    { key: 'students', label: 'الطلاب' },
    { key: 'attendance', label: 'الحضور والغياب' },
    { key: 'weeks', label: 'الأسابيع والدروس' },
    { key: 'assignments', label: 'التكاليف' },
    { key: 'bank', label: 'بنك الأسئلة' },
    { key: 'grades', label: 'الدرجات' },
    { key: 'reports', label: 'التقارير' },
    { key: 'messages', label: msgCounts.directCount > 0 ? `🔴 مراسلة الطلاب (${msgCounts.directCount})` : 'مراسلة الطلاب' },
    { key: 'db', label: 'الجداول' },
  ]

  useEffect(() => {
    setMounted((prev) => (prev.includes(tab) ? prev : [...prev, tab]))
  }, [tab])

  const panels: { key: string; node: ReactNode }[] = [
    { key: 'home', node: <HomeTab /> },
    { key: 'posts', node: <PostsTab /> },
    { key: 'students', node: <StudentsTab /> },
    { key: 'attendance', node: <AttendanceTab /> },
    { key: 'weeks', node: <WeeksTab /> },
    { key: 'assignments', node: <AssignmentsTab /> },
    { key: 'bank', node: <QuizSetsTab /> },
    { key: 'grades', node: <GradesTab /> },
    { key: 'reports', node: <ReportsTab /> },
    { key: 'messages', node: <MessagesTab /> },
    { key: 'db', node: <TablesTab /> },
  ]

  return (
    <AppShell tabs={TABS} current={tab} onChange={setTab}>
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