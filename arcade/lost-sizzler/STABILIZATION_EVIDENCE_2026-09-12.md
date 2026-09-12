# C64 Dungeon Carnage — Stabilization Evidence — 2026-09-12

This file records verification evidence only. It does not change gameplay/runtime code and does not close historical defects by itself.

## Candidate under verification

- R30 ownership-audit throttle PR: #1976
- Exact runtime candidate head: `6d85d34324274f467c8caa6aa744e87edfce96bf`
- Repeatability verification PR: #1978
- Exact verification head: `15f9b8e4d939d2867c995cdf37767904d854b9ff`

## Canonical Load Safety

Lost Sizzler Load Safety #1845 completed successfully on the exact #1976 runtime candidate head.

- Result: **SUCCESS**
- Canonical matrix: **106 jobs**
- R1 stability: passed
- R18 Solo stability: passed
- five-depth live transition: passed
- multiplayer loader: passed
- locked XP-source browser contract: passed

The XP-source pass is significant because the candidate does not alter the locked progression rule: ordinary doors, switches and chests do not grant progression XP.

## R30 ownership-audit throttle

The focused R30 contract passed on #1976. The candidate retains the existing 40 ms recovery/watchdog cadence but avoids repeating deep ancestry scans during unchanged, already-verified Solo ownership. It performs immediate deep verification when owner identities change and a bounded periodic deep re-audit even when ownership remains stable.

This is verification evidence for LS-SOLO-002. It should move the remaining R30 stable-Solo scan-heavy path from unresolved implementation work into verification, but this evidence file does not mark the defect CLOSED.

## Sustained Solo repeatability

PR #1978 ran the existing long-session Solo soak unchanged in three independent jobs. Each job contains:

- one 60-second active baseline window;
- 12 pause/focus lifecycle cycles;
- one 60-second active post-lifecycle window;
- unchanged ownership/timing acceptance criteria;
- a fail-closed scope guard proving the verification PR changes only its workflow file.

All three corrected repeatability jobs passed.

### Repeat 1

- baseline simulation ratio: **0.9954**
- post-lifecycle simulation ratio: **0.9949**
- relative simulation cadence: **0.9995**
- owner changes: **0**
- R30 ownership repairs: **0**
- R30 movement repairs: **0**
- owner-seal repairs: **0**
- owner depths remained bounded at loop/update/move/damage = **1 / 2 / 4 / 6**

### Repeat 2

- baseline simulation ratio: **0.9968**
- post-lifecycle simulation ratio: **0.9990**
- relative simulation cadence: **1.0022**
- owner changes: **0**
- R30 ownership repairs: **0**
- R30 movement repairs: **0**
- owner-seal repairs: **0**
- owner depths remained bounded at loop/update/move/damage = **1 / 2 / 4 / 6**

### Repeat 3

- baseline simulation ratio: **1.0002**
- post-lifecycle simulation ratio: **0.9965**
- relative simulation cadence: **0.9963**
- owner changes: **0**
- R30 ownership repairs: **0**
- R30 movement repairs: **0**
- owner-seal repairs: **0**
- owner depths remained bounded at loop/update/move/damage = **1 / 2 / 4 / 6**

## Interpretation

These results provide repeated genuine sustained-play evidence around 1.00x active simulation cadence before and after lifecycle stress, with bounded ownership ancestry and no R30 repair activity during the measured windows.

This strengthens verification evidence for LS-SOLO-001, LS-SOLO-002, LS-SOLO-003 and LS-SOLO-004. It does not independently prove that every historical stabilization defect can be closed; closure should remain tied to each defect's explicit exit criterion and any required live-production/manual evidence.

## Scope and safety

No gameplay/runtime file is changed by this evidence record.

No change is made to:

- XP/reward behaviour;
- the protected intro-loader stack;
- `games/games.json`;
- Supabase, database or storage data;
- commerce or purchaser-download behaviour.

No C64 Dungeon Carnage PR should be merged without explicit authorization for that exact PR.
