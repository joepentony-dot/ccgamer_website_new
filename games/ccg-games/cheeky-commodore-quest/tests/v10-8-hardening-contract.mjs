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
const ui=read('js/v10-6-ui-polish.js');
const notices=read('js/v10-8-notification-rail.js');
const noticeCss=read('css/v10-8-notification-rail.css');
const assets=read('js/asset-overrides.js');

// 1 — ranked score durability and idempotent retry client.
assert.match(weekly,/ccg-weekly-pending-result-v1/);
assert.match(weekly,/retryPending/);
assert.match(weekly,/window\.addEventListener\("online"/);
assert.match(weekly,/submissionId/);
assert.doesNotMatch(weekly,/disabled=!state\.ready\|\|\(state\.signedIn&&state\.locked\)/,'used ranked attempt no longer disables unranked weekly play');

// 2/3 — route watchdog and safe/reachable death-cache relocation.
assert.match(hard,/validateCriticalRoute/);
assert.match(hard,/bridgeDoorFor/);
assert.match(hard,/activeChallengeLock/,'watchdog protects legitimate active arena/Sigil locks');
assert.match(hard,/secureDeathCaches/);
assert.match(hard,/nearestReachableSafe/);

// 4/5 — focus pause and spawn grace that ends early when the player fires.
assert.match(hard,/window\.addEventListener\("blur",pauseForFocusLoss\)/);
assert.match(hard,/playMode==="online"/);
assert.match(hard,/p\.invuln=Math\.max\(Number\(p\.invuln\)\|\|0,1500\)/);
assert.match(hard,/_v108RespawnGraceUntil/);
assert.match(hard,/firePlayer=function/);

// 6/7 — multiplayer state/collect integrity.
assert.match(hard,/migration_probe/);
assert.match(hard,/migration_snapshot/);
assert.match(hard,/sort\(\(a,b\)=>b\.revision-a\.revision\)/);
assert.match(hard,/hostClaims=new Set/);
assert.match(hard,/clientCollections=new Set/);
assert.match(hard,/hostClaims\.delete\(id\)/,'rejected pickups release their claim for a later retry');

// 8 — Weekly Dungeon has one authoritative click path; old observer layer is not loaded.
assert.doesNotMatch(assets,/v10-6-menu-runtime-fix\.js/);
assert.match(hard,/startWeeklyUnified/);
assert.match(hard,/addEventListener\("click",startWeeklyUnified,true\)/);
assert.doesNotMatch(ui,/startGuestWeekly/,'UI polish no longer competes for Weekly Dungeon clicks');

// 9 — HUD follows sync/events and signatures, not permanent DOM polling.
assert.match(hud,/lastSignature/);
assert.match(hud,/ccg:inventory-refresh/);
assert.doesNotMatch(hud,/setInterval\(/);
assert.doesNotMatch(ui,/renderCarriedItems/,'UI polish no longer performs a second carried-items render');

// 10 — retired reward choice is removed while final-floor Finish Run remains owned by the balance layer.
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

// 14 + notification restoration — right-side overlay, all room intros and multi-resolution crash guard.
assert.match(notices,/tactical-notification-layer/);
assert.match(notices,/displayToast=function/);
assert.match(notices,/originalSay/,'important room reports can be promoted to the notification rail');
assert.match(notices,/currentRoomHeading/,'room-theme announcements are identified from the active room');
assert.match(notices,/plain\.toUpperCase\(\)\.startsWith\(roomHeading\)/,'every actual room introduction is promoted even when its name lacks generic room keywords');
assert.match(noticeCss,/temporarily cover the inventory/i);
assert.match(noticeCss,/\.pickup-toast\.green/);
assert.match(noticeCss,/\.pickup-toast\.cyan/);
assert.match(noticeCss,/\.pickup-toast\.red/);
assert.match(hard,/MAX_CANVAS_PIXELS=1920\*1080/,'4K/5K canvas backing allocation is capped');
assert.match(assets,/v10-8-notification-rail\.js/);
assert.match(assets,/v10-8-notification-rail\.css/);
assert.match(assets,/__CCG_LATE_PATCH_QUEUE_STARTED__/,'late patch stack has a duplicate-load guard');

const hardIndex=assets.indexOf('v10-8-run-hardening.js');
const balanceIndex=assets.indexOf('v10-6-stalker-shop-balance.js');
const noticeIndex=assets.indexOf('v10-8-notification-rail.js');
assert.ok(hardIndex>balanceIndex&&noticeIndex>hardIndex,'hardening loads after balance and notifications load last');

console.log('Lost Sizzler V10.8 hardening and notification contract checks passed.');
