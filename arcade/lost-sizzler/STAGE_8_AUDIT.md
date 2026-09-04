# The Lost Sizzler — Stage 8 Solo Expansion Audit

## Status

**Stage 8 audit opened after the accepted Stage 7 stabilization boundary.**

Stage 7 is complete. The Solo runtime, ownership model and timing contracts accepted in `STAGE_7_ACCEPTANCE.md` are now treated as protected infrastructure while Stage 8 expands the playable Solo game.

PR #1852 remains a draft and must not be merged. PR #1860 is outside this programme and must not be touched.

## Stage 8 purpose

Stage 8 expands the Solo dungeon without reopening the stabilization programme unless new evidence demonstrates a genuine regression. The focus is playable content and world depth:

- talking NPCs with meaningful roles
- richer environmental identity
- more room and floor variation
- events and encounters
- world interactions
- exploration rewards and secrets
- environmental storytelling
- quests, tasks and services
- deeper use of existing mechanics

The goal is not to create parallel systems for features the game already owns. Stage 8 should compose with the existing dungeon, progression, shop, rescue, shrine, trap, puzzle, rare-event and environmental systems.

## Protected Stage 7 boundary

The following accepted architecture is not a Stage 8 refactor target:

- R59 remains the authoritative Solo RAF/simulation owner.
- Solo timing remains 45 ms maximum substep, 1080 ms accepted visible-gap ceiling and 24 maximum substeps.
- R30 remains the accepted passive/narrowly scoped movement, input and fault watchdog.
- R57 retains its narrowed lifecycle/pending-work bridge and its legitimate stall/contact/timed/Spy responsibilities.
- R60 recurring live-owner maintenance remains Horde-only; Solo ownership remains event-driven/one-shot.
- R32 Spy loading remains event/lifecycle-driven with no ordinary-Solo recurring poll.
- Existing wrapper ancestry and `__ccgOriginal` chains remain intact.
- New gameplay content must not introduce another authoritative frame/update owner or a general-purpose polling repair loop.

Any Stage 8 change that appears to require altering those contracts must stop and produce evidence first.

## Existing Solo content inventory

The audit confirms that the current game already contains a substantial content layer. Stage 8 should extend it rather than duplicate it.

### Structural dungeon variety

The existing dungeon-variety layer already produces and records galleries, alcoves, dead ends, junctions, parallel loops, shortcuts, great halls and open thresholds. Dead ends can already receive exploration reward caches.

Stage 8 should therefore use this structural metadata as content anchors before adding more map-carving logic.

### Existing encounters and interactables

The existing systems include, among other features:

- secret passages and reward chests
- room doors and themed furniture
- grand halls, fireplaces, wall lights and sanctuary rooms
- traps, generators, shrines and switches
- remote secret switches
- arenas and timed rooms
- the Trapped CCG Scout rescue
- guardian and champion enemies
- treasure goblin
- Sigil chamber progression
- blood-clue, memory, torch-sequence and weight-bridge puzzles
- blade-gallery, ember-tile and arrow-slit hazards
- skeleton, spider and haunted-corridor encounters
- boulder trap
- Count Loadula and Death Stalker encounters
- floor themes and resource packs
- bronze-key/lock progression
- entrance shop, hidden trader and wandering merchant systems

A Stage 8 feature should preferably make one or more of these systems more meaningful rather than add a second version of the same mechanic.

### Existing interaction boundary

`game-play.js` already has an event-driven movement interaction boundary. Player movement invokes the established switch, trader, cache, puzzle, shrine, trap, rescue, arena, timed-room, boulder, haunted-corridor, Sigil-room, room-visit and trail triggers.

This is the preferred integration model for Stage 8: react to an existing state transition or explicit interaction, then return control to the authoritative runtime. Do not add a new always-running gameplay loop merely to detect nearby content.

### Existing services

The shop system already provides meaningful services and purchases through the existing shop mode, including supplies, armour, ammunition, inventory capacity, teleporting, randomized weapons and special progression purchases.

Talking shopkeepers or service NPCs should enrich these existing services, not create a parallel economy.

### Existing character-like content

There are already several NPC-adjacent elements:

- the Trapped CCG Scout rescue target
- the wandering merchant encounter
- the Gilded Elf chase/reward encounter
- sanctuary dancers with lightweight greeting text

These are useful composition points, but the inspected runtime does not yet expose a reusable, stateful Solo dialogue framework that can support multiple NPC roles without each feature inventing its own presentation and lifecycle rules.

## Duplication and regression risks

The audit identifies the following Stage 8 risks:

1. **New polling gameplay systems** — a new 50/80/100 ms NPC or quest scanner would work against the stabilization architecture. Prefer movement, interaction, lifecycle and existing host-state events.
2. **Parallel economies** — merchant and shop systems already exist. New service NPCs should route through or enhance those services.
3. **Parallel objective state** — rescue, Sigil, keys, puzzles and room metadata already provide progression state. New tasks should reference authoritative host/run state rather than shadow it.
4. **Map obstruction** — new scenery or NPC placement must yield to doors, progression items, shops, shrines, switches, generators, chests, players and the start/exit route. Optional decoration must move or disappear before progression-critical content does.
5. **Mode contamination** — Stage 8 content is Solo-first and must no-op safely in Horde, Spy Vs Spy and unrelated special-mode ownership paths unless a later stage explicitly adopts it.
6. **New gameplay modes for dialogue** — introducing a global `mode="dialogue"` would unnecessarily touch pause, save and frame lifecycle. The first NPC slice should use non-blocking presentation while normal Solo ownership stays active.
7. **Wrapper growth** — new content should not repeatedly wrap `update`, `movePlayer`, `hurtPlayer`, the authoritative mode boundary or the R59 clock.

## First implementation slice — Trapped CCG Scout dialogue

The safest first Stage 8 gameplay slice is a reusable, event-driven Solo NPC dialogue layer first applied to the existing **Trapped CCG Scout**.

### Why the Scout first

The Scout is a better first integration target than the merchant or a newly spawned NPC because:

- the Scout already exists in canonical host state
- position, following/rescue progression and proximity handling already exist
- no new spawn algorithm is required
- no shop pricing or economy balance changes are required
- the interaction already has a natural event-driven trigger
- it can demonstrate dialogue states without creating a new simulation owner
- the same dialogue presentation can later be reused by merchants, sanctuary figures and quest/service characters

### First-slice behaviour

The initial slice should provide a small reusable dialogue surface with state-aware Scout lines for at least:

- trapped / first encounter
- rescue accepted / now following
- repeat interaction while following
- post-rescue or safe-state acknowledgement where the canonical rescue state makes that available

The first slice is deliberately non-blocking. It should not pause the Solo simulation, create a new global gameplay mode or modify combat balance.

### First-slice non-goals

The initial NPC foundation will not:

- change score, gold, health, mana, item balance or shop prices
- alter enemy AI or combat damage
- carve new dungeon geometry
- alter save schema unless a demonstrated dialogue persistence requirement cannot be represented by existing run/host state
- change Horde or Spy gameplay
- add a recurring proximity timer
- modify R30, R57, R59 or R60 ownership behaviour
- replace the current rescue progression rules

## Stage 8 implementation principles

1. **Event-driven first.** Use existing movement/proximity, explicit interaction, room-entry or lifecycle boundaries.
2. **Compose with authoritative state.** Dialogue and tasks describe existing run/host state; they do not invent competing copies of it.
3. **Content yields to progression.** Decorative/NPC placement must never make a required item, door, route or objective inaccessible.
4. **One contained slice at a time.** Every meaningful gameplay addition gets focused regression coverage before the next slice.
5. **Cross-mode isolation is part of acceptance.** Solo additions must safely disappear or become inert outside the intended mode.
6. **No stabilization regression debt.** If a Stage 8 feature causes owner-depth growth, cadence drift, repeated repair activity, save/continue failure or movement failure, fix the feature rather than weakening the Stage 7 contract.

## Planned Stage 8 sequence

The current preferred sequence is:

1. **Scout dialogue foundation** — reusable event-driven dialogue presentation and stateful Scout conversation.
2. **Merchant character layer** — reuse the dialogue surface around the existing merchant/shop economy without changing prices or lifetime rules.
3. **Sanctuary NPC roles** — turn selected sanctuary figures from decorative greetings into meaningful information/service characters where appropriate.
4. **Environmental storytelling** — attach lore, clues and micro-events to existing room types and dungeon-variety metadata.
5. **Exploration interactions** — deepen dead ends, galleries, alcoves, shortcuts and hidden areas using existing placement safety rules.
6. **Small tasks and services** — reuse rescue, shrine, trader, Sigil, key and room-state systems rather than adding parallel progression engines.
7. **Floor/environment identity pass** — strengthen visual and gameplay distinction between existing floor themes without obstructing routes or objectives.
8. **Encounter chains and rewards** — connect existing optional encounters into more meaningful short arcs.
9. **Stage 8 regression/soak gate** — repeat Solo, save/continue, movement, lifecycle and cross-mode isolation tests before Stage 9 Horde reconstruction begins.

This order is evidence-driven rather than fixed. A slice may move later if its safest integration point depends on a prerequisite discovered during implementation.

## Acceptance criteria for the first Scout slice

Before the first Stage 8 gameplay slice is accepted:

- a fresh Solo run still reaches `playing`
- Scout dialogue appears from an event-driven interaction
- rescue/following progression remains unchanged
- normal movement remains responsive immediately after dialogue
- no new recurring NPC/dialogue interval exists
- no additional authoritative update/frame owner is installed
- no R30/R57/R59/R60 ownership contract is modified
- dialogue is inert outside its intended Solo dungeon context
- floor transition and Save & Quit -> Continue remain valid
- JavaScript syntax and canonical Node contracts pass
- a focused Chromium regression covers the dialogue interaction and post-dialogue movement/progression state
- the full canonical Lost Sizzler Chromium suite passes before the slice is considered complete

## Stage boundary

Stage 8 is now open for implementation. Stage 9 Horde reconstruction must not begin until the Stage 8 Solo expansion acceptance pass is complete.

PR #1852 remains the programme branch and must stay draft/unmerged until Stage 11 release qualification is complete.
