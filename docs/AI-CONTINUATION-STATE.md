# AI continuation state

## How to use this record

This is the repository-level index for Codex continuation. Read it before making a change, then read the applicable `docs/ai-work/*.md` file before working in that area. Treat it as a dated checkpoint, not a substitute for a fresh live GitHub review when the repository may have moved.

For Dungeon Carnage specifically, `arcade/lost-sizzler/PROGRESS.md` on current `main` is the live work register and takes precedence over older branch-era backlog claims. The continuation records below supplement that file with cross-repository PR/branch state.

Update this file when a workstream changes category, its active PR/dependency changes, or a substantial session ends. Keep detailed reasoning, checks, blockers, and next actions in the workstream file.

## Verified checkpoint

- Re-audited: **2026-09-16** against live GitHub after #2103, #2105 and #2109 merged and after #2110 was opened.
- `origin/main`: `fa25ee38bd97426a392b7415ae3534793eb4fcd9` — `Publish generated game archive output (#2109)`.
- `arcade/lost-sizzler/PROGRESS.md` on `main` remains the Dungeon work register. Its substantive work order is still valid, but its checkpoint SHA and its separate-work reference to #2073 are stale: #2105 has now merged the 3D-box optimiser fix.
- Open pull-request inventory at this audit: **55**.
- #2105 is merged and supersedes still-open #2073. #2109 is the current merged game/archive generation result; still-open #2107 is an older generated-output candidate and is not an integration target.
- This continuation-system change remains isolated on `codex/ai-continuation-state` as PR #2104. Its merge base remains the older `e40f5c4f...` checkpoint, so live GitHub must still be rechecked before any merge.

## Current workstreams

| Workstream | Record | Current GitHub state |
| --- | --- | --- |
| Dungeon Carnage runtime | [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md) | #2102 is the current guarded extraction candidate on top of live `main`; #2062/#1960/#1959 are superseded or obsolete; #2055 is stale source material only |
| Dungeon Carnage commerce and distribution | [dungeon-carnage-commerce-distribution.md](ai-work/dungeon-carnage-commerce-distribution.md) | itch.io is the intended purchase/download route; the old PayPal/paywall stack is superseded, while provider-neutral packaging pieces may still be reusable after current-main reconciliation |
| Content publishing and game music | [content-publishing-and-music.md](ai-work/content-publishing-and-music.md) | #2103 and #2105 are merged; #2110 is the current draft endpoint follow-up but is blocked by missing/mismatched Cloudflare runtime configuration; #2073 is superseded |
| Commodore Quest 3 | [commodore-quest-3.md](ai-work/commodore-quest-3.md) | draft rebuild PR #2056 remains materially behind current `main` and requires reconciliation before integration |
| SEO and generated output | [seo-and-generated-output.md](ai-work/seo-and-generated-output.md) | #2109 is the current merged generated game/archive result; #2107 and August automation PRs #1752/#1759 are stale generated output and must not be merged over current output |

## Always re-check before acting

- Inspect current `main`, the target branch, its merge base and changed paths.
- Query the live open-PR inventory and inspect status/checks for every PR the task could affect.
- Treat PR descriptions and continuation files as evidence, not authority: compare them with the actual current diff and workflow state.
- Do not infer that similarly named remote branches are active or ready; use an open PR or explicit ownership/evidence to establish relevance.
- Do not revive a branch merely because it is still open: compare it with newer merged work and the current work register first.

## Checkpoint update template

In the affected workstream file, record: date/time; branch/PR and base; verified current commit or merge-base relationship; files or interfaces touched; tests/checks actually run and result; blockers/decisions; and the smallest safe next action. If the open-PR inventory or top-level status changed, update this file too.
