alter table public.game_feedback
  add column if not exists email_status text not null default 'pending',
  add column if not exists email_error text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.game_feedback'::regclass
      and conname='game_feedback_email_status_check'
  ) then
    alter table public.game_feedback
      add constraint game_feedback_email_status_check
      check (email_status in ('pending','sent','failed'));
  end if;
end $$;
