-- OMEGA SAFE: Admin Members System - Phase 1 Foundation
-- Scope: admin-only logging + admin read-only member directory

create extension if not exists pgcrypto;

create or replace function public.ccg_is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and lower(coalesce(p.role, '')) in ('admin', 'superadmin')
  )
$$;

create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  created_at timestamptz not null default now()
);

alter table public.admin_activity_log
  add column if not exists user_id uuid references auth.users(id) on delete set null,
  add column if not exists email text,
  add column if not exists created_at timestamptz not null default now();

create index if not exists idx_admin_activity_log_created_at
  on public.admin_activity_log (created_at desc);

create index if not exists idx_admin_activity_log_event
  on public.admin_activity_log (event_type, created_at desc);

create index if not exists idx_admin_activity_log_user
  on public.admin_activity_log (user_id, created_at desc);

alter table public.admin_activity_log enable row level security;

revoke all on public.admin_activity_log from anon;
revoke all on public.admin_activity_log from authenticated;

drop policy if exists admin_activity_log_admin_select on public.admin_activity_log;
create policy admin_activity_log_admin_select
  on public.admin_activity_log
  for select
  to authenticated
  using (public.ccg_is_admin(auth.uid()));

drop policy if exists admin_activity_log_admin_insert on public.admin_activity_log;
create policy admin_activity_log_admin_insert
  on public.admin_activity_log
  for insert
  to authenticated
  with check (public.ccg_is_admin(auth.uid()));

create or replace function public.admin_list_members_phase1(
  p_search text default null,
  p_role text default null,
  p_limit integer default 200,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  email text,
  username text,
  signup_date timestamptz,
  last_sign_in timestamptz,
  role text
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.ccg_is_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  return query
  select
    u.id as user_id,
    u.email,
    p.username,
    u.created_at as signup_date,
    u.last_sign_in_at as last_sign_in,
    coalesce(nullif(trim(p.role), ''), 'user') as role
  from auth.users u
  left join public.profiles p on p.id = u.id
  where (
    p_search is null
    or u.email ilike '%' || p_search || '%'
    or p.username ilike '%' || p_search || '%'
  )
  and (
    p_role is null
    or lower(coalesce(p.role, 'user')) = lower(p_role)
  )
  order by u.created_at desc
  limit greatest(1, least(coalesce(p_limit, 200), 500))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

grant execute on function public.admin_list_members_phase1(text, text, integer, integer) to authenticated;
