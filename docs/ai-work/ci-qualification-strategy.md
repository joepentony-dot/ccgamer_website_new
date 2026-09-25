# CCG CI Qualification Strategy

This document records the intended CI split for C64 Dungeon Carnage and shared-site regression checks.

## PR qualification

Dungeon Carnage pull requests run a fast qualification path:

- canonical route and structure checks
- JavaScript and test syntax checks
- retained Node regression contracts
- one focused Chromium job using a single browser installation
- high-value browser smoke coverage for loading, campaign loading, current live defects, bug reporting, and shop feedback
- deterministic itch.io staging plus a browser boot of the staged supported modes in that same Chromium job, so package-only breakage is caught before merge without installing Chromium twice

The PR path is intended to catch likely regressions without running the complete browser matrix after every small game edit.

## Full Dungeon Carnage qualification

The existing legacy-path workflow file, `.github/workflows/lost-sizzler-load-safety.yml`, remains in place to avoid risky path churn. Its displayed workflow name is **C64 Dungeon Carnage Full Qualification**.

The full qualification includes the complete retained Chromium matrix split across six shards. It runs:

- automatically **before merge** when a PR changes high-risk Dungeon Carnage engine/gameplay surfaces
- automatically after relevant changes reach `main`
- manually through `workflow_dispatch` when a full pre-merge or release qualification is wanted

### Risk-based pre-merge rule

Small and isolated changes stay on the fast PR path. Examples include copy, documentation, artwork/audio assets, and CSS-only presentation work that does not modify the Dungeon runtime.

Every JavaScript file under `arcade/lost-sizzler/js/**` is treated as high risk by default. This deliberately avoids filename-based gaps: newly named or versioned gameplay modules cannot silently bypass the full gate. A PR also receives the full six-shard pre-merge qualification when it touches the Dungeon entry page, tests, service-worker/PWA loading code, or the qualification workflows themselves.

The high-risk runtime surface includes areas such as:

- game engine/runtime and bootstrap code
- enemy AI
- combat, attack, projectile or ownership code
- player state and inventory architecture
- saving/loading and cloud state
- progression
- floor, room, biome, zone or procedural generation
- campaign or encounter logic
- networking
- the Dungeon Carnage browser/Node qualification tests themselves
- service-worker/PWA code that can affect game loading

This is enforced by the workflow path rules rather than relying on a manual decision. The fast path therefore remains available for non-runtime assets, copy, documentation and CSS-only work, while runtime JavaScript defaults to the complete pre-merge matrix.

## Native mouse-wheel contract

The native mouse-wheel contract is scoped to shared/global site CSS and JavaScript plus the specific site pages exercised by the audit. Isolated Dungeon Carnage runtime JavaScript no longer starts this site-wide browser contract.

The contract itself is unchanged and can still be run manually.

## CCG Site Safety

Full CCG Site Safety no longer runs on pull requests whose changes are isolated to `arcade/lost-sizzler/**`. It still runs on every push to `main`, and it still runs on PRs that change the shared site surfaces covered by its path filters.

## itch.io package

Pull requests continue to build and structurally verify the deterministic itch.io package in the package workflow. The focused Dungeon Carnage PR Chromium job also builds a temporary staged package and boots its supported modes using the Chromium installation that job already owns. The package workflow keeps its own packaged Chromium smoke for `main` and manual qualification, avoiding a second browser installation on pull requests while retaining pre-merge staged-artifact coverage.

## Safety principle

The optimisation changes when expensive tests run; it does not delete the full regression suites. High-risk changes retain full pre-merge qualification, small changes use the faster targeted path, and the integrated main branch receives the final full qualification.
