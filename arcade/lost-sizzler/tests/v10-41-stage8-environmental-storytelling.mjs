import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const dialogue=fs.readFileSync(path.join(root,"js/v10-41-stage8-npc-dialogue.js"),"utf8");
const gameplay=fs.readFileSync(path.join(root,"js/game-play.js"),"utf8");

assert.doesNotThrow(()=>new Function(dialogue),"Stage 8 environmental storytelling module must parse");
assert.match(dialogue,/const ENVIRONMENTAL_STORY_BUDGET=3;/,"environmental stories must retain a bounded per-floor presentation budget");
assert.match(dialogue,/const environmentalSeen=new WeakSet\(\)/,"environmental stories must use room-object memory without a parallel save schema");
assert.match(dialogue,/const environmentalFloors=new WeakMap\(\)/,"environmental story budgets must follow the generated world lifecycle");
assert.match(dialogue,/function presentEnvironmentalStory\(player,room,\{force=false\}=\{\}\)/,"Stage 8 must expose one event-driven environmental presentation boundary");
assert.match(dialogue,/if\(force\|\|!soloDungeon\(\)\|\|!room\|\|environmentalSeen\.has\(room\)\|\|!environmentalEligible\(room\)\)return false/,"forced initial room setup, other modes and repeated rooms must remain silent");
assert.match(dialogue,/floorState\.presented>=ENVIRONMENTAL_STORY_BUDGET/,"environmental storytelling must stop after its small floor budget");
assert.doesNotMatch(dialogue,/\bsetInterval\s*\(/,"environmental storytelling must not add a polling interval");
assert.doesNotMatch(dialogue,/\brequestAnimationFrame\s*\(/,"environmental storytelling must not add a frame owner");
assert.match(gameplay,/window\.CCGLostSizzlerStage8NpcDialogue\?\.onRoomEntered\?\.\(p,r,room,\{force:false\}\)/,"canonical room entry must publish one optional Stage 8 event after existing room messaging");
assert.doesNotMatch(dialogue,/window\.(?:update|movePlayer|hurtPlayer)\s*=/,"environmental storytelling must not replace protected gameplay owners");

console.log("Stage 8 environmental storytelling contract passed: bounded room-entry records reuse canonical Solo events without polling or protected owner changes.");
