-- Community hub aggregate RPCs for CCG
-- Safe read-only functions for leaderboard and activity modules.

create or replace function public.top_rated_games(min_count int default 5)
returns table (
  game_slug text,
  avg_rating numeric,
  rating_count bigint,
  comment_count bigint,
  score numeric
)
language sql
security definer
set search_path = public
as $$
  with ratings as (
    select
      gr.game_slug,
      avg(gr.rating)::numeric as avg_rating,
      count(*)::bigint as rating_count
    from public.game_ratings gr
    group by gr.game_slug
  ),
  comments as (
    select
      gc.game_slug,
      count(*)::bigint as comment_count
    from public.game_comments gc
    group by gc.game_slug
  )
  select
    r.game_slug,
    r.avg_rating,
    r.rating_count,
    coalesce(c.comment_count, 0)::bigint as comment_count,
    r.avg_rating as score
  from ratings r
  left join comments c on c.game_slug = r.game_slug
  where r.rating_count >= greatest(coalesce(min_count, 5), 1)
  order by r.avg_rating desc, r.rating_count desc
  limit 100;
$$;

create or replace function public.most_discussed_games(days int default 30)
returns table (
  game_slug text,
  avg_rating numeric,
  rating_count bigint,
  comment_count bigint,
  score numeric
)
language sql
security definer
set search_path = public
as $$
  with win as (
    select now() - make_interval(days => greatest(coalesce(days, 30), 1)) as since
  ),
  comments as (
    select
      gc.game_slug,
      count(*)::bigint as comment_count
    from public.game_comments gc
    cross join win
    where gc.created_at >= win.since
    group by gc.game_slug
  ),
  ratings as (
    select
      gr.game_slug,
      avg(gr.rating)::numeric as avg_rating,
      count(*)::bigint as rating_count
    from public.game_ratings gr
    cross join win
    where gr.created_at >= win.since
    group by gr.game_slug
  )
  select
    c.game_slug,
    coalesce(r.avg_rating, 0)::numeric as avg_rating,
    coalesce(r.rating_count, 0)::bigint as rating_count,
    c.comment_count,
    c.comment_count::numeric as score
  from comments c
  left join ratings r on r.game_slug = c.game_slug
  order by c.comment_count desc, c.game_slug asc
  limit 100;
$$;

create or replace function public.trending_games(days int default 7)
returns table (
  game_slug text,
  avg_rating numeric,
  rating_count bigint,
  comment_count bigint,
  score numeric
)
language sql
security definer
set search_path = public
as $$
  with win as (
    select now() - make_interval(days => greatest(coalesce(days, 7), 1)) as since
  ),
  ratings as (
    select
      gr.game_slug,
      avg(gr.rating)::numeric as avg_rating,
      count(*)::bigint as rating_count
    from public.game_ratings gr
    cross join win
    where gr.created_at >= win.since
    group by gr.game_slug
  ),
  comments as (
    select
      gc.game_slug,
      count(*)::bigint as comment_count
    from public.game_comments gc
    cross join win
    where gc.created_at >= win.since
    group by gc.game_slug
  )
  select
    coalesce(r.game_slug, c.game_slug) as game_slug,
    coalesce(r.avg_rating, 0)::numeric as avg_rating,
    coalesce(r.rating_count, 0)::bigint as rating_count,
    coalesce(c.comment_count, 0)::bigint as comment_count,
    (
      coalesce(r.rating_count, 0)::numeric
      + (coalesce(c.comment_count, 0)::numeric * 2)
      + coalesce(r.avg_rating, 0)::numeric
    ) as score
  from ratings r
  full outer join comments c on c.game_slug = r.game_slug
  order by score desc, game_slug asc
  limit 100;
$$;

create or replace function public.top_members(days int default 30)
returns table (
  username text,
  rating_count bigint,
  comment_count bigint,
  badge_count bigint,
  points bigint
)
language sql
security definer
set search_path = public
as $$
  with win as (
    select now() - make_interval(days => greatest(coalesce(days, 30), 1)) as since
  ),
  ratings as (
    select user_id, count(*)::bigint as rating_count
    from public.game_ratings gr
    cross join win
    where gr.created_at >= win.since
    group by user_id
  ),
  comments as (
    select user_id, count(*)::bigint as comment_count
    from public.game_comments gc
    cross join win
    where gc.created_at >= win.since
    group by user_id
  ),
  badges as (
    select user_id, count(*)::bigint as badge_count
    from public.user_badges ub
    cross join win
    where ub.awarded_at >= win.since
    group by user_id
  )
  select
    p.username,
    coalesce(r.rating_count, 0)::bigint as rating_count,
    coalesce(c.comment_count, 0)::bigint as comment_count,
    coalesce(b.badge_count, 0)::bigint as badge_count,
    (
      coalesce(c.comment_count, 0) * 2
      + coalesce(r.rating_count, 0)
      + coalesce(b.badge_count, 0) * 5
    )::bigint as points
  from public.profiles p
  left join ratings r on r.user_id = p.id
  left join comments c on c.user_id = p.id
  left join badges b on b.user_id = p.id
  where (coalesce(r.rating_count, 0) + coalesce(c.comment_count, 0) + coalesce(b.badge_count, 0)) > 0
  order by points desc, p.username asc
  limit 100;
$$;

create or replace function public.latest_activity(row_limit int default 15)
returns table (
  type text,
  user_id uuid,
  game_slug text,
  rating int,
  badge_key text,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select *
  from (
    select
      'rating'::text as type,
      gr.user_id,
      gr.game_slug,
      gr.rating,
      null::text as badge_key,
      gr.created_at
    from public.game_ratings gr

    union all

    select
      'comment'::text as type,
      gc.user_id,
      gc.game_slug,
      null::int as rating,
      null::text as badge_key,
      gc.created_at
    from public.game_comments gc

    union all

    select
      'badge'::text as type,
      ub.user_id,
      null::text as game_slug,
      null::int as rating,
      ub.badge_key,
      ub.awarded_at as created_at
    from public.user_badges ub
  ) feed
  order by feed.created_at desc
  limit greatest(coalesce(row_limit, 15), 1);
$$;

grant execute on function public.top_rated_games(int) to anon, authenticated;
grant execute on function public.most_discussed_games(int) to anon, authenticated;
grant execute on function public.trending_games(int) to anon, authenticated;
grant execute on function public.top_members(int) to anon, authenticated;
grant execute on function public.latest_activity(int) to anon, authenticated;
