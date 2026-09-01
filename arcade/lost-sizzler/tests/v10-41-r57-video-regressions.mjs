import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const r29=read("js/v10-41-r29-runtime-repair.js");

assert.match(r29,/lastAcceptedRafTimestamp:null/,"r29 must track the last accepted RAF timestamp independently of the shared frame clock");
assert.match(r29,/t<=Number\(state\.lastAcceptedRafTimestamp\)[\s\S]*duplicateFramesSkipped\+\+[\s\S]*return;/,"duplicate or stale RAF callbacks must be dropped before simulation work or rescheduling");
assert.doesNotMatch(r29,/t-previous\|\|16/,"zero elapsed RAF time must never be converted into a fake 16 ms simulation step");
assert.match(r29,/gap>=500[\s\S]*payDownCombatGap\(gap\)/,"a real browser stall must pay down elapsed combat timing before the capped simulation resumes");
assert.match(r29,/fire1=Math\.max\(0,Number\(fire1\)-elapsed\)/,"Player 1 fire cooldown must lose real elapsed stall time");
assert.match(r29,/player\.hitStunMs=Math\.max\(0,stun-elapsed\)/,"hit-stun must lose real elapsed stall time instead of remaining frozen through a browser stall");
assert.match(r29,/R56PlaytestCompletion\?\.rearmCombat\?\.\("r29 frame-gap recovery",0,false\)/,"frame-gap recovery must also clear retained combat locks through the established R56 owner");

console.log("R57 video-reproduced duplicate-frame acceleration and post-stall combat contracts passed.");