-- Phase 20B: reliable content announcements
-- Additive and safe to run more than once.

create extension if not exists pgcrypto;

alter table if exists public.profiles
  add column if not exists notify_newsletter boolean default false,
  add column if not exists banned boolean default false,
  add column if not exists unsub_token text;

update public.profiles
set notify_newsletter = false
where notify_newsletter is null;

update public.profiles
set banned = false
where banned is null;

update public.profiles
set unsub_token = encode(gen_random_bytes(24), 'hex')
where unsub_token is null or length(trim(unsub_token)) < 24;

alter table if exists public.profiles
  alter column notify_newsletter set default false,
  alter column notify_newsletter set not null,
  alter column banned set default false,
  alter column banned set not null;

create unique index if not exists profiles_unsub_token_key
  on public.profiles(unsub_token)
  where unsub_token is not null;

create or replace function public.ccg_is_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = p_user_id
      and lower(coalesce(p.role, '')) in ('admin', 'superadmin')
  )
$$;

create table if not exists public.content_announcements (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  content_type text not null,
  content_category text not null,
  content_slug text not null,
  content_title text not null,
  content_url text not null,
  mode text not null default 'new_content',
  recipient_scope text not null,
  preference_column text not null,
  subject text not null,
  attempted integer not null default 0,
  sent integer not null default 0,
  failed integer not null default 0,
  status text not null default 'processing',
  error_detail text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint content_announcements_type_check
    check (content_type in ('game', 'retro_special', 'retro_event', 'demo_music')),
  constraint content_announcements_scope_check
    check (recipient_scope in ('test', 'members')),
  constraint content_announcements_preference_check
    check (preference_column in ('notify_new_games', 'notify_newsletter')),
  constraint content_announcements_mode_check
    check (mode in ('new_content', 'featured_classic', 'spotlight_pick')),
  constraint content_announcements_status_check
    check (status in ('processing', 'sent', 'partial', 'failed')),
  constraint content_announcements_counts_check
    check (attempted >= 0 and sent >= 0 and failed >= 0 and sent + failed <= attempted)
);

create index if not exists content_announcements_recent_idx
  on public.content_announcements(content_type, content_slug, recipient_scope, created_at desc);

create index if not exists content_announcements_actor_idx
  on public.content_announcements(actor_user_id, created_at desc);

alter table public.content_announcements enable row level security;

revoke all on public.content_announcements from anon;
revoke all on public.content_announcements from authenticated;
grant select on public.content_announcements to authenticated;

drop policy if exists content_announcements_admin_select on public.content_announcements;
create policy content_announcements_admin_select
  on public.content_announcements
  for select
  to authenticated
  using (public.ccg_is_admin(auth.uid()));

comment on table public.content_announcements is
  'Summary audit log for administrator content announcements. Recipient email addresses are not stored here.';
