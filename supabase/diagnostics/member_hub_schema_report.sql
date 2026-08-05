-- CCG Member Hub Phase 7C: read-only live-schema report
-- Safe to run in Supabase SQL Editor. This file performs no writes.

select
  c.table_name,
  c.ordinal_position,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in (
    'profiles',
    'profile_game_library',
    'profile_top_picks',
    'member_submissions',
    'game_ratings',
    'ratings',
    'game_comments',
    'comments',
    'user_badges',
    'badge_definitions',
    'badges'
  )
order by c.table_name, c.ordinal_position;

select
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as result_type
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'get_public_member_profile',
    'get_my_member_activity',
    'ccg_first_existing_column',
    'ccg_member_rating_rows',
    'ccg_member_comment_rows',
    'ccg_member_badge_rows',
    'award_badge_if_eligible'
  )
order by p.proname, arguments;

select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles',
    'profile_game_library',
    'profile_top_picks',
    'member_submissions',
    'game_ratings',
    'ratings',
    'game_comments',
    'comments',
    'user_badges'
  )
order by tablename, policyname;

select
  to_regclass('public.profile_game_library') as profile_game_library,
  to_regclass('public.member_submissions') as member_submissions,
  to_regprocedure('public.get_public_member_profile(text)') as public_profile_rpc,
  to_regprocedure('public.get_my_member_activity(integer)') as activity_rpc,
  exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profile_game_library'
      and column_name = 'deleted_at'
  ) as deletion_tombstones_ready;
