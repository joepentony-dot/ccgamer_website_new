create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  joined_at timestamptz default now(),
  newsletter_monthly boolean default false,
  notify_new_games boolean default false,
  notify_c64 boolean default false,
  notify_amiga boolean default false,
  updated_at timestamptz default now()
);

-- auto-update updated_at
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated
before update on public.profiles
for each row
execute function public.set_updated_at();

-- RLS
alter table public.profiles enable row level security;

drop policy if exists "profile_select_own" on public.profiles;
create policy "profile_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profile_update_own" on public.profiles;
create policy "profile_update_own"
on public.profiles
for update
using (auth.uid() = id);

-- auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    joined_at
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email,'@',1)),
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

-- backfill existing users
insert into public.profiles (id, email, display_name, joined_at)
select
  u.id,
  u.email,
  split_part(u.email,'@',1),
  u.created_at
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
);
