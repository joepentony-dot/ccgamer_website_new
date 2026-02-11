-- CCG Omega Community v2: comments + profiles safe migration
-- Non-destructive: creates missing structures and policies only when absent.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique,
  display_name text,
  avatar_url text,
  bio text,
  role text default 'member',
  created_at timestamptz not null default now()
);

alter table public.profiles
  add column if not exists display_name text,
  add column if not exists bio text,
  add column if not exists avatar_url text,
  add column if not exists role text default 'member',
  add column if not exists created_at timestamptz not null default now();

create table if not exists public.game_comments (
  id uuid primary key default gen_random_uuid(),
  game_slug text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  is_deleted boolean not null default false
);

alter table public.game_comments
  add column if not exists game_slug text,
  add column if not exists user_id uuid references public.profiles(id) on delete cascade,
  add column if not exists content text,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz,
  add column if not exists is_deleted boolean not null default false;

create index if not exists idx_game_comments_slug_created
  on public.game_comments (game_slug, created_at desc);

create index if not exists idx_game_comments_user_created
  on public.game_comments (user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.game_comments enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_public_read') then
    create policy profiles_public_read on public.profiles for select using (true);
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_owner_insert') then
    create policy profiles_owner_insert on public.profiles for insert to authenticated with check (id = auth.uid());
  end if;

  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profiles' and policyname='profiles_owner_update') then
    create policy profiles_owner_update on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
  end if;

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
