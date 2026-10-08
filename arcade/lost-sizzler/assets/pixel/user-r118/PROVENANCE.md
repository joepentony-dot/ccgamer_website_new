# R118 owner-supplied art provenance — licensing checkpoint (8 October 2026)

The owner supplied `Dungeon tileset(1).zip`, `0x72_16x16DungeonTileset.v5.zip`, `0x72_DungeonTilesetII_v1.7.zip` and `dungeontiles-extended v1.1.zip`.

## Verified CC0 sources

- 0x72 / Robert Norenberg, 16x16 Dungeon Tileset v5: https://0x72.itch.io/16x16-dungeon-tileset (CC0-1.0; commercial use, modification and redistribution permitted).
- 0x72 / Robert Norenberg, DungeonTileset II v1.7: https://0x72.itch.io/dungeontileset-ii (CC0-1.0; includes separate Doc and Pumpkin character downloads).
- Niji, Dungeon Tileset II Extended v1.1: https://nijikokun.itch.io/dungeontileset-ii-extended (CC0-1.0).

The four active `wall-torch-0.png` to `wall-torch-3.png` files match `items/torch_1.png` to `items/torch_4.png` byte-for-byte in the 0x72 v5 ZIP. Ten imported 0x72 PNGs have been byte-matched against archive entries. Other CC0 candidates remain staged for scale and semantic review; the extracted extended gold key is now pixel-identical to a unique 16x16 crop of the Niji v1.1 atlas; separately supplied/assembled character candidates still require exact lineage confirmation.

## Excluded archive — no demonstrated redistribution permission

`Dungeon tileset(1).zip` contained `Dungeon tileset.png`, `01.gif`, `02.gif` and `03.gif`, but **no README, author credit or licence file**. Its four floor tiles, barrel, bookcase, armour, fireplace, spike and sconce assets are removed from the candidate tree. Their runtime visual overrides were already disabled in the latest R118 head, preserving established licensed R85/0x72 and procedural fallback artwork. Do not reintroduce these assets without independent permission.

The Minifantasy Dungeon Free Version has an explicit **non-commercial-only** licence; do not import it into the planned commercial release.

This asset pass does not modify collision, room topology, trap damage, AI, inventory or progression.

## Independent source-page recheck — 8 October 2026

- VERIFIED SOURCE LICENCE: 0x72 v5 — https://0x72.itch.io/16x16-dungeon-tileset — CC0-1.0, creator explicitly permits commercial use, modification and distribution.
- VERIFIED SOURCE LICENCE: 0x72 DungeonTileset II v1.7 — https://0x72.itch.io/dungeontileset-ii — CC0-1.0; original page lists the v1.7 ZIP and separate character downloads.
- VERIFIED SOURCE LICENCE: Niji DungeonTileset II Extended v1.1 — https://nijikokun.itch.io/dungeontileset-ii-extended — CC0-1.0; original page lists v1.1 ZIP and mentions keys and animated wall torches. Exact pixel provenance of the extracted gold key was VERIFIED on 8 October by full RGBA pixel match at Niji v1.1 atlas (320,320) crop 16x16; runtime override is enabled with a hash-pinned regression guard.
- RESTRICTED: Minifantasy Dungeon v2.3 Free Version — https://krishna-palacio.itch.io/minifantasy-dungeon — free licence is non-commercial only; creator offers separate paid commercial licence. Do not assume owner possession of the free archive grants commercial rights.
- UNKNOWN: `Dungeon tileset(1).zip` — no established author or source page. Do not restore excluded derivatives.
- PENDING SOURCE MATCH: KayKit, Craftpix, Dungeons & Pixels, Super Pixel Objects, Treasure+ and remaining packs. No licence approval inferred from filenames alone.

Source-page licensing verification does not establish binary-level identity for every extracted sprite; the gold key and newly activated crate have now been matched to their recovered original owner archives. Retain original file-match requirements and the exact-head CI/release gate.

## Free-tier licensing investigation — 8 October 2026 (additional pass)

Policy: NO PAID ASSET ACQUISITIONS. Do not purchase licences or include paid-only pack contents. 'Discard' means exclude from candidate/release consideration; do not erase user archives or existing assets without separate review.

- KayKit Dungeon Pack 1.1 FREE: https://kaylousberg.itch.io/kaykit-dungeon-pack — CC0 commercial use permitted, free tier only. EXTRA and SOURCE tiers require payment: EXCLUDE. Primarily 3D models, not automatically suitable for the 2D browser game's pixel-art presentation.
- KayKit Dungeon Pack 1.0 legacy: https://kaylousberg.itch.io/kaykit-dungeon — CC0 commercial use permitted. Match version before selecting files.
- Dungeons & Pixels Free Demo: https://indie-vova.itch.io/dungeons-and-pixels-starter-pack — creator permits commercial use and modification, prohibits standalone pack redistribution. FREE DEMO only; premium starter pack is paid and EXCLUDED. Confirm packaged LICENSE.txt before release.
- Super Pixel Objects Sample: https://untiedgames.itch.io/super-pixel-objects-sample — free sample permits commercial use WITH ATTRIBUTION; standalone asset resale prohibited. Attribution must be included if used.
- Treasure+ by SciGho: https://ninjikin.itch.io/treasure — free download under CC BY 4.0; commercial use permitted WITH ATTRIBUTION and licence link.
- Craftpix Free Pixel Art Dungeon Objects: https://free-game-assets.itch.io/free-pixel-art-dungeon-objects-asset-pack — original uploader states commercial game use permitted but no redistribution of standalone files; https://craftpix.net/freebies/free-pixel-art-dungeon-objects-asset-pack/ is the named Craftpix original. Use only verified free-tier contents and record the Craftpix terms.
- Minifantasy Dungeon Free Version: EXCLUDE from commercial game; commercial licence requires payment.
- Still pending individual rights and identity: Dungeon Gathering Free Version (SnowHex), Enemy Animations Set, 2D Pixel Dungeon Asset Pack v2.0, other unspecified archives and any source-unmatched sprites. Do not infer licensing from filenames.

These are licence findings for identified source packs, NOT proof that every binary in a prior owner upload matches its source. No additional artwork is activated by this documentation pass.

## Pixel_Poem source confirmation — 8 October 2026

- 2D Pixel Dungeon Asset Pack v2.0 AND Enemy_Animations_Set.zip are free downloads from https://pixel-poem.itch.io/dungeon-assetpuck . Creator explicitly permits free and commercial projects and modifications; no redistribution or resale of standalone asset packs. Animation set creator announcement: https://pixel-poem.itch.io/dungeon-assetpuck/devlog/902754/new-animations-set-for-free . KEEP free versions as candidates, subject to exact file matching and game-scale checks.
- `2D Dungeon Asset Pack_v5.2.zip` is a PAID tier ($2.75 minimum on creator page); EXCLUDE under no-payments policy.
- Dungeon Gathering Free Version: original SnowHex page identified as https://snowhex.itch.io/dungeon-gathering ; free vs premium content differs. Precise free-version commercial licence not yet confirmed from its own page and archive; HOLD, do not approve on inference from other SnowHex packs.

## No-payment replacement candidate queue — 8 October 2026

Owner requested replacements for excluded, restricted or paid-only assets. Verified source-page licence + replacement mapping is in `docs/ai-work/dungeon-carnage-r118-free-replacements.md`, and master owner audit status is PARTIAL.

Preferred 16x16 CC0 no-payment sources: Kenney Tiny Dungeon (https://kenney.nl/assets/tiny-dungeon), hyprv Dungeon Pack 16x16 (https://hyprv.itch.io/16x16-dungeon), DeadlyEssence01 Free 2D Dungeon Tileset (https://deadlyessence.itch.io/free-tilesets), and 16x16–32x32 animated monsters from elesrech (https://elesrech.itch.io/pixel-monsters-enemies-asset-pack). Free supplementary CC0 torch and furniture from https://opengameart.org/content/16x16-torch and https://opengameart.org/content/tables-and-misc-props-16x16. Kettoman Free Dungeon Tileset is free for commercial use but restricts standalone asset redistribution: https://kettoman.itch.io/free-pixel-dungeon-tileset-16x16.

These are *source-page commercial-use findings, not imported binaries*. Download/file-hash/individual sprite checks, aspect ratio checks, exact-head tests and separate approved release are required prior to activation. Do not use the paid tier contents, unverified sprites or Minifantasy non-commercial free version. Do not replace existing verified artwork gratuitously.

## Verified source-binary integration — 8 October 2026

The previously uploaded original ZIPs were recovered from the owner's ChatGPT file library (copies, not newly purchased content). We inspected original archive bytes, verified the creator's published CC0 terms, and integrated two small assets on the R118 branch:

1. **Niji gold key** — existing `extended-gold-key.png`, 16x16. Original source archive `dungeontiles-extended v1.1.zip` SHA-256 `baccb8d4ff8b743dc42f7756a5946387fd05c3f007403c8aaefc76d181880b9a`; atlas `dungeontiles-extended v1.1/dungeontileset-extended.png`, pixel crop (x=320,y=320,w=16,h=16), **exact unique RGBA match** and pixel SHA-256 `580342c73c73cef8dd79c2a3c99094435fc6f2e724f2ac7fac96bb6ff8f207be`. Repo PNG SHA-256 `3d7b2609fa1c00fa9b679799cc549058106eb03a37fbf14434111723f21d1f01`. Original creator: Niji, https://nijikokun.itch.io/dungeontileset-ii-extended, CC0-1.0. Reactivated `images.items.key`; item collection/progression unchanged.
2. **0x72 II crate** — newly committed `cc0-crate-0x72-ii.png`, 16x24. Recovered original archive `0x72_DungeonTilesetII_v1.7.zip` SHA-256 `a5b23341ebc831d7798bfb9666d864a08c079bb7aed18e3cf023a27d517c1512`; **byte-for-byte original file** `0x72_DungeonTilesetII_v1.7/frames/crate.png`, SHA-256 `e602c9be47378d5f4bd767cb7c5487928d289c887131ccd9dd5a9ebd69570db8`. Original creator: 0x72 / Robert Norenberg, https://0x72.itch.io/dungeontileset-ii, CC0-1.0. Activated only for existing visual crate render; collision footprint stays unchanged.

The game renderer now fits non-square sprites **proportionally** within existing draw bounds; the previously selected 14x23 wall-torch frames are not stretched and fallback sprites remain available if images fail to load. R118 Node regression guards now pin the exact PNG hashes, verified original atlas crop metadata, selected overrides and expected proportional output. More expensive/restricted/unknown-rights content remains excluded.

**Uncompleted:** Free Kenney/hyprv/elesrech/DeadlyEssence replacement packs have licence-verified creator pages but were not available as local binary copies in this work environment. They remain **download-and-evaluate candidates**, not silently imported or advertised as integrated. No paid downloads were purchased.

Release gate unchanged: latest-head qualification, mainline reconciliation and deployed visual/manual verification required. Draft PR #2600 must not be merged until those gates pass.
