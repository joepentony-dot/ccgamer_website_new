import fs from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const gate = fs.readFileSync("js/ccg-play-maintenance-owner-gate.js", "utf8");
const canonicalEntry = fs.readFileSync("arcade/c64-dungeon-carnage/index.html", "utf8");
const legacyEntry = fs.readFileSync("arcade/lost-sizzler/index.html", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260930235811_dungeon_carnage_tester_code_server_validation.sql", "utf8");
const cacheToken = "/js/ccg-play-maintenance-owner-gate.js?v=20261001-tester-gate-v3";

assert(!gate.includes("TESTER_CODE_SHA256"), "tester gate must not ship a client-side code digest");
assert(!gate.includes('sessionStorage.getItem(TESTER_SESSION_KEY) === "allowed"'), "writable sessionStorage must never be treated as authorization");
assert(gate.includes("ccg_validate_dungeon_carnage_tester_code"), "tester code must be server-validated through Supabase");
assert(gate.includes("bootstrapProtectedRuntime"), "validated access must own Dungeon runtime startup");
assert(gate.includes("runtimeAccessGranted = true"), "runtime startup must require an internal validated-access grant");
assert(gate.includes("data-ccg-protected-runtime"), "runtime loader must consume only protected script placeholders");
assert(gate.includes("await validateTesterCodeWithTimeout(storedTesterCode)"), "restored tester sessions must be revalidated with a bounded server check");
assert(gate.includes("Promise.race([isValidTesterCode(value), timeout])"), "tester-code validation must fail closed after the shared auth timeout");
assert(gate.includes("const valid = await validateTesterCodeWithTimeout(candidate)"), "new tester-code submissions must also use bounded server validation");
assert(gate.includes("TESTER_SESSION_KEY"), "tester access may remain browser-session scoped only when revalidated");
assert(gate.includes("ccg_has_dungeon_carnage_playtest_access"), "signed-in assigned members must be checked through the protected playtest-access RPC");
assert(gate.includes('mark("member-playtester")'), "assigned website members must receive an explicit member-playtester access state");
assert(gate.includes('mark("tester-code-required")'), "production visitors must be held at the tester-code gate");
assert(gate.includes('mark("tester-preview")'), "valid tester access must mark the preview as allowed");
assert(gate.includes("ENTER DUNGEON"), "tester gate must present an explicit unlock action");
assert(gate.includes("isOwnerProfile(profile)"), "signed-in owner bypass must remain intact");
assert(migration.includes("vault.decrypted_secrets"), "server validator must read the encrypted Vault secret");
assert(migration.includes("revoke all on function public.ccg_validate_dungeon_carnage_tester_code(text) from public"), "validator must revoke default PUBLIC execution");
assert(migration.includes("grant execute on function public.ccg_validate_dungeon_carnage_tester_code(text) to anon, authenticated"), "validator must grant only the intended API roles");
assert(!migration.includes("ccg_tester"), "repository migration must never contain the live tester code");
assert(canonicalEntry.includes(cacheToken), "canonical Dungeon Carnage entry must load the server-validated tester-gate cache token");
assert(canonicalEntry.includes('type="application/ccg-protected-runtime" data-ccg-protected-runtime src="js/game-main.js'), "canonical runtime must remain inert until validated access");
assert(legacyEntry.includes(cacheToken), "legacy Dungeon Carnage entry must load the server-validated tester-gate cache token");
assert(legacyEntry.includes('type="application/ccg-protected-runtime" data-ccg-protected-runtime src="js/game-main.js'), "legacy runtime must remain inert until validated access");

console.log("Dungeon Carnage server-validated tester-code gate guard passed.");
