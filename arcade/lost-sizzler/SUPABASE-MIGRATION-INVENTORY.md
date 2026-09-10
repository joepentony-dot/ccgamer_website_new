# The Lost Sizzler — Supabase Migration Inventory

This document tracks the emergency Supabase egress-containment and the longer-term local-first architecture for The Lost Sizzler.

## Safety rules

- Keep PR #1860 isolated from the Solo stabilisation programme.
- Do not delete Supabase files or database rows until verified local copies exist and all runtime references have been switched and tested.
- Do not copy private account, authentication, community, audit or user-generated data into GitHub.
- Solo gameplay must remain functional when Supabase, the website account service or the public internet is unavailable.
- Online features are enhancements layered on top of the local game, not prerequisites for the base game.

## Current containment state

### Remote media

`js/admin-audio-overrides.js` refuses Supabase-hosted remote media by default. Remote media requires an explicit opt-in flag. Bundled local game audio remains the normal path.

### Base game boot

`index.html` no longer loads the Supabase config/client unconditionally.

`js/online-services-gate.js` loads the website Supabase config/client only when the player deliberately requests an online feature:

- Weekly High-Score Vault
- Dungeon Multiplayer
- Horde Multiplayer
- Spy Vs Spy Multiplayer
- Join Online Room
- return from website authentication directly to `#weekly-vault`

Solo, Tutorial, 2P Split Screen, local saves and local achievements therefore do not need a Supabase client during ordinary game boot/play.

### Delivery boundary

`js/online-services-gate.js` now owns the initial shared delivery boundary as well as Supabase activation. Its default remains `web`, so the normal website does not require a second code path.

For a packaged build the wrapper can inject `window.__CCG_LOST_SIZZLER_DELIVERY__` before game initialisation:

- `desktop-online` requires explicitly supplied online-service script locations plus safe `openExternal` and `exitGame` hooks from the desktop shell;
- `desktop-offline` refuses Supabase activation and blocks website navigation rather than allowing the game webview to leave the local game;
- desktop modes intercept account/support/Exit anchors and the title-screen `QUIT` action before ordinary browser navigation can replace the game page;
- desktop builds can provide `resolveLocalAsset("version.json")` or an explicit `versionManifestUrl`; without either, the gate rejects the packaged `version.json` request instead of allowing an arbitrary `file://`-style fetch;
- when online services are unavailable in a desktop delivery, Weekly Vault, room creation/join controls, room-code input and website-auth actions are disabled or hidden while Solo, Tutorial and 2P Split Screen remain available;
- the gate installs a runtime bridge over `RoomNetwork.prototype.getSupabase()` so multiplayer requests are routed through `CCGLostSizzlerOnlineServices.activate()` rather than normally reaching the legacy network fallback.

The old loader code still physically exists in `js/network.js`. The runtime bridge contains it for this branch, but the source fallback should still be removed once the multiplayer file can be changed and regression-tested safely.

## Confirmed dependency map

| Area | Current dependency | Target | Notes |
| --- | --- | --- | --- |
| Core Solo game logic | Local JS | Local | No server dependency required. |
| Core configuration | `js/config.js` | Local | Already local. |
| Core images/audio definitions | Local assets/config | Local | Already local-first. |
| Admin music/voice overrides | `public.arcade_assets` + Storage | Local | Remote lookup disabled by default. Recover useful binaries before deleting anything. |
| Multiplayer transport | Supabase Realtime | Online-only | `js/network.js`; activate only on explicit multiplayer request. |
| Weekly High-Score Vault | Supabase Edge Function `ccq-weekly-challenge` | Online-only | Account-backed competitive mode; keep server-authoritative. |
| Solo checkpoint | Browser local storage | Local-first | Local save remains authoritative for offline play. |
| Solo cloud mirror | `lost_sizzler_solo_saves` | Optional online sync | `v10-41-r44-solo-cloud-save.js`; must never block local play. |
| Achievement state | Browser local storage | Local-first | `v10-29-achievements.js`; account RPC is optional profile sync. |
| Achievement profile sync | RPC `award_lost_sizzler_achievement` | Optional online sync | Leave server-backed. |
| Player telemetry / five-minute rating | Edge Function `lost-sizzler-feedback` | Optional online | No base-game requirement. |
| Developer Vault owner verification | Website account auth | Online/private | Owner-only tooling; leave server-backed. |
| Horde local Hall of Fame | Browser local storage | Local | Already local. |
| Version check | local `version.json` fetch | Local/site file | Web remains relative; desktop now requires an explicit local resolver/URL. |

## Supabase Storage recovery inventory

Database metadata remains readable while Storage binaries are quota-restricted.

### Lost Sizzler music

Bucket: `ccg-arcade-assets`

Storage currently contains 32 `music/lostSizzler...` objects totalling 144,466,274 bytes.

The catalogue contains two 16-file generations. Their per-playlist byte totals match exactly: one generation is enabled and one is disabled.

| Playlist | Enabled files | Enabled bytes | Disabled files | Disabled bytes |
| --- | ---: | ---: | ---: | ---: |
| `lostSizzlerDanger` | 3 | 13,026,408 | 3 | 13,026,408 |
| `lostSizzlerExploration` | 5 | 28,531,057 | 5 | 28,531,057 |
| `lostSizzlerNamed` | 3 | 13,551,717 | 3 | 13,551,717 |
| `lostSizzlerSanctuary` | 2 | 9,193,206 | 2 | 9,193,206 |
| `lostSizzlerStalker` | 3 | 7,930,749 | 3 | 7,930,749 |
| **Total** | **16** | **72,233,137** | **16** | **72,233,137** |

On 3 September the database rows were paired by `asset_meta.playlist_category + asset_meta.original_name`. All 16 enabled rows have exactly one disabled counterpart with the same recorded byte size. This is pairing evidence only; cryptographic equality remains unverified until the binaries can be downloaded and hashed.

The exact 16-pair recovery order, row IDs, Storage paths and empty SHA-256 fields are frozen in `SUPABASE-STORAGE-RECOVERY-MANIFEST.md`.

Recovery priority: download and hash the 16 enabled files first. Then compare the disabled counterparts by cryptographic hash before deciding whether the disabled generation is redundant.

### Other `arcade_assets` graphics

The database also contains the following non-music groups:

- backgrounds — 8 files
- bosses — 5 files
- collectibles — 4 files
- fighter — 4 files
- hazards — 5 files
- invaders — 8 files
- powers — 3 files
- spritesheets — 3 files

Their current paths do not identify them as Lost Sizzler assets, and the audited Lost Sizzler runtime does not currently query these groups through `asset-overrides.js`. Treat them as **unattributed arcade assets** until a code/reference trace identifies their owner. Do not delete or relocate them as part of the Lost Sizzler migration without that proof.

## Packaging and online-service boundaries

The containment audit did not find a Supabase dependency required by ordinary Solo, Tutorial or 2P Split Screen startup. The remaining Supabase integrations are either explicitly requested online features or optional sync/telemetry paths.

Before producing a Windows executable or portable ZIP, keep these boundaries explicit:

- `js/network.js` still physically contains a legacy multiplayer-only fallback that can load the website Supabase scripts itself. PR #1860 now installs a runtime bridge over `RoomNetwork.prototype.getSupabase()` so normal multiplayer requests are routed through `window.CCGLostSizzlerOnlineServices.activate()`. Remove the dead/legacy loader from `network.js` later when that larger file can be changed and tested without increasing containment risk.
- `js/online-services-gate.js` uses website-root `/js/ccg-supabase-config.js` and `/js/ccg-supabase-client.js` paths only in `web` mode. Desktop builds do not inherit those paths automatically: `desktop-online` must receive explicit service script locations from the wrapper, while `desktop-offline` refuses online activation.
- Desktop website/account/support navigation is intercepted by the gate. `desktop-online` requires a wrapper-supplied system-browser handler; `desktop-offline` blocks those links. Title-screen Exit/QUIT requires a wrapper-supplied application exit action.
- Desktop `version.json` resolution is delivery-aware. The wrapper must provide `resolveLocalAsset()` or `versionManifestUrl`; otherwise the check fails safely rather than relying on package-origin fetch behaviour.
- Desktop deliveries with no configured online services disable the online UI instead of presenting controls that can never succeed.
- Solo cloud saves and achievement profile sync must remain no-op/best-effort when no online client exists. Local save and local achievement state remain authoritative.
- Weekly Vault, multiplayer, account login, profile achievement sync and cloud mirroring remain online enhancements; none may become a prerequisite for launching or completing the local game.
- A packaged-build smoke test must be run with networking disabled from process launch, not merely after the title screen appears.

## Desktop packaging readiness audit

The current browser build is already well suited to sharing its core files with a desktop package: the game stylesheet, scripts, favicon, logo and normal Lost Sizzler assets are referenced with paths relative to the Lost Sizzler directory. The remaining blockers are delivery-shell and online-service assumptions rather than a need to fork the game engine.

| Area | Current browser behaviour | Desktop requirement | Priority |
| --- | --- | --- | --- |
| Local game files | CSS/JS/assets use relative Lost Sizzler paths | Bundle unchanged where practical | Ready |
| Website account links | `/auth/register.html` and `/auth/login.html` root-relative links | Delivery gate opens them only through a wrapper-supplied system-browser hook in `desktop-online`; blocks them in `desktop-offline` | Implemented in game; wrapper hook required |
| Exit links | `/games/ccg-games/` assumes website root | Delivery gate routes desktop Exit/QUIT through the wrapper instead of navigating the game webview | Implemented in game; wrapper hook required |
| Supabase service loader | Website mode uses `/js/ccg-supabase-config.js` and `/js/ccg-supabase-client.js` | `desktop-online` must supply explicit service script locations; `desktop-offline` refuses activation | Implemented in game; desktop config required |
| Multiplayer fallback loader | `js/network.js` still contains legacy loader source | Runtime bridge now routes `getSupabase()` through `CCGLostSizzlerOnlineServices.activate()`; remove legacy source after safe multiplayer regression testing | Contained; source cleanup later |
| Weekly Vault / multiplayer UI | Website exposes online controls normally | Desktop delivery disables/hides online controls and auth actions when services are unavailable | Implemented in game |
| Solo cloud mirror | Local-first; observes browser save state and only syncs if Supabase exists | Preserve no-op behaviour offline; activate cloud service only after explicit online/account availability | Ready with persistence requirement |
| Save/achievement persistence | Browser `localStorage` is authoritative for several local systems | Desktop runtime must use a stable application origin/profile across upgrades, or provide a controlled native persistence bridge/migration | Release blocker |
| Weekly transient/pending state | Uses `sessionStorage`/`localStorage` | Preserve stable storage semantics if Weekly Vault is enabled in desktop build | Before online desktop features |
| Version check | `fetch('version.json?...')` with cache bypass | Delivery gate rewrites the request through a wrapper-supplied local resolver/URL; no resolver means safe failure | Implemented in game; wrapper resolver required |
| Browser deep links | Query/hash state such as `?mode=tutorial` and `#weekly-vault` is supported | Desktop launcher/protocol should preserve supported launch state if exposed | Later/optional |
| External navigation | Browser can follow ordinary anchors naturally | Desktop gate prevents ordinary anchors/title QUIT from replacing the game page; wrapper must provide approved external/exit handlers | Implemented in game; wrapper hook required |
| Network-offline launch | Browser naturally remains on the local page if assets are bundled | Desktop build must boot and complete Solo with all network access denied from process start | Release blocker |

### Desktop persistence rule

Do not ship a desktop build that merely relies on whatever origin a wrapper happens to assign on each install. The Lost Sizzler currently stores important local state in browser storage, including Solo save metadata, achievements, collected-game progress and other local records. The desktop runtime must therefore provide a stable, version-independent storage identity.

Acceptable approaches include:

1. host the packaged game under a fixed application origin/custom protocol whose storage partition remains stable across updates; or
2. bridge critical saves/progression to an application-owned user-data directory and migrate existing web-storage records in a controlled way.

Whichever packaging technology is chosen, installer upgrades and portable-build updates must be tested to prove that an existing Solo checkpoint, achievement set and permanent collection survive the update.

### Delivery-aware navigation rule

The web and desktop builds should share the same game code while the delivery layer decides what website-oriented controls do. Do not hard-code a second set of game screens for the executable.

Recommended delivery modes:

- `web` — existing website navigation/account behaviour;
- `desktop-online` — local game plus explicitly enabled website account, Weekly Vault, cloud sync and multiplayer services;
- `desktop-offline` — complete local game with online controls hidden, disabled or labelled as requiring a connection.

The delivery mode should be established before game UI initialisation and exposed through one small adapter/config object. Game systems should query that adapter instead of detecting Electron/Tauri/browser brands throughout gameplay code.

### Packaging regression gates

A downloadable build is not release-ready until all of the following pass:

- launch with the network adapter disabled before process start;
- start and complete a fresh Solo run without any remote dependency;
- Save & Quit, close the executable, reopen it and Continue successfully;
- update/replace the packaged application and verify the save still exists;
- verify local achievements and permanent C64 collection survive restart and update;
- launch Tutorial and 2P Split Screen offline;
- exercise all bundled music transitions and voice/SFX paths offline;
- confirm no broken account/login/Exit navigation can replace the game page inside the desktop window;
- when online services are enabled, confirm sign-in, Weekly Vault, cloud save and each multiplayer mode independently;
- disable connectivity during an online feature and verify the base game/menu remains recoverable without corrupting local state.

## 5 September Storage recovery procedure

1. Confirm Storage object downloads are working again before changing runtime references.
2. Re-read the current Lost Sizzler `arcade_assets` rows and compare them with `SUPABASE-STORAGE-RECOVERY-MANIFEST.md`. Stop if paths, enablement or byte sizes have changed unexpectedly.
3. Download the 16 enabled Lost Sizzler music objects first in manifest order.
4. Record for every recovered object:
   - Supabase bucket
   - original object path
   - expected and downloaded byte size
   - SHA-256 hash
   - decode/playback result
   - intended local destination once reference tracing identifies it
5. Verify each local file opens/decodes successfully.
6. Compare the 16 disabled music objects against the enabled generation by SHA-256 before downloading/retaining duplicates unnecessarily. Equal database byte size alone is not sufficient.
7. Search the repository for every recovered Supabase URL/object path and replace only references confirmed to belong to Lost Sizzler.
8. Run Solo regression checks with network access blocked:
   - fresh Solo run
   - Resume Saved Run
   - Tutorial
   - 2P Split Screen
   - music transitions
   - named-enemy music
   - sanctuary music
   - Count Loadula/Death Stalker music
   - achievements
   - Save & Quit / Continue
9. Run online regression checks separately:
   - website account hydration
   - Weekly Vault status/claim/finish
   - Dungeon Multiplayer create/join
   - Horde create/join
   - Spy Vs Spy create/join
   - optional cloud-save sync
10. Only after local files and all references have been verified should redundant Supabase Storage objects be considered for removal.

## Downloadable build target

The intended architecture is shared game code with two delivery surfaces:

- website: `/arcade/lost-sizzler/`
- packaged Windows build / portable ZIP

The packaged build should contain the complete Solo game, graphics, music, sound effects, configuration, progression and local saves. Network services should be optional modules for account login, cloud sync, weekly competition and multiplayer.

The architectural rule is: **offline game first; online enhancements second.**
