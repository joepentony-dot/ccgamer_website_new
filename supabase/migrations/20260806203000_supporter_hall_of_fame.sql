-- CCG supporter Hall of Fame
-- Public output is restricted to an opt-in, admin-verified RPC.

alter table if exists public.profiles
  add column if not exists hall_of_fame_opt_in boolean not null default false,
  add column if not exists supporter_verified boolean not null default false,
  add column if not exists supporter_tier text,
  add column if not exists supporter_since date,
  add column if not exists supporter_note text,
  add column if not exists supporter_sort_order integer not null default 0;

alter table if exists public.profiles
  drop constraint if exists profiles_supporter_tier_check;

alter table if exists public.profiles
  add constraint profiles_supporter_tier_check
  check (
    supporter_tier is null
    or supporter_tier in ('founder', 'gold-medal', 'sizzler', 'supporter')
  );

create index if not exists idx_profiles_public_supporters
  on public.profiles (supporter_tier, supporter_sort_order, display_name)
  where hall_of_fame_opt_in = true and supporter_verified = true;

create or replace function public.public_supporter_hall_of_fame()
returns table (
  display_name text,
  supporter_tier text,
  supporter_since date,
  supporter_note text,
  supporter_sort_order integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), 'Supporter') as display_name,
    coalesce(p.supporter_tier, 'supporter') as supporter_tier,
    p.supporter_since,
    nullif(trim(p.supporter_note), '') as supporter_note,
    coalesce(p.supporter_sort_order, 0) as supporter_sort_order
  from public.profiles p
  where p.hall_of_fame_opt_in = true
    and p.supporter_verified = true
    and coalesce(p.banned, false) = false
  order by
    case coalesce(p.supporter_tier, 'supporter')
      when 'founder' then 1
      when 'gold-medal' then 2
      when 'sizzler' then 3
      else 4
    end,
    coalesce(p.supporter_sort_order, 0),
    lower(coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), 'Supporter'));
$$;

revoke all on function public.public_supporter_hall_of_fame() from public;
grant execute on function public.public_supporter_hall_of_fame() to anon, authenticated;

create or replace function public.admin_list_supporters(
  p_search text default null,
  p_limit integer default 250
)
returns table (
  user_id uuid,
  email text,
  display_name text,
  hall_of_fame_opt_in boolean,
  supporter_verified boolean,
  supporter_tier text,
  supporter_since date,
  supporter_note text,
  supporter_sort_order integer
)
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if not public.ccg_is_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  return query
  select
    u.id as user_id,
    u.email,
    coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), 'Member') as display_name,
    coalesce(p.hall_of_fame_opt_in, false) as hall_of_fame_opt_in,
    coalesce(p.supporter_verified, false) as supporter_verified,
    coalesce(p.supporter_tier, 'supporter') as supporter_tier,
    p.supporter_since,
    p.supporter_note,
    coalesce(p.supporter_sort_order, 0) as supporter_sort_order
  from auth.users u
  join public.profiles p on p.id = u.id
  where (
    p_search is null
    or u.email ilike '%' || p_search || '%'
    or p.display_name ilike '%' || p_search || '%'
    or p.username ilike '%' || p_search || '%'
  )
  and (
    coalesce(p.hall_of_fame_opt_in, false) = true
    or coalesce(p.supporter_verified, false) = true
  )
  order by
    coalesce(p.supporter_verified, false) desc,
    coalesce(p.hall_of_fame_opt_in, false) desc,
    coalesce(p.supporter_sort_order, 0),
    lower(coalesce(nullif(trim(p.display_name), ''), nullif(trim(p.username), ''), 'Member'))
  limit greatest(1, least(coalesce(p_limit, 250), 500));
end;
$$;

revoke all on function public.admin_list_supporters(text, integer) from public;
grant execute on function public.admin_list_supporters(text, integer) to authenticated;

create or replace function public.admin_set_supporter_status(
  p_user_id uuid,
  p_verified boolean,
  p_tier text default 'supporter',
  p_supporter_since date default null,
  p_note text default null,
  p_sort_order integer default 0
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tier text := lower(trim(coalesce(p_tier, 'supporter')));
  v_updated integer := 0;
begin
  if not public.ccg_is_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  if v_tier not in ('founder', 'gold-medal', 'sizzler', 'supporter') then
    raise exception 'invalid_supporter_tier';
  end if;

  update public.profiles
  set supporter_verified = coalesce(p_verified, false),
      supporter_tier = v_tier,
      supporter_since = p_supporter_since,
      supporter_note = nullif(trim(coalesce(p_note, '')), ''),
      supporter_sort_order = greatest(coalesce(p_sort_order, 0), 0),
      updated_at = now()
  where id = p_user_id;

  get diagnostics v_updated = row_count;

  if v_updated > 0 then
    insert into public.admin_activity_log (event_type, actor_user_id, target_user_id, metadata)
    values (
      'supporter_status_update',
      auth.uid(),
      p_user_id,
      jsonb_build_object(
        'verified', coalesce(p_verified, false),
        'tier', v_tier,
        'supporter_since', p_supporter_since,
        'sort_order', greatest(coalesce(p_sort_order, 0), 0)
      )
    );
  end if;

  return v_updated > 0;
end;
$$;

revoke all on function public.admin_set_supporter_status(uuid, boolean, text, date, text, integer) from public;
grant execute on function public.admin_set_supporter_status(uuid, boolean, text, date, text, integer) to authenticated;
