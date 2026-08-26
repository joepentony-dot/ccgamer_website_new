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

assert.equal(manifest.build,"2026.08.26.30","current manifest must publish r30 build .30 while retaining r29 runtime protections");
assert.equal(manifest.cacheToken,"20260826r30","current manifest must publish the r30 cache generation");
assert.match(index,/ccg-lost-sizzler-build" content="2026\.08\.26\.30"/,"canonical page must expose build .29");
assert.match(index,/ccg-lost-sizzler-cache" content="20260826r30"/,"canonical page must expose r29 cache generation");
assert.doesNotMatch(index,/\?v=20260825r28/,"canonical page must not request stale r28 runtime assets");
assert.match(index,/css\/v10-41-r29\.css\?v=20260826r30/,"r29 stable geometry CSS must load");
assert.match(index,/js\/v10-41-r29-buglog\.js\?v=20260826r30/,"r29 developer buglog additions must load");
assert.match(index,/js\/v10-41-r29-runtime-repair\.js\?v=20260826r30/,"r29 runtime repair must load");
assert.ok(index.indexOf("v10-41-r28-special-mode-repair.js?v=20260826r30")<index.indexOf("v10-41-r29-runtime-repair.js?v=20260826r30"),"retained r29 runtime protections must execute after r28 before the r30 ownership failsafe");

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

assert.match(repair,/collideWithEnemyV141R29Block/,"r29 must own final player/enemy contact handling");
assert.match(repair,/player\.x=ox;player\.y=oy;player\.rx=ox;player\.ry=oy/,"enemy contact must return the player to the adjacent pre-collision tile");
const contactSection=repair.slice(repair.indexOf("function contactBlock"),repair.indexOf("function installContactCombatGuard"));
assert.doesNotMatch(contactSection,/hurtPlayer|health\s*[-+]=/,"raw contact must not damage the player; enemy attack logic remains the damage source");
assert.match(repair,/function sealRoomDoorBypasses/,"r29 must repair meaningless room-door bypass gaps");
assert.match(repair,/worldState\.map\[outside\.y\]\[outside\.x\]=1;sealed\+\+/,"an unregistered opening immediately beside a real door must be resealed as wall");
assert.match(repair,/worldState\.largeRoomGridV135/,"normal Dungeon door repair must not rewrite the special Spy room grid");

assert.match(repair,/PROGRESS_LABEL=.*CONTINUE.*RESUME.*BACK TO GAME.*COMPLETE TUTORIAL/,"keyboard progress must recognise acknowledgement and resume actions");
assert.match(repair,/window\.addEventListener\("keydown",handleEnterProgress,true\)/,"Enter progress handling must run in capture phase before Player 2 gameplay Enter");
assert.match(repair,/event\.stopImmediatePropagation\(\)/,"consumed popup Enter must not leak into gameplay attack handling");
assert.match(repair,/\["menu","online-lobby"\]/,"Enter progress must not auto-start or auto-join from the main menu/lobby");

assert.match(repair,/health:"HEALTH PACK"/,"generic health pickups must use a relevant Health Pack label");
assert.match(repair,/HIDDEN\|SECRET\|MYSTERIOUS\|UNKNOWN\|UNMARKED/,"misleading generic pickup prefixes must be normalised");
assert.match(repair,/function drawEnhancedPickup/,"r29 must provide larger differentiated pickup glyphs");
assert.match(repair,/customPickupPresent\(item\)/,"custom pickup artwork must remain authoritative over generated glyphs");
assert.match(repair,/ctx\.scale\(1\.16,1\.16\)/,"unrecognised fallback pickup glyphs must also receive a modest readability increase");

assert.match(css,/grid-template-rows:minmax\(0,1fr\)!important/,"active gameplay canvas geometry must remain a fixed one-row grid");
assert.match(css,/game-message-rail\{[\s\S]*display:contents!important/,"notification rail must not reserve or release canvas height");
assert.match(css,/#pickup-toast\{[\s\S]*position:absolute!important/,"gameplay toasts must overlay without resizing the playfield");

for(const id of ["LS-0825-23","LS-0825-24","LS-0825-25","LS-0825-26","LS-0825-27","LS-0825-28","LS-0825-29","LS-0825-30","LS-0825-31","LS-0825-32","LS-0825-33","LS-0826-01","LS-0826-02","LS-0826-03","LS-0826-04","LS-0826-05","LS-0826-06"]){
  assert.match(buglog,new RegExp(id),`r29 developer bug tracker must contain ${id}`)
}
assert.match(buglog,/LATEST UPDATE · 26 AUG 2026/,"r29 bug tracker must identify the latest Spy architecture pass date");
assert.match(buglog,/build 2026\.08\.25\.29/,"r29 bug tracker must identify the r29 build");
assert.match(buglog,/20260825r29/,"r29 bug tracker must identify the r29 cache generation");

console.log("Lost Sizzler V10.41 r29 runtime, flicker, Horde, isolated Spy, audio, combat, dungeon structure, keyboard UX, pickup and release regression checks passed.");