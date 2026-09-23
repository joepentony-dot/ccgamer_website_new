## Active full-catalogue UTA follow-up — PR #2262

The Wonder Boy publish exposed a source-data error and a completion-reporting hole. Its source record said 1979 even though the description and verified C64 release are 1987; that caused UTA archive [6764] (Activision, 1987) to be rejected on year compatibility while [1677] (Hit Squad, 1991) remained visible.

PR #2262 corrects Wonder Boy to 1987, adds regression coverage requiring both [6764] and [1677], and expands conservative publisher aliases used during the **full C64 catalogue scan** for common label-name variants including Firebird Silver/Gold, CBS/CBS Electronics, Virgin/Virgin Games, Ultimate/Ultimate Play The Game, Mastertronic Added Dimension/MAD, Nexus Productions and Rack-It/Hewson word-order variants. Title matching and year compatibility remain mandatory; title-only matches are still never published.

Reliable Games Publishing now treats the UTA refresh as required before a game publication can be reported complete. The browser-side Content Publisher also re-checks the generated UTA mapping and manual-review queue before it claims archive enrichment has passed.

## Full C64 Ultimate Tape Archive audit — 23 September 2026

A catalogue-wide audit is now active on branch `codex/full-c64-uta-audit-20260923`. The current committed mapping covers 333 of 559 C64 games, with 75 manual-review entries. Of the 226 C64 games without a public mapping, 28 already have exact-title UTA candidates in the manual queue and 198 have no candidate under the previous strict title normalisation.

The audit expands title handling conservatively rather than promoting title-only guesses. It adds punctuation-spacing variants, Roman-numeral/Arabic-number variants, compact initialisms, and publisher-qualified subtitle/prefix matching with sequel-number protection. It also normalises known label spelling variants such as HiTEC/Hi-Tec and Atlantis Gold/Atlantis Software.

`scripts/generate-uta-map.mjs` now writes `data/uta-audit.json` on every full UTA scan. The audit records the number of C64 games, total UTA release directories scanned, matched games, games still requiring manual review, and games for which the current UTA index contains no compatible title candidate. This makes the full-catalogue coverage measurable rather than relying on spot checks.

Live UTA evidence used for the regression set includes 720 / U.S. Gold [729], Cops'n'Robbers / Atlantis Gold [2857], Cybernoid: The Fighting Machine / Kixx [1273], and the existing Wonder Boy Activision/Hit Squad pair. Ambiguous publisher-mismatch candidates remain excluded until independently verified.

Qualification exposed and repaired three matcher/parser defects before merge: numeric-only archive titles such as 720 were blocked by the minimum prefix length; apostrophes inside double-quoted UTA directory hrefs were prematurely terminating the parser; and a Roman-numeral title variant could bypass sequel-number protection before numeral normalisation. The fixes keep publisher/re-release evidence mandatory for prefix matches, allow three-or-more-digit numeric prefixes, parse hrefs by their actual quote delimiter, and normalise Roman numerals before number-signature comparison. On code head `4a7b9e6b374baeea6a9eaba3484b63ca40f3dc57`, the focused UTA regression, current-catalogue publishing chain, and deterministic-output check all passed; final documentation-inclusive exact-head qualification remains required.

## Curated regional/re-release reconciliation — PR #2275 — 23 September 2026

PR #2272 merged the catalogue-wide matcher expansion and Reliable Games Publishing subsequently merged generated-output PR #2273. The authoritative post-publish baseline is now 559 C64 games, 2,890 UTA releases scanned, 370 matched games, 35 unmatched games with manual-review title candidates, and 154 unmatched games with no compatible title candidate. The generated manual-review file contains 109 rows because it also records additional excluded regional/re-release candidates for games that already have at least one public mapping.

PR #2275 / branch `codex/uta-curated-release-reconciliation-20260923` introduces a deliberately narrow curation path for independently source-verified cassette relationships that the game record does not yet express as a publisher or re-release label. The curation data lives in `data/uta-curated-release-overrides.json` and is keyed by both CCG game slug and exact UTA archive ID. A curated ID can only be accepted when the UTA title is still an exact normalized title match and the existing release-year safeguard passes. It cannot make a subtitle/prefix candidate eligible, cannot apply to another game slug, and does not add a global publisher alias.

The first source-verified batch covers Beyond the Forbidden Forest [1242], Blood 'n Guts [2809], Chopper [1036], Donald Duck's Playground [1240], Indiana Jones in the Lost Kingdom [4218], Karateka [2866], Mr Robot and his Robot Factory [3211], Raid on Bungeling Bay [5360], Raid Over Moscow [529], The Goonies [841] and [6951], They Stole a Million [12597], and Zorro [717]. Evidence URLs and concise verification notes are retained alongside each curated decision. Entries whose title relationship is unsafe or whose identity is not independently established remain excluded; examples include Wizard/Wizard's Lair, Savage Pond/Savage, and Murder on the Mississippi/Murder.

Regression coverage requires a curated exact ID to remain scoped to its named game slug, rejects a deliberately curated prefix-only Karateka Championship candidate, and leaves an unapproved exact-title publisher mismatch in manual review. A second no-title-candidate pass also found safe normalisation gaps for word-boundary-only variants (`Dragonninja`/`Dragon Ninja`, `New Zealand`/`Newzealand`, `Nightbreed`/`Night Breed`) plus UTA's comma-article subtitle notation (`Train, The- Escape to Normandy`). The matcher now treats spacing-only title forms as exact-equivalent while retaining publisher/re-release and year evidence, and rewrites only the explicit raw `X, The- subtitle` form to canonical leading-article order before normalisation. Regression cases cover Bad Dudes vs Dragon Ninja, The New Zealand Story, Nightbreed and The Train. #2275 remains draft until its documentation-inclusive exact head completes the required qualification matrix. Merge still requires explicit user authorisation; after any eventual merge, Reliable Games Publishing must perform the authoritative fresh UTA scan and generated-output merge before the improved catalogue counts are considered live.

# Single-game community and Ultimate Tape Archive — 22 September 2026

## Scope

This workstream is deliberately limited to the shared individual-game page system. It does not redesign Home, the intro loader, Dungeon Carnage, admin tooling, or unrelated archive pages.

Implementation vehicle: PR #2227 on branch `codex/single-game-community-uta`.

## Community ratings

The existing Supabase-backed `ratings` table and member-authentication flow remain the canonical write path.

Implemented:

- the CCG editorial score remains separate from the public/community score;
- the community score is expanded by default on individual game pages and shows the average out of 10 plus the number of votes;
- the old rating dropdown is replaced by an accessible 1–10 radio control;
- one rating per member per game remains enforced by the existing `(user_id, game_key)` unique key and upsert path, so a member can change their rating later;
- guests can read the score without logging in and are only sent to login when they try to rate;
- normal summary reads use the `ccg_game_rating_summary` RPC rather than downloading every rating row to the browser;
- the existing row-query calculation remains only as a migration-safe fallback while the RPC is not deployed.

## Member reviews

The existing Supabase-backed `comments` table remains the canonical review write path.

Implemented:

- guests can read reviews without logging in;
- reviewer handle/name, date and the reviewer's current game rating are shown where available;
- review count is shown;
- review pages are limited to 8 records at a time;
- sort choices are Newest, Most Helpful, Highest Rating and Lowest Rating;
- edit, delete, report and helpful actions are retained;
- helpful-vote counts and the current member's helpful state are returned with the review page;
- the missing `submit_helpful_vote` backend contract is restored with an idempotent one-vote-per-member table;
- the reporter can read back only their own report state so a review remains marked Reported after reload;
- the retired `game_slug` field is no longer sent when inserting into the live canonical `comments` table;
- normal review reads use the paginated `ccg_game_reviews` RPC, with a page-scoped fallback for migration safety.

The database additions use RLS and `security invoker` functions. After the exact implementation head completed all triggered GitHub Actions successfully, the migration was applied to the live Supabase project as migration version `20260922015628` (`single_game_community_read_models`). Post-apply verification confirmed the helpful-vote table, both read RPCs and `submit_helpful_vote(uuid)` exist, and RLS is enabled on `comment_helpful_votes`. The Supabase security advisor reported no finding against any object introduced by this migration; its reported warnings concern other pre-existing project objects.

## Ultimate Tape Archive integration

UTA remains an external source. CCG does not host or duplicate its tape files.

The build/update-time generator is `scripts/generate-uta-map.mjs`. It scans the UTA archive index during publishing and writes:

- `data/uta-game-matches.json` — public, confident C64 matches;
- `data/uta-manual-review.json` — excluded title matches that need human verification.

Matching rules:

- Amiga records are always excluded;
- game title must match after conservative punctuation/spacing normalisation;
- a UTA publisher must match either an original publisher or a known re-release publisher in CCG game data;
- when both years are known, the year must be compatible with the original/re-release role;
- title-only matches are never exposed;
- multiple confident tape releases are retained rather than choosing one arbitrarily;
- if no confident match exists, the page shows no tape section.

The browser does not scrape UTA. For a C64 game it reads the locally generated mapping once, using normal browser cache behaviour. For an Amiga game the UTA mapping is not requested at all.

Matched pages show a compact Original Cassette / Tape Archive panel with publisher, year where known, tape loader when mapping data provides one, and an external **View Tape Archive** link.

## Seed verification cases

The committed seed data proves all four required page cases before the publishing-time full refresh:

- `1942` — one verified Elite Systems release;
- `ace-of-aces` — two verified releases (U.S. Gold and Kixx), proving multi-release presentation;
- `20-tons` — no confident UTA match and therefore no tape panel;
- `agony` — Amiga and therefore never eligible for a UTA panel.

## UTA manual-verification queue

The generated `data/uta-manual-review.json` file is the authoritative review queue. It must be regenerated when the publishing workflow refreshes UTA; excluded candidates must not be copied into the public mapping until CCG source data independently verifies the publisher/re-release relationship.

Known seed exclusions at this checkpoint:

1. `1942` — UTA archive `[10797]`, Encore, 1989. CCG currently records Elite as publisher and does not record Encore as a re-release publisher, so the Encore tape is excluded.
2. `bangkok-knights` — UTA archive `[3551]`, Activision, 1987. CCG currently records System 3 as publisher and Summit as re-releaser, so the Activision tape is excluded.

The Summit Bangkok Knights archive `[8568]` is included because Summit is already a known CCG re-release publisher for that game. Its UTA year is unknown (`0`), so the UI omits a definitive year rather than inventing one.

## Search Console VideoObject uploadDate correction

The affected canonical game pages already contain the verified YouTube `uploadDate` emitted by the static video-SEO generator with a UTC `Z` suffix. The warning was caused by the browser runtime adding a second nested `VideoObject` whose `uploadDate` was incorrectly fabricated from the game's release year as `YYYY-01-01`.

This branch now makes the generated `data-ccg-schema="game-graph"` authoritative on canonical game routes and skips the legacy runtime schema when that graph exists. The runtime fallback no longer emits a VideoObject at all, so it cannot invent a YouTube upload date from a game release year. `scripts/validate-video-seo.js` now requires a verified timezone-bearing datetime for every emitted `uploadDate` (`Z` or an explicit `±HH:MM` offset), so date-only release values cannot regress into VideoObject metadata.

This applies through the shared individual-game runtime rather than editing the Search Console example pages individually.

## Qualification

Focused regression coverage is in `tests/single-game-community-uta.test.mjs` and runs together with the existing rating single-refresh and community-summary critical-path guards.

The test contract covers:

- C64 confident match;
- C64 multiple releases;
- C64 no-match;
- Amiga exclusion;
- aggregate-rating RPC usage and one-rating upsert path;
- 1–10 rating control;
- review paging and sorting;
- reviewer rating display;
- edit/delete/report/helpful preservation;
- removal of the invalid `game_slug` comment insert;
- shared-template UTA placement and C64-only runtime gating;
- canonical game pages do not receive a duplicate runtime schema graph;
- runtime schema never fabricates `uploadDate` from the game release year;
- `uploadDate` validation requires a timezone-bearing datetime (`Z` or an explicit offset);
- responsive community/tape CSS remains owned by the existing shared stylesheets.

The repository's Public Code Cache Version guard requires this public JS/CSS change to ship with a new `CODE_CACHE_VERSION`, so PR #2227 also contains the corresponding `service-worker.js` cache namespace bump. This is a deployment-supporting change only, not an unrelated PWA redesign.

The final documentation-only qualification exposed an unrelated checkout-history defect in the Public Code Cache Version workflow: after a full checkout it re-fetched `main` with `--depth=1`, causing `git diff origin/main...HEAD` to fail with `no merge base` on the synthetic PR merge commit. The workflow now fetches the `main` baseline without truncating history. No cache-version assertion or public-code requirement was weakened.

## Presentation follow-up after compact-layout merge

PR #2248 has merged as the shared compact individual-game baseline. A later hands-on pass exposed two bounded presentation issues now carried by draft PR #2253 on `codex/fix-amazon-picks-accordion-double-toggle`:

- CCG Picks had two click owners, causing an open action to be immediately reversed; #2253 keeps `affiliate-products.js` as the sole accordion owner.
- The hero/details block looked uneven because each normal Game Credits label/value pair was wrapped as one grid child, so entire credit pairs alternated across columns while Secondary Publisher used direct `dt`/`dd` nodes. #2253 makes the wrapper participate via `display: contents`, giving every credit one consistent label/value row.
- The same shared CSS top-aligns the desktop cover, central identity block and 3D box, tightens the Share/Favourites and Zzap!64 award spacing, and preserves compact stacked credits on small screens.
- No community write/read model, UTA mapping, game record, award source, favourite/share behaviour, navigation, logo or platform-toggle ownership changes.

#2253 uses the already-required public cache namespace `2026-09-22-public-code-v4`. It remains draft pending exact-head qualification and explicit merge authorisation.

## Next action

1. Re-run exact-head qualification after this final documentation checkpoint.
2. Mark PR #2227 ready and merge only if that exact head remains fully green and mergeable.
3. Monitor Reliable Games Publishing on `main`; its best-effort UTA refresh may expand both the confident mapping and the manual-review queue without making UTA availability a publishing blocker.
4. Reconcile the generated `data/uta-manual-review.json` queue before manually promoting any additional release.
