import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-41-r42-solo-save.js"),"utf8");
const loader=fs.readFileSync(path.join(root,"js/v10-41-lake-item-safety.js"),"utf8");

assert.match(loader,/load\("js\/v10-41-r42-solo-save\.js","data-ccg-v141-r42-solo-save"\)/,"r42 Solo save must load through the release-tokened late loader");
assert.match(source,/ccg-lost-sizzler-v10-41-solo-save-v1/,"Solo saves must use their own versioned storage slot");
assert.match(source,/schema:SCHEMA,version:VERSION/,"Solo save records must publish a schema and version");
assert.match(source,/run&&!run\.daily&&!p2&&playMode==="solo"&&!specialMode\(\)/,"save ownership must be limited to ordinary Solo Dungeon");
assert.match(source,/soloRunOwned\(\)&&p1&&document\.body\?\.dataset\?\.runActive==="true"/,"save capture must require a live ordinary Solo player");
assert.match(source,/makeCheckpoint\?\.\(run,p1,null,score,"solo"\)/,"save capture must reuse the established serialisable checkpoint shape");
assert.match(source,/localStorage\.setItem\(STORAGE_KEY,JSON\.stringify\(copy\)\)/,"Solo checkpoint must persist locally without requiring an account");
assert.match(source,/Continue Saved Run — Floor \$\{data\.floor\}/,"title screen must expose a visible Continue Saved Run action");
assert.match(source,/Save & Quit/,"pause flow must expose an explicit Save & Quit action");
assert.match(source,/Progress made since entering this floor is not included/,"pause flow must state the floor-entry checkpoint limitation rather than implying a mid-room quick save");
assert.match(source,/record\.attributeName==="data-run-active"[\s\S]*document\.body\.dataset\.runActive==="true"\)scheduleFreshSoloCapture\(\)/,"new Solo autosave must be owned by the canonical active-run lifecycle rather than click bubbling");
assert.match(source,/captureFreshSoloStart\(\)[\s\S]*finiteInt\(run\?\.floor,0\)!==1/,"fresh-run lifecycle capture must be limited to Floor 1");
assert.match(source,/currentSaveMatchesActiveFloor\(\)/,"resume must not overwrite an existing checkpoint for the same run and floor");
assert.match(source,/captureFloorEntryCheckpoint=function\(\)\{if\(soloRunActive\(\)\)return capture\("floor_entry",true\)/,"later floor-entry checkpoints must autosave through the established floor transition hook");
assert.match(source,/if\(soloRunActive\(\)&&!restPrompt\)return false/,"automatic Solo floor saves must replace the old interrupting floor-entry save prompt");
assert.match(source,/event\.stopImmediatePropagation\(\);resume\(\)/,"new Continue action must take ownership before the legacy Floor-2-only resume handler");
assert.match(source,/endRun=function\(\)\{const shouldClear=soloRunOwned\(\)/,"completed or failed Solo runs must clear the resumable checkpoint even if player state has already been torn down");
assert.match(source,/legacy_migration/,"existing compatible Solo checkpoints must be migrated instead of discarded");
assert.doesNotMatch(source,/ccgSupabase|functions\.invoke|from\(/,"r42 local Solo saving must not add a Supabase dependency");
assert.doesNotMatch(source,/net\.send|broadcast|colyseus/i,"r42 local Solo saving must not alter multiplayer transport");
assert.doesNotMatch(source,/\.hidden\{display:none!important\}/,"r42 must not inject a global hidden-class override");

console.log("V10.41 r42 Solo save/continue regression checks passed.");
