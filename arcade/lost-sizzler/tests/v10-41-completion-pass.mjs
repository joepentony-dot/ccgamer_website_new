import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const main=read("js/game-main.js");
const config=read("js/config.js");
const deathCache=read("js/v10-4-death-cache.js");
const progressionRecovery=read("js/v10-41-progression-recovery.js");
const sanctuary=read("js/v10-41-sanctuary-azalea.js");
const hordePolish=read("js/v10-41-horde-combat-polish.js");
const hordeCompletion=read("js/v10-41-horde-completion.js");
const map=read("js/v10-41-solo-full-map.js");
const loader=read("js/version-check.js");
const index=read("index.html");

assert.match(main,/UI\.sound\.addEventListener\("click",toggleSound\)/,"sound/music must remain available from the top-corner button");
assert.doesNotMatch(main,/KeyM[^\n]*toggleSound|toggleSound[^\n]*KeyM/,"M must never toggle sound in the core keyboard handler");
assert.match(index,/M MAP/,"published keyboard help must identify M as the map key");
assert.doesNotMatch(index,/M SOUND/,"published keyboard help must not advertise M sound");

assert.match(map,/document\.fullscreenElement/,"full map must mount inside the active fullscreen element");
assert.match(map,/function clearMovementState/,"opening/closing the map must clear held movement state");
assert.match(map,/mode="paused"/,"Solo full map must freeze the run while visible");
assert.match(map,/progressionRecoveryMarkers/,"full map must draw returned progression-item markers");
assert.match(map,/drawMarker\(context,p1,"#6cecff"/,"full map must draw the player marker");

assert.match(config,/name:"AZALEA"/,"AZALEA must replace Parsnip Celery in the active named-enemy roster");
assert.doesNotMatch(config,/name:"Parsnip Celery"/,"Parsnip Celery must no longer exist in the active named-enemy roster");
assert.match(sanctuary,/function drawAzalea/,"AZALEA must have a dedicated pixel-art renderer");
assert.match(sanctuary,/name!=="AZALEA"/,"AZALEA renderer must be isolated to that named enemy");

assert.match(sanctuary,/host\.sanctuaryScenes=scenes/,"sanctuary scenic variants must be stored on the live host state");
assert.match(sanctuary,/reserveLane\(reserved,doorway,centre,1\)/,"every sanctuary exit must retain a protected traversal lane");
assert.match(sanctuary,/sanctuaryRegeneration/,"sanctuary scene placement must protect regeneration tiles");
assert.match(sanctuary,/type:"sanctuaryLake"/,"lake water must have dedicated collision ownership");
assert.match(sanctuary,/fishX=/,"sanctuary lakes must contain animated fish");
assert.match(sanctuary,/drawSunlight/,"sanctuary scenes must include overhead sunlight");
assert.match(sanctuary,/function drawTree/,"sanctuary scenes must include trees");
assert.match(sanctuary,/function drawDancer/,"sanctuary scenes must include non-interactive pixel pin-up dancers");
assert.match(sanctuary,/"Hello big boy"/,"touching sanctuary dancers must trigger the requested greeting");
assert.match(sanctuary,/function drawRadarOverlay/,"tactical radar must receive map-marker polish");
assert.match(sanctuary,/progressionRecoveryMarkers/,"tactical radar must draw returned progression items");
assert.match(sanctuary,/fillStyle="#6cecff"/,"tactical radar must draw a player marker");

assert.match(deathCache,/progressionKinds=new Set\(\["key","mainKey","bronze","bronzeKey","exitSigil","sigil"\]\)/,"essential keys and sigils must be protected from old-cache deletion");
assert.match(deathCache,/function restoreProgressionItems/,"old cache replacement must restore progression items instead of deleting them");
assert.match(deathCache,/item\?\.originX,item\?\.originY/,"restoration must prefer an item's original floor position");
assert.match(deathCache,/progressionRecoveryMarkers/,"restored essentials must create map markers");
assert.match(deathCache,/non-essential contents/,"only non-essential old-cache contents may be discarded on a later death");
assert.match(progressionRecovery,/KINDS=new Set\(\["key","mainKey","bronze","bronzeKey","exitSigil","sigil"\]\)/,"fresh V10.41 layer must independently protect progression kinds");
assert.match(progressionRecovery,/function restoreFromSnapshots/,"fresh V10.41 layer must recover essentials even if an older cached death-cache module is present");
assert.match(progressionRecovery,/progressionRecoveryMarkers/,"fresh recovery layer must publish tactical/full-map markers");

assert.match(hordePolish,/WAVE_RECOVERY_HP=5/,"Horde survivors must recover up to 5 HP after a completed wave");
assert.match(hordePolish,/MAX_ENEMY_SPEED=\.72/,"ordinary Horde enemies must use the slower movement cap");
assert.match(hordePolish,/WAVE_POWER=Object\.freeze\(\[2,2,3,3,4,4,5,5,6,7\]\)/,"Horde firearms must use the stronger damage curve");
assert.match(hordePolish,/SIDE_STEP_GRACE_MS=1100/,"Horde lateral pathing must be delayed rather than used as rapid shot-dodging");

assert.match(hordeCompletion,/id="horde-solo-btn"|button\.id="horde-solo-btn"/,"menu must expose a dedicated Solo Horde option");
assert.match(hordeCompletion,/net\.setSolo\(name\)/,"Solo Horde must not require an online room");
assert.match(hordeCompletion,/api\.startOnline\(\{roomMode:"horde-survivor"/,"Solo Horde must reuse the authoritative Horde rules engine");
assert.match(hordeCompletion,/STORAGE_KEY="ccg-lost-sizzler:horde-leaderboard:v1"/,"Horde leaderboard must persist between local sessions");
assert.match(hordeCompletion,/\["SOLO","DUO","TRIO","SQUAD"\]/,"Horde leaderboard must keep four player-count categories");
assert.match(hordeCompletion,/horde\.leaderboardResult\(runState\)/,"completed Horde runs must be converted into leaderboard results");
assert.match(hordeCompletion,/ai\.stepEnemies=function stepEnemiesV141HordeMovementOwnership/,"Horde must override the ordinary dungeon movement/dodge pass");
assert.match(hordeCompletion,/enemy\.x=before\.x;enemy\.y=before\.y/,"ordinary AI movement must be rolled back for Horde enemies so the dedicated Horde driver owns movement");

assert.match(loader,/v10-41-horde-combat-polish\.js/,"release loader must include Horde combat polish");
assert.match(loader,/v10-41-horde-completion\.js/,"release loader must include Solo Horde, rankings and movement ownership");
assert.match(loader,/v10-41-sanctuary-azalea\.js/,"release loader must include sanctuary scenes and AZALEA");
assert.match(loader,/v10-41-progression-recovery\.js/,"release loader must include fresh progression recovery hardening");
assert.match(loader,/v10-41-solo-full-map\.js\?v=20260824b/,"release loader must include the fullscreen-safe Solo map revision");

console.log("Lost Sizzler V10.41 completion pass regression checks passed.");
