# C64 Dungeon Carnage — Visual Overhaul Workstream

Status: **ACTIVE / ONGOING**
Started: 28 September 2026
Authoritative branch at creation: `codex/dungeon-visual-overhaul-stage1-20260928`
Creation base: `00922200267fb915c9dd38a367b0f2c339097fd5`

## Objective

Replace the remaining rudimentary / placeholder-looking Dungeon Carnage graphics with a coherent, substantially richer top-down pixel presentation while preserving established gameplay, collision, save/progression, mobile behaviour and performance.

This is an ongoing product-development programme rather than a single cosmetic patch.

## Locked scope and order

### Stage 1 — environment + interactables

Highest priority visual replacements:

- dungeon floors and wall tiles;
- chests and chest state animation;
- switches / buttons / levers;
- exit sigil / sigil-gate visual language;
- doors, shrines, altars and objective markers;
- ordinary trap presentation;
- environmental props, furniture and room dressing;
- biome-specific floor/wall variants for the five-floor campaign.

The first Stage-1 implementation establishes versioned local asset slots before replacing individual art families. Existing canvas/atlas art remains the fallback until a replacement is validated.

### Stage 2 — player animation

Increase the player character from the current limited sheet/pose treatment to a richer directional state set:

- idle;
- walk/run;
- firearm attack;
- melee attack;
- hurt;
- death;
- optional contextual/special-action frames where they improve readability.

Movement coordinates, collision radius, attack cadence and input ownership must not be altered by sprite work.

### Stage 3 — enemy animation

Expand each supported enemy family beyond the current mostly procedural/static rendering:

- idle;
- movement;
- attack;
- hurt;
- death;
- special action where relevant.

Named enemies may retain bespoke portraits/identity art, but their in-world presentation should match the upgraded environment.

### Stage 4 — consistency + polish

- lighting and sprite readability;
- coherent scale and pixel density;
- biome colour treatment;
- active/inactive switch and sigil states;
- mobile readability;
- animation timing;
- no disorientating whole-screen effects;
- performance and memory checks.

## Asset sourcing rules

External assets may be used only when their licence is verified before import. Prefer CC0/public-domain sources so the project can redistribute the packaged browser/itch.io build without attribution or commercial-use ambiguity.

Do not hotlink production art. Approved source art must be copied into the repository under a local asset path and have provenance recorded here before runtime use.

### Primary source candidate — 0x72 DungeonTileset II

Source: https://0x72.itch.io/dungeontileset-ii

Verified characteristics at workstream creation:

- 16x16 top-down fantasy/dungeon pixel art;
- CC0 asset licence;
- free / name-your-own-price download;
- includes animated characters and weapons;
- changelog explicitly includes switches/buttons and spike traps;
- supports autotiles and therefore fits the floor/wall upgrade work.

This is the preferred first source because it covers environment, interactables and character animation in one coherent style.

### Secondary source — Kenney Tiny Dungeon

Source: https://kenney.nl/assets/tiny-dungeon

Verified characteristics:

- 16x16;
- 130+ files;
- Creative Commons CC0;
- dungeon / sewer / roguelike pixel style.

Use as a complementary source only where the visual language remains consistent.

### Secondary source — Screaming Brain Studios Top Down Dungeon Pack

Source: https://screamingbrainstudios.itch.io/top-down-dungeon-pack

Verified characteristics:

- 2,256 top-down dungeon tiles;
- 64x64 source tiles;
- CC0/Public Domain;
- 28 wall variations and 14 floor variations.

Potentially useful for biome/environment variety, but scale/style compatibility must be tested before adoption.

## Provenance requirements for every imported external asset

Record:

- source pack;
- source URL;
- licence;
- original filename;
- local repository filename;
- whether modified/cropped/recoloured;
- import date.

Do not mix packs merely because individual tiles look attractive. A smaller coherent art set is preferred to a visually inconsistent collage.

## Technical integration boundary

The renderer must expose versioned slots for:

- player sheet;
- enemy atlas A/B;
- chest sheet;
- switch sheet;
- sigil/exit sheet;
- environment tileset / atlas.

The current V10.34/V10.35 assets stay as safe fallbacks until each category replacement is accepted.

No visual replacement may modify:

- world generation ownership;
- player/enemy collision;
- chest/switch/sigil gameplay state;
- attack cadence;
- trap-health rules;
- XP rules;
- save/progression state;
- native scrolling;
- supported Solo / Tutorial / local 2P Split Screen scope.

## Qualification

Every visual slice requires:

1. static contract proving the local/versioned asset owner;
2. browser smoke on desktop;
3. representative portrait mobile check;
4. no canvas/page errors;
5. existing Dungeon canonical/Node and Chromium matrix where runtime JavaScript changes;
6. comparison screenshots or other visual evidence before replacing a fallback permanently.

## Current checkpoint — 28 September 2026

- Repository P0 FIRE/trap rewrite has already advanced through later merges on main; this workstream starts from current main rather than stale #2361/#2391 history.
- No open PR existed when this branch was created.
- Existing visual assets include explorer/chest sheets plus V10.35 enemy and environment atlases.
- Stage 1 begins by adding explicit visual-overhaul asset slots and preserving existing art as fallback.
- First external source target is 0x72 DungeonTileset II because its CC0 pack includes switches/buttons, traps and animated characters in one top-down style.
- Actual third-party binaries must not be committed until the source package has been retrieved from the authoritative source and provenance recorded.


## Stage 1 implementation checkpoint — 28 September 2026

The first licensed replacement family is now committed locally under:

`arcade/lost-sizzler/assets/pixel/visual-overhaul/0x72/`

Imported CC0 assets include:

- ordinary and alternate lever graphics;
- blue button up/down graphics;
- three chest opening frames;
- four spike-trap frames;
- floor atlas;
- low-wall atlas;
- high-wall atlas.

The complete source/provenance record travels with the files in `PROVENANCE.md`.

### First live replacement

Switches are the first production renderer slice to move off the rudimentary canvas-only art:

- normal switches default to `lever-left.png`;
- secret switches default to `lever-right.png`;
- both remain overrideable through `CCG_ASSET_OVERRIDES.images.visuals`;
- existing canvas switch art remains the decode/error fallback;
- switch gameplay position, trigger, shoot/touch interaction and labels are unchanged.

### Character-animation source direction

0x72 remains suitable for Stage 1 environment/interactable work, but its own source documentation does not provide the attack/death breadth required for the player/enemy overhaul.

Preferred Stage 2/3 candidate: Shade's free **Puny Characters / Puny Monsters** family, CC0. The player pack provides idle, walk, sword, bow, staff, throw, hurt and death animation sets and ships alongside a free monster pack, making it a stronger coherent base for richer player/enemy animation than forcing the environment pack to do both jobs.

Do not import the Puny binaries until the same local-provenance process used for 0x72 is completed.


## Chest + spike visual slice — 28 September 2026

- The imported 0x72 chest frames are now the default live chest presentation rather than merely staged binaries.
- Chest opening uses the three local CC0 frames; rarity/locked aura, lock indicator, labels and gameplay state remain owned by the existing chest runtime.
- A caller-supplied legacy chest sheet can still override the CC0 defaults, and the established V10.34 sheet plus rich canvas fallback remain available if replacement frames fail to decode.
- Ordinary SPIKE traps now use the four imported CC0 animation frames. The renderer maps the existing authoritative `SYS.trapActive()` state to safe/retracted versus animated active frames; trap timing and damage ownership are unchanged.
- FIRE and SHOCK traps remain on their established renderer until equally coherent licensed replacements are selected.
- Static contracts now require all chest/spike frame slots and the live frame-based rendering paths.


## Door asset staging — 28 September 2026

- Five additional 0x72 CC0 door assets are now copied byte-for-byte into the local visual-overhaul bundle: closed/open door leaves plus left/right/top frame pieces.
- Source and destination Git blob SHAs match exactly and are recorded in the local provenance ledger.
- Versioned override slots are exposed and the renderer preloads the local files.
- The live door drawing routine has deliberately not been replaced yet: orientation/composition must be visually verified before switching away from the established door renderer. This avoids guessing at sprite orientation and accidentally reducing readability.


## Exit sigil / portal slice — 28 September 2026

- Imported the exact unmodified CC0 animated portal source from a GitHub mirror whose credits point to MatiasVME's OpenGameArt `portal-2` page.
- The source and destination Git blob SHA are identical: `09ae7bb501d730a159c92276a7b6971d953af3a7`.
- The 160x40 strip contains five 32x40 frames and is stored locally under `assets/pixel/visual-overhaul/cc0-portal/`.
- The floor EXIT SIGIL collectible now uses a small animated version of this art when decoded, replacing the previous key-like fallback presentation. Existing item interaction/state is unchanged.
- The ready floor-exit portal uses the same animated CC0 art inside the established monumental arch/aura, preserving the strong destination silhouette while replacing the synthetic portal core.
- The previous canvas sigil/key and gradient portal remain decode/error fallbacks; owner-provided item overrides still take precedence.


## R54 chest-contract reconciliation — 28 September 2026

The first full exact-head qualification correctly exposed a historical contract that still required the V10.34 chest sheet to remain the *normal* chest renderer. That requirement conflicts with the approved graphical-overhaul objective.

The contract has been updated without removing the safety boundary:

- the imported CC0 three-frame chest set is now required as the normal upgraded renderer;
- the established V10.34 sheet must still be explicitly loaded and reachable as a compatibility/decode fallback;
- owner-supplied chest sheets remain supported;
- the rich canvas chest remains the final fallback.

No chest gameplay, lock/key, reward or interaction assertion was relaxed.
