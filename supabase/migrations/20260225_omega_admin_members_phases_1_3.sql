-- OMEGA: Admin members system (phase 1 -> phase 3)
-- Adds admin activity logging, member directory RPCs, moderation controls,
-- and restrictive anti-abuse RLS checks for banned accounts.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles: admin communication preferences + moderation fields
-- ---------------------------------------------------------------------------
alter table if exists public.profiles
  add column if not exists notify_new_games boolean not null default true,
  add column if not exists notify_newsletter boolean not null default false,
  add column if not exists notify_admin boolean not null default true,
  add column if not exists banned boolean not null default false,
  add column if not exists ban_reason text,
  add column if not exists banned_at timestamptz;

-- ---------------------------------------------------------------------------
-- Admin activity log + strict RLS
-- ---------------------------------------------------------------------------
create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_admin_activity_log_created_at
  on public.admin_activity_log (created_at desc);

create index if not exists idx_admin_activity_log_target
  on public.admin_activity_log (target_user_id, created_at desc);

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
      and lower(coalesce(p.role, '')) in ('admin', 'superadmin', 'editor')
  )
$$;

alter table public.admin_activity_log enable row level security;

drop policy if exists admin_activity_log_select_admin on public.admin_activity_log;
create policy admin_activity_log_select_admin
  on public.admin_activity_log
  for select to authenticated
  using (public.ccg_is_admin(auth.uid()));

drop policy if exists admin_activity_log_insert_admin on public.admin_activity_log;
create policy admin_activity_log_insert_admin
  on public.admin_activity_log
  for insert to authenticated
  with check (public.ccg_is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- Phase 1 silent signup logging
-- ---------------------------------------------------------------------------
create or replace function public.ccg_log_signup_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.admin_activity_log (event_type, actor_user_id, target_user_id, email, metadata)
  values (
    'user_signup',
    new.id,
    new.id,
    new.email,
    jsonb_build_object(
      'provider', coalesce(new.raw_app_meta_data ->> 'provider', 'email'),
      'source', 'auth_trigger'
    )
  );
  return new;
end;
$$;

drop trigger if exists trg_ccg_log_signup_event on auth.users;
create trigger trg_ccg_log_signup_event
  after insert on auth.users
  for each row execute function public.ccg_log_signup_event();

-- ---------------------------------------------------------------------------
-- Phase 1+2+3 admin RPCs
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_members(
  p_search text default null,
  p_role text default null,
  p_banned boolean default null,
  p_limit integer default 200,
  p_offset integer default 0
)
returns table (
  user_id uuid,
  email text,
  username text,
  role text,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  banned boolean,
  ban_reason text,
  notify_new_games boolean,
  notify_newsletter boolean,
  notify_admin boolean
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
    coalesce(p.role, 'user') as role,
    coalesce(p.created_at, u.created_at) as created_at,
    u.last_sign_in_at,
    coalesce(p.banned, false) as banned,
    p.ban_reason,
    coalesce(p.notify_new_games, true) as notify_new_games,
    coalesce(p.notify_newsletter, false) as notify_newsletter,
    coalesce(p.notify_admin, true) as notify_admin
  from auth.users u
  left join public.profiles p on p.id = u.id
  where (
    p_search is null
    or u.email ilike '%' || p_search || '%'
    or p.username ilike '%' || p_search || '%'
  )
  and (p_role is null or lower(coalesce(p.role, 'user')) = lower(p_role))
  and (p_banned is null or coalesce(p.banned, false) = p_banned)
  order by coalesce(p.created_at, u.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 200), 500))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

create or replace function public.admin_list_activity(
  p_search text default null,
  p_limit integer default 200
)
returns table (
  id uuid,
  event_type text,
  actor_user_id uuid,
  target_user_id uuid,
  email text,
  metadata jsonb,
  created_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.ccg_is_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  return query
  select
    l.id,
    l.event_type,
    l.actor_user_id,
    l.target_user_id,
    l.email,
    l.metadata,
    l.created_at
  from public.admin_activity_log l
  where (
    p_search is null
    or l.email ilike '%' || p_search || '%'
    or l.event_type ilike '%' || p_search || '%'
  )
  order by l.created_at desc
  limit greatest(1, least(coalesce(p_limit, 200), 500));
end;
$$;

create or replace function public.admin_set_member_role(
  p_user_id uuid,
  p_role text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.profiles;
  v_role text := lower(coalesce(trim(p_role), ''));
begin
  if not public.ccg_is_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  if v_role not in ('user', 'editor', 'admin', 'mod', 'superadmin') then
    raise exception 'invalid_role';
  end if;

  update public.profiles
  set role = v_role,
      updated_at = now()
  where id = p_user_id
  returning * into v_row;

  insert into public.admin_activity_log (event_type, actor_user_id, target_user_id, metadata)
  values ('role_change', auth.uid(), p_user_id, jsonb_build_object('role', v_role));

  return v_row;
end;
$$;

create or replace function public.admin_set_member_ban(
  p_user_id uuid,
  p_banned boolean,
  p_reason text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.profiles;
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
begin
  if not public.ccg_is_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  update public.profiles
  set banned = coalesce(p_banned, false),
      ban_reason = case when coalesce(p_banned, false) then v_reason else null end,
      banned_at = case when coalesce(p_banned, false) then now() else null end,
      updated_at = now()
  where id = p_user_id
  returning * into v_row;

  insert into public.admin_activity_log (event_type, actor_user_id, target_user_id, metadata)
  values (
    case when coalesce(p_banned, false) then 'soft_ban' else 'soft_unban' end,
    auth.uid(),
    p_user_id,
    jsonb_build_object('reason', v_reason)
  );

  return v_row;
end;
$$;

grant execute on function public.admin_list_members(text, text, boolean, integer, integer) to authenticated;
grant execute on function public.admin_list_activity(text, integer) to authenticated;
grant execute on function public.admin_set_member_role(uuid, text) to authenticated;
grant execute on function public.admin_set_member_ban(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Restrictive anti-abuse policies for banned users
-- ---------------------------------------------------------------------------
create or replace function public.ccg_not_banned(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select not p.banned from public.profiles p where p.id = p_user_id), false)
$$;

alter table if exists public.game_comments enable row level security;
drop policy if exists game_comments_not_banned_restrictive on public.game_comments;
create policy game_comments_not_banned_restrictive
  as restrictive
  on public.game_comments
  for all to authenticated
  using (public.ccg_not_banned(auth.uid()))
  with check (public.ccg_not_banned(auth.uid()));

alter table if exists public.game_ratings enable row level security;
drop policy if exists game_ratings_not_banned_restrictive on public.game_ratings;
create policy game_ratings_not_banned_restrictive
  as restrictive
  on public.game_ratings
  for all to authenticated
  using (public.ccg_not_banned(auth.uid()))
  with check (public.ccg_not_banned(auth.uid()));

alter table if exists public.profile_favourites enable row level security;
drop policy if exists profile_favourites_not_banned_restrictive on public.profile_favourites;
create policy profile_favourites_not_banned_restrictive
  as restrictive
  on public.profile_favourites
  for all to authenticated
  using (public.ccg_not_banned(auth.uid()))
  with check (public.ccg_not_banned(auth.uid()));

alter table if exists public.comments enable row level security;
drop policy if exists comments_not_banned_restrictive on public.comments;
create policy comments_not_banned_restrictive
  as restrictive
  on public.comments
  for all to authenticated
  using (public.ccg_not_banned(auth.uid()))
  with check (public.ccg_not_banned(auth.uid()));

alter table if exists public.ratings enable row level security;
drop policy if exists ratings_not_banned_restrictive on public.ratings;
create policy ratings_not_banned_restrictive
  as restrictive
  on public.ratings
  for all to authenticated
  using (public.ccg_not_banned(auth.uid()))
  with check (public.ccg_not_banned(auth.uid()));
