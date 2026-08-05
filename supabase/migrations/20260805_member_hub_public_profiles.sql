-- CCG Member Hub Phase 3 / Phase 7C:
-- privacy-controlled public profiles, private submissions and live-schema compatibility.
--
-- This migration is intentionally idempotent. It supports the historical CCG
-- community schemas found in deployed Supabase projects, including:
--   user_badges.badge_key / assigned_at
--   user_badges.badge_code / awarded_at
--   user_badges.badge_id / earned_at with badge_definitions.slug
-- and rating/comment tables that use user_id, profile_id or another established
-- owner column. Existing private defaults and row-level security remain intact.

create extension if not exists pgcrypto;

alter table public.profiles
  add column if not exists preferred_system text not null default 'both',
  add column if not exists is_public boolean not null default false,
  add column if not exists public_bio text not null default '',
  add column if not exists show_top_picks boolean not null default true,
  add column if not exists show_badges boolean not null default true,
  add column if not exists public_list_key text not null default 'none',
  add column if not exists public_list_title text not null default 'My CCG Collection';

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_public_list_key_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_public_list_key_check
      check (public_list_key in ('none', 'played', 'want', 'owned', 'still'));
  end if;
end $$;

-- Keep public-list queries compatible whether Phase 7C is applied before or
-- after the dedicated Phase 7B tombstone migration.
alter table public.profile_game_library
  add column if not exists deleted_at timestamptz;

create table if not exists public.member_submissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  submission_type text not null,
  game_slug text,
  subject text not null,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_submissions_type_check check (
    submission_type in ('game_suggestion', 'correction', 'site_feedback')
  ),
  constraint member_submissions_status_check check (
    status in ('new', 'reviewing', 'resolved', 'declined')
  ),
  constraint member_submissions_subject_length check (
    char_length(subject) between 3 and 120
  ),
  constraint member_submissions_message_length check (
    char_length(message) between 10 and 3000
  )
);

create or replace function public.set_member_submission_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists member_submissions_set_updated_at
  on public.member_submissions;

create trigger member_submissions_set_updated_at
before update on public.member_submissions
for each row
execute function public.set_member_submission_updated_at();

alter table public.member_submissions enable row level security;

drop policy if exists member_submissions_owner_select
  on public.member_submissions;
create policy member_submissions_owner_select
  on public.member_submissions
  for select
  to authenticated
  using (profile_id = auth.uid());

drop policy if exists member_submissions_owner_insert
  on public.member_submissions;
create policy member_submissions_owner_insert
  on public.member_submissions
  for insert
  to authenticated
  with check (profile_id = auth.uid());

drop policy if exists member_submissions_owner_delete
  on public.member_submissions;
create policy member_submissions_owner_delete
  on public.member_submissions
  for delete
  to authenticated
  using (profile_id = auth.uid());

drop policy if exists member_submissions_admin_select
  on public.member_submissions;
create policy member_submissions_admin_select
  on public.member_submissions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'superadmin')
    )
  );

drop policy if exists member_submissions_admin_update
  on public.member_submissions;
create policy member_submissions_admin_update
  on public.member_submissions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'superadmin')
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and lower(coalesce(p.role, '')) in ('admin', 'superadmin')
    )
  );

grant select, insert, update, delete
  on public.member_submissions
  to authenticated;

-- Return the first deployed column that matches the ordered compatibility list.
-- This helper is private to the security-definer RPC functions below.
create or replace function public.ccg_first_existing_column(
  target_table text,
  candidate_columns text[]
)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select c.column_name
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name = target_table
    and c.column_name = any(candidate_columns)
  order by array_position(candidate_columns, c.column_name)
  limit 1;
$$;

revoke all
  on function public.ccg_first_existing_column(text, text[])
  from public;

-- Normalize rating activity from either game_ratings or the older ratings table.
create or replace function public.ccg_member_rating_rows(target_user_id uuid)
returns table (
  game_slug text,
  rating int,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  source_table text;
  owner_column text;
  game_column text;
  rating_column text;
  time_column text;
  time_expression text;
begin
  if to_regclass('public.game_ratings') is not null then
    source_table := 'game_ratings';
  elsif to_regclass('public.ratings') is not null then
    source_table := 'ratings';
  else
    return;
  end if;

  owner_column := public.ccg_first_existing_column(
    source_table,
    array['user_id', 'profile_id', 'member_id', 'account_id', 'owner_id']::text[]
  );
  game_column := public.ccg_first_existing_column(
    source_table,
    array['game_slug', 'game_key', 'slug']::text[]
  );
  rating_column := public.ccg_first_existing_column(
    source_table,
    array['rating', 'score']::text[]
  );
  time_column := public.ccg_first_existing_column(
    source_table,
    array['created_at', 'rated_at', 'updated_at']::text[]
  );

  if owner_column is null or game_column is null or rating_column is null then
    return;
  end if;

  time_expression := case
    when time_column is null then 'now()::timestamptz'
    else format('%I::timestamptz', time_column)
  end;

  return query execute format(
    'select %1$I::text, %2$I::int, %3$s
       from public.%4$I
      where %5$I = $1',
    game_column,
    rating_column,
    time_expression,
    source_table,
    owner_column
  )
  using target_user_id;
end;
$$;

revoke all
  on function public.ccg_member_rating_rows(uuid)
  from public;

-- Normalize comment activity from either game_comments or the older comments table.
create or replace function public.ccg_member_comment_rows(target_user_id uuid)
returns table (
  game_slug text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  source_table text;
  owner_column text;
  game_column text;
  time_column text;
  deletion_column text;
  time_expression text;
  deletion_filter text := '';
begin
  if to_regclass('public.game_comments') is not null then
    source_table := 'game_comments';
  elsif to_regclass('public.comments') is not null then
    source_table := 'comments';
  else
    return;
  end if;

  owner_column := public.ccg_first_existing_column(
    source_table,
    array['user_id', 'profile_id', 'member_id', 'account_id', 'owner_id']::text[]
  );
  game_column := public.ccg_first_existing_column(
    source_table,
    array['game_slug', 'game_key', 'slug']::text[]
  );
  time_column := public.ccg_first_existing_column(
    source_table,
    array['created_at', 'commented_at', 'updated_at']::text[]
  );
  deletion_column := public.ccg_first_existing_column(
    source_table,
    array['is_deleted', 'deleted_at', 'deleted']::text[]
  );

  if owner_column is null or game_column is null then
    return;
  end if;

  time_expression := case
    when time_column is null then 'now()::timestamptz'
    else format('%I::timestamptz', time_column)
  end;

  if deletion_column = 'is_deleted' or deletion_column = 'deleted' then
    deletion_filter := format(
      ' and coalesce(%I, false) = false',
      deletion_column
    );
  elsif deletion_column = 'deleted_at' then
    deletion_filter := format(
      ' and %I is null',
      deletion_column
    );
  end if;

  return query execute format(
    'select %1$I::text, %2$s
       from public.%3$I
      where %4$I = $1%5$s',
    game_column,
    time_expression,
    source_table,
    owner_column,
    deletion_filter
  )
  using target_user_id;
end;
$$;

revoke all
  on function public.ccg_member_comment_rows(uuid)
  from public;

-- Normalize badge activity across all known CCG badge table revisions.
create or replace function public.ccg_member_badge_rows(target_user_id uuid)
returns table (
  badge_key text,
  assigned_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  owner_column text;
  direct_key_column text;
  badge_id_column text;
  time_column text;
  definition_table text;
  definition_key_column text;
  time_expression text;
  key_expression text;
begin
  if to_regclass('public.user_badges') is null then
    return;
  end if;

  owner_column := public.ccg_first_existing_column(
    'user_badges',
    array['user_id', 'profile_id', 'member_id', 'account_id', 'owner_id']::text[]
  );
  direct_key_column := public.ccg_first_existing_column(
    'user_badges',
    array['badge_key', 'badge_code', 'badge_slug', 'code']::text[]
  );
  badge_id_column := public.ccg_first_existing_column(
    'user_badges',
    array['badge_id']::text[]
  );
  time_column := public.ccg_first_existing_column(
    'user_badges',
    array['assigned_at', 'awarded_at', 'earned_at', 'created_at']::text[]
  );

  if owner_column is null then
    return;
  end if;

  time_expression := case
    when time_column is null then 'now()::timestamptz'
    else format('b.%I::timestamptz', time_column)
  end;

  if direct_key_column is not null then
    key_expression := format('b.%I::text', direct_key_column);

    return query execute format(
      'select %1$s, %2$s
         from public.user_badges b
        where b.%3$I = $1
        order by %2$s desc',
      key_expression,
      time_expression,
      owner_column
    )
    using target_user_id;
    return;
  end if;

  if badge_id_column is null then
    return;
  end if;

  if to_regclass('public.badge_definitions') is not null then
    definition_table := 'badge_definitions';
  elsif to_regclass('public.badges') is not null then
    definition_table := 'badges';
  end if;

  if definition_table is not null then
    definition_key_column := public.ccg_first_existing_column(
      definition_table,
      array['slug', 'badge_key', 'badge_code', 'code', 'name']::text[]
    );
  end if;

  if definition_table is not null and definition_key_column is not null then
    return query execute format(
      'select d.%1$I::text, %2$s
         from public.user_badges b
         join public.%3$I d
           on d.id = b.%4$I
        where b.%5$I = $1
        order by %2$s desc',
      definition_key_column,
      time_expression,
      definition_table,
      badge_id_column,
      owner_column
    )
    using target_user_id;
    return;
  end if;

  return query execute format(
    'select b.%1$I::text, %2$s
       from public.user_badges b
      where b.%3$I = $1
      order by %2$s desc',
    badge_id_column,
    time_expression,
    owner_column
  )
  using target_user_id;
end;
$$;

revoke all
  on function public.ccg_member_badge_rows(uuid)
  from public;

create or replace function public.get_public_member_profile(member_handle text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'username', p.username,
    'display_name',
      coalesce(nullif(p.display_name, ''), p.username, 'CCG Member'),
    'avatar_url', p.avatar_url,
    'bio', p.public_bio,
    'preferred_system', coalesce(p.preferred_system, 'both'),
    'joined_at', p.created_at,
    'top_picks',
      case
        when p.show_top_picks then
          coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                  'game_slug', t.game_slug,
                  'created_at', t.created_at
                )
                order by t.created_at
              )
              from public.profile_top_picks t
              where t.profile_id = p.id
            ),
            '[]'::jsonb
          )
        else '[]'::jsonb
      end,
    'badges',
      case
        when p.show_badges then
          coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                  'badge_key', b.badge_key,
                  'assigned_at', b.assigned_at
                )
                order by b.assigned_at desc
              )
              from public.ccg_member_badge_rows(p.id) b
            ),
            '[]'::jsonb
          )
        else '[]'::jsonb
      end,
    'public_list',
      case
        when p.public_list_key <> 'none' then
          jsonb_build_object(
            'key', p.public_list_key,
            'title', p.public_list_title,
            'games',
              coalesce(
                (
                  select jsonb_agg(
                    jsonb_build_object(
                      'game_slug', g.game_slug,
                      'rating', g.rating
                    )
                    order by coalesce(g.title, g.game_slug)
                  )
                  from public.profile_game_library g
                  where g.profile_id = p.id
                    and g.deleted_at is null
                    and p.public_list_key = any(g.lists)
                ),
                '[]'::jsonb
              )
          )
        else null
      end
  )
  from public.profiles p
  where p.is_public = true
    and p.username is not null
    and lower(p.username) = lower(trim(member_handle))
  limit 1;
$$;

revoke all
  on function public.get_public_member_profile(text)
  from public;
grant execute
  on function public.get_public_member_profile(text)
  to anon, authenticated;

create or replace function public.get_my_member_activity(
  row_limit int default 12
)
returns table (
  type text,
  game_slug text,
  rating int,
  badge_key text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    feed.type,
    feed.game_slug,
    feed.rating,
    feed.badge_key,
    feed.created_at
  from (
    select
      'rating'::text as type,
      r.game_slug,
      r.rating,
      null::text as badge_key,
      r.created_at
    from public.ccg_member_rating_rows(auth.uid()) r

    union all

    select
      'comment'::text,
      c.game_slug,
      null::int,
      null::text,
      c.created_at
    from public.ccg_member_comment_rows(auth.uid()) c

    union all

    select
      'badge'::text,
      null::text,
      null::int,
      b.badge_key,
      b.assigned_at
    from public.ccg_member_badge_rows(auth.uid()) b
  ) feed
  order by feed.created_at desc
  limit greatest(
    1,
    least(coalesce(row_limit, 12), 50)
  );
$$;

revoke all
  on function public.get_my_member_activity(int)
  from public;
grant execute
  on function public.get_my_member_activity(int)
  to authenticated;
