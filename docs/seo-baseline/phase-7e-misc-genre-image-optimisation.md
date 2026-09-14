# Phase 7E Miscellaneous Genre Image Optimisation

## Verdict

**BOUNDED CORRECTION — only `resources/images/genres/miscellaneous.png` and its matching intrinsic dimensions on `games/genres/index.html` are corrected.**

The existing filename, URL, PNG format and artwork are retained. The source image was 1024×474 even though the genre index's neighbouring genre artwork is authored around 460 pixels wide and the shared card CSS constrains these tiles to a maximum width of 360 CSS pixels. The corrected 460×213 source retains the original aspect ratio to within 0.04% while removing unnecessary raster payload.

## Before and after

| Metric | Before | After |
|---|---:|---:|
| Dimensions | 1024×474 | 460×213 |
| File size | 662,336 bytes | 160,527 bytes |
| File size | 646.8 KB | 156.8 KB |
| PNG mode | `RGB` | `RGB` |
| Transparency | False | False |
| SHA-256 | `9fbccc32a151736208e4a6d55ba875c453e3f0d6b166b41b5430bd55dbb2ea62` | `f94ed5576c658f18bc5e8f27b458ec71061aea057a35e2020154ee845148bbb3` |

**Reduction:** 501,809 bytes saved (75.76%).

## Display-size comparison

The original and corrected images were independently resampled to representative genre-card widths. Values are per-channel pixel differences on a 0–255 scale.

| Test size | Mean absolute error RGB | Maximum absolute error RGB |
|---:|---|---|
| 180×83 | [0.388755, 0.404083, 0.39257] | [10, 9, 9] |
| 360×167 | [0.775915, 0.808932, 0.76492] | [20, 27, 23] |
| 460×213 | [0.0, 0.0, 0.0] | [0, 0, 0] |

The workflow artifact contains the original resampled to 460×213, the corrected image, and an 8× amplified difference panel.

## Safety checks

- the image remains an opaque PNG
- the filename and public URL remain unchanged
- the original artwork is resampled only; no crop, recolour or redesign is performed
- the genre index intrinsic dimensions are updated to match the corrected file
- `home.html`, the intro-loader stack and `games/games.json` remain unchanged
- every other PNG, JPG/JPEG and WebP hash remains unchanged
- no CSS or JavaScript file is modified
