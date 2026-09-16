# AI continuation state

## How to use this record

This is the repository-level index for Codex continuation. Read it before making a change, then read the applicable `docs/ai-work/*.md` file before working in that area. Treat it as a dated checkpoint, not a substitute for a fresh live GitHub review when the repository may have moved.

For Dungeon Carnage specifically, `arcade/lost-sizzler/PROGRESS.md` is the product work register. Live `main` remains authoritative when later merges or automation have advanced beyond a recorded checkpoint. The continuation records below supplement the product register with cross-repository PR/branch state.

Update this file when a workstream changes category, its active PR/dependency changes, or a substantial session ends. Keep detailed reasoning, checks, blockers, and next actions in the workstream file.

## Verified checkpoint

- Reconciled through `main` commit `8a2e72f4425973e3ce6756ae6c8365378dc63b34`, the merge of continuation/governance PR #2104. Always refresh live GitHub before acting because automation or later merges may advance `main` again.
- The post-#2104 audit found **19 open pull requests**. Treat that number as an audit fact, not a permanent repository invariant.
- #2102 is **MERGED**. The retained local Dungeon gameplay suffix now lives in `game-local-runtime.js`; only the obsolete online packet/world-sync prefix remains for a later guarded runtime-retirement stage.
- #2104 is **MERGED**. `AGENTS.md`, this index, the five `docs/ai-work/` records, and the corrected Dungeon `PROGRESS.md` are now on `main`.
- #2111 merged between #2102 and #2104 and is the newest merged **SEO/video-page automation** result. #2109 remains the authoritative merged **game/archive publication** result; these are separate generated-output scopes.
- Superseded runtime/documentation/generated-output PRs #2073, #2062, #1960, #1959, #1998, #2107, #1759 and #1752 are closed without merge.
- The old custom PayPal/private-download/browser-paywall chain is retired from the active PR queue: #1961–#1975 (excluding unrelated #1976), #1977, #1979, #1981 and #1987–#1994 are closed as superseded by the itch.io distribution decision.

## Current workstreams

| Workstream | Record | Current GitHub state |
| --- | --- | --- |
| Dungeon Carnage runtime | [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md) | #2102 is **MERGED**; retained local gameplay now lives in `game-local-runtime.js`. Remaining runtime work is separate guarded obsolete-transport retirement plus the still-required manual #2090 held-fire/Flask acceptance. |
| Dungeon Carnage commerce and distribution | [dungeon-carnage-commerce-distribution.md](ai-work/dungeon-carnage-commerce-distribution.md) | itch.io is the intended purchase/download route; the custom PayPal/private-delivery/paywall PR graph is closed. Provider-neutral packaging/Windows candidates remain source material only until reconciled with current `main`. |
| Content publishing and game music | [content-publishing-and-music.md](ai-work/content-publishing-and-music.md) | #2103 and #2105 are merged; #2073 is closed. #2110 is the current draft endpoint follow-up but is **BLOCKED** by missing/mismatched Cloudflare runtime configuration. |
| Commodore Quest 3 | [commodore-quest-3.md](ai-work/commodore-quest-3.md) | draft rebuild PR #2056 remains based on an old merge base and requires a current-main rebuild/reconciliation before integration. |
| SEO and generated output | [seo-and-generated-output.md](ai-work/seo-and-generated-output.md) | #2109 is the current merged game/archive publication result; #2111 is the latest merged SEO/video-page automation result; superseded #2107 and stale #1752/#1759 are closed. |

## Always re-check before acting

- Inspect current `main`, the target branch, its merge base and changed paths.
- Query the live open-PR inventory and inspect status/checks for every PR the task could affect.
- Treat PR descriptions and continuation files as evidence, not authority: compare them with the actual current diff and workflow state.
- Do not infer that similarly named remote branches are active or ready; use an open PR or explicit ownership/evidence to establish relevance.
- Do not revive a closed/superseded branch merely because its code remains in Git history. Re-derive any still-useful idea against current `main`.

## Checkpoint update template

In the affected workstream file, record: date/time; branch/PR and base; verified current commit or merge-base relationship; files or interfaces touched; tests/checks actually run and result; blockers/decisions; and the smallest safe next action. If the open-PR inventory or top-level status changed materially, update this file too.
