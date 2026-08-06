-- Phase 20E: explicit announcement preferences and recipient preview
-- Additive, consent-preserving and safe to run more than once.

alter table if exists public.profiles
  add column if not exists notify_new_games_choice_recorded boolean default false,
  add column if not exists notify_newsletter_choice_recorded boolean default false,
  add column if not exists notification_preferences_updated_at timestamptz;

update public.profiles
set notify_new_games_choice_recorded = true
where coalesce(notify_new_games, false) = true
  and coalesce(notify_new_games_choice_recorded, false) = false;

update public.profiles
set notify_new_games_choice_recorded = false
where notify_new_games_choice_recorded is null;

update public.profiles
set notify_newsletter_choice_recorded = false
where notify_newsletter_choice_recorded is null;

alter table if exists public.profiles
  alter column notify_new_games set default false,
  alter column notify_newsletter set default false,
  alter column notify_new_games_choice_recorded set default false,
  alter column notify_new_games_choice_recorded set not null,
  alter column notify_newsletter_choice_recorded set default false,
  alter column notify_newsletter_choice_recorded set not null;

create or replace function public.handle_new_user_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_preferences_presented boolean := lower(coalesce(new.raw_user_meta_data->>'notification_preferences_presented', 'false')) = 'true';
  v_notify_new_games boolean := lower(coalesce(new.raw_user_meta_data->>'notify_new_games', 'false')) = 'true';
  v_notify_newsletter boolean := lower(coalesce(new.raw_user_meta_data->>'notify_newsletter', 'false')) = 'true';
begin
  insert into public.profiles (
    id,
    username,
    display_name,
    avatar_url,
    role,
    created_at,
    newsletter_monthly,
    notify_new_games,
    notify_c64,
    notify_amiga,
    newsletter_opt_in,
    notify_new_games_opt_in,
    notify_platform_c64,
    notify_platform_amiga,
    notify_newsletter,
    notify_new_games_choice_recorded,
    notify_newsletter_choice_recorded,
    notification_preferences_updated_at,
    unsub_token,
    email_confirmed
  )
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), 24), ''),
    nullif(left(coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), 64), ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    'user',
    now(),
    false,
    v_notify_new_games,
    false,
    false,
    false,
    v_notify_new_games,
    false,
    false,
    v_notify_newsletter,
    v_preferences_presented,
    v_preferences_presented,
    case when v_preferences_presented then now() else null end,
    encode(gen_random_bytes(24), 'hex'),
    (new.email_confirmed_at is not null)
  )
  on conflict (id) do update
  set email_confirmed = excluded.email_confirmed;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();

create or replace function public.admin_announcement_recipient_counts(p_content_type text)
returns table (
  active_members bigint,
  opted_in_members bigint,
  eligible_recipients bigint,
  preference_column text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not public.ccg_is_admin(auth.uid()) then
    raise exception 'not_authorized';
  end if;

  return query
  select
    count(*) filter (
      where coalesce(p.banned, false) = false
    )::bigint as active_members,
    count(*) filter (
      where coalesce(p.banned, false) = false
        and case
          when lower(coalesce(p_content_type, '')) = 'game' then coalesce(p.notify_new_games, false)
          else coalesce(p.notify_newsletter, false)
        end
    )::bigint as opted_in_members,
    count(*) filter (
      where coalesce(p.banned, false) = false
        and case
          when lower(coalesce(p_content_type, '')) = 'game' then coalesce(p.notify_new_games, false)
          else coalesce(p.notify_newsletter, false)
        end
        and u.email is not null
        and u.email_confirmed_at is not null
    )::bigint as eligible_recipients,
    case
      when lower(coalesce(p_content_type, '')) = 'game' then 'notify_new_games'
      else 'notify_newsletter'
    end as preference_column
  from public.profiles p
  left join auth.users u on u.id = p.id;
end;
$$;

revoke all on function public.admin_announcement_recipient_counts(text) from public;
grant execute on function public.admin_announcement_recipient_counts(text) to authenticated;

comment on column public.profiles.notify_newsletter_choice_recorded is
  'True only after the member has been presented with and recorded a video/Retro Special email preference.';

comment on function public.admin_announcement_recipient_counts(text) is
  'Returns privacy-safe announcement recipient totals to authenticated CCG administrators.';
