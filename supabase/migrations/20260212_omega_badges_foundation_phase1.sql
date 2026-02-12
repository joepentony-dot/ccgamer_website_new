-- Omega Phase 1: badge foundation compatibility layer

alter table if exists public.badge_definitions
  add column if not exists category text not null default 'activity';

alter table if exists public.badge_definitions
  add column if not exists active boolean not null default true;

alter table if exists public.user_badges
  add column if not exists awarded_at timestamptz not null default now(),
  add column if not exists awarded_by text not null default 'system';

update public.user_badges
set awarded_at = coalesce(awarded_at, earned_at, now())
where awarded_at is null;

create or replace view public.badges as
select
  id,
  slug,
  name,
  description,
  icon,
  category,
  active as is_active,
  created_at
from public.badge_definitions;

alter view public.badges set (security_invoker = true);
