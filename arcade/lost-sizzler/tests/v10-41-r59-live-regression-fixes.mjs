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

// TAB owns the private Spy field kit. F is routed through one idempotent helper
// so game-main and the Spy capture boundary cannot double-dispatch fullscreen.
assert.match(gameMain,/if\(e\.code==="KeyF"\)\{[\s\S]*spyLoader\?\.handleSpyFullscreenKey\?\.\(e\)[\s\S]*toggleFullscreen\(\);return[\s\S]*\}/,"shared controls must delegate Spy F to the idempotent owner while preserving ordinary fullscreen fallback");
assert.match(loader,/if\(code==="Tab"\)[\s\S]*stopImmediatePropagation[\s\S]*toggleSpyInventoryFromTab\(\)/,"Spy TAB must be synchronously captured by the loader and bridged to the private Spy inventory owner");
assert.match(loader,/owner\.setInventory\(!Boolean\(owner\.state\?\.inventoryOpen\)\)/,"TAB must toggle the r32 private Spy field kit rather than the shared Dungeon inventory mode");
assert.match(loader,/const fullscreenEvents=new WeakSet\(\)/,"Spy F must track each keyboard event by identity instead of listener order");
assert.match(loader,/function handleSpyFullscreenKey\(event\)[\s\S]*fullscreenEvents\.has\(event\)[\s\S]*fullscreenEvents\.add\(event\)[\s\S]*toggleFullscreen\(\);state\.fullscreenKeyCalls\+\+/,"Spy F must issue one fullscreen command and suppress duplicate handling of the same event");
assert.match(loader,/if\(code==="KeyF"\)\{handleSpyFullscreenKey\(event\);return\}/,"the capture listener must use the same idempotent F owner as game-main");
assert.match(loader,/repairFieldKitLabels\(\)/,"stale r27 F FIELD KIT labels must be corrected after its retained HUD render pass");
assert.match(loader,/TAB FIELD KIT/,"live Spy UI repair must advertise TAB FIELD KIT");

// r59 is global, despite being bootstrapped by the lightweight Spy loader.
assert.match(loader,/ensureR59\(\)/,"the loader must start the global r59 authority even outside Spy mode");
assert.match(loader,/v10-41-r59-live-regression-fixes\.js/,"r59 must be delivered through the existing cache-aware dynamic loader path");

// Core update already refuses paused simulation; r59 therefore owns the remaining clock boundary.
assert.match(gamePlay,/if\(mode!=="playing"\)\{fireBuffer1=fireBuffer2=0;return\}/,"core update must continue refusing simulation while paused");
assert.match(r59,/function markPauseBoundary\(reason="pause transition"\)/,"r59 must explicitly mark pause/resume timing boundaries");
assert.match(r59,/setAcceptedRafTimestamp\(null\)/,'pause boundaries must discard the previous RAF timestamp through the shared diagnostic bridge');
assert.match(r59,/if\(modeNow!=="playing"\|\|document\.hidden\)\{state\.pausedGapsDiscarded\+\+;return false\}/,"paused/hidden wall-clock gaps must never be paid into combat recovery");
assert.match(r59,/if\(modeChanged\|\|modeNow!=="playing"\|\|document\.hidden\)/,"only mode-transition, paused or hidden frames may use the discarded-gap path");
assert.doesNotMatch(r59,/if\(now<state\.suppressRecoveryUntil\|\|modeNow!=="playing"\|\|document\.hidden\)/,"a recent focus/pause boundary must not suppress a genuine visible playing-state stall");
assert.match(r59,/const accepted=state\.lastAcceptedRafTimestamp,hasPreviousAccepted=accepted!==null&&accepted!==undefined&&finite\(accepted\)/,"a null pause-reset timestamp must be treated as no previous RAF rather than timestamp zero");
assert.match(r59,/if\(hasTimestamp&&hasPreviousAccepted&&t<=Number\(accepted\)\)/,"duplicate RAF callbacks must be rejected only when a real previous timestamp exists");
assert.match(r59,/const previous=hasPreviousAccepted\?Number\(accepted\):null/,"the first RAF after a pause/reset must rebase from a fresh 16 ms frame");
assert.doesNotMatch(r59,/finite\(state\.lastAcceptedRafTimestamp\)/,"R59 must never use Number(null) semantics to decide whether an accepted RAF timestamp exists");
assert.match(r59,/requestAnimationFrame\(stableLoopR59\)/,"the authoritative loop must schedule exactly its own singleton callback");
assert.match(r59,/stableLoopR59\.__ccgV141R29Stable=true/,"r59 must retain the r29 stable-loop compatibility marker so older ownership guards accept the new clock owner");
assert.match(r59,/api\.stableLoop=stableLoopR59/,"r59 must replace the r29 exported loop as well as the global loop to prevent an old recovery owner reclaiming it");
assert.match(r59,/normaliseAudioRate\(\)/,"pause boundaries must also normalise any accidentally altered HTML audio playback rate");

// Solo Dungeon alone consumes active visible wall time through bounded canonical
// substeps. The expanded 1080 ms / 24-step budget covers the reproduced ~1 s
// visible stalls while retaining a hard ceiling and 45 ms canonical slices.
assert.match(r59,/const SOLO_MAX_STEP_MS=45;/,"Solo wall-time catch-up must preserve the established maximum canonical update step");
assert.match(r59,/const SOLO_MAX_VISIBLE_FRAME_MS=1080;/,"Solo catch-up must have a hard per-render wall-time budget covering the reproduced post-lifecycle visible gaps");
assert.match(r59,/const SOLO_MAX_STEPS=24;/,"Solo catch-up must retain a hard substep-count budget while preserving 45 ms canonical slices");
assert.match(r59,/window\.CCGLostSizzlerModeRuntime\?\.state\?\.activeId==="dungeon-solo"/,"bounded wall-time substeps must be isolated to the Solo Dungeon controller");
assert.match(r59,/!window\.CCGLostSizzlerSpecialModes\?\.active\?\.type&&!document\.body\?\.dataset\?\.specialMode/,"special modes must be excluded from the Solo wall-time path");
assert.match(r59,/function runSoloUpdates\(elapsed\)/,"r59 must expose one bounded Solo update service rather than install another RAF owner");
assert.match(r59,/bounded=Math\.min\(SOLO_MAX_VISIBLE_FRAME_MS,raw\)/,"active Solo elapsed time must be bounded before catch-up");
assert.match(r59,/while\(remaining>0&&steps<SOLO_MAX_STEPS\)/,"Solo catch-up must stop at its explicit substep budget");
assert.match(r59,/const step=Math\.min\(SOLO_MAX_STEP_MS,remaining\)/,"each Solo substep must remain within the canonical 45 ms maximum");
assert.match(r59,/if\(soloDungeonPlaying\(\)\)[\s\S]*soloHandled=true/,"the authoritative RAF owner must select bounded substeps only for active Solo Dungeon play");
assert.match(r59,/if\(soloHandled\)runSoloUpdates\(gap\);[\s\S]*render\(\)/,"Solo may perform bounded simulation substeps but must still render only once at the RAF boundary");
assert.doesNotMatch(r59,/soloAccumulator|soloDebt/i,"Solo wall-time recovery must not retain a debt accumulator across pause/hidden boundaries");

// R59 owns the callback but R29 remains the established public diagnostic contract.
assert.match(r59,/function noteFault\(phase,error\)/,"r59 must centralise contained-frame fault accounting");
assert.match(r59,/r29\.frameFaults=Number\(r29\.frameFaults\|\|0\)\+1/,"r59 must preserve R29's public frame-fault counter");
assert.match(r59,/if\(phase==="update"\)r29\.updateFaults=Number\(r29\.updateFaults\|\|0\)\+1/,"contained update faults must remain visible through R29 diagnostics");
assert.match(r59,/r29\.lastFaultAt=now;r29\.lastFaultMessage=message/,"r59 must preserve R29's last-fault diagnostic message");
assert.match(r59,/catch\(error\)\{noteFault\("update",error\)\}/,"the R59 update boundary must route contained exceptions through the compatibility accountant");
assert.match(r59,/function noteDuplicateFrame\(\)[\s\S]*r29\.duplicateFramesSkipped=Number\(r29\.duplicateFramesSkipped\|\|0\)\+1/,"duplicate RAF rejection must remain visible through R29's retained duplicate-frame counter");
assert.match(r59,/function noteFrameStall\(\)[\s\S]*r29\.frameStalls=Number\(r29\.frameStalls\|\|0\)\+1/,"long accepted RAF gaps must remain visible through R29's retained frame-stall counter");
assert.match(r59,/function setAcceptedRafTimestamp\(value\)[\s\S]*r29\.lastAcceptedRafTimestamp=value/,"R29's retained accepted-timestamp diagnostic must mirror the R59 clock owner");
assert.match(r59,/if\(gap>=LONG_GAP_MS\)\{noteFrameStall\(\);safeGapRecovery\(gap\)\}/,"R59 must record a public R29 stall before performing the retained combat-gap recovery");

// Floor-entry autosaves must be synchronous at the canonical transition. The
// older click/microtask and 100 ms R43 monitor remain fallbacks, not the primary
// mechanism that determines whether Floor 2 is persisted under load.
assert.match(r59,/function installSoloSaveTransitionOwner\(\)/,"r59 must install a canonical Solo floor-save transition owner");
assert.match(r59,/current=window\.captureFloorEntryCheckpoint/,"the autosave bridge must wrap the checkpoint function already called synchronously by descendFloor");
assert.match(r59,/const checkpoint=current\.apply\(this,arguments\)/,"the canonical checkpoint must be created before the v2 envelope is captured");
assert.match(r59,/if\(checkpoint\)[\s\S]*api\.captureEntry\("autosave"\)/,"a successful floor checkpoint must immediately commit the r43 Solo autosave");
assert.match(r59,/wrapped\.__ccgV141R59SoloAutosave=true/,"the floor-save wrapper must carry an idempotent ownership marker");
assert.match(r59,/installClockOwner\(\);installPauseOwners\(\);installSoloSaveTransitionOwner\(\);reassertR58\(\)/,"the monitor must retain the synchronous floor-save owner if older compatibility layers replace the function");

// R58 remains the final Spy gameplay rules owner.
assert.match(r59,/api\.patchInputOwnership\?\.\(\);api\.patchSaboteurRules\?\.\(\)/,"r59 must reassert r58 input and Saboteur rules while Spy is active");
assert.match(r59,/if\(api\.tick\?\.\(\)\)/,"r59 must keep the r58 live state reconciled after older compatibility monitors run");

console.log("Lost Sizzler V10.41 r59 pause-clock, null RAF rebasing, expanded bounded Solo wall-time substeps, visible-play stall recovery, R29 duplicate/stall/fault diagnostics, synchronous Solo floor autosave, TAB field-kit, idempotent F fullscreen and r58 ownership regressions passed.");
