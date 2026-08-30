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
  returning bucket.window_started_at, bucket.request_count
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

comment on function public.consume_lost_sizzler_request_budget(text, integer, integer) is
  'Atomically consumes one Lost Sizzler Edge Function request budget unit and returns whether the request is allowed. The RETURNING clause uses the INSERT target alias so runtime calls remain valid.';
