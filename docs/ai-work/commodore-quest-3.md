# Commodore Quest 3

## Scope

The Quest 3 rebuild under `arcade/quest/`, its public game page, service-worker integration, validation workflow, and Quest-specific browser/contract tests.

## Verified checkpoint — 2026-09-16

Open PR #2056, `codex/commodore-quest-v3-rebuild`, remains a draft: **Rebuild Commodore Quest as Quest 3.0**. It changes 17 files and includes the modular rebuild specification/runtime, Quest tests, public page, service-worker cache namespace and Quest validation workflow.

Stable ancestry facts from the live audit:

- head: `156470bee1b1a2a2fe3d5bef562d5f5d0ac81af9`
- merge base: `58e401de087c6f8552372ce6c9c4d404093e3260`
- Quest branch: 26 commits ahead of its old merge base
- current mainline has advanced substantially beyond that branch through later Dungeon, publishing, generated-output and continuation work

GitHub may mechanically report the PR mergeable at times, but it is **not integration-ready**. Shared files such as `service-worker.js`, public-page integration and validation workflow ownership must be reconciled against live `main`; a mergeability flag is not evidence that the old branch should be merged wholesale. The PR's own safety gate also requires exact-head green checks and hands-on browser playtesting before integration.

## Guardrails and next action

Do not use #2056 as an incremental base until its 17-file intent is compared with current `main`. Keep browser/static contract coverage paired with any refreshed Quest runtime changes.

Next safe action, when the Quest workstream is resumed: rebuild or rebase only the still-valid Quest-specific changes as a current-main candidate, reconcile shared files explicitly, then run Quest validation plus relevant repository safety checks and complete the required hands-on browser acceptance. Do not merge the current stale draft directly.

## Session log

- 2026-09-16: Initial continuation checkpoint created from the live PR and branch.
- 2026-09-16: Re-audit after #2102 confirmed the Quest branch remained materially behind current mainline work while retaining 26 branch commits.
- 2026-09-16: Post-#2104 reconciliation removed brittle moving-main counts while preserving the integration boundary. No Quest runtime files were changed during repository convergence.
