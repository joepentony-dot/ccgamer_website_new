-- C64 Dungeon Carnage: assignable website-member playtest access.
-- Canonical authority comes from public.user_roles; directory identity comes
-- from auth.users + profiles. The entitlement table stays private behind RPCs.
-- This migration is idempotent so repository history can safely converge with
-- production environments where the commerce tables already exist.

begin;

create table if not exists public.ccg_products (
  slug text primary key,
  name text not null,
  currency text not null default 'gbp',
  amount_pence integer not null check (amount_pence > 0),
  download_bucket text not null,
  download_path text,
  download_ready boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.ccg_products (
  slug, name, currency, amount_pence, download_bucket, download_path, download_ready, active
)
values (
  'c64-dungeon-carnage',
  'C64 Dungeon Carnage',
  'gbp',
  199,
  'ccg-paid-downloads',
  'c64-dungeon-carnage/c64-dungeon-carnage.zip',
  false,
  false
)
on conflict (slug) do nothing;

create table if not exists public.ccg_product_entitlements (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_slug text not null references public.ccg_products(slug) on delete restrict,
  status text not null default 'active'
    check (status in ('active', 'revoked', 'refunded', 'disputed')),
  source text not null default 'stripe',
  stripe_customer_id text,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  purchased_at timestamptz not null default now(),
  revoked_at timestamptz,
  updated_at timestamptz not null default now(),
  paypal_order_id text,
  paypal_capture_id text,
  primary key (user_id, product_slug)
);

create index if not exists ccg_product_entitlements_product_slug_idx
  on public.ccg_product_entitlements (product_slug);

create unique index if not exists ccg_product_entitlements_checkout_session_key
  on public.ccg_product_entitlements (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists ccg_product_entitlements_payment_intent_idx
  on public.ccg_product_entitlements (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create unique index if not exists ccg_product_entitlements_paypal_order_key
  on public.ccg_product_entitlements (paypal_order_id)
  where paypal_order_id is not null;

create unique index if not exists ccg_product_entitlements_paypal_capture_key
  on public.ccg_product_entitlements (paypal_capture_id)
  where paypal_capture_id is not null;

alter table public.ccg_product_entitlements enable row level security;
revoke all on public.ccg_product_entitlements from anon, authenticated;

create or replace function public.ccg_is_user_soft_banned(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $function$
  select coalesce((
    select coalesce(
      nullif(to_jsonb(sb) ->> 'is_banned', '')::boolean,
      nullif(to_jsonb(sb) ->> 'banned', '')::boolean,
      false
    )
    from public.user_soft_bans sb
    where sb.user_id = p_user_id
    limit 1
  ), false);
$function$;

revoke all on function public.ccg_is_user_soft_banned(uuid) from public;
revoke all on function public.ccg_is_user_soft_banned(uuid) from anon;
grant execute on function public.ccg_is_user_soft_banned(uuid) to authenticated;

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
set search_path = public, auth, pg_temp
as $function$
begin
  if auth.uid() is null or not exists (
    select 1
    from public.user_roles actor_role
    where actor_role.user_id = auth.uid()
      and lower(actor_role.role::text) in ('admin', 'superadmin')
  ) or public.ccg_is_user_soft_banned(auth.uid()) then
    raise exception 'Forbidden' using errcode = 'P0001';
  end if;

  return query
  select
    u.id::uuid as user_id,
    u.email::text as email,
    p.username::text as username,
    coalesce(p.created_at, u.created_at)::timestamptz as signup_date,
    u.last_sign_in_at::timestamptz as last_sign_in,
    coalesce(lower(member_role.role::text), 'user')::text as role,
    public.ccg_is_user_soft_banned(u.id)::boolean as banned,
    (
      coalesce(lower(member_role.role::text), 'user') = 'editor'
      or exists (
        select 1
        from public.user_badges ub
        where (to_jsonb(ub) ->> 'user_id') = u.id::text
          and lower(coalesce(
            to_jsonb(ub) ->> 'badge_key',
            to_jsonb(ub) ->> 'slug',
            ''
          )) = 'moderator'
      )
    )::boolean as is_moderator_badge,
    exists (
      select 1
      from public.ccg_product_entitlements e
      where e.user_id = u.id
        and e.product_slug = 'c64-dungeon-carnage'
        and e.status = 'active'
        and e.source = 'playtest'
    )::boolean as dungeon_carnage_playtester
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.user_roles member_role on member_role.user_id = u.id
  where
    (
      p_search is null
      or u.email ilike '%' || p_search || '%'
      or coalesce(p.username, '') ilike '%' || p_search || '%'
    )
    and (
      p_role is null
      or coalesce(lower(member_role.role::text), 'user') = lower(p_role)
    )
    and (
      p_banned is null
      or public.ccg_is_user_soft_banned(u.id) = p_banned
    )
  order by coalesce(p.created_at, u.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 100), 500))
  offset greatest(coalesce(p_offset, 0), 0);
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
    when public.ccg_is_user_soft_banned(auth.uid()) then false
    else exists (
      select 1
      from public.ccg_product_entitlements e
      where e.user_id = auth.uid()
        and e.product_slug = 'c64-dungeon-carnage'
        and e.status = 'active'
        and e.source = 'playtest'
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
set search_path = public, auth, pg_temp
as $function$
declare
  v_enabled boolean := coalesce(p_enabled, false);
  v_existing_source text;
begin
  if auth.uid() is null or not exists (
    select 1
    from public.user_roles actor_role
    where actor_role.user_id = auth.uid()
      and lower(actor_role.role::text) in ('admin', 'superadmin')
  ) or public.ccg_is_user_soft_banned(auth.uid()) then
    raise exception 'Forbidden' using errcode = 'P0001';
  end if;

  if p_user_id is null or not exists (
    select 1 from auth.users u where u.id = p_user_id
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

  if to_regclass('public.admin_activity_log') is not null then
    insert into public.admin_activity_log (
      event_type,
      actor_user_id,
      target_user_id,
      email,
      metadata
    )
    values (
      case when v_enabled then 'dungeon_playtest_grant' else 'dungeon_playtest_revoke' end,
      auth.uid(),
      p_user_id,
      (select u.email from auth.users u where u.id = auth.uid()),
      jsonb_build_object(
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
