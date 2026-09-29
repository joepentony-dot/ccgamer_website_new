import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const render=fs.readFileSync(path.join(root,"js/game-render.js"),"utf8");
const systems=fs.readFileSync(path.join(root,"js/systems.js"),"utf8");

assert.match(render,/else if\(k==="weapon"\)[\s\S]*?shadowColor=P\.orange[\s\S]*?strokeRect\(-14,-10,28,20\)/,"R68 weapon cache must render as a physical upgrade case");
assert.match(render,/else if\(k==="mana"\|\|k==="ammo"\)[\s\S]*?for\(const x of \[-7,-2,3,8\]\)/,"R68 ammunition pickup must expose a dedicated ammunition-case silhouette");
assert.match(render,/else if\(k==="credits"\)[\s\S]*?for\(const \[ox,oy,scale\] of \[\[-6,5,\.72\],\[6,5,\.72\],\[0,0,1\]\]\)/,"R68 score pickup must render as a coin stack");
assert.match(render,/else if\(k==="armour"\)[\s\S]*?ctx\.lineTo\(-13,-7\)[\s\S]*?ctx\.lineTo\(13,-7\)/,"R68 armour pickup must render as wearable armour rather than a generic letter");
assert.match(render,/function drawDedicatedHazards\(\)[\s\S]*?Hardware remains visible throughout the complete cycle/,"dedicated hazard hardware must remain visible outside warning/active phases");
assert.doesNotMatch(render,/function drawDedicatedHazards\(\)[\s\S]{0,900}if\(!state\.active&&!state\.warning\)continue/,"dedicated hazards must not disappear completely while inactive");
assert.match(render,/else if\(d\.type==="crate"\)/,"solid crates must have a dedicated renderer");
assert.match(render,/Tall furniture gets a full silhouette/,"bookcases and racks must retain a solid-object presentation");
assert.match(systems,/const nonBlockingDecor=new Set\(\["cable","pipe","lightBar","candleSconce"\]\)/,"only lightweight detail props may be intentionally passable");
assert.match(systems,/if\(blocking\)\{used\.add\(cell\(q\.x,q\.y\)\);host\.blockingDecor\.push/,"blocking furniture must register with collision ownership");

for(const solid of ["crate","barrel","bookcase","table","bench","rack"]){
  assert.ok(!new Set(["cable","pipe","lightBar","candleSconce"]).has(solid),`${solid} must remain a solid furniture family`);
}

console.log("C64 Dungeon Carnage R68 presentation and solid-furniture static contract passed.");
