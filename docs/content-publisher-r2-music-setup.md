# Content Publisher R2 music upload setup

Deploy `workers/game-music-upload` as a Cloudflare Worker and bind `GAME_MUSIC`
to the existing `game-music` R2 bucket. Configure a route such as
`https://www.cheekycommodoregamer.co.uk/api/admin/game-music` to this Worker.

Set Worker variables for `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and
`ALLOWED_ADMIN_ORIGIN` (the exact `https://www.cheekycommodoregamer.co.uk`
origin). Store `SUPABASE_SERVICE_ROLE_KEY` only as a Worker secret; never put
it in source, browser JavaScript or a GitHub secret exposed to the site.

The Worker validates the caller's Supabase access token with Supabase Auth and
looks up `user_roles.role` server-side. Only `editor`, `admin`, and
`superadmin` may upload. The bucket binding receives only `<slug>.mp3` objects,
with `audio/mpeg` content type and a 25 MiB maximum.

Keep the existing public R2.dev playback endpoint enabled for read-only
`<slug>.mp3` delivery, including Range requests. Configure the Worker CORS
origin to the admin site only. No Cloudflare, R2, GitHub, or Supabase secret is
committed in this repository.
