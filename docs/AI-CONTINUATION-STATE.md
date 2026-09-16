# AI continuation state

## How to use this record

This is the repository-level index for Codex continuation. Read it before making a change, then read the applicable `docs/ai-work/*.md` file before working in that area. Treat it as a dated checkpoint, not a substitute for a fresh live GitHub review when the repository may have moved.

For Dungeon Carnage specifically, `arcade/lost-sizzler/PROGRESS.md` is the product work register. Live `main` remains authoritative when later merges or automation have advanced beyond a recorded checkpoint. The continuation records below supplement the product register with cross-repository PR/branch state.

Update this file when a workstream changes category, its active PR/dependency changes, or a substantial session ends. Keep detailed reasoning, checks, blockers, and next actions in the workstream file.

## Verified checkpoint

- Reconciled through `main` commit `c3549e6d45b7748f1efcf5c4f4ba134200325a5f`, the merge of Dungeon runtime-retirement PR #2113. Always refresh live GitHub before acting because automation or later merges may advance `main` again.
- The live open-PR queue was reduced from the earlier 20-candidate state to **six pre-checkpoint open PRs** after merging #2113 and closing stale/superseded runtime, verification and packaging candidates. Treat that count as an audit fact, not a permanent repository invariant.
- #2102 is **MERGED**. The retained local Dungeon gameplay suffix lives in `game-local-runtime.js`.
- #2113 is **MERGED**. The obsolete networked Dungeon Multiplayer packet routing, remote-player simulation and world serializer/receiver prefix is retired; `game-network.js` retains only inert compatibility owners required by the local session shell.
- #2111 remains the newest merged **SEO/video-page automation** result. #2109 remains the authoritative merged **game/archive publication** result; these are separate generated-output scopes.
- Superseded runtime/documentation/generated-output PRs #2073, #2062, #1960, #1959, #1998, #2107, #1759 and #1752 remain closed without merge.
- Additional stale runtime/verification candidates #1978, #1980, #2055, #1983, #1898 and #1900 are now closed without merge. #1976 remains source material for a possible current-main optimisation re-derivation; #1902 still represents a supported Split Screen full-map behaviour that appears missing on current `main` and must be re-derived rather than merged wholesale.
- The old custom PayPal/private-download/browser-paywall chain is retired from the active PR queue: #1961–#1975 (excluding unrelated #1976), #1977, #1979, #1981 and #1987–#1994 are closed as superseded by the itch.io distribution decision.
- The old packaging/desktop stack #1958, #1982, #1984, #1985, #1986, #1995 and #1996 is also closed without merge as an integration vehicle. Its history remains source material only for a fresh current-main itch.io artifact.

## Current workstreams

| Workstream | Record | Current GitHub state |
| --- | --- | --- |
| Dungeon Carnage runtime | [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md) | #2102 and #2113 are **MERGED**. Retained local gameplay is separated and the obsolete online packet/world-sync runtime is retired. Manual #2090 held-fire/Flask acceptance remains; next independent repository step is a bounded retired-mode residue audit. |
| Dungeon Carnage commerce and distribution | [dungeon-carnage-commerce-distribution.md](ai-work/dungeon-carnage-commerce-distribution.md) | itch.io is the intended purchase/download route; the custom commerce/paywall and stale packaging/Windows PR graphs are closed. Any package artifact must be rebuilt from current `main`, selectively reusing historical provider-neutral ideas only where necessary. |
| Content publishing and game music | [content-publishing-and-music.md](ai-work/content-publishing-and-music.md) | #2103 and #2105 are merged; #2073 is closed. #2110 remains the current draft endpoint follow-up but is **BLOCKED** by missing/mismatched Cloudflare runtime configuration. Repository-side work for that blocker is already complete. |
| Commodore Quest 3 | [commodore-quest-3.md](ai-work/commodore-quest-3.md) | draft rebuild PR #2056 remains based on an old merge base and requires a current-main rebuild/reconciliation before integration. |
| SEO and generated output | [seo-and-generated-output.md](ai-work/seo-and-generated-output.md) | #2109 is the current merged game/archive publication result; #2111 is the latest merged SEO/video-page automation result; superseded #2107 and stale #1752/#1759 are closed. |

## Remaining live PR classes at this checkpoint

- #2110 — deliberately deferred **BLOCKED** Content Publisher endpoint follow-up; do not rebase/retest solely because `main` advanced.
- #2056 — stale Quest 3 rebuild requiring current-main reconstruction and fresh qualification.
- #1976 — old R30 optimisation source material; re-derive only if the optimisation is still justified on current `main`.
- #1902 — old Split Screen full-map candidate; behaviour appears still missing, but rebuild the small change on current `main` rather than merging the stale branch.
- #1860 and #1852 — historical long-running containment/stabilisation branches. They are not safe bases for new Dungeon runtime work; reconcile their broader remaining account/backend or historical-evidence purpose separately before any closure or extraction decision.

## Always re-check before acting

- Inspect current `main`, the target branch, its merge base and changed paths.
- Query the live open-PR inventory and inspect status/checks for every PR the task could affect.
- Treat PR descriptions and continuation files as evidence, not authority: compare them with the actual current diff and workflow state.
- Do not infer that similarly named remote branches are active or ready; use an open PR or explicit ownership/evidence to establish relevance.
- Do not revive a closed/superseded branch merely because its code remains in Git history. Re-derive any still-useful idea against current `main`.

## Checkpoint update template

In the affected workstream file, record: date/time; branch/PR and base; verified current commit or merge-base relationship; files or interfaces touched; tests/checks actually run and result; blockers/decisions; and the smallest safe next action. If the open-PR inventory or top-level status changed materially, update this file too.
