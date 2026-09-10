# Lost Sizzler Stage 10 Acceptance Record

## Status

**Stage 10 closure candidate — accepted on tested Spy gameplay head `29ad878a84e0562061e4a2184d897539cca5bb44`, pending canonical CI on this documentation-only acceptance commit.**

Stage 10 qualified and repaired the existing Spy Vs Spy runtime while preserving the accepted Solo and Horde timing/ownership boundaries. No Stage 11 full regression/release review may begin until the documentation-only head created by this record completes the full canonical CI gates successfully.

PR #1852 remains draft and unmerged. PR #1860 is outside this programme and remains untouched.

## Exact-head gate evidence

The Stage 10 gameplay head `29ad878a84e0562061e4a2184d897539cca5bb44` completed all six canonical pull-request workflows successfully:

- Lost Sizzler Load Safety #1197
- Arcade Test Package #1344
- Arcade Quest Validation #1671
- SEO Automation #4147
- CCG Publishing Automation Integrity #317
- CCG Site Safety #3138

Lost Sizzler Load Safety passed canonical structure validation, JavaScript syntax validation, all canonical Node regression contracts and the full Chromium browser suite.

## Stage 10 delivered and qualified slices

Stage 10 now has focused regression evidence for:

1. **Real Spy launch and controller ownership** — Sizzler Saboteurs launches through the canonical special-mode adapter and reaches the authoritative `spy-online` controller without adopting Solo or Horde ownership.
2. **Lazy-loader ownership** — the r32 Spy chain activates on Spy lifecycle signals, remains free of its former cross-mode polling timer and reuses its loader/search observers across repeated re-entry.
3. **Live owner ancestry** — movement and damage ownership remain singular and bounded while the shared update/RAF boundary stays with the accepted mode-runtime/R59 architecture.
4. **Compact-world lifecycle** — logical/physical Spy map state is constructed per match identity and remains stable through ordinary controller frames without repeated compaction or identity churn.
5. **Movement, doors and collision** — the 220 ms movement cadence, door traversal and collision paths execute through the final Spy owner without re-adopting Dungeon movement repair.
6. **Search, inventory, traps and extraction** — E/T/X/TAB ownership, queued first-action handling, search/UI state, trap interaction and extraction flow remain Spy-owned and drain on lifecycle exit.
7. **Combat, damage and knockout** — Spy damage composition, knockout/respawn and final r58 rules remain isolated from R56/R60 Dungeon/Horde ownership.
8. **Packet and authority isolation** — dedicated Spy packet ownership and heartbeat state remain isolated and are restored/drained on exit without contaminating Dungeon or Horde state.
9. **Lifecycle transitions** — repeated leave-to-menu/re-entry cycles clear held input, pending actions, inventory/search state and active Spy heartbeat state without observer or owner accumulation.
10. **Sustained-session soak** — final mode-runtime `spyRuleFrames` advance through active play and after re-entry while retired r29 pre-r32 frame counters remain retired, owner depth stays bounded, world identities stay stable and no uncaught browser errors occur.
11. **Evidence-led repairs only** — corrections were limited to concrete ownership, cadence, lifecycle and regression-fixture defects exposed by canonical CI; tests were not weakened to force passes.

## Regression contracts retained

Stage 10-specific browser coverage includes:

- `v10-41-stage10-spy-launch-loader-reentry.mjs`
- `v10-41-stage10-spy-movement-door-collision.mjs`
- `v10-41-stage10-spy-search-inventory-traps.mjs`
- `v10-41-stage10-spy-combat-damage-knockout.mjs`
- `v10-41-stage10-spy-packet-authority-isolation.mjs`
- `v10-41-stage10-spy-lifecycle-state-drain.mjs`
- `v10-41-stage10-spy-sustained-session-soak.mjs`

Existing Spy engine/network isolation, damage-owner composition, UI/search hardening, split-controller isolation, Solo and Horde regressions remain active in the canonical suite.

## Protected architecture verification

Stage 10 is accepted only because Spy reconstruction composes with the established runtime architecture:

- R59 remains the authoritative shared RAF owner and authoritative Solo simulation owner.
- R60 Horde ownership and bounded Horde catch-up remain unchanged.
- Spy runs through the authoritative `spy-online` mode-runtime controller boundary.
- r32 may replace r29's original isolated update with the final Spy overhaul update, but it does not acquire shared `window.update` or RAF ownership.
- Final Spy frame authority is measured through mode-runtime `spyRuleFrames`; the retired r29 pre-r32 `controllerFrames` counter is not treated as the final owner after lazy loading.
- R30 remains the accepted global movement/input watchdog and keeps the legacy r29 Spy monitor retired.
- r32 loader activation remains event/lifecycle-driven and its former cross-mode polling timer remains retired.
- Spy heartbeat/packet ownership starts once while active and drains on exit.
- R56 Dungeon systems, R59 Solo simulation and R60 Horde simulation remain dormant during Spy play.
- No Stage 10 change touches the intro loader, Omega website structure, `games/games.json`, Supabase data or PR #1860.

## Stage 10 defect disposition

| Defect | Disposition | Closure evidence |
| --- | --- | --- |
| Spy movement ownership could be misclassified/reasserted when valid wrappers composed around the canonical owner | **CLOSED** | Owner-chain-aware movement checks and repeated launch/re-entry contracts retain exactly one r29 movement owner with bounded ancestry and no stable-play reassertion growth. |
| Final r32 movement/cadence ownership could be confused with retired r29 compatibility state | **CLOSED** | Movement tests qualify the final r32 cadence, including first-keypress timing and the 220 ms governor, while retired counters remain non-authoritative. |
| Logical/physical extraction fixture mismatch caused legitimate r58 extraction cancellation | **CLOSED** | The canonical extraction fixture now places both logical and live player representations in the extraction room while retaining the original extraction assertions. |
| Sustained soak sampled retired r29 controller frames after r32 replaced the isolated update owner | **CLOSED** | The soak now requires authoritative mode-runtime `spyRuleFrames` progress for each active sample and after re-entry, while explicitly confirming the retired r29 counter remains stable. |
| Spy lifecycle could accumulate observers, packet owners, heartbeat handles or world-state rebuilds | **CLOSED** | Lifecycle and sustained-session contracts complete repeated exit/re-entry with singular observers, matched heartbeat starts/stops, bounded owner depth, stable world identities and no browser errors. |

## Stage boundary

When canonical CI triggered by this documentation-only commit is fully green, **Stage 10 is formally complete** and Stage 11 full regression and release review may begin.

Until then:

1. Do not merge PR #1852.
2. Do not touch PR #1860.
3. Do not begin Stage 11 release review.
4. If this acceptance head exposes a real canonical failure, investigate that failure first and reopen only the affected Stage 10 item when evidence justifies it.
