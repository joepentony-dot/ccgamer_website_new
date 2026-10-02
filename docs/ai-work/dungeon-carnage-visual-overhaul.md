## R97 character and uploaded-soundtrack regression repair — 2 October 2026

- Owner reported the beta had reverted to basic sprites and bundled music, and reiterated the prior licensed RPG enemy-art/name directive. Current main refreshed as `f38b84f0985d642f5daf7259cba633018a01814d` (R96); no open PR existed before this bounded repair. Candidate branch: `codex/dungeon-r97-rpg-sprites-soundtrack`.
- Confirmed graphics cause: R84 emptied the Puny campaign map and restricted the legacy atlas renderer to the Warden. R94 changed ordinary labels without restoring matching authored bodies. Prior completion was incomplete; do not ask the owner to choose/repeat the already-recorded instruction.
- Confirmed audio cause: starting before admin readiness creates a persistent bundled slot; readiness previously reused it even when the authoritative uploaded playlist changed. An actual-module Node VM reproduction failed before the fix and the repaired behaviour passes. Both current and parked slots now validate their URL against the current category list; unchanged tracks preserve Audio object/time and remote local looping.
- Production read-only verification found all 16 enabled uploaded music rows and non-empty stored objects: Exploration 5, Danger 3, Sanctuary 2, Named 3, Stalker 3. Anonymous RLS reads returned all 16. No music was deleted or replaced in storage. Automation intentionally skips remote media, explaining why older green browser checks did not establish soundtrack acceptance.
- Candidate R97 restores authored art through explicit semantic routes, includes two unmodified Shade CC0 orc sheets with exact source/blob provenance, and renames only generic charger/cook display labels to Orc Reaver/Orc Scavenger variants. Established CCG explorer, followers, Count Loadula, Death Stalker, Sigil Warden and champion labels retain their authority. Cassette and drive robot atlas rows are excluded.
- Performance controls remain: crowd scheduling and quality tiers are unchanged; decoded authored sprites remain available at every quality tier. Gameplay, AI, collision, damage, stats, progression, saves, inventory and the frozen beta cohort/expiry are unchanged. Actual owner-device performance and hands-on acceptance remain unverified.
- Local focused checks passed: `v10-42-r97-rpg-sprite-routes.mjs`, `v10-7-audio-playlists.mjs`, `v10-42-ccg-player-enemy-identity.mjs`, `v10-42-r84-visual-topology.mjs`, `v10-42-visual-overhaul-foundation.mjs`. New behaviour coverage includes late uploaded source replacement, lazy parked category refresh, no overlap/no repeated recreation, saved playback position, matching sprite frames/directions and named/decode fallbacks.

| Ordinary name (early / mid / late floors) | Gameplay kind | Authored art |
| --- | --- | --- |
| Dustweb / Gloomweb / Bloodweb Spider | spider | purple spider, existing atlas creature row 0 |
| Crypt / Mossbound Skeleton / Ashen Boneguard | skeleton | skeletal sword/shield fighter, creature row 1 |
| Archive / Crypt / Blood Knight | knight | armoured knight, creature row 2 |
| Vault / Catacomb / Citadel Scout | scout | Shade CC0 Archer Green, bow animation |
| Relic / Gloom / Blood Hunter | hunter | armoured hunter, standard A row 2 |
| Shadow Ambusher / Nightblade / Duskblade | ambusher | hooded assassin, standard A row 1 |
| Iron / Runebound / Citadel Guard | guard | Shade CC0 Human Soldier Red |
| Orc / Crypt Orc / Citadel Orc Reaver | charger | Shade CC0 Orc Grunt; rename generic enemy to match |
| Rune / Deep / Ash Ranger | ranger | hooded bow ranger, standard B row 0 |
| Thorn Caster / Briar Hexer / Ashen Hexer | root | thorn creature, standard B row 2 |
| Orc / Crypt Orc / Citadel Orc Scavenger | cook | Shade CC0 Orc Peon Red; rename generic enemy to match |
| Ember Fiend / Cinder Fiend / Infernal Maw | firebreather | flame-breathing horned creature, standard B row 4 |
| Archive / Memory / Blood Wraith | ghost | blue spectral wraith, standard A row 4 |

- Candidate release is `V10.42 r97 / 20261002r97`; service worker code cache advances v48 to v49. Exact-head PR Qualification, Full Qualification including all six Chromium shards and every applicable site/package/cache check remain mandatory before merge. Live remains R96 until deployment is verified. Hourly development stays paused; no further notifications, access changes or new features.

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


## Floor + wall texture slice — 28 September 2026

- Switched the environment implementation from uncertain atlas coordinates to the pack's individually named 16x16 files: eight floor variants, one standard wall tile and two damaged wall variants.
- Every imported environment file is unmodified and has a destination Git blob SHA identical to its source blob.
- Walkable cells now receive a deterministic floor variant selected from the existing renderer tile hash. The art is alpha-blended over the established theme floor colour so each biome retains its identity.
- Solid wall cells now receive the authored wall texture, with sparse deterministic damaged-wall variants. Existing theme-specific masonry, ironwork, archive panels, books, webbing and other room detail remains layered above the new texture.
- Map data, collision, walkability and world-generation ownership are untouched; this slice changes canvas presentation only.


## Player animation Stage 2 slice — 28 September 2026

- Imported Shade's free CC0 `Warrior-Blue.png` Puny Characters sheet unmodified. Four independent mirrors carried the identical Git blob SHA `03f4c87f30c7fcb754fccb42e02459294f0acd2e`; the local destination uses the same blob.
- The 768x256 sheet is 24 columns by 8 direction rows, each cell 32x32.
- Dungeon Carnage now maps its four directions to Puny rows 0/2/4/6 (down/right/up/left).
- Idle uses the two authored idle frames; walking uses the two authored walk frames; melee maps the existing eight-stage combat timing over the four authored attack frames; hurt uses the authored hurt sequence.
- FIRE intentionally retains the idle body pair plus Dungeon Carnage's established recoil/weapon overlay instead of rendering the sheet's bow/staff attack art underneath a firearm.
- The existing V10.34 explorer sheet and procedural character remain fallback layers if the CC0 sheet cannot decode.
- Player coordinates, input, collision, projectile ownership, melee timing, firearm cadence and damage are unchanged.

## Enemy animation Stage 3 slice — 28 September 2026

- Imported four unmodified Shade Puny-family CC0 sheets locally: Warrior Red, Human Soldier Red, Archer Green and Mage Red.
- Official licensing remains anchored to Shade's free Puny Characters page, which lists the free Puny character and monster downloads under CC0. Repository acquisition uses byte-addressable public Git blobs and records each exact SHA in `shade-puny-enemies/PROVENANCE.md`.
- Standard humanoid enemy families now attempt authored 32x32 Puny animation first. Idle uses columns 0–1, movement 2–3, attack 4–7, hurt 18–20 and defeat 21–23, with Dungeon facing mapped to direction rows 0/2/4/6.
- Warrior, Soldier, Archer and Mage sheets are distributed across enemy roles so enemies no longer share a single procedural pose language.
- Spider, Ghost, Death Stalker, followers and malformed/missing sheets remain on the established procedural renderer as intentional fallbacks.
- The defeat queue now feeds its progress into the authored death sequence before falling back to the previous procedural body.
- Enemy AI, coordinates, collision, attack cadence, damage, trap ownership, FIRE ownership and progression are unchanged. This slice is renderer/assets only.
- Fresh exact-head canonical/Node + Chromium qualification is mandatory because runtime JavaScript changed.


## Main reconciliation checkpoint — 28 September 2026

- Pre-reconciliation visual head `3a7c3669480a9d539cba5d5d132e85684fc7440d` completed all triggered checks successfully.
- Live main then advanced to `9abd513b4bc5b7f1d1d579c8ec9a973d3ce68c46` through the authoritative R59 FIRE/trap remediation, leaving #2395 55 commits behind and GitHub reporting the PR dirty.
- Reconciliation is deliberately main-first: preserve the complete R59 runtime tree, overlay only the visual branch's renderer/assets/contracts, and combine continuation documentation rather than taking the stale branch copy.
- After publishing the merge commit, the new exact head requires fresh visual contracts plus the complete applicable Dungeon qualification matrix before further visual slices are added.


## R60 main reconciliation checkpoint — 28 September 2026

- Authoritative gameplay main is now `2b8c9613255b0e9f3aa7c2f98f13cd6986e1f046` after fully qualified R60 PR #2396 merged.
- Pre-reconciliation visual head is `376b7ff1f2e1daf5637d254108dc57b2cafe7fd3`. Its previous full-matrix red result was confined to the R59 encounter-trap keyboard overshoot fixture; the qualified R60 mainline carries the corrected bounded input contract.
- Reconciliation is main-first and two-parent: retain the complete R60 tree, then overlay only this workstream's unique asset-manifest entries, local visual assets, renderer/animation modules, visual contracts and this documentation.
- Do not take stale R59 copies of gameplay, FIRE/trap ownership, floor-choice/cache/HUD/effect-safety runtime, version identity or unrelated tests from the visual branch.
- Fresh exact-head qualification is mandatory after the reconciliation commit. Continue visual development only after that head is green.


## Live door integration slice — 28 September 2026

- PR #2395 has merged as main `b20390c507058680cf15bc88f0abdb79dc1f3c7b`; this follow-up starts from that exact fully qualified visual-overhaul baseline.
- The staged 0x72 CC0 doorway states are now the primary renderer for ordinary non-secret doors. The source closed/open doorway images are complete 32x32 sprites.
- The authored doorway naturally represents a horizontal wall opening. Generated doors with `orientation === "horizontal"` render it unrotated; vertical-wall doors rotate the complete doorway exactly 90 degrees around the tile centre.
- Opening presentation cross-fades the authored closed and open states using the existing door opening progress. Door coordinates, collision, lock state, timing, interaction and progression ownership are unchanged.
- Closed secret doors remain disguised wall masonry and keep their established retracting-wall renderer.
- The previous procedural swinging-plank door remains the decode/error fallback if either authored state is malformed or unavailable.
- Focused diagnostics expose whether the current frame used `cc0-door` or `procedural-fallback`, plus orientation/state. Static and Chromium browser contracts cover horizontal closed, vertical open, opening transition and forced image failure.
- Next visual targets after this slice qualifies: stronger switch/sigil treatment, FIRE/SHOCK trap art, shrines/altars/objective markers, environmental props/furniture and richer biome variation.


## Locked hero and enemy identity policy — 28 September 2026

This is a hard product rule for all later character-art slices.

### Player
- The playable hero must retain the established Cheeky Commodore Gamer identity.
- The current authoritative identity asset is `assets/pixel/explorer-sheet-v10-34.png` until an expanded CCG-specific animation sheet is produced.
- A generic free knight/elf/warrior sprite must never become the default player merely because it has more animation frames.
- External CC0 character sheets may be used as motion/reference templates only if the resulting production frames are restyled/rebuilt to remain recognisably the CCG hero.
- Firearm/melee/hurt/death animation expansion must preserve that identity.

### Enemies
- Enemy name and visible sprite must agree.
- First preference: source a verified CC0/public-domain sprite family that materially matches the established enemy archetype/name.
- If a generic non-iconic enemy cannot be matched safely, its display name may be changed to fit the adopted sprite.
- Do not rename named followers, bosses, Count Loadula, Death Stalkers, Sigil Warden or other identity-bearing enemies merely to fit convenient artwork.
- Maintain an explicit name → gameplay kind → sprite family mapping and test it so later visual work cannot collapse most enemies back into indistinguishable elves/knights.



## Current-main switch/sigil/shrine consolidation — 28 September 2026

- Rebuild branch `codex/dungeon-visual-switch-sigil-shrine-consolidated-20260928` starts from live main `0d10ddeebc0265dbd1e9e09d398f85ba2aa9cef5` rather than stale PR ancestry.
- PR #2402 is the product superset for switch-state plus shrine/sigil presentation; PR #2401 contributes the stronger real-Chromium switch-state regression.
- Only verified visual deltas were transplanted: wall-adjacent one-shot switches with persistent completed state, CC0 button up/down feedback, animated shrine/sigil cores, Sigil Gate emblem, and the locked CCG hero/enemy identity policy.
- R64-era FIRE/trap/freeze ownership and unrelated runtime files remain current-main authoritative.
- Merge only after fresh exact-head canonical/Node, focused Chromium, shards 1–6 and all triggered site/package/cache/image checks are green with no material review blocker.


## Locked player identity + enemy art/name policy — 28 September 2026

### Player identity is non-negotiable

- The playable hero must remain recognisably the **Cheeky Commodore Gamer** character.
- The established `assets/pixel/explorer-sheet-v10-34.png` is the authoritative default player artwork.
- The generic Shade/Puny `warrior-blue.png` sheet is **not** a production player replacement. It may remain in the repository only as an animation/motion reference.
- Future player animation work must extend, redraw or restyle the CCG hero identity for additional idle/walk/melee/firearm/hurt/death frames. A third-party sheet may be used as a motion/template reference, but its visible character design must not replace the CCG hero.
- `CCG_ASSET_OVERRIDES.images.visuals.playerSheet` may only be used for an explicitly CCG-specific replacement sheet.

### Enemy visual identity rule

Every enemy name and sprite must agree semantically.

Preferred order:

1. source a verified free-use/CC0 sprite that fits the existing enemy identity;
2. retain a bespoke/procedural enemy renderer while a matching sprite is being sourced;
3. rename a generic enemy only when that produces a better and internally consistent result and does not erase a distinctive Dungeon Carnage identity.

Do **not** force a humanoid knight/elf/mage sheet onto a creature whose name implies a materially different appearance.

The current generic Puny humanoid sheets are therefore limited to compatible roles:
- Archive Knight → Soldier family;
- Tape Scout → Archer family;
- Joystick Hunter → Archer family;
- 1541 Guard → Soldier family;
- Charger → Warrior family;
- Ranger → Archer family.

The following deliberately stay on bespoke/procedural art until matching licensed sprites are found:
- Crypt Skeleton;
- Dustweb Spider;
- Ghost Byte;
- Raster Ambusher;
- Root Crawler;
- CPU Cook;
- Firebreather;
- Death Stalker and other named/special enemies.

For each future enemy replacement, record: current enemy name, gameplay kind, proposed sprite family, source/licence, and whether the action is **match sprite to name** or **rename generic enemy to sprite**. Special/named enemies should normally keep their established names and receive matching art rather than being renamed for convenience.
