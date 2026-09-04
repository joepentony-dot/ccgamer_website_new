import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-41-stage8-npc-dialogue.js"),"utf8");

assert.match(source,/function fieldTaskSnapshot\(\)/,"Stage 8 must derive merchant tasks from canonical run state");
assert.match(source,/stats\?\.games/,"merchant field service must read the canonical rescued-game counter");
assert.match(source,/stats\?\.secrets/,"merchant field service must read the canonical secret-room counter");
assert.match(source,/run\?\.stats\?\.champions/,"merchant field service must read the canonical champion counter");
assert.match(source,/The existing \+350 score reward is handled automatically/,"merchant field service must describe the existing reward path");
assert.doesNotMatch(source,/\bsetInterval\s*\(/,"merchant field service must not add polling");
assert.doesNotMatch(source,/\brequestAnimationFrame\s*\(/,"merchant field service must not add a frame owner");
assert.doesNotMatch(source,/window\.(?:update|movePlayer|hurtPlayer|buyShopItem)\s*=/,"merchant field service must not replace protected gameplay or economy owners");
assert.doesNotMatch(source,/mode\s*=\s*["']dialogue["']/,"merchant field service must not add a gameplay mode");

console.log("Stage 8 merchant field-service structure passed.");
