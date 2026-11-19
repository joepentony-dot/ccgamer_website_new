# Per-game CCG High Score Arena files

This is a **non-runtime staging area** for game-specific metadata. The existing Crossfire code still runs from `js/ccg-c64/arena/` and `resources/css/ccg-high-score-arena-preview.css`. This folder must not be interpreted as activating Dropzone or Space Taxi leaderboards.

Each game has a dedicated folder with `profile.json` (exact media identity, controls, overlay, score position, rules, activation state), `score-reader.mjs` and `run-observer.mjs`. Unmeasured readers and observers deliberately return `null` so they cannot invent scores or completed games.

**Before wiring a new game into the live emulator**:
1. Confirm the exact hosted file SHA-256, byte length, and catalogue identity.
2. Measure its score HUD *and* RAM/charset mapping from real emulator frames; a screenshot position alone is not a memory address.
3. Establish fresh-run, game-over and invalidation conditions using actual play.
4. Add the 1672 × 941 WebP with the same transparent opening as Crossfire under `resources/images/high-score-arena/<game>/overlay.webp`.
5. Integrate the score reader, observer, stage art, joystick configuration, all-time/challenge board and server-side game registration in a separately reviewed change. No client score may be treated as authoritative by itself.
6. Run relevant desktop/mobile acceptance and independent review before enabling submissions.

**Migration safety:** Crossfire's legacy image URL and runtime modules are intentionally untouched. Its image is additionally present at `crossfire/overlay.webp` for the eventual path migration, but current CSS continues to use `crossfire-original-frame.webp`.
