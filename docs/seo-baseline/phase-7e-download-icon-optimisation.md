# Phase 7E Download Icon Optimisation

## Verdict

**BOUNDED CORRECTION — only `resources/images/icons/download.PNG` is optimised.**

The existing filename, URL, square aspect ratio and transparent PNG format are retained. The icon is displayed at approximately 18 CSS pixels, while the corrected 256×256 source supports high-density displays with substantial headroom.

## Before and after

| Metric | Before | After |
|---|---:|---:|
| Dimensions | 4000×4000 | 256×256 |
| File size | 5,849,957 bytes | 54,151 bytes |
| File size | 5.58 MB | 52.9 KB |
| PNG mode | `RGBA` | `RGBA` |
| Transparency | True | True |
| Alpha extrema | [0, 255] | [0, 255] |
| SHA-256 | `b4e37e1afc9d9363fb4c2a79ddd53573f64be933e31369c71ec66f04dcd78724` | `fd7a408f9dd28914f471561eb05ee89f9f56bd5e968c5bf90fc5e9699db5ca67` |

**Reduction:** 5,795,806 bytes saved (99.07%).

## Display-size comparison

The original image and corrected image were independently resampled to the button's approximate display sizes. Values are per-channel pixel differences on a 0–255 scale.

| Test size | Mean absolute error RGBA | Maximum absolute error RGBA |
|---:|---|---|
| 18×18 | [1.814815, 0.225309, 0.660494, 0.083333] | [255, 8, 128, 1] |
| 36×36 | [0.425926, 0.981481, 0.809414, 0.054784] | [85, 255, 255, 2] |
| 64×64 | [0.749512, 0.939697, 0.911133, 0.080322] | [128, 128, 255, 3] |

The workflow artifact contains a three-panel comparison: original resampled to 256×256, corrected 256×256, and an 8× amplified difference image.

## Safety checks

- the image remains a transparent PNG
- the filename and repository path remain unchanged
- `js/load-single-game.js` remains unchanged
- `resources/css/games.css` remains unchanged
- homepage, intro-loader and game database files remain unchanged
- every other PNG, JPG/JPEG and WebP hash remains unchanged
- no other image is resized, recompressed, renamed, moved or deleted
