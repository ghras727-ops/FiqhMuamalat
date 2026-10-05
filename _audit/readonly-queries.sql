-- ============================================================
-- FiqhMuamalat - Stage A : READ ONLY queries
-- Run each query in Supabase SQL Editor and send the output.
-- ============================================================

-- (1) all tables in public
select table_name
from information_schema.tables
where table_schema = 'public'
order by table_name;

-- (2) columns of weeks / lessons / materials
select table_name, ordinal_position, column_name, data_type,
       is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('weeks','lessons','materials')
order by table_name, ordinal_position;

-- (3) constraints
select tc.table_name, tc.constraint_name, tc.constraint_type,
       kcu.column_name, ccu.table_name as referenced_table,
       ccu.column_name as referenced_column
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
       on kcu.constraint_name = tc.constraint_name
      and kcu.table_schema    = tc.table_schema
left join information_schema.constraint_column_usage ccu
       on ccu.constraint_name = tc.constraint_name
      and ccu.table_schema    = tc.table_schema
where tc.table_schema = 'public'
  and tc.table_name in ('weeks','lessons','materials','profiles')
order by tc.table_name, tc.constraint_type, tc.constraint_name;

-- (4) RLS policies on those tables
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('weeks','lessons','materials','profiles')
order by tablename, policyname;

-- (5) is RLS enabled?
select n.nspname as schema, c.relname as table_name, c.relrowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('weeks','lessons','materials','profiles');

-- (6) storage buckets
select id, name, public, file_size_limit, allowed_mime_types, created_at
from storage.buckets
order by name;

-- (7) storage policies
select schemaname, tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'storage'
order by tablename, policyname;

-- (8) functions
select n.nspname as schema, p.proname as function_name,
       pg_get_function_arguments(p.oid) as args,
       pg_get_function_result(p.oid)    as returns
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public','auth')
order by n.nspname, p.proname;

-- (9) triggers
select event_object_schema as schema,
       event_object_table  as table_name,
       trigger_name,
       action_timing,
       event_manipulation
from information_schema.triggers
where event_object_schema = 'public'
  and event_object_table in ('weeks','lessons','materials','profiles')
order by table_name, trigger_name;

-- (10) row counts
select 'weeks'     as t, count(*) from public.weeks
union all
select 'lessons',        count(*) from public.lessons
union all
select 'materials',      count(*) from public.materials;