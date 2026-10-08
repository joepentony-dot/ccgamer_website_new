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

**Uncompleted:** One free Kenney Tiny Dungeon barrel sprite was subsequently obtained through a publicly documented CC0 mirror and imported with its exact binary fingerprint. Other hyprv, elesrech and DeadlyEssence replacement packs are still **download-and-evaluate candidates**, not silently imported or advertised as integrated. No paid downloads were purchased.

Release gate unchanged: latest-head qualification, mainline reconciliation and deployed visual/manual verification required. Draft PR #2600 must not be merged until those gates pass.

## Kenney Tiny Dungeon no-cost barrel replacement — 8 October 2026

- Original creator: **Kenney**, *Tiny Dungeon 1.0*, source https://kenney.nl/assets/tiny-dungeon, published under CC0 1.0 and free to use commercially without attribution.
- Binary source: curated public repository https://github.com/selinyilmazz/playable-ad-generator/blob/main/public/assets/packs/tiny-dungeon/objects/barrel.png. Its https://github.com/selinyilmazz/playable-ad-generator/blob/main/public/assets/packs/tiny-dungeon/ATTRIBUTION.md explicitly maps barrel to original tile index `tile_0082.png`, includes the original Kenney `LICENSE.txt` and documents 16x16 sprites.
- Imported PNG: `kenney-tiny-dungeon-barrel.png` **16x16**, Git blob SHA `78f95bceab167e05e7e058c818b97360868fbdbc`, PNG SHA-256 `2efb31e30cd6f1527329fe5d7704e41c65a8376d498bf93372f46155600420c9`.
- The imported barrel is byte-for-byte identical to named original-pack file `tile_0082.png` in three additional independently hosted Tiny Dungeon folders: `Ultralak/Crusade` (`GD/Art/kenney_tinyDungeon/Tiles/tile_0082.png`), `koisland/GodotSurvivalLike` (`assets/kenney_tinydungeon/Tiles/tile_0082.png`) and `hortinstein/2DSurvivorsCourse` (`CourseFiles/kenney_tinydungeon/Tiles/tile_0082.png`). Every binary has Git blob SHA `78f95bceab167e05e7e058c818b97360868fbdbc`; direct comparison against Kenney's original ZIP was not performed. This is a source-documented, openly CC0-licensed free candidate, not a paid-tier asset.
- Runtime: `images.visuals.propBarrel` now draws this licensed 16x16 sprite in the game's unchanged `barrel` decor owner. The old unidentified-rights barrel remains excluded; collision, placement, fire damage and loot handling are unchanged.
- Regression contract pins the selected path, 16x16 dimensions, licence, curated original tile index and PNG SHA-256. Existing R85 barrel default remains available as an image-load fallback.

**All selected runtime replacements (Niji key, 0x72 crate, Kenney barrel and 0x72 II column) are free to use commercially. No paid content has been purchased or introduced.** Current PR still requires exact reconciled-head CI and visual acceptance before release.

## R118 verified CC0 stone-column replacement (follow-up)

- Source: 0x72 / Robert Norenberg, [DungeonTileset II v1.7](https://0x72.itch.io/dungeontileset-ii), CC0 1.0, free for commercial use and modification. Owner's original archive `0x72_DungeonTilesetII_v1.7.zip` SHA-256 `a5b23341ebc831d7798bfb9666d864a08c079bb7aed18e3cf023a27d517c1512`.
- Binary: `0x72_DungeonTilesetII_v1.7/frames/column.png`, 16×48 PNG, SHA-256 `3fb915b96de71b6d939f434124d9c3c27831c54458a5daa5df3f447dd34c8e0e`, Git blob SHA `e152d08950cbf89bbc856544f2a68a7db0901b4f`. Imported unchanged as `assets/pixel/user-r118/cc0-column-0x72-ii.png`; exact byte match checked against the owner's original archive.
- Runtime only: `images.visuals.propPillar` renders this asset only for existing `pillar` dungeon decorations. Aspect-preserving fitting avoids stretching the tall graphic; a drawn plinth spans most of the original blocking tile so the visual footprint remains apparent. The prior procedural pillar renders if the image is unavailable. No geometry, collision, AI, item or progression edits.
- R118 regression contract requires the exact dimensions, PNG hash, CC0 attribution record, render owner, proportional fit and visible base. All automation must re-qualify on the newest branch head; the prior green SHA is not a release pass for this change.

## SnowHex Dungeon Gathering Free Version — original licence recovered

- Original source and free tier: https://snowhex.itch.io/dungeon-gathering — free 16×16 floor/wall tiles, doors and basic items; paid "Full Ver. 1.1 + Updates" tier is **not** included in the free download and is excluded from R118.
- Owner's archive: `Dungeon Gathering Free Version.rar`, SHA-256 `8d6a7d7b71e548d45f471d41b4fb153622bad928b3982aa7e1fb8f89033c0611`; inspected 26 entries, including `License.txt`. The embedded licence identifies Jose Javier (SnowHex) as the creator, expressly permits commercial and non-commercial project use, modification and no mandatory credit. It forbids resale or redistribution as standalone game assets, images or NFTs. The licence heading says "Full Version" even though the owner archive contains only free-tier files; the creator's published page independently confirms that the free download and its commercial-game use are allowed.
- FREE TIER IS ELIGIBLE as a *source-verified candidate*. No SnowHex sprite is yet activated: some archive entries are complete tilesheets/animation strips and must be extracted according to their original 16×16 frames, semantic roles and collidable artwork. Original paid full-version content remains excluded.
- Keep the rights distinction: source pages and embedded licence permit inclusion in a finished commercial game, not unbundled redistribution of original files as an asset pack.

## Pixel_Poem free-commercial gold-score coin animation — owner archive verified

- Creator: **Pixel_Poem**, source https://pixel-poem.itch.io/dungeon-assetpuck. Creator permits free and commercial projects and modification (direct permission: https://pixel-poem.itch.io/dungeon-assetpuck/comments?after=22). This creator-permitted free pack is **NOT CC0** and must not be mislabelled as such; do not repackage standalone assets for distribution.
- Original owner upload: `2D Pixel Dungeon Asset Pack v2.0.zip`; exact ZIP SHA-256 `efb5711728cd031b14d1333ad71329d2622bf9f11853a7cb7d216326e1d33f9d`. Files are extracted without modification from `2D Pixel Dungeon Asset Pack/items and trap_animation/coin/coin_1.png` through `coin_4.png`. Dimensions: 16×16 per frame.
- Source PNG SHA-256 in animation order: `7e5956295c3b484f1d8dc3cc4d620538fe666bd23492a329e485c2a634df5989`, `7bfb1fe833ae9da9097edf914fd78a43f72421fb633913020f41bf9286025755`, `0f54e2f2b5a71b6a03a61addf7aa0752bddc2abb50c8d24b5b4ece77d1de2370`, `7bfb1fe833ae9da9097edf914fd78a43f72421fb633913020f41bf9286025755`. Original fourth frame is byte-identical to second; only three unique PNGs committed.
- Active runtime assets: `pixel-poem-credit-coin-0.png`, `pixel-poem-credit-coin-1.png`, `pixel-poem-credit-coin-2.png`, then the second again. The four 16×16 animation phases draw three layered gold coins inside the **existing** 30×30 ground-pickup footprint, with nearest-neighbour scaling. All existing R85 pickup artwork remains the fallback when the new PNGs are missing/not decoded; `images.items.credits` remains unchanged.
- **Zero effect on gameplay**: scoring amounts, gold, XP, dropped item state, movement, wall collisions, loot, spawn logic and existing save compatibility are unchanged. The animation does not replace economy/progression rules.
- Manifest licence and SHA entries live in a **separate** `assets/asset-manifest.json -> images.visualOverhaul.r118FreeCommercial` group rather than the CC0-only R118 group. Tests check all three original file hashes, reuse of the fourth phase, correct dimensions, author/licence evidence, fallback presence and an isolated 3-coin render simulation.
- Suitability rejection: the smaller Pixel_Poem skeleton/vampire strips were visually compared with the current richer 64×64 enemy atlases and held back; blindly substituting them would reduce character detail and recognition. Other animation candidates remain available for targeted review.

## Staged 0x72 II character sheets — exact pixel lineage verified

Source: original owner-uploaded `0x72_DungeonTilesetII_v1.7.zip` (SHA-256 `a5b23341ebc831d7798bfb9666d864a08c079bb7aed18e3cf023a27d517c1512`), author 0x72 / Robert Norenberg, https://0x72.itch.io/dungeontileset-ii, **CC0-1.0**. Original frames are all 16×23; each output is an 8-frame sprite strip comprising four `idle` frames followed by four `run` frames, with 16×32 destination cells.

- `pumpkin-dude.png` (128×32, PNG SHA-256 `85d180f0a42d3a0bbcf14c1bce08d6b77bea6217013a73aa0235f8c9f8efdf17`): **all eight cells are pixel-identical** to the corresponding `frames/pumpkin_dude_idle_anim_f0..3.png` and `frames/pumpkin_dude_run_anim_f0..3.png` after placing the original image at each cell's x=0,y=9.
- `plague-doc.png` (128×32, PNG SHA-256 `2bb0c93615ac1a9c99e0f32be98d2d8e48fa78d7c4449627b3980dc9a849276e`): **all eight cells are pixel-identical** to `frames/doc_idle_anim_f0..3.png` and `frames/doc_run_anim_f0..3.png` after placing the original image at x=-1,y=9 in its 16×32 cell (the leftmost column is intentionally clipped).
- The full original eight-frame PNG SHA-256 lists and these exact atlas offsets are recorded in `assets/asset-manifest.json -> images.visualOverhaul.r118LicensedCC0.stagedCharacterSourceVerified`; the existing R118 Node contract now pins both 128×32 PNG hashes, source archive, commercial CC0 licence, offset, frame counts and `stagedNotWired` status.
- **These are source-verified STAGED images only.** No new enemy/character mapping or behavioural integration is authorised by the provenance match alone. Their potential roles are to be considered in a visual gameplay pass. The richer existing enemy atlas remains authoritative.
