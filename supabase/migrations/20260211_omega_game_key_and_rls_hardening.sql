-- Omega hardening: canonical game key + baseline table/RLS checks.

alter table if exists public.game_comments
  add column if not exists game_key text;

update public.game_comments
set game_key = lower(coalesce(nullif(trim(game_slug), ''), game_key))
where game_key is null or btrim(game_key) = '';

create index if not exists idx_game_comments_game_key_created
  on public.game_comments (game_key, created_at desc);

create or replace function public.ccg_normalize_game_key(in_slug text, in_id text default null)
returns text
language sql
immutable
as $$
  select lower(coalesce(nullif(trim(in_slug), ''), nullif(trim(in_id), '')))
$$;

create or replace function public.ccg_comments_apply_game_key()
returns trigger
language plpgsql
as $$
begin
  if new.game_key is null or btrim(new.game_key) = '' then
    new.game_key := public.ccg_normalize_game_key(new.game_slug, null);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_ccg_comments_apply_game_key on public.game_comments;
create trigger trg_ccg_comments_apply_game_key
before insert or update on public.game_comments
for each row
execute procedure public.ccg_comments_apply_game_key();

-- Ensure expected community tables exist in production
create table if not exists public.game_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_slug text not null,
  rating numeric not null,
  created_at timestamptz not null default now()
);

create table if not exists public.user_badges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  badge_key text,
  badge_code text,
  awarded_at timestamptz not null default now()
);

alter table if exists public.game_comments enable row level security;

DO $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='game_comments' and policyname='comments_public_read') then
    create policy comments_public_read on public.game_comments for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='game_comments' and policyname='comments_authenticated_insert') then
    create policy comments_authenticated_insert on public.game_comments for insert to authenticated with check (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='game_comments' and policyname='comments_owner_update') then
    create policy comments_owner_update on public.game_comments for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='game_comments' and policyname='comments_owner_delete') then
    create policy comments_owner_delete on public.game_comments for delete to authenticated using (user_id = auth.uid());
  end if;
end $$;
