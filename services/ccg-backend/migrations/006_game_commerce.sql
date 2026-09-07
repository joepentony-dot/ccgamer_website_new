begin;

create table if not exists game_products (
  product_slug text primary key,
  game_slug text not null,
  title text not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  price_minor integer not null check (price_minor between 1 and 1000000),
  entitlement_kind text not null default 'permanent' check (entitlement_kind = 'permanent'),
  includes_all_updates boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (char_length(product_slug) between 1 and 96),
  check (char_length(game_slug) between 1 and 96),
  check (char_length(title) between 1 and 160)
);

insert into game_products (
  product_slug,
  game_slug,
  title,
  currency,
  price_minor,
  entitlement_kind,
  includes_all_updates,
  active
)
values (
  'the-lost-sizzler-full-game',
  'the-lost-sizzler',
  'The Lost Sizzler — Full Game',
  'GBP',
  199,
  'permanent',
  true,
  true
)
on conflict (product_slug) do nothing;

create table if not exists game_purchase_orders (
  id uuid primary key,
  user_id text not null references ccg_users(user_id) on delete restrict,
  product_slug text not null references game_products(product_slug) on delete restrict,
  provider text not null default 'paypal' check (provider = 'paypal'),
  provider_order_id text unique,
  provider_capture_id text unique,
  amount_minor integer not null check (amount_minor between 1 and 1000000),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'creating' check (status in ('creating','created','completed','failed','cancelled','refunded','reversed')),
  provider_status text,
  failure_code text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  check (provider_order_id is null or char_length(provider_order_id) between 1 and 128),
  check (provider_capture_id is null or char_length(provider_capture_id) between 1 and 128),
  check (failure_code is null or char_length(failure_code) between 1 and 160)
);

create index if not exists game_purchase_orders_user_created_idx
  on game_purchase_orders(user_id, created_at desc);
create index if not exists game_purchase_orders_product_status_idx
  on game_purchase_orders(product_slug, status, created_at desc);

create table if not exists game_entitlements (
  user_id text not null references ccg_users(user_id) on delete restrict,
  product_slug text not null references game_products(product_slug) on delete restrict,
  entitlement_kind text not null default 'permanent' check (entitlement_kind = 'permanent'),
  status text not null default 'active' check (status in ('active','revoked')),
  source_provider text not null default 'paypal' check (source_provider in ('paypal','admin','migration')),
  source_purchase_id uuid references game_purchase_orders(id) on delete restrict,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_reason text,
  updated_at timestamptz not null default now(),
  primary key (user_id, product_slug),
  check ((status = 'active' and revoked_at is null) or (status = 'revoked' and revoked_at is not null)),
  check (revoked_reason is null or char_length(revoked_reason) between 1 and 240)
);

create index if not exists game_entitlements_active_product_idx
  on game_entitlements(product_slug, user_id)
  where status = 'active';

create table if not exists paypal_webhook_events (
  event_id text primary key,
  event_type text not null,
  provider_order_id text,
  provider_capture_id text,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  processing_status text not null default 'received' check (processing_status in ('received','processed','ignored','failed')),
  received_at timestamptz not null default now(),
  processed_at timestamptz,
  outcome text,
  check (char_length(event_id) between 1 and 160),
  check (char_length(event_type) between 1 and 160),
  check (provider_order_id is null or char_length(provider_order_id) between 1 and 128),
  check (provider_capture_id is null or char_length(provider_capture_id) between 1 and 128),
  check (outcome is null or char_length(outcome) between 1 and 240)
);

comment on table game_products is
  'Server-authoritative catalogue for CCG game purchases. The Lost Sizzler is seeded as a one-time GBP 1.99 permanent unlock including all future game updates.';
comment on table game_purchase_orders is
  'Server-side payment ledger. Browser-supplied prices are never trusted; provider order and capture identifiers are retained for reconciliation without storing payer email.';
comment on table game_entitlements is
  'Account-owned game licences. The Lost Sizzler entitlement is permanent and version-independent so future game updates remain included.';
comment on table paypal_webhook_events is
  'Idempotency ledger for verified PayPal webhook events. Only a SHA-256 proof of the raw payload is retained here by default.';

commit;
