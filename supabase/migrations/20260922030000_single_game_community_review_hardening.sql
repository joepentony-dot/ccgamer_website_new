-- Forward-only hardening for the already-applied single-game community read models.
-- Do not fold these changes back into the historical 20260922003000 migration:
-- production has already recorded that migration as applied.

create or replace function public.ccg_current_user_not_soft_banned()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    (select auth.uid()) is not null
    and not exists (
      select 1
      from public.user_soft_bans b
      where b.user_id = (select auth.uid())
        and coalesce(b.banned, false)
    );
$$;

revoke execute on function public.ccg_current_user_not_soft_banned() from public, anon;
grant execute on function public.ccg_current_user_not_soft_banned() to authenticated;

drop policy if exists comment_helpful_votes_owner_insert on public.comment_helpful_votes;
create policy comment_helpful_votes_owner_insert
  on public.comment_helpful_votes
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and public.ccg_current_user_not_soft_banned()
  );

create or replace function public.ccg_game_reviews(
  p_game_key text,
  p_sort text default 'newest',
  p_offset integer default 0,
  p_limit integer default 8
)
returns table (
  id uuid,
  user_id uuid,
  body text,
  created_at timestamptz,
  updated_at timestamptz,
  deleted boolean,
  page_type text,
  page_id text,
  game_key text,
  username text,
  display_name text,
  rating integer,
  helpful_count bigint,
  viewer_helpful boolean,
  total_count bigint
)
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with helpful as (
    select hv.comment_id, count(*)::bigint as helpful_count
    from public.comment_helpful_votes hv
    group by hv.comment_id
  ),
  review_rows as (
    select
      c.id,
      c.user_id,
      c.body,
      c.created_at,
      c.updated_at,
      coalesce(c.deleted, false) as deleted,
      c.page_type,
      c.page_id,
      c.game_key,
      p.username,
      p.display_name,
      r.rating::integer as rating,
      coalesce(h.helpful_count, 0)::bigint as helpful_count,
      exists (
        select 1
        from public.comment_helpful_votes mine
        where mine.comment_id = c.id
          and mine.user_id = (select auth.uid())
      ) as viewer_helpful,
      count(*) over ()::bigint as total_count
    from public.comments c
    left join public.profiles p
      on p.id = c.user_id
    left join public.ratings r
      on r.user_id = c.user_id
     and r.game_key = c.game_key
    left join helpful h
      on h.comment_id = c.id
    where c.game_key = lower(btrim(coalesce(p_game_key, '')))
  )
  select *
  from review_rows rr
  order by
    case when lower(coalesce(p_sort, 'newest')) = 'helpful' then rr.helpful_count end desc nulls last,
    case when lower(coalesce(p_sort, 'newest')) = 'highest' then rr.rating end desc nulls last,
    case when lower(coalesce(p_sort, 'newest')) = 'lowest' then rr.rating end asc nulls last,
    case when lower(coalesce(p_sort, 'newest')) = 'oldest' then rr.created_at end asc nulls last,
    case when lower(coalesce(p_sort, 'newest')) <> 'oldest' then rr.created_at end desc nulls last,
    rr.id desc
  offset greatest(coalesce(p_offset, 0), 0)
  limit least(greatest(coalesce(p_limit, 8), 1), 24);
$$;

revoke execute on function public.ccg_game_reviews(text, text, integer, integer) from public;
grant execute on function public.ccg_game_reviews(text, text, integer, integer) to anon, authenticated;

create or replace function public.submit_helpful_vote(p_comment_id uuid)
returns bigint
language plpgsql
security invoker
set search_path = public
as $$
declare
  vote_count bigint;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if not public.ccg_current_user_not_soft_banned() then
    raise exception 'Account is not permitted to vote' using errcode = '42501';
  end if;

  if not exists (select 1 from public.comments c where c.id = p_comment_id) then
    raise exception 'Review not found' using errcode = 'P0002';
  end if;

  insert into public.comment_helpful_votes (comment_id, user_id)
  values (p_comment_id, (select auth.uid()))
  on conflict (comment_id, user_id) do nothing;

  select count(*)::bigint
    into vote_count
  from public.comment_helpful_votes
  where comment_id = p_comment_id;

  return vote_count;
end;
$$;

revoke execute on function public.submit_helpful_vote(uuid) from public, anon;
grant execute on function public.submit_helpful_vote(uuid) to authenticated;
