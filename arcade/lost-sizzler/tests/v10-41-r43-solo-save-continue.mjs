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
assert.match(source,/offerFloorSaveV141R43[\s\S]*!restPrompt&&standardSolo\(\)/,"ordinary Solo floor-entry prompt must be retired after autosave");
assert.match(source,/return original\.offerFloorSave\(restPrompt\)/,"five-death/rest prompt must retain legacy behavior");

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

console.log("V10.41 r43 Solo save/continue static contract passed.");
