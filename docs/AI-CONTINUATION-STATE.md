# AI continuation state

## How to use this record

This is the repository-level index for Codex continuation. Read it before making a change, then read the applicable `docs/ai-work/*.md` file before working in that area. Treat it as a dated checkpoint, not a substitute for a fresh `git fetch origin --prune` and open-PR review when GitHub may have moved.

For Dungeon Carnage specifically, `arcade/lost-sizzler/PROGRESS.md` on current `main` is the live work register and takes precedence over older branch-era backlog claims. The continuation records below supplement that file with cross-repository PR/branch state.

Update this file when a workstream changes category, its active PR/dependency changes, or a substantial session ends. Keep detailed reasoning, commands, test evidence, and next actions in the workstream file.

## Verified checkpoint

- Re-audited: 2026-09-16 against live GitHub after #2101 and #2100 were already on `main` and after the remaining #2105 exact-head workflows completed.
- `origin/main`: `e40f5c4f48211e5be83e4c81fc7b2487161a11c1` — `Auto-update generated SEO and video pages (#2101)`.
- `arcade/lost-sizzler/PROGRESS.md` on `main` already records the newer Dungeon work order, the merged #2098 R24 biome work, the supported-mode boundary, and the itch.io distribution decision.
- Open pull requests: 55. #2105 is the fully qualified current-main refresh of stale #2073; #2073 remains open only as a superseded duplicate and must not be merged as well.
- This continuation-system change remains isolated on `codex/ai-continuation-state` as PR #2104. Its earlier first-pass inventory contained stale classifications that are corrected in the workstream files by this re-audit; do not merge an older #2104 head without these corrections.

## Current workstreams

| Workstream | Record | Current GitHub state |
| --- | --- | --- |
| Dungeon Carnage runtime | [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md) | #2102 is the current guarded extraction candidate; #2062/#1960/#1959 are superseded or obsolete; #2055 is stale source material only |
| Dungeon Carnage commerce and distribution | [dungeon-carnage-commerce-distribution.md](ai-work/dungeon-carnage-commerce-distribution.md) | itch.io is the intended purchase/download route; the old PayPal/paywall stack is superseded, while provider-neutral packaging pieces may still be reusable after current-main reconciliation |
| Content publishing and game music | [content-publishing-and-music.md](ai-work/content-publishing-and-music.md) | #2103 is the qualified current Worker-route PR; #2105 is fully qualified on current main and supersedes stale duplicate #2073; neither is merge-authorized by this checkpoint |
| Commodore Quest 3 | [commodore-quest-3.md](ai-work/commodore-quest-3.md) | 1 draft rebuild PR (#2056), materially behind current main and requiring reconciliation before any integration |
| SEO and generated output | [seo-and-generated-output.md](ai-work/seo-and-generated-output.md) | current main contains newer #2101 output; August automation PRs #1752/#1759 are stale and must not be merged into current generated output |

## Always re-check before acting

- Fetch remotes: `git fetch origin --prune`.
- Inspect the target branch against current `origin/main`, including its merge base and changed paths.
- Query GitHub's open PR list and inspect PR status, review, and checks for every PR the task could affect.
- Do not infer that similarly named remote branches are active or ready; use an open PR or explicit ownership/evidence to establish relevance.
- Do not revive a branch merely because it is still open: compare it with newer merged work and the current work register first.

## Checkpoint update template

In the affected workstream file, record: date/time; branch/PR and base; verified current commit or merge-base relationship; files or interfaces touched; tests/checks actually run and result; blockers/decisions; and the smallest safe next action. If the open-PR inventory or top-level status changed, update this file too.
