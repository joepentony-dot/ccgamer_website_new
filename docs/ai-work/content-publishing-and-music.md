# Content publishing and game music

## Scope

Content Publisher administration, asset optimisation, music upload, R2/Worker routing, publishing guardrails, and supporting docs/tests. Key paths include `admin/`, `workers/game-music-upload/`, `tests/`, and `docs/content-publisher-r2-music-setup.md`.

## Verified checkpoint — 2026-09-16

Live repository checkpoint:

- `main`: `5112035f0d1f3c80fdb4fa2c6c83ff0228778600`
- #2103 **MERGED** — switched the dedicated game-music Worker to its `workers.dev` deployment path while retaining `GAME_MUSIC -> game-music` and `keep_vars = true`.
- #2105 **MERGED** — current-main 3D-box WebP optimiser repair.
- #2073 **CLOSED / SUPERSEDED** — do not revive or merge it after #2105.
- #2109 **MERGED** — authoritative current generated game/archive publication output.
- #2110 **OPEN DRAFT / BLOCKED** — endpoint follow-up on `codex/game-music-production-endpoint`, head `969a632a6a2598b8119d9b16b1019c2e932c832c`.

## Worker deployment and current production blocker

Verified production Worker URL:

`https://ccgamer-website-new.joepentony.workers.dev`

The Worker source/configuration is designed to:

- accept `POST` and `OPTIONS`
- require `GAME_MUSIC`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`
- validate the browser bearer token with Supabase Auth
- read the caller's authoritative `user_roles.role` server-side
- allow only `editor`, `admin`, and `superadmin`
- accept only `.mp3` / `audio/mpeg`, maximum 25 MiB
- write exactly `<slug>.mp3` to the `GAME_MUSIC` binding
- restrict CORS to the exact configured `ALLOWED_ADMIN_ORIGIN`

Expected account-side configuration:

- `GAME_MUSIC` -> `game-music`
- `SUPABASE_URL` = the site's existing Supabase project URL
- `SUPABASE_PUBLISHABLE_KEY` = the site's public Supabase publishable/anon key
- `ALLOWED_ADMIN_ORIGIN=https://www.cheekycommodoregamer.co.uk`
- `SUPABASE_SERVICE_ROLE_KEY` stored only as a Cloudflare Worker secret

Production probes on 2026-09-16 show the deployment is **not ready for publisher traffic**:

- `OPTIONS` from `https://www.cheekycommodoregamer.co.uk` returned HTTP 204 but no `Access-Control-Allow-Origin`
- unauthenticated `POST` returned HTTP 503 `server_not_configured` instead of the expected authentication rejection
- public HEAD for `legacy-of-the-ancients.mp3` returned HTTP 404

Therefore at least one required runtime binding/variable/secret is missing, and `ALLOWED_ADMIN_ORIGIN` is missing or mismatched. #2110 must remain draft/unmerged until the account configuration is corrected and the Worker returns the expected CORS header plus an unauthenticated 401-style rejection rather than `server_not_configured`.

Never expose the service-role secret while verifying it.

## #2110 exact repository scope

Current net diff is exactly three files:

- `admin/js/content-publisher.js`
- `admin/js/content-publisher-existing-game-update.js`
- `tests/content-publisher.test.mjs`

Both new-game and existing-game MP3 upload paths are changed from `/api/admin/game-music` to the verified production Worker URL, and regression assertions require both paths to use that URL. The temporary branch-only patch workflow previously used during repair has been removed.

Focused syntax and publisher/Worker tests passed before the final temporary-workflow cleanup; the production environment blocker, not repository logic, is what prevents merge.

## Cloudflare connected-build isolation

The Cloudflare Git integration has been building unrelated repository branches. The intended account-side isolation remains:

1. production branch: `main`
2. disable builds for non-production branches
3. root directory: `workers/game-music-upload`
4. build watch include paths: `workers/game-music-upload/*`
5. no broad repository-wide deployment fallback unless Cloudflare Workers Builds cannot express the supported filter

Do not move website DNS to Cloudflare merely for this Worker. No authenticated Cloudflare account connector is available in this repository session, so account-side build filtering and runtime variable/secret correction cannot be completed from GitHub. Do not request Cloudflare secrets or API tokens in chat.

## Legacy of the Ancients upload boundary

Required R2 object name:

`legacy-of-the-ancients.mp3`

Expected public playback URL:

`https://pub-2f6ac7261f6347f59524930d84e71a92.r2.dev/legacy-of-the-ancients.mp3`

No actual `legacy-of-the-ancients.mp3` source file is present in the repository/project material available to this workstream. Do not fabricate an upload with unrelated audio.

Final sequence after Cloudflare runtime configuration is healthy and the real MP3 is available:

1. verify the R2 binding and required non-secret variables
2. verify the service-role secret exists without exposing its value
3. confirm exact-origin CORS from the site
4. confirm unauthenticated POST fails as authentication failure rather than server configuration failure
5. requalify #2110 on its exact head/current mainline
6. merge #2110 when green and unblocked
7. upload the real file as slug `legacy-of-the-ancients`
8. verify `201` and key `legacy-of-the-ancients.mp3`
9. verify R2 object metadata/public playback
10. verify the live game page no longer reports `TRACK NOT YET UPLOADED`

## Guardrails and next action

Do not alter Dungeon Carnage runtime, Commodore Quest, protected intro-loader files, unrelated deployment systems, or generated game data as part of this workstream.

**Current state: BLOCKED.** The exact blocker is Cloudflare account-side runtime/build configuration. The next executable action requires authenticated Cloudflare access; repository changes alone cannot resolve it.

## Session log

- 2026-09-16: #2103 merged and its production Worker deployment succeeded.
- 2026-09-16: #2105 merged; superseded #2073 is now closed without merge.
- 2026-09-16: Verified the production Worker hostname and opened #2110 for both new-game and existing-game upload endpoints.
- 2026-09-16: Production probes found missing/mismatched CORS/runtime configuration; #2110 remains blocked and draft.
- 2026-09-16: Removed an accidentally retained temporary patch workflow from #2110; current net delta is three publisher/test files only.
