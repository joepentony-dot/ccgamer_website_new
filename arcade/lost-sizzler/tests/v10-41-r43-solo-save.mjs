import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-41-r43-solo-save.js"),"utf8");
const loader=fs.readFileSync(path.join(root,"js/v10-41-lake-item-safety.js"),"utf8");

assert.match(loader,/load\("js\/v10-41-r42-solo-live-recovery\.js","data-ccg-v141-r42-solo-live-recovery"\);[\s\S]*load\("js\/v10-41-r43-solo-save\.js","data-ccg-v141-r43-solo-save"\);/,"r43 Solo save must load after the merged r42 recovery guard");
assert.match(source,/__CCG_LOST_SIZZLER_V141_R43_SOLO_SAVE__/,"r43 must own a unique runtime marker");
assert.match(source,/window\.CCGLostSizzlerV141R43SoloSave=/,"r43 must expose a dedicated diagnostics API");
assert.doesNotMatch(source,/__CCG_LOST_SIZZLER_V141_R42_SOLO_LIVE_RECOVERY__\s*=/,"r43 must not overwrite the r42 recovery marker");
assert.doesNotMatch(source,/window\.CCGLostSizzlerV141R42SoloLiveRecovery\s*=/,"r43 must not replace the r42 recovery API");

assert.match(source,/ccg-lost-sizzler-v10-41-solo-save-v2/,"Solo saving must use a new versioned storage slot");
assert.match(source,/const SCHEMA="ccg-lost-sizzler-solo-save"/,"Solo save records must use the published schema");
assert.match(source,/const VERSION=2/,"Solo save schema must be version 2");
assert.match(source,/const RESUME_POLICY="floor_entry"/,"save records must declare floor-entry resume semantics");
assert.match(source,/schema:SCHEMA,version:VERSION,resumePolicy:RESUME_POLICY/,"persisted saves must publish schema, version and resume policy");
assert.match(source,/runFloor!==floor/,"validation must reject a save whose advertised floor disagrees with the run snapshot");
assert.match(source,/!Number\.isFinite\(savedScore\)\|\|savedScore<0/,"validation must reject an invalid saved score");
assert.match(source,/removeInvalid:true/,"invalid or malformed current save records must be removed instead of retried forever");
assert.match(source,/state\.corruptClears\+\+/,"corrupt-save cleanup must be diagnosable");

assert.match(source,/run\.daily\|\|p2\|\|String\(playMode\|\|""\)!=="solo"/,"ownership must reject Weekly Vault, Split Screen and non-Solo play modes");
assert.match(source,/specialMode\(\)\|\|tutorialOwned\(\)\|\|document\.body\?\.dataset\?\.hordeSolo==="true"/,"ownership must reject special modes, Tutorial and Horde Solo state");
assert.match(source,/if\(networkConnected\(\)\)return false/,"ownership must reject a connected multiplayer network");
assert.match(source,/tutorial\?\.active\|\|tutorial\?\.tutorialRequested\|\|tutorial\?\.forceTutorial/,"Tutorial state must be detected through the onboarding owner as well as DOM state");
assert.match(source,/makeCheckpoint\?\.\(run,p1,null,score,"solo"\)/,"Floor 1 autosave must reuse the established serialisable checkpoint shape");
assert.match(source,/localStorage\.setItem\(STORAGE_KEY,JSON\.stringify\(copy\)\)/,"ordinary Solo saving must persist locally without requiring an account");

assert.match(source,/Continue Saved Run — Floor \$\{data\.floor\}/,"title screen must expose a visible Continue Saved Run action");
assert.match(source,/solo\.textContent="New Solo Run"/,"a stored checkpoint must distinguish New Solo Run from Continue");
assert.match(source,/Starting a New Solo Run replaces this save/,"menu copy must warn that a new Solo run replaces the old save");
assert.match(source,/button\.textContent="Save & Quit"/,"pause flow must expose Save & Quit");
assert.match(source,/Progress made since entering this floor is not included/,"Save & Quit must disclose floor-entry rather than mid-room semantics");
assert.match(source,/entryForExit\(\)/,"Save & Quit must use an existing safe floor-entry snapshot");
assert.match(source,/Your current run has not been closed/,"storage failure must keep the live run open");

assert.match(source,/record\.attributeName==="data-run-active"[\s\S]*scheduleActivationCapture\(\)/,"Floor 1 autosave must be driven by canonical run activation");
assert.match(source,/captureFloorEntryCheckpoint=function\(\)/,"later floor-entry autosaves must use the established floor transition hook");
assert.match(source,/persistCheckpoint\(checkpoint,"floor_entry",true\)/,"later floor entry must persist automatically");
assert.match(source,/if\(soloRunActive\(\)&&!restPrompt\)return false/,"automatic Solo saving must suppress the old interrupting entry prompt while preserving the rest prompt");
assert.match(source,/event\.stopImmediatePropagation\(\);resume\(\)/,"r43 Continue must take ownership before the legacy Floor-2-only handler");
assert.match(source,/endRun=function\(\)/,"genuine Solo run completion/failure must own save cleanup");
assert.match(source,/mode==="ended"/,"lifecycle monitor must provide fallback cleanup for an ended Solo run");

assert.match(source,/LEGACY_V1_KEY="ccg-lost-sizzler-v10-41-solo-save-v1"/,"r43 must recognise the interrupted v1 save slot");
assert.match(source,/v1_migration/,"r43 must migrate compatible v1 saves");
assert.match(source,/v10_3_migration/,"r43 must migrate compatible legacy V10.3 checkpoints");
assert.match(source,/removeStorageKey\(STORAGE_KEY\);removeStorageKey\(LEGACY_V1_KEY\)/,"ending a run must retire both current and interrupted-development save slots");
assert.match(source,/PGR\?\.clearCheckpoint\?\.\(\)/,"successful migration/end cleanup must retire the legacy V10.3 slot");

assert.doesNotMatch(source,/ccgSupabase|functions\.invoke|\.from\(/,"local Solo saving must not add a Supabase dependency");
assert.doesNotMatch(source,/net\?*\.send|broadcastWorld|colyseus/i,"local Solo saving must not alter gameplay transport");
assert.doesNotMatch(source,/\.hidden\s*\{\s*display\s*:\s*none\s*!important/,"r43 must not inject a global hidden-class override");
assert.doesNotMatch(source,/style\.textContent|createElement\("style"\)/,"r43 save behavior must not add runtime CSS ownership");

console.log("V10.41 r43 Solo save/continue static regression checks passed.");
