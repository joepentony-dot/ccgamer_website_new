-- OMEGA: fix private profile preference persistence + joined date reliability
create extension if not exists pgcrypto;

-- Ensure canonical preference fields used by profile page exist.
alter table if exists public.profiles
  add column if not exists newsletter_monthly boolean not null default false,
  add column if not exists notify_new_games boolean not null default false,
  add column if not exists notify_c64 boolean not null default false,
  add column if not exists notify_amiga boolean not null default false,
  add column if not exists created_at timestamptz;

-- Keep legacy option-a fields present so existing functions continue to work.
alter table if exists public.profiles
  add column if not exists newsletter_opt_in boolean not null default false,
  add column if not exists notify_new_games_opt_in boolean not null default false,
  add column if not exists notify_platform_c64 boolean not null default false,
  add column if not exists notify_platform_amiga boolean not null default false;

-- Ensure created_at has safe default and no null values.
alter table if exists public.profiles
  alter column created_at set default now();

update public.profiles
set created_at = coalesce(created_at, now())
where created_at is null;

alter table if exists public.profiles
  alter column created_at set not null;

-- Normalize canonical preferences from legacy fields when canonical values are null.
update public.profiles
set newsletter_monthly = coalesce(newsletter_monthly, newsletter_opt_in, false),
    notify_new_games = coalesce(notify_new_games, notify_new_games_opt_in, false),
    notify_c64 = coalesce(notify_c64, notify_platform_c64, false),
    notify_amiga = coalesce(notify_amiga, notify_platform_amiga, false);

-- Keep legacy fields synced from canonical values (safe one-time migration sync).
update public.profiles
set newsletter_opt_in = coalesce(newsletter_monthly, false),
    notify_new_games_opt_in = coalesce(notify_new_games, false),
    notify_platform_c64 = coalesce(notify_c64, false),
    notify_platform_amiga = coalesce(notify_amiga, false);

-- Ensure every auth user has a profile row.
insert into public.profiles (id, username, display_name, avatar_url, role, created_at)
select
  u.id,
  nullif(left(coalesce(u.raw_user_meta_data ->> 'username', split_part(u.email, '@', 1)), 24), ''),
  nullif(left(coalesce(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1)), 64), ''),
  coalesce(u.raw_user_meta_data ->> 'avatar_url', ''),
  'user',
  now()
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

-- Ensure profile bootstrap trigger function exists and inserts canonical fields.
create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    role,
    created_at,
    newsletter_monthly,
    notify_new_games,
    notify_c64,
    notify_amiga,
    newsletter_opt_in,
    notify_new_games_opt_in,
    notify_platform_c64,
    notify_platform_amiga
  )
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), 24), ''),
    nullif(left(coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), 64), ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    'user',
    now(),
    false,
    false,
    false,
    false,
    false,
    false,
    false,
    false
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

-- RLS hardening for private profile page (read/update own row only).
alter table if exists public.profiles enable row level security;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_public_read'
  ) then
    drop policy profiles_public_read on public.profiles;
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_owner_select'
  ) then
    drop policy profiles_owner_select on public.profiles;
  end if;

  create policy profiles_owner_select on public.profiles
    for select to authenticated
    using (id = auth.uid());
end $$;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles' and policyname = 'profiles_owner_update'
  ) then
    drop policy profiles_owner_update on public.profiles;
  end if;

  create policy profiles_owner_update on public.profiles
    for update to authenticated
    using (id = auth.uid())
    with check (id = auth.uid());
end $$;
