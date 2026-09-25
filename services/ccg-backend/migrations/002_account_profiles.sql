begin;

create table if not exists ccg_auth_accounts (
  user_id text primary key references ccg_users(user_id) on delete cascade,
  email text not null,
  password_hash text,
  password_hash_algorithm text,
  email_confirmed_at timestamptz,
  last_sign_in_at timestamptz,
  banned_until timestamptz,
  disabled_at timestamptz,
  deleted_at timestamptz,
  source_provider text not null default 'supabase',
  source_app_metadata jsonb not null default '{}'::jsonb,
  source_user_metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(email) between 3 and 320),
  check (position('@' in email) > 1),
  check (
    password_hash is null
    or password_hash ~ '^\$2[aby]\$'
    or password_hash ~ '^\$argon2(id|i|d)\$'
  ),
  check (
    password_hash_algorithm is null
    or password_hash_algorithm in ('bcrypt', 'argon2id', 'argon2i', 'argon2d')
  )
);

create unique index if not exists ccg_auth_accounts_email_ci_unique
  on ccg_auth_accounts (lower(email))
  where deleted_at is null;

create table if not exists ccg_auth_identities (
  identity_id uuid primary key default gen_random_uuid(),
  user_id text not null references ccg_users(user_id) on delete cascade,
  provider text not null,
  provider_subject text not null,
  email text,
  identity_metadata jsonb not null default '{}'::jsonb,
  last_sign_in_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_subject)
);

create index if not exists ccg_auth_identities_user_idx
  on ccg_auth_identities (user_id, provider);

create table if not exists ccg_profiles (
  user_id text primary key references ccg_users(user_id) on delete cascade,
  username text,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  mode_pref text default 'c64',
  role text not null default 'user',
  avatar_url text,
  display_name text,
  bio text,
  updated_at timestamptz not null default now(),
  is_admin boolean not null default false,
  notify_new_games boolean not null default false,
  notify_newsletter boolean not null default false,
  notify_admin boolean default true,
  banned boolean not null default false,
  ban_reason text,
  banned_at timestamptz,
  email text,
  preferred_system text not null default 'both',
  is_public boolean not null default false,
  public_bio text not null default '',
  show_top_picks boolean not null default true,
  show_badges boolean not null default true,
  public_list_key text not null default 'none',
  public_list_title text not null default 'My CCG Collection',
  unsub_token text,
  notify_new_games_choice_recorded boolean not null default false,
  notify_newsletter_choice_recorded boolean not null default false,
  notification_preferences_updated_at timestamptz,
  hall_of_fame_opt_in boolean not null default false,
  supporter_verified boolean not null default false,
  supporter_tier text default 'supporter',
  supporter_since date,
  supporter_note text,
  supporter_sort_order integer not null default 0,
  notify_weekly_challenge boolean not null default true,
  check (preferred_system in ('c64', 'amiga', 'both')),
  check (public_list_key in ('none', 'played', 'want', 'owned', 'still')),
  check (
    supporter_tier is null
    or supporter_tier in ('founder', 'gold-medal', 'sizzler', 'supporter')
  )
);

create index if not exists ccg_profiles_username_ci_idx
  on ccg_profiles (lower(username))
  where username is not null;

comment on table ccg_auth_accounts is
  'CCG-owned authentication account records. Passwords are never stored; only compatible password hashes may be imported during an explicit verified migration.';
comment on column ccg_auth_accounts.password_hash is
  'Server-only password hash. Never return this field to browser clients, logs, exports intended for users, or diagnostics.';
comment on table ccg_auth_identities is
  'Provider identity mapping used to preserve stable user ownership while authentication is migrated away from Supabase.';
comment on table ccg_profiles is
  'CCG-owned copy of website profile state. Profile rows are separate from authentication so an auth-only account can exist without inventing profile data.';

commit;
