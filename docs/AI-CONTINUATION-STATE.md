# AI continuation state

## How to use this record

This is the repository-level index for Codex continuation. Read it before making a change, then read the applicable `docs/ai-work/*.md` file before working in that area. Treat it as a dated checkpoint, not a substitute for a fresh live GitHub review when the repository may have moved.

For Dungeon Carnage specifically, `arcade/lost-sizzler/PROGRESS.md` is the product work register. Live `main` remains authoritative when later merges or automation have advanced beyond a recorded checkpoint. The continuation records below supplement the product register with cross-repository PR/branch state.

Update this file when a workstream changes category, its active PR/dependency changes, or a substantial session ends. Keep detailed reasoning, checks, blockers, and next actions in the workstream file.

## Current autonomous Dungeon Carnage live-defect checkpoint — 17 September 2026

- Verified runtime `main` before this documentation checkpoint: `2e734f4875fb737a0a292b4f92331197bc1c6f85`, the merge of Defect 7 PR #2126.
- The seven-item repository-side Dungeon Carnage live-defect remediation programme is complete except for the already-documented deployed/manual acceptance gate on Defect 5.
- Defect 1 — obsolete public-beta/watchdog startup lock — **repository-complete through #2117**.
- Defect 2 — retained projectile entities / progressive slowdown — **repository-complete through #2118**.
- Defect 3 — Floor 1 completion/exit progression failure — **repository-complete through #2119**. The bounded fix preserved the genuine objective → exit → `movePlayer()` → floor-complete → `#descend-btn` → `descendFloor()` ownership route.
- Defect 4 — Save and Exit restore reliability — **repository-complete through #2123**.
- Defect 5 — 3-Artefact Banishment Flask exchange — **no remaining repository-side correction**. #2090 owns the live Artefact/Essence exchange path and its current-main browser contract has passed; deployed/manual acceptance remains required before product-level closure.
- Defect 6 — Owned Firearms differentiation — **repository-complete through #2125**. Presentation now exposes the meaningful differences already present in firearm runtime data without changing acquisition, switching or combat ownership.
- Defect 7 — RPG terminology reconciliation — **repository-complete through #2126**.

### Defect 7 final record

- Branch used: `codex/dungeon-rpg-terminology-current-main`.
- PR: #2126, merged 17 September 2026.
- Exact qualified candidate head: `f70f816910fab8d07aaf946f140b593c9220f1ef`.
- Merge commit: `2e734f4875fb737a0a292b4f92331197bc1c6f85`.
- Root cause: `progression.js` deliberately retains historical rarity identities (`UNCOMMON`, `SIZZLER`, `GOLD MEDAL`, `ZZAP! 97%`) for progression/save compatibility, but those same values leaked directly into generated player-facing weapon/item names and the objective copy still exposed `Zzap! Citadel guardian`.
- Bounded correction: keep the internal identities untouched and reconcile only visible labels: `UNCOMMON` → `RARE`, `SIZZLER` → `ENCHANTED`, `GOLD MEDAL` → `RELIC`, `ZZAP! 97%` → `LEGENDARY`; visible `Zzap! Citadel guardian` becomes `Citadel guardian`.
- Files changed by #2126: `arcade/lost-sizzler/js/v10-42-rpg-terminology.js`, `arcade/lost-sizzler/js/v10-42-bootstrap.js`, `arcade/lost-sizzler/tests/v10-42-rpg-terminology.mjs`, and `docs/ai-work/dungeon-carnage-rpg-terminology-2026-09-17.md`.
- Exact-head qualification on `f70f8169…`: Native Mouse Wheel Scroll Contract **green**; Public Code Cache Version **green**; SEO Automation **green**; C64 Dungeon Carnage Mobile Trap Layout Contract **green**; Lost Sizzler Load Safety **green**.
- Lost Sizzler Load Safety passed canonical structure/Node contracts, Chromium discovery and **all six Chromium shards**, including the historically troublesome shard 3 and the shard-1 sustained Solo long-session soak.
- #2126 had no reviews, no unresolved review threads, no conflicts and was cleanly mergeable before merge.
- Detailed record: [Defect 7 RPG terminology checkpoint](ai-work/dungeon-carnage-rpg-terminology-2026-09-17.md).

### Active Dungeon live-defect branch / PR

- **None.** Do not create another repository defect branch merely to continue the original seven-item programme.
- Do not reopen Defects 1, 2, 3, 4, 6 or 7 without new regression evidence.
- Defect 5 is not a coding task at this checkpoint; its remaining gate is deployed/manual acceptance of the 3-Artefact Banishment Flask exchange.

### Exact next action

1. When the current build is deployed and available for hands-on testing, perform the short manual Defect 5 acceptance: verify the 3-Artefact/Essence Banishment Flask exchange succeeds without requiring a Gold purchase and does not spend Gold/Score incorrectly.
2. If that passes, mark the seven-item live-defect programme product-complete in the work register.
3. If it fails, reproduce against the then-current deployed `main` and open a new bounded defect from that exact repository state; do not revive stale branches wholesale.
4. If no new defect is reported, move only to the separately documented post-defect product backlog rather than inventing further remediation work.

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
| Dungeon Carnage runtime | [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md) | Seven-item repository live-defect programme completed through #2117, #2118, #2119, #2123, #2090, #2125 and #2126. Defect 5 still has a deployed/manual acceptance gate; no active repository defect PR remains. |
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
