# Lost Sizzler — Current Project State

## Current Release Target

- Intended public release model: static, zero-server GitHub Pages release. Online multiplayer services are intentionally excluded; local Solo and local split-screen remain supported.
- Current version: V10.42.
- Current promotion PR: #1852, `Lost Sizzler Solo stabilization programme`.
- Source branch: `codex/lost-sizzler-solo-stabilization`.
- Target branch: `main`.
- Current authoritative pre-fix checkpoint: `ed81a69ee8c29b546f0eb42c98ec857d326c6149` (documentation-only). The current fix candidate is this combined toast-ownership and checkpoint commit; verify its exact SHA from Git after commit/push.
- Current `main`: `623d3689a0ce2eabf51d9054635fe533d76b725a`.
- PR state: Draft; unmerged and conflict-free at the last verified GitHub inspection.

## Completion Estimate

- Overall project completion: 94%.
- Release readiness: 78%.
- Remaining work: obtain a complete green promotion gate for the locally validated R1 toast-retention correction on one frozen head, then complete guarded review, merge, deploy, and production smoke testing.

## Completed Major Systems

- [x] Core Lost Sizzler runtime and ordered V10.42 bootstrap.
- [x] Five-floor campaign and five-depth live transitions.
- [x] Floor/biome progression.
- [x] RPG attributes and progression.
- [x] Keys / Sigil progression.
- [x] Guardians and boss progression.
- [x] Banishment Essence, Vessel, and Alchemist systems.
- [x] Relic system.
- [x] A–Z rescued C64 game deck.
- [x] Campaign and player persistence.
- [x] Tutorial campaign.
- [x] Demo and paywall protections.
- [x] Local split-screen.
- [x] Zero-server public-release configuration.
- [x] R1 combat-timer, projectile, shop, dossier, and chest-delivery ownership hardening.
- [x] R50 zero-server multiplayer-recovery focus ownership hardening.

## Current Stabilisation Fixes

- `6998b5e14a0aa328976181cc2c94538eb06fa689` — `arcade/lost-sizzler/js/v10-42-r1-stability.js`: chest loot is marked delivered only after `baseApplyLoot` returns successfully; recovery records delivery failures and separates delivery from confirmation handling. Focused Node contracts passed. The browser confirmation contract remains blocked by a later toast replacement, not failed loot delivery.
- `889c2d67db6dd9c070e44653105f5d4adcca861c` — `arcade/lost-sizzler/js/v10-41-r50-multiplayer-recovery-ux.js`, `arcade/lost-sizzler/js/v10-42-zero-server-release.js`: zero-server/menu lifecycle owns final Solo-button focus after multiplayer recovery; removes the competing R50 delayed focus timer. Focused R50 and zero-server contracts passed; the subsequent full gate did not report an R50 failure.
- `f06fcb7cb54c9c061664e9df16095059d1b23a45` — `arcade/lost-sizzler/tests/browser/v10-42-r1-stability.mjs`: diagnostic-only failure snapshot around the unchanged 5,000 ms chest-confirmation wait. Syntax and available focused/non-browser contracts passed; remote diagnostic captured the current toast race.
- Current candidate (this commit) — `arcade/lost-sizzler/js/game-core.js`, `arcade/lost-sizzler/js/v10-42-r1-stability.js`: activates the existing toast queue only while an explicitly retained R1 confirmation is visible, then displays the deferred achievement. Chest delivery logic and reward values are unchanged. Syntax, focused R1-adjacent, achievement, notification, zero-server, R50, and available non-browser contracts passed; local Playwright is unavailable.

## Current CI State

- Latest completed Lost Sizzler Load Safety: #1700, run ID `34304788777`.
- Head tested: `f06fcb7cb54c9c061664e9df16095059d1b23a45`.
- Matrix: 100 browser-contract jobs, plus successful structure and contract-discovery jobs.
- Overall result: failed. Do not treat the promotion gate as green.
- Failing job: `Chromium · arcade/lost-sizzler/tests/browser/v10-42-r1-stability.mjs`.
- Failing step/error: `Run browser contract`; `page.waitForFunction: Timeout 5000ms exceeded` at `v10-42-r1-stability.mjs:124:16`, awaiting `#pickup-title === "CHEST REWARD CONFIRMED"`.
- Classification: R1 confirmation/UI ownership race — reward delivery succeeded, but `ACHIEVEMENT UNLOCKED` replaced the required chest confirmation toast. This is not a delivery failure or CI infrastructure failure.
- Companion workflow state for this head: Arcade Test Package, Arcade Quest Validation, CCG Publishing Automation Integrity, CCG Site Safety, and SEO Automation passed.
- Current fix candidate: untested remotely; do not infer a green gate from the documentation-only #1701 run or from local non-browser validation.

## Known Open Defects

- Severity: release-blocking pending remote validation. Subsystem: R1 chest confirmation notification ownership. Evidence: Load Safety #1700 diagnostic reports `p1Mana: 42`, `probeCalls: 1`, zero recovery/confirmation failures, and `pickupTitle: "ACHIEVEMENT UNLOCKED"` while the required chest toast never becomes visible. Root cause: confirmed — `game-core.js` immediately replaces ordinary pickup toasts, and the V10.29 snapshot awards `LS_SCORE_50000` after chest scoring, emitting `ACHIEVEMENT UNLOCKED`. Patch required: implemented locally; diagnosis is complete, but remote validation is outstanding.

## Remaining Work

### Must Complete Before Release

- [x] Trace and locally correct the chest-confirmation toast ownership/lifetime race without weakening the R1 contract.
- [ ] Run the complete Lost Sizzler Load Safety matrix successfully on the corrected, frozen head.
- [ ] Confirm all required companion workflows are green for that same head.
- [ ] Complete guarded promotion review while PR #1852 remains conflict-free.
- [ ] Merge only after approval, deploy GitHub Pages, and perform a live production smoke test.

### Recommended Before Release

- [ ] Re-run the focused browser R1 contract locally where Playwright is available before requesting the remote gate.
- [ ] Record the final production smoke-test evidence in the PR/release record.

### Deferred / Post-Release

- [ ] Public online-multiplayer backend. This is not a current release blocker because the authorised release is zero-server; enabling it safely requires server hosting, authentication/abuse controls, persistence/service operations, monitoring, and a dedicated release gate.

## Files Currently Expected To Change

None — awaiting remote CI evidence for the current candidate.

## Files That Must Not Be Touched

- `arcade/lost-sizzler/js/v10-42-r1-stability.js` — preserve the current chest-delivery ownership correction and the narrowly scoped retained-notification call.
- `arcade/lost-sizzler/js/game-core.js` — preserve the retained-toast queue handoff until the promotion gate has validated it.
- `arcade/lost-sizzler/js/v10-41-r50-multiplayer-recovery-ux.js` — preserve the verified R50 focus delegation.
- `arcade/lost-sizzler/js/v10-42-zero-server-release.js` — preserve the verified zero-server final-focus owner and public-release boundary.
- `arcade/lost-sizzler/tests/browser/v10-42-r1-stability.mjs` — preserve the confirmation requirement, 5,000 ms timeout, and current diagnostic capture; do not weaken it.

## Exact Next Step

Monitor the new Lost Sizzler Load Safety workflow for this commit, specifically `arcade/lost-sizzler/tests/browser/v10-42-r1-stability.mjs`, to validate that retained `CHEST REWARD CONFIRMED` displays before the deferred achievement and that the unchanged 5,000 ms requirement passes. Proceed to guarded review only if the full matrix and companion workflows are green for the exact pushed head; STOP and classify any failed job before changing `arcade/lost-sizzler/js/game-core.js` or `arcade/lost-sizzler/js/v10-42-r1-stability.js` again.

## Recent Guarded History

- `21a93b75d3e8ce96eaf9f8870ee56933197f4d32`: frozen guarded verification candidate.
- `7bced39ec64f662e5583740891a346d548ffde67`: guarded integration checkpoint merged by PR #1879.
- `6998b5e14a0aa328976181cc2c94538eb06fa689`: R1 chest-delivery ownership correction; Load Safety #1698 later exposed an unrelated R50 focus failure.
- `889c2d67db6dd9c070e44653105f5d4adcca861c`: R50 zero-server focus ownership correction; Load Safety #1699 exposed the R1 confirmation wait failure.
- `f06fcb7cb54c9c061664e9df16095059d1b23a45`: diagnostic-only R1 test commit; Load Safety #1700 proved successful delivery followed by achievement-toast replacement.
- Current candidate: retains the R1 confirmation in the ordinary pickup notification area, queues the later score achievement, and then presents it after the confirmation ends; remote validation pending.

## Release Exit Criteria

- [ ] Complete Lost Sizzler Load Safety gate green.
- [ ] Required companion workflows green on the same head.
- [ ] Exact head frozen after green CI.
- [ ] PR mergeable and conflict-free.
- [ ] Guarded promotion review complete.
- [ ] Safe merge to `main`.
- [ ] Successful GitHub Pages deployment.
- [ ] Live production smoke test complete.
- [ ] No critical regressions.
