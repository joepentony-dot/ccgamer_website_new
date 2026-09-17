# Dungeon Carnage runtime

## Scope

The browser game under `arcade/lost-sizzler/`, including retained local runtime extraction, campaign/biome work, UI, gameplay defects, and runtime contracts. Read `arcade/lost-sizzler/PROGRESS.md` for the product backlog, but prefer live `main` when later merges or automation have advanced beyond a recorded checkpoint.

## Current checkpoint — 17 September 2026

Live repository reconciliation after the seven-item defect programme, the later current-build freeze/stopped-firing regression, and the start of the independent retired-mode/legacy-residue programme:

- Current `main` at the start of Stage 1: `5db1fa275fba1b33d9fbab55d065724110338fd7`, merge of documentation checkpoint PR #2130.
- Defect 1 — obsolete public-beta/watchdog startup lock — **repository-complete through #2117**.
- Defect 2 — retained projectile entities / progressive slowdown — **repository-complete through #2118**.
- Defect 3 — Floor 1 completion/exit progression failure — **repository-complete through #2119**.
- Defect 4 — Save and Exit / Continue restoration reliability — **repository-complete through #2123**.
- Defect 5 — 3-Artefact Banishment Flask exchange — **repository implementation complete through #2090; deployed/manual acceptance deferred by the user**.
- Defect 6 — Owned Firearms differentiation — **repository-complete through #2125**.
- Defect 7 — RPG terminology reconciliation — **repository-complete through #2126**.
- Post-program live freeze/stopped-firing regression — **repository-complete through #2129; deployed/manual Solo stability acceptance deferred by the user**.
- Active independent Stage 1 cleanup: PR #2131, `codex/dungeon-retired-spy-startup-current-main`, removing retired Spy startup owners while preserving supported late-runtime ownership proved to have been reached indirectly through that historical chain.

Both hands-on gates remain exactly:

**MANUAL ACCEPTANCE DEFERRED — USER CURRENTLY UNAVAILABLE TO TEST**

No automated result may be promoted into user acceptance for either gate.

The final runtime merge in the original seven-item programme was Defect 7 PR #2126. Its exact qualified head was `f70f816910fab8d07aaf946f140b593c9220f1ef`, merged as `2e734f4875fb737a0a292b4f92331197bc1c6f85`. The exact candidate passed Native Mouse Wheel Scroll Contract, Public Code Cache Version, SEO Automation, C64 Dungeon Carnage Mobile Trap Layout Contract and Lost Sizzler Load Safety, including canonical/Node coverage and all six Chromium shards.

After that programme, the user reproduced a current-build Solo failure where gameplay froze/stalled and/or firing stopped before the outstanding Defect 5 manual acceptance could be reached. PR #2129 proved that current `main` had a split release/cache identity: the authoritative V10.42 bootstrap used `V10.42 r30` / `20260917r30`, while the blocking canonical page still identified and directly loaded the base frame/input/runtime stack under `2026.09.10.1` / `20260910r1`. That allowed a supported mixed-generation path where stale base frame/input/attack owners could coexist with current r30 ordered modules even though the visible page badge was later restamped to r30.

#2129 synchronised the blocking page identity, every directly loaded Dungeon CSS/JS query token and `version.json` to r30. It deliberately did not alter projectile lifecycle mechanics, firing cadence, movement semantics, save data, supported mode ownership or Defect 5 shop logic. The exact qualified head `585cda263e2f0c9a626fef61d19bae9635d2087f` passed Public Code Cache Version, SEO Automation, Native Mouse Wheel Scroll Contract, Social Metadata Validation, Structured Data Validation, CCG Site Safety and Lost Sizzler Load Safety. It had no reviews, no review threads, no conflicts and was mergeable; Cloudflare also reported a successful exact-head preview deployment. #2129 merged as `218025ce2beac3765d65ca9b838e8afd58a5eedf`.

Detailed #2129 record: `docs/ai-work/dungeon-carnage-live-freeze-cache-2026-09-17.md`.

### Defect 3 ownership result

#2119 proved that the real movement owner already invoked `floorComplete()` once when the player entered the legitimately opened exit. The failure was the optional Warden first-contact guard: unresolved optional debt/cache fragments were incorrectly treated as blocking and required an undisclosed second physical entry. The bounded fix changed only those optional blocking flags while preserving the genuine route:

`real objective completion → exit opens → physical movePlayer() entry → real floorComplete ownership → floor-complete panel → #descend-btn → authoritative descendFloor() → playable next floor`

The redundant #2120 movement-wrapper proposal is closed without merge and must not be revived.

### Defect 4 ownership result

#2123 restored the existing Floor 1 save/restore lifecycle rather than introducing a second persistence model. It captures the base Floor 1 entry snapshot, allows the retained five-death Save & Return flow on Floor 1, preserves the later r43 autosave/Continue owner, and only exits to the menu after a successful checkpoint write. Diagnostic PR #2122 is closed without merge.

### Defect 5 repository result and remaining gate

#2090 repaired the live 3-Artefact/Essence → 1 Banishment Flask exchange at the existing shop owner. The implementation is transactional, supports the full-inventory case where consuming the traded Artefacts must free the destination slot, and preserves the separate 10-Gold Flask purchase route.

Current-main browser coverage proves both representations:

- three legacy physical Artefacts exchange for exactly one Banishment Flask;
- three current `banishmentEssence` points exchange for exactly one Banishment Flask;
- traded Artefacts/Essence are consumed exactly once;
- Gold and Score are not spent by the Artefact/Essence exchange;
- inventory capacity remains valid.

No further repository-side correction is currently proven necessary. Product-level closure still requires hands-on acceptance on the deployed/current build, but that acceptance is deferred by the user and must not block independent backlog work.

### Defect 6 ownership result

#2125 exposes meaningful differences already present in owned firearm data through the established Owned Firearms selector. It retains the real inventory controls, indices, acquisition/switching owner and combat data while presenting rating, power, delay, shots, ammo, pierce, element and mod information. The focused browser contract also proves switching through the real EQUIP control.

### Defect 7 ownership result

#2126 preserves historical internal rarity identities for progression/save compatibility while translating only customer-facing wording:

- `UNCOMMON` → `RARE`
- `SIZZLER` → `ENCHANTED`
- `GOLD MEDAL` → `RELIC`
- `ZZAP! 97%` → `LEGENDARY`
- visible `Zzap! Citadel guardian` → `Citadel guardian`

No rarity probabilities, ordering, weapon stats, loot mechanics or save identifiers were changed.

### #2129 release/cache ownership remediation

#2129 is **MERGED**. It corrected the current-build split generation without reopening #2118 projectile semantics.

The bounded production delta keeps the canonical page and runtime on one release generation:

- page build identity `V10.42 r30`;
- page cache identity `20260917r30`;
- all directly loaded Dungeon CSS/JS assets use `20260917r30`;
- `version.json` carries the same identity;
- the cache guard sees r30 before gameplay owners execute;
- the r30 bootstrap handoff and ordered module chain stay on the same cache token.

New regression coverage includes `v10-42-r30-release-cache-identity.mjs` plus the real-browser `v10-42-live-solo-combat-endurance.mjs`, which exercises generated enemies, real projectile/damage/death ownership, Space/F/Numpad0 firing, held/release cycles, movement between combat cycles, pause/resume recovery, simulation progress and bounded projectile/visual collections. The first CI attempt exposed only external Supabase/local-fixture CORS noise after the endurance exercise had completed; that fixture was isolated without weakening gameplay assertions, ownership assertions, collection bounds or timeouts.

### Stage 1 retired Spy startup ownership — PR #2131

The earlier 16 September residue note was too broad. It was true that the canonical page did not directly list the retired special-mode files, but the supported r30 startup handoff still dynamically preloaded three retired Spy/Saboteurs owners. PR #2131 corrects that actual ownership boundary rather than relying on filename assumptions.

The retired startup owners being removed are:

- `v10-41-r30-spy-exit-control-reset.js`;
- `v10-41-r32-spy-world-owner.js`;
- `v10-41-r32-spy-loader.js`.

Investigation also proved that the historical chain was carrying supported responsibilities. #2131 therefore preserves those responsibilities explicitly:

- `v10-41-post-playtest-stability.js` — supported Solo fire-state recovery;
- `v10-41-r56-playtest-completion.js` — ordinary-dungeon environment/chest/combat recovery ownership;
- `v10-41-r59-live-regression-fixes.js` — pause/Solo stability ownership;
- `v10-41-horde-frame-performance.js` — despite its name, the loader/maintenance bridge for the supported Solo R60 live-play integrity owner; its Horde R60 polling timer is stopped in Solo;
- `v10-41-r60-horde-owner-composition.js` — despite its name, still protects supported Solo R60 maintenance and damage ancestry.

The first #2131 CI candidate exposed exactly this hidden ownership: one Solo soak saw the retired Horde frame-performance global disappear entirely, while selective-owner recovery could no longer see the supported R56/R60 integrity APIs. The tests were not weakened. The candidate was corrected by making supported ownership explicit while keeping the retired Spy startup owners absent.

## Completed runtime stages

#2102, `codex/dungeon-carnage-extract-local-runtime`, is **MERGED**.

The merged stage:

- moved the retained local gameplay suffix from `game-network.js` into `game-local-runtime.js`;
- loaded `game-local-runtime.js` immediately after `game-network.js` and before `game-play.js`;
- preserved Solo, Tutorial, local 2P Split Screen, Weekly Vault/account, save/progression and established gameplay ownership;
- retained the queued early Solo/Split start repair discovered during qualification.

#2113, `codex/dungeon-carnage-retire-online-prefix-current-main`, is **MERGED**.

The merged stage:

- replaced obsolete packet routing, remote-player simulation and world serializer/receiver logic in `game-network.js` with inert compatibility owners;
- retained only the callback/function names required while RoomNetwork remains the local Solo/Split session shell;
- added/strengthened retirement contracts so the old packet, remote-player and world-sync behaviours cannot silently return;
- updated old multiplayer-era tests whose positive world-sync expectations directly contradicted the intentional retirement boundary;
- left retained combat, pickups, Banishment, inventory and XP ownership in `game-local-runtime.js`.

### #2113 merge qualification evidence

The exact #2113 head was green before merge across its PR-triggered checks:

- Lost Sizzler Load Safety — PASS
- Native Mouse Wheel Scroll Contract — PASS
- Public Code Cache Version — PASS

The first Load Safety attempt had one isolated Chromium shard-5 failure: `v10-35-layout.mjs` timed out during its initial startup wait while every later contract in that shard passed and shards 1, 2, 3, 4 and 6 were green. The unchanged shard-5 job was rerun after the workflow completed and passed. No timeout, assertion or production runtime code was weakened to obtain green.

### #2115 supported local Split Screen full map

#2115, `codex/rebuild-split-full-map-current-main`, is **MERGED**. It restores the full explored-map panel for local Split Screen, retains P1 exploration knowledge as the shared map view, makes `M` ignore held-key repeats, and uses a dedicated `fullmap` non-playing mode so pause-recovery layers cannot mistake the overlay for an orphaned pause. Its exact head passed all current PR checks. The first Chromium shard-3 run failed only in the pre-existing `v10-28-browser-stability-deterministic.mjs` startup wait; the unchanged shard retry passed, with no test weakening or unrelated runtime change.

### #2117 public-beta/watchdog remediation

#2117 is **MERGED**. Exact qualified head `23bd55e28d1367ad84bb82e22af08e16a2bc9b4f` merged as `408a9870d33f9ea2931934c302176743d2589160`. It removed the obsolete public-host closed-beta ownership from `v10-41-load-watchdog.js` while preserving site account/authentication ownership and current game startup.

### #2118 projectile lifecycle remediation

#2118 is **MERGED**. It adds an ordered projectile lifecycle owner that retires non-piercing impacts before downstream callbacks and performs authoritative player/enemy projectile cleanup from a `finally` boundary. It preserves fire delay, rapid-fire cadence, projectile allowance, projectile TTL, held-fire ownership and room/run cleanup. Exact-head regression covered sustained fire, repeated impacts and downstream enemy-death faults.

## Retired-mode residue audit — corrected 17 September 2026

The 16 September audit correctly established that `game-network.js` is the intentionally inert local-session compatibility boundary from #2113 and that Horde/Saboteur product modes are retired. It overstated the startup result by saying no retired Horde/Spy module was loaded by the supported runtime. Stage 1 reconciliation proved that r30 still dynamically preloaded three retired Spy startup owners even though they were absent from the canonical page script list.

Historical Horde/Spy source files and acceptance records remain in the repository as evidence. They must not be removed solely because of their names: #2131 proved that two Horde-named compatibility layers still deliver supported Solo R60 ownership. Old `playMode === "online"` conditional guards also remain inside retained local gameplay ownership; removing them requires a separate focused contract and must not be folded into unrelated terminology, topology, NPC, commerce or menu work.

## Retired stale/superseded runtime PRs

| PR | Classification | Current state |
| --- | --- | --- |
| #2062 | **SUPERSEDED** by merged #2098 R24 refresh | Closed without merge |
| #1960 | **SUPERSEDED** by merged/current XP-source boundary | Closed without merge |
| #1959 | **OBSOLETE PRODUCT-MODE WORK** after Spy retirement | Closed without merge |
| #1998 | **SUPERSEDED DOCUMENTATION** by merged #2100 work register | Closed without merge |
| #2055 | **STALE SOURCE MATERIAL** | Closed without merge. Rebuild only still-valid presentation ideas on current `main`. |
| #1983 | **STALE / REPRODUCTION REQUIRED** | Closed without merge. Revisit only if the startup-overlay defect reproduces on the current deployed build. |
| #1978 | **STALE VERIFICATION CHILD** of #1976 | Closed without merge; historical soak evidence remains in Git history. |
| #1980 | **STALE DOCUMENTATION CHILD** of #1978 | Closed without merge; evidence remains in Git history. |
| #1898 | **HISTORICAL PRODUCTION-SMOKE DIAGNOSTIC** | Closed without merge. |
| #1900 | **HISTORICAL TEST FOLLOW-UP** to #1898 | Closed without merge. |
| #2120 | **SUPERSEDED DEFECT 3 MOVEMENT WRAPPER** | Closed without merge; #2119 contains the proven owner fix. |
| #2122 | **DIAGNOSTIC-ONLY DEFECT 4 BRANCH** | Closed without merge; #2123 contains the bounded fix. |

### Other unresolved candidates outside the seven-item defect programme

- #1976 (R30 ownership-audit throttle) may contain a useful optimisation idea, but it must be re-derived against current `main`; its old branch is not the integration vehicle.
- #1860 and #1852 are historical long-running containment/stabilisation branches and are not safe bases for new runtime work. Their broader non-runtime implications must be reconciled separately before any closure or extraction decision.

## Guardrails and exact next action

Preserve Solo, Tutorial, local 2P Split Screen and Weekly Vault/account services. Do not restore retired networked Dungeon Multiplayer, Horde Survivor or Spy/Sizzler Saboteurs behaviour. Do not reopen completed Defects 1, 2, 3, 4, 6 or 7 without new current-build regression evidence. Preserve #2118 projectile lifecycle ownership unless new evidence independently disproves it.

The two live gates remain unresolved but are not the current development task:

- sustained Solo movement/firing/combat/pause-resume stability after #2129;
- 3 Artefacts/Essences → 1 Banishment Flask without prior Gold purchase, with Gold and Score unchanged.

For both: **MANUAL ACCEPTANCE DEFERRED — USER CURRENTLY UNAVAILABLE TO TEST**.

The exact repository action is to qualify #2131 on its final exact head. If green, review-clean and conflict-free, merge it under the standing authorization, reconcile `main`, checkpoint the Stage 1 result, and continue to the next independent retired-mode/legacy-residue item. Do not stop the independent programme merely because the two hands-on release gates remain deferred.

## Historical live-defect remediation checkpoint — 16 September 2026

At this earlier checkpoint #2117 had closed the obsolete public-beta watchdog/menu-lock defect and the remaining queue was projectile accumulation, floor progression, save/restore, Banishment Flask exchange, firearm differentiation and RPG terminology. Those repository-side items have since advanced as recorded in the current checkpoint above.

### Historical Defect 2 candidate — PR #2118

Branch `codex/dungeon-projectile-lifecycle-current-main` was created from exact live `main` `408a9870d33f9ea2931934c302176743d2589160`. Investigation found one authoritative player-projectile collection, `bullets`, shared by simulation and rendering. The legacy projectile owner marked TTL dead on impacts but deferred physical removal until the end of the complete `stepProjectiles()` pass. The r29 runtime intentionally catches recoverable `update()` faults and continues the loop, so a hit/death callback fault could bypass that deferred sweep. Both projectile rendering and dynamic lighting iterate the retained authoritative entries. Existing R1 stale-projectile repair only marked old bullets dead and still depended on the same sweep.

#2118 added an ordered V10.42 projectile lifecycle owner that retires non-piercing enemy/generator impacts before downstream callbacks and sweeps expired player/enemy projectiles from a `finally` boundary. Focused deterministic coverage included direct enemy hits, 500 repeated impacts, an enemy-death callback fault and 2,400 sustained-fire ticks; the established Chromium held-fire contract remained part of the matrix.

## Session log

- 2026-09-16: Reclassified #2062, #1960, #1959 and #1998 as superseded/obsolete; they were closed without merge.
- 2026-09-16: Qualified #2102 head `dcb35f3e...`, including a successful unchanged rerun of one transient Site Safety/WebDriver timeout; merged #2102 and completed retained local-runtime extraction.
- 2026-09-16: Closed stale runtime/verification integration candidates #1978, #1980, #2055, #1983, #1898 and #1900 without merge while preserving their history/source material.
- 2026-09-16: Updated #2113's canonical tests to retire obsolete positive world-sync expectations rather than restoring retired online behaviour.
- 2026-09-16: Qualified #2113 head `2fa216c6...`; one transient `v10-35-layout` shard timeout passed on an unchanged targeted retry.
- 2026-09-16: Merged #2113 as `c3549e6d45b7748f1efcf5c4f4ba134200325a5f`. Obsolete packet/world-sync runtime retirement is complete.
- 2026-09-16: Closed stale #1902 and rebuilt its still-valid local Split Screen map behaviour as #2115 on current `main`. The exact head `30c58717...` passed the complete matrix after an unchanged retry of an unrelated `v10-28-browser-stability-deterministic.mjs` startup timeout; #2115 merged as `95bd8431fd6b8313bf5873a79bd4bc93404d8de9`.
- 2026-09-16: Completed the bounded current-main retired-mode residue audit at `e9adbd16...`; Stage 1 later corrected its too-broad conclusion about dynamically preloaded Spy owners.
- 2026-09-16: Qualified #2117 exact head `23bd55e2...` and merged the public-beta/watchdog remediation as `408a9870d33f9ea2931934c302176743d2589160`.
- 2026-09-16: Qualified and merged #2118, closing the retained-projectile/progressive-slowdown repository defect.
- 2026-09-17: Qualified and merged #2119, correcting the optional Warden completion guard while preserving the genuine floor-transition owner chain; redundant #2120 closed without merge.
- 2026-09-17: Qualified and merged #2123, repairing Floor 1 Save & Return / Continue ownership and failed-write safety; diagnostic #2122 closed without merge.
- 2026-09-17: Reconfirmed #2090 owns both physical-Artefact and current Essence Banishment Flask exchange paths on current main; repository-side Defect 5 work is complete, with deployed/manual acceptance still outstanding.
- 2026-09-17: Qualified and merged #2125, exposing meaningful Owned Firearms differences through the existing selector without changing weapon mechanics.
- 2026-09-17: Qualified and merged #2126 at exact head `f70f816910fab8d07aaf946f140b593c9220f1ef`; all retained workflows and all six Chromium shards passed.
- 2026-09-17: Reconciled `docs/AI-CONTINUATION-STATE.md` and `arcade/lost-sizzler/PROGRESS.md` after Defect 7. The remaining next action at that checkpoint was Defect 5 deployed/manual acceptance.
- 2026-09-17: Reproduced a later current-build Solo freeze/stopped-firing regression, proved split release/cache ownership rather than a return of #2118, qualified #2129 exact head `585cda263e2f0c9a626fef61d19bae9635d2087f`, and merged it as `218025ce2beac3765d65ca9b838e8afd58a5eedf`.
- 2026-09-17: User explicitly deferred both remaining hands-on acceptance gates. Independent Stage 1 work began on #2131; the first candidate exposed hidden R56/R60 supported ownership previously reached through retired special-mode startup ancestry, and the candidate was corrected without restoring the retired Spy startup owners or weakening tests.
