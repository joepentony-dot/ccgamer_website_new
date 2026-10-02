import fs from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const gate = fs.readFileSync("js/ccg-play-maintenance-owner-gate.js", "utf8");
const canonicalEntry = fs.readFileSync("arcade/c64-dungeon-carnage/index.html", "utf8");
const legacyEntry = fs.readFileSync("arcade/lost-sizzler/index.html", "utf8");
const migration = fs.readFileSync("supabase/migrations/20261002203000_dungeon_carnage_beta_round2_closed_cohort.sql", "utf8");
const cacheToken = "/js/ccg-play-maintenance-owner-gate.js?v=20261002-round2-v1";
const gameCore = fs.readFileSync("arcade/lost-sizzler/js/game-core.js", "utf8");

assert(!gate.includes("TESTER_SESSION_KEY"), "Round 2 must not retain tester-code session authorization");
assert(!gate.includes("ccg_validate_dungeon_carnage_tester_code"), "Round 2 browser gate must not call the invited-code validator");
assert(!gate.includes("validateTesterCodeWithTimeout"), "Round 2 browser gate must not expose tester-code validation");
assert(!gate.includes("tester-preview"), "Round 2 must not admit invited-code tester sessions");
assert(!gate.includes("TESTER ACCESS CODE"), "Round 2 denial UI must not render a tester-code field");
assert(gate.includes("ccg_has_dungeon_carnage_playtest_access"), "signed-in Round 2 members must be checked server-side");
assert(gate.includes('mark("member-playtester")'), "assigned Round 2 members must receive the member-playtester state");
assert(gate.includes('mark("round2-member-required")'), "non-members must be held at the closed Round 2 gate");
assert(gate.includes("Current Members Only"), "closed gate must explain that Round 2 is for current website members");
assert(gate.includes("previous tester codes cannot be added"), "closed gate must explain that the first-round code path is retired");
assert(gate.includes("SIGN IN AS AN ASSIGNED MEMBER"), "closed gate must direct assigned members to sign in");
assert(gate.includes("bootstrapProtectedRuntime"), "validated member access must still own Dungeon runtime startup");
assert(gate.includes("runtimeBoundaryReached"), "protected runtime startup must still wait for the parser boundary");
assert(gate.includes("data-ccg-protected-runtime"), "runtime loader must consume only protected script placeholders");
assert(gate.includes("runtimeAccessGranted = true"), "runtime startup must require an internal validated-access grant");
assert(gate.includes("isOwnerProfile(profile)"), "signed-in owner bypass must remain intact");
assert(gameCore.includes("var UI=window.UI={"), "protected runtime must preserve the canonical global UI binding");

assert(migration.includes("select false;"), "server-side historical tester-code RPC must fail closed during Round 2");
assert(migration.includes("revoke all on function public.ccg_validate_dungeon_carnage_tester_code(text) from anon"), "Round 2 must revoke anonymous execution of the retired code RPC");
assert(migration.includes("revoke all on function public.ccg_validate_dungeon_carnage_tester_code(text) from authenticated"), "Round 2 must revoke signed-in execution of the retired code RPC");
assert(canonicalEntry.includes(cacheToken), "canonical Dungeon Carnage entry must load the closed Round 2 gate cache token");
assert(canonicalEntry.includes('type="application/ccg-protected-runtime" data-ccg-protected-runtime src="js/game-main.js'), "canonical runtime must remain inert until member access is validated");
assert(canonicalEntry.includes("data-ccg-runtime-boundary"), "canonical entry must retain the protected-runtime parser boundary");
assert(legacyEntry.includes(cacheToken), "legacy Dungeon Carnage entry must load the same closed Round 2 gate cache token");
assert(legacyEntry.includes('type="application/ccg-protected-runtime" data-ccg-protected-runtime src="js/game-main.js'), "legacy runtime must remain inert until member access is validated");

console.log("Dungeon Carnage closed Round 2 access gate guard passed.");
