import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const ai=fs.readFileSync(path.join(root,"js/ai.js"),"utf8");

assert.match(ai,/function crowdPriority\(e\)/,"R84 must define crowd priority");
assert.match(ai,/e\.deathStalker\|\|e\.timedHunter\|\|e\.hunting\|\|e\.follower\|\|e\.guardian\|\|e\.exitWarden\|\|e\.sigilDefender\|\|e\.arenaId/,
  "bosses, named enemies and encounter owners must never be deferred by crowd throttling");
assert.match(ai,/nearest<=7/,"nearby enemies must always update at full cadence");
assert.match(ai,/e\.aiState==="chase"&&nearest<=11/,"nearby chasing enemies must remain responsive");
assert.match(ai,/const stride=count>=28\|\|lowFps&&count>=18\?3:count>=16\?2:1/,
  "crowd throttling must activate only at substantial enemy counts or low-FPS crowd pressure");
assert.match(ai,/effectiveDt=crowdPriority\(e\)\?dt:dt\*plan\.stride/,
  "deferred ordinary enemies must receive elapsed cooldown time when they are processed");
assert.match(ai,/throttled:plan\.throttled,crowdStride:plan\.stride,crowded:plan\.stride>1/,
  "crowd performance behaviour must remain observable through AI diagnostics");

console.log("Dungeon R84 crowd-performance regression checks passed.");
