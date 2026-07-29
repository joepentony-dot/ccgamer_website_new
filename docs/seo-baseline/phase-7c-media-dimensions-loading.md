# Phase 7C Media Dimensions and Loading

## Verdict

**PASS — shared media sizing and loading corrections are ready for review.**

Phase 7C changes intrinsic media metadata and loading priority only. It does not replace artwork, alter thumbnail framing, redesign the Omega presentation or modify game records.

## Improvements

- Images missing intrinsic dimensions: **29,493 → 27,376**
- Dimension issues removed from the repository-wide static scan: **2,117**
- Iframes not marked for lazy loading: **23 → 22**
- Archive game-card images verified: **2,116**
- Validation checks passed: **18 / 18**

## Archive card coverage

| Generated family | Sized 16:9 game-card images |
|---|---:|
| `games/publishers/` | 750 |
| `games/developers/` | 64 |
| `games/years/` | 651 |
| `games/platforms/` | 651 |

Every targeted archive card now declares `width="320"`, `height="180"`, `loading="lazy"` and `decoding="async"`. The existing CSS continues to control responsive sizing and `object-fit: cover`; no card presentation was changed.

## Single-game media

- The game hero thumbnail now declares a 16:9 intrinsic size, loads eagerly and receives high fetch priority because it is the primary above-the-fold game image.
- The game video iframe now reserves a 16:9 area with `560 × 315` dimensions and uses native lazy loading.
- The header logo retains its existing intrinsic dimensions but is no longer marked lazy on the single-game page.
- Runtime guards in `js/load-single-game.js` preserve the hero policy after game data hydration.

## Browser validation

| Route | HTTP | Sized target media | Unsized target media | Serious/critical axe nodes |
|---|---:|---:|---:|---:|
| Game: Zeewolf | 200 | 3 | 0 | 0 |
| Publisher: Ocean Software | 200 | 46 | 0 | 0 |
| Developer: Ocean | 200 | 2 | 0 | 0 |
| Year: 1989 | 200 | 49 | 0 | 0 |
| Platform: Amiga | 200 | 99 | 0 | 0 |

Raw local layout-shift observations are retained in the downloadable workflow artifact rather than committed, because the values naturally vary between browser runs. They are lab evidence, not production Core Web Vitals field data.

## Deliberate limits

- Third-party HTML cached under `data/lemon-cache/` is not rewritten.
- Mixed C64 and Amiga screenshot galleries are not assigned guessed dimensions; their source formats vary and must be handled only when exact dimensions are available.
- Large-file recompression is reserved for Phase 7E.
- Redirect-route architecture remains reserved for Phase 7F.

## Workflow ownership

The historical Phase 6B workflow remains a complete read-only publishing validator on pull requests. Its commit step is now manual-only, preventing it from racing with later phase-specific workflows that own their generated output.

## Safety

- `index.html` unchanged
- `home.html` unchanged
- `resources/css/intro.css` unchanged
- `js/index-intro.js` unchanged
- `games/games.json` unchanged
- no route, game record or thumbnail asset renamed, replaced or removed
