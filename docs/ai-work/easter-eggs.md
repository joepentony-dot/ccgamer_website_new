# Easter Egg system workstream

## E11 Interactive Archive Expansion — 28 September 2026

- Active draft PR: #2413 / `codex/easter-egg-e11-interactive-archive-20260928`.
- Base when opened: `ca923a676b08475c8e86611e93b3d6c4e0c387a6`; PR head when opened: `bc30d1c79599c9e2cf9a7c6981e98f2f2e6633f5`.
- E11 adds ten local interactive experiences: CCG BBS, Guru Meditation, SID Lab, 1541 Drive, CCG Cracktro, Amiga-style Workbench, C64 24×21 Sprite Editor, Hayes-style Modem, recoverable Disk Error and Amiga-style Boot/Kickstart.
- New experiences are lazy-loaded from `js/easter-eggs/e11/` through `js/easter-eggs/e11-interactive-archive.js`; shared presentation remains under `resources/css/`.
- The secret console now records discoveries in local storage key `ccg:easter-eggs:discovered:v1` and displays `SECRETS FOUND: n / ???` without exposing the catalogue total.
- Nested handoffs are intentional: Modem → BBS; BBS hidden commands → Cracktro / 1541 / Workbench; Disk Error → 1541; Kickstart → Workbench.
- The central registry expands from 21 to 31 commands and the E3 registry regression is updated to preserve exact-code/order validation.
- Dedicated workflow `Easter Egg E11 Interactive Archive` runs syntax/static checks plus real Chromium interaction across desktop, mobile and short-mobile/reduced-motion contexts for all ten E11 experiences.
- Protected files `index.html`, `resources/css/intro.css`, `js/index-intro.js`, `home.html` and `games/games.json` must remain unchanged.
- Quality pass on 28 September closed three dead-end interactions: BBS `1541` now honours its own private-area hint and opens the drive; Guru recovery now becomes an explicit Workbench handoff; Workbench Tools now directly launches SID Lab, Sprite Editor, 1541 Monitor and the CCG demo. The E11 Chromium suite now exercises these nested routes.
- Do not merge #2413 until exact-head checks are green, the branch is current with main, and no material review finding remains.

## 4 November 2026 — homepage DO NOT PRESS (DRAFT BRANCH ONLY)

- New isolated `home.html` section immediately before the existing signature line, with its own `ccg-do-not-press.css` and page-only deferred `ccg-do-not-press.js`. Uses the user's red button art, self-hosted compressed copy of the supplied Ice Cream MP3, intrinsic media dimensions, lazy image, no upfront audio preload and CSS press action with reduced-motion handling.
- Shared presses use atomic Supabase RPCs in `supabase/ccg-do-not-press-counter.sql` and show a neutral placeholder on outage; do not display a browser-local total as global truth. Table access is revoked, with two fixed no-argument functions exposed for public count and increment. Counter is anonymous and not bot-proof; monitor abuse before broad promotion.
- **BRANCH ONLY / NOT MERGED / NOT LIVE**. Database migration is staged but not applied until qualified release. Native CI, desktop/mobile/reduced-motion browser acceptance, fresh-main reconciliation and public counter acceptance required.

## 4 November 2026 — Phase 4D sitemap gate follow-up (DRAFT)

- Final prior PR #3011 source SHA `433d542ff7f61fedc4b107611c55a7918a88ce6d`: 40+ checked jobs, all pass except Phase 4D. The failed job attributes its mismatch only to the recently published indexable Arcade 50 quiz route omitted from the older exact sitemap allowlist. One audited URL exception plus source canonical and robots assertions are added without weakening unrelated sitemap checks; replay full exact-head CI before any merge.

## 4 November 2026 — exact two-frame artwork upgrade (NEW PR, pending validation)

- Owner rejected prior white-background button artwork and extraneous copy/status messages. Two supplied 1254x1254 red button poses were background-isolated via red-region contour masks, then resampled in identical registration and combined into a transparent 832x416 WebP sprite (up left, pressed down right).
- Home shows only 'DO NOT PRESS', a static two-state button and a four-digit cyan neon 0000 placeholder. The preview deliberately does not claim a live or shared total; preserve the already deployed Supabase press counter for the planned new-backend integration without making misleading calls from the interim UI.
- Only a 60%-diameter circular HTML button centred on the dome is interactive; the outer red ring is a pointer-transparent background. Pointer and keyboard controls swap sprite frames, with the existing first-party sound triggered only by activation. No animated geometry, overlay, scrolling mutation or non-homepage styling.
- Source scope restricted to home.html, existing dnp CSS/JS/tests, homepage strict-hash guard, its negative regression, service-worker cache version and this checkpoint. Never edit index.html or intro stack, games.json, emulator, admin, member data or existing Supabase tables. Exact-head CI, independent review and deployment checks required before LIVE claims. **NOT YET MERGED**.

## 4 November 2026 — owner screenshot regression: blue square, silent button, oversize

- Owner-supplied production screenshots demonstrate an unwanted moving cyan/blue square, no audible press sound and an overlarge homepage button. This is a new corrective follow-up to the already-merged #3013, not a reactivation or overwrite of its merged PR.
- Active branch `fix/do-not-press-sound-focus-size-20261104` based on `64a604dd9afa7e1c31c78c1608d621a68c0e65f6`. Limit scope to existing page-local `resources/css/ccg-do-not-press.css`, `js/ccg-do-not-press.js`, `tests/home-do-not-press.test.mjs`, this checkpoint and the existing service-worker code cache. No HTML, artwork, intro, global CSS or backend modifications.
- The authentic transparent two-frame WebP sprite was inspected and contains no cyan square. Isolate the centre's inherited pseudo-element/focus adornments, render only an accessible circular keyboard focus ring, and reduce the reserved widget area from 460px/352px to 316px/252px while keeping its two-frame geometry and static 0000.
- Existing MP3 is retained and primed only on user hover/focus. Each user click now also triggers a short Web Audio mechanical tick inside the same activation; this remains audible if the MP3 playback fails or is delayed. Muted device/browser audio cannot be overridden. No audio autoplay or extra external dependencies.
- Added source-executed test coverage for exact smaller geometry, focus isolation and click-triggered audio including a rejecting MP3 playback promise; advance public code cache v222→v223.
- **NOT QUALIFIED / NOT MERGED / NOT DEPLOYED / NOT LIVE** until actual exact-head validation, guarded release, independent live appearance/sound checks on desktop/mobile, and Lighthouse smoke acceptance. Never claim owner acceptance from a passing CSS/JS contract alone.

## 4 November 2026 — button volume and live shared counting (owner request)

- Owner requests both existing press sounds reduced by 60% to 40% of prior amplitude and a persistent global press counter that grows naturally from four digits to five, six and beyond.
- #3014 source 50ff2b96f7c2a024825dabe364ac2438f006838e is squash-merged on main 0092f6c11ea44ca4280e9c95a6dae1e3d7af75d7; post-merge Pages and live navigation succeeded. Do not amend the merged PR.
- The existing Supabase project has the public.ccg_do_not_press_totals table plus ccg_do_not_press_count() and ccg_do_not_press_increment(). Read-only SQL verified live total 0, RLS enabled, anon table SELECT and UPDATE revoked, and anon EXECUTE on those fixed RPCs. No new database schema/service/secret key or paid usage needed.
- Active branch fix/do-not-press-volume-shared-counter-20261104 starts from main 0092f6c. Home button JS calls only those fixed anonymous RPCs with existing public config, reads once near viewport and increments on click. Database results are authoritative; late responses cannot decrease the total and missing backend does not fabricate presses.
- Display retains four-digit zero padding but grows to 5, 6 or more digits as the global count increases; page-local CSS uses min-width and max-content. MP3 playback volume is 0.4 (prior 1), Web Audio mechanical peak gain 0.064 (prior 0.16).
- Button source-executed tests cover volume, near-viewport lazy read, count RPC target/headers, 4-to-5-to-6-digit progression, out-of-order requests and outage behaviour. Public code cache v223 to v224.
- The public anonymous increment RPC can be called repeatedly by automated clients. The display is an entertainment metric, not fraud-proof unique visitors; any needed abuse protection must be implemented through a separately reviewed server-side gate.
- BRANCH ONLY: exact-head validation, release review, guarded merge, Pages and deployed-browser acceptance pending. No Omega intro, shared CSS, catalogue, member/account schema or other repository workstream changed.

## 4 November 2026 — requested ice-cream heading and blocked live counter

- User reports the published counter remains at 0000: confirmed live main 0092f6c predates draft #3016 (the only branch containing counter RPCs), so production cannot yet increment. This is an undeployed feature, not evidence of a deployed RPC failure.
- On the SAME #3016 branch update only the reviewed homepage component heading to PRESS FOR ICE-CREAM!, replace obsolete placeholder accessibility text with Total button presses, and tighten homepage-only heading typography to retain compact sizing.
- Preserve the original red two-frame sprite, 40% audio volumes, authenticated-by-public-anon Supabase RPC design, atomic server global count, increasing digits, four-digit zero padding and rollback-safe stale response protection. No main, intro, global CSS, generated output or backend modifications.
- The homepage CLS acceptance guard uses a verified git-blob SHA-1 allowlist; append the SHA of the exact whitespace-normalised revised static button block and preserve the two prior approved hashes. Update existing homepage tests to assert the revised exact text, accessibility label and sizing.
- New exact-head CI, full Pages deployment, visual/live button and counter acceptance mandatory; do not report merged or live until verified.
