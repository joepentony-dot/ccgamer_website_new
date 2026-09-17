# AI continuation state

## How to use this record

This is the repository-level index for Codex continuation. Read it before making a change, then read the applicable `docs/ai-work/*.md` file before working in that area. Treat it as a dated checkpoint, not a substitute for a fresh live GitHub review when the repository may have moved.

For Dungeon Carnage specifically, `arcade/lost-sizzler/PROGRESS.md` is the product work register. Live `main` remains authoritative when later merges or automation have advanced beyond a recorded checkpoint. The continuation records below supplement the product register with cross-repository PR/branch state.

Update this file when a workstream changes category, its active PR/dependency changes, or a substantial session ends. Keep detailed reasoning, checks, blockers, and next actions in the workstream file.

## Current autonomous live-defect checkpoint — 17 September 2026

- Verified main: `e5e5dc46a7fd1d3d0f620d4fdcbb9f1780024c0a` (#2118 merged).
- Defects 1 (#2117) and 2 (#2118) are complete per current user instruction.
- Defect 3 is active in #2119 (`codex/dungeon-live-defect-checkpoint-post-2118`), incoming head `b8f3ab5df0c23b0bbf90ec7143c0b159144ae891`. Optional Warden first-exit confirmation is the suppression owner; the two-line correction needs aligned regressions and exact-head qualification.
- Detailed current record: [Floor progression diagnosis](ai-work/dungeon-carnage-floor-progression-diagnosis-2026-09-16.md).
- #2120 is a competing draft movement-callback proposal, not merged or qualified; retain only as historical evidence pending qualification of the root-cause fix.
- Open PR inventory: #2119, #2120, #2110, #2056, #1976, #1860, #1852. Do not disturb unrelated candidates.
- Autonomous merge authorization replaces prior temporary supervised merge prompts; genuine manual acceptance and external configuration gates remain.
- Next queue: Save and Exit restoration, immediate three-Artefact Flask exchange, firearms differentiation, then terminology subject to live Banishment acceptance.

## Historical checkpoint (superseded where the current checkpoint differs)


- Reconciled through `main` commit `408a9870d33f9ea2931934c302176743d2589160`, the merge of public-beta/watchdog remediation PR #2117. Always refresh live GitHub before acting because automation or later merges may advance `main` again.
- The live open-PR queue contains **six active PRs** after opening bounded Dungeon Defect 2 PR #2118. Treat that count as an audit fact, not a permanent repository invariant.
- #2102 is **MERGED**. The retained local Dungeon gameplay suffix lives in `game-local-runtime.js`.
- #2113 is **MERGED**. The obsolete networked Dungeon Multiplayer packet routing, remote-player simulation and world serializer/receiver prefix is retired; `game-network.js` retains only inert compatibility owners required by the local session shell.
- #2115 is **MERGED**. The full explored dungeon map now supports Solo and local Split Screen, uses a dedicated non-playing map mode, and ignores held-M key repeats.
- #2117 is **MERGED AND COMPLETE** per the user's current live-defect checkpoint. The obsolete public-host closed-beta/watchdog gate no longer owns public game availability.
- #2118 is the active bounded **Dungeon Defect 2** candidate for retained projectile entities/progressive slowdown. It is based directly on #2117 `main` and must qualify on its final exact head before merge.
- #2111 remains the newest merged **SEO/video-page automation** result. #2109 remains the authoritative merged **game/archive publication** result; these are separate generated-output scopes.
- Superseded runtime/documentation/generated-output PRs #2073, #2062, #1960, #1959, #1998, #2107, #1759 and #1752 remain closed without merge.
- Additional stale runtime/verification candidates #1978, #1980, #2055, #1983, #1898, #1900 and #1902 are closed without merge. #1976 remains source material for a possible current-main optimisation re-derivation.
- The old custom PayPal/private-download/browser-paywall chain is retired from the active PR queue: #1961–#1975 (excluding unrelated #1976), #1977, #1979, #1981 and #1987–#1994 are closed as superseded by the itch.io distribution decision.
- The old packaging/desktop stack #1958, #1982, #1984, #1985, #1986, #1995 and #1996 is also closed without merge as an integration vehicle. Its history remains source material only for a fresh current-main itch.io artifact.

## Current workstreams

| Workstream | Record | Current GitHub state |
| --- | --- | --- |
| Dungeon Carnage runtime | [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md) | #2117 public-beta/watchdog remediation is complete. #2118 is the active bounded projectile-lifecycle/slowdown candidate; portal progression, save/restore, Flask exchange, firearm clarity and RPG terminology follow as separate stages. |
| Dungeon Carnage commerce and distribution | [dungeon-carnage-commerce-distribution.md](ai-work/dungeon-carnage-commerce-distribution.md) | itch.io is the intended purchase/download route; the custom commerce/paywall and stale packaging/Windows PR graphs are closed. Any package artifact must be rebuilt from current `main`, selectively reusing historical provider-neutral ideas only where necessary. |
| Content publishing and game music | [content-publishing-and-music.md](ai-work/content-publishing-and-music.md) | #2103 and #2105 are merged; #2073 is closed. #2110 remains the current draft endpoint follow-up but is **BLOCKED** by missing/mismatched Cloudflare runtime configuration. Repository-side work for that blocker is already complete. |
| Commodore Quest 3 | [commodore-quest-3.md](ai-work/commodore-quest-3.md) | draft rebuild PR #2056 remains based on an old merge base and requires a current-main rebuild/reconciliation before integration. |
| SEO and generated output | [seo-and-generated-output.md](ai-work/seo-and-generated-output.md) | #2109 is the current merged game/archive publication result; #2111 is the latest merged SEO/video-page automation result; superseded #2107 and stale #1752/#1759 are closed. |

## Remaining live PR classes at this checkpoint

- #2118 — active bounded **Dungeon Defect 2** projectile-lifecycle/slowdown remediation; qualify the final exact head before merge.
- #2110 — deliberately deferred **BLOCKED** Content Publisher endpoint follow-up; do not rebase/retest solely because `main` advanced.
- #2056 — stale Quest 3 rebuild requiring current-main reconstruction and fresh qualification.
- #1976 — old R30 optimisation source material; re-derive only if the optimisation is still justified on current `main`.
- #1860 and #1852 — historical long-running containment/stabilisation branches. They are not safe bases for new Dungeon runtime work; reconcile their broader remaining account/backend or historical-evidence purpose separately before any closure or extraction decision.

## Always re-check before acting

- Inspect current `main`, the target branch, its merge base and changed paths.
- Query the live open-PR inventory and inspect status/checks for every PR the task could affect.
- Treat PR descriptions and continuation files as evidence, not authority: compare them with the actual current diff and workflow state.
- Do not infer that similarly named remote branches are active or ready; use an open PR or explicit ownership/evidence to establish relevance.
- Do not revive a closed/superseded branch merely because its code remains in Git history. Re-derive any still-useful idea against current `main`.

## Checkpoint update template

In the affected workstream file, record: date/time; branch/PR and base; verified current commit or merge-base relationship; files or interfaces touched; tests/checks actually run and result; blockers/decisions; and the smallest safe next action. If the open-PR inventory or top-level status changed materially, update this file too.
