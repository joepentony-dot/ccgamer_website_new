import fs from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const gate = fs.readFileSync("js/ccg-play-maintenance-owner-gate.js", "utf8");
const canonicalEntry = fs.readFileSync("arcade/c64-dungeon-carnage/index.html", "utf8");
const legacyEntry = fs.readFileSync("arcade/lost-sizzler/index.html", "utf8");
const round2Migration = fs.readFileSync("supabase/migrations/20261002203000_dungeon_carnage_beta_round2_closed_cohort.sql", "utf8");
const publicMigration = fs.readFileSync("supabase/migrations/20261007034000_dungeon_carnage_public_24h_playtest_link.sql", "utf8");
const cacheToken = "/js/ccg-play-maintenance-owner-gate.js?v=20261007-public24h-v1";
const gameCore = fs.readFileSync("arcade/lost-sizzler/js/game-core.js", "utf8");

assert(!gate.includes("TESTER_SESSION_KEY"), "public playtest must not revive the retired tester-code session path");
assert(!gate.includes("ccg_validate_dungeon_carnage_tester_code"), "browser gate must not call the retired invited-code validator");
assert(!gate.includes("validateTesterCodeWithTimeout"), "browser gate must not expose legacy tester-code validation");
assert(!gate.includes("tester-preview"), "retired invited-code tester sessions must remain disabled");
assert(!gate.includes("TESTER ACCESS CODE"), "denial UI must not render the historical tester-code field");
assert(gate.includes("ccg_validate_dungeon_carnage_public_playtest"), "the share link must be validated by the server-side public-playtest RPC");
assert(gate.includes('PUBLIC_PLAYTEST_PARAM = "playtest"'), "the public share link must use the dedicated playtest query parameter");
assert(gate.includes('mark("public-24h-playtest")'), "valid public links must receive a distinct public playtest gate state");
assert(gate.includes('dispatchAllowed("public-24h-playtest")'), "valid public links must be allowed to start the protected runtime");
assert(gate.includes("ccg_has_dungeon_carnage_playtest_access"), "existing signed-in member access must remain server-side");
assert(gate.includes('mark("member-playtester")'), "existing assigned members must retain their member-playtester state");
assert(gate.includes("public-playtest-expired"), "expired public links must fail closed with an explicit expired state");
assert(gate.includes("24-Hour Playtest Ended"), "expired public links must explain why access ended");
assert(gate.includes("SIGN IN AS AN ASSIGNED MEMBER"), "existing member sign-in fallback must remain available");
assert(gate.includes("bootstrapProtectedRuntime"), "validated member access must still own Dungeon runtime startup");
assert(gate.includes("runtimeBoundaryReached"), "protected runtime startup must still wait for the parser boundary");
assert(gate.includes("data-ccg-protected-runtime"), "runtime loader must consume only protected script placeholders");
assert(gate.includes("runtimeAccessGranted = true"), "runtime startup must require an internal validated-access grant");
assert(gate.includes("isOwnerProfile(profile)"), "signed-in owner bypass must remain intact");
assert(gameCore.includes("var UI=window.UI={"), "protected runtime must preserve the canonical global UI binding");

assert(round2Migration.includes("select false;"), "historical tester-code RPC must remain failed closed");
assert(round2Migration.includes("revoke all on function public.ccg_validate_dungeon_carnage_tester_code(text) from anon"), "historical tester-code anonymous execution must remain revoked");
assert(round2Migration.includes("revoke all on function public.ccg_validate_dungeon_carnage_tester_code(text) from authenticated"), "historical tester-code signed-in execution must remain revoked");
assert(publicMigration.includes("duration_seconds integer not null default 86400"), "public playtest duration must default to exactly 24 hours");
assert(publicMigration.includes("activated_at is null"), "the 24-hour window must begin on first successful validation rather than at migration time");
assert(publicMigration.includes("make_interval(secs => duration_seconds)"), "public link expiry must be calculated server-side from the fixed duration");
assert(publicMigration.includes("revoked_at is null"), "new public link migration must supersede older unrevoked public links");
assert(publicMigration.includes("revoke all on public.ccg_dungeon_carnage_public_playtest_links from anon, authenticated"), "public link records must not be browser-readable");
assert(publicMigration.includes("grant execute on function public.ccg_validate_dungeon_carnage_public_playtest(text) to anon, authenticated"), "anonymous YouTube viewers must be able to validate the share token without an account");
assert(!publicMigration.includes("PuzbYDOnphGjuzPf59691ebbz2TreBiX"), "repository migration must store only the token hash, never the share token itself");
assert(canonicalEntry.includes(cacheToken), "canonical Dungeon Carnage entry must load the closed Round 2 gate cache token");
assert(canonicalEntry.includes('type="application/ccg-protected-runtime" data-ccg-protected-runtime src="js/game-main.js'), "canonical runtime must remain inert until member access is validated");
assert(canonicalEntry.includes("data-ccg-runtime-boundary"), "canonical entry must retain the protected-runtime parser boundary");
assert(legacyEntry.includes(cacheToken), "legacy Dungeon Carnage entry must load the same closed Round 2 gate cache token");
assert(legacyEntry.includes('type="application/ccg-protected-runtime" data-ccg-protected-runtime src="js/game-main.js'), "legacy runtime must remain inert until member access is validated");

console.log("Dungeon Carnage public 24-hour playtest access gate guard passed.");
