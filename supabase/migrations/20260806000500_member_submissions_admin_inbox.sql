-- CCG Member Hub Phase 10: administrator submissions inbox
--
-- Adds internal review fields and administrator-only RPCs for the existing
-- member_submissions table. No submission can edit games.json or publish
-- archive content automatically.

alter table public.member_submissions
  add column if not exists admin_notes text not null default '',
  add column if not exists reviewed_by uuid,
  add column if not exists resolved_at timestamptz;

create index if not exists member_submissions_status_created_idx
  on public.member_submissions (status, created_at desc);

create index if not exists member_submissions_type_created_idx
  on public.member_submissions (submission_type, created_at desc);

create or replace function public.ccg_is_submission_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) in ('admin', 'superadmin')
  );
$$;

revoke all
  on function public.ccg_is_submission_admin()
  from public;

create or replace function public.admin_list_member_submissions(
  p_status text default null,
  p_type text default null,
  p_search text default null,
  p_limit int default 100
)
returns table (
  id uuid,
  profile_id uuid,
  member_username text,
  member_display_name text,
  submission_type text,
  game_slug text,
  subject text,
  message text,
  status text,
  admin_notes text,
  created_at timestamptz,
  updated_at timestamptz,
  resolved_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.ccg_is_submission_admin() then
    raise exception 'Administrator access required';
  end if;

  return query
  select
    s.id,
    s.profile_id,
    p.username as member_username,
    coalesce(nullif(p.display_name, ''), p.username, 'CCG Member') as member_display_name,
    s.submission_type,
    s.game_slug,
    s.subject,
    s.message,
    s.status,
    s.admin_notes,
    s.created_at,
    s.updated_at,
    s.resolved_at
  from public.member_submissions s
  left join public.profiles p
    on p.id = s.profile_id
  where (
      nullif(trim(coalesce(p_status, '')), '') is null
      or s.status = trim(p_status)
    )
    and (
      nullif(trim(coalesce(p_type, '')), '') is null
      or s.submission_type = trim(p_type)
    )
    and (
      nullif(trim(coalesce(p_search, '')), '') is null
      or s.subject ilike '%' || trim(p_search) || '%'
      or s.message ilike '%' || trim(p_search) || '%'
      or coalesce(s.game_slug, '') ilike '%' || trim(p_search) || '%'
      or coalesce(p.username, '') ilike '%' || trim(p_search) || '%'
      or coalesce(p.display_name, '') ilike '%' || trim(p_search) || '%'
    )
  order by
    case s.status
      when 'new' then 1
      when 'reviewing' then 2
      when 'resolved' then 3
      when 'declined' then 4
      else 5
    end,
    s.created_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 250));
end;
$$;

revoke all
  on function public.admin_list_member_submissions(text, text, text, int)
  from public;
grant execute
  on function public.admin_list_member_submissions(text, text, text, int)
  to authenticated;

create or replace function public.admin_update_member_submission(
  p_submission_id uuid,
  p_status text,
  p_admin_notes text default ''
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  normalized_status text := lower(trim(coalesce(p_status, '')));
  affected_rows int := 0;
begin
  if auth.uid() is null or not public.ccg_is_submission_admin() then
    raise exception 'Administrator access required';
  end if;

  if normalized_status not in ('new', 'reviewing', 'resolved', 'declined') then
    raise exception 'Invalid submission status';
  end if;

  update public.member_submissions
  set
    status = normalized_status,
    admin_notes = left(trim(coalesce(p_admin_notes, '')), 5000),
    reviewed_by = auth.uid(),
    resolved_at = case
      when normalized_status in ('resolved', 'declined')
        then coalesce(resolved_at, now())
      else null
    end,
    updated_at = now()
  where id = p_submission_id;

  get diagnostics affected_rows = row_count;
  return affected_rows = 1;
end;
$$;

revoke all
  on function public.admin_update_member_submission(uuid, text, text)
  from public;
grant execute
  on function public.admin_update_member_submission(uuid, text, text)
  to authenticated;
