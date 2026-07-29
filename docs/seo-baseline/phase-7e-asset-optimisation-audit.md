# Phase 7E Asset Optimisation Audit

## Verdict

**AUDIT ONLY — no image asset was modified, renamed, moved or replaced.**

This audit measures first-party PNG, JPG/JPEG and WebP files in the repository, excluding Lemon cache material and known backup trees. Candidate labels require manual visual comparison before any later optimisation work.

## Repository totals

| Metric | Current |
|---|---:|
| Raster image files | 1,525 |
| Total raster image bytes | 114.67 MB |
| Files over 500 KB | 9 |
| Files over 1 MB | 4 |
| Files over 2 megapixels | 16 |
| Likely oversized against declared HTML dimensions | 0 |
| Byte-identical duplicate groups | 56 |
| Pixel-identical groups with different file bytes | 0 |
| Files with no static repository reference found | 780 |
| Unreadable image files | 0 |

## Extension breakdown

| Extension | Files | Bytes |
|---|---:|---:|
| `.jpg` | 472 | 13.76 MB |
| `.png` | 338 | 40.88 MB |
| `.webp` | 715 | 60.03 MB |

## Priority review candidates

These are review candidates, not approved conversions. Static-reference detection cannot prove that an asset is unused because some paths may be assembled dynamically.

| Score | Asset | Size | Dimensions | Static references | Reasons |
|---:|---|---:|---:|---:|---|
| 9 | `resources/images/icons/download.PNG` | 5.58 MB | 4000×4000 | 1 | over 1 MB; over 2 megapixels |
| 8 | `resources/audio/easter-eggs/zx-clive.jpg` | 511.2 KB | 2560×1872 | 0 | over 500 KB; over 2 megapixels; no static reference found |
| 7 | `resources/images/affiliate/a500-mini.png` | 1.53 MB | 1500×1149 | 0 | over 1 MB; no static reference found |
| 7 | `resources/images/affiliate/c64-maxi.png` | 1.34 MB | 1500×980 | 0 | over 1 MB; no static reference found |
| 7 | `resources/images/affiliate/joystick-clear.png` | 1.22 MB | 1282×1306 | 0 | over 1 MB; no static reference found |
| 7 | `quiz/images/pack-6/chaos-engine-answer.webp` | 114.2 KB | 1400×2049 | 0 | over 2 megapixels; byte-identical duplicate; no static reference found |
| 7 | `resources/images/games/boxes-3d/the-chaos-engine.webp` | 114.2 KB | 1400×2049 | 0 | over 2 megapixels; byte-identical duplicate; no static reference found |
| 6 | `resources/images/games/boxes-3d/super-cars-2.webp` | 347.7 KB | 1400×2049 | 0 | over 2 megapixels; no static reference found |
| 6 | `resources/images/games/boxes-3d/simon-the-sorcerer.webp` | 324.5 KB | 1400×2049 | 0 | over 2 megapixels; no static reference found |
| 6 | `resources/images/games/boxes-3d/another-world.webp` | 303.6 KB | 1404×2054 | 0 | over 2 megapixels; no static reference found |
| 6 | `resources/images/composers/allister-brimble.jpg` | 291.9 KB | 2560×2495 | 0 | over 2 megapixels; no static reference found |
| 6 | `resources/images/games/boxes-3d/battle-chess.webp` | 278.5 KB | 1400×2049 | 0 | over 2 megapixels; no static reference found |
| 5 | `resources/images/affiliate/gamepad-white.png` | 806.6 KB | 1439×1223 | 0 | over 500 KB; no static reference found |
| 5 | `resources/images/email/ccg-email-banner.png` | 769.9 KB | 1429×506 | 0 | over 500 KB; no static reference found |
| 5 | `resources/images/genres/miscellaneous.png` | 646.8 KB | 1024×474 | 2 | over 500 KB; large opaque PNG; format review only |
| 5 | `resources/images/affiliate/gamepad-black.png` | 533.8 KB | 1101×933 | 0 | over 500 KB; no static reference found |
| 5 | `resources/images/genres/licensed.png` | 145.5 KB | 460×215 | 0 | byte-identical duplicate; no static reference found |
| 5 | `resources/images/genres/top-picks.png` | 144.6 KB | 460×215 | 0 | byte-identical duplicate; no static reference found |
| 5 | `resources/images/thumbnails/all/cave_of_the_word_wizard_new_1.png` | 120.5 KB | 460×215 | 0 | byte-identical duplicate; no static reference found |
| 5 | `resources/images/genres/cartridge.png` | 116.4 KB | 460×215 | 0 | byte-identical duplicate; no static reference found |
| 5 | `resources/images/genres/role-playing.png` | 112.2 KB | 460×215 | 0 | byte-identical duplicate; no static reference found |
| 5 | `resources/images/thumbnails/all/tir_na_nog.png` | 109.2 KB | 460×215 | 0 | byte-identical duplicate; no static reference found |
| 5 | `resources/images/thumbnails/all/granys_garden_new.png` | 101.2 KB | 460×215 | 0 | byte-identical duplicate; no static reference found |
| 5 | `resources/images/thumbnails/all/countdown_new.png` | 89.0 KB | 460×215 | 0 | byte-identical duplicate; no static reference found |
| 5 | `resources/images/thumbnails/all/blockbusters_new_1.png` | 82.5 KB | 460×215 | 0 | byte-identical duplicate; no static reference found |
| 5 | `resources/c64_neon.png` | 81.1 KB | 1024×1024 | 0 | byte-identical duplicate; no static reference found |
| 5 | `resources/images/thumbnails/all/micro_mouse_new_1.png` | 76.3 KB | 460×215 | 0 | byte-identical duplicate; no static reference found |
| 5 | `resources/images/thumbnails/all/kingpin_arcade_sports_bowling_1.png` | 72.5 KB | 460×215 | 0 | byte-identical duplicate; no static reference found |
| 5 | `resources/images/genres/bpjs.png` | 64.7 KB | 460×215 | 0 | byte-identical duplicate; no static reference found |
| 4 | `resources/images/games/boxes-3d/cadaver.webp` | 246.6 KB | 1416×2099 | 0 | over 2 megapixels; no static reference found |
| 4 | `resources/images/games/boxes-3d/pinball-dreams.webp` | 220.6 KB | 1396×2042 | 0 | over 2 megapixels; no static reference found |
| 4 | `resources/images/games/boxes-3d/speedball-2-brutal-deluxe.webp` | 207.7 KB | 1400×2045 | 0 | over 2 megapixels; no static reference found |
| 4 | `quiz/images/pack-6/defender-of-the-crown-answer.webp` | 197.2 KB | 850×1244 | 0 | byte-identical duplicate; no static reference found |
| 4 | `resources/images/games/boxes-3d/defender-of-the-crown.webp` | 197.2 KB | 850×1244 | 0 | byte-identical duplicate; no static reference found |
| 4 | `resources/images/games/boxes-3d/the-lost-patrol.webp` | 183.7 KB | 1396×2042 | 0 | over 2 megapixels; no static reference found |
| 4 | `resources/images/collections/licensed-collection.png` | 145.5 KB | 460×215 | 2 | byte-identical duplicate |
| 4 | `resources/images/collections/top-picks-collection.png` | 144.6 KB | 460×215 | 2 | byte-identical duplicate |
| 4 | `quiz/images/pack-6/eye-of-the-beholder-ii-answer.webp` | 130.9 KB | 850×1244 | 0 | byte-identical duplicate; no static reference found |
| 4 | `resources/images/games/boxes-3d/eye-of-the-beholder-2-the-legend-of-darkmoon.webp` | 130.9 KB | 850×1244 | 0 | byte-identical duplicate; no static reference found |
| 4 | `resources/images/thumbnails/all/cave_of_the_word_wizard_new.png` | 120.5 KB | 460×215 | 8 | byte-identical duplicate |

## Byte-identical duplicates

| Potential duplicate bytes | Files | Paths |
|---:|---:|---|
| 197.2 KB | 2 | `quiz/images/pack-6/defender-of-the-crown-answer.webp`<br>`resources/images/games/boxes-3d/defender-of-the-crown.webp` |
| 145.5 KB | 2 | `resources/images/collections/licensed-collection.png`<br>`resources/images/genres/licensed.png` |
| 144.6 KB | 2 | `resources/images/collections/top-picks-collection.png`<br>`resources/images/genres/top-picks.png` |
| 130.9 KB | 2 | `quiz/images/pack-6/eye-of-the-beholder-ii-answer.webp`<br>`resources/images/games/boxes-3d/eye-of-the-beholder-2-the-legend-of-darkmoon.webp` |
| 120.5 KB | 2 | `resources/images/thumbnails/all/cave_of_the_word_wizard_new.png`<br>`resources/images/thumbnails/all/cave_of_the_word_wizard_new_1.png` |
| 118.8 KB | 2 | `quiz/images/pack-6/pirates-answer.webp`<br>`resources/images/games/boxes-3d/sid-meier-s-pirates.webp` |
| 116.4 KB | 2 | `resources/images/collections/cartridge-collection.png`<br>`resources/images/genres/cartridge.png` |
| 114.2 KB | 2 | `quiz/images/pack-6/chaos-engine-answer.webp`<br>`resources/images/games/boxes-3d/the-chaos-engine.webp` |
| 112.2 KB | 2 | `resources/images/genres/role-playing.png`<br>`resources/images/genres/rpg.png` |
| 111.7 KB | 2 | `quiz/images/pack-6/little-computer-people-answer.webp`<br>`resources/images/games/boxes-3d/little-computer-people.webp` |
| 109.4 KB | 2 | `quiz/images/pack-6/it-came-from-the-desert-answer.webp`<br>`resources/images/games/boxes-3d/it-came-from-the-desert.webp` |
| 109.2 KB | 2 | `resources/images/thumbnails/all/tir_na_nog.png`<br>`resources/images/thumbnails/all/tir_na_nog_new.png` |
| 101.5 KB | 2 | `quiz/images/pack-6/hero-answer.webp`<br>`resources/images/games/boxes-3d/hero.webp` |
| 101.2 KB | 2 | `resources/images/thumbnails/all/grannys_garden.png`<br>`resources/images/thumbnails/all/granys_garden_new.png` |
| 93.8 KB | 2 | `quiz/images/pack-6/microprose-soccer-answer.webp`<br>`resources/images/games/boxes-3d/microprose-soccer.webp` |
| 92.5 KB | 2 | `resources/images/games/boxes-3d/cavelon (1).webp`<br>`resources/images/games/boxes-3d/cavelon.webp` |
| 92.2 KB | 2 | `quiz/images/pack-6/wizard-of-wor-answer.webp`<br>`resources/images/games/boxes-3d/wizard-of-wor.webp` |
| 89.0 KB | 2 | `resources/images/thumbnails/all/countdown_new.png`<br>`resources/images/thumbnails/all/countdown_to_meltdown.png` |
| 82.5 KB | 2 | `resources/images/thumbnails/all/blockbusters_new.png`<br>`resources/images/thumbnails/all/blockbusters_new_1.png` |
| 81.1 KB | 2 | `resources/c64_neon.png`<br>`resources/images/og/c64_neon.png` |

## Pixel-identical files with different encodings or file bytes

| Files | Extensions | Paths |
|---:|---|---|
| 0 | — | None |

## Audit limitations

- Declared display-size comparison uses numeric `width` and `height` attributes found in static HTML. CSS-only sizing and runtime-generated paths may not be measurable.
- A file with no detected static reference is not automatically safe to delete.
- Opaque PNGs are listed for format review only; no lossy conversion is approved by this audit.
- Exact visual review is required before resizing, recompressing or converting any asset.
- Animated images are measured from their first frame for pixel-duplicate detection.

## Safety

- protected homepage, intro-loader and game-database files remain unchanged
- Lemon cache and known backup material are excluded
- filenames, paths, dimensions, transparency and image content remain untouched
- the workflow compares a complete before/after image hash manifest
