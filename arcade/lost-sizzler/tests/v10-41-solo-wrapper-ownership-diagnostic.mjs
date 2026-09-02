import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const r56=read("js/v10-41-r56-playtest-completion.js");
const r60=read("js/v10-41-r60-horde-combat-integrity.js");

// Keep this diagnostic tied to the production ownership rules it models.
assert.match(r56,/if\(current\.__ccgV141R56EnvironmentDamage\)return true/,"R56 diagnostic expects the current top-level-only environment-owner check");
assert.match(r60,/if\(current\.__ccgV141R60EnvironmentSeal\)\{state\.hurtWrapped=true;/,"R60 diagnostic expects the current top-level-only environment-owner check");
assert.match(r60,/wrapped\.__ccgV141R60EnvironmentSeal=true;wrapped\.__ccgV141R56EnvironmentDamage=true;wrapped\.__ccgV141R29HordeFriendly=true/,"R60 environment seal must continue carrying the retained compatibility markers while this diagnostic applies");

const link=(name,original,markers={})=>Object.assign({name,original},markers);
const chain=node=>{const rows=[],seen=new Set();let current=node;while(current&&!seen.has(current)&&rows.length<256){seen.add(current);rows.push(current);current=current.original||null}return rows};
const has=(node,marker)=>Boolean(node?.[marker]);
const wrapR56=node=>has(node,"r56")?node:link("R56",node,{r56:true});
const wrapR60=node=>has(node,"r60")?node:link("R60",node,{r60:true,r56:true,r29:true});

// A later compatibility owner is intentionally marker-neutral, matching the
// failure shape we need to diagnose: a valid outer wrapper can sit above an
// existing R60/R56 owner without copying every historical marker.
const outer=node=>link("outer",node,{});

let owner=link("base",null,{});
owner=wrapR56(owner);
owner=wrapR60(owner);
const initialDepth=chain(owner).length;

const cycles=60;
for(let cycle=0;cycle<cycles;cycle++){
  owner=outer(owner);
  owner=wrapR56(owner);
  owner=wrapR60(owner);
}

const finalChain=chain(owner),finalDepth=finalChain.length;
const r56Layers=finalChain.filter(node=>node.r56&&node.name==="R56").length;
const r60Layers=finalChain.filter(node=>node.r60).length;
const growth=finalDepth-initialDepth;

assert.equal(r56Layers,cycles+1,`top-level-only R56 ownership should reproduce one retained wrapper per outer-owner cycle, got ${r56Layers}`);
assert.equal(r60Layers,cycles+1,`top-level-only R60 ownership should reproduce one retained wrapper per outer-owner cycle, got ${r60Layers}`);
assert.equal(growth,cycles*3,`each synthetic ownership cycle should add outer + R56 + R60 layers, expected ${cycles*3}, got ${growth}`);
assert.ok(finalDepth>150,`diagnostic must reproduce unbounded wrapper-depth growth, got depth ${finalDepth}`);

console.log(`Solo damage ownership diagnostic reproduced wrapper growth: depth ${initialDepth} -> ${finalDepth} across ${cycles} outer-owner cycles; R56 layers=${r56Layers}, R60 layers=${r60Layers}.`);
