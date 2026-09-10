begin;

create table if not exists ccg_auth_pending_registration_preferences (
  user_id text primary key references ccg_users(user_id) on delete cascade,
  notify_new_games boolean not null,
  notify_newsletter boolean not null,
  notify_new_games_choice_recorded boolean not null,
  notify_newsletter_choice_recorded boolean not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table ccg_auth_pending_registration_preferences is
  'Temporary notification choices captured during CCG registration before email confirmation. Rows are removed once the choices are applied to ccg_profiles.';

commit;
