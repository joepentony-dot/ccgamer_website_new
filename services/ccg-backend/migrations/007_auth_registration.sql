begin;

create table if not exists ccg_auth_email_verification_tokens (
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

create index if not exists ccg_auth_email_verification_user_idx
  on ccg_auth_email_verification_tokens (user_id, created_at desc);

comment on table ccg_auth_email_verification_tokens is
  'One-time email-verification token proofs for new CCG accounts. Raw verification tokens are delivered to the user and are never stored in PostgreSQL.';

commit;
