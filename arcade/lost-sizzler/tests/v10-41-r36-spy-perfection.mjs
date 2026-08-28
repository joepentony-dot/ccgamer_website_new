import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=name=>fs.readFileSync(path.join(root,"js",name),"utf8");
const loader=read("v10-41-r32-spy-loader.js");
const source=read("v10-41-r36-spy-perfection.js");

assert.match(loader,/v10-41-r36-spy-perfection\.js/,"Spy lazy loader must load the r36 perfection finalizer");
assert.match(loader,/perfectionLoaded:true|perfectionLoaded=false|perfectionLoaded:false/,"Spy loader must expose r36 load state");
assert.match(source,/spy-r36-return/,"Spy item inventory must expose an explicit Return to Game control");
assert.match(source,/closeInventory/,"r36 must own a safe inventory exit helper");
assert.match(source,/_meleeSwingAt/,"Spy attack presentation must drive the shared melee animation state");
assert.match(source,/repairDoors/,"r36 must repair the Spy door opening lifecycle");
assert.match(source,/respawnRepairs/,"r36 must reconcile ghost respawn state into the physical player");
assert.match(source,/reconcileRemoteTraps/,"r36 must reconcile traps against remote Player 2 movement");
assert.match(source,/spy-r36-searchline/,"Trapulator must expose live search state");
assert.match(source,/spy-r36-armedline/,"Trapulator must expose persistent armed-trap state");
assert.match(source,/gap<210/,"desktop rail must stay hidden unless measured spare width exists");
assert.doesNotMatch(source,/window\.update\s*=|window\.render\s*=/,"r36 must not acquire shared update/render ownership");

console.log("Lost Sizzler r36 Spy perfection static contracts passed.");
