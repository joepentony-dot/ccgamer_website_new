# C64 Dungeon Carnage — Current Work Register

> Legacy repository path: `arcade/lost-sizzler/`. The customer-facing game name is **C64 Dungeon Carnage**. Historical internal identifiers may still use `Lost Sizzler` where compatibility requires them.

## Audit checkpoint

- Audited: **17 September 2026**.
- Runtime checkpoint before this documentation update: `218025ce2beac3765d65ca9b838e8afd58a5eedf`, merge of post-program live regression PR #2129.
- The seven-item repository-side live-defect remediation programme has completed through #2117, #2118, #2119, #2123, #2090, #2125 and #2126.
- A later current-build freeze/stopped-firing regression is repository-fixed through #2129; product-level closure still requires a short sustained Solo live acceptance on the deployed current build.
- Defect 5 still has a deployed/manual acceptance gate under the closure rule below. Resume that acceptance only after the post-#2129 Solo stability check passes; there is no remaining repository-side correction currently proven necessary for Defect 5.
- No active Dungeon runtime defect PR remains. The current `codex/dungeon-2129-checkpoint` branch is documentation-only.
- A merged PR is not treated as a closed user-reproduced defect until the deployed behaviour is manually accepted where this register explicitly requires that acceptance.

## Authoritative live-defect programme status — 17 September 2026

| Priority | Defect | Status |
| --- | --- | --- |
| 1 | Public-beta watchdog replaces the final menu with COMING SOON and disabled controls after initial paint. | **REPOSITORY-COMPLETE — #2117** |
| 2 | Sustained firing/enemy hits retain projectile entities and progressively slow the game. | **REPOSITORY-COMPLETE — #2118** |
| 3 | Completion portal does not advance Floor 1 to the next campaign depth. | **REPOSITORY-COMPLETE — #2119** |
| 4 | Save and Exit does not restore a supported run through Continue. | **REPOSITORY-COMPLETE — #2123** |
| 5 | Three-Artefact Banishment Flask exchange only works after a Gold purchase. | **VERIFYING — repository path complete through #2090; deployed/manual acceptance still required** |
| 6 | Owned Firearms do not communicate meaningful weapon differences. | **REPOSITORY-COMPLETE — #2125** |
| 7 | Remaining Sizzler/Zzap!/Uncommon RPG wording needs coherent setting-appropriate replacement. | **REPOSITORY-COMPLETE — #2126** |

## Post-program live regression — freeze / stopped firing

After the seven-item repository programme completed, the deployed/current V10.42 r30 build reproduced a separate Solo failure where gameplay could freeze/stall and/or firing could stop before the outstanding Defect 5 shop acceptance could be reached.

PR #2129 proved a split release/cache identity on the canonical page. The authoritative V10.42 bootstrap used `V10.42 r30` / `20260917r30`, while the blocking page still identified and directly loaded the base runtime stack under `2026.09.10.1` / `20260910r1`. That allowed a supported mixed-generation path in which stale base frame/input/attack owners could coexist with current r30 ordered modules even though the visible badge later showed r30.

#2129 synchronised the blocking page build/cache identity, direct Dungeon CSS/JS query tokens and `version.json` to r30. It did not change projectile lifecycle mechanics, firing cadence, movement semantics, save data, supported mode ownership or Defect 5 shop logic.

- Exact qualified #2129 head: `585cda263e2f0c9a626fef61d19bae9635d2087f`.
- Merge commit: `218025ce2beac3765d65ca9b838e8afd58a5eedf`.
- All seven PR-triggered exact-head workflows passed before merge.
- The exact PR head also received a successful Cloudflare preview deployment.
- Detailed checkpoint: `docs/ai-work/dungeon-carnage-live-freeze-cache-2026-09-17.md`.

Repository status: **REPOSITORY-COMPLETE — #2129**. Product-level status remains **VERIFYING** until a short live Solo endurance check confirms that firing continues and the game does not freeze/stall on the deployed current build.

### Defect 7 final terminology boundary

PR #2126 preserved the historical rarity identities used internally for progression/save compatibility while replacing only player-facing labels:

- `UNCOMMON` → `RARE`
- `SIZZLER` → `ENCHANTED`
- `GOLD MEDAL` → `RELIC`
- `ZZAP! 97%` → `LEGENDARY`
- visible `Zzap! Citadel guardian` → `Citadel guardian`

The exact candidate head `f70f816910fab8d07aaf946f140b593c9220f1ef` passed all retained exact-head workflows, including canonical/Node qualification and all six Chromium shards, before merge. Detailed record: `docs/ai-work/dungeon-carnage-rpg-terminology-2026-09-17.md`.

## Status definitions

- **PRESENT** — implementation is on audited `main` and no current contrary reproduction is recorded.
- **OPEN** — requested outcome is not complete.
- **PARTIAL** — a foundation is present, but requested follow-on work remains.
- **VERIFYING** — implementation and automated coverage exist, but required live/manual acceptance is still outstanding.
- **REPOSITORY-COMPLETE** — bounded repository correction is merged and qualified; any separately documented deployment/manual acceptance gate still applies.
- **SUPERSEDED** — no longer part of the intended release path.
- **QUEUED SEPARATELY** — valid repository work deliberately isolated from Dungeon Carnage runtime changes.

## Present on audited main

| Area | Status | Current evidence / boundary |
| --- | --- | --- |
| Supported release modes | PRESENT | Solo, Tutorial and local 2P Split Screen remain supported gameplay modes. Weekly Vault/account services remain supported menu/account functionality. |
| Retired online entry/lobby | PRESENT | Networked Dungeon Multiplayer entry/lobby controls are removed and obsolete hard startup bindings are detached. Horde Survivor and Spy/Sizzler Saboteurs are retired product modes. |
| Retained local runtime extraction | PRESENT | #2102 moved the active local gameplay suffix from `game-network.js` into `game-local-runtime.js`, preserving supported local gameplay ownership. |
| Retired multiplayer runtime removal | PRESENT | #2113 replaced the obsolete online packet routing, remote-player simulation and world serializer/receiver layer in `game-network.js` with inert compatibility owners. Regression contracts prohibit that retired transport/world-sync behaviour from returning while preserving the local RoomNetwork session shell still used by supported modes. |
| Local Split Screen full map | PRESENT | #2115 restored the explored full dungeon map for supported local Split Screen while keeping the established P1 exploration knowledge and local input ownership intact. |
| Five-depth campaign foundation | PRESENT | The ordered V10.42 bootstrap loads the five-depth campaign and floor-balance layers. |
| Five-depth environment identity | PRESENT | R6 supplies distinct Threshold, Iron, Bone, Ash and Sigil environment identities. |
| Five-depth room grammar | PRESENT | #2098 adds R24 deterministic room identities, landmarks, route moods, approach cues, foreshadowing and role/rare-role grammar. R24 is semantic metadata only and does not claim simulation, collision, progression, save or network ownership. |
| RPG build focus / stat-10 specialisations | PRESENT | The R23 build-focus/specialisation chain remains present for Vitality, Agility, Endurance and Arcana while preserving established floor caps. |
| Local Split Screen campaign state | PRESENT | Local 2P campaign state remains supported and must be preserved during later cleanup. |
| XP source boundary | PRESENT | Progression XP remains intended for combat and explicit XP rewards rather than ordinary doors, switches, chests or traps. |
| Gold economy | PRESENT | Ordinary shop stock uses Gold with its existing pricing. The separate 10 Gold Banishment Flask route remains available. |
| Public game identity | PRESENT | #2090 keeps the visible runtime subtitle at `C64 DUNGEON CARNAGE — V10.42`; historical internal/path identifiers remain only where compatibility requires them. |
| Owned Firearms differentiation | PRESENT | #2125 exposes meaningful firearm differences already present in runtime data without changing acquisition, switching or combat ownership. |
| RPG rarity terminology | PRESENT | #2126 reconciles player-facing rarity/objective terminology while retaining historical internal rarity keys for compatibility. |
| NPC/content foundations | PRESENT | Existing R7–R16 layers provide room objectives, breakables, encounter direction/progression, combat bridging, NPC data and environment presentation. This is a foundation, not completion of the wider NPC/merchant request. |
| Warden expansion | PRESENT | Warden purpose, domain progression, cleansing, charge routes, hunt guidance, navigation cues and interface consistency remain in the ordered bootstrap. |
| Weekly Vault/account surface | PRESENT | Weekly Vault/account functionality remains available and is protected from retired-mode cleanup. |

## Merged work still awaiting live acceptance

| Area | Status | Remaining acceptance |
| --- | --- | --- |
| #2129 freeze/stopped-firing regression | **VERIFYING** | Confirm on the deployed/current build that sustained Solo movement, real enemy combat and repeated firing/hold/release cycles continue without firing stopping or the game freezing/stalling. |
| 3-Artefact Banishment Flask exchange | **VERIFYING** | #2090 is merged and automated coverage passes for both legacy physical Artefacts and the current V10.42 `banishmentEssence` representation without spending Gold/Score. Product-level closure still requires the deployed/current build to be manually checked after #2129 stability acceptance passes. |

## Partially completed work

| Area | Status | Remaining work |
| --- | --- | --- |
| Banishment terminology | **PARTIAL** | Runtime and customer-facing layers still contain a mixture of Artefact, Essence, Vessel and Ward-Break wording. Reconcile that separate terminology only after the live Flask behaviour is manually verified, so documentation follows demonstrated behaviour rather than assumption. |
| NPC / merchant expansion | **PARTIAL** | NPC dialogue/quest data exists, but deeper world integration, merchant/service behaviour and finished reward/content flows remain. |
| Startup/menu simplification | **PARTIAL** | Useful presentation ideas from the now-closed stale #2055 candidate may still be re-derived. Rebuild only valid pieces as small current-main stages; do not restore retired online modes. |
| Final release qualification | **VERIFYING** | A fresh supported-mode acceptance pass is required after remaining product/release work. |

## Requested work not yet implemented

These are post-defect product/backlog items. They are **not** additional defects in the completed seven-item remediation programme and should not be started merely to keep that programme running.

| Area | Status | Required outcome |
| --- | --- | --- |
| Four elemental portals | **OPEN** | Build strongly signposted Water, Fire, Earth and Air portal routes with distinct zone identities and content direction. |
| Larger/grander procedural topology | **OPEN** | Build materially larger and more distinctive procedural spaces for the portal/zone structure. R24 describes existing generated rooms and does not satisfy this topology request. |
| Deeper zone-specific content | **OPEN** | Extend enemies, bosses/elites, items/Artefacts, events, secrets and encounter patterns so the zones differ mechanically as well as thematically. |
| Finished NPC/merchant integration | **OPEN** | Turn existing NPC foundations into finished in-world interactions, merchant/service behaviour and content rewards integrated with the established economy and final zone structure. |
| itch.io release handoff | **OPEN** | itch.io is the intended purchase/download route. Retain the CCG website as the branded landing/demo experience and perform an end-to-end package/release check. |

## Superseded work

The old PayPal-specific checkout/paywall/download plan is **SUPERSEDED** and its historical PR graph has been closed without merge. The old provider-neutral packaging/Windows PR stack has also been retired as an integration vehicle; reusable ideas remain available in Git history and must be re-derived against current `main` for the itch.io release.

Horde Survivor, Spy Vs Spy/Sizzler Saboteurs and networked Dungeon Multiplayer are retired product modes. Historical files/tests may still reference them as compatibility or evidence, but their old feature backlog, menu entries, leaderboards and online product flows are not active release requirements.

## Historical evidence

`STABILIZATION_DEFECTS.md` preserves the earlier Solo stabilization programme and its frozen evidence/exit criteria. It is **not** the current Dungeon Carnage backlog. Historical Horde/Spy/online-mode references in that ledger document past testing and do not reactivate those retired modes.

## Separate queued repository work

- Content Publisher 3D-box optimisation is complete through merged #2105; superseded #2073 is closed.
- Game-music Worker endpoint follow-up #2110 is tracked separately and remains blocked by Cloudflare account-side runtime/build configuration; it is not a Dungeon runtime prerequisite.

## Current work order

1. **Verify that #2129 / `218025ce2beac3765d65ca9b838e8afd58a5eedf` is deployed, then live-test sustained Solo stability.** Use normal movement, real enemy combat and several firing press/hold/release cycles; confirm firing does not stop and the game does not freeze/stall. Include pause/resume recovery if practical.
2. **Only after #2129 stability acceptance passes, live-verify the 3-Artefact Banishment Flask exchange.** Automated qualification is complete; manual acceptance remains.
3. **If both live checks pass, mark the seven-item live-defect programme and the later #2129 regression product-complete.** If either fails, reproduce against the then-current deployed `main` and create a new bounded defect rather than reviving stale branches.
4. **Reconcile the separate Banishment customer-facing Artefact/Essence/Vessel/Ward-Break terminology** only after the demonstrated Flask behaviour is known.
5. **Audit remaining retired-mode language/runtime residue**, including legacy online wording and compatibility-only code, without restoring retired product modes.
6. **Rebuild useful startup/menu presentation ideas** from the closed #2055 source as small current-main stages only where the current product still needs them.
7. **Implement Water / Fire / Earth / Air portal architecture and materially larger zone topology.**
8. **Deepen zone-specific enemies, bosses, events, Artefacts and secrets.**
9. **Finish NPC/merchant world integration.**
10. **Complete the itch.io release handoff and package checks.**
11. **Run final supported-mode regression and hands-on release acceptance.**

## Closure rule

No user-reproduced defect moves to product-complete solely because a PR merged or CI was green when this register explicitly requires deployed/manual acceptance. Closure requires the requested behaviour to exist on current `main`, relevant regression coverage to pass, and the defect to stop reproducing during the required live/manual check.