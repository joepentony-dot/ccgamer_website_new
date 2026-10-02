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

assert.match(index,/ccg-play-maintenance-owner-gate\.js\?v=20261002-round2-v1/,"Dungeon page must load the closed Round 2 member gate under the current cache token");
assert.match(index,/data-ccg-play-maintenance-gate="owner-preview"/,"Dungeon page must retain the maintenance-preview ownership marker");
assert.match(gate,/OWNER_USERNAME = "cheekycommodoregamer"/);
assert.match(gate,/OWNER_DISPLAY_NAME = "cheeky commodore gamer"/);
assert.match(gate,/OWNER_ROLE = "admin"/);
assert.match(gate,/profile\.is_admin === true/,"owner preview must require the authoritative admin flag");
assert.match(gate,/profile\.banned !== true/,"a banned profile must never pass the owner preview");
assert.match(gate,/client\.auth\.getSession\(\)/);
assert.match(gate,/client\.auth\.getUser\(\)/);
assert.match(gate,/ccg_has_dungeon_carnage_playtest_access/,"assigned website members must resolve playtest access through the protected entitlement RPC");
assert.match(gate,/mark\("member-playtester"\)/,"assigned members must receive the member-playtester access state");
assert.match(gate,/showMemberGate\(\)/,"ordinary production visitors must receive the closed Round 2 member gate");
assert.match(gate,/bootstrapProtectedRuntime/,"validated access must control runtime startup");
assert.match(index,/type="application\/ccg-protected-runtime" data-ccg-protected-runtime src="js\/game-main\.js/,"game-main must remain inert until access is granted");
assert.match(gate,/mark\("round2-member-required"\)/,"the closed Round 2 gate must publish an explicit blocked state");
assert.match(gate,/Promise\.race\(\[resolveAccountAccess\(\), timeout\]\)/,"account access lookup must remain bounded before the closed member gate is shown");
assert.match(smoke,/maintenanceExpected/,"production smoke must understand the intentional maintenance gate");
assert.match(smoke,/ccg-member-beta-access-gate/,"anonymous production smoke must verify the closed Round 2 member gate");

console.log("Dungeon Carnage retained owner + closed Round 2 member preview contract passed.");
