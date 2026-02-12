# Omega SEO query optimisation plan

## Data status
No Google Search Console query export is present in this repository, so this plan is a **ready-to-fill mapping template** for the position 8–20, high-impression/low-CTR segment.

## Priority query buckets

| Priority | Query intent cluster | Target page | Optimisation type |
|---|---|---|---|
| P1 | `[game title] c64`, `[game title] amiga`, `[game title] review` | `/games/game.html?id=<slug>` via per-game canonical `/games/<slug>/` | Tighten dynamic title format, structured data completion (publisher/date/image/author), richer CTR meta snippets |
| P1 | `commodore 64 games`, `best c64 games`, `retro c64 games` | `/games/` | Canonical normalisation to trailing slash and sitemap alignment |
| P1 | `c64 game genres`, `commodore 64 genre list` | `/games/genres/` | Canonical trailing-slash consistency to reduce duplicate index paths |
| P2 | `retro gaming quiz`, `commodore quiz`, `amiga trivia` | `/quiz/` | Canonical trailing-slash path consistency |
| P2 | `commodore game collections`, `licensed c64 games`, `cartridge c64 games` | `/games/collections/index.html` | Keep unique collection intent and verify inclusion in sitemap-pages |
| P3 | Brand and navigation variants (`cheeky commodore gamer home`, `c64 archive`) | `/` | Preserve homepage canonical and improve crawl confidence through sitemap hygiene |

## GSC filter recipe (for immediate use)

1. Query report filter: impressions descending.
2. Position filter: `>=8` and `<=20`.
3. CTR filter: below property median CTR.
4. Group by regex buckets:
   - game-title patterns
   - platform patterns (`c64`, `commodore 64`, `amiga`)
   - discovery patterns (`best`, `review`, `history`, `retro`)
5. Attach each bucket to the target page in the matrix above.

## Expected near-term KPI movement

- CTR uplift target on 8–20 bracket: **2.4% → 3.5%+**.
- Higher canonical confidence from fewer equivalent URL variants.
- Reduced duplicate-path crawl noise via sitemap canonicalisation.
