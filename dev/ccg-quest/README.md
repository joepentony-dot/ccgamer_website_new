# Cheeky Commodore Quest — Development Build

This folder is intentionally **development-only**. It is not linked from the public CCG site, is marked `noindex`, and should remain on the `dev/ccg-quest-stealth` branch until the game is approved for release.

## Test locally

From the repository root, run `dev/ccg-quest/TEST-GAME.bat` on Windows. It serves the **whole repository** at `http://localhost:8765/` so the game uses the same root-relative CCG assets and auth paths as the website.

Then open:

`http://localhost:8765/dev/ccg-quest/`

## Current test focus

- line-of-sight enemy acquisition
- last-known-position chase/search states
- enemies give up after losing the player
- 10-second anti-camping warning/explosion system
- wrap tunnel escape route
- slower enemy pacing
- generated music and sound effects
- particles, shadows, screen shake and player-centred lighting
- solo and local room-code co-op
- Supabase Realtime transport when hosted on the CCG domain

Do **not** merge this branch to `main` until the game has passed the release checklist.
