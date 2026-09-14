import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const bootstrap=read("js/v10-42-bootstrap.js");
const fix=read("js/v10-42-r20-live-regression-stability.js");
const ownerSeal=read("js/v10-42-r21-owner-and-attack-seal.js");
const controllerSeal=read("js/v10-42-r2-controller-owner-seal.js");

assert.match(bootstrap,/v10-42-r20-live-regression-stability\.js[\s\S]*v10-42-r1-stability\.js[\s\S]*v10-42-r18-solo-playtest-stability\.js/,"r20 must load before the established final r1/r18 stability pair");
assert.match(bootstrap,/const BUILD="V10\.42 r20"[\s\S]*const CACHE="20260913r20"/,"r20 must own a fresh visible build/cache identity");

assert.match(fix,/ATTACK_KEYS=new Set\(\["Space","KeyF","Numpad0"\]\)/,"normal gameplay must recover all supported P1 attack keys");
assert.match(fix,/function recoverOrphanedGameplayMode\(\)[\s\S]*dossier[\s\S]*inventory[\s\S]*shop[\s\S]*mode="playing"/,"hidden transient panels must not leave gameplay stranded outside playing mode");
assert.match(fix,/function captureR1FireOwner\(\)[\s\S]*__ccgV142R1===true[\s\S]*capturedR1FireOwner=owner/,"r20 must retain the verified r1 fire owner before legacy maintenance can replace the global reference");
assert.match(fix,/function attackNow\(code\)[\s\S]*repairAttackBoundary\(\)[\s\S]*r1Owner\(player,direction\)[\s\S]*firePlayer\(player,direction\)[\s\S]*queueAttack\(player\)/,"an attack intent must prefer the captured r1 owner, then the current canonical owner, while retaining the canonical queue as fallback");
assert.match(fix,/if\(fired\)[\s\S]*fireBuffer1=0[\s\S]*else[\s\S]*queueAttack\(player\)/,"a successful direct shot must clear the buffered fallback so one press cannot become two shots");
assert.match(fix,/event\.code==="KeyF"&&spyActive\(\)/,"Spy Vs Spy must retain its existing F/fullscreen ownership");
assert.match(fix,/attackNow\(event\.code\)[\s\S]*event\.stopImmediatePropagation\(\)/,"normal gameplay attack capture must stop older Space/fullscreen listeners from adding duplicate intents");

assert.match(fix,/hideNamedDossier=function[\s\S]*focusGame\(\)[\s\S]*scheduleCursorHide\(\)/,"closing the dossier must restore keyboard focus and desktop cursor-idle behaviour");
assert.match(fix,/CURSOR_IDLE_MS=1600[\s\S]*ccg-game-cursor-idle/,"desktop gameplay must hide an idle pointer after a short delay");
assert.match(fix,/shop-score-delta-rail[\s\S]*−\$\{value\.toLocaleString\(\)\} SCORE/,"each successful shop purchase must expose its own visible score deduction");
assert.match(fix,/updateDoors=function[\s\S]*gap>STALL_MS[\s\S]*openingStart[\s\S]*openAt/,"door animation time must freeze across a browser stall instead of jumping straight to open");

assert.match(controllerSeal,/Object\.defineProperty\(window,"update"[\s\S]*configurable:false/,"r2 must retain sealed ownership of the global update boundary");
assert.doesNotMatch(fix,/(?:window\.)?update\s*=\s*stallSafeUpdate/,"r20 must not attempt a blocked write through r2's sealed global update owner");
assert.match(fix,/function installStallClamp\(\)[\s\S]*runtime\?\.state\?\.sharedFrameBoundary[\s\S]*safeDt=16[\s\S]*__ccgV141ModeFrameBoundary=true[\s\S]*runtime\.state\.sharedFrameBoundary=stallSafeBoundary/,"r20 must clamp oversized dungeon dt at the mutable authoritative mode-runtime boundary while preserving its ownership marker");
assert.match(fix,/currentMode\(\)==="playing"&&!spyActive\(\)/,"stall clamping must remain limited to active ordinary dungeon play and leave Spy timing alone");

assert.doesNotMatch(fix,/requestAnimationFrame\s*\(/,"r20 must not create a competing RAF chain");
assert.doesNotMatch(fix,/window\.loop\s*=|loop\s*=\s*stableFrame/,"r20 must not take ownership of the sealed frame loop");
assert.doesNotMatch(fix,/function\s+stableFrame\s*\(/,"r20 must leave simulation frame ownership to the established mode runtime");

assert.match(ownerSeal,/retired:true/,"r21 must remain only as a cached-bootstrap compatibility marker");
assert.doesNotMatch(ownerSeal,/window\.hurtPlayer\s*=|hurtPlayerV142R21TrapDamageFinal/,"r21 must not install an additional trap damage owner");
assert.doesNotMatch(ownerSeal,/setInterval\s*\(/,"r21 must not replace the verified r19 trap maintenance loop");

console.log("V10.42 r20 live input, owner isolation, door, dossier, cursor, trap and shop feedback contracts passed");
