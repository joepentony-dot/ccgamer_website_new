## 7 November 2026 — existing #3034 held on demonstrated publisher filter defect

Final browser gate on `ee24bb29c6a3353673a5aa74d54129066fb18bc7` found31 rendered Firebird cards but a zero runtime count/search result. Verified the same existing generator/runtime marker mismatch in served production HTML. Correct the owner to include the runtime's existing `data-publisher-game` and `data-system` attributes, preserving existing markup/metadata/source order and all cards. Added real generated-catalogue/runtime regression: old generator fails `0 !== 31`, corrected producer passes. Regenerate via the full owner; repeat final exact-head CI, independent review, staging/browser/performance and guarded release. Previous-head successes remain historical. Detailed defect evidence is in the Games Archive record. No second implementation branch or weaker check.

## 7 November 2026 — chapter source repair released; generated output qualification active

- #3035 guarded-merged as `47cbfd4ee649f9cf96056ebbe475a56cad0d32ba` after 17 native workflow groups, 86 tests, staged/browser/performance gates and clean independent review; Pages `42415063658` / live navigation `42415253857`, all 99 served artifact hashes and 34 live desktop/mobile watch cases passed (receipt `6713217864`, zero production Supabase requests). Full commands/variance/fixture diagnostics are in the SEO record.
- Existing #3034 normally reconciled at `a326e7cc15b3239105db7045b324c9044a8b6d0f`; two offline 69-stage full rebuilds passed identically. Preserved newer native metadata's author correction rather than silently replacing it with older output. All original IDs/verified dates/access/source ordering and source-owned quiz/guide chapters remain intact. New native #3036/#3037 are preserved drafts with complete-patch audit addendum; #3037 parent failed closed on draft after successful generation, no unchanged retry. Final #3034 exact-head qualification/review/guarded release/production proof remain pending; no schedules or competing automation changed.

## 6 November 2026 — complete generated backlog audit / published chapter preservation

- Audited all 43 open generated SEO/game/publisher PRs against main `c3cad3bfff8c1ed8f8786eac947d1ed126e29a6f`, plus separately preserved #2816 source research. Full binary-patch identities, stale bases, conflicts, already-main payloads and native check states are recorded in `generated-backlog-audit-20261106.md`. Matching titles are not duplicates: only #2929/#2928 and #2895/#2893/#2890 match as complete patches. No PR closed or branch discarded.
- Existing newest generated #3034 (`cb0614b5a4f3c0d8d2d135709bdc948ea859b299`, 279 files, zero behind) and prior #3033 are drafts pending semantic qualification. They retain every staged artifact. Bot PR events are action-required/unexecuted; eight separate explicit validation successes do not make those event runs executed. Independent exact-head review and every applicable release safeguard remain necessary. No automatic main push or unchanged parent retry is authorised by this checkpoint.
- Source/publishing blocker reproduced: Pages omitted library discovery after rebuilding watch pages (live ZX guide zero versus seven in main), and the companion publisher flattened the source-owned C64-v-Amiga grouped challenge in #3034. One source correction reuses the existing guide builder, pins the existing three quiz chapter sets in their authoritative source, and runs the existing library generator/validator during Pages staging. All original URLs/video IDs/access flags/order and the deferred challenge player remain intact. No manually edited generated output, weaker validator, new runtime dependency or schedule. Full details and qualification in the SEO workstream; source repair must release before existing generated output is reconciled and qualified.

## 1 November 2026 — generated branch confirmation consistency fix (BRANCH ONLY)

- Confirmed post-merge SEO Automation run **41281701712** failed in `Commit generated SEO artifacts` after a successful non-force push updated the existing #2981 generated branch from `20753f271` to `af69ad2c2`. Immediate GitHub PR REST read lagged behind the Git ref and falsely reported that the head was not confirmed. Subsequent independent REST/ref reads both showed `af69ad2c2`; no duplicate PR was opened and no sitemap was merged.
- One bounded source follow-up `fix/generated-dedup-remote-confirmation-20261101` verifies the actual remote Git branch via `git ls-remote` after push, with five bounded checks and fail-closed mismatches; it does not trust eventually consistent PR metadata. Adds real local bare-remote fast-forward regression and negative ref/sha cases to the existing suite. Preserve current #2981 draft, all owner approval/CI gates, main protection, public site and catalogue. **BRANCH ONLY; new-head CI/merge/deployment pending.**

## 1 November 2026 — stale identical generated-output PR reuse (BRANCH ONLY)

- Source-level recurrence confirmed: closed #2979 and current #2981 contained byte-identical sitemap output, but the prior deduplication guard deliberately ignored #2979 once main advanced. A fresh generated PR was created instead of safely refreshing the existing draft. No native approval, release or public sitemap claim is inferred from this.
- Single ACTIVE bounded candidate `fix/generated-publishing-stale-pr-fast-forward-20261101`: when a same-repository open generated DRAFT PR has an exact complete binary patch match but stale main ancestry, build a two-parent commit with the staged current-main tree, verify exact patch parity and both ancestors, then update only that same generated PR branch by an ordinary non-force fast-forward. Recheck PR identity, head and main before push; abort on races, non-draft PRs, mismatches or denied writes. Preserve existing generated merge/review/CI gates, all public assets, game catalogue, Omega and Dungeon. Add real temporary-Git fixture to existing generated-publishing guard suite and ensure publishing-integrity CI triggers for this script. No automatic main merge, branch deletion or release qualification bypass.
- **BRANCH ONLY / NOT TESTED BY REMOTE CI / NOT MERGED / NOT DEPLOYED.** Require focused Node regression, exact-head publishing integrity, SEO, Site Safety and applicable full matrix, fresh main, guarded merge and Pages/live verification. Generated #2981 stays parked on native Actions approval; no attempt to bypass it.

## 31 October 2026 — exact-patch generated publishing PR deduplication (BRANCH ONLY)

- Generated output #2967 is blocked solely on the repository's independent Codex receipt after eight completed exact-head validation workflows. Its existing review request is pending; do not create a replacement PR merely to repeat the same generated patch.
- On the sole active ordinary-site source branch `fix/generated-publishing-identical-pr-dedup-20261031`, add `scripts/deduplicate-generated-publishing.mjs`, integrate it after staging in `.github/workflows/games-publishing.yml`, and extend `tests/generated-publishing-guard.test.mjs`. Match only exact complete staged binary diffs against same-repository open generated PRs whose branch contains current main; any differing sitemap/SEO bytes or stale branch requires a fresh candidate. The existing eight-workflow + genuine external Codex receipt + atomic merge gate remains unchanged. GitHub CI, browser/production qualification and guarded merge remain pending; no generated PR or main change has been made by this branch.
- This reduces unnecessary generated PR churn when publication remains blocked without suppressing genuine changed output. Do not claim a release or remove old PRs solely from matching titles.

## 20 October 2026 — Generated-output publisher merge guard (PR #2864, staged)
- The user confirmed both live Home and Games Archive layout improvements work. PR #2862 passed 20/20 workflows and merged as `4d447d6214de151dee24c6683ab8d4c43289c476`; later generated-output PR #2863 merged as `c9fadfc6fb5aad2f161afbdfc5b63f3679e2df1e`.
- PR #2863 auto-merged before independent pull-request qualification. Ten failed PR-event checks had **zero jobs** rather than executed tests. Parent Reliable Games Publishing run `39345293586`, final Omega Pages deployment, Cloudflare build and live navigation passed; this does NOT qualify the unexecuted PR checks.
- Branch `codex/guarded-generated-archive-publishing-20261020` / PR #2864 introduces `scripts/qualify-generated-publishing.mjs` plus Node regression, replacing immediate `gh pr merge` with independently dispatched read-only validation, zero-job detection, exact-head no-findings Codex review, immutable pinned-main SHA, ancestry, and a non-force fast-forward merge commit with the qualified head as second parent (atomic protection against a changed base). Generated-branch cleanup requires an explicit SHA lease. Failure leaves the generated PR open and does not dispatch deployment. `seo.yml` and Phase4D are deliberately excluded from validation-only dispatch because their manual workflows can write content.
- First Codex P1 found that comparing mutable PR base against mutable main could permit merging behind the originally qualified base. The next candidate pins initial main and verifies both immutable base and merge ancestry throughout qualification. New exact-head CI and reviewer clearance are required; #2864 is not merged or live at this checkpoint.
- Do not change protected Omega intro, `games/games.json`, or unrelated generated pages as part of this release. Follow the existing guard gates and report staged, qualified, merged and deployed separately.

## Generated-output custom-domain verification handoff — 25 September 2026

- The first live generated release after #2355 proved the Omega deployment handoff: Reliable Games Publishing merged #2356 as `b3b9a22b5ebb1bcb4f461cf2970273d38d9ba6fe` and explicitly started Omega Stable run `36155903573` by `workflow_dispatch`.
- That deployed run passed, but the existing `workflow_run`-based **Live Public Navigation Verification** follower did not start. This matches GitHub's `GITHUB_TOKEN` recursion rule: explicit `workflow_dispatch` is allowed, while the subsequent workflow-completion event is not guaranteed to start another workflow when the chain originated from `GITHUB_TOKEN`.
- Bounded repair: Omega Stable gains `actions: write` and, only when its own event is `workflow_dispatch`, explicitly dispatches `live-public-navigation.yml` on `main` after deployed-page verification succeeds. Ordinary push deployments retain the existing `workflow_run` follower and therefore do not gain a duplicate explicit dispatch.
- The publishing-automation integrity audit now guards this final handoff. No public site payload, generated archive content, Dungeon runtime, Quest runtime, backend/auth code, cache namespace, or protected intro-loader file changes here.
- Exact-head qualification remains mandatory before merge.

## Post-consolidation generated-output deployment handoff — 25 September 2026

- Live follow-through on current main `e61bc047c31bfd9226f5b8edeeefb1bfc041fcce` found that Reliable Games Publishing run `36151892128` correctly rebuilt and merged generated output as #2354, including the repaired 662-game Games Index.
- The generated PR is created and merged with `github.token`. That merge produced GitHub's branch-based Pages run but did not trigger the authoritative **Deploy GitHub Pages (Omega Stable)** push workflow, whose staging step regenerates/validates canonical routes and sitemaps and whose deployment is followed by the custom-domain navigation audit.
- Current-main repair: Reliable Games Publishing retains its existing validated generated-output PR flow, then explicitly dispatches `deploy-github-pages-omega-stable.yml` on `main` after a successful generated-output merge. The workflow receives only the additional `actions: write` permission required for that dispatch.
- `scripts/audit-publishing-automation.js` now fails if the explicit post-merge Omega deployment handoff or required permission is removed. No game data, generated output, Dungeon runtime, Quest runtime, auth/backend code, or protected intro-loader file changes in this repair.
- Qualification must prove the publishing-automation audit and all triggered repository checks on the exact candidate head before merge.

## Active Wonder Boy enrichment regression repair — 22 September 2026

- Draft PR #2262 on `codex/fix-wonder-boy-enrichment-and-uta-audit` repairs the new Wonder Boy source record from the incorrect 1979 year to the verified 1987 C64 release and pins its Lemon64 game source so magazine-review import has an explicit authoritative input.
- Content Publisher preflight now recognises wording such as “1987 conversion/port/release/version”, preventing a mistyped year from silently defeating downstream magazine and tape matching.
- The publisher no longer treats the GitHub workflows alone as proof that a game is complete: after they pass it re-checks the pending magazine-source queue, the materialised magazine-review chunk, the C64 UTA mapping and the UTA manual-review queue. A missing required enrichment is surfaced as **Archive enrichment incomplete** rather than a false success.
- Reliable Games Publishing now requires a fresh full UTA mapping run instead of treating UTA refresh as best-effort. Ambiguous title matches remain excluded to the manual-review queue.
- Qualification is in progress; do not merge until the exact head is green and the user explicitly authorises merge.

## Retiring a video-less game — #2734 (14 October 2026)

- The owner requested retiring `/games/the-happiest-days-of-your-life/` while its YouTube/Drive video is unavailable. The existing PR #2734 removes exactly one catalogue entry, stale video override, static canonical/legacy pages, and generated archive/sitemap entries; all other games, manuals, backups and media remain intact.
- Source audit found `_redirects` still force-rewrote the deleted canonical route into `/games/game.html?slug=the-happiest-days-of-your-life`, defeating the intended removal. This same existing PR removes that one obsolete rule and strengthens `scripts/audit-legacy-game-routes.js` to reject orphaned forced game rewrites for ANY removed title.
- At this review-head preflight the authoritative catalogue contained 665 games and 649 explicit game rewrites, including exactly one orphan for the retired title. After removing that single rule, 648 rewrites remain, with no orphan; 17 active titles continue to use their physical folders (existing allowed warning). No shared redirect rules or live routes for other games were modified.
- This is a guarded candidate, NOT merged or deployed. Reconcile latest main changes, rerun exact-head Node/SEO/sitemap/route-publishing/site-safety/Workers tests, review changed generated output ownership and independently inspect the retired URL behavior before merging. Do not replace owner-retained manuals or originals.
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
