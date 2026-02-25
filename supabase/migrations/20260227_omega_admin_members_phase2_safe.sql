-- OMEGA SAFE: Admin members Phase 2 (communication preferences, admin messaging, soft bans)
-- Additive-only migration. Safe to re-run.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Profiles table extensions (idempotent, non-destructive)
-- ---------------------------------------------------------------------------
alter table if exists public.profiles
  add column if not exists notify_new_games boolean default true,
  add column if not exists notify_newsletter boolean default false,
  add column if not exists notify_admin boolean default true,
  add column if not exists banned boolean default false,
  add column if not exists ban_reason text,
  add column if not exists banned_at timestamptz;

update public.profiles
set notify_new_games = true
where notify_new_games is null;

update public.profiles
set notify_newsletter = false
where notify_newsletter is null;

update public.profiles
set notify_admin = true
where notify_admin is null;

update public.profiles
set banned = false
where banned is null;

alter table if exists public.profiles
  alter column notify_new_games set default true,
  alter column notify_newsletter set default false,
  alter column notify_admin set default true,
  alter column banned set default false,
  alter column notify_new_games set not null,
  alter column notify_newsletter set not null,
  alter column notify_admin set not null,
  alter column banned set not null;

-- ---------------------------------------------------------------------------
-- Admin role helper (strict admin + superadmin only)
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Harden admin_activity_log schema for structured logging compatibility
-- ---------------------------------------------------------------------------
alter table if exists public.admin_activity_log
  add column if not exists actor_user_id uuid references auth.users(id) on delete set null,
  add column if not exists target_user_id uuid references auth.users(id) on delete set null,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists idx_admin_activity_log_actor on public.admin_activity_log(actor_user_id, created_at desc);
create index if not exists idx_admin_activity_log_target on public.admin_activity_log(target_user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- RLS adjustments (fail-closed)
-- Owner can read/update own row, but owner updates are restricted by trigger.
-- Admin/superadmin have full read/update.
-- No public/anon profile access.
-- ---------------------------------------------------------------------------
alter table if exists public.profiles enable row level security;

revoke all on public.profiles from anon;

drop policy if exists profiles_public_read on public.profiles;

drop policy if exists profiles_owner_select on public.profiles;
create policy profiles_owner_select
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid());

drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select
  on public.profiles
  for select
  to authenticated
  using (public.ccg_is_admin(auth.uid()));

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update
  on public.profiles
  for update
  to authenticated
  using (public.ccg_is_admin(auth.uid()))
  with check (true);

create or replace function public.ccg_guard_profile_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.ccg_is_admin(auth.uid()) then
    return new;
  end if;

  if auth.uid() is null or old.id <> auth.uid() then
    raise exception 'not_authorized';
  end if;

  if new.id <> old.id
     or coalesce(new.role, '') <> coalesce(old.role, '')
     or coalesce(new.banned, false) is distinct from coalesce(old.banned, false)
     or coalesce(new.ban_reason, '') <> coalesce(old.ban_reason, '')
     or new.banned_at is distinct from old.banned_at
     or coalesce(new.username, '') <> coalesce(old.username, '')
     or new.created_at is distinct from old.created_at then
    raise exception 'forbidden_profile_field_update';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_ccg_guard_profile_sensitive_fields on public.profiles;
create trigger trg_ccg_guard_profile_sensitive_fields
before update on public.profiles
for each row
execute function public.ccg_guard_profile_sensitive_fields();

-- ---------------------------------------------------------------------------
-- Admin RPC for soft bans (logs every action)
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_member_soft_ban(
  p_user_id uuid,
  p_banned boolean,
  p_reason text default null
)
returns table (
  id uuid,
  banned boolean,
  ban_reason text,
  banned_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reason text := nullif(trim(coalesce(p_reason, '')), '');
  v_actor_email text;
begin
  if not public.ccg_is_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  if p_user_id is null then
    raise exception 'invalid_user_id';
  end if;

  select u.email
    into v_actor_email
  from auth.users u
  where u.id = auth.uid();

  update public.profiles
  set banned = coalesce(p_banned, false),
      ban_reason = case when coalesce(p_banned, false) then v_reason else null end,
      banned_at = case when coalesce(p_banned, false) then now() else null end,
      updated_at = now()
  where profiles.id = p_user_id;

  if not found then
    raise exception 'user_not_found';
  end if;

  insert into public.admin_activity_log (event_type, user_id, actor_user_id, target_user_id, email, metadata)
  values (
    case when coalesce(p_banned, false) then 'soft_ban' else 'soft_unban' end,
    auth.uid(),
    auth.uid(),
    p_user_id,
    v_actor_email,
    jsonb_build_object(
      'reason', v_reason,
      'banned', coalesce(p_banned, false)
    )
  );

  return query
  select p.id, p.banned, p.ban_reason, p.banned_at
  from public.profiles p
  where p.id = p_user_id;
end;
$$;

grant execute on function public.admin_set_member_soft_ban(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Restrictive anti-abuse policies for soft-banned users (RLS enforcement)
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
  for all
  to authenticated
  using (public.ccg_not_banned(auth.uid()))
  with check (public.ccg_not_banned(auth.uid()));

alter table if exists public.game_ratings enable row level security;
drop policy if exists game_ratings_not_banned_restrictive on public.game_ratings;
create policy game_ratings_not_banned_restrictive
  as restrictive
  on public.game_ratings
  for all
  to authenticated
  using (public.ccg_not_banned(auth.uid()))
  with check (public.ccg_not_banned(auth.uid()));

alter table if exists public.profile_favourites enable row level security;
drop policy if exists profile_favourites_not_banned_restrictive on public.profile_favourites;
create policy profile_favourites_not_banned_restrictive
  as restrictive
  on public.profile_favourites
  for all
  to authenticated
  using (public.ccg_not_banned(auth.uid()))
  with check (public.ccg_not_banned(auth.uid()));

alter table if exists public.comments enable row level security;
drop policy if exists comments_not_banned_restrictive on public.comments;
create policy comments_not_banned_restrictive
  as restrictive
  on public.comments
  for all
  to authenticated
  using (public.ccg_not_banned(auth.uid()))
  with check (public.ccg_not_banned(auth.uid()));

alter table if exists public.ratings enable row level security;
drop policy if exists ratings_not_banned_restrictive on public.ratings;
create policy ratings_not_banned_restrictive
  as restrictive
  on public.ratings
  for all
  to authenticated
  using (public.ccg_not_banned(auth.uid()))
  with check (public.ccg_not_banned(auth.uid()));
