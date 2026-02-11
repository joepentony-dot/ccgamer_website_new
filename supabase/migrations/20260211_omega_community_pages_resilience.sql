-- Omega community resilience: profile auto-create + perks/rankings safety sources.

create extension if not exists pgcrypto;

create or replace function public.ccg_create_profile_for_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url, role)
  values (
    new.id,
    lower(left(regexp_replace(coalesce(split_part(new.email, '@', 1), 'member-' || left(new.id::text, 8)), '[^a-zA-Z0-9_-]+', '', 'g'), 24)),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), ''),
    nullif(trim(coalesce(new.raw_user_meta_data ->> 'avatar_url', '')), ''),
    'member'
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists trg_ccg_profile_on_auth_user on auth.users;
create trigger trg_ccg_profile_on_auth_user
after insert on auth.users
for each row
execute procedure public.ccg_create_profile_for_user();

-- Backfill missing profiles for existing users.
insert into public.profiles (id, username, role)
select
  u.id,
  lower(left(regexp_replace(coalesce(split_part(u.email, '@', 1), 'member-' || left(u.id::text, 8)), '[^a-zA-Z0-9_-]+', '', 'g'), 24)),
  'member'
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

create table if not exists public.badge_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  category text default 'activity',
  rarity text default 'common',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  is_supporter_only boolean not null default false,
  active boolean not null default true,
  start_at timestamptz,
  end_at timestamptz,
  reward_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.user_challenge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  progress_json jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (user_id, challenge_id)
);

alter table if exists public.badge_definitions enable row level security;
alter table if exists public.challenges enable row level security;
alter table if exists public.user_challenge_progress enable row level security;

DO $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='badge_definitions' and policyname='badge_definitions_public_read') then
    create policy badge_definitions_public_read on public.badge_definitions for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='challenges' and policyname='challenges_public_read') then
    create policy challenges_public_read on public.challenges for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_challenge_progress' and policyname='user_challenge_progress_owner_read') then
    create policy user_challenge_progress_owner_read on public.user_challenge_progress for select to authenticated using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_challenge_progress' and policyname='user_challenge_progress_owner_write') then
    create policy user_challenge_progress_owner_write on public.user_challenge_progress for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

create or replace view public.community_member_overview as
select
  p.id as user_id,
  p.username,
  coalesce(stats.rep_points, 0)::int as rep_points,
  greatest(1, floor(coalesce(stats.rep_points, 0) / 20)::int + 1) as rep_level,
  case
    when coalesce(stats.rep_points, 0) >= 300 then 'Legendary Retro Sage'
    when coalesce(stats.rep_points, 0) >= 150 then 'Omega Veteran'
    when coalesce(stats.rep_points, 0) >= 60 then 'Arcade Regular'
    else 'New Recruit'
  end as level_title,
  coalesce(sl.supporter_level, 'none') as supporter_level,
  sl.supporter_title,
  sl.supporter_frame_key,
  sl.profile_banner_key,
  false as early_access_enabled
from public.profiles p
left join (
  select
    x.user_id,
    sum(x.points) as rep_points
  from (
    select user_id, count(*)::int * 2 as points from public.game_comments group by user_id
    union all
    select user_id, count(*)::int as points from public.game_ratings group by user_id
    union all
    select user_id, count(*)::int * 4 as points from public.user_badges group by user_id
  ) x
  group by x.user_id
) stats on stats.user_id = p.id
left join public.supporter_links sl on sl.user_id = p.id;
