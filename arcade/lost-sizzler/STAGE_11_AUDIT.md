# Lost Sizzler Stage 11 Full Regression and Release Review

## Entry gate

Stage 10 acceptance head `88a3fd9f93fd74347d3fd4791eee4c2270ae0d0d` completed all six canonical pull-request workflows successfully:

- Lost Sizzler Load Safety #1198
- Arcade Test Package #1345
- Arcade Quest Validation #1672
- SEO Automation #4148
- CCG Publishing Automation Integrity #318
- CCG Site Safety #3139

Stage 11 may therefore begin on the same draft and unmerged PR #1852 branch.

PR #1860 remains outside this programme and must not be edited, merged or otherwise mutated. Protected website/Omega files and `games/games.json` remain outside scope. Supabase Storage/database data must not be mutated.

## Stage 11 purpose

Stage 11 is the final whole-programme regression and release-readiness review. It must not become another broad feature programme. The goal is to prove that the accepted Solo, Horde and Spy work composes safely on one release candidate, that the canonical delivery surfaces still point at the intended Lost Sizzler runtime, and that remaining defect-ledger items can be closed or explicitly carried as known non-release-blocking observations.

## Release-review order

1. **Canonical suite completeness** — verify the pull-request Load Safety workflow still executes every root Node contract and every browser contract, including the long Solo soak and all Stage 8-10 focused suites.
2. **Whole-mode ownership regression** — confirm Solo, Horde and Spy retain their accepted timing/update/movement/damage/network boundaries and that no later stage reopened another mode's ownership.
3. **Lifecycle regression** — confirm fresh start, pause/resume, focus/visibility, Save & Quit -> Continue, quit-to-menu and repeated mode re-entry remain covered and green together.
4. **Long-session regression** — retain Solo stabilization/long-session soaks plus Horde and Spy sustained-session coverage, with bounded timers/owners and no browser errors.
5. **Release-route integrity** — verify canonical `/arcade/lost-sizzler/` routing, legacy redirect/entry surfaces, cache/version metadata and PWA/service-worker references stay coherent without stale self-references.
6. **Defect-ledger disposition** — review every remaining `OPEN`/`VERIFYING` stabilization item against the final canonical evidence; close only where its exit criterion is satisfied and do not rewrite history.
7. **Protected-surface review** — confirm the programme did not modify intro/Omega protected structures, `games/games.json`, PR #1860 or Supabase data.
8. **Release candidate gate** — create the smallest final release-review record only after the exact gameplay/review head passes all six canonical workflows.

## Existing evidence entering Stage 11

The canonical Load Safety workflow currently:

- validates the canonical Lost Sizzler structure and route references;
- syntax-checks `service-worker.js`, `js/ccg-pwa.js`, every Lost Sizzler JavaScript file and every `.mjs` test;
- executes every root `arcade/lost-sizzler/tests/*.mjs` Node contract except the two browser-only legacy entries;
- executes the legacy browser contracts;
- executes every `arcade/lost-sizzler/tests/browser/*.mjs` contract;
- gives the long Solo soak a fresh-browser retry only to distinguish runner starvation from deterministic regressions;
- publishes the exact failing Chromium contract marker on failure.

Stages 7-10 already provide accepted focused evidence for Solo timing/ownership/lifecycle, Stage 8 Solo expansion, Horde reconstruction and Spy reconstruction. Stage 11 therefore starts by looking for gaps or contradictory evidence, not by replacing those suites.

## Release blockers

A Stage 11 finding is a release blocker if it demonstrates any of the following on the exact release-review head:

- canonical CI failure attributable to Lost Sizzler runtime, route, packaging or test contracts;
- reproducible Solo slowdown/acceleration, ownership growth or lifecycle failure after the accepted bounded-clock work;
- Horde or Spy cross-mode contamination into Solo or each other;
- Save/Continue or fresh-start failure in canonical lifecycle coverage;
- unbounded recurring owner/timer/listener growth in stable play;
- stale canonical route/cache/version references that would make the merged build serve or launch the wrong runtime;
- uncaught browser errors in accepted focused or sustained-session suites;
- protected-surface changes required to make the branch pass.

## Non-blocking observations

Historical defect-ledger entries may remain useful as provenance even after their exit criteria are satisfied. Stage 11 may close those entries with final exact-head evidence, but must not delete the historical evidence trail merely to make the ledger look empty.

## Stage boundary

PR #1852 must remain draft and unmerged throughout Stage 11. The branch becomes a release-ready candidate only when:

1. the Stage 11 review finds no unresolved release blocker;
2. any defect-ledger status updates are evidence-backed;
3. the final Stage 11 acceptance/release-review head completes all six canonical workflows successfully.

Even then, do not merge PR #1852 until the user explicitly changes the standing instruction.
