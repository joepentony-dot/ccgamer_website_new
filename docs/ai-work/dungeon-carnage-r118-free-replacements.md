# R118 — zero-payment replacements for discarded or restricted artwork

Recorded: 8 October 2026. Scope: browser-based C64 Dungeon Carnage in `arcade/lost-sizzler/`.
Owner directive: use free assets only; do not purchase packs, paid tiers or commercial upgrades.
**Intake status: verified source-page licence / replacement CANDIDATE, not yet imported or runtime enabled.**

## Replacement decisions (in order of preference)

| Artwork to replace | First free candidate | Backup/alternative | Reason and caveat |
|---|---|---|---|
| Unidentified tileset floors and walls from `Dungeon tileset(1).zip` | Kenney Tiny Dungeon (CC0, 16x16) | DeadlyEssence01 Free 2D Dungeon Tileset (CC0, 16x16) | Preserve existing collision map and room topology; change drawings only after proportional preview. |
| Unverified gold-key extraction | hyprv Dungeon Pack 16x16 (CC0; includes keys) | Existing approved 0x72/engine key fallback | Current key override stays disabled. Select and match exact source pixels before activation. |
| Doors, stairs, chests, coins, potion replacements | hyprv Dungeon Pack 16x16 (CC0) | Kenney Tiny Dungeon (CC0) | Existing sprite/door behaviour stays unchanged. |
| Barrels, general furniture and props from unknown-rights archive | Kenney Tiny Dungeon (CC0) | Tables and Misc Props 16x16 by .bee (CC0) | Furniture variety to be checked asset-by-asset; do not claim a bookcase exists unless inspected. |
| Fireplace/sconce/torch sprites from unknown-rights archive | Original 0x72 v5 wall torches (already source-verified) | Spring Spring 16x16 Torch (CC0) | Existing four R118 wall-torch frames already selected; inspect aspect ratio rather than introduce duplicate graphics by default. |
| Spikes, traps and environmental hazards | Existing approved 0x72 tiles/traps | Kettoman Free Pixel Dungeon Tileset 16x16 (free commercial use, no standalone resale) | Only visual substitutions; preserve hitboxes, damage and timing. |
| Minifantasy free-version monsters/characters (non-commercial-only) | elesrech Pixel Monsters & Enemies (CC0; 16x16–32x32; animated) | Existing permitted 0x72 / Pixel_Poem sprites | Only integrate animations after frame-count, frame-box and game-size review. |
| Dungeon Gathering Free Version if source permission remains unresolved | Kenney Tiny Dungeon plus 0x72 sprites (CC0) | hyprv Dungeon Pack 16x16 (CC0) | Do not ship the unverified free-version archive. |
| Paid premium expansion tiers | Free content from their verified creator packs | Kenney / hyprv / 0x72 CC0 packs | No paid assets or purchases. |

## Verified original pages and licence text

- Kenney Tiny Dungeon — https://kenney.nl/assets/tiny-dungeon — 2D 16x16, 130+ sprites, **CC0**, free download (donations optional). Maker: Kenney.
- hyprv Dungeon Pack 16x16 — https://hyprv.itch.io/16x16-dungeon — **CC0**, free/name-your-own-price download; creator expressly allows commercial use; includes walls, doors, stairs, floors, torches, chests, potions, coins and keys.
- DeadlyEssence01 Free 2D Dungeon Tileset — https://deadlyessence.itch.io/free-tilesets — **CC0**, 16x16; commercial and non-commercial use allowed.
- elesrech Pixel Monsters & Enemies — https://elesrech.itch.io/pixel-monsters-enemies-asset-pack — **CC0**, 20 animated 16x16–32x32 creatures, free/name-your-own-price download.
- .bee Tables and Misc Props (16x16) — https://opengameart.org/content/tables-and-misc-props-16x16 — **CC0**, free 16x16 furniture.
- Spring Spring 16x16 Torch — https://opengameart.org/content/16x16-torch — **CC0**, free animated GIF.
- Kettoman Free Pixel Dungeon Tileset — https://kettoman.itch.io/free-pixel-dungeon-tileset-16x16 — free for commercial use; no resale or redistribution as-is; includes traps, chests, doors, decorations. Respect source conditions.
- Original 0x72 v5 — https://0x72.itch.io/16x16-dungeon-tileset — **CC0**; existing game assets preferred over duplicate packs.
- Original 0x72 DungeonTileset II — https://0x72.itch.io/dungeontileset-ii — **CC0**; existing staged assets can be considered.

Avoid assuming the apparently similar *Puny Dungeon* downloads carry identical licence metadata across hosts: itch.io lists CC BY 4.0 in the asset metadata despite CC0 prose, while OpenGameArt displays CC0. Keep this candidate out of the automatic CC0 queue pending clarification.

## Mandatory before activating any replacement

1. Obtain the actual **zero-cost** archive from its original creator; record exact source URL, release date, archive hash, included licence/readme and chosen sprite file hashes. Do not claim newly discovered download files are already in this repo.
2. Inspect each sprite sheet: tile dimensions, grid, alpha transparency, direction, frame count, visual scale and nearest-neighbour reduction. Prefer 16x16 assets; a sprite sheet is not a single frame.
3. Add only selected and verified binary assets; preserve existing fallback graphics. No unverified archive, paid tier, missing-licence artwork, or accidental standalone distribution.
4. Guard renderer overrides and enhance existing R118 visual regression coverage; do not weaken existing tests or modify collision, room structure, combat, item logic or progression for cosmetic replacements.
5. Reconcile R118 with the latest `main`, update the master audit, run exact-current-head qualification and verify in-browser proportions before merging. Documentation research is not release approval.

## Current state

- These are **located and licence-screened alternatives**, NOT downloaded, imported or switched on.
- The uncertain gold-key sprite remains inactive; Minifantasy free version and unknown-rights `Dungeon tileset(1).zip` stay excluded; paid tiers remain excluded.
- No costs authorised. No release or mainline merge authorised.
