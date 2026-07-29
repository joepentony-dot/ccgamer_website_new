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
| Broken internal link edges | **559** |
| Redirect destinations receiving internal links | **651** |
| Noindex destinations receiving internal links | **313** |
| Noncanonical alias destinations receiving internal links | **0** |
| Breadcrumb or adjacent-navigation issues | **273** |

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
- Phase 0 broken internal links: **0**; Phase 5A broken static link edges: **559**.
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

### Broken, redirect, noindex and alias link samples

- **broken**: `404.html` → `/home.html`
- **broken**: `about.html` → `/home.html`
- **broken**: `community/profile.html` → `/auth/forgot.html`
- **broken**: `community/profile.html` → `/home.html`
- **broken**: `complete-index.html` → `/home.html`
- **broken**: `contact.html` → `/home.html`
- **broken**: `emulation.html` → `/home.html`
- **broken**: `games/collections/amiga-demo-music.html` → `/home.html`
- **broken**: `games/collections/bpjs-indexed-games.html` → `/home.html`
- **broken**: `games/collections/cartridge-games.html` → `/home.html`
- **broken**: `games/collections/index.html` → `/home.html`
- **broken**: `games/collections/licensed-games.html` → `/home.html`
- **broken**: `games/collections/retro-events.html` → `/home.html`
- **broken**: `games/collections/retro-specials.html` → `/home.html`
- **broken**: `games/collections/top-picks.html` → `/home.html`
- **broken**: `games/developers/argus-press-software/index.html` → `/home.html`
- **broken**: `games/developers/ariolasoft/index.html` → `/home.html`
- **broken**: `games/developers/binary-asylum/index.html` → `/home.html`
- **broken**: `games/developers/broderbund/index.html` → `/home.html`
- **broken**: `games/developers/capcom/index.html` → `/home.html`
- **broken**: `games/developers/datasoft/index.html` → `/home.html`
- **broken**: `games/developers/david-h-schroeder/index.html` → `/home.html`
- **broken**: `games/developers/delphine-software/index.html` → `/home.html`
- **broken**: `games/developers/disney/index.html` → `/home.html`
- **broken**: `games/developers/dro-soft-spain/index.html` → `/home.html`
- …and 4335 more in the JSON artifact

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

1. **Highest value, low risk:** correct broken links and links to redirects, noindex pages or noncanonical aliases in tightly scoped route-family batches.
2. **High value, low-to-medium risk:** add missing parent-to-hub links and static discovery for genuine sitemap-only indexable pages.
3. **Medium risk:** strengthen orphan and one-source pages using existing archive hubs rather than new global-navigation changes.
4. **Targeted game discovery:** review any game with one or zero discovery dimensions and connect it only through verified source metadata.
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
