-- ============================================================
-- CCG PHASE 2.1 — ADMIN LOCKDOWN EXTENSION
-- File: /admin/supabase/phase2_1-admin-lockdown.sql
--
-- Extends existing Phase 2 community objects without replacing them.
-- ============================================================

begin;

alter table if exists public.profiles
  add column if not exists is_admin boolean not null default false;

create table if not exists public.admin_audit_log (
  id bigserial primary key,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table if exists public.admin_audit_log enable row level security;

drop policy if exists admin_audit_none_select on public.admin_audit_log;
create policy admin_audit_none_select
on public.admin_audit_log
for select
using (false);

drop policy if exists admin_audit_none_insert on public.admin_audit_log;
create policy admin_audit_none_insert
on public.admin_audit_log
for insert
with check (false);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (
      select p.is_admin
      from public.profiles p
      where p.id = auth.uid()
    ),
    false
  );
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Lock down direct view reads if the legacy view exists.
do $$
begin
  if exists (
    select 1
    from information_schema.views
    where table_schema = 'public'
      and table_name = 'admin_summary'
  ) then
    revoke select on public.admin_summary from anon;
    revoke select on public.admin_summary from authenticated;
  end if;
end;
$$;

create or replace function public.get_admin_summary()
returns table (
  total_users bigint,
  total_comments bigint,
  total_ratings bigint,
  total_activity bigint
)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Not authorised' using errcode = '42501';
  end if;

  return query
  select
    (select count(*)::bigint from public.profiles) as total_users,
    (select count(*)::bigint from public.game_comments where is_deleted = false) as total_comments,
    (select count(*)::bigint from public.game_ratings) as total_ratings,
    (select count(*)::bigint from public.community_activity) as total_activity;
end;
$$;

revoke all on function public.get_admin_summary() from public;
grant execute on function public.get_admin_summary() to authenticated;

commit;
