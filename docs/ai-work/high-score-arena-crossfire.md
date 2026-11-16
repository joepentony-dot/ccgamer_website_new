# CCG — HIGH SCORE ARENA: Crossfire PRG Pilot

## Status — 16 November 2026

**Pilot scope is strictly Crossfire (C64 PRG), not every C64 game.** This isolated source branch contains an exact-PRG integrity checker, a synthetic-data RAM candidate analyser and a read-only headless C64 gameplay probe. It does not enable scoring, use production Supabase, change the live emulator, or alter site appearance.

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

## 16 November 2026 — first-pass forensic test evidence

- Existing exact-source PRG forensic workflow **passed** at head `2c4aa46e0c27122d603da10b9d9ad091be12fe58`, GitHub Actions run `43911950805`, job `133455889725`. The actual job log reported `Crossfire PRG forensic gate passed: archive-02121 0x0801`. The other four observed workflow groups on that head also succeeded. This establishes pack/PRG identity and load address only, **not** a valid score memory offset or game-over detector.
- Added `scripts/high-score-arena/analyse-crossfire-score-ram.mjs` for **offline, read-only, provisional RAM candidate** analysis. It requires four full 64KB captures from the exact Crossfire media digest with at least three distinct human-observed displayed scores, including zero. It checks possible little/big-endian binary values, packed BCD and decimal ASCII, and reports only addresses whose contents match all samples. It does not connect to a running emulator, infer actual addresses from fabricated data or certify score verification.
- Added `tests/high-score-arena-crossfire-ram-analysis.test.mjs` with **four local passing Node 22 tests** using deliberately synthetic memory solely to exercise encodings and fail-closed media/length/lifecycle handling. These synthetic addresses must NEVER be mistaken for real Crossfire addresses. Integrated source syntax and the test file into the existing scoped forensic CI workflow. The newly updated head must pass GitHub Actions before this extension is qualified.
- Remaining empirical gate: obtain controlled screenshots plus same-frame full-memory captures during real Crossfire gameplay for several known scores and game-over/restart states. Validate candidates independently, then proceed to score submission, persistence, and overlay implementation as separate reviewed stages. No production website/runtime/backend or public leaderboard changes in this branch.


## 16 November 2026 — real Crossfire runtime and edition correction

- Headless probe script `scripts/high-score-arena/probe-crossfire-boot.mjs` and isolated `.github/workflows/crossfire-headless-probe.yml` were added on draft PR #3089. They run the actual 23,637-byte approved packed PRG using the repository's original C64 firmware and unchanged C64Machine, record CPU/RAM/video hashes, and save short-retention 384×272 PNG and raw 64KB RAM evidence artifacts. The original `emulator/c64/` runtime and user-loaded media remain untouched.
- CI run `43918075223` passed: genuine C64 BASIC reached READY after 115 PAL frames; exact Crossfire PRG checksum and real boot were verified. Subsequent headless run IDs `43918580418`, `43918921251`, `43919333853`, `43919700192`, `43920193713`, `43920557675`, `43921236380`, `43921796904` passed their scoped probe jobs. These are HEADLESS EMULATOR diagnostics, not human gameplay acceptance or scoring validation. Broader PR checks and independent reviews remain separate.
- The source file is a **trained/cracked archive edition**, not an untouched retail executable. Captured screens show an FBR 2001 intro, a Doughnut Cracking Service scroller and an Atlantis credit/trainer menu. No trainer was intentionally enabled by the probe.
- Game identification is **Crossfire from Pantheon Software, published by Atlantis Software**, NOT the different 1983 Sierra On-Line Crossfire. The authentic captured title screen shows the Pantheon/Atlantis credit, `F3... ENTER NAME`, `FIRE TO PLAY`, and an in-game top-five `Chicago Cops` record panel. Independent public records: Centre for Computing History (https://www.computinghistory.org.uk/det/33047/Crossfire/) and MobyGames (https://www.mobygames.com/game/69691/crossfire/) describe the Atlantis/Pantheon C64 title as 1989, whereas Lemon64 (https://www.lemon64.com/game/crossfire-atlantis-software) currently uses 1991. Preserve the edition distinction and do not automatically transfer Sierra controls or claims.
- Verified progression through the archived edition's menus: Space exits the second intro; `Endless lives?` -> `N`; `Endless time?` -> `N`; `Starting level (1-9)?` -> `1`; then `FIRE TO PLAY` at the game title. Recorded screenshots reached `LEVEL 1 / DOWNTOWN CHICAGO`, a numerically rendered HUD, an active street scene and a return to the level screen after losing a life. The no-cheat sequence must be revalidated for any leaderboard-eligible run.
- The rendered HUD has a visible score field, but **no controlled positive score change and corresponding RAM address / encoding have been validated**, and the game-over completion signal is unknown. Do not infer those from the screenshot, timestamp, altered RAM hash or fabricated tests. Do not post leaderboard scores or enable the neon overlay without genuine authenticated leaderboard data.
- Source branch head after the latest gameplay diagnostic: `73226c9a91ed1470bd6d8bd00d2a4b3baedfd4f0` before this documentation update. PR #3089 remains DRAFT, unmerged and non-production. No game pack, runtime, public website assets, profile data or Supabase changes were made.

### Next empirical gate

Use repeatable active gameplay with the exact no-cheat launch route to produce at least four same-frame screen + full-RAM observations with a zero-score baseline and at least two distinct positive visible scores, then validate real memory candidates and a reliable final-life/game-over boundary. A trained binary and client-controlled emulator memory mean anti-cheat limits must be documented; consider a separately verified untrained edition for competitive scores rather than pretending N key presses are tamper-proof.
