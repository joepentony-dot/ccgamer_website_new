# CCG High Score Arena — Reusable Game Integration Contract

This is the technical reuse template, **not permission to activate another game**.

Crossfire (Atlantis/Pantheon, exact C64 `archive-02121`) is the first pilot and the only registered game at present. Its score observer, data contract and original user-supplied decorative overlay must remain specific to this edition.

For each future game, the developer must supply a new *verified* game profile recording the exact catalogue ID, media format, source length and SHA-256; document the publisher/edition so identically named games never share records; empirically capture an initial score, two different positive results and a reliable end-of-run transition; add a dedicated score adapter and genuine-ROM regression fixtures; define lives, time, difficulty, trainers and save-state eligibility; register the game in the database as `pilot` until review; attach new artwork/skin without copying Crossfire's identity; and run isolated PostgreSQL RLS, emulator, performance, browser and independent review gates. The common backend projections and seven-segment leaderboard renderer can then be reused.

**Security boundary:** `createArenaDiagnosticObserver` only emits an untrusted local score candidate. A separately reviewed authenticated server flow must validate eligibility, moderation and no-cheat rules before any score is inserted into private attempts or approved for public rankings. Adding a profile never enables submission. No game may be ranked solely because its name resembles an existing title.

**Overlay geometry:** the user's Crossfire prototype uses a decorative 1672×941 frame, an inner viewport, an unobstructed 4:3 game slot and a blue seven-segment score board. The visual **layout system** may be reused, but each future game's frame/title/artwork must be original or properly sourced for that game. Preserve performance, touch keyboard, CRT effects and the full existing emulator experience. Do not copy the embedded, full-resolution Crossfire art onto every unrelated game.

**Current phase:** draft PR #3089 holds only inert source modules and isolated test infrastructure. Neither the Supabase backend nor C64 emulator has been changed or deployed. Actual browser integration, legitimate public score admission and final CI/review are still outstanding.
