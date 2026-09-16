# C64 Dungeon Carnage — Current Work Register

> Legacy repository path: `arcade/lost-sizzler/`. The customer-facing game name is **C64 Dungeon Carnage**. Historical internal identifiers may still use `Lost Sizzler` where compatibility requires them.

## Audit checkpoint

- Audited: **16 September 2026**.
- Current `main` checkpoint: `351727ec4f08d82f764f27e284a15b1b71f596e3`.
- #2090 is merged: held-fire liveness, Artefact/Essence Flask exchange support, early-Solo startup ownership and public C64 Dungeon Carnage identity are present in code and automated qualification is green.
- #2096 is merged: the retained-local-runtime ownership fence is present, but the physical extraction from `game-network.js` has **not** happened yet.
- #2098 is merged: deterministic R24 five-depth room grammar is present and qualified at V10.42 r26 / `20260916r26`.
- A merged PR is not treated as a closed user-reproduced defect until the deployed behaviour is manually accepted.

## Status definitions

- **PRESENT** — implementation is on audited `main` and no current contrary reproduction is recorded.
- **OPEN** — requested outcome is not complete.
- **PARTIAL** — a foundation is present, but requested follow-on work remains.
- **VERIFYING** — implementation and automated coverage exist, but required live/manual acceptance is still outstanding.
- **SUPERSEDED** — no longer part of the intended release path.
- **QUEUED SEPARATELY** — valid repository work deliberately isolated from Dungeon Carnage runtime changes.

## Present on audited main

| Area | Status | Current evidence / boundary |
| --- | --- | --- |
| Supported release modes | PRESENT | Solo, Tutorial and local 2P Split Screen remain supported gameplay modes. Weekly Vault/account services remain supported menu/account functionality. |
| Retired online entry/lobby | PRESENT | Networked Dungeon Multiplayer entry/lobby controls are removed and obsolete hard startup bindings are detached. Horde Survivor and Spy/Sizzler Saboteurs are retired product modes. |
| Five-depth campaign foundation | PRESENT | The ordered V10.42 bootstrap loads the five-depth campaign and floor-balance layers. |
| Five-depth environment identity | PRESENT | R6 supplies distinct Threshold, Iron, Bone, Ash and Sigil environment identities. |
| Five-depth room grammar | PRESENT | #2098 adds R24 deterministic room identities, landmarks, route moods, approach cues, foreshadowing and role/rare-role grammar. R24 is semantic metadata only and does not claim simulation, collision, progression, save or network ownership. |
| RPG build focus / stat-10 specialisations | PRESENT | The R23 build-focus/specialisation chain remains present for Vitality, Agility, Endurance and Arcana while preserving established floor caps. |
| Local Split Screen campaign state | PRESENT | Local 2P campaign state remains supported and must be preserved during retired-network cleanup. |
| XP source boundary | PRESENT | Progression XP remains intended for combat and explicit XP rewards rather than ordinary doors, switches, chests or traps. |
| Gold economy | PRESENT | Ordinary shop stock uses Gold with its existing pricing. The separate 10 Gold Banishment Flask route remains available. |
| Public game identity | PRESENT | #2090 keeps the visible runtime subtitle at `C64 DUNGEON CARNAGE — V10.42`; historical internal/path identifiers remain only where compatibility requires them. |
| NPC/content foundations | PRESENT | Existing R7–R16 layers provide room objectives, breakables, encounter direction/progression, combat bridging, NPC data and environment presentation. This is a foundation, not completion of the wider NPC/merchant request. |
| Warden expansion | PRESENT | Warden purpose, domain progression, cleansing, charge routes, hunt guidance, navigation cues and interface consistency remain in the ordered bootstrap. |
| Weekly Vault/account surface | PRESENT | Weekly Vault/account functionality remains available and is protected from retired-network cleanup. |

## Merged work still awaiting live acceptance

| Area | Status | Remaining acceptance |
| --- | --- | --- |
| P1 firing / attack liveness | **VERIFYING** | #2090 is merged and exact-head Node/Chromium coverage passed, including held Space/F/Numpad0 firing and pause/resume coverage. The user-reproduced firing defect is not closed until sustained firing is manually checked on the deployed/current build and no longer reproduces. |
| 3-Artefact Banishment Flask exchange | **VERIFYING** | #2090 is merged and automated coverage passed for both legacy physical Artefacts and the current V10.42 `banishmentEssence` representation without spending Gold/Score. The user-reproduced exchange defect is not closed until the deployed/current build is manually checked. |

## Partially completed work

| Area | Status | Remaining work |
| --- | --- | --- |
| Retired multiplayer runtime removal | **PARTIAL** | #2096 merged the ownership fence identifying the active local suffix in `game-network.js`. The active `hostEnemyStep(...)` through `dropInventorySlot(...)` helper block still needs mechanical extraction to `game-local-runtime.js` before obsolete online transport can be removed. Do not delete `game-network.js` wholesale. Preserve Solo, local Split Screen and Weekly Vault/account services. |
| Banishment terminology | **PARTIAL** | Runtime and customer-facing layers contain a mixture of Artefact, Essence, Vessel and Ward-Break wording. Reconcile visible instructions only after the current live Flask behaviour has been manually verified, so documentation follows demonstrated behaviour rather than assumption. |
| NPC / merchant expansion | **PARTIAL** | NPC dialogue/quest data exists, but deeper world integration, merchant/service behaviour and finished reward/content flows remain. |
| Startup/menu simplification | **PARTIAL** | Useful presentation work from the old #2055 candidate remains stale. Rebuild only valid pieces as small current-main stages; do not restore retired online modes. |
| Final release qualification | **VERIFYING** | A fresh supported-mode acceptance pass is required after remaining runtime cleanup and release work. |

## Requested work not yet implemented

| Area | Status | Required outcome |
| --- | --- | --- |
| Four elemental portals | **OPEN** | Build strongly signposted Water, Fire, Earth and Air portal routes with distinct zone identities and content direction. |
| Larger/grander procedural topology | **OPEN** | Build materially larger and more distinctive procedural spaces for the portal/zone structure. R24 describes existing generated rooms and does not satisfy this topology request. |
| Deeper zone-specific content | **OPEN** | Extend enemies, bosses/elites, items/Artefacts, events, secrets and encounter patterns so the zones differ mechanically as well as thematically. |
| Finished NPC/merchant integration | **OPEN** | Turn existing NPC foundations into finished in-world interactions, merchant/service behaviour and content rewards integrated with the established economy and final zone structure. |
| itch.io release handoff | **OPEN** | itch.io is the intended purchase/download route. Retain the CCG website as the branded landing/demo experience and perform an end-to-end package/release check. |

## Superseded work

The old PayPal-specific checkout/paywall/download plan is **SUPERSEDED**. Reusable provider-neutral/offline packaging work may still be used where it helps the itch.io release.

Horde Survivor, Spy Vs Spy/Sizzler Saboteurs and networked Dungeon Multiplayer are retired product modes. Historical files/tests may still reference them as compatibility or evidence, but their old feature backlog, menu entries, leaderboards and online product flows are not active release requirements.

## Historical evidence

`STABILIZATION_DEFECTS.md` preserves the earlier Solo stabilization programme and its frozen evidence/exit criteria. It is **not** the current Dungeon Carnage backlog. Historical Horde/Spy/online-mode references in that ledger document past testing and do not reactivate those retired modes.

## Separate queued repository work

- **#2073 — Content Publisher 3D box WebP optimisation:** valid separate website/admin work. Keep it isolated from Dungeon Carnage runtime changes and requalify it against current main at a safe boundary.

## Current work order

1. **Live-verify #2090 firing/attack liveness and the 3-Artefact Banishment Flask exchange.** Automated qualification is complete; manual deployed/current-build acceptance remains.
2. **Reconcile Banishment customer-facing terminology** against the manually demonstrated current behaviour.
3. **Perform the guarded local-runtime extraction after #2096:** mechanically move the retained `hostEnemyStep(...)` → `dropInventorySlot(...)` block out of `game-network.js`, qualify it, and only then remove obsolete online transport.
4. **Audit remaining retired-mode language/runtime residue**, including legacy online-menu wording, without restoring retired product modes.
5. **Rebuild useful #2055 startup/menu presentation work** as small current-main stages.
6. **Implement Water / Fire / Earth / Air portal architecture and materially larger zone topology.**
7. **Deepen zone-specific enemies, bosses, events, Artefacts and secrets.**
8. **Finish NPC/merchant world integration.**
9. **Complete the itch.io release handoff and package checks.**
10. **Run final supported-mode regression and hands-on release acceptance.**
11. **Handle #2073 separately** after a safe Dungeon checkpoint.

## Closure rule

No user-reproduced defect moves to completed solely because a PR merged or CI was green. Closure requires the requested behaviour to exist on current `main`, relevant regression coverage to pass, and the defect to stop reproducing during the required live/manual check.
