create table if not exists public.profile_top_picks (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references auth.users(id) on delete cascade,
  game_slug text not null,
  created_at timestamptz not null default now(),
  constraint profile_top_picks_profile_game_unique unique (profile_id, game_slug)
);

alter table public.profile_top_picks enable row level security;

drop policy if exists profile_top_picks_owner_select on public.profile_top_picks;
create policy profile_top_picks_owner_select
  on public.profile_top_picks
  for select
  to authenticated
  using (profile_id = auth.uid());

drop policy if exists profile_top_picks_owner_insert on public.profile_top_picks;
create policy profile_top_picks_owner_insert
  on public.profile_top_picks
  for insert
  to authenticated
  with check (profile_id = auth.uid());

drop policy if exists profile_top_picks_owner_delete on public.profile_top_picks;
create policy profile_top_picks_owner_delete
  on public.profile_top_picks
  for delete
  to authenticated
  using (profile_id = auth.uid());
