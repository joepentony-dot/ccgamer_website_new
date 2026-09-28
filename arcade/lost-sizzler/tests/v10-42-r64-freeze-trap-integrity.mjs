import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const r59=fs.readFileSync(new URL("js/v10-41-r59-live-regression-fixes.js",root),"utf8");
const play=fs.readFileSync(new URL("js/game-play.js",root),"utf8");
const reporter=fs.readFileSync(new URL("js/v10-42-bug-reporter.js",root),"utf8");

assert.match(r59,/const LOOP_STALL_WATCHDOG_MS=1400/,"R64 must define a bounded visible-Solo loop watchdog");
assert.match(r59,/function ensureLoopLiveness\(\)[\s\S]*requestAnimationFrame\(stableLoopR59\)/,"R64 loop watchdog must restart the canonical R59 RAF owner");
assert.match(r59,/installClockOwner\(\);installPauseOwners\(\);installSoloSaveTransitionOwner\(\);reassertR58\(\);ensureLoopLiveness\(\)/,"the regular R59 monitor must check active Solo loop liveness");
assert.match(r59,/setAcceptedRafTimestamp\(t\);state\.lastAcceptedWallAt=perfNow\(\)/,"every accepted frame must refresh the wall-clock liveness marker");

assert.match(play,/const leftTile=Boolean\(p&&t&&\(Number\(p\.x\)!==Number\(t\.x\)\|\|Number\(p\.y\)!==Number\(t\.y\)\)\)/,"trap contact ledger must detect when a player has left the trap tile");
assert.match(play,/if\(!p\|\|!t\|\|!t\.active\|\|leftTile\|\|!SYS\.trapActive\(t,now\)\)/,"trap contact ledger must rearm on tile exit as well as inactive-cycle boundaries");
assert.match(play,/contactExitRearms:0/,"authoritative trap state must expose exit rearm diagnostics");
assert.match(play,/if\(leftTile\)authoritativeTrapState\.contactExitRearms\+\+/,"trap exit rearming must be observable");

assert.match(reporter,/soloClock:safe\(\(\)=>window\.CCGLostSizzlerV141R59LiveRegressionFixes\?\.state/,"bug reports must capture R59 loop liveness state");
assert.match(reporter,/Loop monitor: acceptedFrames=/,"text bug reports must expose loop watchdog evidence");
assert.match(reporter,/Trap rearm: exits=/,"text bug reports must expose trap exit-rearm evidence");

console.log("Dungeon Carnage R64 freeze and trap integrity source contract passed.");
