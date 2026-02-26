-- CCG OMEGA — admin members one-pass DB-first fix
-- Stabilizes admin member RPCs used by /admin/members.html without changing frontend contracts.

begin;

-- A) Ensure required tables exist (future-proof, avoid regressions)
create table if not exists public.user_soft_bans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  is_banned boolean not null default false,
  reason text null,
  banned_until timestamptz null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_user_soft_bans_is_banned on public.user_soft_bans (is_banned);
create index if not exists idx_user_soft_bans_banned_until on public.user_soft_bans (banned_until);
create index if not exists idx_user_soft_bans_status_until on public.user_soft_bans (is_banned, banned_until);

alter table public.user_soft_bans enable row level security;

-- Lock direct table access; RPCs run as SECURITY DEFINER.
revoke all on public.user_soft_bans from anon, authenticated;

drop policy if exists user_soft_bans_no_direct_access on public.user_soft_bans;
create policy user_soft_bans_no_direct_access
  on public.user_soft_bans
  as restrictive
  for all
  to public
  using (false)
  with check (false);

-- B) Drop and recreate RPC functions cleanly (no ALTER return-type changes)
drop function if exists public.admin_list_members(boolean, integer, integer, text, text);
drop function if exists public.admin_list_members(text, text, boolean, integer, integer);
drop function if exists public.admin_set_member_role(uuid, text);
drop function if exists public.admin_set_member_soft_ban(uuid, boolean, text, timestamptz);
drop function if exists public.admin_set_member_soft_ban(uuid, boolean, text);

-- C) Recreate public.admin_list_members(...) with stable return shape expected by admin/js/admin-members.js
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
  is_moderator_badge boolean
)
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_role text;
begin
  select lower(coalesce(ur.role::text, ''))
    into v_actor_role
  from public.user_roles ur
  where ur.user_id = auth.uid();

  if v_actor_role not in ('admin', 'superadmin') then
    raise exception 'Forbidden';
  end if;

  return query
  select
    u.id as user_id,
    u.email::text as email,
    p.username::text as username,
    coalesce(p.created_at, u.created_at) as signup_date,
    u.last_sign_in_at as last_sign_in,
    coalesce(lower(r.role::text), 'user') as role,
    coalesce(sb.is_banned, false) as banned,
    case
      when to_regclass('public.user_badges') is null then false
      else exists (
        select 1
        from public.user_badges ub
        where (to_jsonb(ub) ->> 'user_id') = u.id::text
          and lower(coalesce(to_jsonb(ub) ->> 'badge_key', to_jsonb(ub) ->> 'slug', '')) = 'moderator'
      )
    end as is_moderator_badge
  from auth.users u
  left join public.profiles p
    on p.id = u.id
  left join public.user_roles r
    on r.user_id = u.id
  left join public.user_soft_bans sb
    on sb.user_id = u.id
  where
    (
      p_search is null
      or u.email ilike ('%' || p_search || '%')
      or coalesce(p.username, '') ilike ('%' || p_search || '%')
    )
    and (
      p_role is null
      or coalesce(lower(r.role::text), 'user') = lower(p_role)
    )
    and (
      p_banned is null
      or coalesce(sb.is_banned, false) = p_banned
    )
  order by coalesce(p.created_at, u.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 100), 500))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

-- D) Recreate role + soft-ban setters
create function public.admin_set_member_role(
  p_user_id uuid,
  p_new_role text
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_role text;
  v_next_role text := lower(coalesce(trim(p_new_role), ''));
  v_has_user_badges boolean;
  v_has_badge_key boolean;
  v_has_slug boolean;
  v_has_assigned_by boolean;
  v_has_assigned_at boolean;
begin
  select lower(coalesce(ur.role::text, ''))
    into v_actor_role
  from public.user_roles ur
  where ur.user_id = auth.uid();

  if v_actor_role not in ('admin', 'superadmin') then
    raise exception 'Forbidden';
  end if;

  if p_user_id is null then
    raise exception 'invalid_user_id';
  end if;

  if v_next_role = 'moderator' then
    v_next_role := 'editor';
  end if;

  if v_next_role not in ('user', 'editor', 'admin', 'superadmin') then
    raise exception 'invalid_role';
  end if;

  insert into public.user_roles (user_id, role)
  values (p_user_id, v_next_role)
  on conflict (user_id) do update
    set role = excluded.role;

  -- Moderator badge compatibility across possible user_badges schemas.
  select to_regclass('public.user_badges') is not null into v_has_user_badges;

  if v_has_user_badges then
    select exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'user_badges'
        and c.column_name = 'badge_key'
    ) into v_has_badge_key;

    select exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'user_badges'
        and c.column_name = 'slug'
    ) into v_has_slug;

    select exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'user_badges'
        and c.column_name = 'assigned_by'
    ) into v_has_assigned_by;

    select exists (
      select 1
      from information_schema.columns c
      where c.table_schema = 'public'
        and c.table_name = 'user_badges'
        and c.column_name = 'assigned_at'
    ) into v_has_assigned_at;

    if v_next_role = 'editor' then
      if v_has_badge_key and v_has_assigned_by and v_has_assigned_at then
        execute $sql$
          insert into public.user_badges (user_id, badge_key, assigned_by)
          values ($1, 'moderator', auth.uid())
          on conflict (user_id, badge_key) do update
            set assigned_by = excluded.assigned_by,
                assigned_at = now()
        $sql$ using p_user_id;
      elsif v_has_badge_key then
        execute $sql$
          insert into public.user_badges (user_id, badge_key)
          values ($1, 'moderator')
          on conflict (user_id, badge_key) do nothing
        $sql$ using p_user_id;
      elsif v_has_slug then
        execute $sql$
          insert into public.user_badges (user_id, slug)
          values ($1, 'moderator')
          on conflict (user_id, slug) do nothing
        $sql$ using p_user_id;
      end if;
    else
      if v_has_badge_key then
        execute 'delete from public.user_badges where user_id = $1 and badge_key = ''moderator''' using p_user_id;
      elsif v_has_slug then
        execute 'delete from public.user_badges where user_id = $1 and slug = ''moderator''' using p_user_id;
      end if;
    end if;
  end if;
end;
$$;

create function public.admin_set_member_soft_ban(
  p_user_id uuid,
  p_banned boolean,
  p_reason text,
  p_until timestamptz default null
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_actor_role text;
  v_banned boolean := coalesce(p_banned, false);
begin
  select lower(coalesce(ur.role::text, ''))
    into v_actor_role
  from public.user_roles ur
  where ur.user_id = auth.uid();

  if v_actor_role not in ('admin', 'superadmin') then
    raise exception 'Forbidden';
  end if;

  if p_user_id is null then
    raise exception 'invalid_user_id';
  end if;

  insert into public.user_soft_bans as sb (
    user_id,
    is_banned,
    reason,
    banned_until,
    updated_at
  )
  values (
    p_user_id,
    v_banned,
    case when v_banned then nullif(trim(coalesce(p_reason, '')), '') else null end,
    case when v_banned then p_until else null end,
    now()
  )
  on conflict (user_id) do update
    set is_banned = excluded.is_banned,
        reason = excluded.reason,
        banned_until = excluded.banned_until,
        updated_at = now();
end;
$$;

-- E) Grants
grant execute on function public.admin_list_members(boolean, integer, integer, text, text) to authenticated;
grant execute on function public.admin_set_member_role(uuid, text) to authenticated;
grant execute on function public.admin_set_member_soft_ban(uuid, boolean, text, timestamptz) to authenticated;

-- 3) SQL smoke tests / manual guidance
-- NOTE: run these manually in Supabase SQL Editor with an admin-authenticated context, or via client session in browser.
--
-- 1) Verify your current actor has admin/superadmin role in public.user_roles:
--    select ur.user_id, ur.role
--    from public.user_roles ur
--    where ur.user_id = auth.uid();
--
-- 2) (Optional) Ensure known owner/admin email maps to an admin role:
--    select u.email, ur.role
--    from auth.users u
--    left join public.user_roles ur on ur.user_id = u.id
--    where lower(u.email) = lower('<owner-or-admin-email@example.com>');
--
-- 3) Validate list RPC shape + execution:
--    select * from public.admin_list_members(null, 10, 0, null, null);
--
-- 4) Validate role setter:
--    select public.admin_set_member_role('<target-user-uuid>'::uuid, 'editor');
--
-- 5) Validate soft-ban setter:
--    select public.admin_set_member_soft_ban('<target-user-uuid>'::uuid, true, 'Moderation test', now() + interval '7 days');
--    select public.admin_set_member_soft_ban('<target-user-uuid>'::uuid, false, null, null);

commit;
