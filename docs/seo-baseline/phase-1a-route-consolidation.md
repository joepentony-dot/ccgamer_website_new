# Phase 1A Matched Route Consolidation

This change consolidates only the 57 low-risk flat-file/folder duplicates approved in the Phase 1 review.

## Results

| Check | Result |
|---|---:|
| Phase 1 collision baseline | **58** |
| Matched alternate routes consolidated | **57** |
| Canonical collisions remaining | **1** |
| Canonical owner pages unchanged | **57** |
| Validated noindex redirect stubs | **57** |
| Internal links still targeting aliases | **0** |
| Protected files unchanged | **6** |

## Routes consolidated by section

- `amiga-demo-music/`: **10** alternate routes
- `music/`: **20** alternate routes
- `retro-events/`: **8** alternate routes
- `retro-specials/`: **19** alternate routes

## Generator safeguards

- Retro specials, retro events and Amiga demo flat redirects now emit `noindex,follow`.
- Composer builds preserve active canonical folders instead of deleting them.
- Composer builds create a canonical folder page only when it is missing.
- Composer flat `.html` files are generated as noindex redirect stubs.
- Query strings and URL fragments are retained during JavaScript forwarding.

## Explicit exclusions

- `index.html`, `home.html` and the intro-loader stack were not changed.
- `games/games.json` was not changed.
- No canonical folder page was rewritten or deleted.
- The remaining homepage collision is deferred to a separate tested phase.

## Rollback

Revert the Phase 1A squash merge commit. Every legacy route remains as a file, so no deleted page needs to be reconstructed.
