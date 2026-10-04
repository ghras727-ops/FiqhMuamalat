import { useAuth } from '../../app/auth-context'
import Button from '../../components/Button'
import CenteredCard from '../../components/CenteredCard'

// صفحة إدارة أولية فقط. لوحة الإدارة الحقيقية في مرحلة لاحقة.
export default function AdminPage() {
  const { signOut } = useAuth()
  return (
    <CenteredCard>
      <h1 className="text-3xl font-bold leading-tight text-primary">لوحة إدارة فقه المعاملات</h1>
      <p className="mt-4 text-lg text-ink">مرحبًا بك</p>
      <div className="mt-8">
        <Button variant="outline" onClick={signOut}>تسجيل الخروج</Button>
      </div>
    </CenteredCard>
  )
}
