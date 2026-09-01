import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const r60=fs.readFileSync(path.join(root,"js/v10-41-r60-horde-combat-integrity.js"),"utf8");
const frame=fs.readFileSync(path.join(root,"js/v10-41-horde-frame-performance.js"),"utf8");

assert.match(r60,/PROJECTILE_STEP_MS=70/,"R60 must preserve the canonical 70 ms projectile cadence");
assert.match(r60,/MAX_VISIBLE_FRAME_MS=210/,"R60 must bound active-play wall-clock catch-up");
assert.match(r60,/MAX_PROJECTILE_STEPS=3/,"R60 must bound projectile substeps per rendered frame");
assert.match(r60,/MAX_ENEMY_STEPS=3/,"R60 must bound enemy AI substeps per rendered frame");
assert.match(r60,/projectileCD=SUPPRESS_TIMER_MS/,"R60 must suppress the old one-step-per-render projectile scheduler while Horde owns timing");
assert.match(r60,/enemyCD=SUPPRESS_TIMER_MS/,"R60 must suppress the old one-step-per-render enemy scheduler while Horde owns timing");
assert.match(r60,/stepProjectiles\(\)/,"R60 must reuse canonical tile-by-tile projectile collision rather than skip across cells");
assert.match(r60,/hostEnemyStep\(think\)/,"R60 must reuse canonical enemy AI/damage ownership");
assert.match(r60,/pauseBoundary!==Number\(state\.lastPauseBoundary/,"R60 must detect R59 pause boundaries and discard paused wall-clock gaps");
assert.match(r60,/document\.hidden/,"R60 must refuse hidden-page combat catch-up");
assert.match(r60,/updateHordeLiveV141R60/,"R60 must feed real visible-play elapsed time into Horde perimeter movement");
assert.doesNotMatch(r60,/requestAnimationFrame\s*\(/,"R60 must never create a second RAF/game loop");
assert.match(frame,/R60_SRC="js\/v10-41-r60-horde-combat-integrity\.js"/,"the established Horde performance layer must load R60 in production");
assert.match(frame,/ensureR60\(\);schedulePrewarm\(\)/,"R60 must start loading without waiting for Horde gameplay");

console.log("Lost Sizzler V10.41 r60 frame-rate-independent Horde projectile, enemy attack, movement and pause-safety contracts passed.");