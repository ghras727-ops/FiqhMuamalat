/** أدوار المستخدمين في المنصة. */
export type UserRole = 'teacher' | 'student'

/** صف من جدول profiles. */
export interface Profile {
  id: string
  full_name: string
  student_no: string | null
  role: UserRole
  active: boolean
  /** true = الطالب مُجبَر على تغيير كلمة المرور المؤقتة قبل دخول المقرر. */
  must_change_password: boolean
  created_at: string
}

/** صف من جدول messages (محادثات مباشرة). */
export interface Message {
  id: string
  sender_id: string
  recipient_id: string
  body: string
  read_at: string | null
  created_at: string
}

/** صف من جدول announcements (إعلانات الأستاذ). */
export interface Announcement {
  id: string
  sender_id: string
  title: string
  body: string
  created_at: string
}

/** صف من جدول announcement_reads (سجل قراءة إعلان). */
export interface AnnouncementRead {
  announcement_id: string
  student_id: string
  read_at: string
}

/** بيانات موجزة عن مستخدم آخر (للأسماء في الواجهة). */
export interface UserBrief {
  id: string
  full_name: string
  student_no?: string | null
}

/** صف من جدول message_reactions (تفاعلات الرسائل). */
export interface MessageReaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
  created_at: string
}