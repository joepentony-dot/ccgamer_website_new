# The Lost Sizzler — Desktop Persistence Inventory

This document defines the local state that a future packaged Lost Sizzler build must preserve across normal application restarts, installer upgrades and portable-build replacement.

It is a packaging contract, not a second save system. The game code remains shared with the website.

## Core rule

A desktop build must have a **stable, version-independent storage identity**. Updating the executable, moving from one packaged version to the next or changing bundled asset revisions must not silently assign a new web-storage origin/profile and make existing progression disappear.

Acceptable packaging strategies are:

1. a fixed application origin/custom protocol with a stable persistent webview profile; or
2. an application-owned user-data directory plus a controlled bridge/migration for the game records below.

Do not store release-critical progression inside the application install directory.

## Tier A — must survive restart and application update

These records are release-critical local progression.

| Record | Storage key | Current owner | Requirement |
| --- | --- | --- | --- |
| Solo save | `ccg-lost-sizzler-solo-save-v2` | `v10-41-r43-solo-save-continue.js` | Must survive close/reopen and application update. |
| Solo save backup | `ccg-lost-sizzler-solo-save-v2-backup` | `v10-41-r43-solo-save-continue.js` | Preserve with the primary; used for recovery if the primary is invalid/missing. |
| Local achievements | `ccg-lost-sizzler-achievements-v1` | `v10-29-achievements.js` | Must survive restart/update. Local state remains authoritative when account sync is unavailable. |
| Permanent C64 collection | `ccg-quest-collection` | `progression.js` | Must survive restart/update; this is the permanent collected-game archive shown by the game. |
| Named-enemy dossier | `ccg-named-enemy-dossier-v1` | `progression.js` | Preserve encounters/defeats across restart/update. |

### Legacy Solo migration source

`progression.js` also retains the earlier checkpoint key:

- `ccg-quest-v10.3-checkpoint`

The r43 save layer can migrate a valid legacy Solo checkpoint into the v2 envelope when no v2 save exists. A desktop migration must therefore not discard this key blindly if importing or upgrading an existing Lost Sizzler profile.

## Tier B — preserve where the corresponding feature is supported

These records are not required to launch or complete offline Solo, but losing them would discard useful user history or online transaction state.

| Record | Storage key/pattern | Current owner | Requirement |
| --- | --- | --- | --- |
| Solo cloud-sync revision metadata | `ccg-lost-sizzler-solo-cloud-sync-v1` | `v10-41-r44-solo-cloud-save.js` | Preserve in `desktop-online`; protects revision/tombstone/account reconciliation. Never treat it as the local save itself. |
| Local Horde Hall of Fame | `ccg-lost-sizzler:horde-leaderboard:v1` | Horde leaderboard/runtime | Preserve if Horde is included; local records should not vanish on executable updates. |
| Weekly result pending submission | `ccg-weekly-pending-result-v1` | `weekly-challenge.js` | Preserve in `desktop-online` so a failed final-score submission can be retried after restart. |
| Legacy/local daily best | `ccg-daily-result-${date}` | `progression.js` | Preserve existing records when migrating a profile. |
| Legacy/local daily attempt marker | `ccg-daily-attempt-${date}` | `progression.js` | Preserve existing records when migrating a profile; do not reset an attempt by changing storage identity. |
| Legacy lightweight achievement flags | `ccg-achievement-${id}` | `progression.js` | Preserve to avoid replaying already-earned legacy awards. |

## Tier C — disposable session cache

These records may be recreated safely and do not need update migration.

| Record | Storage | Current owner | Requirement |
| --- | --- | --- | --- |
| Weekly ghost preview | `sessionStorage: ccg-weekly-ghost-preview` | `weekly-challenge.js` | Session cache only. It may be discarded when the desktop process closes. |

## Authority rules

### Solo saves

`v10-41-r43-solo-save-continue.js` owns local Solo checkpoint creation, validation, backup recovery and Continue. Its current envelope is schema `ccg-lost-sizzler-solo-save`, schema version 2.

`v10-41-r44-solo-cloud-save.js` is a mirror/reconciliation layer only. It explicitly consumes the validated r43 envelope. Desktop packaging must not promote the cloud table or cloud-sync metadata into a second local save authority.

### Achievements

`v10-29-achievements.js` writes earned achievements locally first. Account RPC sync is optional. A signed-out/offline packaged build must retain the same local achievement record without needing Supabase.

### Permanent collection and dossier

`progression.js` banks collected C64 titles into `ccg-quest-collection` and stores named-enemy encounter/defeat history in `ccg-named-enemy-dossier-v1`. Both are persistent player history and belong in the stable desktop profile.

### Weekly state

Weekly leaderboard authority remains server-side. The local `ccg-weekly-pending-result-v1` record is a delivery/retry record, not permission to create another attempt. Preserve it in an online desktop profile so an interrupted submission is not silently discarded.

## Desktop update acceptance test

Before a packaged build can be called update-safe, perform this sequence against two separate application builds:

1. Launch build A with networking disabled before process start.
2. Start a normal Solo run and reach a later-floor checkpoint.
3. Use Save & Quit.
4. Close the application completely.
5. Reopen build A and prove Continue restores the correct floor-entry checkpoint.
6. Earn at least one local achievement, collect at least one C64 title and create/advance a named-enemy dossier entry.
7. Record the visible save summary, achievement state, collection count and dossier state.
8. Install/replace with build B without manually copying browser data.
9. Launch build B offline.
10. Prove the Solo save and backup are still readable and Continue works.
11. Prove achievements, permanent C64 collection and dossier state are unchanged.
12. If Horde is supported, prove the local Hall of Fame survives the update.
13. If `desktop-online` is supported, prove cloud-sync metadata does not overwrite a newer local save and a pending Weekly result survives restart until successfully submitted.
14. Repeat once with an application update after a deliberately retained backup save to verify backup recovery still works.

Any loss of Tier A state is a **release blocker**.

## Native bridge migration requirements

If the desktop wrapper moves release-critical state out of web storage into an application-owned store, migration must be conservative:

- read existing records before writing replacements;
- preserve exact JSON values unless the owning game module performs a schema migration;
- make writes atomic where the wrapper/storage technology permits it;
- keep the r43 primary and backup relationship intact;
- never interpret missing cloud-sync metadata as permission to delete a local Solo save;
- never fabricate Weekly attempt state locally;
- retain a one-release rollback/export path until the new store has passed update tests;
- do not clear the old profile until the new store has been read back and verified.

## Re-audit trigger

Re-run this persistence inventory whenever any of the following changes:

- r43 Solo save schema/key/checksum rules;
- r44 cloud reconciliation/tombstone rules;
- achievement storage schema;
- permanent collection/dossier keys;
- Weekly pending-result schema;
- packaging framework, custom protocol, webview profile directory or installer/update mechanism.

PR #1852 currently remains a separate stabilization programme. Because stabilization can evolve save/continue behaviour, this inventory must be re-checked against the final integrated game before a downloadable build is released, without mixing the two PRs during containment.
