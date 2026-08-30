create table if not exists public.lost_sizzler_request_buckets (
  bucket_key text primary key,
  window_started_at timestamptz not null default now(),
  request_count integer not null default 0,
  updated_at timestamptz not null default now(),
  constraint lost_sizzler_request_buckets_key_length_check check (char_length(bucket_key) between 1 and 160),
  constraint lost_sizzler_request_buckets_count_check check (request_count >= 0)
);

alter table public.lost_sizzler_request_buckets enable row level security;
revoke all on table public.lost_sizzler_request_buckets from public, anon, authenticated;
grant select, insert, update, delete on table public.lost_sizzler_request_buckets to service_role;

create index if not exists lost_sizzler_request_buckets_updated_idx
  on public.lost_sizzler_request_buckets (updated_at);

create or replace function public.consume_lost_sizzler_request_budget(
  p_bucket_key text,
  p_limit integer,
  p_window_seconds integer
)
returns table(allowed boolean, retry_after_seconds integer, request_count integer)
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_key text := left(btrim(coalesce(p_bucket_key, '')), 160);
  v_limit integer := greatest(1, least(coalesce(p_limit, 1), 10000));
  v_window integer := greatest(1, least(coalesce(p_window_seconds, 60), 86400));
  v_now timestamptz := clock_timestamp();
  v_started timestamptz;
  v_count integer;
begin
  if v_key = '' then
    return query select false, v_window, 0;
    return;
  end if;

  insert into public.lost_sizzler_request_buckets as bucket
    (bucket_key, window_started_at, request_count, updated_at)
  values
    (v_key, v_now, 1, v_now)
  on conflict (bucket_key) do update
    set request_count = case
          when excluded.updated_at - bucket.window_started_at >= make_interval(secs => v_window) then 1
          else bucket.request_count + 1
        end,
        window_started_at = case
          when excluded.updated_at - bucket.window_started_at >= make_interval(secs => v_window) then excluded.updated_at
          else bucket.window_started_at
        end,
        updated_at = excluded.updated_at
  returning window_started_at, public.lost_sizzler_request_buckets.request_count
  into v_started, v_count;

  return query
  select
    v_count <= v_limit,
    case
      when v_count <= v_limit then 0
      else greatest(1, ceil(extract(epoch from ((v_started + make_interval(secs => v_window)) - v_now)))::integer)
    end,
    v_count;
end;
$$;

revoke all on function public.consume_lost_sizzler_request_budget(text, integer, integer) from public, anon, authenticated;
grant execute on function public.consume_lost_sizzler_request_budget(text, integer, integer) to service_role;

create or replace function public.prune_lost_sizzler_telemetry(p_days integer default 90)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  v_days integer := greatest(30, least(coalesce(p_days, 90), 365));
  v_deleted integer := 0;
begin
  delete from public.game_play_events
  where game_slug = 'the-lost-sizzler'
    and created_at < now() - make_interval(days => v_days);
  get diagnostics v_deleted = row_count;

  delete from public.lost_sizzler_request_buckets
  where updated_at < now() - interval '2 days';

  return v_deleted;
end;
$$;

revoke all on function public.prune_lost_sizzler_telemetry(integer) from public, anon, authenticated;
grant execute on function public.prune_lost_sizzler_telemetry(integer) to service_role;

create index if not exists game_play_events_lost_sizzler_retention_idx
  on public.game_play_events (created_at)
  where game_slug = 'the-lost-sizzler';

comment on table public.lost_sizzler_request_buckets is
  'Service-role-only fixed-window request budgets for Lost Sizzler public Edge Functions. Bucket keys are one-way client fingerprints, never raw IP addresses.';
comment on function public.consume_lost_sizzler_request_budget(text, integer, integer) is
  'Atomically consumes one Lost Sizzler Edge Function request budget unit and returns whether the request is allowed.';
comment on function public.prune_lost_sizzler_telemetry(integer) is
  'Deletes Lost Sizzler gameplay telemetry older than the bounded retention period and clears stale rate-limit buckets.';
