# Owner-supplied asset intake — 12 October 2026

This is a selection/permission review, NOT a representation that all supplied graphics are live.

| Pack | Original source | Commercial-use decision | Visual judgement / integration |
|---|---|---|---|
| Stealthix Animated Traps | https://stealthix.itch.io/animated-traps | CC0; commercial allowed | First four spike-frame selections are activated via existing art-override slots, fallback remains. Other traps require matching gameplay semantics, not introduced by art alone. |
| ExiLove Purple Fantasy Dungeon FREE | https://exilove.itch.io/ | ZIP README explicitly permits commercial use; no standalone asset-pack redistribution | Candidate purple biome environment only; tiles 16×16 but atlas wall perspective differs from existing room geometry; not currently wired. |
| JoseKolos Pixel Art RPG Keys FREE | https://josekolos.itch.io/pixel-art-rpg-keys-pack-48-variants-free-premium | Creator permits commercial use of free 32×32 iron/gold keys; free ZIP contains two presentation sheets, no paid-only special keys. | Candidate for enlarged inventory/HUD icon use; existing 16×16 Niji floor key still better fitting at ground tile scale, so no regression-prone override yet. |
| Spriteshift Purple Dungeon | https://spriteshift.itch.io/purple-dungeon-tileset | CC0 commercial allowed | Source URL reviewed; actual PurpleDungeon.zip not supplied, and ExiLove ZIP is a DIFFERENT pack. Do not claim sprites have been imported. |
| CraftPix Free Dungeon Props | https://craftpix.net/file-licenses/ | Freebie commercial game use allowed; prohibit redistribution of source files | Retain for selective assessment; do not bulk-copy PNG/PSD/Tiled sources to public repo or itch package. |
| BDragon1727 750 Effect and FX Pixel FREE | https://bdragon1727.itch.io/750-effect-and-fx-pixel-all | Commercial licence requires a contribution of any amount; no payment evidence | Excluded until owner confirms qualifying contribution; paid full-version assets are not included in supplied ZIP. |
| Caeora Deadly Dungeons Free | https://www.caeora.com/content-use | Creator's free rights do not grant commercial video-game use | Excluded absent separate explicit video-game permission. |
| Pine Druid Dungeon Tileset Mega Pack | https://pine-druid.itch.io/dungeon-tileset-mega-pack | Free $0 version non-commercial only; creator requires at least $1 for commercial use | Uploaded Tileset.png / .aseprite held out pending payment proof and redistribution-rule clarification. |
| 0x72 / Niji / Kenney / Pixel_Poem existing R118 | arcade/lost-sizzler/assets/THIRD-PARTY-ART-CREDITS.md | Existing project-verified permissions | Preserve currently active torches, chest/barrel/crate/column, key and coin art until stronger direct comparison passes. |

Policy: no paid-only source, noncommercial pack, unverified licensing, source-only downloadable art bundle, gameplay rewrite, or unrelated site feature gets silently included. Compare each candidate at real 32 px in gameplay and HUD and keep existing image-load fallback; pixel scale, room perspective and role correctness decide replacements, not raw quantity.

## Historical owner archives cross-check (7–8 October)

The owner explicitly requests that **all** previous assets be reviewed for commercial eligibility AND whether they improve the current graphics. A legal right to use an image does not automatically mean it is a better or suitable gameplay sprite. These are the known uploaded source groups; this inventory is not proof of activation:

| Uploaded pack or group | Licence evidence / restriction | Integration decision |
| --- | --- | --- |
| 0x72 16x16 DungeonTileset v5 and DungeonTileset II v1.7 | Creator CC0 | Partially integrated and credited in R118. Retain working torches, crate, column, doors/room art until a superior matched replacement passes. |
| Niji DungeonTileset Extended v1.0/v1.1 | Creator CC0, verified original v1.1 | R118 gold key active. Distinguish from JoseKolos glossy 32×32 free icons. |
| 2D Pixel Dungeon Asset Pack v2.0 (Pixel_Poem) | Creator commercial use, not CC0 | R118 rotating gold coins active; do not relabel as CC0. |
| SnowHex Dungeon Gathering FREE .rar | Free-version internal licence confirms commercial | Eligible, not yet a proven improvement at floor/room scale; earlier R118 recorded held candidate. No full paid edition. |
| KayKit Dungeon Pack 1.1 FREE (two uploads) | Creator CC0, commercial OK | Contains low-poly **3D FBX/GLTF/OBJ models**, while the current game is 2D Canvas pixel art. Do not insert raw 3D model source into browser sprites. Only revisit after separately authorised consistent sprite renders. |
| Dungeons & Pixels Free Demo | Internal LICENSE.txt permits commercial games, disallows standalone asset repack | 32×32 animated torch/trap, chest, doors and blue/red potion candidates; existing torches and player render remain stronger/coherent in baseline, potential item icon/hazard improvement needs direct in-game check. The hero is front idle only; not a usable full hero replacement. |
| Super Pixel Objects Sample | Embedded licence grants commercial use **with credit to Will Tice**; not an asset export tool licence | Candidate animated coins/gems, key, chest, potions. Current Pixel_Poem rotating coin already exists; do not downgrade or double load overlapping coin animations. |
| Treasure+.zip | No licence file found in supplied ZIP | Hold until original creator/page commercial rights are established; cannot infer from ZIP name. |
| CraftPix Free Pixel Dungeon Objects (multiple uploads) | CraftPix freebie commercial game licence, no raw asset redistribution | Candidate for a few role-correct props only. R118 already rejected this pack's wooden shelf as bookcase replacement. |
| CraftPix free character/enemy series | CraftPix freebie permission subject to CraftPix terms | Uploaded swordsman, warrior, orc, base male, fantasy enemies, skeleton and slime sprite collections. Check animation layout, palette and source-role exactness before altering established authored enemies. No automatic wholesale switch. |
| CraftPix free magic book / bridges / paths / top-down dungeon | CraftPix freebie permission subject to CraftPix terms | Candidate environment/item/FX only where semantics and perspective match. Never publish PSD source packs. |
| Minifantasy Dungeon v2.3 FREE | Non-commercial free tier | Excluded from commercial release. |
| Unidentified Dungeon tileset archive variants | Origin not substantiated in R118 for one uploaded ZIP | Held, do not assume all similarly named archives inherit 0x72 or another creator's licence. |
| Basic asset pack.zip, mixed miscellaneous uploads | Not source/rights traced in this R134 scope | Hold pending source identification and compatible in-game quality. |

Additional restrictions: CraftPix licence is not CC0; its prohibition on using its art to develop/test AI systems does not grant any special permission to redistribute individual asset sheets. Source rights and packaging must be checked **per pack**. User explicitly prefers no new paid licences. Do not treat a free download from a pay-if-commercial listing as permission for a commercial game; the Pine Druid and BDragon payment conditions require proof before activation.

### Visual acceptance order after R134 spike-frame candidate

1. Retain the existing 15-floor tile/hero/enemy baseline from R128–R133. Sample 32×32 mockups from ExiLove, SnowHex, Dungeons & Pixels and CraftPix on floors that already have corresponding biomes; reject palette/perspective mismatches.
2. Review in-world pickups separately from larger inventory/HUD sprites: JoseKolos's 32×32 keys and Dungeons & Pixels free 32×32 potion art may improve inventory while Niji 16×16 and the R85 healing artwork remain superior or more recognisable on the floor.
3. Do not change combat behaviours to fit an art asset. Selective updates to wall/fire/shock hazard visuals require matching runtime kind and active/safe semantic states; no unqualified render rewrites while PR #2695 touches game-render.
4. For every active addition: original creator page + archive fingerprint + sprite dimensions/frame slice + SHA256 + attribution obligations + image fallback + exact-head Chromium/Node visual+itch packaging acceptance before merge.

### Current R134 checkpoint

- Source candidate branch `codex/dungeon-r134-free-art-intake-20261012` from main `d3d73603468b5baca6044831be90d5dc0ead928d`.
- Draft PR #2698. Stealthix CC0 spike states are imported as four active visual-only overrides; other newly supplied packs are held candidates or excluded as above.
- R133 PR #2695 remains independent. No deployed/live acceptance, no paid original soundtrack recovery, no main-branch merge, and no change to game mechanics is implied.

### Added role-correct item art candidate

The uploaded Indie_Vova/Dungeons & Pixels *free demo* includes two 32×32 potion icons. The existing `images.items.mana` mapped to the identical ammo icon; replacing only mana with the free-demo **blue mana flask** restores item semantic distinction without altering healing, ammo balance, item rewards or hitboxes. The existing health potion's green cross remains unchanged. Source-and-target fingerprints are in `assets/pixel/user-r134/PROVENANCE.md`. Source licence is commercial (not CC0); only the game-embedded optimised PNG is included.
