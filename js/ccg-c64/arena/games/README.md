# Per-game CCG High Score Arena files

This is a per-game metadata and artwork layout. Dropzone's **visual-only preview** has been wired in a draft PR; score reading and network ranking remain disabled. The existing Crossfire code still runs from `js/ccg-c64/arena/` and `resources/css/ccg-high-score-arena-preview.css`. This folder must not be interpreted as activating Dropzone or Space Taxi leaderboards.

Each game has a dedicated folder with `profile.json` (exact media identity, controls, overlay, score position, rules, activation state). Only after real RAM/game-over verification should its own `score-reader.mjs` and `run-observer.mjs` be added. No new score readers or observers are installed by this groundwork PR.

**Before wiring a new game into the live emulator**:
1. Confirm the exact hosted file SHA-256, byte length, and catalogue identity.
2. Measure its score HUD *and* RAM/charset mapping from real emulator frames; a screenshot position alone is not a memory address.
3. Establish fresh-run, game-over and invalidation conditions using actual play.
4. Add the 1672 × 941 WebP with the same transparent opening as Crossfire under `resources/images/high-score-arena/<game>/overlay.webp`. Dropzone's actual asset is now staged and its alpha opening verified against Crossfire.
5. Integrate the score reader, observer, stage art, joystick configuration, all-time/challenge board and server-side game registration in a separately reviewed change. No client score may be treated as authoritative by itself.
6. Run relevant desktop/mobile acceptance and independent review before enabling submissions.

**Migration safety:** Crossfire's legacy image URL and runtime modules are intentionally untouched. Its image is additionally present at `crossfire/overlay.webp` for the eventual path migration, but current CSS continues to use `crossfire-original-frame.webp`.

**Dropzone evidence (19 Nov 2026):** two owner-supplied 320×200 screenshot fixtures and pixel measurements now exist. These support a score-reader implementation, but do **not** verify RAM addresses, game-over signatures in memory, authentic gameplay completion or submission eligibility.

**Dropzone visual draft:** verified hosted `dropzone.crt` mounts a themed 1672 × 941 frame and disabled-score board on desktop/mobile. This does not record or submit any score; a genuine game-specific memory observer remains required. Crossfire logic and CSS remain unchanged.
