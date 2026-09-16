# Content publishing and game music

## Scope

Content Publisher administration, asset optimisation, music upload, R2/Worker routing, publishing guardrails, and the supporting docs/tests. Key paths include `admin/`, `workers/game-music-upload/`, `tests/`, and `docs/content-publisher-r2-music-setup.md`.

## Verified checkpoint — 2026-09-16

Current repository checkpoint after the dedicated Cloudflare game-music workstream:

- `main`: `d301d0794c4e9a5e25f787cbfebce649cbe0a88d`
- merged Worker-route PR: #2103, branch `codex/game-music-workers-dev-route`
- qualified #2103 head: `5087d90bf8e3ded15d66dda2fc3dca0db7bfc9be`
- #2103 merge commit on `main`: `d301d0794c4e9a5e25f787cbfebce649cbe0a88d`
- current independent 3D-box optimiser PR: #2105, draft head `2325d2ce1de24017bd8ae6cc5c44e771d218267e`; do not mix it into the game-music workstream
- #2073 remains a superseded duplicate of #2105 and must not be revived over it

#2103 was rechecked against live GitHub before merge. Its only changed files were `workers/game-music-upload/wrangler.toml`, `tests/cloudflare-audio-admin.test.mjs`, and `docs/content-publisher-r2-music-setup.md`; there was no changed-path overlap with #2104 or #2105. Its exact-head Content Publisher Validation, Site Safety, Native Mouse Wheel, Public Code Cache, SEO and Cloudflare Worker checks were green before merge. It was merged with an expected-head SHA guard so a moving branch could not be merged accidentally.

The production Worker build from merged `main` then completed successfully:

- Cloudflare Worker/script: `ccgamer-website-new`
- production source commit: `d301d0794c4e9a5e25f787cbfebce649cbe0a88d`
- Cloudflare build ID: `9f924cc4-1d39-48cc-8537-1c4c724bd2b7`
- deployed Worker version ID: `2d6f5bde-994d-4990-b987-8167ad0ff6f3`
- result: SUCCESS

The production Wrangler configuration on `main` is now the intended no-DNS-move configuration:

- `name = "ccgamer-website-new"`
- `workers_dev = true`
- `keep_vars = true`
- R2 binding `GAME_MUSIC` -> bucket `game-music`
- no `zone_name` route for `www.cheekycommodoregamer.co.uk`

The website DNS was not moved to Cloudflare and must not be moved merely for this Worker.

## Cloudflare connected-build isolation

The current Cloudflare Git integration is still too broad. Cloudflare built unrelated branches, including the documentation-only #2104 branch and Dungeon/other repository work. This is expected when non-production branch builds are enabled and the default build watch path is the whole repository.

Current Cloudflare Workers documentation supports the preferred fix without replacing Workers Builds:

1. production branch: `main`
2. disable **Builds for non-production branches**
3. root directory: `workers/game-music-upload`
4. Build watch include paths: `workers/game-music-upload/*`
5. Build watch exclude paths: none required when the include rule is narrow
6. deploy command can remain the supported default `npx wrangler deploy`

Do not try to solve connected-build filtering with Wrangler `build.watch_dir`; that setting is for local Wrangler development/watch behaviour rather than the Cloudflare Git build trigger. Do not add a repository-wide GitHub Actions deployment unless Cloudflare Workers Builds cannot be configured with the supported branch/path controls above.

The account-side build trigger has not yet been changed because no authenticated Cloudflare account connector is available in this session. Do not ask the user to paste an API token or other Cloudflare secret into chat. The next Cloudflare-account action is to apply the four isolation settings above and verify an unrelated branch no longer receives a Worker build.

## Worker deployment and authentication boundary

The deployed source contract is verified. The Worker:

- accepts `POST` and `OPTIONS`
- requires `GAME_MUSIC`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
- validates the browser bearer token with Supabase Auth
- reads the caller's authoritative `user_roles.role` server-side
- allows only `editor`, `admin`, and `superadmin`
- accepts only `.mp3` / `audio/mpeg`, maximum 25 MiB
- writes exactly `<slug>.mp3` to the `GAME_MUSIC` bucket binding
- restricts CORS to the exact configured `ALLOWED_ADMIN_ORIGIN`

Expected account-side configuration:

- `GAME_MUSIC` -> `game-music`
- `SUPABASE_URL` = the site's existing Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` = the site's public Supabase publishable/anon key
- `ALLOWED_ADMIN_ORIGIN=https://www.cheekycommodoregamer.co.uk`
- `SUPABASE_SERVICE_ROLE_KEY` stored only as a Cloudflare Worker secret

A successful deployment proves the Worker source/config deployed, but does not by itself prove that the three text variables and the service-role secret are currently present in the Cloudflare account. Their presence still needs an authenticated Cloudflare settings/runtime check. Never expose the service-role value while verifying it.

The exact production `workers.dev` hostname is still unresolved. GitHub's Cloudflare check exposes the Worker name, build ID and version ID, but not the account `workers.dev` subdomain. The repository intentionally does not guess that account subdomain. The Content Publisher therefore still uses `/api/admin/game-music` and must not be changed to a fabricated hostname. Once the authenticated Cloudflare account reports the exact production URL, change only the Content Publisher upload endpoint to that exact URL and re-run the publisher/Worker contracts.

## Legacy of the Ancients upload boundary

The required R2 object name is:

`legacy-of-the-ancients.mp3`

The public playback URL expected by the live music code is:

`https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/legacy-of-the-ancients.mp3`

The site music configuration and game music player both build public playback URLs as `<public-r2-base>/<slug>.mp3`. The generated Legacy of the Ancients page loads those shared scripts and its music UI is driven by whether the MP3 can be loaded; it does not contain an independent hard-coded uploaded flag.

No `legacy-of-the-ancients.mp3` source file is present in the repository or in the Project/Library files available to this session, so no authenticated upload was fabricated with unrelated audio. The live page was reported as `TRACK NOT YET UPLOADED`; the safe completion path is to upload the actual Legacy MP3 only after the exact Worker URL and Cloudflare runtime configuration are verified.

Required final end-to-end sequence once authenticated Cloudflare access and the actual MP3 are available:

1. read the exact production `workers.dev` URL for `ccgamer-website-new`
2. verify `GAME_MUSIC -> game-music`
3. verify the three required text variables are present and `ALLOWED_ADMIN_ORIGIN` is exactly the site origin
4. verify `SUPABASE_SERVICE_ROLE_KEY` exists as a secret without reading/exposing its value
5. probe `OPTIONS` from the site origin and confirm CORS permits only that origin
6. probe unauthenticated `POST` and confirm it is rejected
7. update `admin/js/content-publisher.js` from `/api/admin/game-music` to the exact production Worker upload endpoint
8. re-run Content Publisher Validation, Worker contract, Site Safety, Public Code Cache and relevant syntax/tests at the exact head
9. use the authenticated Content Publisher session to upload the actual file as slug `legacy-of-the-ancients`
10. verify the Worker returns `201` with key `legacy-of-the-ancients.mp3`
11. verify the object exists in `game-music` and has `audio/mpeg` metadata
12. verify the public R2 URL returns the MP3 and supports playback/range loading
13. load `https://www.cheekycommodoregamer.co.uk/games/legacy-of-the-ancients/` and confirm the music UI no longer reports `TRACK NOT YET UPLOADED`

## Guardrails and next action

Do not alter Dungeon Carnage, Commodore Quest, protected intro-loader files, unrelated deployment systems, or unrelated active PRs as part of this workstream. Keep #2105 separate. Do not move website DNS to Cloudflare, do not expose secrets, and do not guess a `workers.dev` hostname.

Next safe action: apply the Cloudflare account-side branch/path isolation settings, retrieve the exact Worker URL and verify runtime bindings/variable/secret presence. Then update the Content Publisher endpoint on a narrowly scoped current-main branch and complete the authenticated Legacy MP3 upload/verification with the real audio file.

## Session log

- 2026-09-16: Reconciled the Cloudflare game-music work against live GitHub, #2103, #2104 and #2105. Confirmed no changed-path overlap between #2103 and the active documentation/3D-box work.
- 2026-09-16: Merged qualified #2103 head `5087d90bf8e3ded15d66dda2fc3dca0db7bfc9be` with an expected-head guard. `main` advanced to merge commit `d301d0794c4e9a5e25f787cbfebce649cbe0a88d`.
- 2026-09-16: Verified the post-merge production Cloudflare build succeeded as build `9f924cc4-1d39-48cc-8537-1c4c724bd2b7`, Worker version `2d6f5bde-994d-4990-b987-8167ad0ff6f3`.
- 2026-09-16: Confirmed unwanted Worker builds are occurring on unrelated non-production branches, including #2104, and reconciled the supported Cloudflare fix: `main` production only, non-production builds off, root `workers/game-music-upload`, include `workers/game-music-upload/*`.
- 2026-09-16: Verified the repository Worker contract, R2 object naming, public playback URL construction, and live page music-script path. Exact `workers.dev` hostname, account variables/secret presence, authenticated upload and R2 object existence remain unverified because authenticated Cloudflare access and the actual Legacy MP3 are not available to this session. No placeholder hostname, fake audio upload, DNS change, or unrelated runtime change was made.
- 2026-09-16: Earlier re-audit qualified #2105 exact head `2325d2ce1de24017bd8ae6cc5c44e771d218267e` across Content Publisher Validation, Site Safety, Native Mouse Wheel, Public Code Cache, Image Performance Budget and SEO. #2105 remains a separate draft; #2073 remains superseded.
