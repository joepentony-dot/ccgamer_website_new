# Single-game community and Ultimate Tape Archive — 22 September 2026

## Scope

This workstream is deliberately limited to the shared individual-game page system. It does not redesign Home, the intro loader, Dungeon Carnage, admin tooling, or unrelated archive pages.

Implementation vehicle: PR #2228 on branch `codex/single-game-community-uta-clean`. The earlier draft PR #2227 received concurrent Search Console/VideoObject work during qualification, so this clean branch was split from the last two-feature-only head rather than overwriting that separate work.

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

- guests can read reviews, sort them and page through them without logging in;
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

The historical `20260922003000_single_game_community_read_models.sql` migration has already been recorded in production as `single_game_community_read_models` and is preserved unchanged. Review qualification then exposed follow-up hardening needs. Those are isolated in the forward-only `20260922030000_single_game_community_review_hardening.sql` migration: the public review RPC becomes a narrow fixed-search-path `security definer` read endpoint so reviewer identity does not depend on caller profile grants, and helpful votes enforce `user_soft_bans` through a current-user guard. The hardening migration has compiled successfully against the live production schema in a rollback-only transaction and must only be applied once the final #2228 exact head is green.

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

The browser does not scrape UTA. For a C64 game it reads the locally generated mapping once per page load and requests normal HTTP revalidation (`cache: "no-cache"`) so refreshed mappings are not permanently hidden behind a stale browser cache entry. For an Amiga game the UTA mapping is not requested at all.

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
- responsive community/tape CSS remains owned by the existing shared stylesheets.

The repository's Public Code Cache Version guard requires this public JS/CSS change to ship with a new `CODE_CACHE_VERSION`, so PR #2228 also contains the corresponding `service-worker.js` cache namespace bump. This is a deployment-supporting change only, not an unrelated PWA redesign.

## Next action

1. Require all PR #2228 checks to pass on the final exact head reconciled onto current `main`.
2. Apply the forward-only `20260922030000_single_game_community_review_hardening.sql` migration to the live Supabase project and verify guest review reads, soft-ban helpful-vote enforcement and security advisors.
3. Merge PR #2228 only if the exact head remains green and mergeable.
4. Monitor Reliable Games Publishing on `main`; its best-effort UTA refresh may expand both the confident mapping and the manual-review queue without making UTA availability a publishing blocker.
5. Reconcile the generated `data/uta-manual-review.json` queue before manually promoting any additional release.
