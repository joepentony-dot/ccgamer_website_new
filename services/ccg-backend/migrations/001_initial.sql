begin;

create extension if not exists pgcrypto;

create table if not exists ccg_users (
  user_id text primary key,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists lost_sizzler_cloud_saves (
  user_id text primary key references ccg_users(user_id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  schema_name text not null default 'ccg-lost-sizzler-solo-save',
  schema_version smallint not null default 2 check (schema_version > 0),
  game_version text not null default 'V10.41',
  save_envelope jsonb,
  save_checksum text,
  payload_sha256 text,
  save_saved_at timestamptz,
  client_revision_ms bigint not null default 0 check (client_revision_ms >= 0),
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  check (save_envelope is not null or deleted_at is not null),
  check (payload_sha256 is null or payload_sha256 ~ '^[0-9a-f]{64}$')
);

create table if not exists lost_sizzler_achievements (
  user_id text not null references ccg_users(user_id) on delete cascade,
  achievement_key text not null,
  unlocked_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  primary key (user_id, achievement_key)
);

create table if not exists lost_sizzler_collection_state (
  user_id text primary key references ccg_users(user_id) on delete cascade,
  revision bigint not null default 1 check (revision > 0),
  collection_payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists lost_sizzler_weekly_vault (
  user_id text not null references ccg_users(user_id) on delete cascade,
  week_key text not null,
  progress_payload jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, week_key)
);

create table if not exists lost_sizzler_ratings (
  user_id text not null references ccg_users(user_id) on delete cascade,
  subject_key text not null,
  rating smallint not null check (rating between 1 and 5),
  updated_at timestamptz not null default now(),
  primary key (user_id, subject_key)
);

create table if not exists lost_sizzler_feedback (
  feedback_id uuid primary key default gen_random_uuid(),
  user_id text references ccg_users(user_id) on delete set null,
  category text not null,
  message text not null check (char_length(message) between 1 and 5000),
  client_version text,
  created_at timestamptz not null default now()
);

create table if not exists lost_sizzler_multiplayer_rooms (
  room_id uuid primary key default gen_random_uuid(),
  room_code text not null unique,
  host_user_id text references ccg_users(user_id) on delete set null,
  mode text not null,
  state_payload jsonb not null default '{}'::jsonb,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(room_code) between 4 and 32),
  check (expires_at > created_at)
);

create index if not exists lost_sizzler_achievements_user_idx
  on lost_sizzler_achievements(user_id, unlocked_at desc);
create index if not exists lost_sizzler_weekly_vault_week_idx
  on lost_sizzler_weekly_vault(week_key, updated_at desc);
create index if not exists lost_sizzler_feedback_created_idx
  on lost_sizzler_feedback(created_at desc);
create index if not exists lost_sizzler_multiplayer_rooms_expires_idx
  on lost_sizzler_multiplayer_rooms(expires_at);

comment on table lost_sizzler_cloud_saves is
  'Optional online mirror only. Local Lost Sizzler save state remains authoritative for offline play. Source-compatible schema/checksum/revision/tombstone fields are retained for verified Supabase migration.';
comment on column lost_sizzler_cloud_saves.payload_sha256 is
  'CCG-backend canonical SHA-256 integrity proof. This is separate from the existing 8-character Lost Sizzler envelope save_checksum.';
comment on table lost_sizzler_achievements is
  'Optional account synchronization. Local achievement state must remain usable without this service.';
comment on table lost_sizzler_collection_state is
  'Optional account synchronization for permanent collection/dossier state.';
comment on table lost_sizzler_multiplayer_rooms is
  'Ephemeral online enhancement; never required to launch or play local game modes.';

commit;
