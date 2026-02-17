-- OMEGA: profile favourites foundation table + strict owner-only RLS
create extension if not exists pgcrypto;

create table if not exists public.profile_favourites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_slug text not null,
  created_at timestamptz not null default now(),
  constraint profile_favourites_profile_game_unique unique (profile_id, game_slug)
);

alter table public.profile_favourites enable row level security;

-- Read own favourites only.
drop policy if exists profile_favourites_owner_select on public.profile_favourites;
create policy profile_favourites_owner_select
  on public.profile_favourites
  for select
  to authenticated
  using (profile_id = auth.uid());

-- Insert own favourites only.
drop policy if exists profile_favourites_owner_insert on public.profile_favourites;
create policy profile_favourites_owner_insert
  on public.profile_favourites
  for insert
  to authenticated
  with check (profile_id = auth.uid());

-- Delete own favourites only.
drop policy if exists profile_favourites_owner_delete on public.profile_favourites;
create policy profile_favourites_owner_delete
  on public.profile_favourites
  for delete
  to authenticated
  using (profile_id = auth.uid());
