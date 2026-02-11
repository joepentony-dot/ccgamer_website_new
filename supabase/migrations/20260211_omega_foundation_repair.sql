-- OMEGA Foundation Repair migration
-- Idempotent creation of canonical community/auth tables + RLS + seed data.

create extension if not exists pgcrypto;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists username text,
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists role text default 'user',
  add column if not exists created_at timestamptz default now(),
  add column if not exists updated_at timestamptz default now();

create unique index if not exists idx_profiles_username_unique on public.profiles (lower(username)) where username is not null;

-- Canonical comments table
create table if not exists public.comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_key text not null,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_comments_game_key_created on public.comments (game_key, created_at desc);
create index if not exists idx_comments_user_created on public.comments (user_id, created_at desc);

-- Canonical ratings table
create table if not exists public.ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_key text not null,
  rating int not null check (rating between 1 and 10),
  created_at timestamptz not null default now(),
  unique (user_id, game_key)
);

create index if not exists idx_ratings_game_key_created on public.ratings (game_key, created_at desc);

-- Badge definitions
create table if not exists public.badge_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  icon text,
  rarity text not null default 'common',
  rule_json jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.badge_definitions
  add column if not exists icon text,
  add column if not exists rule_json jsonb default '{}'::jsonb,
  add column if not exists rarity text default 'common',
  add column if not exists active boolean default true,
  add column if not exists created_at timestamptz default now();

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id uuid not null references public.badge_definitions(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (user_id, badge_id)
);

create table if not exists public.challenges (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  description text,
  rules_json jsonb not null default '{}'::jsonb,
  reward_json jsonb not null default '{}'::jsonb,
  start_at timestamptz,
  end_at timestamptz,
  supporter_only boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.challenges
  add column if not exists slug text,
  add column if not exists rules_json jsonb default '{}'::jsonb,
  add column if not exists reward_json jsonb default '{}'::jsonb,
  add column if not exists supporter_only boolean default false,
  add column if not exists active boolean default true,
  add column if not exists created_at timestamptz default now();

create unique index if not exists idx_challenges_slug_unique on public.challenges (slug) where slug is not null;

create table if not exists public.user_challenge_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  progress_json jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  unique (user_id, challenge_id)
);

-- Helpful ranking view (comment/rating counts)
create or replace view public.community_rankings as
select
  p.id as user_id,
  p.username,
  coalesce(c.comment_count, 0)::int as comment_count,
  coalesce(r.rating_count, 0)::int as rating_count,
  (coalesce(c.comment_count, 0) * 2 + coalesce(r.rating_count, 0))::int as score
from public.profiles p
left join (
  select user_id, count(*) as comment_count
  from public.game_comments
  group by user_id
) c on c.user_id = p.id
left join (
  select user_id, count(*) as rating_count
  from public.game_ratings
  group by user_id
) r on r.user_id = p.id;

alter table public.profiles enable row level security;
alter table public.comments enable row level security;
alter table public.ratings enable row level security;
alter table public.badge_definitions enable row level security;
alter table public.user_badges enable row level security;
alter table public.challenges enable row level security;
alter table public.user_challenge_progress enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_public_read') then
    create policy profiles_public_read on public.profiles for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_owner_insert') then
    create policy profiles_owner_insert on public.profiles for insert to authenticated with check (id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_owner_update') then
    create policy profiles_owner_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments_public_read') then
    create policy comments_public_read on public.comments for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='comments' and policyname='comments_authenticated_insert') then
    create policy comments_authenticated_insert on public.comments for insert to authenticated with check (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ratings' and policyname='ratings_public_read') then
    create policy ratings_public_read on public.ratings for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='ratings' and policyname='ratings_owner_write') then
    create policy ratings_owner_write on public.ratings for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='badge_definitions' and policyname='badge_definitions_public_read') then
    create policy badge_definitions_public_read on public.badge_definitions for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='challenges' and policyname='challenges_public_read') then
    create policy challenges_public_read on public.challenges for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_badges' and policyname='user_badges_owner_read') then
    create policy user_badges_owner_read on public.user_badges for select to authenticated using (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_challenge_progress' and policyname='user_challenge_progress_owner_rw') then
    create policy user_challenge_progress_owner_rw on public.user_challenge_progress for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

insert into public.badge_definitions (slug, name, description, icon, rarity, rule_json, active)
values
  ('first-comment', 'First Comment', 'Post your first community comment.', '/resources/icons/badges/first-comment.svg', 'common', '{"comments":1}'::jsonb, true),
  ('five-comments', 'Talkative', 'Post 5 comments.', '/resources/icons/badges/five-comments.svg', 'common', '{"comments":5}'::jsonb, true),
  ('ten-ratings', 'Score Master', 'Submit 10 game ratings.', '/resources/icons/badges/ten-ratings.svg', 'rare', '{"ratings":10}'::jsonb, true),
  ('retro-critic', 'Retro Critic', 'Leave thoughtful feedback in comments.', '/resources/icons/badges/retro-critic.svg', 'rare', '{}'::jsonb, true),
  ('c64-fan', 'C64 Fan', 'Participate in C64 game discussions.', '/resources/icons/badges/c64-fan.svg', 'common', '{}'::jsonb, true),
  ('amiga-fan', 'Amiga Fan', 'Participate in Amiga game discussions.', '/resources/icons/badges/amiga-fan.svg', 'common', '{}'::jsonb, true),
  ('weekly-streak', 'Weekly Streak', 'Stay active 7 days in a row.', '/resources/icons/badges/weekly-streak.svg', 'epic', '{}'::jsonb, true),
  ('community-helper', 'Community Helper', 'Receive helpful votes.', '/resources/icons/badges/community-helper.svg', 'rare', '{}'::jsonb, true),
  ('legend-tier', 'Legend Tier', 'Reach top community rank.', '/resources/icons/badges/legend-tier.svg', 'legendary', '{}'::jsonb, true),
  ('challenge-runner', 'Challenge Runner', 'Complete any challenge.', '/resources/icons/badges/challenge-runner.svg', 'common', '{}'::jsonb, true)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  rarity = excluded.rarity,
  rule_json = excluded.rule_json,
  active = excluded.active;

insert into public.challenges (slug, title, description, rules_json, reward_json, supporter_only, active)
values
  ('weekly-comment-sprint', 'Weekly Comment Sprint', 'Post 3 comments this week.', '{"comments":3,"window":"7d"}'::jsonb, '{"badge":"challenge-runner"}'::jsonb, false, true),
  ('rating-rush', 'Rating Rush', 'Rate 5 games this week.', '{"ratings":5,"window":"7d"}'::jsonb, '{"points":25}'::jsonb, false, true),
  ('supporter-spotlight', 'Supporter Spotlight', 'Supporter-only bonus mission lane.', '{"combo":"comment+rating"}'::jsonb, '{"cosmetic":"omega-frame"}'::jsonb, true, true)
on conflict (slug) do update set
  title = excluded.title,
  description = excluded.description,
  rules_json = excluded.rules_json,
  reward_json = excluded.reward_json,
  supporter_only = excluded.supporter_only,
  active = excluded.active;
