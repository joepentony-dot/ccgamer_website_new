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
