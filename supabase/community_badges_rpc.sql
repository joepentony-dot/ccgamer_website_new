-- Award community badges based on current user activity.
-- Safe to run multiple times.
create or replace function public.award_badge_if_eligible(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ratings_count integer := 0;
  comments_count integer := 0;
begin
  select count(*) into ratings_count from public.game_ratings where user_id = target_user_id;
  select count(*) into comments_count from public.game_comments where user_id = target_user_id and coalesce(is_deleted, false) = false;

  if ratings_count >= 1 then
    insert into public.user_badges(user_id, badge_code)
    values (target_user_id, 'FIRST_RATING')
    on conflict (user_id, badge_code) do nothing;
  end if;

  if ratings_count >= 10 then
    insert into public.user_badges(user_id, badge_code)
    values (target_user_id, 'RATED_10')
    on conflict (user_id, badge_code) do nothing;
  end if;

  if ratings_count >= 50 then
    insert into public.user_badges(user_id, badge_code)
    values (target_user_id, 'RATED_50')
    on conflict (user_id, badge_code) do nothing;
  end if;

  if comments_count >= 1 then
    insert into public.user_badges(user_id, badge_code)
    values (target_user_id, 'FIRST_COMMENT')
    on conflict (user_id, badge_code) do nothing;
  end if;

  if comments_count >= 10 then
    insert into public.user_badges(user_id, badge_code)
    values (target_user_id, 'COMMENTER_10')
    on conflict (user_id, badge_code) do nothing;
  end if;
end;
$$;
