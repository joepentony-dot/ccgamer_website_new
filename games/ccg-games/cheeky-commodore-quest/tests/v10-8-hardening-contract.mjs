import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const read=file=>fs.readFileSync(path.resolve(here,'..',file),'utf8');
const hard=read('js/v10-8-run-hardening.js');
const weekly=read('js/weekly-challenge.js');
const audio=read('js/lost-sizzler-playlist-audio.js');
const hud=read('js/v10-6-inventory-hud-fix.js');
const assets=read('js/asset-overrides.js');

// 1 — ranked score durability and idempotent retry client.
assert.match(weekly,/ccg-weekly-pending-result-v1/);
assert.match(weekly,/retryPending/);
assert.match(weekly,/window\.addEventListener\("online"/);
assert.match(weekly,/submissionId/);
assert.doesNotMatch(weekly,/disabled=!state\.ready\|\|\(state\.signedIn&&state\.locked\)/,'used ranked attempt no longer disables unranked weekly play');

// 2/3 — route watchdog and safe death-cache relocation.
assert.match(hard,/validateCriticalRoute/);
assert.match(hard,/bridgeDoorFor/);
assert.match(hard,/secureDeathCaches/);
assert.match(hard,/nearestSafe/);

// 4/5 — focus pause and spawn grace.
assert.match(hard,/window\.addEventListener\("blur",pauseForFocusLoss\)/);
assert.match(hard,/playMode==="online"/);
assert.match(hard,/p\.invuln=Math\.max\(Number\(p\.invuln\)\|\|0,1500\)/);

// 6/7 — multiplayer state/collect integrity.
assert.match(hard,/migration_probe/);
assert.match(hard,/migration_snapshot/);
assert.match(hard,/candidates\.filter/);
assert.match(hard,/hostClaims=new Set/);
assert.match(hard,/clientCollections=new Set/);

// 8 — Weekly Dungeon presentation has one authoritative path; old observer layer is no longer loaded.
assert.doesNotMatch(assets,/v10-6-menu-runtime-fix\.js/);
assert.match(hard,/Guests play unranked/);

// 9 — HUD follows sync/events, not a permanent 250ms polling loop.
assert.match(hud,/const oldSync=typeof sync/);
assert.match(hud,/ccg:inventory-refresh/);
assert.doesNotMatch(hud,/setInterval\(/);

// 10 — retired reward choice is physically removed at runtime and intermediate extraction remains owned by the final balance layer.
assert.match(hard,/artefactChoice\?\.remove/);

// 11 — checkpoint schema guard.
assert.match(hard,/CHECKPOINT_SCHEMA=2/);
assert.match(hard,/validateCheckpointV108/);
assert.match(hard,/localStorage\.removeItem\(CHECKPOINT_KEY\)/);

// 12 — low-health warning reads the same inventory API as the HUD.
assert.match(hard,/inventoryKindCount\(p1,"potion"\)/);
assert.match(hard,/press E or its Quick Inventory number/);

// 13 — uploaded audio failures are quarantined and bundled tracks remain a fallback.
assert.match(audio,/failedUrls=new Set/);
assert.match(audio,/custom\.length\?custom:g\.bundled/);
assert.match(audio,/failedUrls\.add/);
assert.match(audio,/clearFailed/);

// Hardening layer loads after the established gameplay/balance layers.
const hardIndex=assets.indexOf('v10-8-run-hardening.js');
const balanceIndex=assets.indexOf('v10-6-stalker-shop-balance.js');
assert.ok(hardIndex>balanceIndex&&balanceIndex>=0,'run hardening loads after established balance/runtime layers');

console.log('Lost Sizzler V10.8 hardening contract checks passed.');
