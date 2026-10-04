-- المرحلة 3: أساس المستخدمين والأدوار
-- التشغيل: Supabase → SQL Editor → الصق الملف كاملًا → Run (مرة واحدة).
-- المبدأ: الصلاحيات في قاعدة البيانات نفسها (RLS) لا في إخفاء عناصر الواجهة.

-- 1) جدول المستخدمين (يمتد من auth.users ولا يخزّن كلمات المرور)
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null check (length(trim(full_name)) > 0),
  student_no  text unique,                                      -- للطالب فقط
  role        text not null check (role in ('teacher', 'student')),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  constraint profiles_student_no_required
    check (role <> 'student' or student_no is not null)
);

-- 2) تفعيل RLS: بدونها يستطيع أي مستخدم مسجَّل قراءة الجدول كله
alter table public.profiles enable row level security;

-- 3) دالة مساعدة: هل المستخدم الحالي أستاذ مفعّل؟
--    SECURITY DEFINER لتجنّب الدوران اللانهائي عند استخدامها داخل سياسات الجدول نفسه.
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and role = 'teacher'
      and active
  );
$$;

revoke all on function public.is_teacher() from public, anon;
grant execute on function public.is_teacher() to authenticated;

-- 4) السياسات: قراءة فقط
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));              -- كل مستخدم يقرأ ملفه فقط

drop policy if exists "profiles_select_teacher" on public.profiles;
create policy "profiles_select_teacher"
  on public.profiles for select to authenticated
  using (public.is_teacher());                   -- الأستاذ يقرأ كل الملفات

-- 5) الصلاحيات على الجدول: قراءة فقط عبر الـ API.
--    لا توجد سياسات إدراج/تعديل/حذف عمدًا: لا يستطيع أي مستخدم تغيير دوره أو دور غيره.
--    الإضافة والتعديل تتمان من SQL Editor الآن، ومن Edge Function آمنة عند إضافة الطلاب.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
