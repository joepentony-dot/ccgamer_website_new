# R118 owner-supplied art provenance — licensing checkpoint (8 October 2026)

The owner supplied `Dungeon tileset(1).zip`, `0x72_16x16DungeonTileset.v5.zip`, `0x72_DungeonTilesetII_v1.7.zip` and `dungeontiles-extended v1.1.zip`.

## Verified CC0 sources

- 0x72 / Robert Norenberg, 16x16 Dungeon Tileset v5: https://0x72.itch.io/16x16-dungeon-tileset (CC0-1.0; commercial use, modification and redistribution permitted).
- 0x72 / Robert Norenberg, DungeonTileset II v1.7: https://0x72.itch.io/dungeontileset-ii (CC0-1.0; includes separate Doc and Pumpkin character downloads).
- Niji, Dungeon Tileset II Extended v1.1: https://nijikokun.itch.io/dungeontileset-ii-extended (CC0-1.0).

The four active `wall-torch-0.png` to `wall-torch-3.png` files match `items/torch_1.png` to `items/torch_4.png` byte-for-byte in the 0x72 v5 ZIP. Ten imported 0x72 PNGs have been byte-matched against archive entries. Other CC0 candidates remain staged for scale and semantic review; the extracted extended gold key and the separately supplied/assembled character candidates require exact lineage confirmation.

## Excluded archive — no demonstrated redistribution permission

`Dungeon tileset(1).zip` contained `Dungeon tileset.png`, `01.gif`, `02.gif` and `03.gif`, but **no README, author credit or licence file**. Its four floor tiles, barrel, bookcase, armour, fireplace, spike and sconce assets are removed from the candidate tree. Their runtime visual overrides were already disabled in the latest R118 head, preserving established licensed R85/0x72 and procedural fallback artwork. Do not reintroduce these assets without independent permission.

The Minifantasy Dungeon Free Version has an explicit **non-commercial-only** licence; do not import it into the planned commercial release.

This asset pass does not modify collision, room topology, trap damage, AI, inventory or progression.

## Independent source-page recheck — 8 October 2026

- VERIFIED SOURCE LICENCE: 0x72 v5 — https://0x72.itch.io/16x16-dungeon-tileset — CC0-1.0, creator explicitly permits commercial use, modification and distribution.
- VERIFIED SOURCE LICENCE: 0x72 DungeonTileset II v1.7 — https://0x72.itch.io/dungeontileset-ii — CC0-1.0; original page lists the v1.7 ZIP and separate character downloads.
- VERIFIED SOURCE LICENCE: Niji DungeonTileset II Extended v1.1 — https://nijikokun.itch.io/dungeontileset-ii-extended — CC0-1.0; original page lists v1.1 ZIP and mentions keys and animated wall torches. Exact pixel provenance of the extracted gold key remains UNVERIFIED, so runtime override remains disabled.
- RESTRICTED: Minifantasy Dungeon v2.3 Free Version — https://krishna-palacio.itch.io/minifantasy-dungeon — free licence is non-commercial only; creator offers separate paid commercial licence. Do not assume owner possession of the free archive grants commercial rights.
- UNKNOWN: `Dungeon tileset(1).zip` — no established author or source page. Do not restore excluded derivatives.
- PENDING SOURCE MATCH: KayKit, Craftpix, Dungeons & Pixels, Super Pixel Objects, Treasure+ and remaining packs. No licence approval inferred from filenames alone.

Source-page licensing verification does not establish binary-level identity for every extracted sprite. Retain original file-match requirements and the exact-head CI/release gate.
