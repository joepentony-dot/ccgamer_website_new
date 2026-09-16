# AI continuation state

## How to use this record

This is the repository-level index for Codex continuation. Read it before making a change, then read the applicable `docs/ai-work/*.md` file before working in that area. Treat it as a dated checkpoint, not a substitute for a fresh `git fetch origin --prune` and open-PR review when GitHub may have moved.

Update this file when a workstream changes category, its active PR/dependency changes, or a substantial session ends. Keep detailed reasoning, commands, test evidence, and next actions in the workstream file.

## Verified checkpoint

- Audited: 2026-09-16 (GitHub and `origin` fetched during this documentation change).
- `origin/main`: `e40f5c4f48211e5be83e4c81fc7b2487161a11c1` — `Auto-update generated SEO and video pages (#2101)` (2026-09-16 06:06:36 UTC).
- Open pull requests: 53 at audit time; 54 after this isolated continuation PR (#2104) was opened. The audited inventory and dependency notes are captured in the workstream files below.
- This continuation-system change is isolated on `codex/ai-continuation-state`, based on the `origin/main` commit above. It must be reviewed as its own PR and must not be merged until qualified.

## Current workstreams

| Workstream | Record | Current GitHub state |
| --- | --- | --- |
| Dungeon Carnage runtime | [dungeon-carnage-runtime.md](ai-work/dungeon-carnage-runtime.md) | 6 direct runtime PRs plus related diagnostic/stability PRs |
| Dungeon Carnage commerce and distribution | [dungeon-carnage-commerce-distribution.md](ai-work/dungeon-carnage-commerce-distribution.md) | 36 open draft PRs in a dependent delivery stack |
| Content publishing and game music | [content-publishing-and-music.md](ai-work/content-publishing-and-music.md) | 2 non-draft PRs; several newer un-PR'd candidate branches require reconciliation |
| Commodore Quest 3 | [commodore-quest-3.md](ai-work/commodore-quest-3.md) | 1 draft rebuild PR |
| SEO and generated output | [seo-and-generated-output.md](ai-work/seo-and-generated-output.md) | 2 older open automation PRs; main already contains newer #2101 output |

## Always re-check before acting

- Fetch remotes: `git fetch origin --prune`.
- Inspect the target branch against current `origin/main`, including its merge base and changed paths.
- Query GitHub's open PR list and inspect PR status, review, and checks for every PR the task could affect.
- Do not infer that similarly named remote branches are active or ready; use an open PR or explicit ownership/evidence to establish relevance.

## Checkpoint update template

In the affected workstream file, record: date/time; branch/PR and base; verified current commit or merge-base relationship; files or interfaces touched; tests/checks actually run and result; blockers/decisions; and the smallest safe next action. If the open-PR inventory or top-level status changed, update this file too.
