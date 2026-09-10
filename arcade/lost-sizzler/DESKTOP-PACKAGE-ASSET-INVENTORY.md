# The Lost Sizzler — Desktop Package Asset Inventory

This document defines what a future downloadable Lost Sizzler build must package locally, what may remain optional/online, and what must **not** be pulled into the executable merely because website metadata references it.

It complements:

- `DESKTOP-DELIVERY-CONTRACT.md`
- `DESKTOP-PERSISTENCE-INVENTORY.md`
- `SUPABASE-STORAGE-RECOVERY-MANIFEST.md`

The final packaging framework has not been chosen. This inventory therefore describes content requirements rather than Electron/Tauri/WebView2-specific paths.

## Core rule

A packaged build must contain enough local content to complete normal offline play without depending on the CCG website, Supabase Storage or any external media host.

**Do not solve a missing desktop asset by silently fetching the website copy at runtime.**

If a non-essential content file is unavailable, the game may use an explicitly documented local fallback. Release-critical runtime files must not depend on such a fallback.

## Tier A — required local game runtime

The first desktop package should treat the published Lost Sizzler runtime as one coherent release unit rather than trying to cherry-pick individual scripts.

Package the runtime content represented by:

- `arcade/lost-sizzler/index.html`
- `arcade/lost-sizzler/version.json`
- `arcade/lost-sizzler/css/`
- `arcade/lost-sizzler/js/`
- `arcade/lost-sizzler/assets/`

The wrapper may transform URLs or move these files during packaging, but their runtime relationships must remain intact.

### Why package the complete runtime directories initially

Lost Sizzler has a long ordered enhancement stack. Later modules patch and extend earlier modules, and a number of assets are loaded dynamically rather than through a single static import graph.

Until an automated package-manifest generator proves an exact minimal dependency set, omitting apparently unused files is a higher release risk than carrying a modest amount of extra local game content.

A future optimisation may reduce the package only after a generated dependency manifest and complete offline Chromium/native-wrapper regression demonstrate equivalence.

## Tier A — recovered Lost Sizzler audio

The packaged game must use verified local Lost Sizzler audio rather than Supabase-hosted music.

Current containment already makes remote media explicit opt-in only. The 5 September recovery procedure in `SUPABASE-STORAGE-RECOVERY-MANIFEST.md` must be completed before recovered Storage objects are treated as verified package sources.

Requirements before packaging recovered Storage music:

1. download the enabled object;
2. verify actual byte size;
3. record SHA-256;
4. decode/play the file successfully;
5. map it to its intended local game destination;
6. replace any confirmed Lost Sizzler remote reference with the verified local asset;
7. run all music-state regressions offline.

Do not package an object merely because its disabled counterpart has the same recorded byte size.

## Tier B — full collectible catalogue

`v10-4-patch.js` currently loads:

```text
/games/games.json
```

The loader uses the master website catalogue to populate the wider C64 collectible pool. If that fetch fails, Lost Sizzler already falls back to its built-in collectible pool, so failure does not prevent launch or completion.

For a downloadable build, however, silently degrading to the smaller fallback pool would reduce game content. The release package should therefore provide the catalogue locally.

### Preferred packaging rule

The wrapper/package build must provide one of these:

1. the current `games/games.json` at a stable packaged URL compatible with the game loader; or
2. a generated Lost Sizzler catalogue containing only the fields and C64 records actually required by collectible selection.

A generated derivative is preferable long-term because the website master file also contains data irrelevant to Lost Sizzler, including Amiga entries and references to thumbnails, PDFs, videos and other website resources.

### Do not recursively package website media

Packaging `games/games.json` does **not** mean the executable must include every asset or external URL referenced by that metadata.

Normal Lost Sizzler collectible selection needs the catalogue data, not the website's entire:

- thumbnail archive;
- PDF/manual collection;
- YouTube/video catalogue;
- Google Drive links;
- general website page tree.

If future Lost Sizzler gameplay begins rendering any of those resources directly, re-audit this inventory at that time.

### Generated catalogue acceptance

If a C64-only derivative is introduced, prove that it preserves all fields consumed by Lost Sizzler and that its eligible-title set matches the intended website catalogue for the same release.

Do not hand-maintain a second game list. Generate it deterministically from the authoritative website catalogue during the release/package process.

## Optional desktop-online resources

These are not required for offline Solo/Tutorial/2P play.

### Supabase client bootstrap

`desktop-online` may use either:

- a wrapper-injected `window.ccgSupabase` browser-safe client bridge; or
- packaged/local `onlineScripts.config` and `onlineScripts.client` URLs supplied through the delivery contract.

Do not make the packaged game fetch website-root `/js/ccg-supabase-*.js` files by default.

Never package a Supabase service-role key or other server-only secret.

### Account and website pages

Do **not** bundle website account pages into the game just to satisfy links such as sign-in/register.

In `desktop-online`, account/support links belong in the system browser through the wrapper's allowlisted `openExternal()` capability.

In `desktop-offline`, they remain unavailable.

### Weekly Vault / cloud save / account achievements

These features may require network services at runtime, but their JavaScript game integration remains part of the shared Lost Sizzler runtime package. Their network availability is optional and must not determine whether local gameplay starts.

## Website-only resources that are not package dependencies

Unless future gameplay starts consuming them directly, do not treat the following as required desktop assets:

- CCG website HTML outside the Lost Sizzler runtime;
- `/auth/` pages;
- Patreon pages;
- YouTube pages/videos;
- PayPal pages;
- Google Drive PDFs;
- general game-detail pages;
- website thumbnails referenced only by catalogue metadata;
- SEO/social/structured-data site infrastructure.

These remain website/browser destinations or metadata references, not executable content.

## Cache and service-worker position

The Lost Sizzler cache guard already treats Cache API and service-worker access as optional/best-effort.

A desktop wrapper must not depend on a website service worker to make the game launch. If the selected framework uses its own asset protocol/cache, the game must still pass startup and update tests with browser service workers unavailable.

Do not package root website service-worker infrastructure solely to satisfy the Lost Sizzler cache guard unless a later wrapper test demonstrates a real requirement.

## Package URL stability

The package must give runtime assets stable resolvable URLs under the chosen wrapper model.

Release updates may change asset revisions, but they must not accidentally change the persistent storage identity described in `DESKTOP-PERSISTENCE-INVENTORY.md`.

Asset URL versioning and save/profile origin identity are separate concerns.

## Offline package acceptance test

A packaged release candidate must be tested with networking disabled before process start.

At minimum prove:

1. `index.html` loads from the packaged origin/scheme.
2. `version.json` resolves locally.
3. every required CSS and JavaScript module loads locally.
4. no Supabase bootstrap/API request is made in `desktop-offline`.
5. no Lost Sizzler music is requested from Supabase Storage or another remote media host.
6. Solo starts and remains playable.
7. Tutorial starts and remains playable.
8. 2P Split Screen starts and remains playable.
9. all required music transitions play from local files.
10. Save & Quit and Continue work after process restart.
11. the full intended C64 collectible catalogue is available locally rather than silently falling back to the reduced built-in pool.
12. local achievements, permanent collection and dossier state remain available.
13. ordinary Share exposes only the public CCG URL, never a packaged URL.
14. account/support/Exit actions cannot navigate the renderer away from the game.

A missing Tier A runtime/audio asset or silent loss of the intended collectible catalogue is a **desktop release blocker**.

## Package update acceptance

Run the two-build A/B persistence sequence from `DESKTOP-PERSISTENCE-INVENTORY.md` with the packaged asset set as well.

In addition to persistence, confirm build B does not:

- lose a runtime module because packaging rules changed;
- revert to remote Supabase-hosted music;
- lose the packaged collectible catalogue;
- expose an internal asset/page URL through Share, feedback or telemetry;
- require the old build's install directory to remain present.

## Build-time manifest recommendation

When the Windows packaging technology is selected, add a generated package manifest containing at least:

- relative packaged path;
- byte size;
- SHA-256;
- release/build identifier;
- classification (`runtime`, `audio`, `catalogue`, `online-optional`);
- source repository path.

The release test should verify the packaged files against this manifest before launch testing.

This manifest is separate from the Supabase Storage recovery manifest: one proves what was recovered from Storage; the other proves what was shipped in a particular desktop build.

## Re-audit triggers

Re-run this asset inventory whenever any of the following changes:

- Lost Sizzler adds a new root-relative fetch;
- collectible catalogue fields or source path change;
- a website thumbnail/PDF/video becomes a gameplay asset;
- local audio destinations change;
- the wrapper asset protocol/origin changes;
- a package optimiser begins pruning runtime files;
- version-manifest loading changes;
- the final PR #1852 + PR #1860 integration changes runtime load order or asset ownership.
