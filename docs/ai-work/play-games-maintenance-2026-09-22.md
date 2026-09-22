# Play games maintenance and hub consolidation

## Scope

Temporary public maintenance gating for the two CCG original browser games, the `/games/ccg-games/` landing page, and the longer-term navigation decision around Quiz/Hangman and playable browser experiences. This workstream does not change either game's runtime logic.

## Owner-only Dungeon Carnage preview — 22 September 2026

- Branch `codex/dungeon-owner-maintenance-preview` changes only the Dungeon Carnage side of the temporary maintenance gate.
- Ordinary production visitors remain redirected to `/games/ccg-games/`.
- A signed-in account is allowed through only when its live Supabase profile resolves to username `cheekycommodoregamer`, display name `Cheeky Commodore Gamer`, and role `admin`.
- The gate fails closed on missing/invalid auth, profile lookup failure, or timeout.
- Commodore Quest remains under the existing unconditional production maintenance gate.
- The Dungeon Carnage home CTA and in-game release loader now cache-bust the already-supplied `c64-dungeon-carnage-home-v2.webp` so stale browser/CDN image copies cannot keep showing the earlier dark artwork.
- Focused maintenance coverage now protects the owner-only bypass, fail-closed redirect, Supabase profile lookup, and artwork cache-bust.
- Exact-head qualification and merge are still required before live owner acceptance testing.

## Historical active checkpoint — 22 September 2026

- PR #2232 / branch `codex/temporary-play-games-maintenance` starts from live `main` `d0d4130136a94dad884d93de4255217c72345d6c`.
- The production-only maintenance gate is an intentionally tiny inline head guard on each public/runtime entrypoint and activates only for `www.cheekycommodoregamer.co.uk` or `cheekycommodoregamer.co.uk`.
- The public Commodore Quest entry, direct Quest runtime entry and C64 Dungeon Carnage entry load the gate synchronously before their game runtime. Localhost and non-production previews remain usable for development and hands-on testing.
- `/games/ccg-games/` is the temporary maintenance destination. It removes launch links for both originals and links instead to the existing CCG Trivia League and Game Box Hangman routes.
- Hangman remains single-owned at `/quiz/pack-6.html`; it is linked from the games hub rather than duplicated.
- No Quest or Dungeon gameplay/runtime owner is changed by this maintenance work.\n
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
