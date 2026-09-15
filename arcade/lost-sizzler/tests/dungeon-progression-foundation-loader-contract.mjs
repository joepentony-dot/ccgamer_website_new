import assert from "node:assert/strict";
import fs from "node:fs";

const loader=fs.readFileSync("arcade/lost-sizzler/js/v10-42-r21-owner-and-attack-seal.js","utf8");
assert.match(loader,/dungeon-progression-foundation\.js/,"ordered V10.42 runtime loads the progression foundation");
assert.match(loader,/data-ccg-dungeon-progression-foundation|ccgDungeonProgressionFoundation/,"loader is idempotently marked");
assert.match(loader,/CCGDungeonProgressionFoundation/,"loader skips an already-installed foundation");
assert.doesNotMatch(loader,/hurtPlayer\s*=/,"retired r21 marker still does not reclaim trap damage ownership");
console.log("Dungeon progression foundation loader contract: PASS");
