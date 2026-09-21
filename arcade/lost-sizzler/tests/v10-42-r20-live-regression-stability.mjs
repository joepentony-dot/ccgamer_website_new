import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const bootstrap=read("js/v10-42-bootstrap.js");
const fix=read("js/v10-42-r20-live-regression-stability.js");
const touch=read("js/v10-4-patch.js");
const play=read("js/game-play.js");
const stallElapsed=read("js/v10-42-r22-stall-elapsed-handoff.js");
const ownerSeal=read("js/v10-42-r21-owner-and-attack-seal.js");
const controllerSeal=read("js/v10-42-r2-controller-owner-seal.js");

assert.match(bootstrap,/v10-42-r20-live-regression-stability\.js[\s\S]*v10-42-r22-stall-elapsed-handoff\.js[\s\S]*v10-42-r1-stability\.js[\s\S]*v10-42-r18-solo-playtest-stability\.js/,"r20 and its elapsed writer handoff must load before the established final r1/r18 stability pair");
assert.match(bootstrap,/const BUILD="V10\.42 r(\d+)"[\s\S]*const CACHE="\d{8}r\1"/,"the ordered bootstrap must retain a matching visible V10.42 build/cache identity while carrying the r20 stability module forward");

assert.match(fix,/ATTACK_KEYS=new Set\(\["Space","KeyF","Numpad0"\]\)/,"normal gameplay must recover all supported P1 attack keys");
assert.match(fix,/function activeRun\(\)[\s\S]*liveSession\(\)[\s\S]*document\.body\.dataset\.runActive="true"/,"attack recovery must repair a stale presentation flag from the actual live run state instead of refusing FIRE");
assert.match(fix,/mobileFirePointers=new Set\(\)[\s\S]*#v104-touch-controls \[data-action="fire"\][\s\S]*queueMicrotask[\s\S]*attackNow\("Space"\)/,"a delegated mobile FIRE safety owner must recover a visible button whose original listener stops delivering attack intents");
assert.match(fix,/pointerup",releaseMobileFire,true[\s\S]*pointercancel",releaseMobileFire,true/,"delegated mobile FIRE recovery must always release its canonical Space hold");
assert.match(fix,/function recoverOrphanedGameplayMode\(\)[\s\S]*dossier[\s\S]*inventory[\s\S]*shop[\s\S]*mode="playing"/,"hidden transient panels must not leave gameplay stranded outside playing mode");
assert.match(fix,/function captureR1FireOwner\(\)[\s\S]*__ccgV142R1===true[\s\S]*capturedR1FireOwner=owner/,"r20 must retain the verified r1 fire owner before legacy maintenance can replace the global reference");
assert.match(fix,/function attackNow\(code\)[\s\S]*repairAttackBoundary\(\)[\s\S]*r1Owner\(player,direction\)[\s\S]*firePlayer\(player,direction\)[\s\S]*queueAttack\(player\)/,"an attack intent must prefer the captured r1 owner, then the current canonical owner, while retaining the canonical queue as fallback");
assert.match(fix,/if\(fired\)[\s\S]*fireBuffer1=0[\s\S]*else[\s\S]*queueAttack\(player\)/,"a successful direct shot must clear the buffered fallback so one press cannot become two shots");
assert.match(fix,/if\(spyActive\(\)\)return;/,"Spy Vs Spy must retain ownership of its own attack/fullscreen input instead of r20 intercepting dungeon attack keys");
assert.match(fix,/attackNow\(event\.code\)[\s\S]*event\.stopImmediatePropagation\(\)/,"normal gameplay attack capture must stop older Space/fullscreen listeners from adding duplicate intents");
assert.match(play,/p\.__ccgLastHurtAt=performance\.now\(\);p\.hitStunMs=/,"core damage handling must timestamp legitimate hit-stun ownership");
assert.match(fix,/staleAfter=Math\.max\(540,expected\*3\)[\s\S]*performance\.now\(\)-lastHurt>staleAfter[\s\S]*player\.hitStunMs=0/,"ordinary attack intent must clear a stale hit-stun after the real damage window has expired");
assert.match(fix,/player\.controlLocked=false[\s\S]*player\.controlsLocked=false/,"ordinary attack intent must recover stale player control locks");
assert.match(touch,/CCGLostSizzlerV142R20LiveRegressionStability\?\.attackNow\?\.\("Space"\)/,"mobile FIRE must use the same strong attack recovery owner as keyboard attack");
assert.match(touch,/if\(!handled&&typeof queueAttack === "function"\) queueAttack\(p1\)/,"mobile FIRE must retain the canonical queue as a fallback only when direct recovery cannot fire");

assert.match(fix,/hideNamedDossier=function[\s\S]*focusGame\(\)[\s\S]*scheduleCursorHide\(\)/,"closing the dossier must restore keyboard focus and desktop cursor-idle behaviour");
assert.match(fix,/CURSOR_IDLE_MS=1600[\s\S]*ccg-game-cursor-idle/,"desktop gameplay must hide an idle pointer after a short delay");
assert.match(fix,/shop-score-delta-rail[\s\S]*−\$\{value\.toLocaleString\(\)\} SCORE/,"each successful shop purchase must expose its own visible score deduction");
assert.match(fix,/updateDoors=function[\s\S]*gap>STALL_MS[\s\S]*openingStart[\s\S]*openAt/,"door animation time must freeze across a browser stall instead of jumping straight to open");

assert.match(controllerSeal,/Object\.defineProperty\(window,"update"[\s\S]*configurable:false/,"r2 must retain sealed ownership of the global update boundary");
assert.doesNotMatch(fix,/(?:window\.)?update\s*=\s*stallSafeUpdate/,"r20 must not attempt a blocked write through r2's sealed global update owner");
assert.match(fix,/function installStallClamp\(\)[\s\S]*runtime\?\.state\?\.sharedFrameBoundary[\s\S]*safeDt=16[\s\S]*__ccgV141ModeFrameBoundary=true[\s\S]*runtime\.state\.sharedFrameBoundary=stallSafeBoundary/,"r20 must clamp oversized dungeon dt at the mutable authoritative mode-runtime boundary while preserving its ownership marker");
assert.match(fix,/function installAuthoritativeLoopStallClamp\(\)[\s\S]*const current=window\.loop[\s\S]*wrapped\.__ccgV141R29Stable=true[\s\S]*wrapped\.__ccgV142R20LoopStallClamp=true[\s\S]*wrapped\.__ccgOriginal=current[\s\S]*window\.loop=wrapped/,"r20 may extend the established r29 loop only as a marked wrapper that retains the prior owner ancestry");
assert.match(fix,/currentMode\(\)==="playing"&&!spyActive\(\)/,"stall clamping must remain limited to active ordinary dungeon play and leave Spy timing alone");

assert.match(stallElapsed,/const current=window\.updateAlert/ ,"r22 must clamp at updateAlert, the authoritative writer of run and floor elapsed time");
assert.match(stallElapsed,/normalPlay=\(\)=>activeRun\(\)&&currentMode\(\)==="playing"&&!spyActive\(\)/,"r22 elapsed clamping must be limited to active ordinary dungeon play and leave Spy timing alone");
assert.match(stallElapsed,/pauseBoundaryCount=\(\)=>[\s\S]*CCGLostSizzlerV141R59LiveRegressionFixes\?\.state\?\.pauseBoundaries/,"r22 must observe the canonical r59 pause-boundary counter instead of inferring pause from wall-clock delay");
assert.match(stallElapsed,/crossedPauseBoundary=pauseBoundary!==lastPauseBoundary[\s\S]*if\(crossedPauseBoundary\)[\s\S]*recovery=null[\s\S]*pauseBoundarySkips\+\+/,"a real pause/resume boundary must cancel pending stall recovery rather than be classified as simulation debt");
assert.match(stallElapsed,/if\(crossedPauseBoundary\)[\s\S]*last=t-NORMAL_FRAME_MS[\s\S]*setAcceptedRafTimestamp\?\.\(t-NORMAL_FRAME_MS\)/,"the authoritative R59 handoff must rebase both frame clocks to one normal step when play resumes from a pause boundary");
assert.match(stallElapsed,/r59Callback=Boolean\(api&&\(callback===api\.stableLoopR59\|\|callback\.__ccgV141R59PauseClock===true\)\)[\s\S]*if\(!r59Callback\)return callback\.apply/,"r22 RAF recovery must only intercept the established R59 loop owner rather than unrelated animation-frame callbacks");
assert.match(stallElapsed,/RAF_RECOVERY_MAX_STEP_MS=120[\s\S]*RAF_RECOVERY_MAX_DEBT_MS=1080/,"R59 stall repayment must retain explicit per-frame and total debt safety bounds");
assert.match(stallElapsed,/gap>STALL_MS&&gap<600000[\s\S]*safeGapRecovery\?\.\(gap\)[\s\S]*debtMs=Math\.min\(RAF_RECOVERY_MAX_DEBT_MS,Math\.max\(0,gap-NORMAL_FRAME_MS\)\)/,"an isolated stall must pay down R59 real-gap control state before its simulation timestamp is bounded");
assert.match(stallElapsed,/if\(recovery\)[\s\S]*recovery=null[\s\S]*sustainedSlowRaf=true[\s\S]*sustainedRafFallbacks\+\+/,"a second oversized RAF gap must hand sustained slow cadence back to R59 instead of permanently throttling every frame");
assert.match(stallElapsed,/ownsNormalFrame&&sustainedSlowRaf[\s\S]*gap<=STALL_MS[\s\S]*sustainedSlowRaf=false/,"R59 sustained slow-cadence ownership must remain active until normal RAF cadence returns");
assert.match(stallElapsed,/debtMs=Math\.min\(RAF_RECOVERY_MAX_DEBT_MS,Math\.max\(0,gap-NORMAL_FRAME_MS\)\)[\s\S]*recovery=\{debtMs,frames:0,lastFrameTimestamp:t\}/,"an isolated browser stall must record only bounded excess wall-clock time as recoverable simulation debt");
assert.match(stallElapsed,/desiredStep=Math\.min\(RAF_RECOVERY_MAX_STEP_MS,Math\.max\(NORMAL_FRAME_MS,wallStep\)\+debtBefore\)[\s\S]*repaid=Math\.max\(0,desiredStep-wallStep\)[\s\S]*recovery\.debtMs=Math\.max\(0,debtBefore-repaid\)/,"active isolated-stall debt must be repaid gradually instead of being injected as one large simulation frame");
assert.match(stallElapsed,/last=t-desiredStep[\s\S]*setAcceptedRafTimestamp\?\.\(t-desiredStep\)/,"bounded debt repayment must hand the same accepted timestamp to both the legacy loop clock and R59 owner");
assert.match(stallElapsed,/debtRepaidMs\+=repaid[\s\S]*if\(recovery\.debtMs<=0\)recovery=null/,"R22 must account for repaid debt and retire recovery once no debt remains");
assert.match(stallElapsed,/safeDt>STALL_MS[\s\S]*safeDt=NORMAL_FRAME_MS[\s\S]*current\.call\(this,safeDt/ ,"r22 must replace an oversized elapsed-writer delta with one normal simulation step before the elapsed counters are advanced");
assert.match(stallElapsed,/r20\.diagnostics\.frameStalls=Math\.max/ ,"the authoritative elapsed owner must report a detected browser stall through the existing r20 diagnostics");
assert.match(stallElapsed,/wrapped\.__ccgV142R22StallElapsedHandoff=true[\s\S]*wrapped\.__ccgOriginal=current[\s\S]*window\.updateAlert=wrapped/ ,"r22 must retain bounded owner ancestry when replacing the elapsed writer");
assert.doesNotMatch(stallElapsed,/window\.updateDoors=|queueMicrotask\s*\(/,"r22 must not rely on the earlier door boundary or a late microtask clamp for elapsed ownership");
assert.doesNotMatch(stallElapsed,/requestAnimationFrame\s*\(/,"r22 must not create a competing RAF chain");

assert.doesNotMatch(fix,/requestAnimationFrame\s*\(/,"r20 must not create a competing RAF chain");
assert.doesNotMatch(fix,/function\s+stableFrame\s*\(/,"r20 must not introduce an independent simulation-frame implementation");

assert.match(ownerSeal,/retired:true/,"r21 must remain only as a cached-bootstrap compatibility marker");
assert.doesNotMatch(ownerSeal,/window\.hurtPlayer\s*=|hurtPlayerV142R21TrapDamageFinal/,"r21 must not install an additional trap damage owner");
assert.doesNotMatch(ownerSeal,/setInterval\s*\(/,"r21 must not replace the verified r19 trap maintenance loop");

console.log("V10.42 r20 live input, owner isolation, door, dossier, cursor, trap and shop feedback contracts passed");
