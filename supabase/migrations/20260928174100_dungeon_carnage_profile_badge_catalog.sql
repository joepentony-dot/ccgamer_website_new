-- CCG Member Hub: reconcile legacy Lost Sizzler badge data with C64 Dungeon Carnage.
--
-- Legacy LS_ badge keys and the internal lost-sizzler game identifier are
-- deliberately retained so existing earned achievements keep their history.
-- Only current, supported achievements remain active in the Member Hub.

update public.badge_definitions
set
  name = case slug
    when 'ls-first-run' then 'Dungeon Door Open'
    when 'ls-floor-1' then 'Threshold Cleared'
    when 'ls-floor-2' then 'Iron Keep Cleared'
    when 'ls-floor-3' then 'Moss Crypt Cleared'
    when 'ls-floor-4' then 'Ember Depths Cleared'
    when 'ls-floor-5' then 'Sigil Sanctum Cleared'
    when 'ls-citadel-platinum' then 'Dungeon Carnage Platinum'
    when 'ls-solo-champion' then 'Solo Dungeon Conqueror'
    when 'ls-no-death-victory' then 'One Life, Five Depths'
    when 'ls-champions-5' then 'Champion Hunter'
    when 'ls-main-key-1' then 'Key Claimed'
    when 'ls-main-keys-all' then 'Domain Secured'
    when 'ls-exit-sigil' then 'Sigil Awakened'
    else name
  end,
  description = case slug
    when 'ls-first-run' then 'Start a C64 Dungeon Carnage run.'
    when 'ls-floor-1' then 'Clear The Threshold.'
    when 'ls-floor-2' then 'Clear Iron Keep.'
    when 'ls-floor-3' then 'Clear Moss Crypt.'
    when 'ls-floor-4' then 'Clear Ember Depths.'
    when 'ls-floor-5' then 'Clear the Sigil Sanctum.'
    when 'ls-citadel-platinum' then 'Complete all five Dungeon Carnage depths, finish the Sigil and escape.'
    when 'ls-solo-champion' then 'Complete the C64 Dungeon Carnage campaign in Solo mode.'
    when 'ls-no-death-victory' then 'Complete all five Dungeon Carnage depths without dying.'
    when 'ls-champions-5' then 'Defeat 5 champion enemies in one run.'
    when 'ls-bounties-5' then 'Complete the Dungeon Bounty on all five depths in one run.'
    when 'ls-main-key-1' then 'Recover the required campaign Key on a key depth.'
    when 'ls-main-keys-all' then 'Complete a campaign Key objective and open the route deeper.'
    when 'ls-exit-sigil' then 'Complete the final Sigil ritual in the Sigil Sanctum.'
    when 'ls-floor-exit' then 'Reach an unlocked stairway to the next depth.'
    else description
  end
where slug in (
  'ls-first-run',
  'ls-floor-1',
  'ls-floor-2',
  'ls-floor-3',
  'ls-floor-4',
  'ls-floor-5',
  'ls-citadel-platinum',
  'ls-solo-champion',
  'ls-no-death-victory',
  'ls-champions-5',
  'ls-bounties-5',
  'ls-main-key-1',
  'ls-main-keys-all',
  'ls-exit-sigil',
  'ls-floor-exit'
);

update public.badge_definitions
set active = false
where slug in (
  'ls-split-champion',
  'ls-online-champion',
  'ls-weekly-champion',
  'ls-gilded-elf',
  'ls-rare-melee'
);

create or replace function public.get_member_badge_catalog()
returns table (
  badge_key text,
  badge_name text,
  badge_description text,
  badge_category text,
  requirement_value integer,
  sort_order integer
)
language sql
stable
set search_path = public, pg_temp
as $$
  select catalog.*
  from (
    select *
    from (
      values
        ('FIRST_RATING', 'First Score', 'Rate your first Commodore game.', 'ratings', 1, 10),
        ('RATED_10', 'Score Keeper', 'Rate 10 Commodore games.', 'ratings', 10, 20),
        ('RATED_50', 'Archive Critic', 'Rate 50 Commodore games.', 'ratings', 50, 30),
        ('RATED_100', 'Century Critic', 'Rate 100 Commodore games.', 'ratings', 100, 35),
        ('FIRST_COMMENT', 'First Word', 'Post your first game comment.', 'comments', 1, 40),
        ('COMMENTER_10', 'Community Voice', 'Post 10 game comments.', 'comments', 10, 50),
        ('COMMENTER_25', 'Community Regular', 'Post 25 game comments.', 'comments', 25, 55),
        ('FIRST_LIBRARY_GAME', 'Collection Started', 'Add your first game to the private Member Hub library.', 'library', 1, 60),
        ('LIBRARY_10', 'Shelf Builder', 'Keep 10 games in your private Member Hub library.', 'library', 10, 70),
        ('LIBRARY_50', 'Game Room', 'Keep 50 games in your private Member Hub library.', 'library', 50, 80),
        ('LIBRARY_100', 'Archive Keeper', 'Keep 100 games in your private Member Hub library.', 'library', 100, 90),
        ('LIBRARY_250', 'Mega Archive', 'Keep 250 games in your private Member Hub library.', 'library', 250, 95),
        ('C64_EXPLORER', 'C64 Explorer', 'Add a Commodore 64 game to your private library.', 'systems', 1, 100),
        ('AMIGA_EXPLORER', 'Amiga Explorer', 'Add a Commodore Amiga game to your private library.', 'systems', 1, 110),
        ('DUAL_SYSTEM', 'Commodore All-Rounder', 'Add both C64 and Amiga games to your private library.', 'systems', 2, 120)
    ) as milestones(
      badge_key,
      badge_name,
      badge_description,
      badge_category,
      requirement_value,
      sort_order
    )

    union all

    select
      game.badge_key,
      game.badge_name,
      game.badge_description,
      game.badge_category,
      game.requirement_value,
      1000 + game.sort_order
    from public.get_lost_sizzler_badge_catalog() game
  ) catalog
  order by catalog.sort_order, catalog.badge_key;
$$;

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
        ('RATED_100'::text, ratings_count >= 100),
        ('FIRST_COMMENT'::text, comments_count >= 1),
        ('COMMENTER_10'::text, comments_count >= 10),
        ('COMMENTER_25'::text, comments_count >= 25),
        ('FIRST_LIBRARY_GAME'::text, library_count >= 1),
        ('LIBRARY_10'::text, library_count >= 10),
        ('LIBRARY_50'::text, library_count >= 50),
        ('LIBRARY_100'::text, library_count >= 100),
        ('LIBRARY_250'::text, library_count >= 250),
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
  on function public.get_member_badge_catalog()
  from public;
grant execute
  on function public.get_member_badge_catalog()
  to authenticated;

revoke all
  on function public.award_badge_if_eligible(uuid)
  from public;
grant execute
  on function public.award_badge_if_eligible(uuid)
  to authenticated;
