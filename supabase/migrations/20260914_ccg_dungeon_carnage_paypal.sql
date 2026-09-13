alter table public.ccg_product_entitlements
  add column if not exists paypal_order_id text,
  add column if not exists paypal_capture_id text;

create unique index if not exists ccg_product_entitlements_paypal_order_key
  on public.ccg_product_entitlements(paypal_order_id)
  where paypal_order_id is not null;

create unique index if not exists ccg_product_entitlements_paypal_capture_key
  on public.ccg_product_entitlements(paypal_capture_id)
  where paypal_capture_id is not null;

alter table public.ccg_checkout_sessions
  add column if not exists provider text not null default 'stripe',
  add column if not exists paypal_order_id text,
  add column if not exists paypal_capture_id text;

create unique index if not exists ccg_checkout_sessions_paypal_order_key
  on public.ccg_checkout_sessions(paypal_order_id)
  where paypal_order_id is not null;

create index if not exists ccg_checkout_sessions_paypal_capture_idx
  on public.ccg_checkout_sessions(paypal_capture_id)
  where paypal_capture_id is not null;

create table if not exists public.ccg_paypal_webhook_events (
  event_id text primary key,
  event_type text not null,
  resource_id text,
  processed_at timestamptz not null default now()
);

alter table public.ccg_paypal_webhook_events enable row level security;
revoke all on table public.ccg_paypal_webhook_events from anon, authenticated;
