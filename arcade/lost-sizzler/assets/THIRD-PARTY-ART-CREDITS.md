# C64 Dungeon Carnage — Third-party artwork credits

The artwork listed below is used in the current R118 build of **C64 Dungeon Carnage**. Thanks to the artists who made these resources available for independent games.

| Creator | Artwork included | Source | Permission |
| --- | --- | --- | --- |
| **0x72 (Robert Norenberg)** | Four animated wall-torch frames; stone crate and column props | [16×16 Dungeon Tileset](https://0x72.itch.io/16x16-dungeon-tileset) and [DungeonTileset II](https://0x72.itch.io/dungeontileset-ii) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| **Niji** | Gold key sprite | [Dungeon Tileset II Extended](https://nijikokun.itch.io/dungeontileset-ii-extended) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| **Kenney** | Barrel sprite from Tiny Dungeon | [Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| **Pixel_Poem** | Animated gold-score coins, four animation phases | [2D Pixel Dungeon Asset Pack](https://pixel-poem.itch.io/dungeon-assetpuck) | Creator permits use and modification in commercial games; **not CC0**. The standalone asset pack may not be resold/redistributed. |

**Original game art:** Other artwork remains part of the game's existing author-designed and previously accepted visual presentation, including the bookcase graphic.

## What is deliberately not included

The itch.io package excludes ten additional sprite candidates kept in the source repository for future development. It also excludes artwork from unidentified-rights source archives, the noncommercial-only Minifantasy free version, and paid-only expansions. These assets are **not part of the distributed R118 playable build**.

## Developer verification

This credits page is descriptive, not a grant of new rights. Exact source URLs, archive hashes, atlas positions, original file hashes, commercial-permission evidence and release inclusion/exclusion rules are recorded in:

- `assets/asset-manifest.json`
- `assets/pixel/user-r118/PROVENANCE.md`
- `docs/ai-work/dungeon-carnage-r118-assets.md` (source repository)

All third-party names remain the property of their respective owners. The artists do not endorse or sponsor C64 Dungeon Carnage.

## R134 supplemental artwork (candidate)

| Creator | Artwork included | Source | Permission |
| --- | --- | --- | --- |
| **Stealthix** | A 32×32 retracted/safe frame and three extended/active frame slots from the supplied 14-frame sheet; damaging spikes always look raised | [Animated Traps](https://stealthix.itch.io/animated-traps) | [CC0 1.0](https://creativecommons.org/publicdomain/zero/1.0/) |
| **Indie_Vova (Vladimir Ivanov)** | One 32×32 blue mana potion PNG drawn from the free *Dungeons & Pixels* demo, recompressed losslessly for the existing mana item slot | [Dungeons & Pixels Free Demo](https://indie-vova.itch.io/dungeons-and-pixels-starter-pack) | Creator's free-demo licence expressly allows commercial games and modification; **not CC0**, and does not allow standalone asset-pack redistribution. |

The updated sprite files have exact SHA-256/source-frame provenance in `assets/pixel/user-r134/PROVENANCE.md`. This is a candidate PR; the adjusted frame selection requires fresh exact-head Chromium/CI and owner live visual acceptance.


## R135 supplemental artwork (staging only)

| Creator | Artwork included | Source | Licence |
| --- | --- | --- | --- |
| **Will Tice** | Original 32×32 dark-outline `chest_large` frames `frame0000`, `frame0003`, `frame0007` from the free Super Pixel Objects Sample; unchanged PNG bytes, three renderer slots | [Super Pixel Objects Sample](https://untiedgames.itch.io/super-pixel-objects-sample) | Free commercial game use with creator credit; **not CC0**, and no standalone asset-pack redistribution. |

R135 is staged on a separate branch derived from the fully qualified R134 head. It is **not merged or released**. Original 0x72 and V10.34 assets remain available as fallback. Exact-frame original-source fingerprint details: `assets/pixel/user-r135/PROVENANCE.md`.
