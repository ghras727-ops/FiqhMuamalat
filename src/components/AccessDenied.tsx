import { useAuth } from '../app/auth-context'
import { navigate } from '../app/router'
import Button from './Button'
import CenteredCard from './CenteredCard'

export default function AccessDenied() {
  const { signOut } = useAuth()
  return (
    <CenteredCard>
      <h1 className="text-2xl font-bold text-primary">لا تملك صلاحية الوصول</h1>
      <p className="mt-3 text-ink">هذه الصفحة مخصصة للأستاذ فقط.</p>
      <div className="mt-8 space-y-3">
        <Button onClick={() => navigate('/student')}>العودة إلى صفحتي</Button>
        <Button variant="outline" onClick={signOut}>تسجيل الخروج</Button>
      </div>
    </CenteredCard>
  )
}
