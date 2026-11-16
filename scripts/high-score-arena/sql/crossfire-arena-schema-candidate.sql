-- CCG HIGH SCORE ARENA: DRAFT CROSSFire BACKEND SCHEMA, NOT A DEPLOYED MIGRATION.
-- For isolated PostgreSQL 17 CI only. Promote through the reviewed Supabase
-- migration process when game-session validation and independent review pass.
-- IMPORTANT: No anonymous or member writes. Server-side service-role only.
-- This does not expose scores from the existing Cheeky Commodore Quest tables.
begin;

create table public.ccg_arena_games (
  game_key text primary key check (game_key ~ '^[a-z0-9-]{3,80}$'),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  platform text not null check (platform in ('c64', 'amiga')),
  media_format text not null check (media_format in ('prg', 'd64', 't64', 'adf')),
  media_entry_id text not null,
  media_sha256 text not null check (media_sha256 ~ '^[a-f0-9]{64}$'),
  media_byte_length integer not null check (media_byte_length > 2),
  rules_version smallint not null default 1 check (rules_version between 1 and 1000),
  score_ceiling integer not null default 999999 check (score_ceiling between 1 and 99999999),
  status text not null default 'pilot' check (status in ('pilot','active','retired')),
  created_at timestamptz not null default now(),
  unique (platform, media_entry_id)
);

create table public.ccg_arena_challenges (
  id uuid primary key default gen_random_uuid(),
  game_key text not null references public.ccg_arena_games(game_key) on delete restrict,
  slug text not null unique check (slug ~ '^[a-z0-9-]{4,100}$'),
  title text not null check (char_length(btrim(title)) between 1 and 120),
  status text not null default 'draft'
    check (status in ('draft','published','closed','cancelled')),
  start_at timestamptz not null,
  end_at timestamptz not null,
  rules_version smallint not null default 1 check (rules_version between 1 and 1000),
  created_at timestamptz not null default now(),
  check (end_at > start_at),
  unique (id, game_key)
);

-- The backend must create / finish these only after authenticating a CCG
-- member and validating the exact media + run. No public INSERT policy.
create table public.ccg_arena_attempts (
  id uuid primary key default gen_random_uuid(),
  game_key text not null references public.ccg_arena_games(game_key) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  nonce_sha256 text not null unique check (nonce_sha256 ~ '^[a-f0-9]{64}$'),
  media_sha256 text not null check (media_sha256 ~ '^[a-f0-9]{64}$'),
  rules_version smallint not null check (rules_version between 1 and 1000),
  status text not null default 'started'
    check (status in ('started','submitted','approved','rejected','expired')),
  claimed_score integer check (claimed_score between 0 and 99999999),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid references auth.users(id) on delete set null,
  private_review_note text,
  evidence jsonb not null default '{}'::jsonb,
  check (finished_at is null or finished_at >= started_at),
  check (reviewed_at is null or status in ('approved','rejected')),
  unique (id, game_key, user_id)
);
create index ccg_arena_attempts_user_recent_idx
  on public.ccg_arena_attempts (user_id, game_key, started_at desc);
create index ccg_arena_attempts_review_idx
  on public.ccg_arena_attempts (status, started_at)
  where status in ('submitted','approved');

-- Private one-best-per-account source, never exposed directly to browsers.
create table public.ccg_arena_personal_bests (
  id uuid primary key default gen_random_uuid(),
  game_key text not null references public.ccg_arena_games(game_key) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid not null unique,
  score integer not null check (score between 0 and 99999999),
  achieved_at timestamptz not null,
  unique (game_key, user_id),
  unique (id, game_key),
  foreign key (attempt_id, game_key, user_id)
    references public.ccg_arena_attempts(id, game_key, user_id) on delete cascade
);

-- Published projections contain no user_id, email, nonce, evidence or notes.
-- Only a reviewed server action may update them. Ties: earlier score first.
create table public.ccg_arena_alltime_public (
  record_id uuid primary key,
  game_key text not null,
  player_name text not null check (char_length(btrim(player_name)) between 1 and 64),
  score integer not null check (score between 0 and 99999999),
  achieved_at timestamptz not null,
  published_at timestamptz not null default now(),
  foreign key (record_id, game_key)
    references public.ccg_arena_personal_bests(id, game_key) on delete cascade
);
create index ccg_arena_alltime_rank_idx
  on public.ccg_arena_alltime_public (game_key, score desc, achieved_at asc, record_id);

-- One best per user per challenge, independent of permanent personal bests.
create table public.ccg_arena_challenge_bests (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null,
  game_key text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid not null,
  score integer not null check (score between 0 and 99999999),
  achieved_at timestamptz not null,
  unique (challenge_id, user_id),
  unique (id, challenge_id, game_key),
  foreign key (challenge_id, game_key)
    references public.ccg_arena_challenges(id, game_key) on delete restrict,
  foreign key (attempt_id, game_key, user_id)
    references public.ccg_arena_attempts(id, game_key, user_id) on delete cascade
);

create table public.ccg_arena_challenge_public (
  best_id uuid primary key,
  challenge_id uuid not null,
  game_key text not null,
  player_name text not null check (char_length(btrim(player_name)) between 1 and 64),
  score integer not null check (score between 0 and 99999999),
  achieved_at timestamptz not null,
  published_at timestamptz not null default now(),
  foreign key (best_id, challenge_id, game_key)
    references public.ccg_arena_challenge_bests(id, challenge_id, game_key) on delete cascade
);
create index ccg_arena_challenge_rank_idx
  on public.ccg_arena_challenge_public (challenge_id, score desc, achieved_at asc, best_id);

-- Every public-schema table uses RLS, even server-only records.
alter table public.ccg_arena_games enable row level security;
alter table public.ccg_arena_challenges enable row level security;
alter table public.ccg_arena_attempts enable row level security;
alter table public.ccg_arena_personal_bests enable row level security;
alter table public.ccg_arena_alltime_public enable row level security;
alter table public.ccg_arena_challenge_bests enable row level security;
alter table public.ccg_arena_challenge_public enable row level security;

revoke all on public.ccg_arena_games, public.ccg_arena_challenges,
  public.ccg_arena_attempts, public.ccg_arena_personal_bests,
  public.ccg_arena_alltime_public, public.ccg_arena_challenge_bests,
  public.ccg_arena_challenge_public from public, anon, authenticated;

-- Explicit server access; no service_role key may reach a public client.
grant all on public.ccg_arena_games, public.ccg_arena_challenges,
  public.ccg_arena_attempts, public.ccg_arena_personal_bests,
  public.ccg_arena_alltime_public, public.ccg_arena_challenge_bests,
  public.ccg_arena_challenge_public to service_role;

grant select on public.ccg_arena_games,
  public.ccg_arena_challenges,
  public.ccg_arena_alltime_public,
  public.ccg_arena_challenge_public to anon, authenticated;

-- A "pilot" game is deliberately invisible, including any staged scores.
create policy "Arena active games visible"
  on public.ccg_arena_games for select to anon, authenticated
  using (status = 'active');

create policy "Arena public competitions visible"
  on public.ccg_arena_challenges for select to anon, authenticated
  using (
    status in ('published', 'closed')
    and exists (
      select 1 from public.ccg_arena_games as g
      where g.game_key = ccg_arena_challenges.game_key
        and g.status = 'active'
    )
  );

create policy "Arena verified alltime records visible"
  on public.ccg_arena_alltime_public for select to anon, authenticated
  using (
    exists (
      select 1 from public.ccg_arena_games as g
      where g.game_key = ccg_arena_alltime_public.game_key
        and g.status = 'active'
    )
  );

create policy "Arena public challenge records visible"
  on public.ccg_arena_challenge_public for select to anon, authenticated
  using (
    exists (
      select 1 from public.ccg_arena_challenges as c
      join public.ccg_arena_games as g on g.game_key = c.game_key
      where c.id = ccg_arena_challenge_public.challenge_id
        and c.game_key = ccg_arena_challenge_public.game_key
        and c.status in ('published', 'closed')
        and g.status = 'active'
    )
  );

-- This record is inert until reviewed, enabled and deployed separately.
insert into public.ccg_arena_games
 (game_key, title, platform, media_format, media_entry_id,
  media_sha256, media_byte_length, rules_version, score_ceiling, status)
values
 ('c64-crossfire-atlantis', 'Crossfire (Pantheon / Atlantis)', 'c64',
  'prg', 'archive-02121',
  'ddc3ab84c98fc065fd39e69bfe68b7ee6de38ebab4b51b607bbcea64cad570a9',
  23637, 1, 999999, 'pilot');

comment on table public.ccg_arena_attempts
  is 'Private, server-authenticated and moderated score attempts; never a direct public browser-write API.';
comment on table public.ccg_arena_alltime_public
  is 'Public server-approved best-score projection with no account identifiers.';
comment on table public.ccg_arena_challenge_public
  is 'Public server-approved time-limited challenge projection with no account identifiers.';

commit;
