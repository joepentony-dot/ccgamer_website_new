# CCG Phase 2 — Community Features

## What Codex added
- `/admin/supabase/phase2-community.sql` (run once in Supabase SQL editor)
- Public profile page: `/community/public-profile.html?id=<uuid>`
- Activity page: `/community/activity.html`
- Admin stats page: `/community/admin.html`
- Community API helpers: `/resources/js/community/community-api.js`
- Widget modules (drop-in later):
  - `/resources/js/community/game-ratings-widget.js`
  - `/resources/js/community/game-comments-widget.js` (NOTE: must contain NO inline CSS)

## Run SQL (manual, one-time)
1. Supabase Dashboard → SQL Editor
2. Paste the contents of `phase2-community.sql`
3. Run

## Quick tests
- Visit `/community/activity.html` and confirm it loads (may show “No activity yet”).
- Visit `/community/admin.html` while logged in (should show totals).
- For public profile: open `/community/public-profile.html?id=<your-profile-uuid>`

## Hooking widgets into game pages (later)
When you are ready, paste your actual game page HTML file(s) here and we will mount:
- Ratings widget into an existing container element
- Comments widget into an existing container element
Without redesigning the page.

END.
