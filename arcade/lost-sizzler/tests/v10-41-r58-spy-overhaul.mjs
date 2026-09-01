import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=rel=>fs.readFileSync(path.join(root,rel),"utf8");
const r58=read("js/v10-41-r58-spy-overhaul.js");
const loader=read("js/v10-41-r32-spy-loader.js");

assert.doesNotThrow(()=>new Function(r58),"R58 Spy overhaul must parse");
assert.match(loader,/v10-41-r58-spy-overhaul\.js/,"Spy lazy loader must load R58");
assert.ok(loader.indexOf("v10-41-r58-spy-overhaul.js")>loader.indexOf("v10-41-r45-spy-trap-presentation.js"),"R58 must load after the retained trap presentation layer");
assert.match(r58,/MATCH_MS=10\*60\*1000/,"Spy match must use ten-minute personal clocks");
assert.match(r58,/DEATH_PENALTY_MS=30\*1000/,"Spy deaths must deduct thirty seconds");
assert.match(r58,/String\(placed\.ownerId\)===String\(victim\.id\).*return false/s,"trap owner must be immune to their own trap");
assert.match(r58,/instantDeath:true/,"opponent trap activation must be explicitly lethal");
assert.match(r58,/transferAllCarried\(victim,killer\)/,"death must transfer carried Spy kit to the killer");
assert.match(r58,/String\(room\.id\)!==deathRoom/,"respawn selection must reject the death room");
assert.match(r58,/String\(room\.id\)!==String\(killer\?\.roomId/,"respawn selection must reject the killer's room");
assert.match(r58,/m\.state="match-complete"/,"timer/extraction resolution must end the whole match, not a round");
assert.match(r58,/m\.roundEndsAt=Number\.MAX_SAFE_INTEGER/,"legacy four-minute round expiry must be neutralised");
assert.match(r58,/m\.trapLoadout=\[\.\.\.CLASSIC_TRAPS\]/,"R58 must retain only the classic Spy trap kit");
assert.match(r58,/SOLO_ARRAYS/,"Spy must own an explicit Solo-state purge list");
assert.match(r58,/clearArray\(host,"doors",row=>Boolean\(row\?\.spyR32Door\|\|row\?\.spyDoor\)\)/,"Spy doors must be whitelisted");
assert.match(r58,/clearArray\(host,"blockingDecor",row=>Boolean\(row\?\.spyR32Furniture\|\|row\?\.spyFurniture\)\)/,"Spy furniture must be whitelisted");
assert.match(r58,/\["KeyT","KeyX"\]/,"R58 must bypass the stale immediate-stop only for Spy trap/extraction actions");
assert.match(r58,/spy-r58-ghost-shape/,"lethal Spy events must have a silhouette ghost presentation");
assert.match(r58,/RESPAWNING ELSEWHERE/,"death presentation must communicate remote respawn");

console.log("Lost Sizzler V10.41 r58 Spy overhaul static regression passed.");
