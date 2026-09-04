import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const dialogue=fs.readFileSync(path.join(root,"js/v10-41-stage8-npc-dialogue.js"),"utf8");
const gameplay=fs.readFileSync(path.join(root,"js/game-play.js"),"utf8");

assert.doesNotThrow(()=>new Function(dialogue),"Stage 8 exploration interaction module must parse");
assert.match(dialogue,/const EXPLORATION_INTERACTION_BUDGET=2;/,"structural discoveries must retain a small per-floor presentation budget");
assert.match(dialogue,/const explorationFloors=new WeakMap\(\)/,"structural discovery memory must follow the generated world lifecycle");
assert.match(dialogue,/world\?\.dungeonVariety\|\|null/,"exploration interactions must consume the existing dungeon-variety metadata");
assert.match(dialogue,/meta\.deadEnds\|\|\[\]/,"dead-end interactions must reuse the existing dead-end metadata");
assert.match(dialogue,/\[\"shortcut\",meta\.shortcuts\]/,"shortcut interactions must reuse existing shortcut geometry");
assert.match(dialogue,/\[\"gallery\",meta\.galleries\]/,"gallery interactions must reuse existing gallery geometry");
assert.match(dialogue,/function onMovementBoundary\(player\)/,"Stage 8 must expose an event-driven movement interaction boundary");
assert.match(gameplay,/rememberTrail\(p\);try\{window\.CCGLostSizzlerStage8NpcDialogue\?\.onMovementBoundary\?\.\(p\)\}/,"canonical movement triggers must publish the optional Stage 8 exploration event");
assert.doesNotMatch(dialogue,/\bsetInterval\s*\(/,"exploration interactions must not add a polling interval");
assert.doesNotMatch(dialogue,/\brequestAnimationFrame\s*\(/,"exploration interactions must not add a frame owner");
assert.doesNotMatch(dialogue,/window\.(?:update|movePlayer|hurtPlayer)\s*=/,"exploration interactions must not replace protected gameplay owners");

console.log("Stage 8 exploration interaction contract passed: existing structural metadata now reaches a bounded movement event without polling or new geometry.");
