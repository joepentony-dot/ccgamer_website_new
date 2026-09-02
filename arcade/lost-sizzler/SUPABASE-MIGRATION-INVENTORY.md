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
| Version check | local `version.json` fetch | Local/site file | No Supabase dependency. |

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

Recovery priority: download and hash the 16 enabled files first. Then compare the disabled counterparts by size and cryptographic hash before deciding whether the disabled generation is redundant.

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

## 5 September Storage recovery procedure

1. Confirm Storage object downloads are working again before changing runtime references.
2. Export the current `arcade_assets` metadata used by Lost Sizzler.
3. Download the 16 enabled Lost Sizzler music objects first.
4. Record for every recovered object:
   - Supabase bucket
   - original object path
   - byte size
   - SHA-256 hash
   - intended local destination
5. Verify each local file opens/decodes successfully.
6. Compare the 16 disabled music objects against the enabled generation by size and SHA-256 before downloading/retaining duplicates unnecessarily.
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
