# 0x72 DungeonTileset II — imported visual-overhaul subset

Import date: 28 September 2026

## Licence and original source

- Pack: 0x72 DungeonTileset II v1.7
- Creator: 0x72
- Original source: https://0x72.itch.io/dungeontileset-ii
- Licence: Creative Commons Zero v1.0 Universal (CC0-1.0)
- Runtime use: local repository copies only; no hotlinking.

The licence was cross-checked against the curated `series-ai/jam-ready-assets` catalogue, whose per-pack metadata records 0x72 DungeonTileset II as CC0-1.0 and points back to the creator's itch.io page.

## Binary acquisition

The original itch.io download is not directly retrievable by the repository connector. Exact named v1.7 PNG files were copied from the public repository `CyrusVillaruz/Turtinia-Endless`, folder `game/assets/0x72_DungeonTilesetII_v1.7/`.

The copied assets are normal PNG blobs rather than Git LFS pointer files. The local imports are byte-for-byte Git blobs from that public source repository.

## Imported files

| Original | Local | Modified |
| --- | --- | --- |
| frames/lever_left.png | lever-left.png | no |
| frames/lever_right.png | lever-right.png | no |
| frames/button_blue_up.png | button-blue-up.png | no |
| frames/button_blue_down.png | button-blue-down.png | no |
| frames/chest_full_open_anim_f0.png | chest-full-f0.png | no |
| frames/chest_full_open_anim_f1.png | chest-full-f1.png | no |
| frames/chest_full_open_anim_f2.png | chest-full-f2.png | no |
| frames/floor_spikes_anim_f0.png | spikes-f0.png | no |
| frames/floor_spikes_anim_f1.png | spikes-f1.png | no |
| frames/floor_spikes_anim_f2.png | spikes-f2.png | no |
| frames/floor_spikes_anim_f3.png | spikes-f3.png | no |
| atlas_floor-16x16.png | floor-atlas-16x16.png | no |
| atlas_walls_low-16x16.png | walls-low-atlas-16x16.png | no |
| atlas_walls_high-16x32.png | walls-high-atlas-16x32.png | no |

Importing these files does not itself change collision, gameplay, progression or trap damage.


## Door family imported 28 September 2026

| Original | Local | Source Git blob | Modified |
| --- | --- | --- | --- |
| frames/doors_leaf_closed.png | door-leaf-closed.png | 808614c872558bd948647d61058a2e26f4001dec | no |
| frames/doors_leaf_open.png | door-leaf-open.png | d71b40c688c2ead642a3702379ccd856ecf22c52 | no |
| frames/doors_frame_left.png | door-frame-left.png | a6059a9ad5fe54acb339e8c1ea6678a21574a827 | no |
| frames/doors_frame_right.png | door-frame-right.png | 81d385af6cef60bd5c0621dd79ab198bf078457f | no |
| frames/doors_frame_top.png | door-frame-top.png | 8a93cd75be8a1e34143e37625bcf0a2842937de3 | no |

The destination Git blob SHAs match the source Git blob SHAs exactly for all five files.


## Named floor and wall tiles imported 28 September 2026

All files below are unmodified 16x16 PNGs from the same CC0 DungeonTileset II source. Source and destination Git blob SHAs match exactly.

| Original | Local | Git blob SHA |
| --- | --- | --- |
| frames/floor_1.png | floor-1.png | d5b31cc6f9383e36f693e482a65f9dc59f2311e2 |
| frames/floor_2.png | floor-2.png | 8c41a63da460eac99f243a355fb9ed498b3e122b |
| frames/floor_3.png | floor-3.png | c7a02d6385d460e03bda859b6c64cb4430159cd3 |
| frames/floor_4.png | floor-4.png | 7c035fb73491522a624a901b8842167eea0f5418 |
| frames/floor_5.png | floor-5.png | 1a6a99298ea38cdfcf3fc0ce5e622a55f46b7759 |
| frames/floor_6.png | floor-6.png | 3ed27ede48a79cceef4faca6c2717a107994f656 |
| frames/floor_7.png | floor-7.png | e6cdbb75f17d8fcea52218f0e59188a6ebc42d58 |
| frames/floor_8.png | floor-8.png | ec857ba26f5f1bc95078fb6122a9da59bbe5d450 |
| frames/wall_mid.png | wall-mid.png | 7952b085902919cf3ee50b66575d6bb355dfe094 |
| frames/wall_hole_1.png | wall-hole-1.png | 21ce2b22109daf06fcf2fbf06cb30337b8345c37 |
| frames/wall_hole_2.png | wall-hole-2.png | 222d06ea4531faf132058c43e08f3a3fd7815583 |
