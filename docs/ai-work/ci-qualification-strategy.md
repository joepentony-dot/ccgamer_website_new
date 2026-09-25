# CCG CI Qualification Strategy

This document records the intended CI split for C64 Dungeon Carnage and shared-site regression checks.

## PR qualification

Dungeon Carnage pull requests run a fast qualification path:

- canonical route and structure checks
- JavaScript and test syntax checks
- retained Node regression contracts
- one focused Chromium job using a single browser installation
- high-value browser smoke coverage for loading, campaign loading, current live defects, bug reporting, and shop feedback

The PR path is intended to catch likely regressions without running the complete browser matrix after every small game edit.

## Full Dungeon Carnage qualification

The existing legacy-path workflow file, `.github/workflows/lost-sizzler-load-safety.yml`, remains in place to avoid risky path churn. Its displayed workflow name is **C64 Dungeon Carnage Full Qualification**.

The full qualification includes the complete retained Chromium matrix split across six shards. It runs:

- automatically after relevant changes reach `main`
- manually through `workflow_dispatch` when a full pre-merge or release qualification is wanted

## Native mouse-wheel contract

The native mouse-wheel contract is scoped to shared/global site CSS and JavaScript plus the specific site pages exercised by the audit. Isolated Dungeon Carnage runtime JavaScript no longer starts this site-wide browser contract.

The contract itself is unchanged and can still be run manually.

## CCG Site Safety

Full CCG Site Safety no longer runs on pull requests whose changes are isolated to `arcade/lost-sizzler/**`. It still runs on every push to `main`, and it still runs on PRs that change the shared site surfaces covered by its path filters.

## itch.io package

Pull requests continue to build and structurally verify the deterministic itch.io package. The packaged Chromium smoke is reserved for `main` and manual qualification, avoiding a second browser installation on every game PR.

## Safety principle

The optimisation changes when expensive tests run; it does not delete the full regression suites. Full qualification remains available at any time and continues to run automatically on the integrated main branch.
