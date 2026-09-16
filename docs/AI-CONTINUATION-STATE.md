# AI continuation state

## How to use this record

This is the repository-level index for Codex continuation. Read it before making a change, then read the applicable `docs/ai-work/*.md` file before working in that area. Treat it as a dated checkpoint, not a substitute for a fresh live GitHub review when the repository may have moved.

For Dungeon Carnage specifically, `arcade/lost-sizzler/PROGRESS.md` remains the product work register, but live `main` takes precedence when that file has not yet caught up with a merged runtime stage. The continuation records below supplement it with cross-repository PR/branch state.

Update this file when a workstream changes category, its active PR/dependency changes, or a substantial session ends. Keep detailed reasoning, checks, blockers, and next actions in the workstream file.

## Verified checkpoint

- Re-audited: **2026-09-16** after guarded runtime extraction #2102 merged and obsolete/superseded PR cleanup completed.
- `origin/main`: `5112035f0d1f3c80fdb4fa2c6c83ff0228778600` — merge of #2102, **Dungeon Carnage: extract retained local runtime from legacy network file**.
- Open pull-request inventory after cleanup: **20**.
- `arcade/lost-sizzler/PROGRESS.md` is now stale in two specific respects: it still says the `game-network.js` local-runtime extraction is pending, although #2102 is merged, and it still references #2073, which was superseded by merged #2105 and is now closed. Preserve its still-valid product backlog, but use live `main` for those corrected facts.
- Superseded runtime/documentation/generated-output PRs #2073, #2062, #1960, #1959, #1998, #2107, #1759 and #1752 are now closed without merge.
- The old custom PayPal/private-download/browser-paywall chain has been retired from the active PR queue: #1961–#1975 (excluding unrelated #1976), #1977, #1979, #1981 and #1987–#1994 are closed as superseded by the itch.io distribution decision.
- This continuation-system change remains isolated on `codex/ai-continuation-state` as PR #2104 until this refreshed checkpoint is qualified and merged.

## Current workstreams

| Workstream | Record | Current GitHub state |
| --- | --- | --- |
| Dungeon Carnage runtime | [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md) | #2102 is **MERGED**; retained local gameplay now lives in `game-local-runtime.js`. Remaining runtime work is separate guarded obsolete-transport retirement plus the still-required manual #2090 held-fire/Flask acceptance. |
| Dungeon Carnage commerce and distribution | [dungeon-carnage-commerce-distribution.md](ai-work/dungeon-carnage-commerce-distribution.md) | itch.io is the intended purchase/download route; the custom PayPal/private-delivery/paywall PR graph is closed. Provider-neutral packaging/Windows candidates remain source material only until reconciled with current `main`. |
| Content publishing and game music | [content-publishing-and-music.md](ai-work/content-publishing-and-music.md) | #2103 and #2105 are merged; #2073 is closed. #2110 is the current draft endpoint follow-up but is **BLOCKED** by missing/mismatched Cloudflare runtime configuration. |
| Commodore Quest 3 | [commodore-quest-3.md](ai-work/commodore-quest-3.md) | draft rebuild PR #2056 remains 26 commits ahead of its old merge base while current `main` is 208 commits ahead of its head relationship; reconcile/rebuild before integration. |
| SEO and generated output | [seo-and-generated-output.md](ai-work/seo-and-generated-output.md) | #2109 remains the authoritative generated game/archive result; superseded #2107 and stale #1752/#1759 are now closed. |

## Always re-check before acting

- Inspect current `main`, the target branch, its merge base and changed paths.
- Query the live open-PR inventory and inspect status/checks for every PR the task could affect.
- Treat PR descriptions and continuation files as evidence, not authority: compare them with the actual current diff and workflow state.
- Do not infer that similarly named remote branches are active or ready; use an open PR or explicit ownership/evidence to establish relevance.
- Do not revive a closed/superseded branch merely because its code may still exist in Git history. Re-derive any still-useful idea against current `main`.

## Checkpoint update template

In the affected workstream file, record: date/time; branch/PR and base; verified current commit or merge-base relationship; files or interfaces touched; tests/checks actually run and result; blockers/decisions; and the smallest safe next action. If the open-PR inventory or top-level status changed, update this file too.
