import { useAuth } from '../../app/auth-context'
import Button from '../../components/Button'
import CenteredCard from '../../components/CenteredCard'

// صفحة مؤقتة لمن دوره student. واجهة الطالب الحقيقية في مرحلة لاحقة.
export default function StudentHomePage() {
  const { signOut } = useAuth()
  return (
    <CenteredCard>
      <h1 className="text-3xl font-bold leading-tight text-primary">فقه المعاملات</h1>
      <p className="mt-4 text-lg text-ink">حسابك مفعّل. واجهة الطالب قيد الإعداد.</p>
      <div className="mt-8">
        <Button variant="outline" onClick={signOut}>تسجيل الخروج</Button>
      </div>
    </CenteredCard>
  )
}
