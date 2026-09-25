import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repoRoot=path.resolve(root,"../..");
const index=fs.readFileSync(path.join(root,"index.html"),"utf8");
const gate=fs.readFileSync(path.join(repoRoot,"js/ccg-play-maintenance-owner-gate.js"),"utf8");
const smoke=fs.readFileSync(path.join(root,"tests/production/v10-41-r47-production-smoke.mjs"),"utf8");

assert.match(index,/ccg-play-maintenance-owner-gate\.js\?v=20260925r58/,"Dungeon page must load the shared owner-preview gate under the current cache token");
assert.match(index,/data-ccg-play-maintenance-gate="owner-preview"/,"Dungeon page must declare owner-preview maintenance ownership");
assert.match(gate,/OWNER_USERNAME = "cheekycommodoregamer"/);
assert.match(gate,/OWNER_DISPLAY_NAME = "cheeky commodore gamer"/);
assert.match(gate,/OWNER_ROLE = "admin"/);
assert.match(gate,/profile\.is_admin === true/,"owner preview must require the authoritative admin flag");
assert.match(gate,/profile\.banned !== true/,"a banned profile must never pass the owner preview");
assert.match(gate,/client\.auth\.getSession\(\)/);
assert.match(gate,/client\.auth\.getUser\(\)/);
assert.match(gate,/window\.location\.replace\(MAINTENANCE_DESTINATION\)/,"ordinary visitors must remain behind maintenance");
assert.match(gate,/Promise\.race\(\[resolveProfile\(\), timeout\]\)/,"owner lookup must remain bounded and fail closed");
assert.match(smoke,/maintenanceExpected/,"production smoke must understand the intentional maintenance gate");
assert.match(smoke,/redirected\.pathname,"\/games\/ccg-games\/"/,"anonymous production smoke must verify the maintenance destination");

console.log("Dungeon Carnage retained owner-only maintenance preview contract passed.");
