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

assert.match(index,/ccg-play-maintenance-owner-gate\.js\?v=20261001-tester-gate-v3/,"Dungeon page must load the shared invited-preview gate under the current cache token");
assert.match(index,/data-ccg-play-maintenance-gate="owner-preview"/,"Dungeon page must retain the maintenance-preview ownership marker");
assert.match(gate,/OWNER_USERNAME = "cheekycommodoregamer"/);
assert.match(gate,/OWNER_DISPLAY_NAME = "cheeky commodore gamer"/);
assert.match(gate,/OWNER_ROLE = "admin"/);
assert.match(gate,/profile\.is_admin === true/,"owner preview must require the authoritative admin flag");
assert.match(gate,/profile\.banned !== true/,"a banned profile must never pass the owner preview");
assert.match(gate,/client\.auth\.getSession\(\)/);
assert.match(gate,/client\.auth\.getUser\(\)/);
assert.match(gate,/ccg_validate_dungeon_carnage_tester_code/,"invited preview must validate tester codes through the server RPC");
assert.match(gate,/await validateTesterCodeWithTimeout\(storedTesterCode\)/,"restored tester sessions must be revalidated through a bounded server check");
assert.match(gate,/Promise\.race\(\[isValidTesterCode\(value\), timeout\]\)/,"tester-code validation must fail closed on timeout");
assert.match(gate,/ccg_has_dungeon_carnage_playtest_access/,"assigned website members must resolve playtest access through the protected entitlement RPC");
assert.match(gate,/mark\("member-playtester"\)/,"assigned members must receive the member-playtester access state");
assert.match(gate,/showTesterGate\(\)/,"ordinary production visitors must receive the invited tester-code gate");
assert.match(gate,/bootstrapProtectedRuntime/,"validated access must control runtime startup");
assert.match(index,/type="application\/ccg-protected-runtime" data-ccg-protected-runtime src="js\/game-main\.js/,"game-main must remain inert until access is granted");
assert.match(gate,/mark\("tester-code-required"\)/,"the tester gate must publish an explicit blocked state");
assert.match(gate,/mark\("tester-preview"\)/,"successful tester access must publish an allowed state");
assert.match(gate,/Promise\.race\(\[resolveAccountAccess\(\), timeout\]\)/,"account access lookup must remain bounded before tester-code fallback");
assert.match(smoke,/maintenanceExpected/,"production smoke must understand the intentional maintenance gate");
assert.match(smoke,/ccg-tester-access-gate/,"anonymous production smoke must verify the invited tester-code gate");

console.log("Dungeon Carnage retained owner + member-playtester + tester-code preview contract passed.");
