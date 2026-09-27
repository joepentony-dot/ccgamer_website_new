import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const bootstrap=read("js/v10-42-bootstrap.js");
const r20=read("js/v10-42-r20-live-regression-stability.js");
const play=read("js/game-play.js");
const touch=read("js/v10-4-patch.js");
const stallElapsed=read("js/v10-42-r22-stall-elapsed-handoff.js");
const ownerSeal=read("js/v10-42-r21-owner-and-attack-seal.js");
const controllerSeal=read("js/v10-42-r2-controller-owner-seal.js");

assert.match(bootstrap,/v10-42-r20-live-regression-stability\.js[\s\S]*v10-42-r22-stall-elapsed-handoff\.js/,"non-FIRE R20 safeguards must load before the retained elapsed handoff");
assert.match(r20,/version:"V10\.42-r58-non-fire-stability"/);
assert.match(r20,/gameplayOwnership:false,inputOwnership:false,fireOwnership:false/);
assert.doesNotMatch(r20,/ATTACK_KEYS|function attackNow\(|recoverPersistentFireBlock|recoverThroughDeepFireOwner|recoverThroughCapturedR1FireOwner|mobileFirePointers/,"R20 must not retain attack ownership or recovery");
assert.doesNotMatch(r20,/fire1\s*=|fireBuffer1\s*=|player\.hitStunMs=0/,"non-FIRE R20 must not repair attack cadence or hit-stun");
assert.doesNotMatch(r20,/document\.addEventListener\("keydown"[\s\S]*queueAttack|firePlayer\(/,"non-FIRE R20 must not synthesize attacks");

assert.match(play,/window\.CCGLostSizzlerV142R58AuthoritativeFireCore=authoritativeFireApi/,"r58 core must expose the authoritative FIRE API");
assert.doesNotMatch(play,/window\.CCGLostSizzlerV142R20LiveRegressionStability=authoritativeFireApi/,"FIRE core must not occupy R20 namespace");
assert.match(play,/if\(firePressed\)[\s\S]*if\(!gamepadFireDown\)queueAttack\(p1,attackDirection\(p1,dir\)\)[\s\S]*else if\(fire1<=0\)attackNowUnbuffered\(p1,attackDirection\(p1,dir\)\)/,"gamepad FIRE must queue the initial press once and route legal held repeats through the authoritative core");
assert.match(touch,/if\(typeof queueAttack === "function"\) queueAttack\(p1\)/,"touch FIRE must use the authoritative queue");
assert.doesNotMatch(touch,/CCGLostSizzlerV142R20LiveRegressionStability\?\.attackNow/,"touch FIRE must not invoke R20 recovery");

assert.match(r20,/function activeRun\(\)[\s\S]*liveSession\(\)[\s\S]*document\.body\.dataset\.runActive="true"/,"presentation recovery must repair a stale run-active flag from live state");
assert.match(r20,/function recoverOrphanedGameplayMode\(\)[\s\S]*dossier[\s\S]*inventory[\s\S]*shop[\s\S]*mode="playing"/,"hidden transient panels must not strand gameplay outside playing mode");
assert.match(r20,/hideNamedDossier=function[\s\S]*focusGame\(\)[\s\S]*scheduleCursorHide\(\)/,"closing dossier must restore focus/cursor handling");
assert.match(r20,/CURSOR_IDLE_MS=1600[\s\S]*ccg-game-cursor-idle/,"desktop pointer must still hide after idle");
assert.match(r20,/shop-score-delta-rail[\s\S]*−\$\{value\.toLocaleString\(\)\} SCORE/,"successful shop purchases must retain visible score deductions");
assert.match(r20,/updateDoors=function[\s\S]*gap>STALL_MS[\s\S]*openingStart[\s\S]*openAt/,"door animation must freeze across browser stalls");
assert.match(r20,/function installStallClamp\(\)[\s\S]*sharedFrameBoundary[\s\S]*safeDt=16/,"oversized gameplay dt must remain clamped at the mutable frame boundary");
assert.match(r20,/function installAuthoritativeLoopStallClamp\(\)[\s\S]*window\.loop=wrapped/,"real browser stalls must remain bounded through the established loop owner");
assert.doesNotMatch(r20,/requestAnimationFrame\s*\(/,"R20 must not create a competing RAF chain");

assert.match(controllerSeal,/Object\.defineProperty\(window,"update"[\s\S]*configurable:false/,"r2 must retain sealed global update ownership");
assert.match(stallElapsed,/r20\.diagnostics\.frameStalls=Math\.max/,"r22 may continue publishing stall diagnostics through non-FIRE R20 state");
assert.match(ownerSeal,/retired:true/,"r21 must remain only as a cached-bootstrap compatibility marker");
assert.doesNotMatch(ownerSeal,/window\.hurtPlayer\s*=|hurtPlayerV142R21TrapDamageFinal/,"r21 must not install a trap damage owner");

console.log("V10.42 r58 non-FIRE R20 stability and authoritative FIRE isolation contracts passed.");
