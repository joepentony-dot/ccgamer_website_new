# AI continuation state

## How to use this record

This is the repository-level index for Codex continuation. Read it before making a change, then read the applicable `docs/ai-work/*.md` file before working in that area. Treat it as a dated checkpoint, not a substitute for a fresh live GitHub review when the repository may have moved.

For Dungeon Carnage specifically, `arcade/lost-sizzler/PROGRESS.md` is the product work register. Live `main` remains authoritative when later merges or automation have advanced beyond a recorded checkpoint. The continuation records below supplement the product register with cross-repository PR/branch state.

Update this file when a workstream changes category, its active PR/dependency changes, or a substantial session ends. Keep detailed reasoning, checks, blockers, and next actions in the workstream file.

## Current autonomous Dungeon Carnage checkpoint — 17 September 2026

- Verified live `main`: `ee2d6b38e5c5805ee1c906d7f801bda2d8496383` — merged Stage 2 landing milestone (#2136).
- Original seven-item repository-side live-defect remediation remains complete except for the deferred manual Defect 5 product acceptance. The later #2129 sustained-Solo acceptance is also deferred.
- Stage 1 is converged for the current product programme: #2134 merged as `adc6f96d2ab8d8395b8cae5818b38c101bd846b9`; #2135 merged as `811f67845dbcaa0b4b5c2b83f8860e10a184c1a0`.
- Stage 2 startup/main-menu polish #2136 is merged as current main `ee2d6b38e5c5805ee1c906d7f801bda2d8496383`.
- The programme is milestone-first. Do not resume broad residue cleanup unless it blocks or destabilises the active player-facing milestone.
- Active Dungeon PR: **#2137 — Add Dungeon Carnage elemental portal campaign foundation**.
- Branch: `codex/dungeon-elemental-portal-foundation-current-main`.
- Base: current `main` `ee2d6b38e5c5805ee1c906d7f801bda2d8496383`.
- Stage 4 foundation maps Water Floor 1→2, Fire 2→3, Earth 3→4 and Air 4→5 while leaving `run.floor`, `floorComplete()` and `descendFloor()` authoritative. Portal discovery/unlock/traversal metadata persists inside the existing run/checkpoint object; legacy saves infer already-earned unlocks from proven depth without advancing the floor.
- First reviewed #2137 head `6b8483154bbfbd20d11a9a050b426b4e784667dc` passed the four attached workflows, including Load Safety canonical/Node contracts, Chromium discovery and all six shards.
- Automated review identified two legitimate blockers: stale r30 cache/release identity for the new bootstrap module, and missing persistent checkpoint updates.
- The branch now advances the canonical page, direct local asset query tokens, `version.json` and ordered bootstrap to **`V10.42 r31` / `20260917r31`**. The historical r30 handoff remains in place but derives its child-module token from canonical cache metadata; the new r31 release-identity regression protects that path. The previous r30 release-identity contract is retired.
- Persistent runtime and work-register checkpoints are updated on the same branch before final exact-head qualification.
- Larger visual portal rooms, larger procedural topology and deeper zone-specific gameplay are not part of this foundation and remain subsequent milestones.

### Manual acceptance state

Two product-level checks remain unresolved and must not be inferred from automated tests:

1. sustained Solo movement/firing/combat/pause-resume stability after #2129;
2. 3 Artefacts/Essences → 1 Banishment Flask without first buying a Gold Flask, while Gold and Score remain unchanged.

For both, record exactly:

**MANUAL ACCEPTANCE DEFERRED — USER CURRENTLY UNAVAILABLE TO TEST**

These deferred gates do not block independent repository work that does not depend on their outcome.

### Exact next action

1. Reconcile #2137's final exact head after the r31 cache/release correction and checkpoint commits.
2. Require all PR-triggered checks on that exact head to pass, including Lost Sizzler Load Safety canonical/Node contracts, Chromium discovery and all six Chromium shards.
3. Confirm the r31 release-identity regression executes and no stale canonical `20260917r30` token remains.
4. Reconcile Codex review findings/threads, changed paths and mergeability against current `main`.
5. Merge only under the established merge-authorisation rule; otherwise leave #2137 in an exact **READY TO MERGE** state.
6. After a qualified merge, reconcile the new `main`, record the exact head/merge SHA, and continue with Stage 5 larger procedural topology/zone structure rather than broad legacy cleanup.
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
| Dungeon Carnage runtime | [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md) plus [#2129 live regression checkpoint](ai-work/dungeon-carnage-live-freeze-cache-2026-09-17.md) | Stage 1 and Stage 2 are merged. Stage 4 elemental portal campaign-state foundation is active in #2137 with r31 cache/release correction under final qualification; two independent manual product gates remain deferred. |
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
