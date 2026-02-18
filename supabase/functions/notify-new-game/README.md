# notify-new-game (Supabase Edge Function)

## Required secrets

Set these before deploy:

```bash
supabase secrets set \
  SUPABASE_URL="https://<project-ref>.supabase.co" \
  SUPABASE_ANON_KEY="<anon-key>" \
  SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
  RESEND_API_KEY="<resend-api-key>" \
  EMAIL_FROM="Cheeky Commodore Gamer <noreply@your-domain>" \
  NEW_GAME_NOTIFY_ADMIN_ALLOWLIST="admin1@example.com,admin2@example.com"
```

## Deploy

```bash
supabase functions deploy notify-new-game
```

> The function requires a valid JWT and enforces admin-only access via role (`admin`) or `NEW_GAME_NOTIFY_ADMIN_ALLOWLIST`.

## Local test

Run the function locally:

```bash
supabase functions serve notify-new-game --env-file supabase/.env.local
```

### Single-user test flow

1. In SQL editor, enable one recipient:

```sql
update profiles
set notify_new_games = true
where email = 'your-test-user@example.com';
```

2. Disable others temporarily:

```sql
update profiles
set notify_new_games = false
where email <> 'your-test-user@example.com';
```

3. Call the function with an **admin** JWT:

```bash
curl -i \
  -X POST "https://<project-ref>.supabase.co/functions/v1/notify-new-game" \
  -H "Authorization: Bearer <admin-user-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Game","slug":"test-game","system":"C64"}'
```

Expected response:

```json
{
  "success": true,
  "sent": 1,
  "failed": 0
}
```

4. Confirm audit row:

```sql
select *
from notification_audit
where event_type = 'new_game_notification'
order by created_at desc
limit 5;
```
