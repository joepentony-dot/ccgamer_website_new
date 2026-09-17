# AI continuation state

## How to use this record

This is the repository-level index for Codex continuation. Read it before making a change, then read the applicable `docs/ai-work/*.md` file before working in that area. Treat it as a dated checkpoint, not a substitute for a fresh live GitHub review when the repository may have moved.

For Dungeon Carnage specifically, `arcade/lost-sizzler/PROGRESS.md` is the product work register. Live `main` remains authoritative when later merges or automation have advanced beyond a recorded checkpoint. The continuation records below supplement the product register with cross-repository PR/branch state.

Update this file when a workstream changes category, its active PR/dependency changes, or a substantial session ends. Keep detailed reasoning, checks, blockers, and next actions in the workstream file.

## Current autonomous Dungeon Carnage checkpoint — 17 September 2026

- Verified live `main` after #2134 merge: `adc6f96d2ab8d8395b8cae5818b38c101bd846b9`.
- The original seven-item repository-side Dungeon Carnage live-defect remediation programme remains repository-complete except for the already-documented deployed/manual acceptance gate on Defect 5.
- The later current-build Solo freeze/stopped-firing regression is repository-fixed through #2129. Proven root cause: the canonical page loaded the base runtime under `20260910r1` while the authoritative V10.42 bootstrap used `20260917r30`, allowing a supported mixed-generation cache/runtime path.
- #2129 synchronised the blocking page, direct CSS/JS asset queries and `version.json` to `V10.42 r30` / `20260917r30` without changing projectile mechanics, firing cadence, movement semantics, save data, supported mode ownership or Defect 5 shop logic.
- Exact qualified #2129 head: `585cda263e2f0c9a626fef61d19bae9635d2087f`; merge commit: `218025ce2beac3765d65ca9b838e8afd58a5eedf`.
- Detailed regression record: [Dungeon Carnage live freeze/cache checkpoint](ai-work/dungeon-carnage-live-freeze-cache-2026-09-17.md).
- Defect 1 — obsolete public-beta/watchdog startup lock — **repository-complete through #2117**.
- Defect 2 — retained projectile entities / progressive slowdown — **repository-complete through #2118**.
- Defect 3 — Floor 1 completion/exit progression failure — **repository-complete through #2119**.
- Defect 4 — Save and Exit restore reliability — **repository-complete through #2123**.
- Defect 5 — 3-Artefact Banishment Flask exchange — **no remaining repository-side correction; deployed/manual acceptance deferred by the user**.
- Defect 6 — Owned Firearms differentiation — **repository-complete through #2125**.
- Defect 7 — RPG terminology reconciliation — **repository-complete through #2126**.
- Later freeze/stopped-firing regression — **repository-complete through #2129; deployed/manual sustained-Solo acceptance deferred by the user**.
- Stage 1 startup-owner cleanup #2131 is **merged**. Exact qualified head: `21fed121ceb0f72278142ba201f25927c5c6b9b5`; merge commit: `3358cddc66725f75213c74dec7459551d8ff02b7`.
- Stage 1 shared-fullscreen cleanup #2134 is **merged**. Exact qualified head: `dcc1ebf7428bf36f89b92a52f00645f832565ead`; merge commit: `adc6f96d2ab8d8395b8cae5818b38c101bd846b9`.
- Active Stage 1 follow-up: **#2135 — Trim retired network compatibility shell in Dungeon Carnage**, branch `codex/dungeon-retired-online-entry-current-main`.

### Manual acceptance state

Two product-level checks remain unresolved and must not be inferred from automated tests:

1. sustained Solo movement/firing/combat/pause-resume stability after #2129;
2. 3 Artefacts/Essences → 1 Banishment Flask without first buying a Gold Flask, while Gold and Score remain unchanged.

For both, record exactly:

**MANUAL ACCEPTANCE DEFERRED — USER CURRENTLY UNAVAILABLE TO TEST**

These deferred gates do not block independent repository work that does not depend on their outcome.

### Stage 1 — retired mode / legacy residue audit

PR #2131 is **MERGED**.

- Branch: `codex/dungeon-retired-spy-startup-current-main`.
- Base at Stage 1 start: `5db1fa275fba1b33d9fbab55d065724110338fd7`.
- The earlier 16 September audit was too broad when it stated that the supported runtime did not load retired Horde/Spy modules. The canonical page did not directly list them, but the r30 startup handoff still dynamically preloaded three retired Spy/Saboteurs owners.
- #2131 removed startup preloading of `v10-41-r30-spy-exit-control-reset.js`, `v10-41-r32-spy-world-owner.js`, and `v10-41-r32-spy-loader.js`.
- Ownership investigation proved that some supported responsibilities had been reached indirectly through that historical chain, so #2131 preserved them explicitly instead of deleting by filename:
  - `v10-41-post-playtest-stability.js` — supported Solo fire-state recovery;
  - `v10-41-r56-playtest-completion.js` — ordinary-dungeon environment/chest/combat recovery;
  - `v10-41-r59-live-regression-fixes.js` — pause/Solo stability;
  - `v10-41-horde-frame-performance.js` — historical Horde name but still the loader/maintenance bridge for the supported Solo R60 live-play integrity owner; its Horde polling timer is stopped during Solo;
  - `v10-41-r60-horde-owner-composition.js` — historical Horde name but still protects supported Solo R60 maintenance/damage ancestry.
- The first #2131 candidate exposed this hidden ownership in Chromium: Solo stabilization lost the Horde-frame compatibility API and selective-owner recovery lost supported R56/R60 owners. Tests were not weakened; the candidate was corrected by making supported ownership explicit while keeping the retired Spy startup owners absent.
- The stale `v10-41-r32-solo-monitor-diagnostic.mjs` contract was reconciled rather than timed out or deleted. Its replacement proves the retired R32 loader/observer and retired Spy assets remain absent during canonical Solo while R56/R59/R60 ownership stays present.
- Exact qualified #2131 head `21fed121ceb0f72278142ba201f25927c5c6b9b5` passed Public Code Cache Version, Native Mouse Wheel Scroll Contract, SEO Automation, canonical/Node contracts and all six Chromium shards. One unchanged shard-5 retry was required after the historical `v10-35-layout.mjs` 15-second startup wait flaked; the retry passed without changing runtime code, assertions or timeouts.
- #2131 merged as `3358cddc66725f75213c74dec7459551d8ff02b7`.

PR #2134 is **MERGED**.

- #2134 removed only the dead `CCGLostSizzlerV141R32SpyLoader.handleSpyFullscreenKey()` pre-dispatch from supported global `F` input.
- The supported fullscreen owner remains `game-render.js → toggleFullscreen()`; the fullscreen button and `F` both reach that owner directly.
- The retained R59 static contract was reconciled so it requires direct supported fullscreen ownership and forbids the retired shared Spy dependency while leaving R59 pause/Solo protections unchanged.
- Automated review found that the original browser regression filename contained `spy`, causing the existing Chromium manifest retired-mode filter to exclude it. The contract was renamed to `v10-42-retired-fullscreen-owner.mjs` so it entered the normal Chromium matrix without altering the manifest filter.
- Exact qualified #2134 head `dcc1ebf7428bf36f89b92a52f00645f832565ead` passed Public Code Cache Version, Native Mouse Wheel Scroll Contract, SEO Automation and Lost Sizzler Load Safety, including canonical/Node contracts, Chromium discovery and all six Chromium shards.
- #2134 merged as `adc6f96d2ab8d8395b8cae5818b38c101bd846b9`.
- No Spy/Saboteur gameplay was restored and no movement, firing, pause/resume, save, combat, Banishment, R56, R59 or R60 runtime ownership changed.

PR #2135 is the active bounded Stage 1 residue item.

- It removes seven inert network-era compatibility owners from `game-network.js`: `onPlayer`, `playerStateForNetwork`, `sendPlayer`, `sendRemotePlayerState`, `processRemoteMovement`, `serialWorld`, and `onWorld`.
- It deliberately retains `onMembers` and `onPacket`, which are still passed to the retained local `RoomNetwork` shell, plus inert `broadcastWorld`, which supported local gameplay still calls.
- The existing retired-network runtime contract is tightened to require the removed owners to stay absent while preserving those three supported compatibility obligations.
- This does not remove the separately identified `playMode === "online"` branches in `game-core.js` or `game-local-runtime.js`; those require their own bounded ownership proof rather than being folded into #2135.
- Detailed runtime reasoning is recorded in [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md).

### Defect 7 final record

- Branch used: `codex/dungeon-rpg-terminology-current-main`.
- PR: #2126, merged 17 September 2026.
- Exact qualified candidate head: `f70f816910fab8d07aaf946f140b593c9220f1ef`.
- Merge commit: `2e734f4875fb737a0a292b4f92331197bc1c6f85`.
- Root cause: `progression.js` deliberately retains historical rarity identities (`UNCOMMON`, `SIZZLER`, `GOLD MEDAL`, `ZZAP! 97%`) for progression/save compatibility, but those same values leaked directly into generated player-facing weapon/item names and the objective copy still exposed `Zzap! Citadel guardian`.
- Bounded correction: keep the internal identities untouched and reconcile only visible labels: `UNCOMMON` → `RARE`, `SIZZLER` → `ENCHANTED`, `GOLD MEDAL` → `RELIC`, `ZZAP! 97%` → `LEGENDARY`; visible `Zzap! Citadel guardian` becomes `Citadel guardian`.
- Files changed by #2126: `arcade/lost-sizzler/js/v10-42-rpg-terminology.js`, `arcade/lost-sizzler/js/v10-42-bootstrap.js`, `arcade/lost-sizzler/tests/v10-42-rpg-terminology.mjs`, and `docs/ai-work/dungeon-carnage-rpg-terminology-2026-09-17.md`.
- Exact-head qualification on `f70f8169…`: Native Mouse Wheel Scroll Contract **green**; Public Code Cache Version **green**; SEO Automation **green**; C64 Dungeon Carnage Mobile Trap Layout Contract **green**; Lost Sizzler Load Safety **green**.
- Lost Sizzler Load Safety passed canonical structure/Node contracts, Chromium discovery and all six Chromium shards.
- Detailed record: [Defect 7 RPG terminology checkpoint](ai-work/dungeon-carnage-rpg-terminology-2026-09-17.md).

### Active Dungeon branch / PR

- **#2135** is the active independent Stage 1 cleanup PR. It is not a reopening of #2129, #2131, #2134 or the seven-item defect programme.
- Do not reopen Defects 1, 2, 3, 4, 6 or 7 without new current-build regression evidence.
- Preserve #2118 projectile lifecycle ownership, #2129 release/cache identity, #2131 explicit supported R56/R59/R60 startup ownership and #2134 supported fullscreen ownership unless new evidence independently disproves them.
- Defect 5 and the #2129 sustained-Solo check are manual acceptance gates only at this checkpoint.

### Exact next action

1. Qualify #2135 on its final exact head after checkpoint documentation commits.
2. Require Public Code Cache Version, Native Mouse Wheel Scroll Contract, SEO Automation and Lost Sizzler Load Safety—including canonical/Node contracts, Chromium discovery and all six Chromium shards—to pass on that exact head.
3. Reconcile reviews/threads, changed paths and mergeability against live `main`; do not allow generated SEO output into the branch.
4. Merge #2135 under the standing authorization when qualified.
5. Reconcile the resulting `main`, checkpoint the exact qualified head/merge SHA and continue the next independent Stage 1 retired-mode/legacy-residue audit item.
6. Keep both manual product gates explicitly deferred until the user is available to perform them.

Autonomous merge authorization remains in force for bounded repository fixes that satisfy the established exact-head qualification rules. Genuine hands-on acceptance, credentials, destructive external actions and project-level human approval gates still apply where documented.

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
| Dungeon Carnage runtime | [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md) plus [#2129 live regression checkpoint](ai-work/dungeon-carnage-live-freeze-cache-2026-09-17.md) | Original repository defect programme complete; both remaining hands-on acceptance gates are user-deferred. Independent Stage 1 retired-mode/legacy-residue cleanup is active in #2135 after merged #2131 and #2134. |
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