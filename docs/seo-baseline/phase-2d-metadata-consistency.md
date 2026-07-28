# Phase 2D Metadata Consistency

Phase 2D aligns Open Graph and Twitter metadata on the four non-homepage pages identified by the Phase 2A audit.

## Results

| Check | Before | After |
|---|---:|---:|
| Metadata consistency issues | **9** | **2** |
| Actionable non-homepage issues | **7** | **0** |
| Deferred homepage issues | **2** | **2** |
| Protected files changed | — | **0** |

## Corrections

- `emulation.html`: aligned Open Graph and Twitter title/description with the page title and meta description.
- `games/collections/amiga-demo-music.html`: aligned the Open Graph title and added a complete Twitter card metadata set.
- `games/collections/retro-events.html`: aligned Open Graph and Twitter title/description.
- `games/collections/retro-specials.html`: aligned Open Graph and Twitter title.

## Deferred homepage work

The two remaining findings belong to `home.html`. They remain deferred because the homepage is coupled to the protected intro-loader architecture.

## Permanent validation

`scripts/validate_social_metadata.py` and `.github/workflows/social-metadata-validation.yml` reject new non-homepage canonical, Open Graph or basic Twitter-card inconsistencies.

## Explicit exclusions

- No homepage or intro-loader file was changed.
- `games/games.json` was not changed.
- No page copy, navigation, CSS, schema, sitemap or image was changed.

## Rollback

Revert the Phase 2D squash merge commit.
