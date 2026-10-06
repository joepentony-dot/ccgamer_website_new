-- Repair historical auth/profile drift.
-- Ensures every auth.users row has a matching public.profiles row using only
-- the current profile schema and preserving the original account creation date.

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
select
  u.id,
  nullif(left(coalesce(u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)), 24), ''),
  nullif(left(coalesce(u.raw_user_meta_data->>'display_name', u.raw_user_meta_data->>'username', split_part(u.email, '@', 1)), 64), ''),
  coalesce(u.raw_user_meta_data->>'avatar_url', ''),
  'user',
  u.created_at,
  u.email,
  lower(coalesce(u.raw_user_meta_data->>'notify_new_games', 'false')) = 'true',
  lower(coalesce(u.raw_user_meta_data->>'notify_newsletter', 'false')) = 'true',
  lower(coalesce(u.raw_user_meta_data->>'notification_preferences_presented', 'false')) = 'true',
  lower(coalesce(u.raw_user_meta_data->>'notification_preferences_presented', 'false')) = 'true',
  case
    when lower(coalesce(u.raw_user_meta_data->>'notification_preferences_presented', 'false')) = 'true'
    then u.created_at
    else null
  end,
  encode(extensions.gen_random_bytes(24), 'hex')
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;
