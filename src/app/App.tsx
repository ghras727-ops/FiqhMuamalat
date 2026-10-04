import { useEffect } from 'react'
import { useAuth } from './auth-context'
import { navigate, usePath } from './router'
import type { UserRole } from '../types'
import AccessDenied from '../components/AccessDenied'
import CenteredCard from '../components/CenteredCard'
import LoginPage from '../features/auth/LoginPage'
import ChangePasswordPage from '../features/auth/ChangePasswordPage'
import AdminPage from '../features/admin/AdminPage'
import StudentHomePage from '../features/student/StudentHomePage'

const homeFor = (role: UserRole) => (role === 'teacher' ? '/admin' : '/student')

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, true), [to])
  return null
}

function Splash() {
  return (
    <CenteredCard>
      <p className="text-lg text-primary" role="status">جارٍ التحميل…</p>
    </CenteredCard>
  )
}

export default function App() {
  const { session, profile, loading } = useAuth()
  const path = usePath()

  // جلسة بلا ملف: إما قيد التحميل أو في طريقها للرفض وتسجيل الخروج.
  if (loading || (session && !profile)) return <Splash />

  // طالب بكلمة مرور مؤقتة: لا يرى شيئًا غير شاشة التغيير، مهما كان المسار.
  if (profile?.role === 'student' && profile.must_change_password) {
    return <ChangePasswordPage />
  }

  if (path === '/login') {
    return profile ? <Redirect to={homeFor(profile.role)} /> : <LoginPage />
  }

  if (path === '/admin') {
    if (!profile) return <Redirect to="/login" />
    return profile.role === 'teacher' ? <AdminPage /> : <AccessDenied />
  }

  if (path === '/student') {
    if (!profile) return <Redirect to="/login" />
    return profile.role === 'student' ? <StudentHomePage /> : <Redirect to="/admin" />
  }

  return <Redirect to={profile ? homeFor(profile.role) : '/login'} />
}