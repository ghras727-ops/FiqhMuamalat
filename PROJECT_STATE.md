# PROJECT_STATE.md — فقه المعاملات (1)

> آخر تحديث: 2026-10-15
> الغرض: مرجع ثابت لأي مساعد جديد، يشرح المشروع ويوفر السياق.

---

## 1) هوية المشروع

- **الاسم**: منصة «فقه المعاملات (1)» — مقرر جامعي.
- **المسار المحلي**: `D:\FiqhMuamalat`
- **المستودع**: https://github.com/ghras727-ops/FiqhMuamalat
- **الفرع**: `main`
- **الاستضافة**: Vercel — https://fiqh-muamalat.vercel.app
- **قاعدة البيانات**: Supabase — project ref: `vtdmqveflrwavbgdaapj`
- **المدرس**: د. محمد إسماعيل
- **الطلاب**: 5 (4 حقيقيون + 1 تجريبي).

---

## 2) التقنية

- React 19 + Vite 8 + TypeScript 6 + Tailwind 4
- Supabase JS 2.117
- الخطوط: IBM Plex Sans Arabic + Cairo (للتقارير)
- الألوان الأساسية:
  - Primary: `#0B6CB3`
  - Secondary: `#198B48`
  - Accent: `#49CEF3`
  - Error: `#D74050`
  - Warning: `#DCE271`

---

## 3) قواعد العمل مع المستخدم (ملزمة)

1. **ممنوع حذف بيانات حقيقية** بدون موافقة صريحة.
2. **ممنوع ALTER/DROP** على القاعدة الحية بدون موافقة.
3. **ممنوع استعادة `.bak`** أو نسخة قديمة.
4. **كل SQL يُعرض على المستخدم** قبل التنفيذ، مع توضيح الغرض.
5. **البناء والنشر عبر أمر واحد**: `.\Push.ps1 "وصف التعديل"` — يبني، يتحقق، يرفع. لا تكتب `git add/commit/push` يدويًا.
6. **لا تعدّل `.tsx` يدويًا** بدون تأكيد النجاح عبر `npm run build`.
7. **راعِ RLS**: الطالب لا يرى إلا منشوراته/محاولاته؛ الأستاذ يرى الكل.
8. **الطالب في وضع المراجعة لا يرى الأجوبة الصحيحة** إلا بعد التصحيح، وفقط للأسئلة التي أجاب عنها.
9. **الأستاذ = مصدر الحقيقة** للتقييم والاعتماد.

---

## 4) بنية المشروع

### الواجهة الأمامية
- `src/app/` — App, router, AuthProvider, auth-context.
- `src/components/` — AppShell, Button, Tag, AttachmentView, CenteredCard, DemoBadge…
- `src/features/admin/` — 10 تبويبات:
  - HomeTab (الرئيسة)
  - PostsTab (المنشورات)
  - StudentsTab (الطلاب)
  - **AttendanceTab (الحضور والغياب)** ← جديد
  - WeeksTab (الأسابيع والدروس)
  - MaterialsTab (المواد)
  - QuizSetsTab (بنك الأسئلة)
  - GradesTab (الدرجات)
  - ReportsTab (التقارير)
  - TablesTab (الجداول)
- `src/features/student/` — StudentHomePage, WeekPacksView, SelfTestTab, FeedTab.
- `src/features/shared/` — WeeklyReport, InstitutionalReport.
- `src/lib/supabase.ts` — العميل.
- `src/types/index.ts` — الأنواع المشتركة.
- `public/UST.png` + `public/signature.png`.

### ملفات التهيئة
- `vercel.json` — SPA routing (F5 يعمل).
- `Push.ps1` — البناء + النشر الآمن.
- `.github/workflows/build-check.yml` — فحص البناء التلقائي.
- `.github/workflows/supabase-keep-alive.yml` — إبقاء Supabase نشطًا كل 3 أيام.

---

## 5) قاعدة البيانات

### الجداول
| الجدول | الغرض |
|---|---|
| `profiles` | المستخدمون (طالب/أستاذ) — يمتد من `auth.users` |
| `weeks` | الأسابيع الـ16 |
| `lessons` | الدروس داخل كل أسبوع |
| `materials` | المواد (slides/document/link) |
| `topics` | موضوعات الأسئلة |
| `questions` | الأسئلة (mcq/tf/essay_smart/essay_reasoning) |
| `question_options` | خيارات MCQ |
| `question_keys` | الإجابات الصحيحة + النموذجية + معايير التصحيح (محمي) |
| `activities` | الأنشطة (اختبر نفسك) |
| `activity_questions` | ربط الأسئلة بالأنشطة |
| `attempts` | محاولات الطلاب |
| `answers` | إجابات الطلاب |
| `posts` | منشورات المنصة |
| `post_comments` | تعليقات المنشورات |
| `post_likes` | إعجابات المنشورات |
| `weekly_reports` | التقارير المعتمدة (أسبوعي/تراكمي) |
| `retake_requests` | طلبات إعادة الاختبار |
| **`attendance`** | الحضور/الغياب/معذور لكل طالب × أسبوع |
| `student_no_seq` | تسلسل أرقام الطلاب |

### قيم مهمة
- `profiles.role`: `teacher` \| `student`
- `questions.type`: `mcq` \| `tf` \| `essay_smart` \| `essay_reasoning`
- `materials.kind`: `slides` \| `document` \| `link`
- `attempts.status`: `draft` \| `submitted` \| `graded`
- `attendance.status`: `present` \| `absent` \| `excused`
- `weekly_reports.status`: `active` \| `revoked`
- `profiles.is_test_account`: true للحساب التجريبي (FM0007) — يُستبعد من التقارير والترتيب.

### Buckets
- `course-files` (private) — مواد الدروس. 50MB. MIME: PDF/PPT/PPTX/DOC/DOCX.
- `platform-files` (private) — مرفقات المنشورات.

### RPC Functions
- `submit_attempt(activity_id, answers, submit)` — حفظ/إرسال محاولة.
- `grade_attempt(attempt_id, grades)` — تصحيح المقالي.
- `reset_attempt(attempt_id)` — إعادة تعيين محاولة + إلغاء التقارير المرتبطة.
- `request_retake(attempt_id, reason)` — طلب إعادة من الطالب.
- `approve_retake(request_id)` / `reject_retake(request_id)` — الأستاذ.
- `mark_report_seen(report_id)` — الطالب.
- `approve_weekly_report(student_id, from, to, note)` — إصدار تقرير.
- `revoke_report(report_id, reason)` — إلغاء تقرير.
- `get_my_question_notes(activity_id)` — التلميحات للطالب بعد التصحيح فقط.
- `class_ranking()` / `best_activity_score()` — إحصاءات المنصة.
- `mark_attendance(student_id, week_id, status)` — الحضور.
- `mark_all_present(week_id)` — الكل حاضرون.
- `institutional_report(from_week, to_week)` — التقرير المؤسسي.
- `is_teacher()` / `is_active_student()` — فحص الأدوار.

### Edge Functions
- `dynamic-responder` (المستخدم من AuthProvider لتغيير كلمة المرور).
- `create-students` / `smooth-task` (لإنشاء حسابات الطلاب).
- `reset-student-password` (مخطط).

---

## 6) الميزات المكتملة

| الميزة | الحالة |
|---|---|
| تسجيل الدخول + تغيير كلمة المرور | ✅ |
| المنصة (منشورات + تعليقات + إعجابات) | ✅ |
| صدارة المنصة (3 أوائل) | ✅ |
| الأسابيع والدروس والمواد | ✅ |
| عرض الملفات (PDF/PPTX/Word) داخل الصفحة | ✅ |
| بنك الأسئلة (40 سؤالًا للأسبوع 1 + 20 للأسبوع 2) | ✅ |
| اختبار الطالب (أقسام + خلاصة قبل التسليم) | ✅ |
| التصحيح الآلي + اليدوي | ✅ |
| إعادة الاختبار (ذاتي + طلب) | ✅ |
| التقارير الفردية (أسبوعي/تراكمي + PDF) | ✅ |
| **الحضور والغياب** | ✅ |
| **التقرير المؤسسي** | ✅ |
| F5 يعمل | ✅ |

---

## 7) المهام المعلّقة

- [ ] **الأسبوع 3**: إدخال أسئلته (20 سؤالًا/60 درجة).
- [ ] **تنظيف الجداول** بعد العطلة.
- [ ] **2FA** على Vercel/Supabase.
- [ ] تحليل صعوبة الأسئلة (لاحقًا).
- [ ] PWA (لاحقًا).

---

## 8) توزيع درجات الأسئلة (المعتمد)

| النوع | A1 (40 سؤالًا) | A2 (20 سؤالًا) |
|---|---|---|
| MCQ | 22 × 1 = 22 | 8 × 2 = 16 |
| TF | 15 × 1 = 15 | 8 × 2 = 16 |
| essay_smart | 4 × ~1.5 = 6 | 2 × 6 = 12 |
| essay_reasoning | 3 × ~2.66 = 8 | 2 × 8 = 16 |
| مجموع مختلف | 51 | 60 |
| **مع الحماية (cap)** | 60 | 60 |

---

## 9) حالات حسّاسة

- **FM0007** (أنس محمد): حساب تجريبي — يُستبعد من التقارير المؤسسية والترتيب.
- **الحماية من `>100%`**: تُطبَّق في `ReportsTab`, `GradesTab`, `StudentHomePage`.
- **قيد `attempts_score_guard_trg`**: يمنع أي محاولة > الحد.

---

## 10) نمط العمل المطلوب من أي مساعد

1. **افحص قبل التعديل**.
2. **اطلب موافقة صريحة** على أي SQL.
3. **اكتب كودًا كاملًا** (لا تعديلات جزئية للـ`.tsx`).
4. **اذكر الأمر**: `.\Push.ps1 "..."`.
5. **تحقق من `npm run build`** قبل تسليم المهمة.
6. **ذكّر بالمهام المعلّقة** عند الانتهاء.