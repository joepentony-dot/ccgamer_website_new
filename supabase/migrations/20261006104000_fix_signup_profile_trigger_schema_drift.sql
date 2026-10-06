-- Repair the auth.users -> public.profiles signup trigger after profile schema cleanup.
-- The retired newsletter_monthly / notify_c64 / notify_amiga / legacy opt-in columns
-- must not be referenced by account creation.

create extension if not exists pgcrypto;

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
    email,
    notify_new_games,
    notify_newsletter,
    notify_new_games_choice_recorded,
    notify_newsletter_choice_recorded,
    notification_preferences_updated_at,
    unsub_token
  )
  values (
    new.id,
    nullif(left(coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), 24), ''),
    nullif(left(coalesce(new.raw_user_meta_data->>'display_name', new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)), 64), ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', ''),
    'user',
    now(),
    new.email,
    v_notify_new_games,
    v_notify_newsletter,
    v_preferences_presented,
    v_preferences_presented,
    case when v_preferences_presented then now() else null end,
    encode(gen_random_bytes(24), 'hex')
  )
  on conflict (id) do update
  set
    email = excluded.email,
    notify_new_games = excluded.notify_new_games,
    notify_newsletter = excluded.notify_newsletter,
    notify_new_games_choice_recorded = excluded.notify_new_games_choice_recorded,
    notify_newsletter_choice_recorded = excluded.notify_newsletter_choice_recorded,
    notification_preferences_updated_at = excluded.notification_preferences_updated_at;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
  after insert on auth.users
  for each row execute function public.handle_new_user_profile();
