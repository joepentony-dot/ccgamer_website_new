# Phase 3A Developer and Composer Archive Review

This is a read-only repository audit. It does not alter public pages, game data, navigation, CSS, sitemaps or generators.

## Executive summary

| Check | Count |
|---|---:|
| Game records | **651** |
| Games with developer credit | **63** |
| Unique developer entities | **35** |
| Existing developer archive pages | **0** |
| Indexable developer archive pages | **0** |
| Games with composer credit | **498** |
| Unique composer entities | **269** |
| Dedicated composer pages | **20** |
| Credited composers with dedicated page | **19** |
| Credited composers using dynamic fallback only | **250** |
| Static composer links in composer hub HTML | **1** |

## Developer archive finding

No developer hub or dedicated developer archive pages were detected, despite explicit developer credits in the game database.

### Most represented developer credits

- Mastertronic: **8** games
- Broderbund: **6** games
- Lucasfilm Games: **6** games
- Sensible Software: **4** games
- Delphine Software: **3** games
- Inforgrames: **3** games
- Capcom: **2** games
- Konami: **2** games
- Ocean: **2** games
- Reaktor Software: **2** games
- US Gold: **2** games
- Argus Press Software: **1** games
- Ariolasoft: **1** games
- Binary Asylum: **1** games
- Datasoft: **1** games

## Composer archive finding

The composer hub exists and the fallback composer shell is present. The fallback shell is noindex. Only **19** credited composers currently have dedicated static pages; **250** credited composer entities rely on the JavaScript query-string fallback.

### Most represented composer credits

- Rob Hubbard: **32** games
- David Whittaker: **22** games
- Richard Joseph: **17** games
- Ben Daglish: **16** games
- Martin Galway: **16** games
- Fred Gray: **13** games
- Allister Brimble: **12** games
- Jonathan Dunn: **11** games
- Jeroen Tel: **9** games
- Mark Cooksey: **9** games
- Barry Leitch: **8** games
- Russell Lieblich: **8** games
- Neil Brennan: **7** games
- Chris Hülsbeck: **6** games
- Dave Thomas: **6** games

## Discoverability

- Static composer-profile links in the composer hub HTML: **1**
- Repository links to the composer hub: **1**
- Repository links to dedicated composer routes: **0**
- Repository links to developer archive routes: **0**

## Recommended implementation split

1. **Phase 3B — Developer archive foundation:** create a crawlable developer hub and static developer pages from explicit existing credits, with normalization reviewed before route creation.
2. **Phase 3C — Composer archive expansion:** replace query-string-only discovery with static canonical composer routes for credited names, preserving the existing featured pages and player behaviour.
3. **Phase 3D — People archive validation:** add permanent checks for route coverage, canonical uniqueness, sitemap membership and links from the relevant hubs.

## Explicit exclusions

- No public HTML was changed.
- `games/games.json` was not changed.
- No names, aliases, biographies or credits were invented.
- The homepage and intro-loader stack were not changed.

## Rollback

Revert the Phase 3A squash merge commit. The PR adds only audit tooling, workflow and a concise report.
