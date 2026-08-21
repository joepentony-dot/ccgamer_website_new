-- Cheeky Commodore Quest: one authenticated Weekly High-Score Vault attempt.

alter table public.profiles
  add column if not exists notify_weekly_challenge boolean not null default true;

create table if not exists public.ccq_weekly_attempts (
  id uuid primary key default gen_random_uuid(),
  week_start date not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  player_name text not null check (char_length(player_name) between 1 and 64),
  seed text not null check (char_length(seed) between 8 and 80),
  status text not null default 'started' check (status in ('started','finished')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  score integer check (score between 0 and 99999999),
  deepest_floor smallint check (deepest_floor between 1 and 5),
  duration_ms integer check (duration_ms between 0 and 86400000),
  level smallint check (level between 1 and 99),
  completed boolean not null default false,
  stats jsonb not null default '{}'::jsonb,
  unique (week_start, user_id)
);

create index if not exists ccq_weekly_attempts_week_score_idx
  on public.ccq_weekly_attempts (week_start, score desc nulls last, deepest_floor desc nulls last);

alter table public.ccq_weekly_attempts enable row level security;
revoke all on table public.ccq_weekly_attempts from anon, authenticated;

create table if not exists public.ccq_weekly_leaderboard (
  attempt_id uuid primary key references public.ccq_weekly_attempts(id) on delete cascade,
  week_start date not null,
  player_name text not null check (char_length(player_name) between 1 and 64),
  score integer not null check (score between 0 and 99999999),
  deepest_floor smallint not null check (deepest_floor between 1 and 5),
  duration_ms integer not null check (duration_ms between 0 and 86400000),
  level smallint not null check (level between 1 and 99),
  completed boolean not null default false,
  recorded_at timestamptz not null default now()
);

create index if not exists ccq_weekly_leaderboard_rank_idx
  on public.ccq_weekly_leaderboard (week_start, score desc, deepest_floor desc, duration_ms asc);

alter table public.ccq_weekly_leaderboard enable row level security;
revoke all on table public.ccq_weekly_leaderboard from anon, authenticated;
grant select on table public.ccq_weekly_leaderboard to anon, authenticated;

drop policy if exists "Weekly leaderboard is public" on public.ccq_weekly_leaderboard;
create policy "Weekly leaderboard is public"
  on public.ccq_weekly_leaderboard for select
  to anon, authenticated
  using (true);

create table if not exists public.ccq_weekly_result_deliveries (
  week_start date primary key,
  status text not null default 'processing' check (status in ('processing','sent','partial','failed')),
  emailed integer not null default 0,
  email_failed integer not null default 0,
  discord_sent boolean not null default false,
  error_detail text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

alter table public.ccq_weekly_result_deliveries enable row level security;
revoke all on table public.ccq_weekly_result_deliveries from anon, authenticated;

comment on table public.ccq_weekly_attempts is 'Private, server-written weekly Cheeky Commodore Quest attempt records.';
comment on table public.ccq_weekly_leaderboard is 'Public score-only projection; contains no account IDs or email addresses.';
comment on column public.profiles.notify_weekly_challenge is 'Member may opt out of the weekly Cheeky Commodore Quest results email.';
