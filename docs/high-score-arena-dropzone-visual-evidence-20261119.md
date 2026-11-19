# Dropzone C64 high-score Arena — visual evidence (19 November 2026)

## Supplied source samples

These are **owner-supplied screenshots**, kept in original PNG bytes under `tests/fixtures/high-score-arena/dropzone/`, not captures taken by this codebase. They each measure 320 × 200 pixels. It has **not** been established that the screenshots came from the same exact cartridge checksum currently hosted as `dropzone.crt`.

| File | Observed score | State | Original SHA-256 |
|---|---:|---|---|
| `active-9220.png` | 9220 | Active gameplay; purple spaceman life indicator present | `6105f4b58f45964f12a3b8e28554d6256118d456c66e0718b3822b07e0fc9438` |
| `game-over-9230.png` | 9230 | **GAME OVER**; rank message visible; life sprite absent | `18e921656d34da6053358ac2821a946d3ee1ddf0296ed8fad78c741606cb6e4c` |

## Pixel-space observations (NOT emulator memory addresses)

- The yellow score occupies X=26–55 inclusive and Y=162–168 inclusive in both screenshots. Four six-pixel-wide digits start at X=26, 34, 42 and 50 and share Y=162.
- The observed score colour is RGB (227, 231, 110).
- A purple spaceman life indicator appears in the active screenshot at approximately X=36–47, Y=174–191 (RGB 151,70,160), but not in the game-over screenshot. This is **visual evidence only**; do not infer how many lives remain from the adjacent `MEN OUT` field without validation.
- The game-over screenshot shows `GAME OVER` and a ranking notice including `YOUR RANK IS`, `NOT LISTED` and `PRACTICE RECOMMENDED`. This is **not** evidence that a remote leaderboard has received the score.
- The displayed score differs by 10 points between the two samples. The samples' exact temporal relationship and any internal game phase transitions are not independently established.

## Production guard

The exact hosted `dropzone.crt` entry is SHA-256 `0bed973b322510b8a8b717fc7305ec54246dc3b00c0aa0f701702864c92253c7` (82,144 bytes), but the screenshots do not authenticate that edition. A valid automatic score reader must be derived from verified runtime memory and a trustworthy completed-run state for that exact media. Until then, `reader=null`, `runObserver=null`, `runtimeWired=false`, `publicSubmissionEnabled=false`.

The Crossfire and HelioHost production pathways remain untouched by this evidence PR.
