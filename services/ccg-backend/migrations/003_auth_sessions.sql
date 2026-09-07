begin;

create table if not exists ccg_auth_sessions (
  session_id uuid primary key default gen_random_uuid(),
  user_id text not null references ccg_users(user_id) on delete cascade,
  refresh_token_sha256 text not null unique,
  created_at timestamptz not null default now(),
  last_used_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  rotated_from uuid references ccg_auth_sessions(session_id) on delete set null,
  user_agent_sha256 text,
  client_fingerprint_sha256 text,
  check (refresh_token_sha256 ~ '^[0-9a-f]{64}$'),
  check (user_agent_sha256 is null or user_agent_sha256 ~ '^[0-9a-f]{64}$'),
  check (client_fingerprint_sha256 is null or client_fingerprint_sha256 ~ '^[0-9a-f]{64}$'),
  check (expires_at > created_at)
);

create index if not exists ccg_auth_sessions_user_active_idx
  on ccg_auth_sessions (user_id, expires_at desc)
  where revoked_at is null;

create table if not exists ccg_auth_login_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  check (char_length(bucket_key) between 1 and 160),
  check (request_count >= 0)
);

create table if not exists ccg_auth_recovery_tokens (
  token_id uuid primary key default gen_random_uuid(),
  user_id text not null references ccg_users(user_id) on delete cascade,
  token_sha256 text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz,
  requested_from_fingerprint_sha256 text,
  check (token_sha256 ~ '^[0-9a-f]{64}$'),
  check (requested_from_fingerprint_sha256 is null or requested_from_fingerprint_sha256 ~ '^[0-9a-f]{64}$'),
  check (expires_at > created_at)
);

create index if not exists ccg_auth_recovery_user_idx
  on ccg_auth_recovery_tokens (user_id, created_at desc);

comment on table ccg_auth_sessions is
  'CCG-owned refresh-session records. Only one-way SHA-256 refresh-token proofs are stored; raw refresh tokens never belong in PostgreSQL or logs.';
comment on table ccg_auth_login_buckets is
  'Fixed-window server-side login/recovery request budgets used to reduce brute-force and credential-stuffing risk.';
comment on table ccg_auth_recovery_tokens is
  'One-time password-recovery token proofs. Only token SHA-256 values are stored.';

commit;
