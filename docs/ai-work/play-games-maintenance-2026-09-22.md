# Play games maintenance and hub consolidation

## Scope

Temporary public maintenance gating for the two CCG original browser games, the `/games/ccg-games/` landing page, and the longer-term navigation decision around Quiz/Hangman and playable browser experiences. This workstream does not change either game's runtime logic.

## Active checkpoint — 22 September 2026

- PR #2232 / branch `codex/temporary-play-games-maintenance` starts from live `main` `d0d4130136a94dad884d93de4255217c72345d6c`.
- The production-only maintenance gate is shared at `js/ccg-play-maintenance-gate.js` and activates only for `www.cheekycommodoregamer.co.uk` or `cheekycommodoregamer.co.uk`.
- The public Commodore Quest entry, direct Quest runtime entry and C64 Dungeon Carnage entry load the gate synchronously before their game runtime. Localhost and non-production previews remain usable for development and hands-on testing.
- `/games/ccg-games/` is the temporary maintenance destination. It removes launch links for both originals and links instead to the existing CCG Trivia League and Game Box Hangman routes.
- Hangman remains single-owned at `/quiz/pack-6.html`; it is linked from the games hub rather than duplicated.
- No Quest or Dungeon gameplay/runtime owner is changed by this maintenance work.\n- Public code cache ownership advances from `2026-09-22-public-code-v1` to `2026-09-22-public-code-v2` because the maintenance gate adds a new public JavaScript asset.

## Architecture direction

- Keep `/games/` as the established C64/Amiga archive and review database.
- Create a separate user-facing `Play Games` hub for interactive experiences rather than folding playable experiences into the archive URL model.
- That future hub can group CCG Originals, Quiz & Challenge Games, and a user-supplied-file C64 browser player while retaining the existing canonical implementations behind each card.
- Do not copy Quiz/Hangman code into a second folder; expose it through hub/navigation links so there is one implementation to maintain.

## Qualification / merge gate

- Focused contract: `tests/play-games-maintenance.test.mjs`.
- PR #2232 must pass the relevant triggered GitHub Actions before merge.
- After merge, verify production routes for Commodore Quest and C64 Dungeon Carnage redirect to the maintenance hub while Quiz and Hangman remain playable.
- Removing maintenance later should be a separate bounded reversal; do not mix game fixes into the maintenance PR.
