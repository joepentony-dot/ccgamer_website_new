# Phase 6D Repository Cleanup and Baseline Lock

**Baseline date:** 29 July 2026  
**Stable `main` commit:** `ddcda2df6ac1dffa33ba7d3febce857b60d38c21`  
**Baseline source:** merged PR #1172 — Phase 6B Reliable Games Editor Publishing

## Verdict

The repository is ready to move from architecture repair into measured optimisation work.

- Open pull requests after cleanup: **0**
- Real games in `games/games.json`: **651**
- Powerdrome published or retained in `main`: **No**
- Games Editor publishing readiness: **READY**
- Phase 6B synthetic C64 transaction: **19 / 19 PASS**
- Phase 6B synthetic Amiga transaction: **19 / 19 PASS**
- Protected homepage and intro-loader files changed during Phase 6D: **No**
- Public HTML, CSS, JavaScript, game data and generated archives changed during Phase 6D: **No**

## Stable protected baseline

The following files remain protected and were not changed by this documentation-only phase:

- `index.html`
- `home.html`
- `resources/css/intro.css`
- `js/index-intro.js`
- `games/games.json`

No game route, thumbnail, publisher URL, developer URL, composer URL, year archive, platform archive or collection route was renamed or removed.

## Completed architecture

The current baseline includes:

1. Canonical and indexing policy corrections.
2. Complete sitemap and canonical coverage.
3. Valid structured data and permanent schema checks.
4. Static `VideoGame` and `BreadcrumbList` schema for canonical game wrappers.
5. Publisher, developer and composer archive discovery.
6. Release-year and platform archives.
7. Internal-link and orphan-page validation.
8. One deterministic game-publishing command: `node scripts/rebuild-games.js`.
9. Data-derived catalogue totals with a protected minimum baseline.
10. Permanent disposable C64 and Amiga publishing transactions.
11. Lemon64 Auto Fill retained only as assisted import requiring manual factual review.
12. A central workflow that owns generated output after `games/games.json` changes.

## Current publishing ownership

### Central writer

`.github/workflows/games-publishing.yml` is the authoritative generated-output writer for real catalogue changes on `main`.

It runs the complete game rebuild, verifies deterministic repeat generation, confirms protected hashes and commits generated output while leaving `games/games.json` under explicit editorial control.

### Specialist archive workflows

The publisher, developer, composer, downloads and year/platform workflows remain available for focused validation and manual maintenance. They no longer compete as independent writers when `games/games.json` changes.

### Permanent validators

Current validation includes structured data, social metadata, sitemap integrity, year/platform membership, archive discovery, protected-file hashes and synthetic publishing transactions.

Historical phase workflows are retained as audit history or manual checks where appropriate; they are not the current publishing authority.

## Pull-request cleanup

The following stale pull requests were closed without merge during Phase 6D:

| PR | Former purpose | Cleanup decision |
|---:|---|---|
| #1171 | Duplicate Phase 6B publishing implementation | Superseded by merged PR #1172 |
| #1144 | Factual publisher profiles and archive enrichment | Stale generated branch; research idea preserved below |
| #1118 | Additional mobile Easter-egg modal guard | Superseded by merged/current modal fixes |
| #1112 | Mobile Easter-egg overlay CSS changes | Superseded by current overlay implementation |
| #1104 | PR-safe generators and missing Retro Special page | Superseded by current collection and publishing workflows |
| #1103 | Retro Special restoration and PR workflow changes | Superseded by current generated pages and workflow model |
| #1098 | Collection stub generator | Superseded by current collection generation system |
| #1097 | Retro Special stub generator | Superseded by current collection generation system |
| #1091 | Game wrapper SEO/schema generator changes | Superseded by Phase 2C and Phase 6B |
| #1090 | Duplicate game wrapper SEO/schema change | Superseded by Phase 2C and Phase 6B |
| #1082 | Regenerate only the first 20 game pages | Superseded by the complete deterministic game rebuild |
| #1049 | VideoObject date and required-field fixes | Superseded by permanent structured-data validation |
| #1023 | Failed Codex placeholder PR | No safe reviewed implementation |
| #1010 | Failed Codex placeholder PR | No safe reviewed implementation |
| #1004 | SEO updates for 20 composer pages | Superseded by the complete Phase 3C composer archive |
| #988 | Failed composer restoration placeholder PR | No safe reviewed implementation |
| #939 | Broad retro-video template and layout refactor | Stale and conflicts with the current Omega baseline |
| #648 | Historical admin input-hardening patch | Current file was substantially redesigned; narrow idea preserved below |

Branches and closed PR history remain available for reference, but none of these stale changes should be reopened or merged directly into the current baseline.

## Preserved future ideas

### Factual publisher profiles

PR #1144 contained potentially useful research and page-enrichment ideas for major publishers such as Ocean Software, Mastertronic, Firebird, US Gold, Codemasters, System 3, Activision, Electronic Arts, Psygnosis, Elite, Gremlin Graphics and MicroProse.

Any future publisher-history work must be rebuilt from current `main`, use the present publisher generator and validators, and avoid reusing the old 201-file generated diff.

### Admin `<select>` keyboard handling

PR #648 raised a narrow concern about treating `<select>` elements as editable targets in admin keyboard protection.

The current `admin/js/input-harden.js` is structurally different from that old patch. The concern may be audited later against current code, but the historical full-file change must not be merged.

## Rules for the next real game

A real game should enter the publishing process only when the following owner-controlled information is ready:

- a dedicated Cheeky Commodore Gamer video, when the page is intended to feature one
- an approved game thumbnail
- a CCG rating or an explicit approved unrated policy
- a reviewed description
- verified platform, year, publisher, developer and credits
- verified manual and download links when intended for publication

Do not create a public game page merely to test the publishing system. Synthetic games already cover that function inside disposable worktrees.

## Recommended next phase

**Phase 7A — Performance and Accessibility Audit**

This should begin as an audit-only branch covering:

- Core Web Vitals risk indicators
- image dimensions and oversized assets
- render-blocking CSS and JavaScript
- font loading
- layout-shift risks
- mobile loading behaviour
- keyboard navigation
- focus visibility
- heading and landmark structure
- form labels
- colour contrast
- missing or weak image alternative text

Phase 7A must not redesign the website, change the Omega identity, alter game thumbnails, touch the intro loader or apply broad automated rewrites. Corrections should be proposed later in small, isolated batches.
