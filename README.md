# فقه المعاملات (Fiqh Muamalat)

## الهدف
منصة تعليمية تفاعلية لمقرر «فقه المعاملات» لطلاب الجامعة. يدير الأستاذ الطلاب والدروس وبنك الأسئلة ويتابع الدرجات، ويدخل الطالب من رابط واحد على أي جهاز دون تثبيت.

## التقنية
- React + Vite + TypeScript
- Tailwind CSS (واجهة عربية RTL)
- Supabase (قاعدة البيانات والمصادقة) — قيد التجهيز
- PWA ثم Capacitor/Android لاحقًا

## حالة المشروع
المرحلة الثالثة: المصادقة والأدوار الأساسية (حساب الأستاذ فقط). لم تُبنَ بعد لوحة الإدارة الحقيقية ولا حسابات الطلاب ولا الدروس ولا بنك الأسئلة. خطوات الإعداد في `docs/phase-3-setup.md`.

## تشغيل نسخة التطوير
يلزم Node.js 20.19 أو أحدث (أو 22.12+).

```bash
npm install
npm run dev
```
ثم افتح الرابط الذي يظهر في الطرفية (عادةً http://localhost:5173).

أوامر أخرى: `npm run build` للبناء، `npm run lint` للفحص.

### إعداد Supabase (عند الحاجة)
انسخ `.env.example` إلى `.env.local` واملأ `VITE_SUPABASE_URL` و`VITE_SUPABASE_PUBLISHABLE_KEY` (المفتاح العام فقط). الملف `.env.local` لا يُرفع إلى GitHub، ولا يوضع فيه أبدًا مفتاح `sb_secret_` أو `service_role`. باقي الخطوات (الجدول وحساب الأستاذ) في `docs/phase-3-setup.md`.

## هيكل المجلدات
```
docs/                 الوثائق
supabase/             ترحيلات القاعدة (SQL) والدوال
src/app/              نقطة البدء والمصادقة والتوجيه
src/features/         auth/ و admin/ و student/
src/components/       مكونات مشتركة
src/lib/              عميل Supabase
src/types/            الأنواع
```
