create table if not exists public.profile_game_library (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users(id) on delete cascade,
  game_slug text not null,
  played boolean not null default false,
  want_to_play boolean not null default false,
  owned_as_child boolean not null default false,
  still_own boolean not null default false,
  personal_rating smallint null,
  notes text not null default '',
  custom_lists text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profile_game_library_profile_game_unique unique (profile_id, game_slug),
  constraint profile_game_library_rating_range check (
    personal_rating is null or personal_rating between 1 and 10
  )
);

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

create index if not exists profile_game_library_profile_updated_idx
  on public.profile_game_library (profile_id, updated_at desc);
