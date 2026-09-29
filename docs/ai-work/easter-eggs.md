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
