# Omega Option A Rollout (Supabase + Resend)

## Implemented scope
- Private profile page at `/community/profile.html` with email-private view, avatar, join date, newsletter + new-game toggles, reset-password link, and logout.
- Email uniqueness UX: registration now maps duplicate-email auth errors to an “Already registered” reset-password path.
- Password reset flow remains reset-link based (`/auth/forgot.html` -> `/auth/reset.html`).
- Community bloat switch added via `window.CCG_COMMUNITY_FLAGS`:
  - `COMMUNITY_COMMENTS_ENABLED = false`
  - `COMMUNITY_RATINGS_ENABLED = false`
- Supabase migration adds newsletter/notification fields, unsubscribe token, owner-only profile select policy, and profile bootstrap trigger.
- Edge functions added:
  - `send-newsletter`
  - `send-new-game-notification`
  - `unsubscribe-by-token`
- Admin Games Editor export includes an optional “Notify members (Coming Soon)” checkbox that triggers the notification function after package export.

## Supabase secrets
Set in project secrets:
- `RESEND_API_KEY`
- `EMAIL_FROM` (verified sender, e.g. `Cheeky Commodore Gamer <noreply@yourdomain>` )
- `SUPABASE_ANON_KEY` (for in-function requester verification when JWT verify is disabled)
- `NEW_GAME_NOTIFY_HOMEPAGE_URL` (optional)
- `NEW_GAME_NOTIFY_QUIZ_URL` (optional)
- `NEW_GAME_NOTIFY_YOUTUBE_URL` (optional)
- `NEW_GAME_NOTIFY_DISCORD_URL` (optional)
- Existing required service secrets:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Deploy functions
```bash
supabase functions deploy send-newsletter
supabase functions deploy send-new-game-notification --no-verify-jwt
supabase functions deploy unsubscribe-by-token
```

## Schedule newsletter
Run monthly at 09:00 UK. In Supabase SQL editor, create pg_cron (or scheduled trigger in dashboard) calling:
```sql
select
  net.http_post(
    url := 'https://<project-ref>.functions.supabase.co/send-newsletter',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
```
Recommended cron expression: `0 9 1 * *`.

## Verification checklist
1. Register new account -> confirmation email received -> confirm -> login.
2. Attempt second registration with same email -> “Already registered” shown.
3. Forgot password flow sends reset link and password update succeeds.
4. Profile page loads only for authenticated, email-confirmed user.
5. Toggle newsletter/new-game prefs -> persisted in `profiles`.
6. Export a new game from `/admin/games-editor.html` with **Notify members (Coming Soon)** checked.
7. Verify one plain-text Option A “Coming Soon” email is sent per opted-in member.
8. Verify unchecked exports do not send anything.
9. Verify function logs include summary counts (`sent`, `failed`, `recipients`).
10. Verify unsubscribe token link disables both `newsletter_opt_in` and `notify_new_games_opt_in`.
