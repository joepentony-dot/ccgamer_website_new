# C64 Dungeon Carnage — Enemy AI & Movement Review

Status: **DEFERRED UNTIL R61 P0 + CURRENT VISUAL OVERHAUL ARE STABLE**
Created: 28 September 2026

## Purpose

Perform a deliberate game-feel and AI pass after the current runtime-integrity and visual work. Do not mix this into emergency FIRE/death fixes or art-only slices.

## Current system findings

### Simulation movement is grid-authoritative

- AI uses four cardinal directions only: `DIRS=[[1,0],[-1,0],[0,1],[0,-1]]`.
- A* pathfinding and enemy occupancy operate on integer tile cells.
- `moveToward()` commits an enemy directly from one tile cell to the next; bursts may execute more than one tile step for selected behaviours.
- Player gameplay is also tile-authoritative, with renderer interpolation through `rx/ry` creating apparent smooth motion.
- This grid ownership is deeply coupled to traps, doors, furniture, room generation, exact-cell objectives and collision.

### Enemy archetypes are already partially differentiated

Current AI includes:
- melee cadence differences for spider/skeleton/knight/hunter/charger/guardian/champion;
- ranged Ranger, Root, Cook, Guard, Firebreather and Guardian attacks with different range/power/cooldowns;
- Charger telegraph + multi-tile committed charge;
- Cook support/heal behaviour;
- ranged retreat/kiting logic;
- ambusher player-position prediction;
- cover selection, flank targets and pressure modes;
- search/memory states and line-of-sight;
- named-enemy retreat + restore-potion behaviour;
- distinct tactical-skill baselines by enemy kind, with higher floors/elite durability indirectly improving some tactical selection through stats.

### Difficulty is not yet a full AI-intelligence scale

The public difficulty table currently directly weights:
- enemy HP;
- enemy damage;
- loot;
- ammo economy;
- stalker pressure.

It does **not** directly scale tactical skill, flank probability, cover usage, reaction/decision interval or attack telegraph windows by CASUAL / ARCADE / SIZZLER / GOLD MEDAL.

Tactical intelligence is currently driven mostly by enemy kind and elite/named/guardian status. Therefore difficulty modes are currently more stat/resource-pressure weighted than behaviourally intelligent.

### Floor progression already has a separate tempo curve

Campaign floor profiles increase HP/tempo pressure and reduce ammo targets across floors, while stalker timing tightens. This is separate from the chosen difficulty setting and should remain independently tunable.

## Review questions / intended upgrades

### 1. Difficulty-aware tactics
Evaluate adding a bounded behavioural multiplier per difficulty, separate from damage/HP:
- CASUAL: slower re-plan, lower flank/cover commitment, longer telegraphs;
- ARCADE: current intended baseline;
- SIZZLER: modestly faster re-plan, more coordinated flank/cover use;
- GOLD MEDAL: highest tactical commitment, not unfair reaction speed.

Do not simply make harder modes move dramatically faster. Difficulty should improve decision quality more than raw speed.

### 2. Stronger attack archetypes
Audit every generic and named enemy for a recognisable combat role:
- pursuer/bruiser;
- skirmisher;
- ranged suppressor;
- ambusher;
- charger;
- support/healer;
- area denial / elemental;
- stalker/indestructible pressure;
- guardian/boss pattern.

Each should have readable tell → action → recovery rather than sharing a generic contact attack wherever possible.

### 3. Telegraph and recovery design
Introduce/standardise:
- attack wind-up indicators;
- committed attack windows;
- post-attack recovery;
- dodge/cover opportunities;
- cooldowns tuned per archetype and difficulty.

Named enemies should have richer attack patterns without becoming unavoidable.

### 4. Movement-model decision
Do **not** switch wholesale to unrestricted analogue/free movement without a prototype and regression plan.

Preferred first prototype:
- retain tile-authoritative coordinates/collision/pathfinding;
- improve visual interpolation, input buffering and animation blending;
- optionally allow richer 8-way facing/aiming while movement commits to safe tile cells;
- test shorter movement cadence and continuous-looking interpolation.

Reason: full sub-tile free movement would require rewriting trap exact-cell contact, doors, furniture collision, AI occupancy, A*, objectives, multiplayer/local-2P assumptions and many regression contracts.

Only consider true free/sub-tile movement if the hybrid tile-authoritative prototype still feels too rigid.

### 5. Required evaluation
Before implementation:
- capture current attack cadence by archetype;
- measure tactical decisions/flank/cover frequency;
- test each difficulty on the same deterministic floor/seed;
- compare time-to-contact, damage pressure and avoidance windows;
- verify no enemy can occupy the player cell;
- preserve sanctuary/door/room-entry rules.

## Tentative recommendation

The safest high-value direction is **not** to discard the tile simulation. Keep deterministic grid-authoritative gameplay and make it feel substantially smoother through interpolation, animation, input buffering and better archetype timing. Add difficulty-weighted tactical decision quality rather than merely increasing speed/damage.

This review becomes active after the R61 runtime-integrity P0 and the current major graphical overhaul are qualified.
