import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const index=read("index.html");
const manifest=JSON.parse(read("version.json"));
const repair=read("js/v10-41-r29-runtime-repair.js");
const css=read("css/v10-41-r29.css");
const buglog=read("js/v10-41-r29-buglog.js");

assert.equal(manifest.build,"2026.08.25.29","r29 manifest must publish build .29");
assert.equal(manifest.cacheToken,"20260825r29","r29 manifest must publish a fresh cache generation");
assert.match(index,/ccg-lost-sizzler-build" content="2026\.08\.25\.29"/,"canonical page must expose build .29");
assert.match(index,/ccg-lost-sizzler-cache" content="20260825r29"/,"canonical page must expose r29 cache generation");
assert.doesNotMatch(index,/\?v=20260825r28/,"canonical page must not request stale r28 runtime assets");
assert.match(index,/css\/v10-41-r29\.css\?v=20260825r29/,"r29 stable geometry CSS must load");
assert.match(index,/js\/v10-41-r29-buglog\.js\?v=20260825r29/,"r29 developer buglog additions must load");
assert.match(index,/js\/v10-41-r29-runtime-repair\.js\?v=20260825r29/,"r29 runtime repair must load");
assert.ok(index.indexOf("v10-41-r28-special-mode-repair.js?v=20260825r29")<index.indexOf("v10-41-r29-runtime-repair.js?v=20260825r29"),"r29 must execute after r28 and become the final runtime owner");

assert.match(repair,/stableLoop\.__ccgV141R29Stable=true/,"r29 must publish a final stable frame-loop owner");
assert.doesNotMatch(repair,/canvas\.width\s*=|canvas\.height\s*=/,"r29 frame recovery must never recreate the canvas backing store");
assert.doesNotMatch(repair,/input\??\.clear|input\.clear\(/,"r29 fault recovery must never erase held movement input");
assert.doesNotMatch(repair,/setTimeout\([^\n]*90|faultBurst/,"r29 must not throttle repeated frame faults to the old 90 ms recovery cadence");
assert.match(repair,/fault contained without clearing input, reallocating the canvas or throttling play/,"r29 diagnostics must describe the non-destructive recovery contract");

assert.match(repair,/quitToMenuV141R29Silent/,"all quit-to-menu paths must receive the final audio guard");
assert.match(repair,/api\.stop\(undefined,true\)/,"special-mode audio controllers must be disposed silently before the menu transition");
assert.match(repair,/S\.stopMusic\(\)/,"ordinary dungeon music must be stopped on return to menu");
assert.match(repair,/finally\{silenceGameplayAudio\(\)\}/,"audio must be stopped again after legacy quit code completes");

assert.match(repair,/if\(hordeActive\(\)&&friendly\)\{state\.hordeFriendlyFireBlocked\+\+;return false\}/,"Horde friendly-fire damage must be rejected");
assert.match(repair,/event==="player_hit"&&payload\?\.target===p1\?\.id/,"Horde host-authoritative enemy melee packets must be intercepted separately");
assert.match(repair,/hurtPlayer\(p1,Math\.max\(1,Number\(payload\.power\)\|\|1\),false/,"enemy melee packets must remain hostile, not friendly-fire damage");
assert.match(repair,/ENEMIES LEFT \$\{remaining\}/,"Horde must expose a persistent enemies-remaining counter");
assert.match(repair,/ACTIVE NOW \$\{physical\}/,"Horde counter must also expose how many enemies are physically active now");

assert.match(repair,/if\(spyActive\(\)\)return spyMove\(player,dx,dy,dash\)/,"r29 must take final ownership of Spy movement without delegating into older Spy fallbacks");
assert.match(repair,/primeSpyDoorsForStep/,"the r29 Spy owner must retain r27 doorway priming without delegating movement ownership");
assert.match(repair,/typeof tryDoor==="function"&&!tryDoor\(player,nx,ny\)/,"the final Spy movement owner must retain the authoritative door-opening path");
assert.match(repair,/spyOccupied\(player,nx,ny\)/,"active opposing Spy occupancy must remain solid");
assert.match(repair,/window\.CCGLostSizzlerV141SpyMovementFinalizer\?\.state\?\.installed/,"r29 must install only after the older Spy finalizer has finished so it can become the one final owner");
assert.match(repair,/SPY_HINT_COOLDOWN_MS=1800/,"video-confirmed furniture guidance must be throttled");
assert.match(repair,/MOVE BESIDE FURNITURE/,"the repeated Spy search hint must have a dedicated suppression path");

assert.match(css,/grid-template-rows:minmax\(0,1fr\)!important/,"active gameplay canvas geometry must remain a fixed one-row grid");
assert.match(css,/game-message-rail\{[\s\S]*display:contents!important/,"notification rail must not reserve or release canvas height");
assert.match(css,/#pickup-toast\{[\s\S]*position:absolute!important/,"gameplay toasts must overlay without resizing the playfield");

for(const id of ["LS-0825-23","LS-0825-24","LS-0825-25","LS-0825-26","LS-0825-27","LS-0825-28","LS-0825-29"]){
  assert.match(buglog,new RegExp(id),`r29 developer bug tracker must contain ${id}`)
}
assert.match(buglog,/build 2026\.08\.25\.29/,"r29 bug tracker must identify the r29 build");
assert.match(buglog,/20260825r29/,"r29 bug tracker must identify the r29 cache generation");

console.log("Lost Sizzler V10.41 r29 runtime, flicker, Horde, Spy, audio and release regression checks passed.");
