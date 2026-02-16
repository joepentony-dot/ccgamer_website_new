-- ============================================================
-- CCG PHASE 2 — COMMUNITY FEATURES
-- File: /admin/supabase/phase2-community.sql
--
-- Run this ONCE in Supabase SQL editor.
-- Depends on Phase 1 profiles table existing:
-- public.profiles (id, email, display_name, joined_at, newsletter flags, etc.)
-- ============================================================

begin;

-- 1) Public profile view (no email, no private flags)
create or replace view public.profiles_public as
select
  id,
  display_name,
  joined_at
from public.profiles;

-- Keep public view selectable via RLS on underlying table is not needed (view reads table),
-- so we provide a SECURITY DEFINER function for safe reads by id if you want strict control.
-- However, simplest is: allow select on view only, while profiles table remains owner-only.

revoke all on public.profiles_public from anon, authenticated;
grant select on public.profiles_public to anon, authenticated;


-- 2) Comments (soft delete ready)
create table if not exists public.game_comments (
  id bigserial primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_slug text not null,
  content text not null check (char_length(content) between 1 and 2000),
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- updated_at trigger (reuse if already exists)
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_game_comments_updated on public.game_comments;
create trigger trg_game_comments_updated
before update on public.game_comments
for each row
execute function public.set_updated_at();


-- 3) Ratings (one per user per game)
create table if not exists public.game_ratings (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_slug text not null,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, game_slug)
);

drop trigger if exists trg_game_ratings_updated on public.game_ratings;
create trigger trg_game_ratings_updated
before update on public.game_ratings
for each row
execute function public.set_updated_at();


-- 4) Activity feed (append-only events)
create table if not exists public.community_activity (
  id bigserial primary key,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  activity_type text not null,
  game_slug text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);


-- 5) Helper RPC: log activity (secure; writes as current user only)
create or replace function public.log_activity(
  p_activity_type text,
  p_game_slug text default null,
  p_meta jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.community_activity(profile_id, activity_type, game_slug, meta)
  values (auth.uid(), p_activity_type, p_game_slug, coalesce(p_meta, '{}'::jsonb));
end;
$$;

revoke all on function public.log_activity(text, text, jsonb) from anon;
grant execute on function public.log_activity(text, text, jsonb) to authenticated;


-- 6) Admin summary view (requires authenticated; can be tightened later to service role only)
create or replace view public.admin_summary as
select
  (select count(*) from public.profiles) as total_users,
  (select count(*) from public.game_comments where is_deleted = false) as total_comments,
  (select count(*) from public.game_ratings) as total_ratings,
  (select count(*) from public.community_activity) as total_activity;

revoke all on public.admin_summary from anon;
grant select on public.admin_summary to authenticated;


-- ============================================================
-- RLS
-- ============================================================

-- COMMENTS RLS
alter table public.game_comments enable row level security;

drop policy if exists comments_select_public on public.game_comments;
create policy comments_select_public
on public.game_comments
for select
using (is_deleted = false);

drop policy if exists comments_insert_own on public.game_comments;
create policy comments_insert_own
on public.game_comments
for insert
with check (auth.uid() = profile_id);

drop policy if exists comments_update_own on public.game_comments;
create policy comments_update_own
on public.game_comments
for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

-- soft delete instead of hard delete (client should update is_deleted=true)
drop policy if exists comments_delete_none on public.game_comments;
create policy comments_delete_none
on public.game_comments
for delete
using (false);


-- RATINGS RLS
alter table public.game_ratings enable row level security;

drop policy if exists ratings_select_public on public.game_ratings;
create policy ratings_select_public
on public.game_ratings
for select
using (true);

drop policy if exists ratings_upsert_own on public.game_ratings;
create policy ratings_upsert_own
on public.game_ratings
for insert
with check (auth.uid() = profile_id);

drop policy if exists ratings_update_own on public.game_ratings;
create policy ratings_update_own
on public.game_ratings
for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists ratings_delete_own on public.game_ratings;
create policy ratings_delete_own
on public.game_ratings
for delete
using (auth.uid() = profile_id);


-- ACTIVITY RLS
alter table public.community_activity enable row level security;

drop policy if exists activity_select_public on public.community_activity;
create policy activity_select_public
on public.community_activity
for select
using (true);

drop policy if exists activity_insert_self on public.community_activity;
create policy activity_insert_self
on public.community_activity
for insert
with check (auth.uid() = profile_id);

drop policy if exists activity_update_none on public.community_activity;
create policy activity_update_none
on public.community_activity
for update
using (false);

drop policy if exists activity_delete_none on public.community_activity;
create policy activity_delete_none
on public.community_activity
for delete
using (false);

commit;
