-- This project has historical/default ACLs that explicitly grant some new
-- public-schema functions to anon. Revoke those direct grants after function
-- creation and keep the low-level badge writer inaccessible to API clients.

revoke all
  on function public.get_lost_sizzler_badge_catalog()
  from public, anon;
grant execute
  on function public.get_lost_sizzler_badge_catalog()
  to authenticated;

revoke all
  on function public.get_member_badge_catalog()
  from public, anon;
grant execute
  on function public.get_member_badge_catalog()
  to authenticated;

revoke all
  on function public.award_lost_sizzler_achievement(text)
  from public, anon;
grant execute
  on function public.award_lost_sizzler_achievement(text)
  to authenticated;

revoke all
  on function public.ccg_award_badge_code(uuid, text)
  from public, anon, authenticated;

revoke all
  on function public.award_badge_if_eligible(uuid)
  from public, anon;
grant execute
  on function public.award_badge_if_eligible(uuid)
  to authenticated;

revoke all
  on function public.get_my_member_badges()
  from public, anon;
grant execute
  on function public.get_my_member_badges()
  to authenticated;
