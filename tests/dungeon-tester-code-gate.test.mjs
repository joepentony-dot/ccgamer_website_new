import fs from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const gate = fs.readFileSync("js/ccg-play-maintenance-owner-gate.js", "utf8");
const canonicalEntry = fs.readFileSync("arcade/c64-dungeon-carnage/index.html", "utf8");
const legacyEntry = fs.readFileSync("arcade/lost-sizzler/index.html", "utf8");
const migration = fs.readFileSync("supabase/migrations/20260930235811_dungeon_carnage_tester_code_server_validation.sql", "utf8");
const cacheToken = "/js/ccg-play-maintenance-owner-gate.js?v=20261002-tester-gate-v4";
const gameCore = fs.readFileSync("arcade/lost-sizzler/js/game-core.js", "utf8");
const retiredLobby = fs.readFileSync("arcade/lost-sizzler/js/v10-6-runtime.js", "utf8");
const retiredMultiplayerSync = fs.readFileSync("arcade/lost-sizzler/js/v10-31-multiplayer-sync.js", "utf8");
const stalkerShop = fs.readFileSync("arcade/lost-sizzler/js/v10-6-stalker-shop-balance.js", "utf8");

assert(!gate.includes("TESTER_CODE_SHA256"), "tester gate must not ship a client-side code digest");
assert(!gate.includes('sessionStorage.getItem(TESTER_SESSION_KEY) === "allowed"'), "writable sessionStorage must never be treated as authorization");
assert(gate.includes("ccg_validate_dungeon_carnage_tester_code"), "tester code must be server-validated through Supabase");
assert(gate.includes("bootstrapProtectedRuntime"), "validated access must own Dungeon runtime startup");
assert(gate.includes("runtimeBoundaryReached"), "protected runtime startup must wait until the parser has reached the complete runtime block");
assert(gate.includes("runtimeBoundaryReady"), "the gate must expose an explicit parser-boundary handshake");
assert(gate.includes("bootstrapProtectedRuntimeDuringParse"), "parser-boundary startup must use a dedicated parser-blocking path");
assert(gate.includes("document.write(markup"), "parser-boundary startup must keep protected scripts ahead of the real DOM-ready event");
assert(gate.includes("runtimeParserBootComplete"), "parser-blocking startup must signal completion only after the protected script block has executed");
assert(gameCore.includes("var UI=window.UI={"), "protected runtime must preserve a classic global UI binding while mirroring it onto window");
assert(gameCore.includes("var net=window.net=null;"), "protected runtime must preserve one classic mutable net binding while mirroring it onto window");
assert(retiredLobby.includes("const UI=window.UI||null,net=window.net||null;"), "retired V10.6 online lobby must bind only to the canonical delayed-runtime surfaces");
assert(retiredLobby.includes("retired-online-runtime-unavailable"), "retired V10.6 online lobby must fail closed when the network shell is unavailable");
assert(retiredMultiplayerSync.includes("const net=window.net||null;"), "retired multiplayer sync must use the canonical delayed-runtime network surface");
assert(retiredMultiplayerSync.includes("retired-online-runtime-unavailable"), "retired multiplayer sync must fail closed rather than revive online scope");
assert(stalkerShop.includes("const UI=window.UI||null;"), "active Stalker/shop balance layer must bind explicitly to the canonical UI surface");
assert(gate.includes("runtimeAccessGranted = true"), "runtime startup must require an internal validated-access grant");
assert(gate.includes("data-ccg-protected-runtime"), "runtime loader must consume only protected script placeholders");
assert(gate.includes('const deferredUntilCore = ["version-check.js","v10-41-cache-guard.js","v10-41-load-watchdog.js","v10-23-tutorial-guidance.js"]'), "late protected bootstrap must defer readiness-sensitive loaders until the canonical core exists");
assert(gate.includes('const gameMainIndex = placeholders.findIndex((node) => sourceName(node) === "game-main.js")'), "protected bootstrap must establish an explicit game-main phase boundary");
assert(gate.includes('orderedPlaceholders = [...throughGameMain, ...deferredNodes, ...afterGameMain]'), "readiness-sensitive loaders must execute only after the canonical game core/main phase");
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
assert(canonicalEntry.includes("data-ccg-runtime-boundary"), "canonical entry must signal the end of the protected runtime while the parser is still active");
assert(legacyEntry.includes(cacheToken), "legacy Dungeon Carnage entry must load the server-validated tester-gate cache token");
assert(legacyEntry.includes('type="application/ccg-protected-runtime" data-ccg-protected-runtime src="js/game-main.js'), "legacy runtime must remain inert until validated access");
assert(legacyEntry.includes("data-ccg-runtime-boundary"), "legacy entry must signal the same protected-runtime parser boundary");

console.log("Dungeon Carnage server-validated tester-code gate guard passed.");
