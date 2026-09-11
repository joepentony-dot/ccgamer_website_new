# C64 Dungeon Carnage — Current Project State

> Legacy repository path: `arcade/lost-sizzler/`. The game has been renamed C64 Dungeon Carnage; historical workflow and path names may still use “Lost Sizzler”.

## Current Release State

- Public release model: static, zero-server GitHub Pages release.
- Current version: V10.42.
- Integrated promotion PR: #1954, `Verify complete C64 Dungeon Carnage stability and XP promotion`.
- Promotion head: `f1f750c2b96786be7d3bc886ff7256a76dd0ddb7`.
- Promotion gate: Lost Sizzler Load Safety #1836, run `34654313957` — **SUCCESS, 106/106 jobs green**.
- Promotion merge commit on `main`: `b33689f99beeafc0419815414cc6e188b0f9ca75`.
- PR #1954 is merged.

## Promoted Stability / Progression Fixes

The merged candidate includes the guarded fixes for:

- pause/resume attack liveness;
- stale combat cooldown and invulnerability recovery;
- dedicated Warden HUD ownership;
- repeated environmental SFX suppression;
- progression-XP protection so hidden/bronze doors, switches and chests do not award progression XP;
- zero-XP chest metadata and feedback while preserving normal enemy/combat XP;
- hardened R1 chest confirmation ownership;
- R31 chest composition around the live `window.openChest` chain;
- retirement of the obsolete R56 chest-delivery owner while preserving the valid R56 shrine owner;
- zero-server public release and existing local Solo/split-screen support.

## Verification Evidence

- Full pre-merge Load Safety gate #1836 passed on the exact frozen promotion head.
- The formerly failing R56 mode-owned wrapper contract passed after the final ownership correction.
- R1 chest stability, pause/attack liveness, R18 Solo stability, zero-server release and XP-source contracts passed in the same matrix.
- Scope of PR #1954 remained confined to 17 files under `arcade/lost-sizzler/`.
- Protected website intro-loader files, `games/games.json`, Supabase data and unrelated website systems were not part of the promotion PR.

## Post-Merge Validation

Post-merge workflows were triggered from merge commit `b33689f99beeafc0419815414cc6e188b0f9ca75`:

- Lost Sizzler Production Smoke #34 — run `34658079377`.
- Lost Sizzler Load Safety #1837 — run `34658079411`.

These post-merge runs are the final production confirmation layer. Do not change runtime code solely to update this document; classify any genuine post-merge failure before modifying the promoted implementation.

## Release Exit Criteria

- [x] Complete pre-merge Load Safety gate green.
- [x] Exact promotion head frozen after green CI.
- [x] PR mergeable and conflict-free.
- [x] Guarded promotion review completed.
- [x] Safe merge to `main`.
- [ ] Post-merge production smoke successful.
- [ ] Post-merge Load Safety successful.
- [ ] Live production game check completed.
- [ ] No critical regressions found after deployment.

## Files To Preserve

Unless new evidence identifies a specific regression, preserve the promoted ownership and release boundaries in:

- `arcade/lost-sizzler/js/v10-42-r1-stability.js`
- `arcade/lost-sizzler/js/game-core.js`
- `arcade/lost-sizzler/js/v10-41-r50-multiplayer-recovery-ux.js`
- `arcade/lost-sizzler/js/v10-42-zero-server-release.js`
- the R31 chest-composition layer and its regression contracts;
- the retained R56 shrine owner and retirement of the superseded R56 chest owner.

Do not weaken browser contracts to obtain a green result. Production changes require evidence from a reproducible failing contract or smoke test.

## Exact Next Step

Verify the two post-merge runs above and the deployed game. If both workflows are green and production smoke confirms the deployed build, mark the remaining release exit criteria complete. If either fails, isolate the exact failed contract first and make only a narrowly scoped correction.