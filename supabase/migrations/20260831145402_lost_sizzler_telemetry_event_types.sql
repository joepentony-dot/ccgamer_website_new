-- Keep the persisted Lost Sizzler telemetry contract aligned with the
-- allow-listed events accepted by the production feedback Edge Function.
--
-- R46 added coarse release-candidate milestones and R47 added client-error
-- telemetry, but the original game_play_events CHECK constraint still allowed
-- only the older five event types. The mismatch caused valid telemetry writes
-- to fail with HTTP 500 responses.

alter table public.game_play_events
  drop constraint if exists game_play_events_event_type_check;

alter table public.game_play_events
  add constraint game_play_events_event_type_check
  check (
    event_type in (
      'start_click',
      'run_started',
      'run_started_detail',
      'floor_reached',
      'floor_cleared',
      'run_ended',
      'mobile_pc_notice_accept',
      'rating_submitted',
      'rating_dismissed',
      'client_error'
    )
  ) not valid;

alter table public.game_play_events
  validate constraint game_play_events_event_type_check;

comment on constraint game_play_events_event_type_check on public.game_play_events is
  'Allow-list of Lost Sizzler telemetry event types accepted by the production feedback Edge Function.';
