# CCG Phase 2.5 + Phase 3 Rollout Guide

## Scope

This rollout adds:

- Phase 2.1 admin lockdown (RPC-based admin summary access)
- Phase 2.5 community hub views/pages
- Phase 3 email subscription foundations + unsubscribe RPC
- Edge function scaffolds (not deployed automatically)

## Run SQL files in order

Run each file once in Supabase SQL Editor:

1. `admin/supabase/phase2-community.sql` (existing baseline, if not already run)
2. `admin/supabase/phase2_1-admin-lockdown.sql`
3. `admin/supabase/phase2_5-community-views.sql`
4. `admin/supabase/phase3-email-foundations.sql`

## Deploy Edge functions

From repo root after Supabase CLI auth/link:

```bash
supabase functions deploy ccg-send-newsletter
supabase functions deploy ccg-send-new-game-alert
```

Set secrets first:

```bash
supabase secrets set SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... EMAIL_PROVIDER_API_KEY=... EMAIL_FROM=... SITE_URL=...
```

## Test pages

- `/community/index.html`
- `/community/latest-comments.html`
- `/community/top-rated.html`
- `/community/admin.html`
- `/community/unsubscribe.html?token=<unsubscribe_token>`

## Safety notes

- No changes are required to `games/game.html` or `js/load-single-game.js`.
- Admin totals are no longer read directly from `admin_summary`; frontend uses `rpc('get_admin_summary')`.
- Unsubscribe uses `rpc('unsubscribe_by_token')` and does not require login.

## Rollback guidance

If you need to rollback quickly:

1. Revoke execute on new RPCs:
   - `revoke execute on function public.get_admin_summary() from authenticated;`
   - `revoke execute on function public.unsubscribe_by_token(text) from anon, authenticated;`
2. Drop new views/functions/tables in reverse dependency order.
3. Revert frontend files in one commit to return to prior UI/API calls.
