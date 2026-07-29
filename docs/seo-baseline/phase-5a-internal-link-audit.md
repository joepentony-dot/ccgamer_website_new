# Phase 5A Internal Linking and Orphan Page Audit

This is a read-only audit of static internal discovery after Phases 0–4. Public HTML, CSS, JavaScript and game data are not modified.

## Executive summary

| Check | Count |
|---|---:|
| Public HTML pages audited | **1982** |
| Indexable pages | **936** |
| Orphan indexable pages | **3** |
| Weakly linked indexable pages | **129** |
| Sitemap-only indexable pages | **3** |
| Pages linked only from archive families | **833** |
| Broken internal link edges | **0** |
| Intentional canonical game-wrapper redirect destinations | **651** |
| Other redirect destinations receiving internal links | **0** |
| Noindex destinations receiving internal links | **313** |
| Noncanonical alias destinations receiving internal links | **1** |
| Breadcrumb or adjacent-navigation issues | **272** |

## Canonical game discovery

- Canonical game routes expected: **651**
- Canonical game routes missing: **0**
- Games without meaningful static archive or Browse Games discovery: **0**
- Games with one or zero archive discovery dimensions: **0**
- Archive routes linking to a game: **4–13**

## Results by route family

| Route family | Indexable | Orphan | Weak | Sitemap only | Archive only |
|---|---:|---:|---:|---:|---:|
| canonical-game | **651** | **0** | **0** | **0** | **567** |
| collection | **8** | **0** | **3** | **0** | **6** |
| community | **1** | **0** | **0** | **0** | **0** |
| composer | **85** | **0** | **0** | **0** | **85** |
| demo-music | **10** | **0** | **3** | **0** | **10** |
| developer | **12** | **0** | **11** | **0** | **11** |
| downloads | **1** | **0** | **0** | **0** | **0** |
| games-hub | **1** | **0** | **0** | **0** | **0** |
| genre | **16** | **0** | **15** | **0** | **15** |
| other-public | **7** | **1** | **1** | **1** | **0** |
| platform | **3** | **0** | **0** | **0** | **2** |
| publisher | **97** | **0** | **96** | **0** | **97** |
| quiz | **2** | **1** | **0** | **1** | **0** |
| retro-event | **8** | **1** | **0** | **1** | **7** |
| retro-special | **19** | **0** | **0** | **0** | **19** |
| year | **15** | **0** | **0** | **0** | **14** |

## Comparison with Phase 0

- Phase 0 indexable pages: **923**; Phase 5A: **936**.
- Phase 0 orphan candidates: **97**; Phase 5A unique-source orphans: **3**.
- Phase 0 broken internal links: **0**; Phase 5A broken static link edges: **0**.
- The orphan figures are directional rather than identical because Phase 5A counts unique source pages.

## Priority samples

### Orphan indexable pages

- `/viewer/manual.html` — other-public — 0 incoming source page(s)
- `/quiz/pack-6.html` — quiz — 0 incoming source page(s)
- `/retro-events/yorkshire-amiga-group-meetup/` — retro-event — 0 incoming source page(s)

### Weakly linked indexable pages

- `/games/collections/bpjs-indexed-games.html` — collection — 1 incoming source page(s)
- `/games/collections/cartridge-games.html` — collection — 1 incoming source page(s)
- `/games/collections/licensed-games.html` — collection — 1 incoming source page(s)
- `/amiga-demo-music/desert-dream-kefrens/` — demo-music — 1 incoming source page(s)
- `/amiga-demo-music/red-sector-folow-me/` — demo-music — 1 incoming source page(s)
- `/amiga-demo-music/sounds-of-silents/` — demo-music — 1 incoming source page(s)
- `/games/developers/broderbund/` — developer — 1 incoming source page(s)
- `/games/developers/capcom/` — developer — 1 incoming source page(s)
- `/games/developers/delphine-software/` — developer — 1 incoming source page(s)
- `/games/developers/infogrames/` — developer — 1 incoming source page(s)
- `/games/developers/konami/` — developer — 1 incoming source page(s)
- `/games/developers/lucasfilm-games/` — developer — 1 incoming source page(s)
- `/games/developers/mastertronic/` — developer — 1 incoming source page(s)
- `/games/developers/ocean/` — developer — 1 incoming source page(s)
- `/games/developers/reaktor-software/` — developer — 1 incoming source page(s)
- `/games/developers/sensible-software/` — developer — 1 incoming source page(s)
- `/games/developers/us-gold/` — developer — 1 incoming source page(s)
- `/games/genres/action-adventure-games.html` — genre — 1 incoming source page(s)
- `/games/genres/adventure-games.html` — genre — 1 incoming source page(s)
- `/games/genres/arcade-games.html` — genre — 1 incoming source page(s)
- …and 109 more in the JSON artifact

### Sitemap-only or JavaScript-dependent discovery candidates

- `/quiz/pack-6.html` — quiz — 0 incoming source page(s)
- `/retro-events/yorkshire-amiga-group-meetup/` — retro-event — 0 incoming source page(s)
- `/viewer/manual.html` — other-public — 0 incoming source page(s)

### Actionable broken, redirect, noindex and alias samples

- **noindex**: `community/activity.html` → `/community/profile.html`
- **noindex**: `community/admin.html` → `/community/profile.html`
- **noindex**: `community/index.html` → `/community/activity.html`
- **noindex**: `community/index.html` → `/community/latest-comments.html`
- **noindex**: `community/index.html` → `/community/profile.html`
- **noindex**: `community/index.html` → `/community/public-profile.html`
- **noindex**: `community/index.html` → `/community/top-rated.html`
- **noindex**: `community/public-profile.html` → `/community/profile.html`
- **noindex**: `games/developers/index.html` → `/games/developers/argus-press-software/`
- **noindex**: `games/developers/index.html` → `/games/developers/ariolasoft/`
- **noindex**: `games/developers/index.html` → `/games/developers/binary-asylum/`
- **noindex**: `games/developers/index.html` → `/games/developers/datasoft/`
- **noindex**: `games/developers/index.html` → `/games/developers/david-h-schroeder/`
- **noindex**: `games/developers/index.html` → `/games/developers/disney/`
- **noindex**: `games/developers/index.html` → `/games/developers/dro-soft-spain/`
- **noindex**: `games/developers/index.html` → `/games/developers/elite/`
- **noindex**: `games/developers/index.html` → `/games/developers/enigma-variations/`
- **noindex**: `games/developers/index.html` → `/games/developers/erbe-software-spain/`
- **noindex**: `games/developers/index.html` → `/games/developers/firebird/`
- **noindex**: `games/developers/index.html` → `/games/developers/gremlin-graphics/`
- **noindex**: `games/developers/index.html` → `/games/developers/hewson/`
- **noindex**: `games/developers/index.html` → `/games/developers/infocom/`
- **noindex**: `games/developers/index.html` → `/games/developers/mogul-communications/`
- **noindex**: `games/developers/index.html` → `/games/developers/probe-software/`
- **noindex**: `games/developers/index.html` → `/games/developers/psygnosis/`
- …and 1036 more in the JSON artifact

## Redirect interpretation

- **651** canonical game routes deliberately forward to the dynamic game shell while retaining their own canonical and schema.
- **0** other redirect destinations receive static internal links and should be reviewed separately.

## Hub and parent discovery checks

- `/games/years/` is linked from /games/.
- `/games/platforms/` is linked from /games/.
- `/games/publishers/` is not statically linked from its expected parent: /games/.
- `/games/developers/` is linked from /games/.
- `/games/genres/` is linked from /games/.
- `/games/collections/` is linked from /games/.
- `/games/downloads/` is linked from /games/.
- `/music/composers/` is linked from /music/.

## Anchor-text review

- Vague anchor-text occurrences detected: **6**.
- `Open`: **5** occurrence(s)
- `click here`: **1** occurrence(s)

## Recommended correction batches

1. **Highest value, low risk:** correct confirmed broken links and links to noncanonical aliases or non-game redirect pages in tightly scoped route-family batches.
2. **High value, low-to-medium risk:** add missing parent-to-hub links and static discovery for genuine sitemap-only indexable pages.
3. **Medium risk:** strengthen orphan and one-source pages using existing archive hubs rather than new global-navigation changes.
4. **Noindex review:** separate intentional thin-archive links from accidental links to utility or private pages before changing anything.
5. **Copy refinement:** replace vague anchor labels only where the destination is ambiguous; do not bulk-rewrite established navigation.

## Safety and scope

- No public HTML, CSS or JavaScript changed.
- `games/games.json` remained unchanged.
- No routes, redirects, canonicals or navigation were changed.
- Detailed page and link-graph evidence is stored only in the workflow artifact.

## Limitations

- Runtime-only links are not counted as static discovery and appear as possible JavaScript-dependent candidates.
- External resources were not fetched.
- Phase 0 and Phase 5A orphan counts use different incoming-link units.
