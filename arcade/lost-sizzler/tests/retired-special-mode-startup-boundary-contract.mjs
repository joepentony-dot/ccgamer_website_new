import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

const r30=read("js/v10-41-r30-buglog.js");
const hordeComposition=read("js/v10-41-r60-horde-owner-composition.js");

/*
 * Horde Survivor and Sizzler Saboteurs are retired product modes. Their
 * dedicated world/loader/exit owners must not be preloaded by the supported
 * release startup path. Two historically mode-linked files used to provide
 * general supported-mode side effects, so those owners are loaded directly:
 * post-playtest Solo fire recovery and r59 pause/Solo checkpoint stability.
 */
for(const retiredStartupOwner of [
  "v10-41-r30-spy-exit-control-reset.js",
  "v10-41-r32-spy-world-owner.js",
  "v10-41-r32-spy-loader.js"
]){
  assert.equal(r30.includes(retiredStartupOwner),false,`retired startup owner must not be preloaded: ${retiredStartupOwner}`);
}

assert.match(r30,/loadScript\("v10-41-post-playtest-stability\.js","data-ccg-post-playtest-stability"\)/,"supported post-playtest stability owner must load directly");
assert.match(r30,/loadScript\("v10-41-r59-live-regression-fixes\.js","data-ccg-r59-live-regression-fixes"\)/,"supported r59 pause/Solo stability owner must load directly");

/*
 * Do not remove this historically Horde-named bridge yet. It still protects
 * supported Solo R60 ownership and damage ancestry, so Stage 1 must preserve it
 * until that supported responsibility is independently extracted.
 */
assert.match(r30,/v10-41-r60-horde-owner-composition\.js/,"historically named bridge with supported Solo ownership must remain loaded");
assert.match(hordeComposition,/function soloDungeon\s*\(/,"retained bridge must still identify supported Solo ownership");
assert.match(hordeComposition,/function protectSoloInstall\s*\(/,"retained bridge must still protect supported Solo R60 maintenance");
assert.match(hordeComposition,/installSoloHurtGate/ ,"retained bridge must still protect supported Solo damage ownership");

console.log("Dungeon Carnage retired special-mode startup boundary contract passed.");
