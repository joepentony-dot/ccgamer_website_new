-- CCG Member Hub Phase 3: optional public profiles and private submissions
-- Privacy-first defaults: all existing and new profiles remain private.

alter table public.profiles
  add column if not exists is_public boolean not null default false,
  add column if not exists public_bio text not null default '',
  add column if not exists show_top_picks boolean not null default true,
  add column if not exists show_badges boolean not null default true,
  add column if not exists public_list_key text not null default 'none',
  add column if not exists public_list_title text not null default 'My CCG Collection';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_public_list_key_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_public_list_key_check
      check (public_list_key in ('none', 'played', 'want', 'owned', 'still'));
  end if;
end $$;

create table if not exists public.member_submissions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  submission_type text not null,
  game_slug text,
  subject text not null,
  message text not null,
  status text not null default 'new',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint member_submissions_type_check check (
    submission_type in ('game_suggestion', 'correction', 'site_feedback')
  ),
  constraint member_submissions_status_check check (
    status in ('new', 'reviewing', 'resolved', 'declined')
  ),
  constraint member_submissions_subject_length check (char_length(subject) between 3 and 120),
  constraint member_submissions_message_length check (char_length(message) between 10 and 3000)
);

create or replace function public.set_member_submission_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists member_submissions_set_updated_at on public.member_submissions;
create trigger member_submissions_set_updated_at
before update on public.member_submissions
for each row execute function public.set_member_submission_updated_at();

alter table public.member_submissions enable row level security;

drop policy if exists member_submissions_owner_select on public.member_submissions;
create policy member_submissions_owner_select
  on public.member_submissions for select to authenticated
  using (profile_id = auth.uid());

drop policy if exists member_submissions_owner_insert on public.member_submissions;
create policy member_submissions_owner_insert
  on public.member_submissions for insert to authenticated
  with check (profile_id = auth.uid());

drop policy if exists member_submissions_owner_delete on public.member_submissions;
create policy member_submissions_owner_delete
  on public.member_submissions for delete to authenticated
  using (profile_id = auth.uid());

drop policy if exists member_submissions_admin_select on public.member_submissions;
create policy member_submissions_admin_select
  on public.member_submissions for select to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) in ('admin', 'superadmin')
  ));

drop policy if exists member_submissions_admin_update on public.member_submissions;
create policy member_submissions_admin_update
  on public.member_submissions for update to authenticated
  using (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) in ('admin', 'superadmin')
  ))
  with check (exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and lower(coalesce(p.role, '')) in ('admin', 'superadmin')
  ));

grant select, insert, update, delete on public.member_submissions to authenticated;

create or replace function public.get_public_member_profile(member_handle text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'username', p.username,
    'display_name', coalesce(nullif(p.display_name, ''), p.username, 'CCG Member'),
    'avatar_url', p.avatar_url,
    'bio', p.public_bio,
    'preferred_system', coalesce(p.preferred_system, 'both'),
    'joined_at', p.created_at,
    'top_picks', case when p.show_top_picks then coalesce((
      select jsonb_agg(jsonb_build_object('game_slug', t.game_slug, 'created_at', t.created_at) order by t.created_at)
      from public.profile_top_picks t
      where t.profile_id = p.id
    ), '[]'::jsonb) else '[]'::jsonb end,
    'badges', case when p.show_badges then coalesce((
      select jsonb_agg(jsonb_build_object('badge_key', b.badge_key, 'assigned_at', b.assigned_at) order by b.assigned_at desc)
      from public.user_badges b
      where b.user_id = p.id
    ), '[]'::jsonb) else '[]'::jsonb end,
    'public_list', case when p.public_list_key <> 'none' then jsonb_build_object(
      'key', p.public_list_key,
      'title', p.public_list_title,
      'games', coalesce((
        select jsonb_agg(jsonb_build_object('game_slug', g.game_slug, 'rating', g.rating) order by coalesce(g.title, g.game_slug))
        from public.profile_game_library g
        where g.profile_id = p.id
          and p.public_list_key = any(g.lists)
      ), '[]'::jsonb)
    ) else null end
  )
  from public.profiles p
  where p.is_public = true
    and p.username is not null
    and lower(p.username) = lower(trim(member_handle))
  limit 1;
$$;

revoke all on function public.get_public_member_profile(text) from public;
grant execute on function public.get_public_member_profile(text) to anon, authenticated;

create or replace function public.get_my_member_activity(row_limit int default 12)
returns table (
  type text,
  game_slug text,
  rating int,
  badge_key text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select feed.type, feed.game_slug, feed.rating, feed.badge_key, feed.created_at
  from (
    select 'rating'::text as type, r.game_slug, r.rating, null::text as badge_key, r.created_at
    from public.game_ratings r
    where r.user_id = auth.uid()

    union all

    select 'comment'::text, c.game_slug, null::int, null::text, c.created_at
    from public.game_comments c
    where c.user_id = auth.uid()
      and coalesce(c.is_deleted, false) = false

    union all

    select 'badge'::text, null::text, null::int, b.badge_key, b.assigned_at
    from public.user_badges b
    where b.user_id = auth.uid()
  ) feed
  order by feed.created_at desc
  limit greatest(1, least(coalesce(row_limit, 12), 50));
$$;

revoke all on function public.get_my_member_activity(int) from public;
grant execute on function public.get_my_member_activity(int) to authenticated;
