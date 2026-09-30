import fs from "node:fs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const gate = fs.readFileSync("js/ccg-play-maintenance-owner-gate.js", "utf8");
const canonicalEntry = fs.readFileSync("arcade/c64-dungeon-carnage/index.html", "utf8");
const legacyEntry = fs.readFileSync("arcade/lost-sizzler/index.html", "utf8");
const cacheToken = "/js/ccg-play-maintenance-owner-gate.js?v=20261001-tester-gate";

assert(gate.includes("TESTER_CODE_SHA256"), "tester gate must validate against a SHA-256 digest");
assert(gate.includes("window.crypto?.subtle"), "tester gate must use browser crypto for code validation");
assert(gate.includes("TESTER_SESSION_KEY"), "tester access must remain browser-session scoped");
assert(gate.includes("ccg_has_dungeon_carnage_playtest_access"), "signed-in assigned members must be checked through the protected playtest-access RPC");
assert(gate.includes('mark("member-playtester")'), "assigned website members must receive an explicit member-playtester access state");
assert(gate.includes('mark("tester-code-required")'), "production visitors must be held at the tester-code gate");
assert(gate.includes('mark("tester-preview")'), "valid tester access must mark the preview as allowed");
assert(gate.includes("ENTER DUNGEON"), "tester gate must present an explicit unlock action");
assert(gate.includes("isOwnerProfile(profile)"), "signed-in owner bypass must remain intact");
assert(canonicalEntry.includes(cacheToken), "canonical Dungeon Carnage entry must load the tester-gate cache token");
assert(legacyEntry.includes(cacheToken), "legacy Dungeon Carnage entry must load the tester-gate cache token");

console.log("Dungeon Carnage tester-code gate guard passed.");
