-- Phase 2: Community features
-- Supabase SQL editor migration script

-- PUBLIC PROFILES VIEW
-- Expose only public profile fields (no private flags/emails)
create or replace view public.profiles_public as
select
  id,
  display_name,
  joined_at
from public.profiles;

alter view public.profiles_public set (security_invoker = true);

-- COMMENTS TABLE
create table if not exists public.game_comments (
  id bigserial primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_slug text not null,
  content text not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RATINGS TABLE
create table if not exists public.game_ratings (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_slug text not null,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz default now(),
  primary key (profile_id, game_slug)
);

-- ACTIVITY LOG
create table if not exists public.community_activity (
  id bigserial primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  activity_type text not null,
  game_slug text,
  created_at timestamptz default now()
);

-- ADMIN VIEW: summary counts
create or replace view public.admin_summary as
select
  (select count(*) from public.profiles) as total_users,
  (select count(*) from public.game_comments) as total_comments,
  (select count(*) from public.game_ratings) as total_ratings;

alter view public.admin_summary set (security_invoker = true);

-- RLS POLICIES

-- COMMENTS RLS
alter table public.game_comments enable row level security;

drop policy if exists "comments_select_public" on public.game_comments;
create policy "comments_select_public"
on public.game_comments
for select using (true);

drop policy if exists "comments_insert_own" on public.game_comments;
create policy "comments_insert_own"
on public.game_comments
for insert
with check (auth.uid() = profile_id);

drop policy if exists "comments_update_own" on public.game_comments;
create policy "comments_update_own"
on public.game_comments
for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "comments_delete_own" on public.game_comments;
create policy "comments_delete_own"
on public.game_comments
for delete using (auth.uid() = profile_id);

-- RATINGS RLS
alter table public.game_ratings enable row level security;

drop policy if exists "ratings_select_public" on public.game_ratings;
create policy "ratings_select_public"
on public.game_ratings
for select using (true);

drop policy if exists "ratings_insert_own" on public.game_ratings;
create policy "ratings_insert_own"
on public.game_ratings
for insert
with check (auth.uid() = profile_id);

drop policy if exists "ratings_update_own" on public.game_ratings;
create policy "ratings_update_own"
on public.game_ratings
for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists "ratings_delete_own" on public.game_ratings;
create policy "ratings_delete_own"
on public.game_ratings
for delete using (auth.uid() = profile_id);

-- ACTIVITY RLS
alter table public.community_activity enable row level security;

drop policy if exists "activity_insert_self" on public.community_activity;
create policy "activity_insert_self"
on public.community_activity
for insert
with check (auth.uid() = profile_id);

drop policy if exists "activity_select_public" on public.community_activity;
create policy "activity_select_public"
on public.community_activity
for select using (true);

-- ADMIN VIEW SECURITY
-- Admin summary view is for authenticated only (you can adjust further later)
grant select on public.admin_summary to authenticated;

-- BUILT-IN RPCs (optional helper)
create or replace function public.log_activity(
  p_profile uuid,
  p_type text,
  p_game text default null
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.community_activity(profile_id, activity_type, game_slug)
  values (p_profile, p_type, p_game);
end;
$$;

grant execute on function public.log_activity(uuid, text, text) to authenticated;
