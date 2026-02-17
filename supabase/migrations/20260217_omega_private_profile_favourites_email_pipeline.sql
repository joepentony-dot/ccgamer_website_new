-- OMEGA: private profile preferences + favourites + notification pipeline
create extension if not exists pgcrypto;

-- PART A: canonical private profile notifications preference + strict own-row policies.
alter table if exists public.profiles
  add column if not exists notify_new_games boolean not null default false;

alter table if exists public.profiles enable row level security;

drop policy if exists profiles_owner_select on public.profiles;
create policy profiles_owner_select
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists profiles_owner_update on public.profiles;
create policy profiles_owner_update
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- PART B: favourites table + strict owner-only RLS.
create table if not exists public.profile_favourites (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  game_slug text not null,
  created_at timestamptz not null default now(),
  constraint profile_favourites_profile_game_unique unique (profile_id, game_slug)
);

alter table public.profile_favourites enable row level security;

drop policy if exists profile_favourites_owner_select on public.profile_favourites;
create policy profile_favourites_owner_select
  on public.profile_favourites
  for select
  to authenticated
  using (profile_id = auth.uid());

drop policy if exists profile_favourites_owner_insert on public.profile_favourites;
create policy profile_favourites_owner_insert
  on public.profile_favourites
  for insert
  to authenticated
  with check (profile_id = auth.uid());

drop policy if exists profile_favourites_owner_delete on public.profile_favourites;
create policy profile_favourites_owner_delete
  on public.profile_favourites
  for delete
  to authenticated
  using (profile_id = auth.uid());

-- PART C: release registry + optional outbox + catalog mirror used by scheduled functions.
create table if not exists public.game_releases (
  id uuid primary key default gen_random_uuid(),
  game_slug text not null,
  created_at timestamptz not null default now(),
  notified_at timestamptz null,
  constraint game_releases_game_slug_unique unique (game_slug)
);

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  to_email text not null,
  subject text not null,
  html text not null,
  purpose text not null,
  status text not null default 'queued',
  error text null,
  created_at timestamptz not null default now(),
  sent_at timestamptz null
);

create table if not exists public.games_catalog (
  game_slug text primary key,
  title text null
);

-- Optional scheduler bootstrap (safe no-op if extensions/secrets are unavailable).
create extension if not exists pg_net;
create extension if not exists pg_cron;

create or replace function public.invoke_notification_function(function_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  project_url text;
  service_role_key text;
  target_url text;
begin
  select decrypted_secret into project_url
  from vault.decrypted_secrets
  where name = 'SUPABASE_URL'
  limit 1;

  select decrypted_secret into service_role_key
  from vault.decrypted_secrets
  where name = 'SUPABASE_SERVICE_ROLE_KEY'
  limit 1;

  if coalesce(project_url, '') = '' or coalesce(service_role_key, '') = '' then
    raise notice 'Email not configured: missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY secret for scheduler.';
    return;
  end if;

  target_url := rtrim(project_url, '/') || '/functions/v1/' || function_name;

  perform net.http_post(
    url := target_url,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || service_role_key,
      'Content-Type', 'application/json'
    ),
    body := jsonb_build_object('source', 'pg_cron')
  );
end;
$$;

do $$
begin
  if not exists (select 1 from cron.job where jobname = 'ccg-send-new-game-notifications') then
    perform cron.schedule(
      'ccg-send-new-game-notifications',
      '*/10 * * * *',
      $$select public.invoke_notification_function('send_new_game_notifications');$$
    );
  end if;

  if not exists (select 1 from cron.job where jobname = 'ccg-send-weekly-random-game') then
    perform cron.schedule(
      'ccg-send-weekly-random-game',
      '0 10 * * 1',
      $$select public.invoke_notification_function('send_weekly_random_game');$$
    );
  end if;
exception
  when undefined_table then
    raise notice 'pg_cron not available yet; schedules were skipped.';
  when others then
    raise notice 'Scheduler setup skipped: %', sqlerrm;
end $$;
