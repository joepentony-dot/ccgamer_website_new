-- C64 Dungeon Carnage Round 2 beta: frozen current-member cohort with a seven-day pass.
-- This round is deliberately closed: no later website signup and no legacy tester code
-- may gain Round 2 access. The owner/admin profile keeps its separate owner bypass.

begin;

create table if not exists public.ccg_dungeon_carnage_beta_rounds (
  round_key text primary key,
  label text not null,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  cohort_locked_at timestamptz not null default now(),
  allow_invited_codes boolean not null default false,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.ccg_dungeon_carnage_beta_round_members (
  round_key text not null references public.ccg_dungeon_carnage_beta_rounds(round_key) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_at timestamptz not null default now(),
  revoked_at timestamptz,
  notified_at timestamptz,
  feedback_received_at timestamptz,
  primary key (round_key, user_id)
);

create index if not exists ccg_dungeon_carnage_beta_round_members_user_idx
  on public.ccg_dungeon_carnage_beta_round_members (user_id);

alter table public.ccg_dungeon_carnage_beta_rounds enable row level security;
alter table public.ccg_dungeon_carnage_beta_round_members enable row level security;
revoke all on public.ccg_dungeon_carnage_beta_rounds from anon, authenticated;
revoke all on public.ccg_dungeon_carnage_beta_round_members from anon, authenticated;

insert into public.ccg_dungeon_carnage_beta_rounds (
  round_key,
  label,
  starts_at,
  ends_at,
  cohort_locked_at,
  allow_invited_codes
)
values (
  'round-2-current-members-2026-10-02',
  'C64 Dungeon Carnage Beta Round 2',
  now(),
  now() + interval '7 days',
  now(),
  false
)
on conflict (round_key) do nothing;

-- Freeze the cohort at migration time. Only current non-admin, non-banned members
-- with a confirmed email are assigned. Later signups are intentionally excluded.
insert into public.ccg_dungeon_carnage_beta_round_members (
  round_key,
  user_id,
  assigned_at
)
select
  'round-2-current-members-2026-10-02',
  u.id,
  now()
from auth.users u
left join public.user_roles ur on ur.user_id = u.id
left join public.profiles p on p.id = u.id
where u.email is not null
  and u.email_confirmed_at is not null
  and coalesce(lower(ur.role::text), 'user') not in ('admin', 'superadmin')
  and coalesce(p.banned, false) = false
  and not public.ccg_is_user_soft_banned(u.id)
on conflict (round_key, user_id) do nothing;

create or replace function public.ccg_has_dungeon_carnage_playtest_access()
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select case
    when auth.uid() is null then false
    when public.ccg_is_user_soft_banned(auth.uid()) then false
    else exists (
      select 1
      from public.ccg_dungeon_carnage_beta_round_members m
      join public.ccg_dungeon_carnage_beta_rounds r
        on r.round_key = m.round_key
      where m.user_id = auth.uid()
        and m.round_key = 'round-2-current-members-2026-10-02'
        and m.revoked_at is null
        and pg_catalog.now() >= r.starts_at
        and pg_catalog.now() < r.ends_at
    )
  end;
$function$;

revoke all on function public.ccg_has_dungeon_carnage_playtest_access() from public;
revoke all on function public.ccg_has_dungeon_carnage_playtest_access() from anon;
grant execute on function public.ccg_has_dungeon_carnage_playtest_access() to authenticated;

-- Round 2 is member-only. Keep the historical RPC name for compatibility but
-- reject invited-code access while this closed round exists.
create or replace function public.ccg_validate_dungeon_carnage_tester_code(p_code text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select false;
$function$;

revoke all on function public.ccg_validate_dungeon_carnage_tester_code(text) from public;
revoke all on function public.ccg_validate_dungeon_carnage_tester_code(text) from anon;
revoke all on function public.ccg_validate_dungeon_carnage_tester_code(text) from authenticated;

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
  dungeon_carnage_playtester boolean,
  dungeon_carnage_round2_cohort boolean,
  dungeon_carnage_round2_expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
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
    (
      exists (
        select 1
        from public.ccg_dungeon_carnage_beta_round_members bm
        join public.ccg_dungeon_carnage_beta_rounds br on br.round_key = bm.round_key
        where bm.user_id = u.id
          and bm.round_key = 'round-2-current-members-2026-10-02'
          and bm.revoked_at is null
          and pg_catalog.now() >= br.starts_at
          and pg_catalog.now() < br.ends_at
      )
    )::boolean as dungeon_carnage_playtester,
    (
      exists (
        select 1
        from public.ccg_dungeon_carnage_beta_round_members bm
        where bm.user_id = u.id
          and bm.round_key = 'round-2-current-members-2026-10-02'
      )
    )::boolean as dungeon_carnage_round2_cohort,
    (
      select br.ends_at
      from public.ccg_dungeon_carnage_beta_rounds br
      where br.round_key = 'round-2-current-members-2026-10-02'
      limit 1
    )::timestamptz as dungeon_carnage_round2_expires_at
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

create or replace function public.admin_set_dungeon_carnage_playtester(
  p_user_id uuid,
  p_enabled boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  v_enabled boolean := coalesce(p_enabled, false);
  v_round_key constant text := 'round-2-current-members-2026-10-02';
  v_round_end timestamptz;
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

  select r.ends_at into v_round_end
  from public.ccg_dungeon_carnage_beta_rounds r
  where r.round_key = v_round_key;

  if v_round_end is null or pg_catalog.now() >= v_round_end then
    raise exception 'round_two_closed' using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.ccg_dungeon_carnage_beta_round_members m
    where m.round_key = v_round_key
      and m.user_id = p_user_id
  ) then
    raise exception 'round_two_cohort_locked' using errcode = 'P0001';
  end if;

  update public.ccg_dungeon_carnage_beta_round_members m
     set revoked_at = case when v_enabled then null else pg_catalog.now() end
   where m.round_key = v_round_key
     and m.user_id = p_user_id;

  if to_regclass('public.admin_activity_log') is not null then
    insert into public.admin_activity_log (
      event_type,
      actor_user_id,
      target_user_id,
      email,
      metadata
    )
    values (
      case when v_enabled then 'dungeon_round2_restore' else 'dungeon_round2_revoke' end,
      auth.uid(),
      p_user_id,
      (select u.email from auth.users u where u.id = auth.uid()),
      jsonb_build_object(
        'round_key', v_round_key,
        'enabled', v_enabled,
        'expires_at', v_round_end
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
