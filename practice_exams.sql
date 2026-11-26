-- =====================================================================
-- الاختبارات التدريبية (Practice Exams) — مستقلة تماماً عن attempts/activities
-- مبني على بنية منصتك: profiles(full_name, student_no, role='teacher'|'student'),
-- questions(text, type, score), question_options(label, text, position),
-- question_keys(correct_option_id, correct_tf, model_answer)
-- =====================================================================

create table if not exists public.practice_exams (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  max_score    numeric not null default 20,
  is_published boolean not null default true,
  created_at   timestamptz not null default now()
);

create table if not exists public.practice_exam_questions (
  exam_id     uuid not null references public.practice_exams(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  sort_order  int  not null default 0,
  primary key (exam_id, question_id)
);

-- is_current: "إعادة المحاولة" تُخفي المحاولة السابقة عن الطالب وتبقى للأستاذ
create table if not exists public.practice_attempts (
  id         uuid primary key default gen_random_uuid(),
  exam_id    uuid not null references public.practice_exams(id) on delete cascade,
  student_id uuid not null references auth.users(id) on delete cascade,
  score      numeric not null default 0,
  is_current boolean not null default true,
  created_at timestamptz not null default now()
);

-- صح/خطأ يُحفظ في text_answer كـ 'true' أو 'false'
create table if not exists public.practice_answers (
  id            uuid primary key default gen_random_uuid(),
  attempt_id    uuid not null references public.practice_attempts(id) on delete cascade,
  question_id   uuid not null references public.questions(id) on delete cascade,
  option_id     uuid,
  text_answer   text,
  is_correct    boolean,
  awarded_score numeric not null default 0
);

create index if not exists idx_pa_student  on public.practice_attempts(student_id, exam_id);
create index if not exists idx_pans_attempt on public.practice_answers(attempt_id);

create or replace function public.is_practice_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles p
                 where p.id = auth.uid() and p.role in ('teacher','admin'));
$$;

alter table public.practice_exams          enable row level security;
alter table public.practice_exam_questions enable row level security;
alter table public.practice_attempts       enable row level security;
alter table public.practice_answers        enable row level security;

create policy pe_read  on public.practice_exams for select to authenticated
  using (is_published or public.is_practice_admin());
create policy pe_admin on public.practice_exams for all to authenticated
  using (public.is_practice_admin()) with check (public.is_practice_admin());

create policy peq_read  on public.practice_exam_questions for select to authenticated using (true);
create policy peq_admin on public.practice_exam_questions for all to authenticated
  using (public.is_practice_admin()) with check (public.is_practice_admin());

create policy pat_read on public.practice_attempts for select to authenticated
  using (student_id = auth.uid() or public.is_practice_admin());

create policy pans_read on public.practice_answers for select to authenticated
  using (exists (select 1 from public.practice_attempts a
                 where a.id = attempt_id
                   and (a.student_id = auth.uid() or public.is_practice_admin())));

-- أسئلة الاختبار بدون مفاتيح الإجابة (النوع يُستنتج: essay / tf / mcq)
create or replace function public.get_practice_exam_questions(p_exam_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'text', q.text,
      'type', case when q.type like 'essay%' then 'essay' when k.correct_tf is not null then 'tf' else 'mcq' end,
      'options', (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'text', o.text, 'label', o.label) order by o.position), '[]'::jsonb)
                  from public.question_options o where o.question_id = q.id)
    ) order by peq.sort_order, q.id), '[]'::jsonb)
  from public.practice_exam_questions peq
  join public.questions q on q.id = peq.question_id
  join public.practice_exams e on e.id = peq.exam_id
  left join public.question_keys k on k.question_id = q.id
  where peq.exam_id = p_exam_id and (e.is_published or public.is_practice_admin());
$$;

-- التسليم والتصحيح الآلي: p_answers = [{question_id, option_id, text_answer}]
create or replace function public.submit_practice_attempt(p_exam_id uuid, p_answers jsonb)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_attempt uuid; v_total numeric := 0;
  r record; a jsonb; v_opt uuid; v_txt text; v_ok boolean; v_pts numeric;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (select 1 from practice_exams where id = p_exam_id and is_published) then
    raise exception 'exam not found';
  end if;

  update practice_attempts set is_current = false
   where exam_id = p_exam_id and student_id = auth.uid() and is_current;

  insert into practice_attempts(exam_id, student_id) values (p_exam_id, auth.uid())
  returning id into v_attempt;

  for r in
    select q.id as qid, q.type as qtype, coalesce(q.score, 1)::numeric as qscore,
           k.correct_option_id, k.correct_tf
    from practice_exam_questions peq
    join questions q on q.id = peq.question_id
    left join question_keys k on k.question_id = q.id
    where peq.exam_id = p_exam_id
  loop
    a := null;
    select x into a from jsonb_array_elements(coalesce(p_answers,'[]'::jsonb)) x
     where (x->>'question_id')::uuid = r.qid limit 1;
    v_opt := nullif(a->>'option_id','')::uuid;
    v_txt := a->>'text_answer';
    if r.qtype like 'essay%' then
      v_ok := null; v_pts := 0;                       -- المقالي للمراجعة فقط
    elsif r.correct_tf is not null then
      v_ok := (v_txt is not null and v_txt = r.correct_tf::text);
      v_pts := case when v_ok then r.qscore else 0 end;
    else
      v_ok := (v_opt is not null and v_opt = r.correct_option_id);
      v_pts := case when v_ok then r.qscore else 0 end;
    end if;
    v_total := v_total + v_pts;
    insert into practice_answers(attempt_id, question_id, option_id, text_answer, is_correct, awarded_score)
    values (v_attempt, r.qid, v_opt, v_txt, v_ok, v_pts);
  end loop;

  update practice_attempts set score = round(v_total, 2) where id = v_attempt;
  return v_attempt;
end $$;

-- مراجعة المحاولة مع الإجابة النموذجية (لصاحبها أو الأستاذ فقط)
create or replace function public.get_practice_review(p_attempt_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_att practice_attempts; v_max numeric; v_items jsonb;
begin
  select * into v_att from practice_attempts where id = p_attempt_id;
  if v_att.id is null or (v_att.student_id <> auth.uid() and not public.is_practice_admin()) then
    raise exception 'forbidden';
  end if;
  select max_score into v_max from practice_exams where id = v_att.exam_id;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'text', q.text,
      'type', case when q.type like 'essay%' then 'essay' when k.correct_tf is not null then 'tf' else 'mcq' end,
      'options', (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'text', o.text, 'label', o.label) order by o.position), '[]'::jsonb)
                  from question_options o where o.question_id = q.id),
      'chosen_option_id', pa.option_id, 'text_answer', pa.text_answer,
      'is_correct', pa.is_correct, 'awarded_score', coalesce(pa.awarded_score, 0),
      'correct_option_id', k.correct_option_id, 'correct_tf', k.correct_tf, 'model_answer', k.model_answer
    ) order by peq.sort_order, q.id), '[]'::jsonb) into v_items
  from practice_exam_questions peq
  join questions q on q.id = peq.question_id
  left join practice_answers pa on pa.attempt_id = p_attempt_id and pa.question_id = q.id
  left join question_keys k on k.question_id = q.id
  where peq.exam_id = v_att.exam_id;
  return jsonb_build_object('score', v_att.score, 'max_score', v_max, 'items', v_items);
end $$;

create or replace function public.retake_practice_exam(p_exam_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.practice_attempts set is_current = false
   where exam_id = p_exam_id and student_id = auth.uid() and is_current;
$$;

-- تقرير الأستاذ
create or replace function public.practice_attempts_report()
returns table(attempt_id uuid, exam_title text, student_name text, student_number text,
              attempt_no int, attempts_total int, score numeric, max_score numeric, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select a.id, e.title, p.full_name, p.student_no::text,
         (row_number() over (partition by a.exam_id, a.student_id order by a.created_at))::int,
         (count(*) over (partition by a.exam_id, a.student_id))::int,
         a.score, e.max_score, a.created_at
  from practice_attempts a
  join practice_exams e on e.id = a.exam_id
  left join profiles p on p.id = a.student_id
  where public.is_practice_admin()
  order by a.created_at desc;
$$;

-- بنك الأسئلة للأستاذ
create or replace function public.list_question_bank()
returns table(id uuid, q_text text, q_type text, q_score numeric)
language sql stable security definer set search_path = public as $$
  select q.id, q.text,
         case when q.type like 'essay%' then 'essay' when k.correct_tf is not null then 'tf' else 'mcq' end,
         coalesce(q.score, 1)::numeric
  from questions q left join question_keys k on k.question_id = q.id
  where public.is_practice_admin() order by q.id;
$$;

grant execute on function
  public.get_practice_exam_questions(uuid), public.submit_practice_attempt(uuid, jsonb),
  public.get_practice_review(uuid), public.retake_practice_exam(uuid),
  public.practice_attempts_report(), public.list_question_bank()
to authenticated;
