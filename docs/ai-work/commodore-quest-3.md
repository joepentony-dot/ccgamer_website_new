# Commodore Quest 3

## Scope

The Quest 3 rebuild under `arcade/quest/`, its public game page, service-worker integration, validation workflow, and Quest-specific browser/contract tests.

## Verified checkpoint — 2026-09-16

Open PR #2056, `codex/commodore-quest-v3-rebuild`, remains a draft: **Rebuild Commodore Quest as Quest 3.0**. It changes 17 files and includes the modular rebuild specification/runtime, Quest tests, public page, service-worker cache namespace and Quest validation workflow.

Live ancestry against current `main` `fa25ee38bd97426a392b7415ae3534793eb4fcd9`:

- head: `156470bee1b1a2a2fe3d5bef562d5f5d0ac81af9`
- merge base: `58e401de087c6f8552372ce6c9c4d404093e3260`
- branch: 26 commits ahead of its merge base
- current `main`: 192 commits ahead of that branch head relationship
- PR is currently non-mergeable and requires reconciliation before integration

The intervening mainline includes substantial Dungeon, Content Publisher, publishing workflow, generated-output and cache/version work, so the old shared-file changes must not be merged wholesale without reconciling them with current ownership.

## Guardrails and next action

Do not use #2056 as an incremental base until its `service-worker.js`, public page, validation workflow and game-module changes have been reconciled with current `main`. Keep browser/static contract coverage paired with any refreshed game runtime changes.

Next safe action: compare the 17-file Quest-specific intent with current `main`, then rebuild or rebase the still-valid changes as a current-main candidate and rerun the Quest validation plus shared repository safety checks. Do not merge the current stale draft directly.

## Session log

- 2026-09-16: Initial continuation checkpoint created from the live PR and fetched branch. No Quest files changed.
- 2026-09-16: Live re-audit against `fa25ee38...` confirmed #2056 is now 192 mainline commits behind in the compare relationship and remains non-mergeable; no Quest runtime files were changed.
