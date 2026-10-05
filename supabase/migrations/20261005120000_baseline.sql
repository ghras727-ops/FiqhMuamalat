-- =====================================================================
-- BASELINE — توثيق Schema القاعدة الحية (FiqhMuamalat)
-- تاريخ: 2026-10-05
-- مصدرها: استعلامات قراءة فقط على القاعدة الحية
--
-- ⚠️ ملف توثيقي. لا يُطبَّق على القاعدة الحالية.
--    مكتوب بطريقة idempotent (create ... if not exists / drop ... if exists)
--    ليعمل بعد: 20261004000000_auth_profiles_foundation.sql
--    دون كسر أي شيء.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1) Sequence لأرقام الطلاب
-- ---------------------------------------------------------------------
create sequence if not exists public.student_no_seq
  as bigint
  start with 10001
  increment by 1
  minvalue 1
  maxvalue 9223372036854775807
  no cycle;

-- ---------------------------------------------------------------------
-- 2) الجداول
-- ---------------------------------------------------------------------

-- 2.1 profiles
create table if not exists public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  full_name             text not null,
  student_no            text,
  role                  text not null,
  active                boolean not null default true,
  created_at            timestamptz not null default now(),
  must_change_password  boolean not null default false,
  university_no         text
);

-- إضافة الأعمدة إن كان الجدول قد أُنشئ سابقًا بنسخة ناقصة
alter table public.profiles
  add column if not exists must_change_password boolean not null default false;
alter table public.profiles
  add column if not exists university_no text;

-- 2.2 weeks
create table if not exists public.weeks (
  id          uuid primary key default gen_random_uuid(),
  number      integer not null,
  title       text not null,
  summary     text,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- 2.3 lessons
create table if not exists public.lessons (
  id          uuid primary key default gen_random_uuid(),
  week_id     uuid not null,
  title       text not null,
  body        text,
  position    integer not null default 0,
  published   boolean not null default false,
  created_at  timestamptz not null default now()
);

-- 2.4 materials
create table if not exists public.materials (
  id             uuid primary key default gen_random_uuid(),
  week_id        uuid not null,
  lesson_id      uuid,
  title          text not null,
  kind           text not null,
  view_path      text,
  download_path  text,
  url            text,
  position       integer not null default 0,
  published      boolean not null default false,
  created_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 3) القيود (idempotent)
-- ---------------------------------------------------------------------
do $$ begin
  alter table public.profiles
    add constraint profiles_full_name_check
      check (length(trim(full_name)) > 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles
    add constraint profiles_role_check
      check (role in ('teacher','student'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles
    add constraint profiles_student_no_required
      check (role <> 'student' or student_no is not null);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles
    add constraint profiles_student_no_format
      check (student_no is null or student_no ~ '^[A-Z]{2}[0-9]{4,8}$');
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.profiles
    add constraint profiles_university_no_format
      check (university_no is null
             or (length(btrim(university_no)) between 1 and 30
                 and university_no = btrim(university_no)));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.weeks
    add constraint weeks_number_positive check (number >= 1);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.weeks
    add constraint weeks_title_not_empty
      check (length(trim(title)) > 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.weeks
    add constraint weeks_number_unique unique (number);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.lessons
    add constraint lessons_week_fk
      foreign key (week_id) references public.weeks(id) on delete restrict;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.lessons
    add constraint lessons_title_not_empty
      check (length(trim(title)) > 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.lessons
    add constraint lessons_id_week_unique unique (id, week_id);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.materials
    add constraint materials_week_fk
      foreign key (week_id) references public.weeks(id) on delete restrict;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.materials
    add constraint materials_lesson_week_fk
      foreign key (lesson_id, week_id)
      references public.lessons(id, week_id) on delete restrict;
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.materials
    add constraint materials_title_not_empty
      check (length(trim(title)) > 0);
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.materials
    add constraint materials_kind_check
      check (kind in ('slides','document','link'));
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.materials
    add constraint materials_kind_content_check
      check (
        (kind = 'link' and url is not null
                       and view_path is null
                       and download_path is null)
        or
        (kind in ('slides','document') and url is null
                                       and (view_path is not null
                                            or download_path is not null))
      );
exception when duplicate_object then null; end $$;

do $$ begin
  alter table public.materials
    add constraint materials_https_only
      check (url is null or url ~ '^https://');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------
-- 4) الفهارس
-- ---------------------------------------------------------------------
create unique index if not exists profiles_student_no_key
  on public.profiles (student_no);

create unique index if not exists profiles_university_no_uidx
  on public.profiles (university_no)
  where university_no is not null;

create index if not exists lessons_week_position_idx
  on public.lessons (week_id, position);

create index if not exists materials_week_position_idx
  on public.materials (week_id, position);

-- ---------------------------------------------------------------------
-- 5) الدوال المساعدة
-- ---------------------------------------------------------------------
create or replace function public.is_teacher()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid())
      and role = 'teacher'
      and active
  );
$$;

create or replace function public.is_active_student()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role = 'student'
      and p.active = true
      and p.must_change_password = false
  );
$$;

create or replace function public.next_student_no()
returns text
language sql
security definer
set search_path = ''
as $$
  select 'FM' || case
    when s.n < 10000 then lpad(s.n::text, 4, '0')
    else s.n::text
  end
  from (select nextval('public.student_no_seq') as n) s;
$$;

create or replace function public.profiles_lock_student_no()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.student_no is distinct from old.student_no then
    raise exception 'student_no is immutable';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 6) Trigger
-- ---------------------------------------------------------------------
drop trigger if exists trg_profiles_lock_student_no on public.profiles;
create trigger trg_profiles_lock_student_no
  before update on public.profiles
  for each row execute function public.profiles_lock_student_no();

-- ---------------------------------------------------------------------
-- 7) RLS
-- ---------------------------------------------------------------------
alter table public.profiles  enable row level security;
alter table public.weeks     enable row level security;
alter table public.lessons   enable row level security;
alter table public.materials enable row level security;

-- profiles
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles_select_teacher" on public.profiles;
drop policy if exists "profiles_teacher_select" on public.profiles;
create policy "profiles_teacher_select"
  on public.profiles for select to authenticated
  using (public.is_teacher());

drop policy if exists "profiles_teacher_update_students" on public.profiles;
create policy "profiles_teacher_update_students"
  on public.profiles for update to authenticated
  using (public.is_teacher() and role = 'student')
  with check (role = 'student');

-- weeks
drop policy if exists "weeks_student_select_published" on public.weeks;
create policy "weeks_student_select_published"
  on public.weeks for select to authenticated
  using (published = true and public.is_active_student());

drop policy if exists "weeks_teacher_all" on public.weeks;
create policy "weeks_teacher_all"
  on public.weeks for all to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

-- lessons
drop policy if exists "lessons_student_select_published" on public.lessons;
create policy "lessons_student_select_published"
  on public.lessons for select to authenticated
  using (
    published = true
    and public.is_active_student()
    and exists (
      select 1 from public.weeks w
      where w.id = lessons.week_id and w.published = true
    )
  );

drop policy if exists "lessons_teacher_all" on public.lessons;
create policy "lessons_teacher_all"
  on public.lessons for all to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

-- materials
drop policy if exists "materials_student_select_published" on public.materials;
create policy "materials_student_select_published"
  on public.materials for select to authenticated
  using (
    published = true
    and public.is_active_student()
    and exists (
      select 1 from public.weeks w
      where w.id = materials.week_id and w.published = true
    )
    and (
      lesson_id is null
      or exists (
        select 1 from public.lessons l
        where l.id = materials.lesson_id
          and l.week_id = materials.week_id
          and l.published = true
      )
    )
  );

drop policy if exists "materials_teacher_all" on public.materials;
create policy "materials_teacher_all"
  on public.materials for all to authenticated
  using (public.is_teacher())
  with check (public.is_teacher());

-- ---------------------------------------------------------------------
-- 8) Storage bucket + policies
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-files',
  'course-files',
  false,
  52428800,
  array[
    'application/pdf',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]::text[]
)
on conflict (id) do update set
  public             = excluded.public,
  file_size_limit    = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "course_files_teacher_insert" on storage.objects;
create policy "course_files_teacher_insert"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'course-files' and public.is_teacher());

drop policy if exists "course_files_teacher_select" on storage.objects;
create policy "course_files_teacher_select"
  on storage.objects for select to authenticated
  using (bucket_id = 'course-files' and public.is_teacher());

drop policy if exists "course_files_teacher_update" on storage.objects;
create policy "course_files_teacher_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'course-files' and public.is_teacher())
  with check (bucket_id = 'course-files' and public.is_teacher());

drop policy if exists "course_files_teacher_delete" on storage.objects;
create policy "course_files_teacher_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'course-files' and public.is_teacher());

drop policy if exists "course_files_student_select" on storage.objects;
create policy "course_files_student_select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'course-files'
    and public.is_active_student()
    and exists (
      select 1
      from public.materials m
      join public.weeks w on w.id = m.week_id
      left join public.lessons l on l.id = m.lesson_id and l.week_id = m.week_id
      where m.published = true
        and w.published = true
        and (m.lesson_id is null or l.published = true)
        and (objects.name = m.view_path or objects.name = m.download_path)
    )
  );

-- ---------------------------------------------------------------------
-- 9) Grants
-- ---------------------------------------------------------------------
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

revoke all on public.weeks     from anon, authenticated;
revoke all on public.lessons   from anon, authenticated;
revoke all on public.materials from anon, authenticated;
grant select, insert, update, delete
  on public.weeks, public.lessons, public.materials
  to authenticated;

grant usage, select on sequence public.student_no_seq to service_role;

revoke all on function public.is_teacher()             from public, anon;
revoke all on function public.is_active_student()      from public, anon;
revoke all on function public.next_student_no()        from public, anon, authenticated;
revoke all on function public.profiles_lock_student_no() from public, anon, authenticated;

grant execute on function public.is_teacher()        to authenticated;
grant execute on function public.is_active_student() to authenticated;
grant execute on function public.next_student_no()   to service_role;
-- profiles_lock_student_no: لا يُمنح لأحد — يستدعيه الـ trigger فقط