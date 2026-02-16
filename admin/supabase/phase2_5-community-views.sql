-- ============================================================
-- CCG PHASE 2.5 — COMMUNITY HUB VIEWS
-- File: /admin/supabase/phase2_5-community-views.sql
-- ============================================================

begin;

create or replace view public.game_rating_stats as
select
  gr.game_slug,
  round(avg(gr.rating)::numeric, 2) as avg_rating,
  count(*)::bigint as rating_count
from public.game_ratings gr
group by gr.game_slug;

revoke all on public.game_rating_stats from public;
grant select on public.game_rating_stats to anon, authenticated;

create or replace view public.latest_comments_public as
select
  gc.id,
  gc.profile_id,
  gc.game_slug,
  gc.content,
  gc.created_at,
  pp.display_name
from public.game_comments gc
left join public.profiles_public pp
  on pp.id = gc.profile_id
where gc.is_deleted = false;

revoke all on public.latest_comments_public from public;
grant select on public.latest_comments_public to anon, authenticated;

commit;
