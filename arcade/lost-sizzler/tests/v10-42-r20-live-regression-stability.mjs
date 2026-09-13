import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const bootstrap=read("js/v10-42-bootstrap.js");
const fix=read("js/v10-42-r20-live-regression-stability.js");

assert.match(bootstrap,/v10-42-r18-solo-playtest-stability\.js[\s\S]*v10-42-r20-live-regression-stability\.js/,"r20 must load last after the established solo stability layer");
assert.match(bootstrap,/const BUILD="V10\.42 r20"[\s\S]*const CACHE="20260913r20"/,"r20 must own a fresh visible build/cache identity");

assert.match(fix,/ATTACK_KEYS=new Set\(\["Space","KeyF","Numpad0"\]\)/,"normal gameplay must recover all supported P1 attack keys");
assert.match(fix,/function recoverOrphanedGameplayMode\(\)[\s\S]*dossier[\s\S]*inventory[\s\S]*shop[\s\S]*mode="playing"/,"hidden transient panels must not leave gameplay stranded outside playing mode");
assert.match(fix,/function attackNow\(code\)[\s\S]*repairAttackBoundary\(\)[\s\S]*queueAttack\(player\)/,"an attack intent must repair state and re-arm the canonical attack queue");
assert.doesNotMatch(fix,/function attackNow\(code\)[\s\S]{0,900}firePlayer\(/,"the input repair must not bypass canonical cadence or create a second buffered shot");
assert.match(fix,/event\.code==="KeyF"&&spyActive\(\)/,"Spy Vs Spy must retain its existing F/fullscreen ownership");
assert.match(fix,/event\.code==="KeyF"\|\|event\.code==="Numpad0"\)event\.stopImmediatePropagation\(\)/,"normal gameplay F/Numpad attack must not fall through to the fullscreen owner");

assert.match(fix,/hideNamedDossier=function[\s\S]*focusGame\(\)[\s\S]*scheduleCursorHide\(\)/,"closing the dossier must restore keyboard focus and desktop cursor-idle behaviour");
assert.match(fix,/CURSOR_IDLE_MS=1600[\s\S]*ccg-game-cursor-idle/,"desktop gameplay must hide an idle pointer after a short delay");
assert.match(fix,/shop-score-delta-rail[\s\S]*−\$\{value\.toLocaleString\(\)\} SCORE/,"each successful shop purchase must expose its own visible score deduction");

assert.match(fix,/updateDoors=function[\s\S]*gap>STALL_MS[\s\S]*openingStart[\s\S]*openAt/,"door animation time must freeze across a browser stall instead of jumping straight to open");
assert.match(fix,/function stableFrame\(timestamp\)[\s\S]*duplicateFramesDropped[\s\S]*const dt=stalled\?16:[\s\S]*requestAnimationFrame\(loop\)/,"the final RAF owner must drop duplicate chains and resume long stalls with one normal simulation step");
assert.match(fix,/stableFrame\.__ccgV141R29Stable=true/,"the r20 frame owner must satisfy the retained r29 ownership marker so the old installer cannot replace it every 80 ms");

console.log("V10.42 r20 live input, frame pacing, door, dossier, cursor and shop feedback contracts passed");
