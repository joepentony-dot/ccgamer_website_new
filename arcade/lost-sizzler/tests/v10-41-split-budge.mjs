import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-41-split-friendly-fire.js"),"utf8");

assert.match(source,/const PUSH_HOLD_MS=3000/,"split-screen budging must require a three-second continuous push");
assert.match(source,/String\(playMode\)!=="split"/,"player collision/budging must be restricted to local split-screen play");
assert.match(source,/adjacentOpponent\(player,dir\)/,"movement into the other player's tile must be detected before ordinary movement");
assert.match(source,/if\(target\)return handlePlayerPush\(player,target,dir,dash\)/,"an occupied player tile must block ordinary movement and enter the budge path");
assert.match(source,/target\.x=destination\.x;target\.y=destination\.y/,"a successful budge must move the blocking player into the next tile");
assert.match(source,/player\.x=oldTarget\.x;player\.y=oldTarget\.y/,"the pushing player must advance into the vacated tile after a successful budge");
assert.match(source,/resetAllPushes\(\)/,"successful displacement must clear both players' push timers");
assert.match(source,/secondStepOpponent/,"split-screen dash movement must not pass through or land on the other player");
assert.match(source,/enforceSeparateTiles/,"the split-screen runtime must repair any forced overlap from knockback or other systems");
assert.doesNotMatch(source,/hurtPlayer\(target[^\n]*BUDGE/,"budging itself must not damage the other player");

console.log("Lost Sizzler split-screen player collision and three-second budge checks passed.");
