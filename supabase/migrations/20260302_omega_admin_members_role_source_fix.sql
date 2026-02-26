-- OMEGA continuation: align admin member RPC gates with public.user_roles
-- and with live schema assumptions (profiles has no email, user_roles may have no updated_at).

create extension if not exists pgcrypto;

do $$
declare
  has_auth_users boolean;
  has_profiles boolean;
  has_user_roles boolean;
  has_user_badges boolean;
  has_admin_activity_log boolean;
  owner_email text;
  owner_user_id uuid;
begin
  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'auth' and table_name = 'users'
  ) into has_auth_users;

  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) into has_profiles;

  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'user_roles'
  ) into has_user_roles;

  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'user_badges'
  ) into has_user_badges;

  select exists (
    select 1
    from information_schema.tables
    where table_schema = 'public' and table_name = 'admin_activity_log'
  ) into has_admin_activity_log;

  if has_auth_users and has_user_roles then
    owner_email := nullif(trim(coalesce(current_setting('app.settings.owner_email', true), current_setting('ccg.owner_email', true), '')), '');

    if owner_email is not null then
      select u.id into owner_user_id
      from auth.users u
      where lower(u.email) = lower(owner_email)
      limit 1;

      if owner_user_id is not null then
        execute $upsert_owner$
          insert into public.user_roles (user_id, role)
          values ($1, 'admin')
          on conflict (user_id) do update
            set role = excluded.role
        $upsert_owner$ using owner_user_id;
      else
        raise notice 'Owner email % not found in auth.users; skipped owner role upsert.', owner_email;
      end if;
    else
      raise notice 'No owner email configured in app.settings.owner_email/ccg.owner_email; skipped owner role upsert.';
    end if;
  end if;

  if has_auth_users and has_profiles and has_user_roles then
    execute $sql$
      drop function if exists public.admin_list_members(text, text, boolean, integer, integer);
      drop function if exists public.admin_list_members(boolean, integer, integer, text, text);

      create or replace function public.admin_list_members(
        p_banned boolean default null,
        p_limit integer default 200,
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
      as $fn$
      begin
        if not exists (
          select 1
          from public.user_roles ur
          where ur.user_id = auth.uid()
            and lower(ur.role::text) in ('admin', 'superadmin')
        ) then
          raise exception 'Forbidden';
        end if;

        return query
        select
          u.id as user_id,
          u.email,
          p.username,
          coalesce(p.created_at, u.created_at) as signup_date,
          u.last_sign_in_at as last_sign_in,
          coalesce(lower(ur.role::text), 'user') as role,
          coalesce(p.banned, false) as banned,
          case
            when to_regclass('public.user_badges') is null then false
            else exists (
              select 1
              from public.user_badges ub
              where ub.user_id = u.id
                and ub.badge_key = 'moderator'
            )
          end as is_moderator_badge
        from auth.users u
        left join public.profiles p on p.id = u.id
        left join public.user_roles ur on ur.user_id = u.id
        where (
          p_search is null
          or u.email ilike '%' || p_search || '%'
          or p.username ilike '%' || p_search || '%'
        )
        and (
          p_role is null
          or lower(coalesce(ur.role::text, 'user')) = lower(p_role)
        )
        and (
          p_banned is null
          or coalesce(p.banned, false) = p_banned
        )
        order by coalesce(p.created_at, u.created_at) desc
        limit greatest(1, least(coalesce(p_limit, 200), 500))
        offset greatest(coalesce(p_offset, 0), 0);
      end;
      $fn$;

      grant execute on function public.admin_list_members(boolean, integer, integer, text, text) to authenticated;
    $sql$;

    execute $sql$
      drop function if exists public.admin_set_member_role(uuid, text);

      create or replace function public.admin_set_member_role(
        p_user_id uuid,
        p_new_role text
      )
      returns void
      language plpgsql
      security definer
      set search_path = public, auth
      as $fn$
      declare
        v_next_role text := lower(coalesce(trim(p_new_role), ''));
      begin
        if not exists (
          select 1
          from public.user_roles ur
          where ur.user_id = auth.uid()
            and lower(ur.role::text) in ('admin', 'superadmin')
        ) then
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

        if to_regclass('public.user_badges') is not null then
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
        end if;

        if to_regclass('public.admin_activity_log') is not null then
          insert into public.admin_activity_log (event_type, actor_user_id, target_user_id, email, metadata)
          values (
            'role_change',
            auth.uid(),
            p_user_id,
            (select u.email from auth.users u where u.id = auth.uid()),
            jsonb_build_object('new_role', v_next_role, 'moderator_badge', (v_next_role = 'editor'))
          );
        end if;
      end;
      $fn$;

      grant execute on function public.admin_set_member_role(uuid, text) to authenticated;
    $sql$;

    raise notice 'Applied full admin member RPC replacement using auth.users + profiles + user_roles.';
  else
    raise notice 'Compatibility mode: one or more tables are missing (auth.users=%, public.profiles=%, public.user_roles=%).', has_auth_users, has_profiles, has_user_roles;

    if has_auth_users and has_profiles then
      execute $compat$
        drop function if exists public.admin_list_members(text, text, boolean, integer, integer);
        drop function if exists public.admin_list_members(boolean, integer, integer, text, text);

        create or replace function public.admin_list_members(
          p_banned boolean default null,
          p_limit integer default 200,
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
        language sql
        security definer
        set search_path = public, auth
        as $fn$
          select
            u.id as user_id,
            u.email,
            p.username,
            coalesce(p.created_at, u.created_at) as signup_date,
            u.last_sign_in_at as last_sign_in,
            'user'::text as role,
            coalesce(p.banned, false) as banned,
            false as is_moderator_badge
          from auth.users u
          left join public.profiles p on p.id = u.id
          where (
            p_search is null
            or u.email ilike '%' || p_search || '%'
            or p.username ilike '%' || p_search || '%'
          )
          and (p_banned is null or coalesce(p.banned, false) = p_banned)
          order by coalesce(p.created_at, u.created_at) desc
          limit greatest(1, least(coalesce(p_limit, 200), 500))
          offset greatest(coalesce(p_offset, 0), 0)
        $fn$;
      $compat$;

      raise notice 'Compatibility function created: admin_list_members uses auth.users + profiles only.';
    else
      raise notice 'Compatibility variant unavailable for admin_list_members because auth.users/public.profiles is missing.';
    end if;

    if has_user_roles then
      execute $compat$
        drop function if exists public.admin_set_member_role(uuid, text);

        create or replace function public.admin_set_member_role(
          p_user_id uuid,
          p_new_role text
        )
        returns void
        language plpgsql
        security definer
        set search_path = public
        as $fn$
        begin
          if p_user_id is null then
            raise exception 'invalid_user_id';
          end if;

          insert into public.user_roles (user_id, role)
          values (p_user_id, lower(coalesce(trim(p_new_role), 'user')))
          on conflict (user_id) do update
            set role = excluded.role;
        end;
        $fn$;
      $compat$;

      raise notice 'Compatibility function created: admin_set_member_role upserts user_roles only.';
    else
      raise notice 'Compatibility variant unavailable for admin_set_member_role because public.user_roles is missing.';
    end if;
  end if;
end;
$$;
