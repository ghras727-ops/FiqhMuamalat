-- تحديث: تلميحات المقالي + رقم المحاولة في المراجعة
create or replace function public.get_practice_exam_questions(p_exam_id uuid)
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'text', q.text,
      'type', case when q.type like 'essay%' then 'essay' when k.correct_tf is not null then 'tf' else 'mcq' end,
      'options', (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'text', o.text, 'label', o.label) order by o.position), '[]'::jsonb)
                  from public.question_options o where o.question_id = q.id),
      'hints', case when q.type like 'essay%' then
        (select coalesce(jsonb_agg(array_to_string((regexp_split_to_array(btrim(t.l), '\s+'))[1:3], ' ') order by t.n), '[]'::jsonb)
           from unnest(regexp_split_to_array(coalesce(k.model_answer, ''), E'\n')) with ordinality as t(l, n)
          where btrim(t.l) <> '' and btrim(t.l) not like 'المرجع%')
        else null end
    ) order by peq.sort_order, q.id), '[]'::jsonb)
  from public.practice_exam_questions peq
  join public.questions q on q.id = peq.question_id
  join public.practice_exams e on e.id = peq.exam_id
  left join public.question_keys k on k.question_id = q.id
  where peq.exam_id = p_exam_id and (e.is_published or public.is_practice_admin());
$$;

create or replace function public.get_practice_review(p_attempt_id uuid)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare v_att practice_attempts; v_max numeric; v_items jsonb; v_no int;
begin
  select * into v_att from practice_attempts where id = p_attempt_id;
  if v_att.id is null or (v_att.student_id <> auth.uid() and not public.is_practice_admin()) then
    raise exception 'forbidden';
  end if;
  select max_score into v_max from practice_exams where id = v_att.exam_id;
  select count(*) into v_no from practice_attempts a2
   where a2.exam_id = v_att.exam_id and a2.student_id = v_att.student_id and a2.created_at <= v_att.created_at;
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', q.id, 'text', q.text,
      'type', case when q.type like 'essay%' then 'essay' when k.correct_tf is not null then 'tf' else 'mcq' end,
      'options', (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'text', o.text, 'label', o.label) order by o.position), '[]'::jsonb)
                  from question_options o where o.question_id = q.id),
      'chosen_option_id', pa.option_id, 'text_answer', pa.text_answer,
      'is_correct', pa.is_correct, 'awarded_score', coalesce(pa.awarded_score, 0),
      'correct_option_id', k.correct_option_id, 'correct_tf', k.correct_tf,
      'model_answer', coalesce(k.model_answer, n.note)
    ) order by peq.sort_order, q.id), '[]'::jsonb) into v_items
  from practice_exam_questions peq
  join questions q on q.id = peq.question_id
  left join practice_answers pa on pa.attempt_id = p_attempt_id and pa.question_id = q.id
  left join question_keys k on k.question_id = q.id
  left join practice_question_notes n on n.question_id = q.id
  where peq.exam_id = v_att.exam_id;
  return jsonb_build_object('score', v_att.score, 'max_score', v_max, 'attempt_no', v_no, 'items', v_items);
end $$;

notify pgrst, 'reload schema';
