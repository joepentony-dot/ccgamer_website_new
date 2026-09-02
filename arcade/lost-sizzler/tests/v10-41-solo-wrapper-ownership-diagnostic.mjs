import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const r29=read("js/v10-41-r29-runtime-repair.js");
const r56=read("js/v10-41-r56-playtest-completion.js");
const r60=read("js/v10-41-r60-horde-combat-integrity.js");

// The retained damage owners must recognise an existing owner anywhere in the
// __ccgOriginal ancestry. A later compatibility wrapper must not cause another
// R29/R56/R60 layer to be appended on the next maintenance cycle.
assert.match(r29,/function originalChainHasMarker\(fn,marker,limit=64\)/,"R29 must expose ancestry-aware owner detection");
assert.match(r29,/originalChainHasMarker\(current,"__ccgV141R29HordeFriendly"\)/,"R29 Horde damage guard must search the original ancestry");
assert.match(r56,/function originalChainHasMarker\(fn,marker,limit=64\)/,"R56 must expose ancestry-aware owner detection");
assert.match(r56,/originalChainHasMarker\(current,"__ccgV141R56EnvironmentDamage"\)/,"R56 environmental damage owner must search the original ancestry");
assert.match(r60,/function originalChainHasMarker\(fn,marker,limit=64\)/,"R60 must expose ancestry-aware owner detection");
assert.match(r60,/originalChainHasMarker\(current,"__ccgV141R60EnvironmentSeal"\)/,"R60 environmental seal must search the original ancestry");
assert.match(r60,/wrapped\.__ccgV141R60EnvironmentSeal=true;wrapped\.__ccgV141R56EnvironmentDamage=true;wrapped\.__ccgV141R29HordeFriendly=true/,"R60 must retain the R56/R29 compatibility markers");

const link=(name,original,markers={})=>Object.assign({name,original},markers);
const chain=node=>{const rows=[],seen=new Set();let current=node;while(current&&!seen.has(current)&&rows.length<256){seen.add(current);rows.push(current);current=current.original||null}return rows};
const chainHas=(node,marker)=>chain(node).some(row=>Boolean(row?.[marker]));
const wrapR29=node=>chainHas(node,"r29")?node:link("R29",node,{r29:true});
const wrapR56=node=>chainHas(node,"r56")?node:link("R56",node,{r56:true});
const wrapR60=node=>chainHas(node,"r60")?node:link("R60",node,{r60:true,r56:true,r29:true});

// A later compatibility owner is intentionally marker-neutral. It is allowed to
// exist above the retained stack, but it must not multiply historical repair
// owners merely because it does not copy every marker itself.
const outer=node=>link("outer",node,{});

let owner=link("base",null,{});
owner=wrapR29(owner);
owner=wrapR56(owner);
owner=wrapR60(owner);
const initialDepth=chain(owner).length;

const cycles=60;
for(let cycle=0;cycle<cycles;cycle++){
  owner=outer(owner);
  owner=wrapR29(owner);
  owner=wrapR56(owner);
  owner=wrapR60(owner);
}

const finalChain=chain(owner),finalDepth=finalChain.length;
const r29Layers=finalChain.filter(node=>node.name==="R29").length;
const r56Layers=finalChain.filter(node=>node.name==="R56").length;
const r60Layers=finalChain.filter(node=>node.name==="R60").length;
const retainedLayers=r29Layers+r56Layers+r60Layers;

assert.equal(r29Layers,1,`R29 damage ownership multiplied to ${r29Layers} layers`);
assert.equal(r56Layers,1,`R56 damage ownership multiplied to ${r56Layers} layers`);
assert.equal(r60Layers,1,`R60 damage ownership multiplied to ${r60Layers} layers`);
assert.ok(retainedLayers<=3,`retained damage-owner layer ceiling exceeded: ${retainedLayers}`);
assert.equal(finalDepth-initialDepth,cycles,"only the synthetic external owner may add depth in this isolation model");

console.log(`Solo damage ownership ceiling passed: retained R29/R56/R60 layers=${retainedLayers}, total synthetic depth ${initialDepth} -> ${finalDepth} across ${cycles} external-owner cycles.`);
