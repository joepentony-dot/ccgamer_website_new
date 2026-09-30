-- C64 Dungeon Carnage: assignable website-member playtest access.
-- Uses the existing protected product-entitlement table rather than exposing
-- entitlement rows directly to authenticated browser clients.

begin;

drop function if exists public.admin_list_members(boolean, integer, integer, text, text);

create function public.admin_list_members(
  p_banned boolean default null,
  p_limit integer default 100,
  p_offset integer default 0,
  p_role text default null,
  p_search text default null
)
returns table (
  user_id uuid,
  email text,
  username text,
  signup_date timestamptz,
  last_sign_in timestamptz,
  role text,
  banned boolean,
  is_moderator_badge boolean,
  dungeon_carnage_playtester boolean
)
language plpgsql
security definer
set search_path = public, auth
as $function$
begin
  if not exists (
    select 1
    from public.profiles me
    where me.id = auth.uid()
      and me.is_admin = true
      and coalesce(me.banned, false) = false
  ) then
    raise exception 'Forbidden' using errcode = 'P0001';
  end if;

  return query
  select
    p.id::uuid as user_id,
    p.email::text as email,
    p.username::text as username,
    p.created_at::timestamptz as signup_date,
    p.last_seen::timestamptz as last_sign_in,
    coalesce(p.role, 'user')::text as role,
    coalesce(p.banned, false)::boolean as banned,
    (p.role = 'moderator')::boolean as is_moderator_badge,
    exists (
      select 1
      from public.ccg_product_entitlements e
      where e.user_id = p.id
        and e.product_slug = 'c64-dungeon-carnage'
        and e.status = 'active'
        and e.source = 'playtest'
    )::boolean as dungeon_carnage_playtester
  from public.profiles p
  where
    (p_banned is null or p.banned = p_banned)
    and (p_role is null or p.role = p_role)
    and (
      p_search is null
      or p.email ilike '%' || p_search || '%'
      or p.username ilike '%' || p_search || '%'
    )
  order by p.created_at desc
  limit greatest(p_limit, 1)
  offset greatest(p_offset, 0);
end;
$function$;

revoke all on function public.admin_list_members(boolean, integer, integer, text, text) from public;
revoke all on function public.admin_list_members(boolean, integer, integer, text, text) from anon;
grant execute on function public.admin_list_members(boolean, integer, integer, text, text) to authenticated;

create or replace function public.ccg_has_dungeon_carnage_playtest_access()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select case
    when auth.uid() is null then false
    else exists (
      select 1
      from public.ccg_product_entitlements e
      join public.profiles p on p.id = e.user_id
      where e.user_id = auth.uid()
        and e.product_slug = 'c64-dungeon-carnage'
        and e.status = 'active'
        and e.source = 'playtest'
        and coalesce(p.banned, false) = false
    )
  end;
$function$;

revoke all on function public.ccg_has_dungeon_carnage_playtest_access() from public;
revoke all on function public.ccg_has_dungeon_carnage_playtest_access() from anon;
grant execute on function public.ccg_has_dungeon_carnage_playtest_access() to authenticated;

create or replace function public.admin_set_dungeon_carnage_playtester(
  p_user_id uuid,
  p_enabled boolean
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $function$
declare
  v_enabled boolean := coalesce(p_enabled, false);
  v_existing_source text;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.profiles me
    where me.id = auth.uid()
      and me.is_admin = true
      and coalesce(me.banned, false) = false
  ) then
    raise exception 'Forbidden' using errcode = 'P0001';
  end if;

  if p_user_id is null or not exists (
    select 1 from public.profiles p where p.id = p_user_id
  ) then
    raise exception 'invalid_user_id' using errcode = 'P0001';
  end if;

  select e.source
  into v_existing_source
  from public.ccg_product_entitlements e
  where e.user_id = p_user_id
    and e.product_slug = 'c64-dungeon-carnage';

  if v_enabled then
    if v_existing_source is not null and v_existing_source <> 'playtest' then
      raise exception 'existing_non_playtest_entitlement' using errcode = 'P0001';
    end if;

    insert into public.ccg_product_entitlements (
      user_id,
      product_slug,
      status,
      source,
      purchased_at,
      revoked_at,
      updated_at
    )
    values (
      p_user_id,
      'c64-dungeon-carnage',
      'active',
      'playtest',
      now(),
      null,
      now()
    )
    on conflict (user_id, product_slug) do update
      set status = 'active',
          source = 'playtest',
          revoked_at = null,
          updated_at = now();
  else
    update public.ccg_product_entitlements e
    set status = 'revoked',
        revoked_at = now(),
        updated_at = now()
    where e.user_id = p_user_id
      and e.product_slug = 'c64-dungeon-carnage'
      and e.source = 'playtest';
  end if;

  if to_regclass('public.admin_audit_log') is not null then
    insert into public.admin_audit_log (actor_profile_id, action, details)
    values (
      auth.uid(),
      case when v_enabled then 'dungeon_playtest_grant' else 'dungeon_playtest_revoke' end,
      jsonb_build_object(
        'target_profile_id', p_user_id,
        'product_slug', 'c64-dungeon-carnage',
        'source', 'playtest',
        'enabled', v_enabled
      )
    );
  end if;

  return v_enabled;
end;
$function$;

revoke all on function public.admin_set_dungeon_carnage_playtester(uuid, boolean) from public;
revoke all on function public.admin_set_dungeon_carnage_playtester(uuid, boolean) from anon;
grant execute on function public.admin_set_dungeon_carnage_playtester(uuid, boolean) to authenticated;

commit;
