# إعداد المرحلة 3: المصادقة والأدوار (الأستاذ فقط)

نفّذ الخطوات بالترتيب. لا تضع أي مفتاح سري في المشروع.

## 1) ملف البيئة
1. انسخ `.env.example` إلى `.env.local` (بجانب `package.json`).
2. املأ `VITE_SUPABASE_URL` (من Settings → Data API) و`VITE_SUPABASE_PUBLISHABLE_KEY` (المفتاح العام `sb_publishable_…` أو `anon`).
3. الملف `.env.local` مستبعد من GitHub تلقائيًا. تأكد أنه لا يظهر في GitHub Desktop.

## 2) إنشاء الجدول والسياسات
1. في Supabase افتح **SQL Editor** ثم **New query**.
2. الصق محتوى `supabase/migrations/20261004000000_auth_profiles_foundation.sql` كاملًا واضغط **Run**.
3. المتوقع: "Success. No rows returned". ويظهر الجدول `profiles` في **Table Editor** وعليه علامة RLS مفعّلة.

## 3) إيقاف التسجيل الذاتي
**Authentication** ثم **Sign In / Providers** (قد يختلف الاسم قليلًا) وأوقف **Allow new users to sign up**. بهذا لا يستطيع أحد إنشاء حساب بنفسه، وتُنشأ الحسابات من لوحة Supabase الآن، ومن دالة الإدارة لاحقًا.

## 4) حساب الأستاذ
1. **Authentication** ثم **Users** ثم **Add user** ثم **Create new user**.
2. اكتب بريدك وكلمة مرور قوية، وفعّل **Auto Confirm User**.
3. في **SQL Editor** شغّل (بعد تعديل البريد والاسم):
```sql
insert into public.profiles (id, full_name, role)
select id, 'اسم الأستاذ', 'teacher'
from auth.users
where email = 'ضع-بريدك-هنا';
```
المتوقع: `Success. 1 row affected`. إن ظهر 0 فالبريد غير مطابق.

## 5) التشغيل
`Run-FiqhMuamalat.bat` أو `npm run dev`، ثم افتح الرابط.

## 6) قائمة الفحص
| # | الاختبار | المتوقع |
|---|---|---|
| 1 | افتح `/admin` دون دخول | يحوّلك إلى `/login` |
| 2 | اضغط "دخول" والحقول فارغة | "أدخل اسم المستخدم وكلمة المرور." |
| 3 | بريد الأستاذ مع كلمة مرور خاطئة | "اسم المستخدم أو كلمة المرور غير صحيحة." |
| 4 | بيانات الأستاذ الصحيحة | تنتقل إلى `/admin` وترى "لوحة إدارة فقه المعاملات" و"مرحبًا بك" |
| 5 | أعد تحميل الصفحة | تبقى داخل لوحة الإدارة |
| 6 | زر "تسجيل الخروج" | تعود إلى `/login`، وفتح `/admin` يعيدك للدخول |

## 7) اختبار حساب طالب تجريبي (مؤقت)
1. أضف مستخدمًا ثانيًا من **Authentication** ثم **Users** (بريد تجريبي، مع Auto Confirm User).
2. شغّل:
```sql
insert into public.profiles (id, full_name, role, student_no)
select id, 'طالب تجريبي', 'student', 'TEST001'
from auth.users where email = 'بريد-الطالب-التجريبي';
```
3. ادخل به: يجب أن تظهر صفحة "حسابك مفعّل. واجهة الطالب قيد الإعداد."
4. اكتب في الرابط `/admin`: يجب أن تظهر "لا تملك صلاحية الوصول"، وتبقى الصفحة محجوبة.
5. بعد الانتهاء احذف المستخدم التجريبي من **Authentication** ثم **Users** (يُحذف ملفه تلقائيًا).

## 8) اختبار العزل في القاعدة نفسها (مهم)
حجب الصفحة في React ليس أمانًا. هذا الفحص يتحقق من RLS مباشرة. شغّل الكتلة كاملة بعد استبدال المعرّف بمعرّف الطالب التجريبي (Authentication ثم Users ثم انسخ User UID):
```sql
begin;
set local role authenticated;
select set_config('request.jwt.claims',
  json_build_object('sub', 'ضع-UID-الطالب-هنا', 'role', 'authenticated')::text, true);

select id, full_name, role from public.profiles;   -- المتوقع: صف واحد فقط (الطالب نفسه)
select public.is_teacher();                         -- المتوقع: false
update public.profiles set role = 'teacher';        -- المتوقع: خطأ permission denied
rollback;
```
ثم كرر بمعرّف الأستاذ: يجب أن يظهر **كل** الملفات و`is_teacher()` تساوي `true`.
