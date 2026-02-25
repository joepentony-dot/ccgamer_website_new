-- OMEGA PHASE 3: Roles + Moderator badge + role change list/RPC hardening
-- Additive and idempotent migration.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Badge foundation (public schema)
-- ---------------------------------------------------------------------------
create table if not exists public.badges (
  badge_key text primary key,
  label text not null,
  description text,
  sort_order integer not null default 100,
  is_system boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_key text not null references public.badges(badge_key) on delete cascade,
  assigned_at timestamptz not null default now(),
  assigned_by uuid references auth.users(id) on delete set null,
  primary key (user_id, badge_key)
);

create index if not exists idx_user_badges_badge_key on public.user_badges (badge_key, assigned_at desc);
create index if not exists idx_user_badges_user_id on public.user_badges (user_id, assigned_at desc);

insert into public.badges (badge_key, label, description, sort_order, is_system)
values ('moderator', 'Moderator', 'Assigned automatically when a member is in the Moderator role.', 10, true)
on conflict (badge_key) do update
set label = excluded.label,
    description = excluded.description,
    sort_order = excluded.sort_order,
    is_system = excluded.is_system,
    updated_at = now();

alter table if exists public.badges enable row level security;
alter table if exists public.user_badges enable row level security;

drop policy if exists badges_admin_read on public.badges;
create policy badges_admin_read
  on public.badges
  for select
  to authenticated
  using (public.ccg_is_admin(auth.uid()));

drop policy if exists user_badges_admin_read on public.user_badges;
create policy user_badges_admin_read
  on public.user_badges
  for select
  to authenticated
  using (public.ccg_is_admin(auth.uid()));

grant select on public.badges to authenticated;
grant select on public.user_badges to authenticated;

-- ---------------------------------------------------------------------------
-- Admin list members RPC (UI contract for phase 3)
-- ---------------------------------------------------------------------------
create or replace function public.admin_list_members(
  p_search text default null,
  p_role text default null,
  p_banned boolean default null,
  p_limit integer default 200,
  p_offset integer default 0
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
begin
  if not public.ccg_is_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  return query
  select
    u.id as user_id,
    u.email,
    p.username,
    coalesce(p.created_at, u.created_at) as signup_date,
    u.last_sign_in_at as last_sign_in,
    coalesce(lower(p.role), 'user') as role,
    coalesce(p.banned, false) as banned,
    exists (
      select 1
      from public.user_badges ub
      where ub.user_id = u.id
        and ub.badge_key = 'moderator'
    ) as is_moderator_badge
  from auth.users u
  left join public.profiles p on p.id = u.id
  where (
    p_search is null
    or u.email ilike '%' || p_search || '%'
    or p.username ilike '%' || p_search || '%'
  )
  and (
    p_role is null
    or lower(coalesce(p.role, 'user')) = lower(p_role)
  )
  and (
    p_banned is null
    or coalesce(p.banned, false) = p_banned
  )
  order by coalesce(p.created_at, u.created_at) desc
  limit greatest(1, least(coalesce(p_limit, 200), 500))
  offset greatest(coalesce(p_offset, 0), 0);
end;
$$;

grant execute on function public.admin_list_members(text, text, boolean, integer, integer) to authenticated;

-- ---------------------------------------------------------------------------
-- Admin role change RPC with badge sync and activity audit
-- ---------------------------------------------------------------------------
create or replace function public.admin_set_member_role(
  p_user_id uuid,
  p_role text
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_role text;
  v_actor_email text;
  v_previous_role text;
  v_next_role text := lower(coalesce(trim(p_role), ''));
  v_row public.profiles;
begin
  if auth.uid() is null then
    raise exception 'not_authorized';
  end if;

  select lower(coalesce(role, '')) into v_actor_role
  from public.profiles
  where id = auth.uid();

  if v_actor_role not in ('admin', 'superadmin') then
    raise exception 'not_authorized';
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

  select lower(coalesce(role, 'user'))
    into v_previous_role
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'user_not_found';
  end if;

  if v_actor_role <> 'superadmin' then
    if v_next_role = 'superadmin' then
      raise exception 'forbidden_superadmin_assignment';
    end if;

    if v_previous_role = 'superadmin' then
      raise exception 'forbidden_superadmin_target';
    end if;
  end if;

  update public.profiles
  set role = v_next_role,
      updated_at = now()
  where id = p_user_id
  returning * into v_row;

  if v_next_role = 'editor' then
    insert into public.user_badges (user_id, badge_key, assigned_by)
    values (p_user_id, 'moderator', auth.uid())
    on conflict (user_id, badge_key) do update
      set assigned_by = excluded.assigned_by,
          assigned_at = now();
  else
    delete from public.user_badges
    where user_id = p_user_id
      and badge_key = 'moderator';
  end if;

  select email into v_actor_email
  from auth.users
  where id = auth.uid();

  insert into public.admin_activity_log (event_type, user_id, actor_user_id, target_user_id, email, metadata)
  values (
    'role_changed',
    auth.uid(),
    auth.uid(),
    p_user_id,
    v_actor_email,
    jsonb_build_object(
      'previous_role', v_previous_role,
      'new_role', v_next_role,
      'moderator_badge', (v_next_role = 'editor')
    )
  );

  return v_row;
end;
$$;

grant execute on function public.admin_set_member_role(uuid, text) to authenticated;
