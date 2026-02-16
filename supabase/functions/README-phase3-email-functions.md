# Phase 3 Email Edge Functions (Scaffold)

This repository includes scaffold-only Edge Functions:

- `supabase/functions/ccg-send-newsletter/index.ts`
- `supabase/functions/ccg-send-new-game-alert/index.ts`

These files are intentionally **not deployed by this change**.

## Required environment variables

Set these secrets in Supabase before deploy:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `EMAIL_PROVIDER_API_KEY` (provider key placeholder)
- `EMAIL_FROM`
- `SITE_URL`

## Deploy commands

```bash
supabase functions deploy ccg-send-newsletter
supabase functions deploy ccg-send-new-game-alert
```

## Invoke examples

```bash
supabase functions invoke ccg-send-newsletter
```

```bash
supabase functions invoke ccg-send-new-game-alert --body '{"game_slug":"wizball","game_title":"Wizball","platform":"c64"}'
```

## Notes

- Both functions query recipients via `public.get_subscribed_recipients()`.
- The provider send logic is marked `TODO`; wire to Resend/SendGrid before production use.
