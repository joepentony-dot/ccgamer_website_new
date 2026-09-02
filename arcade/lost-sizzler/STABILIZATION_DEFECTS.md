# Lost Sizzler Solo Stabilization Defect Ledger

This ledger tracks the stabilization programme on `codex/lost-sizzler-solo-stabilization`.

Status values: `OPEN`, `INSTRUMENTED`, `FIX IN PROGRESS`, `VERIFYING`, `CLOSED`.

## Active defects

| ID | Status | Defect | Evidence / current finding | Exit criterion |
| --- | --- | --- | --- | --- |
| LS-SOLO-001 | INSTRUMENTED | Long-session Solo simulation can become sluggish and later accelerate | Passive diagnostics now measure Solo active wall time against `run.elapsed`, update rate, runtime-owner changes and recovery counters. The defect is not considered reproduced numerically until a soak records the ratio excursion. | Long-session reproduction captured; final fixed build remains approximately 1.00x active wall time through sustained play and pause/visibility transitions. |
| LS-SOLO-002 | OPEN | Multiple periodic runtime ownership systems compete with the frame loop | R59 owns the final RAF callback but also runs `ensure()` every 40 ms. The mode runtime runs its lifecycle `frame()` every 40 ms. R30 owner seal checks movement ownership every 16 ms. R30 global movement guard also runs a 40 ms monitor. These systems can reassert global owners independently of RAF simulation. | One authoritative Solo simulation/update owner; remaining monitors are passive or narrowly scoped and cannot repeatedly replace Solo frame/update ownership. |
| LS-SOLO-003 | INSTRUMENTED | Pause/focus/visibility transitions may interact with retained timing debt or recovery logic | R59 resets accepted RAF timestamp at pause boundaries, counts discarded paused gaps, and performs long-gap combat recovery only during visible `playing`. Diagnostics now expose R59 accepted/duplicate frames, long gaps, recoveries, pause boundaries and discarded gaps for correlation. | Repeated pause/resume, focus loss and visibility cycling produce no accumulated simulation debt, burst, slowdown or acceleration in soak coverage. |
| LS-SOLO-004 | OPEN | Runtime ownership repair activity is not yet bounded for stable Solo play | R30 owner seal can repair `movePlayer` every 16 ms and resets movement cooldowns on repair. R30 global movement guard can force-restore update/movement/damage ownership. Mode runtime can reinstall mode-owned gates and shared frame boundary. R60's 40 ms live-play installer also checks several owners by top-level marker, which can trigger repeated re-wrapping if another valid owner is layered above them. | Stable Solo soak records no unexplained ownership churn/reassertion growth during ordinary play; any repair is event-driven and attributable to a real ownership transition/fault. |
| LS-SOLO-005 | INSTRUMENTED | Canonical load-safety gate deterministically loses the top-level R60 environmental damage owner late in the Solo integrity sequence | On head `34eea8cb...`, Canonical game load safety reached `v10-41-r60-solo-live-integrity.mjs`, passed startup, roster, smoothing, simulation-rate, six pause/resume cycles and movement-cadence checks, then failed because `window.hurtPlayer.__ccgV141R60EnvironmentSeal` was false. Earlier R60 checks passed. The test now records the full `hurtPlayer` wrapper ancestry at the failing point while preserving the failing assertion, so the competing owner can be identified without weakening coverage. | Identify the owner above/beside R60, prove environmental damage semantics and wrapper depth remain stable, remove the ownership race, then make Canonical load safety pass consistently without relaxing the regression. |

## Architecture findings

- `v10-41-r59-live-regression-fixes.js` is the current final RAF owner. It also reasserts the loop, pause wrappers, Solo floor-autosave wrapper and Spy r58 rules from a 40 ms maintenance interval.
- `v10-41-mode-runtime.js` maintains mode lifecycle and owned-system gates from a separate 40 ms interval while also supplying the shared frame boundary.
- `v10-41-r30-owner-seal.js` checks normal movement ownership every 16 ms and can restore the golden `movePlayer` owner plus clear movement cooldowns.
- `v10-41-r30-global-movement-guard.js` maintains update/movement/damage ownership and movement-stall recovery on another 40 ms monitor.
- `v10-41-r60-horde-combat-integrity.js` includes a Solo live-play addendum whose 40 ms installer currently identifies update, movement, start and environmental owners by top-level markers. `wrapEnvironmentalDamage()` does not inspect wrapper ancestry before installing another R60 layer.
- None of these monitors is being removed during instrumentation. Removal/consolidation starts only after numerical reproduction and regression coverage are in place.

## Closed defects

None closed by the stabilization programme yet. Existing historical r29/r30 fixes remain historical and are not reclassified as stabilization closures without fresh verification.

## Verification policy

A short CI smoke test is insufficient to close LS-SOLO-001 or LS-SOLO-003. Long-session timing defects require soak evidence. The target is sustained Solo simulation time approximately equal to active visible wall time, with pause/hidden time excluded and no later catch-up burst.
