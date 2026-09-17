# Dungeon Carnage live freeze / stopped-firing cache-ownership regression — 17 September 2026

## Scope

This record captures the current-build live regression reported after the seven-item Dungeon Carnage live-defect remediation programme had completed repository-side. The affected customer-facing game remains C64 Dungeon Carnage under the legacy repository path `arcade/lost-sizzler/`.

## Recovered starting checkpoint

- Pre-regression `main`: `fecf008d8eb751436caca89cdd69e16be808cd35`.
- Active investigation branch: `codex/dungeon-live-freeze-firing-current-main`.
- PR: #2129 — Diagnose Dungeon Carnage live freeze and firing regression.
- Exact qualified PR head: `585cda263e2f0c9a626fef61d19bae9635d2087f`.
- The live failure reproduced as gameplay freezing/stalling and/or firing stopping before the outstanding Defect 5 Banishment Flask acceptance could be reached.

## Proven root cause

The supported current build had a split release/cache identity.

The authoritative V10.42 bootstrap identified the release as `V10.42 r30` with cache token `20260917r30`, while the blocking `index.html` still identified and directly loaded the base runtime stack under `2026.09.10.1` / `20260910r1`.

That mismatch affected the initial cache guard and directly loaded frame/input/runtime owners, including the base gameplay stack before the ordered V10.42 bootstrap took ownership. A browser that had already sanitised its cache at the September 10 token could therefore treat that stale generation as current. The bootstrap handoff could also be requested using the obsolete query token before the later bootstrap restamped the visible page identity to r30.

The result was a supported mixed-generation path: stale base frame/input/attack owners could coexist with current r30 ordered modules. A visible `BUILD V10.42 R30` badge therefore did not prove that every loaded runtime owner belonged to r30.

Classification: **current-main release/cache ownership failure**. No evidence required reverting or changing #2118 projectile lifecycle semantics.

## Bounded correction in #2129

#2129 synchronised the release identity without changing gameplay mechanics:

- blocking page build identity → `V10.42 r30`;
- blocking page cache identity → `20260917r30`;
- every directly loaded Dungeon CSS/JS asset in the canonical page uses `20260917r30`;
- `version.json` carries the same r30 build/cache identity;
- the cache guard therefore sees r30 before gameplay owners execute;
- September 10 runtime assets are treated as stale;
- the bootstrap handoff and ordered V10.42 module chain stay on the same cache generation.

The correction deliberately does not change projectile lifecycle mechanics, firing cadence, movement semantics, save data, Solo/Tutorial/local Split Screen ownership, or Defect 5 shop logic.

## Changed-file scope

The exact qualified PR contains six files:

- `arcade/lost-sizzler/index.html`
- `arcade/lost-sizzler/version.json`
- `arcade/lost-sizzler/tests/browser/v10-42-live-solo-combat-endurance.mjs`
- `arcade/lost-sizzler/tests/v10-22-version-cache.mjs`
- `arcade/lost-sizzler/tests/v10-42-r30-release-cache-identity.mjs`
- `arcade/lost-sizzler/tests/v10-42-update-marker-contract.mjs`

## Regression coverage

`v10-42-r30-release-cache-identity.mjs` requires the blocking page meta, `version.json`, bootstrap constants and direct local script/style query tokens to agree on r30.

`v10-42-live-solo-combat-endurance.mjs` exercises supported Solo gameplay through the real browser runtime across repeated combat cycles and verifies r30 ownership, #2118 projectile lifecycle ownership, sealed update ownership, generated enemies, real projectile/damage/death ownership, Space/F/Numpad0 firing, held/release cycles, movement between combat cycles, pause/resume recovery, continued simulation elapsed time, continued projectile stepping, bounded projectile/visual collections, and absence of accumulating update/render/direct-fire/runtime/script failures.

The first CI attempt exposed external Supabase/local-fixture CORS noise after the endurance exercise had completed. The fixture was isolated without weakening gameplay assertions, collection bounds, ownership assertions or timeouts.

## Exact-head qualification

For `585cda263e2f0c9a626fef61d19bae9635d2087f`, all PR-triggered workflows were green before merge:

- Public Code Cache Version
- SEO Automation
- Native Mouse Wheel Scroll Contract
- Social Metadata Validation
- Structured Data Validation
- CCG Site Safety
- Lost Sizzler Load Safety

There were no review submissions, no review threads, no conflicts, and the PR remained mergeable. Cloudflare also reported a successful deployment of the exact PR head to its preview environment.

## Merge result

- PR #2129 was marked ready and merged on 17 September 2026 under the standing autonomous merge authorization.
- Exact merged head: `585cda263e2f0c9a626fef61d19bae9635d2087f`.
- Merge commit on `main`: `218025ce2beac3765d65ca9b838e8afd58a5eedf`.

## Live acceptance state

Repository-side correction is complete. Product-level acceptance is still required on the deployed current build.

The first acceptance must be a short sustained Solo test, not the longer Flask grind:

1. Start Solo.
2. Move normally and fight real enemies.
3. Fire repeatedly through several press/hold/release cycles.
4. Continue playing long enough to confirm that firing does not stop and the game does not freeze or stall.
5. Include at least one pause/resume cycle if practical, then confirm firing and movement continue.

Only after that passes should the existing Defect 5 deployed acceptance resume:

1. obtain 3 Artefacts/Essences;
2. do not buy a Banishment Flask with Gold first;
3. note Gold and Score;
4. perform the 3 Artefacts/Essences → Banishment Flask exchange;
5. confirm exactly one Flask is received;
6. confirm Gold is unchanged;
7. confirm Score is unchanged;
8. confirm no prior Gold Flask purchase was required.

## Exact next action

Verify that the merge commit is deployed successfully, then perform the short sustained Solo live acceptance. If the freeze/stopped-firing regression no longer reproduces, resume the existing Defect 5 Banishment Flask acceptance. Do not change Defect 5 code unless that separate deployed acceptance actually fails.
