export type QType = 'mcq' | 'tf' | 'short' | 'essay'
export type Grading = 'auto' | 'auto_review' | 'manual'
export type ActStatus = 'draft' | 'open' | 'closed'
export type Release = 'immediate' | 'after_close' | 'manual'

export const qTypeLabel: Record<QType, string> = {
  mcq: 'اختيار من متعدد',
  tf: 'صح/خطأ',
  short: 'إجابة قصيرة',
  essay: 'مقالي',
}
export const gradingLabel: Record<Grading, string> = {
  auto: 'آلي',
  auto_review: 'آلي ثم مراجعة',
  manual: 'مراجعة الأستاذ',
}
export const statusLabel: Record<ActStatus, string> = {
  draft: 'مسودة',
  open: 'مفتوح',
  closed: 'مغلق',
}
export const releaseLabel: Record<Release, string> = {
  immediate: 'فور التسليم',
  after_close: 'بعد الإغلاق',
  manual: 'يدويًا',
}

export interface DemoStudent {
  no: string
  name: string
  universityNo: string | null
  active: boolean
  mustChange: boolean
}
export const demoStudents: DemoStudent[] = [
  { no: 'FM0001', name: 'أحمد محمد العتيبي', universityNo: null, active: true, mustChange: false },
  { no: 'FM0002', name: 'خالد عبدالله القحطاني', universityNo: '441002345', active: true, mustChange: true },
  { no: 'FM0003', name: 'سارة فهد الدوسري', universityNo: null, active: true, mustChange: false },
  { no: 'FM0004', name: 'محمد سعد الشمري', universityNo: '441009876', active: false, mustChange: false },
  { no: 'FM0005', name: 'نورة علي الحربي', universityNo: null, active: true, mustChange: true },
]

export interface DemoLesson { id: string; title: string; published: boolean }
export interface DemoWeek { id: string; number: number; title: string; published: boolean; lessons: DemoLesson[] }
export const demoWeeks: DemoWeek[] = [
  { id: 'w1', number: 1, title: 'مدخل إلى فقه المعاملات', published: true, lessons: [
    { id: 'l1', title: 'مفهوم المعاملات المالية', published: true },
    { id: 'l2', title: 'أركان العقد وشروطه', published: true } ] },
  { id: 'w2', number: 2, title: 'عقد البيع', published: true, lessons: [
    { id: 'l3', title: 'أنواع البيوع', published: true },
    { id: 'l4', title: 'البيوع المنهي عنها', published: true } ] },
  { id: 'w3', number: 3, title: 'الربا', published: false, lessons: [
    { id: 'l5', title: 'تعريف الربا وأنواعه', published: false },
    { id: 'l6', title: 'صور معاصرة', published: false } ] },
]

export interface DemoMaterial { id: string; title: string; kind: string; size: string; weekId: string; published: boolean }
export const demoMaterials: DemoMaterial[] = [
  { id: 'm1', title: 'عرض: أركان العقد', kind: 'PPTX', size: '2.4 MB', weekId: 'w1', published: true },
  { id: 'm2', title: 'مذكرة: أنواع البيوع', kind: 'PDF', size: '1.1 MB', weekId: 'w2', published: true },
  { id: 'm3', title: 'ملخص الدرس', kind: 'DOCX', size: '0.3 MB', weekId: 'w2', published: true },
  { id: 'm4', title: 'مراجع الربا', kind: 'PDF', size: '3.2 MB', weekId: 'w3', published: false },
]

export interface DemoTopic { id: string; name: string }
export const demoTopics: DemoTopic[] = [
  { id: 't1', name: 'أركان العقد' },
  { id: 't2', name: 'أنواع البيوع' },
  { id: 't3', name: 'الربا' },
]

export interface DemoQuestion {
  id: string
  text: string
  type: QType
  topicId: string
  grading: Grading
  options?: string[]
  answer?: string
}
export const demoQuestions: DemoQuestion[] = [
  { id: 'q1', text: 'ما حكم بيع ما لا يملكه البائع؟', type: 'mcq', topicId: 't2', grading: 'auto',
    options: ['جائز مطلقًا', 'لا يجوز', 'جائز بإذن المالك'], answer: 'لا يجوز' },
  { id: 'q2', text: 'عرّف الربا مع التمثيل', type: 'essay', topicId: 't3', grading: 'manual' },
  { id: 'q3', text: 'الغرر اليسير مغتفر في العقود', type: 'tf', topicId: 't1', grading: 'auto', answer: 'صح' },
  { id: 'q4', text: 'أكمل: يشترط في المبيع أن يكون …', type: 'short', topicId: 't1', grading: 'auto_review', answer: 'معلومًا مقدورًا على تسليمه' },
]

export interface DemoActivity {
  id: string
  title: string
  kind: 'تدريب' | 'اختبار'
  weekId: string
  max: number
  status: ActStatus
  release: Release
  released: boolean
  questionIds: string[]
}
export const demoActivities: DemoActivity[] = [
  { id: 'a1', title: 'تدريب: أركان العقد', kind: 'تدريب', weekId: 'w1', max: 10, status: 'open', release: 'immediate', released: true, questionIds: ['q3', 'q4'] },
  { id: 'a2', title: 'اختبار قصير 1', kind: 'اختبار', weekId: 'w2', max: 20, status: 'closed', release: 'after_close', released: true, questionIds: ['q1', 'q3'] },
  { id: 'a3', title: 'اختبار الربا', kind: 'اختبار', weekId: 'w3', max: 20, status: 'draft', release: 'manual', released: false, questionIds: ['q2'] },
]

export interface DemoResult { studentNo: string; activityId: string; score: number }
export const demoResults: DemoResult[] = [
  { studentNo: 'FM0001', activityId: 'a1', score: 9 },
  { studentNo: 'FM0002', activityId: 'a1', score: 7 },
  { studentNo: 'FM0003', activityId: 'a1', score: 10 },
  { studentNo: 'FM0001', activityId: 'a2', score: 17 },
  { studentNo: 'FM0002', activityId: 'a2', score: 14 },
  { studentNo: 'FM0003', activityId: 'a2', score: 19 },
  { studentNo: 'FM0005', activityId: 'a2', score: 15 },
]

export interface DemoReview { id: string; studentNo: string; questionId: string; answer: string }
export const demoReviews: DemoReview[] = [
  { id: 'r1', studentNo: 'FM0002', questionId: 'q2', answer: 'الربا هو الزيادة المشروطة في القرض، ومثاله اقتراض مئة على أن يردّ مئة وعشرة.' },
  { id: 'r2', studentNo: 'FM0005', questionId: 'q4', answer: 'معلومًا عند العقد' },
]

export const demoTopicScores = [
  { topicId: 't1', percent: 82 },
  { topicId: 't2', percent: 64 },
  { topicId: 't3', percent: 41 },
]

export const demoTables = [
  ['profiles', 'الحسابات', '1 و 2', true],
  ['weeks', 'الأسابيع', '1', true],
  ['lessons', 'الدروس', '1', true],
  ['materials', 'المواد', '1', true],
  ['content_views', 'مشاهدات المحتوى', '4', false],
  ['topics', 'المواضيع', '5', false],
  ['questions', 'الأسئلة', '5', false],
  ['question_options', 'خيارات الأسئلة', '5', false],
  ['question_keys', 'مفاتيح الإجابة', '5', false],
  ['activities', 'الأنشطة', '6', false],
  ['activity_questions', 'أسئلة النشاط', '6', false],
  ['attempts', 'المحاولات', '6', false],
  ['answers', 'الإجابات', '6', false],
  ['answer_grades', 'درجات الإجابات', '6', false],
  ['attempt_results', 'نتائج المحاولات', '6', false],
] as const

export type PostKind = 'إعلان' | 'درس' | 'ملف' | 'نقاش'

export interface DemoPost {
  id: string
  title: string
  body: string
  kind: PostKind
  date: string
  pinned: boolean
  materialId?: string
  likes: number
}
export const demoPosts: DemoPost[] = [
  { id: 'p1', title: 'مرحبًا بكم في مقرر فقه المعاملات', body: 'نبدأ هذا الفصل بإذن الله. تابعوا المنشورات هنا، وشاركوا بأسئلتكم وتعليقاتكم باحترام.', kind: 'إعلان', date: 'قبل 3 أيام', pinned: true, likes: 4 },
  { id: 'p2', title: 'درس الأسبوع الأول: مفهوم المعاملات المالية', body: 'نتناول في هذا الدرس تعريف المعاملات المالية وأقسامها وأهميتها. اقرأوا الدرس قبل المحاضرة القادمة.', kind: 'درس', date: 'قبل يومين', pinned: false, likes: 3 },
  { id: 'p3', title: 'عرض: أركان العقد', body: 'العرض التقديمي لدرس أركان العقد وشروطه. حمّلوه وراجعوه قبل التدريب.', kind: 'ملف', date: 'أمس', pinned: false, materialId: 'm1', likes: 5 },
  { id: 'p4', title: 'سؤال للنقاش: الغرر اليسير والكثير', body: 'ما الفرق بين الغرر اليسير والغرر الكثير؟ اذكروا مثالًا لكل منهما.', kind: 'نقاش', date: 'اليوم', pinned: false, likes: 2 },
]

export interface DemoComment { id: string; postId: string; author: string; text: string }
export const demoComments: DemoComment[] = [
  { id: 'c1', postId: 'p4', author: 'سارة فهد الدوسري', text: 'الغرر اليسير ما جرت العادة بالتسامح فيه، كجهالة أساس الجدار في بيع الدار.' },
  { id: 'c2', postId: 'p4', author: 'خالد عبدالله القحطاني', text: 'والكثير ما يفضي إلى نزاع، كبيع السمك في الماء.' },
  { id: 'c3', postId: 'p3', author: 'أحمد محمد العتيبي', text: 'جزاكم الله خيرًا، العرض واضح.' },
]

export const demoProgress: Record<string, number> = {
  FM0001: 80,
  FM0002: 55,
  FM0003: 95,
  FM0004: 10,
  FM0005: 40,
}
