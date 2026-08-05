-- CCG Member Hub Phase 12: administrator deployment health report
--
-- Adds one administrator-only RPC that reports whether each required Member Hub
-- table, column, index and function is present in the live Supabase project.
-- It returns structure status only and never exposes member records.

create or replace function public.admin_get_member_hub_health()
returns table (
  component_key text,
  category text,
  component_label text,
  ready boolean,
  detail text,
  action_file text,
  sort_order int
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) in ('admin', 'superadmin')
  ) then
    raise exception 'Administrator access required';
  end if;

  return query
  select *
  from (
    values
      (
        'profiles_table'::text,
        'Core account'::text,
        'Member profiles table'::text,
        to_regclass('public.profiles') is not null,
        case when to_regclass('public.profiles') is not null
          then 'The account profile foundation is available.'
          else 'The public.profiles table is missing.'
        end::text,
        'Existing account foundation'::text,
        10
      ),
      (
        'library_table'::text,
        'Private library'::text,
        'Account-backed game library'::text,
        to_regclass('public.profile_game_library') is not null,
        case when to_regclass('public.profile_game_library') is not null
          then 'Private game records can be stored against signed-in accounts.'
          else 'The account-backed personal-library table is missing.'
        end::text,
        '20260805_member_hub_cloud_library.sql'::text,
        20
      ),
      (
        'library_rls'::text,
        'Private library'::text,
        'Library row-level security'::text,
        coalesce((
          select c.relrowsecurity
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relname = 'profile_game_library'
        ), false),
        case when coalesce((
          select c.relrowsecurity
          from pg_class c
          join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public'
            and c.relname = 'profile_game_library'
        ), false)
          then 'Row-level security is enabled for private library records.'
          else 'Row-level security is not enabled on the private library table.'
        end::text,
        '20260805_member_hub_cloud_library.sql'::text,
        30
      ),
      (
        'deletion_tombstones'::text,
        'Synchronisation safety'::text,
        'Deletion tombstone column'::text,
        exists (
          select 1
          from information_schema.columns c
          where c.table_schema = 'public'
            and c.table_name = 'profile_game_library'
            and c.column_name = 'deleted_at'
        ),
        case when exists (
          select 1
          from information_schema.columns c
          where c.table_schema = 'public'
            and c.table_name = 'profile_game_library'
            and c.column_name = 'deleted_at'
        )
          then 'Cross-device removals can remain authoritative.'
          else 'The deleted_at synchronisation safeguard is missing.'
        end::text,
        '20260805_member_hub_deletion_tombstones.sql'::text,
        40
      ),
      (
        'deletion_index'::text,
        'Synchronisation safety'::text,
        'Deletion tombstone index'::text,
        exists (
          select 1
          from pg_indexes i
          where i.schemaname = 'public'
            and i.tablename = 'profile_game_library'
            and i.indexname = 'profile_game_library_profile_deleted_idx'
        ),
        case when exists (
          select 1
          from pg_indexes i
          where i.schemaname = 'public'
            and i.tablename = 'profile_game_library'
            and i.indexname = 'profile_game_library_profile_deleted_idx'
        )
          then 'Deleted records have the supporting profile/timestamp index.'
          else 'The deletion tombstone index is missing.'
        end::text,
        '20260805_member_hub_deletion_tombstones.sql'::text,
        50
      ),
      (
        'schema_rating_reader'::text,
        'Schema compatibility'::text,
        'Adaptive rating reader'::text,
        to_regprocedure('public.ccg_member_rating_rows(uuid)') is not null,
        case when to_regprocedure('public.ccg_member_rating_rows(uuid)') is not null
          then 'Historical rating-table column variants are normalised.'
          else 'The adaptive rating reader has not been deployed.'
        end::text,
        '20260805230000_member_hub_public_profiles_compatibility.sql'::text,
        60
      ),
      (
        'schema_comment_reader'::text,
        'Schema compatibility'::text,
        'Adaptive comment reader'::text,
        to_regprocedure('public.ccg_member_comment_rows(uuid)') is not null,
        case when to_regprocedure('public.ccg_member_comment_rows(uuid)') is not null
          then 'Historical comment-table column variants are normalised.'
          else 'The adaptive comment reader has not been deployed.'
        end::text,
        '20260805230000_member_hub_public_profiles_compatibility.sql'::text,
        70
      ),
      (
        'schema_badge_reader'::text,
        'Schema compatibility'::text,
        'Adaptive badge reader'::text,
        to_regprocedure('public.ccg_member_badge_rows(uuid)') is not null,
        case when to_regprocedure('public.ccg_member_badge_rows(uuid)') is not null
          then 'Historical badge-table column variants are normalised.'
          else 'The adaptive badge reader has not been deployed.'
        end::text,
        '20260805230000_member_hub_public_profiles_compatibility.sql'::text,
        80
      ),
      (
        'member_submissions_table'::text,
        'Member submissions'::text,
        'Private submissions table'::text,
        to_regclass('public.member_submissions') is not null,
        case when to_regclass('public.member_submissions') is not null
          then 'Members can store suggestions, corrections and site feedback.'
          else 'The private submissions table is missing.'
        end::text,
        '20260805230000_member_hub_public_profiles_compatibility.sql'::text,
        90
      ),
      (
        'public_profile_rpc'::text,
        'Public profiles'::text,
        'Visitor public-profile RPC'::text,
        to_regprocedure('public.get_public_member_profile(text)') is not null,
        case when to_regprocedure('public.get_public_member_profile(text)') is not null
          then 'Privacy-filtered public profiles can be requested by username.'
          else 'The public-profile RPC is missing.'
        end::text,
        '20260805230000_member_hub_public_profiles_compatibility.sql'::text,
        100
      ),
      (
        'public_profile_preview_rpc'::text,
        'Public profiles'::text,
        'Owner profile-preview RPC'::text,
        to_regprocedure('public.get_my_public_profile_preview()') is not null,
        case when to_regprocedure('public.get_my_public_profile_preview()') is not null
          then 'Members can inspect their visitor-facing payload before publication.'
          else 'The owner-only profile preview RPC is missing.'
        end::text,
        '20260805234500_member_public_profile_preview.sql'::text,
        110
      ),
      (
        'badge_catalog_rpc'::text,
        'Achievements'::text,
        'Achievement catalogue'::text,
        to_regprocedure('public.get_member_badge_catalog()') is not null,
        case when to_regprocedure('public.get_member_badge_catalog()') is not null
          then 'Badge names, requirements and categories are available.'
          else 'The achievement catalogue RPC is missing.'
        end::text,
        '20260805233000_member_badge_engine.sql'::text,
        120
      ),
      (
        'badge_award_rpc'::text,
        'Achievements'::text,
        'Automatic badge awarding'::text,
        to_regprocedure('public.award_badge_if_eligible(uuid)') is not null,
        case when to_regprocedure('public.award_badge_if_eligible(uuid)') is not null
          then 'Eligible activity and library milestones can be awarded.'
          else 'The automatic badge-awarding RPC is missing.'
        end::text,
        '20260805233000_member_badge_engine.sql'::text,
        130
      ),
      (
        'member_badges_rpc'::text,
        'Achievements'::text,
        'Private earned-badges RPC'::text,
        to_regprocedure('public.get_my_member_badges()') is not null,
        case when to_regprocedure('public.get_my_member_badges()') is not null
          then 'Signed-in members can load their earned activity badges.'
          else 'The private earned-badges RPC is missing.'
        end::text,
        '20260805233000_member_badge_engine.sql'::text,
        140
      ),
      (
        'submission_list_rpc'::text,
        'Administrator review'::text,
        'Submissions inbox reader'::text,
        to_regprocedure('public.admin_list_member_submissions(text,text,text,integer)') is not null,
        case when to_regprocedure('public.admin_list_member_submissions(text,text,text,integer)') is not null
          then 'Administrators can load the member-submissions review inbox.'
          else 'The administrator submissions-list RPC is missing.'
        end::text,
        '20260806000500_member_submissions_admin_inbox.sql'::text,
        150
      ),
      (
        'submission_update_rpc'::text,
        'Administrator review'::text,
        'Submission review updater'::text,
        to_regprocedure('public.admin_update_member_submission(uuid,text,text)') is not null,
        case when to_regprocedure('public.admin_update_member_submission(uuid,text,text)') is not null
          then 'Administrators can save review states and private notes.'
          else 'The administrator submission-update RPC is missing.'
        end::text,
        '20260806000500_member_submissions_admin_inbox.sql'::text,
        160
      ),
      (
        'health_rpc'::text,
        'Deployment health'::text,
        'Member Hub health report'::text,
        true,
        'This administrator-only deployment report is active.'::text,
        '20260806003000_member_hub_health_check.sql'::text,
        170
      )
  ) as health(
    component_key,
    category,
    component_label,
    ready,
    detail,
    action_file,
    sort_order
  )
  order by sort_order;
end;
$$;

revoke all
  on function public.admin_get_member_hub_health()
  from public;
grant execute
  on function public.admin_get_member_hub_health()
  to authenticated;
