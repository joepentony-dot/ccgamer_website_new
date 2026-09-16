# C64 Dungeon Carnage — Current Work Register

> Legacy repository path: `arcade/lost-sizzler/`. The customer-facing game name is **C64 Dungeon Carnage**. Historical internal identifiers may still use `Lost Sizzler` for compatibility.

## Audit checkpoint

- Audited: **16 September 2026**.
- Current-main checkpoint used to rebuild this register: `e94865ac3522189e72fc35cb3d98b22ae972fb24`.
- This register distinguishes **merged/present** from **actually closed**. A merged PR is not treated as fixed when the live defect can still be reproduced.
- Completed historical jobs are removed from the public developer changelog. Git history remains the permanent completed-work record.
- Highest-priority repair work has commenced in draft PR **#2090**; its live defects remain OPEN until exact-head qualification and hands-on acceptance are complete.

## Status definitions

- **PRESENT** — implementation is on the audited `main` and no current contrary reproduction is recorded.
- **OPEN** — requested outcome is not complete, or a supposedly fixed defect still reproduces.
- **PARTIAL** — a foundation is present, but requested follow-on work remains.
- **VERIFYING** — implementation exists, but current-production acceptance is still required.
- **SUPERSEDED** — no longer part of the intended release path.
- **QUEUED SEPARATELY** — valid repository work, but deliberately isolated from Dungeon Carnage runtime changes.

## Present on audited main

| Area | Status | Current evidence / boundary |
| --- | --- | --- |
| Supported release modes | PRESENT | Solo, Tutorial and local 2P Split Screen remain the intended supported gameplay modes. |
| Retired online menu/lobby | PRESENT | #2072 detached hard create/join startup bindings and #2074 removed the networked Dungeon Multiplayer button, room-code controls, online instructions and lobby markup. |
| Five-depth campaign foundation | PRESENT | The ordered V10.42 bootstrap loads the five-depth campaign and floor-balance layers. |
| Five biome presentation layer | PRESENT | R6 assigns distinct floor identities: Ruined Threshold, Iron Keep, Moss Crypt, Ember Depths and Sigil Sanctum. This is presentation/environment ownership, not larger map topology. |
| RPG build focus and stat-10 specialisations | PRESENT | #2061 merged the R23 build-focus/specialisation chain for Vitality, Agility, Endurance and Arcana while retaining the established floor level caps. |
| Local Split Screen campaign persistence | PRESENT | The retired network multiplayer adapters were separated from the retained local Split Screen campaign state. |
| XP source boundary | PRESENT | Progression XP remains intended for combat and explicit XP rewards rather than ordinary doors, switches, chests or traps. |
| Gold economy | PRESENT | Ordinary shop stock uses Gold with linear shop pricing; Score remains a performance currency. The separate Artefact Flask exchange is tracked below because that live path still fails. |
| Dynamic encounter/content foundations | PRESENT | R7–R16 layers provide room objectives, breakable interactions/presentation, encounter direction/progression, combat bridging, NPC data and environment presentation. |
| NPC foundation | PRESENT | R15 contains deterministic NPC dialogue, rumours, rescue state, quest specifications and reward-state handling. This does not mean the wider NPC/merchant request is finished. |
| Warden expansion layers | PRESENT | Warden purpose, domain progression, cleansing, charge routes, hunt guidance, navigation cues and interface consistency are loaded in the ordered bootstrap. |
| Mobile trap/layout stability layers | PRESENT | R19/R20 remain in the ordered bootstrap; no new contrary mobile-trap reproduction is currently recorded in this audit. |
| Weekly High-Score Vault/account surface | PRESENT | The Weekly Vault remains on the public menu and must be preserved while obsolete network runtime is removed. |

## Merged work that is NOT closed

| Area | Status | Why it remains open |
| --- | --- | --- |
| P1 firing / attack liveness | **OPEN — #2090 IN PROGRESS** | #2009 merged as a live-input/timing repair, but the firing problem is still reproducible during current live manual testing. #2090 now targets the surviving held-input handoff and adds a reproduction matching sustained real key input. |
| 3-Artefact Banishment Flask exchange | **OPEN — #2090 IN PROGRESS** | The intended Gold economy remains valid: ordinary stock uses Gold and the Flask has a separate 10 Gold purchase. The alternate 3-Artefact Flask exchange still fails in current live conditions, especially where spending the Artefact stack itself must free the destination inventory slot. |
| Public C64 Dungeon Carnage identity | **OPEN — #2090 IN PROGRESS** | Static HTML uses the C64 Dungeon Carnage name, but current main still contains a late bootstrap subtitle restamp to `THE LOST SIZZLER — V10.42`. #2090 removes that visible restamp while retaining historical internal identifiers where needed. |

## Partially completed work

| Area | Status | Remaining work |
| --- | --- | --- |
| Retired multiplayer runtime removal | **PARTIAL** | Visible online entry/lobby surfaces and several obsolete adapters are gone. `game-network.js` still mixes retired online code with active local/Solo helpers, and `network.js` still requires guarded simplification. Extract active helpers first; do not delete `game-network.js` wholesale. Preserve Weekly Vault/account services and local Split Screen. |
| Five-depth biome/room content | **PARTIAL** | Baseline R6 biome presentation is live. PR #2062 adds stronger deterministic room grammar, landmarks, route moods and archetypes, but is stale, draft, unmerged and must be refreshed onto current main before qualification. |
| NPC / merchant expansion | **PARTIAL** | NPC dialogue/quest data exists, but deeper world integration and finished merchant transactions remain. New merchant work must compose with the retained Gold economy and the repaired Artefact Flask exchange rather than replacing either accidentally. |
| Startup/menu simplification | **PARTIAL** | PR #2055 contains useful presentation work but never merged and is stale against current main. Its valid changes must be split and rebuilt on current main rather than merged wholesale. |
| Final release qualification | **VERIFYING** | A fresh supported-mode acceptance pass is required after the open attack/Artefact/identity defects and retirement cleanup are corrected. |

## Requested work not yet implemented

| Area | Status | Required outcome |
| --- | --- | --- |
| Four elemental portals | **OPEN** | Build four strongly signposted Water, Fire, Earth and Air portal routes with distinct zone identities and content direction. |
| Larger/grander procedural zone topology | **OPEN** | Build materially larger and more distinctive procedural dungeon spaces for the portal/zone structure. The current R6 and proposed R24 work describe/dress existing topology and do not satisfy this request. |
| Deeper zone-specific content | **OPEN** | Extend enemies, bosses/elites, items/artefacts, events, secrets and encounter patterns so the requested zones are mechanically as well as visually distinct. Existing encounter layers are a foundation rather than completion of this larger content pass. |
| Finished NPC/merchant world integration | **OPEN** | Turn the existing NPC data/quest foundation into finished in-world interactions, merchant/service behaviour and content rewards that integrate with the established Gold economy, Artefact exchanges and final zone structure. |
| itch.io release handoff | **OPEN** | Use itch.io for purchase/download distribution while retaining the CCG site as the branded landing/demo experience. Reuse qualified offline-package work where useful and perform an end-to-end release/package check. |

## Superseded work

The old PayPal-specific checkout/paywall/download plan is **SUPERSEDED** as the intended release path. Do not spend active release time completing PayPal-only work merely because old PRs exist. Reusable provider-neutral/offline packaging and Windows build work may still be retained where it helps the itch.io release.

Horde Survivor, Spy Vs Spy/Sizzler Saboteurs and networked Dungeon Multiplayer are retired product modes. Their old feature backlog, UI entries, leaderboards and mode-specific compatibility work must not be treated as active feature requirements. Only cleanup needed to remove their obsolete runtime safely remains active.

## Separate queued repository work

- **PR #2073 — Content Publisher 3D box WebP optimisation:** valid separate website/admin work. Keep it isolated from Dungeon Carnage runtime changes; refresh against current main only at a safe boundary, verify the diff remains limited to the optimiser plus regression coverage, and re-run qualification.

## Tracker/document debt

- `v10-12-developer-changelog.js` previously contained old August completed items. This reconciliation converts it to an **outstanding-work-only** tracker.
- The previous `PROGRESS.md` still described the #1954 promotion checkpoint and old post-merge exit criteria; this register replaces it.
- `STABILIZATION_DEFECTS.md` remains a useful historical evidence ledger, but much of it references retired Horde/Spy work and old frozen heads. Treat it as historical evidence until it is separately archived or rewritten; do not use it as the current priority list.

## Current work order

1. **Repair and live-verify firing/attack liveness on current main — #2090 commenced.**
2. **Repair and live-verify the 3-Artefact Banishment Flask exchange while preserving ordinary Gold shop pricing and the separate 10 Gold Flask purchase — #2090 commenced.**
3. **Fix the remaining Lost Sizzler public-identity restamp so C64 Dungeon Carnage stays authoritative after bootstrap — #2090 commenced.**
4. **Finish guarded retired-network cleanup:** extract active helpers from `game-network.js`, delete obsolete online transport, then simplify `network.js` without harming Weekly Vault/account services or local Split Screen.
5. **Refresh and qualify #2062** for stronger five-depth room/biome grammar.
6. **Rebuild the useful #2055 startup/menu work as small current-main stages** rather than attempting to merge the stale branch.
7. **Implement the Water / Fire / Earth / Air portal architecture and larger zone topology**, then deepen zone-specific enemies, bosses, events, artefacts and secrets.
8. **Finish NPC/merchant world integration** against the established economy and final zone architecture.
9. **Complete the itch.io release handoff and end-to-end supported-mode/package acceptance.**
10. **Handle #2073 separately** after a safe Dungeon checkpoint.

## Closure rule

No item moves to completed solely because a PR merged or CI was green. Closure requires the requested behaviour to exist on current `main`, relevant regression coverage to pass, and any user-reproduced live defect to stop reproducing in the deployed build.
