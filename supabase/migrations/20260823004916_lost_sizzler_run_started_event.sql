alter table public.game_play_events drop constraint if exists game_play_events_event_type_check;
alter table public.game_play_events add constraint game_play_events_event_type_check check (event_type in ('start_click','run_started','mobile_pc_notice_accept','rating_submitted','rating_dismissed'));
