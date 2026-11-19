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

The exact hosted `dropzone.crt` entry is SHA-256 `0bed973b322510b8a8b717fc7305ec54246dc3b00c0aa0f701702864c92253c7` (82,144 bytes), but the screenshots do not authenticate that edition. A valid automatic score reader must be derived from verified runtime memory and a trustworthy completed-run state for that exact media. The current draft now has `reader="./score-reader.mjs"` and `runtimeWired=true` for **visual-only, local readout**. `runObserver=null` and `publicSubmissionEnabled=false` remain mandatory; no completed run has been authenticated.

The Crossfire and HelioHost production pathways remain untouched by this evidence PR.

## Additional evidence from exact original CRT emulator (19 November 2026)

GitHub Actions run [44551661979](https://github.com/joepentony-dot/ccgamer_website_new/actions/runs/44551661979) produced read-only RAM and screen captures from the hosted SHA-256-pinned CRT. Unlike the owner screenshots, these captures are directly tied to the exact hosted media. The pulse-and-release joystick-port-2 start reached active gameplay, with visible **0 → 10** score transitions repeated in two separate runs.

- VIC screen-character base: `$B800` during gameplay; initial title pages used a different base
- Seven score-character cells: `$BB20–$BB26`, row 20, columns 0–6; blank leading character code `10`
- At zero score, the seven observed bytes: `10,10,10,10,10,10,0`
- At ten points, the seven observed bytes: `10,10,10,10,10,1,0`
- Stable adjacent HUD sentinel: `$BB27–$BB2F` = `21,22,23,24,25,26,27,28,29`
- The compact evidence excerpt with SHA-256 identifiers for the original RAM captures is at `tests/fixtures/high-score-arena/dropzone/real-ram-score-observations.json`

A guarded `games/dropzone/score-reader.mjs` uses these exact cells and the active VIC base; codes 2–9 are still inferred from the same contiguous digit character mapping rather than individually observed scoring transitions. This reader is **read-only and local**, with no member account, session, score submission or backend integration.

**Outstanding:** verify actual GAME OVER in RAM/video with a continuous unmodified original-ROM playthrough, establish reliable fresh-run invalidation, add a separate completion observer and server-side score eligibility, then qualify the update under existing CCG review/deployment gates. Do not treat the game's built-in “YOUR RANK IS” notice as proof of an online leaderboard record.
