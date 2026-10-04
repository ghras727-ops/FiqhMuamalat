/** أدوار المستخدمين في المنصة. */
export type UserRole = 'teacher' | 'student'

/** صف من جدول profiles. */
export interface Profile {
  id: string
  full_name: string
  student_no: string | null
  role: UserRole
  active: boolean
  created_at: string
}
