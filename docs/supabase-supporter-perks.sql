-- CCG Supporter Perks / Reputation / Challenges schema
-- Run after docs/supabase-community.sql

create extension if not exists pgcrypto;

-- =========================
-- Core supporter state
-- =========================
create table if not exists public.supporter_tier_mapping (
  id bigserial primary key,
  provider text not null check (provider in ('patreon','youtube','manual')),
  external_tier_key text not null,
  supporter_level text not null check (supporter_level in ('bronze','silver','gold','platinum','legend')),
  rep_multiplier numeric(5,2) not null default 1.10 check (rep_multiplier >= 1 and rep_multiplier <= 1.50),
  flair_key text not null,
  rank_priority int not null default 10,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (provider, external_tier_key)
);

insert into public.supporter_tier_mapping (provider, external_tier_key, supporter_level, rep_multiplier, flair_key, rank_priority)
values
  ('patreon', 'patreon_bronze', 'bronze', 1.10, 'bronze-glow', 10),
  ('patreon', 'patreon_silver', 'silver', 1.10, 'silver-glow', 20),
  ('patreon', 'patreon_gold', 'gold', 1.10, 'gold-glow', 30),
  ('patreon', 'patreon_platinum', 'platinum', 1.10, 'platinum-glow', 40),
  ('patreon', 'patreon_legend', 'legend', 1.10, 'legend-glow', 50),
  ('youtube', 'yt_supporter', 'bronze', 1.10, 'bronze-glow', 10),
  ('youtube', 'yt_vip', 'silver', 1.10, 'silver-glow', 20),
  ('youtube', 'yt_omega', 'gold', 1.10, 'gold-glow', 30)
on conflict (provider, external_tier_key) do nothing;

create table if not exists public.supporter_links (
  user_id uuid primary key references auth.users(id) on delete cascade,
  patreon_user_id text,
  patreon_status text not null default 'inactive' check (patreon_status in ('inactive','active','past_due','declined','paused','cancelled')),
  patreon_tier text,
  patreon_amount numeric(10,2),
  patreon_last_sync timestamptz,
  youtube_channel_id text,
  youtube_member_status boolean not null default false,
  youtube_level text,
  youtube_last_sync timestamptz,
  youtube_manual_status text not null default 'none' check (youtube_manual_status in ('none','pending','approved','rejected')),
  youtube_manual_code text,
  youtube_manual_requested_at timestamptz,
  manual_override_level text check (manual_override_level in ('bronze','silver','gold','platinum','legend')),
  supporter_level text not null default 'none' check (supporter_level in ('none','bronze','silver','gold','platinum','legend')),
  supporter_title text,
  supporter_flair_key text,
  supporter_frame_key text,
  profile_banner_key text,
  eight_bit_title text,
  early_access_enabled boolean not null default false,
  last_sync timestamptz,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.supporter_webhook_events (
  id bigserial primary key,
  provider text not null check (provider in ('patreon','youtube')),
  event_id text not null,
  event_type text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  unique (provider, event_id)
);

create table if not exists public.supporter_spotlight (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key date not null,
  is_featured boolean not null default true,
  reason text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (user_id, month_key)
);

create table if not exists public.supporter_lounge_posts (
  id bigserial primary key,
  author_user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text not null,
  is_supporter_only boolean not null default true,
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- =========================
-- Reputation + levels
-- =========================
create table if not exists public.level_config (
  id bigserial primary key,
  level int not null unique check (level > 0),
  min_points int not null unique check (min_points >= 0),
  level_title text not null,
  cosmetic_unlocks jsonb not null default '{}'::jsonb,
  active boolean not null default true
);

insert into public.level_config (level, min_points, level_title, cosmetic_unlocks)
values
  (1, 0, 'New Recruit', '{"frame":"none"}'),
  (2, 20, 'Arcade Scout', '{"banner":"signal-blue"}'),
  (3, 60, 'Cartridge Ranger', '{"title":"Sprite Wrangler"}'),
  (4, 130, 'Pixel Veteran', '{"frame":"ion-ring"}'),
  (5, 220, 'Retro Elite', '{"banner":"omega-grid"}'),
  (6, 360, 'Community Legend', '{"title":"Omega Operator"}')
on conflict (level) do nothing;

create table if not exists public.reputation_ledger (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  source_type text not null check (source_type in ('comment','rating','quiz','streak','admin_feature','helpful_received','challenge_bonus','badge_bonus')),
  source_id text,
  delta_points int not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists reputation_ledger_user_created_idx on public.reputation_ledger (user_id, created_at desc);
create unique index if not exists reputation_ledger_unique_source_idx
  on public.reputation_ledger (user_id, source_type, source_id)
  where source_id is not null;

create table if not exists public.reputation_totals (
  user_id uuid primary key references auth.users(id) on delete cascade,
  total_points int not null default 0,
  level int not null default 1,
  level_title text not null default 'New Recruit',
  updated_at timestamptz not null default now()
);

-- =========================
-- Badges + challenges
-- =========================
create table if not exists public.badge_definitions (
  id bigserial primary key,
  slug text not null unique,
  name text not null,
  description text not null,
  icon_asset_path text,
  category text not null check (category in ('supporter','activity','mastery','seasonal')),
  rarity text not null check (rarity in ('common','rare','epic')),
  rule_json jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.user_badges_v2 (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id bigint not null references public.badge_definitions(id) on delete cascade,
  earned_at timestamptz not null default now(),
  metadata_json jsonb not null default '{}'::jsonb,
  granted_by uuid references auth.users(id) on delete set null,
  unique (user_id, badge_id)
);

create table if not exists public.challenges (
  id bigserial primary key,
  title text not null,
  description text not null,
  rules_json jsonb not null,
  reward_json jsonb not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  is_supporter_only boolean not null default false,
  active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  check (end_at > start_at)
);

create table if not exists public.user_challenge_progress (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  challenge_id bigint not null references public.challenges(id) on delete cascade,
  progress_json jsonb not null default '{}'::jsonb,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (user_id, challenge_id)
);

-- =========================
-- Anti-abuse / moderation signals
-- =========================
create table if not exists public.comment_helpful_votes (
  id bigserial primary key,
  comment_id bigint not null references public.game_comments(id) on delete cascade,
  voter_user_id uuid not null references auth.users(id) on delete cascade,
  comment_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (comment_id, voter_user_id)
);

create index if not exists helpful_votes_voter_created_idx on public.comment_helpful_votes (voter_user_id, created_at desc);

create table if not exists public.comment_rate_limits (
  user_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null default now(),
  comment_count int not null default 0,
  updated_at timestamptz not null default now()
);

-- =========================
-- Triggers/helpers
-- =========================
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_supporter_links_updated_at on public.supporter_links;
create trigger set_supporter_links_updated_at
before update on public.supporter_links
for each row execute procedure public.set_updated_at_timestamp();

drop trigger if exists set_supporter_lounge_posts_updated_at on public.supporter_lounge_posts;
create trigger set_supporter_lounge_posts_updated_at
before update on public.supporter_lounge_posts
for each row execute procedure public.set_updated_at_timestamp();

drop trigger if exists set_user_challenge_progress_updated_at on public.user_challenge_progress;
create trigger set_user_challenge_progress_updated_at
before update on public.user_challenge_progress
for each row execute procedure public.set_updated_at_timestamp();

create or replace function public.resolve_supporter_level(
  patreon_status text,
  patreon_tier text,
  yt_status boolean,
  yt_level text,
  manual_level text
)
returns text
language plpgsql
stable
as $$
declare
  resolved text := 'none';
begin
  if manual_level is not null then
    return manual_level;
  end if;

  if coalesce(patreon_status, 'inactive') = 'active' and patreon_tier is not null then
    select stm.supporter_level into resolved
    from public.supporter_tier_mapping stm
    where stm.provider = 'patreon' and stm.external_tier_key = patreon_tier and stm.active = true
    order by stm.rank_priority desc
    limit 1;
  end if;

  if resolved = 'none' and yt_status = true and yt_level is not null then
    select stm.supporter_level into resolved
    from public.supporter_tier_mapping stm
    where stm.provider = 'youtube' and stm.external_tier_key = yt_level and stm.active = true
    order by stm.rank_priority desc
    limit 1;
  end if;

  return coalesce(resolved, 'none');
end;
$$;

create or replace function public.sync_supporter_level_fields()
returns trigger
language plpgsql
as $$
begin
  new.supporter_level := public.resolve_supporter_level(
    new.patreon_status,
    new.patreon_tier,
    new.youtube_member_status,
    new.youtube_level,
    new.manual_override_level
  );

  new.supporter_title := case new.supporter_level
    when 'none' then null
    else 'Omega Supporter – ' || initcap(new.supporter_level)
  end;

  if new.supporter_flair_key is null then
    new.supporter_flair_key := case new.supporter_level
      when 'bronze' then 'bronze-glow'
      when 'silver' then 'silver-glow'
      when 'gold' then 'gold-glow'
      when 'platinum' then 'platinum-glow'
      when 'legend' then 'legend-glow'
      else null
    end;
  end if;

  new.last_sync := now();
  return new;
end;
$$;

drop trigger if exists supporter_links_sync_level on public.supporter_links;
create trigger supporter_links_sync_level
before insert or update on public.supporter_links
for each row execute procedure public.sync_supporter_level_fields();

create or replace function public.get_level_for_points(total int)
returns table (level int, level_title text)
language sql
stable
as $$
  select lc.level, lc.level_title
  from public.level_config lc
  where lc.active = true
    and lc.min_points <= greatest(total, 0)
  order by lc.min_points desc
  limit 1
$$;

create or replace function public.rebuild_reputation_totals(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  sum_points int := 0;
  out_level int := 1;
  out_title text := 'New Recruit';
begin
  select coalesce(sum(delta_points), 0) into sum_points
  from public.reputation_ledger
  where user_id = target_user_id;

  select gl.level, gl.level_title into out_level, out_title
  from public.get_level_for_points(sum_points) gl;

  insert into public.reputation_totals (user_id, total_points, level, level_title, updated_at)
  values (target_user_id, sum_points, coalesce(out_level,1), coalesce(out_title,'New Recruit'), now())
  on conflict (user_id)
  do update set
    total_points = excluded.total_points,
    level = excluded.level,
    level_title = excluded.level_title,
    updated_at = now();
end;
$$;

create or replace function public.add_reputation_event(
  p_source_type text,
  p_source_id text,
  p_delta_points int,
  p_meta jsonb default '{}'::jsonb,
  p_target_user_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid := coalesce(p_target_user_id, auth.uid());
  profile_role text;
  allowed boolean := false;
  supporter_mult numeric(5,2) := 1.0;
  final_delta int;
begin
  if target_user is null then
    raise exception 'Authentication required';
  end if;

  select role into profile_role from public.profiles where id = auth.uid();
  allowed := auth.uid() = target_user or coalesce(profile_role, 'user') in ('admin','mod');
  if not allowed then
    raise exception 'Not allowed to write reputation for this user';
  end if;

  if p_source_type not in ('comment','rating','quiz','streak','admin_feature','helpful_received','challenge_bonus','badge_bonus') then
    raise exception 'Invalid reputation source_type';
  end if;

  if p_delta_points = 0 then
    raise exception 'delta points cannot be 0';
  end if;

  select coalesce(stm.rep_multiplier, 1.0) into supporter_mult
  from public.supporter_links sl
  left join public.supporter_tier_mapping stm
    on stm.provider = 'manual' and stm.external_tier_key = sl.supporter_level and stm.active = true
  where sl.user_id = target_user;

  if supporter_mult is null or supporter_mult < 1 then
    supporter_mult := 1.0;
  end if;

  final_delta := case
    when p_source_type in ('admin_feature','helpful_received','challenge_bonus') then ceil(p_delta_points * supporter_mult)::int
    else p_delta_points
  end;

  insert into public.reputation_ledger (user_id, source_type, source_id, delta_points, meta)
  values (target_user, p_source_type, p_source_id, final_delta, coalesce(p_meta, '{}'::jsonb))
  on conflict (user_id, source_type, source_id)
  do nothing;

  perform public.rebuild_reputation_totals(target_user);
end;
$$;

create or replace function public.submit_helpful_vote(p_comment_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  voter uuid := auth.uid();
  comment_owner uuid;
  today_votes int;
  same_owner boolean := false;
begin
  if voter is null then
    raise exception 'Authentication required';
  end if;

  select gc.user_id into comment_owner
  from public.game_comments gc
  where gc.id = p_comment_id and gc.is_deleted = false;

  if comment_owner is null then
    raise exception 'Comment not found';
  end if;

  if comment_owner = voter then
    raise exception 'Cannot vote your own comment';
  end if;

  select count(*) into today_votes
  from public.comment_helpful_votes
  where voter_user_id = voter
    and created_at >= date_trunc('day', now());

  if today_votes >= 40 then
    raise exception 'Daily helpful vote limit reached';
  end if;

  insert into public.comment_helpful_votes (comment_id, voter_user_id, comment_user_id)
  values (p_comment_id, voter, comment_owner)
  on conflict (comment_id, voter_user_id) do nothing;

  perform public.add_reputation_event(
    'helpful_received',
    'comment:' || p_comment_id::text,
    5,
    jsonb_build_object('comment_id', p_comment_id),
    comment_owner
  );
end;
$$;

create or replace function public.can_user_comment_now(p_user uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  row_limit public.comment_rate_limits;
begin
  select * into row_limit from public.comment_rate_limits where user_id = p_user;

  if row_limit.user_id is null then
    insert into public.comment_rate_limits (user_id, window_start, comment_count)
    values (p_user, now(), 1)
    on conflict (user_id) do update set comment_count = public.comment_rate_limits.comment_count + 1, updated_at = now();
    return true;
  end if;

  if row_limit.window_start < now() - interval '5 minutes' then
    update public.comment_rate_limits
    set window_start = now(), comment_count = 1, updated_at = now()
    where user_id = p_user;
    return true;
  end if;

  if row_limit.comment_count >= 5 then
    return false;
  end if;

  update public.comment_rate_limits
  set comment_count = comment_count + 1, updated_at = now()
  where user_id = p_user;

  return true;
end;
$$;

create or replace function public.on_comment_rep_award()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_deleted = false and public.can_user_comment_now(new.user_id) then
    perform public.add_reputation_event(
      'comment',
      'comment:' || new.id::text,
      1,
      jsonb_build_object('game_slug', new.game_slug),
      new.user_id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists award_comment_rep on public.game_comments;
create trigger award_comment_rep
after insert on public.game_comments
for each row execute procedure public.on_comment_rep_award();

create or replace function public.on_rating_rep_award()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.add_reputation_event(
    'rating',
    'rating:' || new.id::text,
    1,
    jsonb_build_object('game_slug', new.game_slug, 'rating', new.rating),
    new.user_id
  );
  return new;
end;
$$;

drop trigger if exists award_rating_rep on public.game_ratings;
create trigger award_rating_rep
after insert on public.game_ratings
for each row execute procedure public.on_rating_rep_award();

create or replace view public.community_member_overview as
select
  p.id as user_id,
  p.username,
  p.display_name,
  p.avatar_url,
  coalesce(rt.total_points, 0) as rep_points,
  coalesce(rt.level, 1) as rep_level,
  coalesce(rt.level_title, 'New Recruit') as level_title,
  coalesce(sl.supporter_level, 'none') as supporter_level,
  sl.supporter_title,
  sl.supporter_flair_key,
  sl.profile_banner_key,
  sl.early_access_enabled
from public.profiles p
left join public.reputation_totals rt on rt.user_id = p.id
left join public.supporter_links sl on sl.user_id = p.id;

-- =========================
-- RLS Policies
-- =========================
alter table public.supporter_tier_mapping enable row level security;
alter table public.supporter_links enable row level security;
alter table public.supporter_webhook_events enable row level security;
alter table public.supporter_spotlight enable row level security;
alter table public.supporter_lounge_posts enable row level security;
alter table public.level_config enable row level security;
alter table public.reputation_ledger enable row level security;
alter table public.reputation_totals enable row level security;
alter table public.badge_definitions enable row level security;
alter table public.user_badges_v2 enable row level security;
alter table public.challenges enable row level security;
alter table public.user_challenge_progress enable row level security;
alter table public.comment_helpful_votes enable row level security;
alter table public.comment_rate_limits enable row level security;

create policy "supporter_tier_mapping_public_read" on public.supporter_tier_mapping
for select using (true);

create policy "supporter_links_select_owner_or_staff" on public.supporter_links
for select using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod'))
);

create policy "supporter_links_insert_server_only" on public.supporter_links
for insert to authenticated
with check (false);

create policy "supporter_links_update_server_only" on public.supporter_links
for update to authenticated
using (false)
with check (false);

create policy "supporter_webhook_events_server_only" on public.supporter_webhook_events
for all to authenticated
using (false)
with check (false);

create policy "supporter_spotlight_public_read" on public.supporter_spotlight
for select using (true);

create policy "supporter_spotlight_staff_write" on public.supporter_spotlight
for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod')));

create policy "supporter_lounge_select" on public.supporter_lounge_posts
for select using (
  is_supporter_only = false
  or exists (select 1 from public.supporter_links sl where sl.user_id = auth.uid() and sl.supporter_level <> 'none')
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod'))
);

create policy "supporter_lounge_staff_write" on public.supporter_lounge_posts
for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod')));

create policy "level_config_public_read" on public.level_config
for select using (true);

create policy "reputation_ledger_owner_read" on public.reputation_ledger
for select using (
  auth.uid() = user_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod'))
);

create policy "reputation_ledger_server_insert_only" on public.reputation_ledger
for insert to authenticated
with check (false);

create policy "reputation_totals_public_read" on public.reputation_totals
for select using (true);

create policy "reputation_totals_server_write" on public.reputation_totals
for all to authenticated
using (false)
with check (false);

create policy "badge_definitions_public_read" on public.badge_definitions
for select using (active = true);

create policy "badge_definitions_staff_write" on public.badge_definitions
for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod')));

create policy "user_badges_v2_public_read" on public.user_badges_v2
for select using (true);

create policy "user_badges_v2_server_insert" on public.user_badges_v2
for insert to authenticated
with check (false);

create policy "challenges_read_active" on public.challenges
for select using (
  active = true
  and (
    is_supporter_only = false
    or exists (select 1 from public.supporter_links sl where sl.user_id = auth.uid() and sl.supporter_level <> 'none')
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod'))
  )
);

create policy "challenges_staff_write" on public.challenges
for all to authenticated
using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod')))
with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod')));

create policy "challenge_progress_owner_read" on public.user_challenge_progress
for select using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod')));

create policy "challenge_progress_owner_upsert" on public.user_challenge_progress
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "helpful_votes_owner_read" on public.comment_helpful_votes
for select using (
  auth.uid() = voter_user_id
  or auth.uid() = comment_user_id
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod'))
);

create policy "helpful_votes_owner_insert" on public.comment_helpful_votes
for insert to authenticated
with check (auth.uid() = voter_user_id);

create policy "comment_rate_limits_owner_read" on public.comment_rate_limits
for select using (auth.uid() = user_id or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod')));

create policy "comment_rate_limits_server_write" on public.comment_rate_limits
for all to authenticated
using (false)
with check (false);

-- Keep helper RPCs executable by authenticated users.
revoke all on function public.add_reputation_event(text, text, int, jsonb, uuid) from public;
revoke all on function public.submit_helpful_vote(bigint) from public;
revoke all on function public.rebuild_reputation_totals(uuid) from public;
revoke all on function public.can_user_comment_now(uuid) from public;

grant execute on function public.add_reputation_event(text, text, int, jsonb, uuid) to authenticated;
grant execute on function public.submit_helpful_vote(bigint) to authenticated;
grant execute on function public.rebuild_reputation_totals(uuid) to authenticated;
grant execute on function public.can_user_comment_now(uuid) to authenticated;

-- Useful seed challenge rows
insert into public.challenges (title, description, rules_json, reward_json, start_at, end_at, is_supporter_only, active)
values
  (
    'Rate 5 Games This Week',
    'Drop ratings on five different games before the reset.',
    '{"type":"ratings_count","target":5,"window":"weekly"}',
    '{"rep":6,"badge_slug":"weekly-rater"}',
    date_trunc('week', now()),
    date_trunc('week', now()) + interval '7 days',
    false,
    true
  ),
  (
    'Supporter Genre Tour',
    'Comment on three different genres this week.',
    '{"type":"genre_comment_count","target":3,"window":"weekly"}',
    '{"rep":10,"badge_slug":"supporter-genre-tour"}',
    date_trunc('week', now()),
    date_trunc('week', now()) + interval '7 days',
    true,
    true
  )
on conflict do nothing;
