# Dungeon Carnage runtime

## Scope

The browser game under `arcade/lost-sizzler/`, including retained local runtime extraction, campaign/biome work, UI, gameplay defects, and runtime contracts. Read `arcade/lost-sizzler/PROGRESS.md` as additional historical context, but do not treat its branch claims as current without verification.

## Verified checkpoint — 2026-09-16

`origin/main` is `e40f5c4f`. Six current open PRs touch this workstream directly:

| PR | Branch | State | Focus |
| --- | --- | --- | --- |
| #2102 | `codex/dungeon-carnage-extract-local-runtime` | draft | Extract retained local runtime from `game-network.js`; frozen at `52cd8192fca707423d48fc77761195c231619ffe`, one `main` commit behind and 14 commits ahead. Exact-head canonical Node, six-shard Chromium, safety, mobile, cache/version, validation, SEO, native-wheel and Workers checks passed. |
| #2062 | `codex/dungeon-carnage-biome-room-grammar-mainline` | draft | Five-depth biome room grammar and checkpoint/browser contracts; 113 main commits behind. |
| #2055 | `codex/dungeon-carnage-unified-ui` | ready for review | Startup/menu UI simplification; 182 main commits behind. |
| #1960 | `fix/c64-dungeon-carnage-xp-source-boundary` | draft | XP source boundary; 366 main commits behind. |
| #1959 | `fix/c64-dungeon-carnage-spy-soak-damage-depth-contract` | draft | Spy soak damage-depth contract; 366 main commits behind. |
| #1958 | `feat/c64-dungeon-carnage-offline-package-foundation` | draft | Offline package foundation; this is also a base for distribution PR #1982. |

Related open draft PRs: #1983 (startup overlay flicker), #1976 (R30 ownership-audit throttle, base `main`), #1978 (Solo long-session verification, based on #1976), #1980 (stability evidence, based on #1978), #1998 (project-status refresh), #1902 (split-screen M map), #1900 and #1898 (production identity/smoke diagnostics), #1860 (Supabase egress containment), and #1852 (Solo stabilization).

## Guardrails and next action

Many candidates are substantially behind `main`; do not stack new runtime work on an old PR without first checking whether its change is already present, conflicts with newer retained-local-runtime work, or needs a fresh rebase. For runtime edits, inspect the current ordered script loading in `arcade/lost-sizzler/index.html`, `v10-42-bootstrap.js`, and the precise contract tests touched by the target PR.

Next safe action: keep #2102 frozen at `52cd8192fca707423d48fc77761195c231619ffe` and review its exact 11-file delta plus green evidence against current `main`; do not merge without explicit authorization. The similarly named extraction branches audited on 2026-09-16 were behind `main`, while later retirement candidates were stale divergent work and did not supersede #2102. Keep the network-retirement boundary and test suite aligned.

## Session log

- 2026-09-16: Re-audited current `main`, all active runtime PRs and same-topic candidate branches. Corrected only the stale queued-start source assertion on #2102; no runtime logic changed. Exact head `52cd8192fca707423d48fc77761195c231619ffe` passed the complete fresh matrix and remains draft/unmerged pending explicit authorization.
- 2026-09-16: Initial continuation checkpoint created from a fetch of `origin` and the live GitHub open-PR inventory. No runtime code changed.
