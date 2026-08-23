revoke all on table public.game_play_events from anon;
revoke insert, update, delete on table public.game_play_events from authenticated;
grant select on table public.game_play_events to authenticated;
revoke all on sequence public.game_play_events_id_seq from anon, authenticated;

revoke all on table public.game_feedback from anon;
revoke insert, update, delete on table public.game_feedback from authenticated;
grant select on table public.game_feedback to authenticated;
