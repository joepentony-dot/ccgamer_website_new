# Per-game CCG High Score Arena files

This is a per-game metadata and artwork layout. Dropzone's visual preview and **read-only local HUD score decoder** are wired in a draft PR; ranked scores and network submissions remain disabled. The existing Crossfire code still runs from `js/ccg-c64/arena/` and `resources/css/ccg-high-score-arena-preview.css`. This folder must not be interpreted as activating Dropzone or Space Taxi leaderboards.

Each game has a dedicated folder with `profile.json` (exact media identity, controls, overlay, score position, rules, activation state). Dropzone now has a `score-reader.mjs` grounded in real unmodified CRT RAM captures (displayed score 0 then 10). A read-only `run-observer.mjs` now uses exact-ROM PAL video evidence (GAME OVER and YOUR RANK IS) plus a 25-frame stability guard and a positive score transition. Space Taxi remains metadata-only.

**Before wiring a new game into the live emulator**:
1. Confirm the exact hosted file SHA-256, byte length, and catalogue identity.
2. Measure its score HUD *and* RAM/charset mapping from real emulator frames; a screenshot position alone is not a memory address.
3. Establish fresh-run, game-over and invalidation conditions using actual play.
4. Add the 1672 × 941 WebP with the same transparent opening as Crossfire under `resources/images/high-score-arena/<game>/overlay.webp`. Dropzone's actual asset is now staged and its alpha opening verified against Crossfire.
5. Integrate the score reader, observer, stage art, joystick configuration, all-time/challenge board and server-side game registration in a separately reviewed change. No client score may be treated as authoritative by itself.
6. Run relevant desktop/mobile acceptance and independent review before enabling submissions.

**Migration safety:** Crossfire's legacy image URL and runtime modules are intentionally untouched. Its image is additionally present at `crossfire/overlay.webp` for the eventual path migration, but current CSS continues to use `crossfire-original-frame.webp`.

**Dropzone evidence (19 Nov 2026):** two owner-supplied 320×200 screenshot fixtures and pixel measurements now exist. These support the score-region identification. Later real-ROM capture confirmed the **screen-memory** score cells `$BB20`–`$BB26`, but did not verify game-over or server eligibility.

**Dropzone visual draft:** verified hosted `dropzone.crt` mounts a themed 1672 × 941 frame and disabled-score board on desktop/mobile. The Arena now displays read-only local score values directly from `$BB20`–`$BB26` during original-CRT gameplay, with 0 and 10 proven. It does **not** submit scores; a genuine game-over observer and backend admission remain required. Crossfire logic and CSS remain unchanged.
