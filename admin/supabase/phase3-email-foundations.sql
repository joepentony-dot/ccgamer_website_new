-- ============================================================
-- CCG PHASE 3 — EMAIL FOUNDATIONS
-- File: /admin/supabase/phase3-email-foundations.sql
-- ============================================================

begin;

alter table if exists public.profiles
  add column if not exists newsletter_monthly boolean not null default false;

alter table if exists public.profiles
  add column if not exists notify_new_games boolean not null default false;

alter table if exists public.profiles
  add column if not exists notify_c64 boolean not null default false;

alter table if exists public.profiles
  add column if not exists notify_amiga boolean not null default false;

create table if not exists public.email_subscriptions (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  email text not null,
  status text not null default 'subscribed' check (status in ('subscribed', 'unsubscribed')),
  unsubscribe_token text unique,
  resubscribe_token text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_email_subscriptions_updated on public.email_subscriptions;
create trigger trg_email_subscriptions_updated
before update on public.email_subscriptions
for each row
execute function public.set_updated_at();

alter table public.email_subscriptions enable row level security;

drop policy if exists email_subscriptions_select_own on public.email_subscriptions;
create policy email_subscriptions_select_own
on public.email_subscriptions
for select
using (auth.uid() = profile_id);

drop policy if exists email_subscriptions_insert_own on public.email_subscriptions;
create policy email_subscriptions_insert_own
on public.email_subscriptions
for insert
with check (auth.uid() = profile_id);

drop policy if exists email_subscriptions_update_own on public.email_subscriptions;
create policy email_subscriptions_update_own
on public.email_subscriptions
for update
using (auth.uid() = profile_id)
with check (auth.uid() = profile_id);

drop policy if exists email_subscriptions_delete_none on public.email_subscriptions;
create policy email_subscriptions_delete_none
on public.email_subscriptions
for delete
using (false);

create or replace function public.unsubscribe_by_token(p_token text)
returns table (
  success boolean,
  message text,
  profile_id uuid
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_profile_id uuid;
begin
  if coalesce(trim(p_token), '') = '' then
    return query select false, 'Missing token'::text, null::uuid;
    return;
  end if;

  select es.profile_id
    into v_profile_id
  from public.email_subscriptions es
  where es.unsubscribe_token = p_token
  limit 1;

  if v_profile_id is null then
    return query select false, 'Invalid or expired token'::text, null::uuid;
    return;
  end if;

  update public.email_subscriptions
     set status = 'unsubscribed',
         updated_at = now()
   where profile_id = v_profile_id;

  update public.profiles
     set newsletter_monthly = false,
         notify_new_games = false,
         notify_c64 = false,
         notify_amiga = false
   where id = v_profile_id;

  return query select true, 'Unsubscribed'::text, v_profile_id;
end;
$$;

revoke all on function public.unsubscribe_by_token(text) from public;
grant execute on function public.unsubscribe_by_token(text) to anon, authenticated;

create or replace function public.get_subscribed_recipients()
returns table (
  profile_id uuid,
  email text,
  unsubscribe_token text,
  newsletter_monthly boolean,
  notify_new_games boolean,
  notify_c64 boolean,
  notify_amiga boolean
)
language sql
security definer
set search_path = ''
as $$
  select
    es.profile_id,
    es.email,
    es.unsubscribe_token,
    p.newsletter_monthly,
    p.notify_new_games,
    p.notify_c64,
    p.notify_amiga
  from public.email_subscriptions es
  join public.profiles p
    on p.id = es.profile_id
  where es.status = 'subscribed';
$$;

revoke all on function public.get_subscribed_recipients() from public;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.get_subscribed_recipients() to service_role;
  end if;
end;
$$;

insert into public.email_subscriptions(profile_id, email, status)
select p.id, coalesce(nullif(trim(p.email), ''), 'unknown@example.invalid'), 'subscribed'
from public.profiles p
where not exists (
  select 1
  from public.email_subscriptions es
  where es.profile_id = p.id
)
on conflict (profile_id) do nothing;

commit;
