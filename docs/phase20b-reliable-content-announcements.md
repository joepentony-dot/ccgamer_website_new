# Phase 20B — Reliable Content Announcements

## Purpose

The administrator announcement page can select live content directly from the site's existing data sources:

- `/games/games.json`
- `/data/retro-specials.json`
- `/data/retro-events.json`
- `/data/amiga-demo-music.json`

This includes the Zzap!64 year videos already stored as Retro Specials. No duplicate announcement catalogue is required.

## Member consent

Two separate profile choices are used:

- `notify_new_games` — new game announcements
- `notify_newsletter` — new CCG videos, Zzap!64 features, Retro Specials, Retro Events and Amiga demo videos

Both choices are available in Member Hub account settings. Video notifications remain off until the member enables them.

## Delivery safeguards

The Edge Function:

- validates the administrator's active session
- allows member broadcasts only for `admin` and `superadmin`
- allows an `editor` to send a test only
- accepts only known content types
- accepts only CCG website destination URLs
- accepts CCG or YouTube-hosted thumbnails
- excludes banned members
- respects the relevant member preference
- sends through Resend
- records attempted, sent and failed totals without storing recipient email addresses
- blocks the same content and recipient scope from being sent again within ten minutes
- provides Member Hub preferences and unsubscribe links in the email

## Live deployment

Repository deployment does not publish Supabase database migrations or Edge Functions automatically.

### 1. Apply the migration

Run this file in the Supabase SQL Editor:

```text
supabase/migrations/20260806150000_reliable_content_announcements.sql
```

Expected result:

```text
Success. No rows returned
```

### 2. Confirm Edge Function secrets

The following Supabase Edge Function secrets are required:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY`
- `EMAIL_FROM`
- `SITE_URL` set to `https://www.cheekycommodoregamer.co.uk`

Optional:

- `EMAIL_REPLY_TO`

Do not place these values in the repository.

### 3. Deploy the existing backwards-compatible endpoint

```bash
supabase functions deploy send-new-game-notification --no-verify-jwt
```

The historical function name is retained so the existing administrator route does not break.

### 4. Test before notifying members

1. Open `/admin/announce.html`.
2. Search for a Zzap!64 video.
3. Select **Send test email to my administrator address only**.
4. Send the test.
5. Confirm the subject, thumbnail and website destination.
6. Wait ten minutes before testing the same item and scope again, or choose another item.

## Logging

`public.content_announcements` stores only summary information:

- administrator ID
- content type, title, slug and URL
- recipient scope
- preference used
- attempted, sent and failed totals
- status and first delivery error
- timestamps

Recipient email addresses are not stored in this table.

## Repository verification

The committed Member Hub preference output is regenerated and compared during CI. The announcement selector, database contract and Edge Function also have dedicated regression checks. The Edge Function is type-checked with Deno before merge.
