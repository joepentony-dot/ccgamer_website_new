import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

const integrity=read("js/v10-40-integrity-consolidation.js");
const version=read("js/version-check.js");
const weekly=read("js/weekly-challenge.js");
const audio=read("js/lost-sizzler-playlist-audio.js");
const main=read("js/game-main.js");
const changelog=read("js/v10-12-developer-changelog.js");

assert.match(version,/const RUNTIME_BUILD="V10\.40"/,"version checker must preserve the V10.40 runtime milestone");
assert.match(version,/v10-40-horde-final\.js[\s\S]*v10-40-integrity-consolidation\.js/,"integrity consolidation must load after the V10.40 Horde finaliser");
assert.match(version,/badge\.textContent=`BUILD \$\{RUNTIME_BUILD\}`/,"version checks must restore the runtime badge rather than replacing it with the date build");

assert.match(integrity,/function validateCriticalRoute\(/,"V10.40 must include a general critical-route watchdog");
assert.match(integrity,/function secureDeathCaches\(/,"V10.40 must relocate unreachable or hazardous death caches");
assert.match(integrity,/function securePlayerPosition\(/,"V10.40 must validate respawn and teleport positions");
assert.match(integrity,/useTeleportV140Integrity/,"teleports must pass through the safe-position integrity layer");
assert.match(integrity,/firePlayerV140Integrity/,"firing must end the temporary respawn\/teleport protection window");
assert.match(integrity,/playMode==="online"\)return/,"focus-loss auto-pause must never pause an online multiplayer session");
assert.match(integrity,/v140_migration_probe/,"normal Dungeon host migration must probe remaining clients for a fresh snapshot");
assert.match(integrity,/v140_migration_snapshot/,"normal Dungeon host migration must reconcile peer snapshots");
assert.match(integrity,/Number\(best\.revision\|\|0\)>currentRevision/,"migration must only replace the new host state with a newer revision");
assert.match(integrity,/const hostClaims=new Set\(\)/,"host-side collectible requests must have a duplicate-claim guard");
assert.match(integrity,/onCollectRequestV140Integrity/,"the authoritative collectible handler must be protected");
assert.doesNotMatch(integrity,/clientCollections/,"V10.40 must not globally dedupe client collection IDs because reserve ammo can reuse one item ID");
assert.match(integrity,/const CHECKPOINT_SCHEMA=2/,"checkpoint hardening must publish an explicit schema");
assert.match(integrity,/validateCheckpointV140/,"checkpoint validation must be installed on the active progression API");
assert.match(integrity,/!document\.body\?\.dataset\?\.specialMode&&!run\?\.specialMode/,"generic run-integrity recovery must remain isolated from Horde and Spy Vs Spy");
assert.match(integrity,/presenceMemberV140/,"online presence must advertise the current runtime build");
assert.match(integrity,/event==="hello"\|\|event==="v106_lobby_start"/,"legacy multiplayer metadata must be normalised to V10.40 at send time");

assert.match(weekly,/PENDING_RESULT="ccg-weekly-pending-result-v1"/,"the newer durable Weekly Vault result retry must remain in control");
assert.match(weekly,/submitPending\(\)\.catch/,"pending Weekly Vault results must continue retrying after focus\/refresh");
assert.match(audio,/const failures=new Map\(\)/,"the newer uploaded-music failure quarantine must remain in control");
assert.match(audio,/function startFallback\(\)/,"bundled music fallback must remain available when uploaded tracks fail");
assert.match(audio,/RETRY_MAX_MS=60000/,"uploaded-music retry must remain bounded");
assert.match(main,/const pixelBudget=\(\)=>/,"the newer adaptive canvas budget must remain in control");
assert.match(main,/return 5000000/,"desktop canvas allocation must retain the adaptive high-memory ceiling rather than regressing to the old fixed cap");
assert.match(changelog,/LS-0824-22/,"the developer changelog must record the V10.40 integrity consolidation");

console.log("Lost Sizzler V10.40 consolidated run-integrity and retained-current-system checks passed.");
