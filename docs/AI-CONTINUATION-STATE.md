# AI continuation state

## How to use this record

This is the repository-level index for Codex continuation. Read it before making a change, then read the applicable `docs/ai-work/*.md` file before working in that area. Treat it as a dated checkpoint, not a substitute for a fresh live GitHub review when the repository may have moved.

For Dungeon Carnage specifically, `arcade/lost-sizzler/PROGRESS.md` is the product work register. Live `main` remains authoritative when later merges or automation have advanced beyond a recorded checkpoint. The continuation records below supplement the product register with cross-repository PR/branch state.

Update this file when a workstream changes category, its active PR/dependency changes, or a substantial session ends. Keep detailed reasoning, checks, blockers, and next actions in the workstream file.

## Current autonomous Dungeon Carnage checkpoint — 17 September 2026

- Verified live `main`: `d3225318ff5cb87664bce96020c790099f53e06a` — merged Stage 4 elemental-portal foundation (#2137).
- Original seven-item repository-side live-defect remediation remains complete except for the deferred manual Defect 5 product acceptance. The later #2129 sustained-Solo acceptance is also deferred.
- Stage 1 is converged through #2134/#2135; Stage 2 landing/menu polish is merged through #2136.
- Stage 4 #2137 is merged from exact qualified head `030af6e9f8c2da98fb618c64ae276b1159adda3f` as merge commit `d3225318ff5cb87664bce96020c790099f53e06a`.
- The merged portal foundation maps Water 1→2, Fire 2→3, Earth 3→4 and Air 4→5 while leaving `run.floor`, `floorComplete()` and `descendFloor()` authoritative. Portal metadata persists inside the existing run/checkpoint object.
- #2137 also advances the release/cache identity to `V10.42 r31` / `20260917r31`, resolves the Stage 2 Tutorial/menu ordering ownership conflict, and seals the reproducible Solo/Tutorial click race across the V10.42 ready transition.
- Exact-head qualification passed every top-level workflow and all six Chromium shards. Shard 5 passed on one unchanged retry after the known `v10-35-layout.mjs` startup-timeout flake; no production behaviour, assertion or timeout was weakened.
- Active work is Stage 5 larger procedural topology on branch `codex/dungeon-stage5-procedural-topology-current-main`, created directly from merge SHA `d3225318ff5cb87664bce96020c790099f53e06a`.
- Stage 5 must extend the authoritative `world.js` topology generator. R6/R7/R24 are downstream environment/objective/semantic consumers and must not become competing topology, progression, save or network owners.
- The programme remains milestone-first. Do not resume broad residue cleanup unless it blocks or destabilises the active player-facing milestone.

### Manual acceptance state

Two product-level checks remain unresolved and must not be inferred from automated tests:

1. sustained Solo movement/firing/combat/pause-resume stability after #2129;
2. 3 Artefacts/Essences → 1 Banishment Flask without first buying a Gold Flask, while Gold and Score remain unchanged.

For both, record exactly:

**MANUAL ACCEPTANCE DEFERRED — USER CURRENTLY UNAVAILABLE TO TEST**

These deferred gates do not block independent repository work that does not depend on their outcome.

### Exact next action

1. Implement Stage 5 from merged main `d3225318ff5cb87664bce96020c790099f53e06a` on `codex/dungeon-stage5-procedural-topology-current-main`.
2. Keep `world.js` as the topology owner; add deterministic loops/alternate routes, purposeful branches/dead ends, route landmarks and floor-aware structural variation without blindly increasing world dimensions.
3. Preserve guaranteed start→exit connectivity, optional-room non-blocking behaviour, floor progression, checkpoint format, portal state, local Split Screen, Tutorial and supported input ownership.
4. Add deterministic Node/browser contracts for topology connectivity, seed stability, route choice and ownership boundaries. Do not weaken existing regression contracts to obtain green.
5. Qualify the exact Stage 5 head through the full retained matrix, reconcile review findings and merge only when clean.
6. Continue to Stage 6 deeper zone-specific gameplay only after Stage 5 is merged and reconciled.
7. Keep both manual product gates explicitly deferred until the user is available to perform them.

## Historical checkpoint notes

- PR #2120 was a redundant movement-wrapper proposal and is closed without merge.
- Diagnostic-only Defect 4 PR #2122 is closed without merge.
- #2102 is merged. The retained local Dungeon gameplay suffix lives in `game-local-runtime.js`.
- #2113 is merged. Obsolete networked Dungeon Multiplayer packet routing, remote-player simulation and world serializer/receiver logic is retired; only inert compatibility owners required by the local session shell remain.
- #2115 is merged. The full explored dungeon map supports Solo and local Split Screen, uses a dedicated non-playing map mode, and ignores held-M repeats.
- #2111 remains a merged SEO/video-page automation result. #2109 remains the authoritative merged game/archive publication result; these are separate generated-output scopes.
- Superseded runtime/documentation/generated-output PRs #2073, #2062, #1960, #1959, #1998, #2107, #1759 and #1752 remain closed without merge.
- Additional stale runtime/verification candidates #1978, #1980, #2055, #1983, #1898, #1900 and #1902 are closed without merge. #1976 remains source material for a possible current-main optimisation re-derivation.
- The old custom PayPal/private-download/browser-paywall chain is retired from the active PR queue: #1961–#1975 (excluding unrelated #1976), #1977, #1979, #1981 and #1987–#1994 are closed as superseded by the itch.io distribution decision.
- The old packaging/desktop stack #1958, #1982, #1984, #1985, #1986, #1995 and #1996 is also closed without merge as an integration vehicle. Its history remains source material only for a fresh current-main itch.io artifact.

## Current workstreams

| Workstream | Record | Current GitHub state |
| --- | --- | --- |
| Dungeon Carnage runtime | [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md) plus [#2129 live regression checkpoint](ai-work/dungeon-carnage-live-freeze-cache-2026-09-17.md) | Stage 4 #2137 is merged as `d3225318ff5cb87664bce96020c790099f53e06a`; Stage 5 procedural topology is active on the current-main branch. Two independent manual product gates remain deferred. |
| Dungeon Carnage commerce and distribution | [dungeon-carnage-commerce-distribution.md](ai-work/dungeon-carnage-commerce-distribution.md) | itch.io is the intended purchase/download route; the custom commerce/paywall and stale packaging/Windows PR graphs are closed. Any package artifact must be rebuilt from current `main`, selectively reusing historical provider-neutral ideas only where necessary. |
| Content publishing and game music | [content-publishing-and-music.md](ai-work/content-publishing-and-music.md) | #2103 and #2105 are merged; #2073 is closed. #2110 remains the current draft endpoint follow-up but is **BLOCKED** by missing/mismatched Cloudflare runtime configuration. Repository-side work for that blocker is already complete. |
| Commodore Quest 3 | [commodore-quest-3.md](ai-work/commodore-quest-3.md) | draft rebuild PR #2056 remains based on an old merge base and requires a current-main rebuild/reconciliation before integration. |
| SEO and generated output | [seo-and-generated-output.md](ai-work/seo-and-generated-output.md) | #2109 is the current merged game/archive publication result; #2111 is a merged SEO/video-page automation result; superseded #2107 and stale #1752/#1759 are closed. |

## Remaining non-Dungeon-defect PR classes at this checkpoint

- #2110 — deliberately deferred **BLOCKED** Content Publisher endpoint follow-up; do not rebase/retest solely because `main` advanced.
- #2056 — stale Quest 3 rebuild requiring current-main reconstruction and fresh qualification before integration.
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
