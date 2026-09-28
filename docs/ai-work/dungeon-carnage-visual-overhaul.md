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
