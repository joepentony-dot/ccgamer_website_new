-- Lost Sizzler release-candidate telemetry enrichment.
-- Existing events remain valid; metadata is optional and bounded by the Edge
-- Function before insert. No gameplay, account or leaderboard authority lives
-- in this column.

alter table public.game_play_events
  add column if not exists metadata jsonb;

alter table public.game_play_events
  drop constraint if exists game_play_events_metadata_object_check;

alter table public.game_play_events
  add constraint game_play_events_metadata_object_check
  check (metadata is null or jsonb_typeof(metadata) = 'object');

comment on column public.game_play_events.metadata is
  'Optional coarse Lost Sizzler gameplay milestone metadata such as floor, score, kills, outcome and duration.';