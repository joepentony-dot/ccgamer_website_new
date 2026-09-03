import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-41-r43-solo-save-continue.js"),"utf8");
const loader=fs.readFileSync(path.join(root,"js/v10-41-lake-item-safety.js"),"utf8");

assert.match(loader,/v10-41-r43-solo-save-continue\.js/,"late runtime loader must publish r43 Solo save/continue");
assert.match(source,/SCHEMA_VERSION=2/,"Solo saves must use an explicit versioned schema");
assert.match(source,/ccg-lost-sizzler-solo-save-v2/,"Solo saves must use a dedicated current slot");
assert.match(source,/ccg-lost-sizzler-solo-save-v2-backup/,"Solo saves must keep a separate recovery slot");
assert.match(source,/checksum:hashText/,"save envelope must include an integrity checksum");
assert.match(source,/hashText\(JSON\.stringify\(payload\)\)!==String\(checksum\)/,"load path must reject checksum mismatches");
assert.match(source,/const primary=readSlot\(PRIMARY_KEY\);if\(primary\)return primary;[\s\S]*const backup=readSlot\(BACKUP_KEY\)/,"load path must prefer primary and fall back to backup");

assert.match(source,/const soloSaveOwner=\(\)=>[\s\S]*run&&!run\.daily&&p1&&!p2&&String\(playMode\|\|""\)==="solo"&&!net\?\.connected/,"r43 ownership must be standard Solo only");
assert.match(source,/tutorialOwned\(\)/,"Tutorial must be excluded from r43 ownership");
assert.match(source,/ACTIVE_SPECIAL_MODES/,"special multiplayer modes must be excluded");
assert.match(source,/document\.body\?\.dataset\?\.hordeSolo!=="true"/,"Horde Solo presentation must not be mistaken for Dungeon Solo");
assert.match(source,/const standardSolo=\(\)=>[\s\S]*!run\?\.runComplete&&String\(mode\|\|""\)!=="ended"/,"completed or ended Solo runs must be excluded from autosave ownership");
assert.doesNotMatch(source,/\.send\s*\(/,"save system must not send gameplay network packets");
assert.doesNotMatch(source,/supabase/i,"local Solo save layer must not acquire Supabase ownership");

assert.match(source,/onRunPresentation[\s\S]*ensureEntryCaptured/,"new Solo runs must capture a Floor 1 entry checkpoint");
assert.match(source,/interceptDescend[\s\S]*after<=before[\s\S]*captureEntry\("autosave"\)/,"real floor descent must autosave the new floor entry");

// Automatic Floor 2+ entry prompts are retired by the autosave model. R43 must
// retain top-level ownership even if a later compatibility layer replaces the
// global function, but the five-death/rest prompt must remain available.
assert.match(source,/function installOfferFloorSaveOwner\(\)/,"r43 must expose an idempotent top-level offerFloorSave owner");
assert.match(source,/if\(current\.__ccgV141R43AutoSaveOwner===true\)return true/,"r43 must avoid repeatedly wrapping its own current owner");
assert.match(source,/wrapped=function offerFloorSaveV141R43Owned\(restPrompt=false\)/,"r43 must install a named automatic-floor-prompt owner");
assert.match(source,/if\(!restPrompt&&standardSolo\(\)\)[\s\S]*ensureEntryCaptured\(\);suppressAutomaticFloorPrompt\(\);return false/,"ordinary Solo floor-entry prompt must be retired after autosave");
assert.match(source,/return current\.apply\(this,arguments\)/,"five-death/rest prompt and non-Solo owners must retain the current underlying behavior");
assert.match(source,/wrapped\.__ccgV141R43AutoSaveOwner=true;wrapped\.__ccgOriginal=current/,"r43 floor-prompt ownership must carry an idempotent ancestry marker");
assert.match(source,/state\.timer=setInterval\(\(\)=>\{[\s\S]*installOfferFloorSaveOwner\(\)/,"the r43 monitor must reassert floor-prompt ownership after later compatibility installers");
assert.match(source,/function automaticPromptActive\(\)[\s\S]*reason==="rest"\)return false/,"the stale-prompt repair must never dismiss the legitimate five-death/rest prompt");
assert.match(source,/function suppressAutomaticFloorPrompt\(\)[\s\S]*savePromptReason=""[\s\S]*mode="playing"/,"a stale autosaved floor-entry prompt must return standard Solo to playing mode");
assert.match(source,/savedCurrentFloor\(\)/,"automatic prompt cleanup must require a save for the current floor");

// The core still owns a delayed legacy entry-prompt timer. The capture-phase
// descent bridge must therefore perform a bounded post-click settle after that
// timer's 120 ms deadline rather than depend solely on the 100 ms monitor.
assert.match(source,/const FLOOR_ENTRY_SETTLE_DELAYS=\[0,140,320\]/,"r43 must schedule a bounded settle pass after the core 120 ms entry-prompt timer");
assert.match(source,/function settleFloorEntryPrompt\(\)[\s\S]*installOfferFloorSaveOwner\(\);ensureEntryCaptured\(\);[\s\S]*suppressAutomaticFloorPrompt\(\)/,"each floor-entry settle must restore autosave ownership before suppressing a stale prompt");
assert.match(source,/function scheduleFloorEntryPromptSettle\(\)[\s\S]*for\(const delay of FLOOR_ENTRY_SETTLE_DELAYS\)[\s\S]*setTimeout/,"floor-entry settling must be bounded to the declared delay list");
assert.match(source,/interceptDescend[\s\S]*captureEntry\("autosave"\);installOfferFloorSaveOwner\(\);suppressAutomaticFloorPrompt\(\);scheduleFloorEntryPromptSettle\(\)/,"real Solo descent must arm deterministic post-timer prompt settling");

assert.match(source,/save-quit-solo-btn/,"Pause must expose a dedicated Save & Quit action");
assert.match(source,/writeEnvelope\(state\.entryCheckpoint,"save_quit"\)/,"Save & Quit must persist the floor-entry snapshot, not live mid-room state");
assert.match(source,/setTimeout\(\(\)=>\{try\{quitToMenu\?\.\(\)/,"Save & Quit must return through the canonical menu cleanup path only after save succeeds");
assert.match(source,/resumeSolo[\s\S]*startWorld\(PGR\.floorSeed\(run\),false,true,true\)/,"Continue must rebuild the deterministic floor in checkpoint-restore mode");
assert.doesNotMatch(source,/Number\(saved\.floor[^\n]*<=1/,"r43 Continue must support Floor 1 saves");

assert.match(source,/legacy_migration/,"legacy Solo checkpoints must be migratable");
assert.match(source,/if\(checkpointIsSolo\(data\)\)return writeEnvelope[\s\S]*return original\.saveCheckpointData\(data\)/,"non-Solo legacy checkpoint writes must remain on their existing path");
assert.match(source,/if\(soloSaveOwner\(\)\)[\s\S]*clearSoloSave\(\)[\s\S]*return original\.clearCheckpoint\(\)/,"Solo completion must still clear the v2 save even after autosave ownership has ended");
assert.match(source,/Continue Solo — Floor/,"Continue button must expose the saved floor");
assert.match(source,/Saved run: Floor/,"menu must expose save metadata");

console.log("V10.41 r43 Solo save/continue and deterministic automatic floor-prompt ownership contract passed.");
