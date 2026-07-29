# Phase 7E Download Icon Correction Plan

This branch performs one bounded correction identified by the Phase 7E asset audit.

## Target

- `resources/images/icons/download.PNG`
- current audited dimensions: 4000×4000
- current audited size: approximately 5.58 MB
- current display size: approximately 1.1rem in the single-game download button

## Intended correction

- resize to 256×256 with high-quality Lanczos resampling
- retain transparent PNG format
- retain the existing filename and URL
- leave JavaScript, CSS, routes and game data unchanged

## Validation

The pull-request workflow records protected hashes and every non-target raster-image hash before applying the correction. It creates visual comparison artifacts, measures display-size pixel differences, restricts changed paths, and commits only the corrected PNG plus generated evidence.

Do not merge without explicit approval.
