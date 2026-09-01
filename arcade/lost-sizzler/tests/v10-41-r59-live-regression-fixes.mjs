import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const loader=read("js/v10-41-r32-spy-loader.js");
const r27=read("js/v10-41-r27-spy-isolation.js");
const r59=read("js/v10-41-r59-live-regression-fixes.js");
const gameMain=read("js/game-main.js");
const gamePlay=read("js/game-play.js");

assert.doesNotThrow(()=>new Function(loader),"r32/r59 Spy loader must parse");
assert.doesNotThrow(()=>new Function(r59),"r59 live regression finalizer must parse");

// Preserve the useful r27 world isolation, but retire its obsolete keyboard owner.
assert.match(r27,/if\(code==="KeyF"\)/,"the historical r27 conflict must remain visible to this regression test");
assert.match(loader,/function detachLegacyR27KeyOwner\(\)/,"the live loader must explicitly retire the old r27 keyboard owner");
assert.match(loader,/removeEventListener\("keydown",api\.onSpyKeyDown,true\)/,"the exact r27 capture listener must be removed without disabling its world-isolation timer");

// TAB is the one authoritative Spy field-kit key. F falls through to game-main fullscreen.
assert.match(gameMain,/if\(e\.code==="KeyF"\)\{toggleFullscreen\(\);return\}if\(e\.code==="Tab"/,"shared controls must retain F fullscreen and TAB inventory semantics");
assert.match(loader,/if\(code==="Tab"\)[\s\S]*stopImmediatePropagation[\s\S]*toggleSpyInventoryFromTab\(\)/,"Spy TAB must be synchronously captured by the loader and bridged to the private Spy inventory owner");
assert.match(loader,/owner\.setInventory\(!Boolean\(owner\.state\?\.inventoryOpen\)\)/,"TAB must toggle the r32 private Spy field kit rather than the shared Dungeon inventory mode");
assert.doesNotMatch(loader,/if\(code==="KeyF"\)/,"the live Spy loader must never steal F from fullscreen");
assert.match(loader,/repairFieldKitLabels\(\)/,"stale r27 F FIELD KIT labels must be corrected after its retained HUD render pass");
assert.match(loader,/TAB FIELD KIT/,"live Spy UI repair must advertise TAB FIELD KIT");

// r59 is global, despite being bootstrapped by the lightweight Spy loader.
assert.match(loader,/ensureR59\(\)/,"the loader must start the global r59 authority even outside Spy mode");
assert.match(loader,/v10-41-r59-live-regression-fixes\.js/,"r59 must be delivered through the existing cache-aware dynamic loader path");

// Core update already refuses paused simulation; r59 therefore owns the remaining clock boundary.
assert.match(gamePlay,/if\(mode!=="playing"\)\{fireBuffer1=fireBuffer2=0;return\}/,"core update must continue refusing simulation while paused");
assert.match(r59,/function markPauseBoundary\(reason="pause transition"\)/,"r59 must explicitly mark pause/resume timing boundaries");
assert.match(r59,/state\.lastAcceptedRafTimestamp=null/,'pause boundaries must discard the previous RAF timestamp');
assert.match(r59,/if\(now<state\.suppressRecoveryUntil\|\|modeNow!=="playing"\|\|document\.hidden\)/,"paused/hidden wall-clock gaps must never be paid into combat recovery");
assert.match(r59,/if\(hasTimestamp&&finite\(state\.lastAcceptedRafTimestamp\)&&t<=Number\(state\.lastAcceptedRafTimestamp\)\)/,"duplicate RAF callbacks must be rejected before simulation");
assert.match(r59,/requestAnimationFrame\(stableLoopR59\)/,"the authoritative loop must schedule exactly its own singleton callback");
assert.match(r59,/stableLoopR59\.__ccgV141R29Stable=true/,"r59 must retain the r29 stable-loop compatibility marker so older ownership guards accept the new clock owner");
assert.match(r59,/api\.stableLoop=stableLoopR59/,"r59 must replace the r29 exported loop as well as the global loop to prevent an old recovery owner reclaiming it");
assert.match(r59,/normaliseAudioRate\(\)/,"pause boundaries must also normalise any accidentally altered HTML audio playback rate");

// R59 owns the callback but R29 remains the established diagnostic contract.
assert.match(r59,/function noteFault\(phase,error\)/,"r59 must centralise contained-frame fault accounting");
assert.match(r59,/r29\.frameFaults=Number\(r29\.frameFaults\|\|0\)\+1/,"r59 must preserve R29's public frame-fault counter");
assert.match(r59,/if\(phase==="update"\)r29\.updateFaults=Number\(r29\.updateFaults\|\|0\)\+1/,"contained update faults must remain visible through R29 diagnostics");
assert.match(r59,/r29\.lastFaultAt=now;r29\.lastFaultMessage=message/,"r59 must preserve R29's last-fault diagnostic message");
assert.match(r59,/catch\(error\)\{noteFault\("update",error\)\}/,"the R59 update boundary must route contained exceptions through the compatibility accountant");

// R58 remains the final Spy gameplay rules owner.
assert.match(r59,/api\.patchInputOwnership\?\.\(\);api\.patchSaboteurRules\?\.\(\)/,"r59 must reassert r58 input and Saboteur rules while Spy is active");
assert.match(r59,/if\(api\.tick\?\.\(\)\)/,"r59 must keep the r58 live state reconciled after older compatibility monitors run");

console.log("Lost Sizzler V10.41 r59 pause-clock, R29 diagnostics, TAB field-kit, F fullscreen and r58 ownership regressions passed.");
