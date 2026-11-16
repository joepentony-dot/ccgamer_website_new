# CCG — HIGH SCORE ARENA: Crossfire PRG Pilot

## Status — 16 November 2026

**Pilot scope is strictly Crossfire (C64 PRG), not every C64 game.** This isolated source branch contains a read-only forensic checker. It does not enable scoring, use production Supabase, change the emulator, or alter site appearance.

The owner requests (1) an all-time leaderboard for the exact Crossfire edition, (2) limited-time challenges in parallel, and (3) a Crossfire-specific gameplay overlay that switches automatically at game launch and displays current leaderboard ranks and scores using blue neon, pinball-style numerals. The supplied Crossfire-themed art frame and blue LED numeric display are visual references. Preserve an unobstructed, correctly proportioned 4:3 emulated gameplay display; rank and score must not conceal game content. Avoid deliberate flashes/strobes. No generated or fabricated leaderboard data.

## Verified catalogue facts

Source `emulator/c64/media/prg-archive/catalog.json`, read from main on 16 November 2026:

- `archive-02121`: **Crossfire**, `prg`
- Pack: `emulator/c64/media/prg-archive/pack-10.bin`
- Record range: byte offset **208062**, length **23637**
- Exact extracted PRG SHA-256: `ddc3ab84c98fc065fd39e69bfe68b7ee6de38ebab4b51b607bbcea64cad570a9`
- Distinct adjacent game: `archive-02122`, **Crossfire - Tron**, `prg`, not eligible for this leaderboard.

The pack bytes are binary, and connector text reads could not retrieve them as usable UTF-8. **The PRG bytes, memory score location, score encoding and game-over indicator have not yet been verified in a running emulator.** `scripts/high-score-arena/inspect-crossfire-prg.mjs` provides an independent read-only checksum and PRG-header gate on a checked-out repository containing the existing approved binary pack. Do not claim this gate has passed until its actual output has been obtained.

## Existing emulator integration points

- `js/ccg-c64/app.js` retains `activeLibraryEntryId`, `currentSessionGame`, the game-load paths and its normal RAF loop.
- `js/ccg-c64/core/machine.js` exposes `C64Machine.mem`; `core/memory.js` implements `ram` and non-side-effect memory peeks.
- Use the exact selected catalogue **ID and verified media digest**, not merely a game title, to engage challenge mode.
- Isolate new score observations from ordinary game play. Do not scan all 64KB on every frame, and avoid any extra network work when Crossfire is not active.
- Game Vault snapshots, power cycling, resets, disk/tape load, controller updates, warp and user-loaded files must retain established behaviour.

## Delivery stages

1. **PRG identity**: execute forensic checker against checked-out pack; verify whole-pack and entry checksums, load address and byte bounds.
2. **Empirical score investigation**: run the exact game in the website's C64 emulator, capture controlled before/after RAM observations at several known on-screen scores, identify the real score encoding, and demonstrate a reliable fresh-run/game-over boundary. Test restarts and corrupted/edited data. Do not invent score offsets.
3. **Crossfire-only observer**: fail closed if media or runtime state changes; detect a single qualified final score without interfering with game execution. Preserve full-file code-change discipline.
4. **Backend**: separate per-game high-score schema and score-event audit with authenticated users, reasonable submissions-per-session, server-side validation and score moderation. Reuse account infrastructure carefully, not the unrelated CCQ scoring rules. Distinguish verified versus unverified scores and document client-side anti-cheat limits.
5. **Overlay**: adapt supplied original Crossfire-themed frame as a challenge-only presentation and render read-only live leaderboard data in blue neon pinball digits. Do not overlay leaderboard content on top of the emulator picture. Include loading/offline states, mobile rendering and an accessible text equivalent.
6. **Acceptance**: run actual C64 game + scoring behaviour and leaderboard persistence, check false positives, game changes, reset/save-state integrity, then the required emulator browser, auth/RLS, PWA/cache, safety, performance/Lighthouse and other applicable CI. Seek independent review and use guarded PR merge. Production deployment and score validity are NOT established by this branch.

## Repository boundaries

Read `AGENTS.md`, `docs/AI-CONTINUATION-STATE.md`, `docs/ai-work/browser-c64-emulator.md`, and `docs/LIGHTHOUSE-PERFORMANCE-PROTOCOL.md` before changing runtime/web files. No updates to other PRG entries, the game pack or catalogue, `games/games.json`, protected intro files, website header, existing sitewide CSS or active unrelated workstreams. This first branch touches source inspection only.

## Current blocker

Automated score capture cannot be certified without the exact Crossfire binary executed in a suitable emulator runtime and reproducible on-screen scoring examples. PRG existence alone does not establish a usable memory address or end-of-game trigger. Keep challenge and submission services disabled until this evidence is obtained.
