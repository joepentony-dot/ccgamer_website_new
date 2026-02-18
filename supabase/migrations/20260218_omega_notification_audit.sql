create table if not exists public.notification_audit (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  event_type text,
  game_title text,
  game_slug text,
  system text,
  year integer,
  test_mode boolean,
  recipient_count integer,
  triggered_by uuid,
  triggered_by_email text
);
