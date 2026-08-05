-- CCG Member Hub Phase 2: private account-backed game library
-- Safe and additive. Existing favourites and browser-local data are untouched.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists preferred_system text not null default 'both';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_preferred_system_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_preferred_system_check
      check (preferred_system in ('c64', 'amiga', 'both'));
  end if;
end $$;

create table if not exists public.profile_game_library (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_slug text not null,
  title text,
  system text,
  release_year text,
  lists text[] not null default '{}'::text[],
  custom_lists text[] not null default '{}'::text[],
  rating smallint,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_game_library_profile_slug_unique unique (profile_id, game_slug),
  constraint profile_game_library_rating_check check (rating is null or rating between 1 and 10),
  constraint profile_game_library_lists_check check (
    lists <@ array['played', 'want', 'owned', 'still']::text[]
  )
);

alter table public.profile_game_library
  add column if not exists title text,
  add column if not exists system text,
  add column if not exists release_year text,
  add column if not exists lists text[] not null default '{}'::text[],
  add column if not exists custom_lists text[] not null default '{}'::text[],
  add column if not exists rating smallint,
  add column if not exists note text not null default '',
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create index if not exists profile_game_library_profile_updated_idx
  on public.profile_game_library (profile_id, updated_at desc);

create or replace function public.set_profile_game_library_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profile_game_library_set_updated_at on public.profile_game_library;
create trigger profile_game_library_set_updated_at
before update on public.profile_game_library
for each row execute function public.set_profile_game_library_updated_at();

alter table public.profile_game_library enable row level security;

drop policy if exists profile_game_library_owner_select on public.profile_game_library;
create policy profile_game_library_owner_select
  on public.profile_game_library
  for select
  to authenticated
  using (profile_id = auth.uid());

drop policy if exists profile_game_library_owner_insert on public.profile_game_library;
create policy profile_game_library_owner_insert
  on public.profile_game_library
  for insert
  to authenticated
  with check (profile_id = auth.uid());

drop policy if exists profile_game_library_owner_update on public.profile_game_library;
create policy profile_game_library_owner_update
  on public.profile_game_library
  for update
  to authenticated
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists profile_game_library_owner_delete on public.profile_game_library;
create policy profile_game_library_owner_delete
  on public.profile_game_library
  for delete
  to authenticated
  using (profile_id = auth.uid());

grant select, insert, update, delete on public.profile_game_library to authenticated;
