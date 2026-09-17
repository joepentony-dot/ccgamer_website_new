# AI continuation state

## How to use this record

This is the repository-level index for Codex continuation. Read it before making a change, then read the applicable `docs/ai-work/*.md` file before working in that area. Treat it as a dated checkpoint, not a substitute for a fresh live GitHub review when the repository may have moved.

For Dungeon Carnage specifically, `arcade/lost-sizzler/PROGRESS.md` is the product work register. Live `main` remains authoritative when later merges or automation have advanced beyond a recorded checkpoint. The continuation records below supplement the product register with cross-repository PR/branch state.

Update this file when a workstream changes category, its active PR/dependency changes, or a substantial session ends. Keep detailed reasoning, checks, blockers, and next actions in the workstream file.

## Current autonomous live-defect checkpoint — 17 September 2026

- Verified live `main` at the start of Defect 4: `bcdd2df69ca6338227cdf002af4672233a193fa8`.
- Defects 1 (#2117), 2 (#2118) and 3 (#2119) are complete. Do not reopen them without new regression evidence.
- PR #2120 was a redundant movement-wrapper proposal and is closed without merge.
- Defect 4 — Save and Exit restoration — is active in draft PR #2123 on branch `codex/dungeon-save-restore-current-main`.
- Defect 4 ownership is now reconciled with the existing r43 Solo save layer: r43 already persists a Floor 1 entrance autosave and safely owns pause-menu Save & Quit / Continue. The remaining base five-death Save & Return path lacked a Floor 1 `floorEntryCheckpoint`, rejected Floor 1, and could schedule a menu quit even when its checkpoint write failed.
- #2123 supplies the missing Floor 1 base entry snapshot/prompt compatibility while preserving r43 autosave ownership, and makes the retained Save & Return path abandon the run only after a successful checkpoint write. It does not add mid-room saving or a new persistence schema.
- Focused browser coverage now proves genuine Solo start → established r43 Floor 1 autosave + base entry snapshot → five-death Save & Return → real Continue/restore, plus a simulated failed browser write that must leave the active run intact.
- Detailed current record: [Defect 4 save/restore checkpoint](ai-work/dungeon-carnage-save-restore-2026-09-17.md).
- Exact head `f79a87a1c845e9814dad4be9e782be3272d09f31` failed only the new Chromium shard-5 regression because that first test version incorrectly assumed Floor 1 had no autosave; all other Load Safety shards/Node jobs and the other top-level workflows passed. The corrected code/test head before this documentation update is `efaf99ba5e483954ef092a00436156a9e411e2d1`; final qualification must use the post-documentation PR head.
- Diagnostic-only #2122 is not the integration candidate; its test timed out in its own readiness harness before reaching its intended assertions.
- Autonomous merge authorization remains in force; genuine hands-on acceptance, credentials, destructive external actions and project-level human approval gates still apply where documented.
- Queue after Defect 4: 3-Artefact Banishment Flask exchange, owned firearms differentiation, then RPG terminology reconciliation.

## Historical checkpoint (superseded where the current checkpoint differs)

- Reconciled through `main` commit `408a9870d33f9ea2931934c302176743d2589160`, the merge of public-beta/watchdog remediation PR #2117. Always refresh live GitHub before acting because automation or later merges may advance `main` again.
- The live open-PR queue contained six active PRs after opening bounded Dungeon Defect 2 PR #2118. Treat that count as an audit fact, not a permanent repository invariant.
- #2102 is **MERGED**. The retained local Dungeon gameplay suffix lives in `game-local-runtime.js`.
- #2113 is **MERGED**. The obsolete networked Dungeon Multiplayer packet routing, remote-player simulation and world serializer/receiver prefix is retired; `game-network.js` retains only inert compatibility owners required by the local session shell.
- #2115 is **MERGED**. The full explored dungeon map now supports Solo and local Split Screen, uses a dedicated non-playing map mode, and ignores held-M key repeats.
- #2117 is **MERGED AND COMPLETE**. The obsolete public-host closed-beta/watchdog gate no longer owns public game availability.
- #2118 is **MERGED AND COMPLETE**. Retained projectile lifecycle/progressive slowdown remediation is complete.
- #2119 is **MERGED AND COMPLETE**. Floor 1 objective/exit/floor-completion progression is complete.
- #2111 remains a merged SEO/video-page automation result. #2109 remains the authoritative merged game/archive publication result; these are separate generated-output scopes.
- Superseded runtime/documentation/generated-output PRs #2073, #2062, #1960, #1959, #1998, #2107, #1759 and #1752 remain closed without merge.
- Additional stale runtime/verification candidates #1978, #1980, #2055, #1983, #1898, #1900 and #1902 are closed without merge. #1976 remains source material for a possible current-main optimisation re-derivation.
- The old custom PayPal/private-download/browser-paywall chain is retired from the active PR queue: #1961–#1975 (excluding unrelated #1976), #1977, #1979, #1981 and #1987–#1994 are closed as superseded by the itch.io distribution decision.
- The old packaging/desktop stack #1958, #1982, #1984, #1985, #1986, #1995 and #1996 is also closed without merge as an integration vehicle. Its history remains source material only for a fresh current-main itch.io artifact.

## Current workstreams

| Workstream | Record | Current GitHub state |
| --- | --- | --- |
| Dungeon Carnage runtime | [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md) | Defects 1–3 are complete through #2117–#2119. Defect 4 save/restore is active in draft #2123; Flask exchange, firearm differentiation and RPG terminology follow as separate stages. |
| Dungeon Carnage commerce and distribution | [dungeon-carnage-commerce-distribution.md](ai-work/dungeon-carnage-commerce-distribution.md) | itch.io is the intended purchase/download route; the custom commerce/paywall and stale packaging/Windows PR graphs are closed. Any package artifact must be rebuilt from current `main`, selectively reusing historical provider-neutral ideas only where necessary. |
| Content publishing and game music | [content-publishing-and-music.md](ai-work/content-publishing-and-music.md) | #2103 and #2105 are merged; #2073 is closed. #2110 remains the current draft endpoint follow-up but is **BLOCKED** by missing/mismatched Cloudflare runtime configuration. Repository-side work for that blocker is already complete. |
| Commodore Quest 3 | [commodore-quest-3.md](ai-work/commodore-quest-3.md) | draft rebuild PR #2056 remains based on an old merge base and requires a current-main rebuild/reconciliation before integration. |
| SEO and generated output | [seo-and-generated-output.md](ai-work/seo-and-generated-output.md) | #2109 is the current merged game/archive publication result; #2111 is a merged SEO/video-page automation result; superseded #2107 and stale #1752/#1759 are closed. |

## Remaining live PR classes at this checkpoint

- #2123 — active bounded **Dungeon Defect 4** Save and Exit restoration candidate; qualify its final exact head before merge.
- #2122 — diagnostic-only Defect 4 regression branch; not an integration candidate and should be closed once #2123 is complete.
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
