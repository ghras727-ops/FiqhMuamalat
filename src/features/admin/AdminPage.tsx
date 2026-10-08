import { useState } from 'react'
import AppShell, { type ShellTab } from '../../components/AppShell'
import GradesTab from './GradesTab'
import HomeTab from './HomeTab'
import MaterialsTab from './MaterialsTab'
import PostsTab from './PostsTab'
import QuizSetsTab from './QuizSetsTab'
import ReportsTab from './ReportsTab'
import StudentsTab from './StudentsTab'
import TablesTab from './TablesTab'
import WeeksTab from './WeeksTab'

const TABS: ShellTab[] = [
  { key: 'home', label: 'الرئيسة' },
  { key: 'posts', label: 'المنشورات' },
  { key: 'students', label: 'الطلاب' },
  { key: 'weeks', label: 'الأسابيع والدروس' },
  { key: 'materials', label: 'المواد' },
  { key: 'bank', label: 'بنك الأسئلة' },
  { key: 'grades', label: 'الدرجات' },
  { key: 'reports', label: 'التقارير' },
  { key: 'db', label: 'الجداول' },
]

export default function AdminPage() {
  const [tab, setTab] = useState('home')

  return (
    <AppShell tabs={TABS} current={tab} onChange={setTab}>
      {tab === 'home' && <HomeTab />}
      {tab === 'posts' && <PostsTab />}
      {tab === 'students' && <StudentsTab />}
      {tab === 'weeks' && <WeeksTab />}
      {tab === 'materials' && <MaterialsTab />}
      {tab === 'bank' && <QuizSetsTab />}
      {tab === 'grades' && <GradesTab />}
      {tab === 'reports' && <ReportsTab />}
      {tab === 'db' && <TablesTab />}
    </AppShell>
  )
}