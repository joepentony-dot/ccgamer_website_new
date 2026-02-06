-- CCG Community Supabase setup
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  avatar_url text null,
  role text not null default 'user' check (role in ('user', 'admin', 'mod')),
  created_at timestamptz not null default now()
);

create table if not exists public.game_ratings (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_slug text not null,
  rating int not null check (rating between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, game_slug)
);

create table if not exists public.game_comments (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  game_slug text not null,
  content text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_code text not null,
  awarded_at timestamptz not null default now(),
  unique (user_id, badge_code)
);

create table if not exists public.comment_reports (
  id bigserial primary key,
  reporter_user_id uuid references auth.users(id) on delete set null,
  comment_id bigint not null references public.game_comments(id) on delete cascade,
  reason text null,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.game_ratings enable row level security;
alter table public.game_comments enable row level security;
alter table public.user_badges enable row level security;
alter table public.comment_reports enable row level security;

-- PROFILES
create policy "profiles_select_public" on public.profiles
for select using (true);

create policy "profiles_insert_self" on public.profiles
for insert to authenticated
with check (auth.uid() = id);

create policy "profiles_update_self" on public.profiles
for update to authenticated
using (auth.uid() = id)
with check (
  auth.uid() = id
  and (
    role = (select p.role from public.profiles p where p.id = auth.uid())
    or exists (
      select 1 from public.profiles ap
      where ap.id = auth.uid() and ap.role in ('admin','mod')
    )
  )
);

-- GAME RATINGS
create policy "ratings_select_public" on public.game_ratings
for select using (true);

create policy "ratings_insert_owner" on public.game_ratings
for insert to authenticated
with check (auth.uid() = user_id);

create policy "ratings_update_owner" on public.game_ratings
for update to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "ratings_delete_owner" on public.game_ratings
for delete to authenticated
using (auth.uid() = user_id);

-- GAME COMMENTS
create policy "comments_select_public_not_deleted" on public.game_comments
for select using (is_deleted = false or exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod')
));

create policy "comments_insert_authenticated" on public.game_comments
for insert to authenticated
with check (auth.uid() = user_id);

create policy "comments_update_owner_or_mod" on public.game_comments
for update to authenticated
using (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod')
  )
)
with check (
  auth.uid() = user_id
  or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod')
  )
);

-- no delete policy => hard delete blocked

-- USER BADGES
create policy "badges_select_public" on public.user_badges
for select using (true);

create policy "badges_insert_admin_mod" on public.user_badges
for insert to authenticated
with check (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod')
));

create policy "badges_update_admin_mod" on public.user_badges
for update to authenticated
using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod')
))
with check (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod')
));

create policy "badges_delete_admin_mod" on public.user_badges
for delete to authenticated
using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod')
));

-- COMMENT REPORTS
create policy "reports_insert_authenticated" on public.comment_reports
for insert to authenticated
with check (auth.uid() = reporter_user_id);

create policy "reports_select_admin_mod" on public.comment_reports
for select to authenticated
using (exists (
  select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin','mod')
));

-- updated_at helper
create or replace function public.set_updated_at_timestamp()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_game_ratings_updated_at on public.game_ratings;
create trigger set_game_ratings_updated_at
before update on public.game_ratings
for each row execute procedure public.set_updated_at_timestamp();

drop trigger if exists set_game_comments_updated_at on public.game_comments;
create trigger set_game_comments_updated_at
before update on public.game_comments
for each row execute procedure public.set_updated_at_timestamp();

create or replace function public.award_badge_if_eligible(target_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ratings_count int := 0;
  comments_count int := 0;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if auth.uid() <> target_user_id then
    raise exception 'Can only award badges for your own account';
  end if;

  select count(*) into ratings_count from public.game_ratings where user_id = target_user_id;
  select count(*) into comments_count from public.game_comments where user_id = target_user_id and is_deleted = false;

  if ratings_count >= 1 then
    insert into public.user_badges (user_id, badge_code)
    values (target_user_id, 'FIRST_RATING')
    on conflict (user_id, badge_code) do nothing;
  end if;

  if ratings_count >= 10 then
    insert into public.user_badges (user_id, badge_code)
    values (target_user_id, 'RATED_10')
    on conflict (user_id, badge_code) do nothing;
  end if;

  if ratings_count >= 50 then
    insert into public.user_badges (user_id, badge_code)
    values (target_user_id, 'RATED_50')
    on conflict (user_id, badge_code) do nothing;
  end if;

  if comments_count >= 1 then
    insert into public.user_badges (user_id, badge_code)
    values (target_user_id, 'FIRST_COMMENT')
    on conflict (user_id, badge_code) do nothing;
  end if;

  if comments_count >= 10 then
    insert into public.user_badges (user_id, badge_code)
    values (target_user_id, 'COMMENTER_10')
    on conflict (user_id, badge_code) do nothing;
  end if;
end;
$$;

revoke all on function public.award_badge_if_eligible(uuid) from public;
grant execute on function public.award_badge_if_eligible(uuid) to authenticated;
