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

assert.equal(manifest.releaseVersion,"V10.42","current manifest must publish V10.42 while retaining r29 runtime protections");
assert.ok(index.includes(`ccg-lost-sizzler-build" content="${manifest.build}"`),"canonical page must expose the published build");
assert.ok(index.includes(`ccg-lost-sizzler-cache" content="${manifest.cacheToken}"`),"canonical page must expose the published cache generation");
assert.doesNotMatch(index,/\?v=20260825r28/,"canonical page must not request stale r28 runtime assets");
assert.ok(index.includes(`css/v10-41-r29.css?v=${manifest.cacheToken}`),"r29 stable geometry CSS must load under the current cache generation");
assert.ok(index.includes(`js/v10-41-r29-buglog.js?v=${manifest.cacheToken}`),"r29 developer buglog additions must load under the current cache generation");
assert.ok(index.includes(`js/v10-41-r29-runtime-repair.js?v=${manifest.cacheToken}`),"r29 runtime repair must load under the current cache generation");
const activeEnemyFireUrl=`v10-41-active-enemy-fire.js?v=${manifest.cacheToken}`;
const r29Url=`v10-41-r29-runtime-repair.js?v=${manifest.cacheToken}`;
assert.ok(index.indexOf(activeEnemyFireUrl)<index.indexOf(r29Url),"r29 runtime protections must execute after active enemy-fire compatibility");

assert.match(repair,/stableLoop\.__ccgV141R29Stable=true/,"r29 must publish a final stable frame-loop owner");
assert.doesNotMatch(repair,/canvas\.width\s*=|canvas\.height\s*=/,"r29 frame recovery must never recreate the canvas backing store");
assert.doesNotMatch(repair,/input\??\.clear|input\.clear\(/,"r29 fault recovery must never erase held movement input");
assert.doesNotMatch(repair,/setTimeout\([^\n]*90|faultBurst/,"r29 must not throttle repeated frame faults to the old 90 ms recovery cadence");
assert.match(repair,/fault contained without clearing input, reallocating the canvas or throttling play/,"r29 diagnostics must describe the non-destructive recovery contract");
assert.match(repair,/function payDownCombatGap/,"r29 must retain frame-gap combat recovery");
assert.match(repair,/duplicateFramesSkipped\+\+/,"r29 must continue rejecting duplicate RAF timestamps");

assert.match(repair,/quitToMenuV141R29Silent/,"all quit-to-menu paths must receive the final audio guard");
assert.match(repair,/S\.stopMusic\(\)/,"ordinary dungeon music must be stopped on return to menu");
assert.match(repair,/CCGLostSizzlerVoice\?\.stop\?\.\("menu"\)/,"ordinary voice playback must stop on return to menu");
assert.match(repair,/speechSynthesis\?\.cancel\?\.\(\)/,"browser speech must stop on return to menu");
assert.match(repair,/finally\{silenceGameplayAudio\(\)\}/,"audio must be stopped again after legacy quit code completes");
assert.doesNotMatch(repair,/CCGLostSizzlerSpecialModes|CCGLostSizzlerHordeAudio|CCGLostSizzlerSaboteursAudio/,"active r29 audio shutdown must no longer own retired special-mode controllers");

for(const retired of [
  "installHordeFriendlyFireGuard","installHordeNetworkDamageGuard","desiredHordeQuota","hordeRemaining","ensureRemainingHud","updateRemainingHud",
  "installSpyToastThrottle","installSpyMovementOwner","spyMove(","spyStep(","primeSpyDoor(","SPY_HINT_COOLDOWN_MS",
  "__ccgV141R29HordeFriendly","__ccgV141R29HordePacket","__ccgV141R29SpyToast","__ccgV141R29SpyOwner"
]){
  assert.equal(repair.includes(retired),false,`retired r29 special-mode ownership must stay absent: ${retired}`)
}
assert.match(repair,/state\.loopInstalled&&state\.quitInstalled&&state\.contactInstalled&&state\.pickupInstalled&&state\.enterInstalled/,"r29 install health must depend only on retained active owners");

assert.match(repair,/collideWithEnemyV141R29Block/,"r29 must own final player/enemy contact handling");
assert.match(repair,/player\.x=ox;player\.y=oy;player\.rx=ox;player\.ry=oy/,"enemy contact must return the player to the adjacent pre-collision tile");
const contactSection=repair.slice(repair.indexOf("function contactBlock"),repair.indexOf("function installContactCombatGuard"));
assert.doesNotMatch(contactSection,/hurtPlayer|health\s*[-+]=/,"raw contact must not damage the player; enemy attack logic remains the damage source");
assert.match(repair,/function sealRoomDoorBypasses/,"r29 must repair meaningless room-door bypass gaps");
assert.match(repair,/worldState\.map\[outside\.y\]\[outside\.x\]=1;sealed\+\+/,"an unregistered opening immediately beside a real door must be resealed as wall");
assert.match(repair,/worldState\.largeRoomGridV135/,"normal Dungeon door repair must not rewrite the legacy large-room grid");
const structureSection=repair.slice(repair.indexOf("function repairDungeonStructure"),repair.indexOf("const PROGRESS_LABEL"));
assert.doesNotMatch(structureSection,/modeType|specialMode|spyActive|hordeActive/,"active Dungeon structure repair must not depend on retired special-mode state");

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
assert.match(buglog,/LATEST UPDATE · 26 AUG 2026/,"r29 bug tracker must retain its historical latest-update record");
assert.match(buglog,/build 2026\.08\.25\.29/,"r29 bug tracker must identify the historical r29 build");
assert.match(buglog,/20260825r29/,"r29 bug tracker must identify the historical r29 cache generation");

console.log("C64 Dungeon Carnage V10.41 r29 active runtime, geometry, audio, combat, dungeon structure, keyboard UX, pickup and retired-mode boundary checks passed.");