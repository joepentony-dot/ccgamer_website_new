-- CCG Member Hub Phase 7B: deletion-safe account library synchronisation
-- Adds persistent tombstones so a removal made on one device cannot be
-- recreated by an older browser copy during the next reconciliation.

alter table public.profile_game_library
  add column if not exists deleted_at timestamptz;

create index if not exists profile_game_library_profile_deleted_idx
  on public.profile_game_library (profile_id, deleted_at desc)
  where deleted_at is not null;

comment on column public.profile_game_library.deleted_at is
  'Deletion tombstone timestamp used to prevent removed personal-library records from being resurrected by stale devices.';
