import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const bootstrap=read("js/v10-42-bootstrap.js");
const fix=read("js/v10-42-r20-live-regression-stability.js");

assert.match(bootstrap,/v10-42-r20-live-regression-stability\.js[\s\S]*v10-42-r1-stability\.js[\s\S]*v10-42-r18-solo-playtest-stability\.js/,"r20 must load before the established final r1/r18 stability pair");
assert.match(bootstrap,/const BUILD="V10\.42 r20"[\s\S]*const CACHE="20260913r20"/,"r20 must own a fresh visible build/cache identity");

assert.match(fix,/ATTACK_KEYS=new Set\(\["Space","KeyF","Numpad0"\]\)/,"normal gameplay must recover all supported P1 attack keys");
assert.match(fix,/function recoverOrphanedGameplayMode\(\)[\s\S]*dossier[\s\S]*inventory[\s\S]*shop[\s\S]*mode="playing"/,"hidden transient panels must not leave gameplay stranded outside playing mode");
assert.match(fix,/function attackNow\(code\)[\s\S]*repairAttackBoundary\(\)[\s\S]*firePlayer\(player[\s\S]*queueAttack\(player\)/,"an attack intent must try the canonical fire boundary immediately and retain the canonical queue as a cooldown fallback");
assert.match(fix,/if\(fired\)[\s\S]*fireBuffer1=0[\s\S]*else[\s\S]*queueAttack\(player\)/,"a successful direct shot must clear the buffered fallback so one press cannot become two shots");
assert.match(fix,/event\.code==="KeyF"&&spyActive\(\)/,"Spy Vs Spy must retain its existing F/fullscreen ownership");
assert.match(fix,/attackNow\(event\.code\)[\s\S]*event\.stopImmediatePropagation\(\)/,"normal gameplay attack capture must stop older Space/fullscreen listeners from adding duplicate intents");

assert.match(fix,/hideNamedDossier=function[\s\S]*focusGame\(\)[\s\S]*scheduleCursorHide\(\)/,"closing the dossier must restore keyboard focus and desktop cursor-idle behaviour");
assert.match(fix,/CURSOR_IDLE_MS=1600[\s\S]*ccg-game-cursor-idle/,"desktop gameplay must hide an idle pointer after a short delay");
assert.match(fix,/shop-score-delta-rail[\s\S]*−\$\{value\.toLocaleString\(\)\} SCORE/,"each successful shop purchase must expose its own visible score deduction");

assert.match(fix,/updateDoors=function[\s\S]*gap>STALL_MS[\s\S]*openingStart[\s\S]*openAt/,"door animation time must freeze across a browser stall instead of jumping straight to open");
assert.match(fix,/function authoritativeFrameBoundary\(\)[\s\S]*sharedFrameBoundary/ ,"r20 must recognise the established authoritative frame boundary");
assert.match(fix,/function installFramePolicy\(attempt=0\)[\s\S]*authoritativeFrameBoundary\(\)[\s\S]*observeAuthoritativeFrame[\s\S]*loop=stableFrame/ ,"r20 must observe the authoritative frame owner and only install its stable frame as a fallback");
assert.match(fix,/stableFrame\.__ccgV141R29Stable=true/,"the fallback r20 frame owner must satisfy the retained r29 ownership marker");

console.log("V10.42 r20 live input, frame pacing, door, dossier, cursor and shop feedback contracts passed");
