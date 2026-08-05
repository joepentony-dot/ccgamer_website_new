-- CCG Member Hub Phase 9: owner-only public-profile preview
--
-- Run after the Phase 7C compatibility migration and Phase 8 badge engine.
-- The owner preview returns the same privacy-filtered payload as the public RPC,
-- but it remains available to the signed-in owner before publication.

create or replace function public.ccg_build_member_profile_payload(
  target_profile_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'username', p.username,
    'display_name',
      coalesce(nullif(p.display_name, ''), p.username, 'CCG Member'),
    'avatar_url', p.avatar_url,
    'bio', p.public_bio,
    'preferred_system', coalesce(p.preferred_system, 'both'),
    'joined_at', p.created_at,
    'is_public', p.is_public,
    'top_picks',
      case
        when p.show_top_picks then
          coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                  'game_slug', t.game_slug,
                  'created_at', t.created_at
                )
                order by t.created_at
              )
              from public.profile_top_picks t
              where t.profile_id = p.id
            ),
            '[]'::jsonb
          )
        else '[]'::jsonb
      end,
    'badges',
      case
        when p.show_badges then
          coalesce(
            (
              select jsonb_agg(
                jsonb_build_object(
                  'badge_key', upper(replace(b.badge_key, '-', '_')),
                  'badge_name',
                    coalesce(
                      c.badge_name,
                      initcap(replace(b.badge_key, '_', ' '))
                    ),
                  'badge_description', coalesce(c.badge_description, ''),
                  'badge_category', coalesce(c.badge_category, 'achievement'),
                  'assigned_at', b.assigned_at
                )
                order by b.assigned_at desc
              )
              from public.ccg_member_badge_rows(p.id) b
              left join public.get_member_badge_catalog() c
                on c.badge_key = upper(replace(b.badge_key, '-', '_'))
            ),
            '[]'::jsonb
          )
        else '[]'::jsonb
      end,
    'public_list',
      case
        when p.public_list_key <> 'none' then
          jsonb_build_object(
            'key', p.public_list_key,
            'title', p.public_list_title,
            'games',
              coalesce(
                (
                  select jsonb_agg(
                    jsonb_build_object(
                      'game_slug', g.game_slug,
                      'rating', g.rating
                    )
                    order by coalesce(g.title, g.game_slug)
                  )
                  from public.profile_game_library g
                  where g.profile_id = p.id
                    and g.deleted_at is null
                    and p.public_list_key = any(g.lists)
                ),
                '[]'::jsonb
              )
          )
        else null
      end
  )
  from public.profiles p
  where p.id = target_profile_id
  limit 1;
$$;

revoke all
  on function public.ccg_build_member_profile_payload(uuid)
  from public;

create or replace function public.get_public_member_profile(member_handle text)
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.ccg_build_member_profile_payload(p.id)
  from public.profiles p
  where p.is_public = true
    and p.username is not null
    and lower(p.username) = lower(trim(member_handle))
  limit 1;
$$;

revoke all
  on function public.get_public_member_profile(text)
  from public;
grant execute
  on function public.get_public_member_profile(text)
  to anon, authenticated;

create or replace function public.get_my_public_profile_preview()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.ccg_build_member_profile_payload(auth.uid())
  where auth.uid() is not null;
$$;

revoke all
  on function public.get_my_public_profile_preview()
  from public;
grant execute
  on function public.get_my_public_profile_preview()
  to authenticated;
