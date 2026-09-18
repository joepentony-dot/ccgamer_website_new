# Content publishing and game music

## Scope

Content Publisher administration, asset optimisation, music upload, R2/Worker routing, publishing guardrails, and supporting docs/tests. Key paths include `admin/`, `workers/game-music-upload/`, `tests/`, and `docs/content-publisher-r2-music-setup.md`.

## Verified checkpoint — 2026-09-18

Repository state for this workstream has been reconciled through the Content Publisher magazine/no-music repair on current `main`. Always refresh live GitHub before acting.

- #2103 **MERGED** — switched the dedicated game-music Worker to its `workers.dev` deployment path while retaining `GAME_MUSIC -> game-music` and `keep_vars = true`.
- #2105 **MERGED** — current-main 3D-box WebP optimiser repair.
- #2073 **CLOSED / SUPERSEDED** — do not revive or merge it after #2105.
- #2109 **MERGED** — authoritative game/archive publication output for that scope.
- #2110 **CLOSED / SUPERSEDED** — the old game-music endpoint follow-up is intentionally unmerged after the unified Content Publisher removed game-music upload.
- #2150 **MERGED** as `5223f5053bceee18e70e70440992f31ff2510c7d` — resilient magazine-source recovery, Road Rash review materialisation, and removal of game-music upload from the unified Content Publisher.
- #2157 **MERGED** as `bde682be7311c5206b390a4bcfbd52891bc83fbc` — authoritative generated game/archive output after #2150; Road Rash materialises 21 magazine-review records with source links.
- #2159 **MERGED** as `13311f9e8b7a0a9376bbd5ca84451eb37d908a40` — fixes the successful Lemon refresh counter path and adds regression coverage.

## Dormant game-music Worker status

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

Therefore at least one required runtime binding/variable/secret was missing and `ALLOWED_ADMIN_ORIGIN` was missing or mismatched at that checkpoint. This no longer blocks the unified Content Publisher because #2150 removed the game-music upload surface. #2110 is closed unmerged; any future audio-uploader project must be treated as a separate, newly authorised workstream rather than reviving that PR.

Never expose the service-role secret while verifying it.

## Historical #2110 repository scope

At the audit checkpoint its net diff is exactly three files:

- `admin/js/content-publisher.js`
- `admin/js/content-publisher-existing-game-update.js`
- `tests/content-publisher.test.mjs`

Both new-game and existing-game MP3 upload paths are changed from `/api/admin/game-music` to the verified production Worker URL, and regression assertions require both paths to use that URL. The temporary branch-only patch workflow previously used during repair has been removed.

Focused syntax and publisher/Worker tests passed before the final temporary-workflow cleanup; the production environment blocker, not repository logic, was what prevented merge at that time. #2110 is now closed unmerged.

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

That sequence is no longer an active Content Publisher action. If game-audio upload is revisited later, start from current `main`, re-verify the Worker/R2/account configuration, and design it as a separate feature without restoring a broken control to the unified game-publishing form.

## Guardrails and next action

Do not alter Dungeon Carnage runtime, Commodore Quest, protected intro-loader files, unrelated deployment systems, or generated game data as part of this workstream.

**Current state: COMPLETE for the requested Content Publisher scope.** New-game publishing no longer depends on the game-music Worker. Magazine enrichment is best-effort and retryable, while canonical game publication continues when Lemon64/Lemon Amiga is temporarily unreachable.

## Session log

- 2026-09-16: #2103 merged and its production Worker deployment succeeded.
- 2026-09-16: #2105 merged; superseded #2073 is now closed without merge.
- 2026-09-16: Verified the production Worker hostname and opened #2110 for both new-game and existing-game upload endpoints.
- 2026-09-16: Production probes found missing/mismatched CORS/runtime configuration; #2110 remains blocked and draft.
- 2026-09-16: Removed an accidentally retained temporary patch workflow from #2110; current net delta is three publisher/test files only at the audit checkpoint.
- 2026-09-16: Post-#2104 reconciliation stabilized the checkpoint wording; no Content Publisher implementation was changed.

## Completed Content Publisher repair — 2026-09-18

PR #2150 (`codex/content-publisher-magazine-reliability-no-music-current-main`) was qualified and merged as `5223f5053bceee18e70e70440992f31ff2510c7d`. The generated publishing chain then merged #2157 as `bde682be7311c5206b390a4bcfbd52891bc83fbc`. A post-merge review found a success-path counter shadowing bug in `refresh-lemon-game-cache.js`; #2159 fixed it and merged as `13311f9e8b7a0a9376bbd5ca84451eb37d908a40` after the full triggered PR matrix passed, with one unrelated Site Safety WebDriver timeout passing on unchanged retry.

Road Rash exposed two separate admin defects:

- magazine enrichment still depended on GitHub Actions being able to fetch Lemon Amiga directly; the live Road Rash source returned HTTP 403 to Actions, so no local cache/review records were created and the later "Require new-game enrichment completion" guard contradicted the documented best-effort/non-blocking source policy;
- the game form still exposed an MP3 upload control even though the production upload path remains unverified and blocked by Cloudflare account-side configuration.

PR #2150 therefore:

- removes the game-music control and all associated new-game/existing-game/completion-state upload code from the unified Content Publisher while leaving the dormant Worker infrastructure untouched;
- keeps 3D-box upload behaviour unchanged;
- adds a shared Lemon fetch helper that tries the live source first and then an Internet Archive Wayback snapshot;
- keeps exact title/platform/original-year/original-publisher validation before any automatic source is trusted;
- removes the hard workflow gate that let an external source outage fail the entire new-game publication;
- preserves unresolved sources as retryable enrichment rather than a canonical publishing blocker;
- adds a verified 21-row Road Rash magazine-review supplement and records the exact Lemon Amiga provenance URL;
- repairs the Road Rash SEO description and the truncated `ccg_rating_reason`;
- adds focused regressions for the archived-source fallback, non-blocking publishing contract, Road Rash review set, and absence of the game-music control.

Current verified result: the admin game form has no game-music upload control; Road Rash is generated with 21 magazine-review records and review links; external Lemon availability no longer blocks canonical publishing; successful live/Wayback refreshes increment their result counter correctly. #2110 is closed unmerged and must not be revived merely to restore the removed uploader.

- 2026-09-18: #2150 merged after exact-head qualification; #2157 materialised Road Rash and its 21 magazine review records; #2110 closed unmerged as superseded.
- 2026-09-18: #2159 merged after all triggered checks passed; its first Site Safety attempt hit an unrelated WebDriver timeout and the unchanged rerun passed.
