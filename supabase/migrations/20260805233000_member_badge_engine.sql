-- CCG Member Hub Phase 8: automatic private achievements
--
-- Run after:
--   1. 20260805_member_hub_cloud_library.sql
--   2. 20260805230000_member_hub_public_profiles_compatibility.sql
--   3. 20260805_member_hub_deletion_tombstones.sql
--
-- The engine uses the Phase 7C compatibility readers, so it works with the
-- historical CCG rating, comment and badge schemas without renaming live data.

create or replace function public.get_member_badge_catalog()
returns table (
  badge_key text,
  badge_name text,
  badge_description text,
  badge_category text,
  requirement_value int,
  sort_order int
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select *
  from (
    values
      ('FIRST_RATING', 'First Score', 'Rate your first Commodore game.', 'ratings', 1, 10),
      ('RATED_10', 'Score Keeper', 'Rate 10 Commodore games.', 'ratings', 10, 20),
      ('RATED_50', 'Archive Critic', 'Rate 50 Commodore games.', 'ratings', 50, 30),
      ('FIRST_COMMENT', 'First Word', 'Post your first game comment.', 'comments', 1, 40),
      ('COMMENTER_10', 'Community Voice', 'Post 10 game comments.', 'comments', 10, 50),
      ('FIRST_LIBRARY_GAME', 'Collection Started', 'Add your first game to the private Member Hub library.', 'library', 1, 60),
      ('LIBRARY_10', 'Shelf Builder', 'Keep 10 games in your private Member Hub library.', 'library', 10, 70),
      ('LIBRARY_50', 'Game Room', 'Keep 50 games in your private Member Hub library.', 'library', 50, 80),
      ('LIBRARY_100', 'Archive Keeper', 'Keep 100 games in your private Member Hub library.', 'library', 100, 90),
      ('C64_EXPLORER', 'C64 Explorer', 'Add a Commodore 64 game to your private library.', 'systems', 1, 100),
      ('AMIGA_EXPLORER', 'Amiga Explorer', 'Add a Commodore Amiga game to your private library.', 'systems', 1, 110),
      ('DUAL_SYSTEM', 'Commodore All-Rounder', 'Add both C64 and Amiga games to your private library.', 'systems', 2, 120)
  ) as catalog(
    badge_key,
    badge_name,
    badge_description,
    badge_category,
    requirement_value,
    sort_order
  )
  order by sort_order;
$$;

revoke all
  on function public.get_member_badge_catalog()
  from public;
grant execute
  on function public.get_member_badge_catalog()
  to authenticated;

-- Insert one badge into whichever historical user_badges shape is deployed.
-- Direct badge-code/key tables need no definition-table join. UUID badge_id
-- tables are supported when a matching definition already exists.
create or replace function public.ccg_award_badge_code(
  target_user_id uuid,
  target_badge_key text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  owner_column text;
  direct_key_column text;
  badge_id_column text;
  definition_table text;
  definition_key_column text;
  definition_id uuid;
  affected_rows int := 0;
  normalized_key text := upper(trim(coalesce(target_badge_key, '')));
begin
  if normalized_key = '' or to_regclass('public.user_badges') is null then
    return false;
  end if;

  owner_column := public.ccg_first_existing_column(
    'user_badges',
    array['user_id', 'profile_id', 'member_id', 'account_id', 'owner_id']::text[]
  );
  direct_key_column := public.ccg_first_existing_column(
    'user_badges',
    array['badge_key', 'badge_code', 'badge_slug', 'code']::text[]
  );

  if owner_column is null then
    return false;
  end if;

  if direct_key_column is not null then
    execute format(
      'insert into public.user_badges (%1$I, %2$I)
       values ($1, $2)
       on conflict do nothing',
      owner_column,
      direct_key_column
    )
    using target_user_id, normalized_key;

    get diagnostics affected_rows = row_count;
    return affected_rows > 0;
  end if;

  badge_id_column := public.ccg_first_existing_column(
    'user_badges',
    array['badge_id']::text[]
  );

  if badge_id_column is null then
    return false;
  end if;

  if to_regclass('public.badge_definitions') is not null then
    definition_table := 'badge_definitions';
  elsif to_regclass('public.badges') is not null then
    definition_table := 'badges';
  else
    return false;
  end if;

  definition_key_column := public.ccg_first_existing_column(
    definition_table,
    array['slug', 'badge_key', 'badge_code', 'code', 'name']::text[]
  );

  if definition_key_column is null then
    return false;
  end if;

  execute format(
    'select id
       from public.%1$I
      where upper(replace(%2$I::text, ''-'', ''_'')) = $1
      limit 1',
    definition_table,
    definition_key_column
  )
  into definition_id
  using normalized_key;

  if definition_id is null then
    return false;
  end if;

  execute format(
    'insert into public.user_badges (%1$I, %2$I)
     values ($1, $2)
     on conflict do nothing',
    owner_column,
    badge_id_column
  )
  using target_user_id, definition_id;

  get diagnostics affected_rows = row_count;
  return affected_rows > 0;
end;
$$;

revoke all
  on function public.ccg_award_badge_code(uuid, text)
  from public;

create or replace function public.award_badge_if_eligible(target_user_id uuid)
returns table (
  badge_key text,
  newly_awarded boolean
)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  ratings_count int := 0;
  comments_count int := 0;
  library_count int := 0;
  has_c64 boolean := false;
  has_amiga boolean := false;
  candidate text;
  awarded boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if auth.uid() <> target_user_id then
    raise exception 'Achievements can only be checked for the signed-in account';
  end if;

  select count(*)::int
    into ratings_count
    from public.ccg_member_rating_rows(target_user_id);

  select count(*)::int
    into comments_count
    from public.ccg_member_comment_rows(target_user_id);

  select
    count(*)::int,
    coalesce(bool_or(lower(coalesce(g.system, '')) in ('c64', 'commodore 64')), false),
    coalesce(bool_or(lower(coalesce(g.system, '')) in ('amiga', 'commodore amiga')), false)
  into library_count, has_c64, has_amiga
  from public.profile_game_library g
  where g.profile_id = target_user_id
    and g.deleted_at is null
    and (
      cardinality(coalesce(g.lists, '{}'::text[])) > 0
      or cardinality(coalesce(g.custom_lists, '{}'::text[])) > 0
      or g.rating is not null
      or nullif(trim(coalesce(g.note, '')), '') is not null
    );

  for candidate in
    select eligibility.badge_key
    from (
      values
        ('FIRST_RATING'::text, ratings_count >= 1),
        ('RATED_10'::text, ratings_count >= 10),
        ('RATED_50'::text, ratings_count >= 50),
        ('FIRST_COMMENT'::text, comments_count >= 1),
        ('COMMENTER_10'::text, comments_count >= 10),
        ('FIRST_LIBRARY_GAME'::text, library_count >= 1),
        ('LIBRARY_10'::text, library_count >= 10),
        ('LIBRARY_50'::text, library_count >= 50),
        ('LIBRARY_100'::text, library_count >= 100),
        ('C64_EXPLORER'::text, has_c64),
        ('AMIGA_EXPLORER'::text, has_amiga),
        ('DUAL_SYSTEM'::text, has_c64 and has_amiga)
    ) as eligibility(badge_key, qualifies)
    where eligibility.qualifies
  loop
    awarded := public.ccg_award_badge_code(target_user_id, candidate);
    badge_key := candidate;
    newly_awarded := awarded;
    return next;
  end loop;
end;
$$;

revoke all
  on function public.award_badge_if_eligible(uuid)
  from public;
grant execute
  on function public.award_badge_if_eligible(uuid)
  to authenticated;

create or replace function public.get_my_member_badges()
returns table (
  badge_key text,
  assigned_at timestamptz
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    upper(replace(b.badge_key, '-', '_')) as badge_key,
    b.assigned_at
  from public.ccg_member_badge_rows(auth.uid()) b
  order by b.assigned_at desc;
$$;

revoke all
  on function public.get_my_member_badges()
  from public;
grant execute
  on function public.get_my_member_badges()
  to authenticated;
