import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const play=read("js/game-play.js");
const r29=read("js/v10-41-r29-runtime-repair.js");
const post=read("js/v10-41-post-playtest-stability.js");
const r56=read("js/v10-41-r56-playtest-completion.js");
const r60=read("js/v10-41-r60-horde-combat-integrity.js");
const r60Composition=read("js/v10-41-r60-horde-owner-composition.js");
const activeEnemyFire=read("js/v10-41-active-enemy-fire.js");
const r24Live=read("js/v10-41-r24-live-regressions.js");

// R58 moved ordinary FIRE/SPIKE/SHOCK HEALTH ownership into the canonical
// game-play damage/trap path. Historical maintenance layers must remain
// ancestry-safe where they still wrap unrelated damage, but R56/R60 must not
// recreate environmental damage owners above the canonical trap engine.
const authoritativeDamageBlock=play.match(/function authoritativeDamagePlayer\(p,n,friendly=false,source="enemy"\)\{[\s\S]*?\n\}/)?.[0]||"";
assert.match(authoritativeDamageBlock,/authoritativeTrapDamageDepth\+\+/,"canonical trap owner must enter the guarded internal damage boundary");
assert.match(play,/const canonicalPlayerDamage=hurtPlayer;/,"canonical trap owner must capture the raw player-damage primitive before later compatibility wrappers load");
assert.match(authoritativeDamageBlock,/try\{return canonicalPlayerDamage\(p,n,friendly,source\)\}/,"canonical trap owner must call the captured raw player-damage primitive through the guarded boundary");
assert.match(authoritativeDamageBlock,/finally\{authoritativeTrapDamageDepth=Math\.max\(0,authoritativeTrapDamageDepth-1\)\}/,"canonical trap owner must always release the guarded internal damage boundary");
assert.match(play,/window\.CCGLostSizzlerV142R58AuthoritativeTrapCore=authoritativeTrapApi/,"R58 canonical trap ownership must be exported from game-play");
assert.match(r29,/function originalChainHasMarker\(fn,marker,limit=64\)/,"R29 must retain its generic ancestry helper for downstream compatibility");
assert.doesNotMatch(r29,/__ccgV141R29HordeFriendly|installHordeFriendlyFireGuard/,"R29 must not restore retired Horde damage ownership");
assert.match(post,/function originalChainHasMarker\(fn,marker,limit=64\)/,"post-playtest stability must retain ancestry-aware owner detection");
assert.match(post,/originalChainHasMarker\(current,"__ccgV141PostPlaytestHurt"\)/,"the retained post-playtest non-canonical damage guard must remain ancestry-safe");
assert.match(r56,/function installEnvironmentalDamage\(\)[\s\S]*r58 owns every trap-attributed HEALTH change[\s\S]*return false/,"R56 environmental damage installation must be retired behind R58");
assert.doesNotMatch(r56,/wrapped\.__ccgV141R56EnvironmentDamage=true/,"R56 must not install a new environmental damage wrapper");
assert.match(r60,/function wrapEnvironmentalDamage\(\)[\s\S]*r58 owns trap\/environment HEALTH semantics[\s\S]*state\.hurtSource=window\.hurtPlayer[\s\S]*return true/,"R60 may observe the current damage source but must not wrap it");
assert.doesNotMatch(r60,/wrapped\.__ccgV141R60EnvironmentSeal=true/,"R60 must not reinstall the historical environmental damage seal");
assert.match(r60Composition,/function completeSoloDamageOwner\(\)\{[\s\S]*return false/,"R60 composition must not claim a complete Solo damage owner after R58");
assert.match(r60Composition,/function installSoloHurtGate\(\)[\s\S]*r58 pins floor-trap damage[\s\S]*return false/,"R60 composition must keep its Solo hurt property gate retired");

// Keep the original anti-multiplication concern for the one retained generic
// post-playtest compatibility owner. Repeated marker-neutral outer wrappers must
// not cause the same retained owner to be appended again.
const link=(name,original,markers={})=>Object.assign({name,original},markers);
const chain=node=>{const rows=[],seen=new Set();let current=node;while(current&&!seen.has(current)&&rows.length<256){seen.add(current);rows.push(current);current=current.original||null}return rows};
const chainHas=(node,marker)=>chain(node).some(row=>Boolean(row?.[marker]));
const wrapPost=node=>chainHas(node,"post")?node:link("Post",node,{post:true});
const outer=node=>link("outer",node,{});

let owner=wrapPost(link("base",null,{}));
const initialDepth=chain(owner).length;
const cycles=60;
for(let cycle=0;cycle<cycles;cycle++){
  owner=outer(owner);
  owner=wrapPost(owner);
}
const finalChain=chain(owner);
const postLayers=finalChain.filter(node=>node.name==="Post").length;
assert.equal(postLayers,1,`post-playtest damage ownership multiplied to ${postLayers} layers`);
assert.equal(finalChain.filter(node=>node.name==="R29").length,0,"retired R29 damage ownership unexpectedly returned");
assert.equal(finalChain.filter(node=>node.name==="R56").length,0,"retired R56 environmental damage ownership unexpectedly returned");
assert.equal(finalChain.filter(node=>node.name==="R60").length,0,"retired R60 environmental damage ownership unexpectedly returned");
assert.equal(finalChain.length-initialDepth,cycles,"only the synthetic external owner may add depth in this isolation model");


// R67: the ActiveCardinal and R24EnemyFire maintenance installers used to
// alternately wrap CCGAI.stepEnemies every 80/180 ms. That produced an
// unbounded A -> R24 -> A -> R24 chain and eventually Maximum call stack size
// exceeded during ordinary Solo combat. Both owners must inspect ancestry and
// preserve a traversable __ccgOriginal link.
assert.match(activeEnemyFire,/function wrapperChainHas\(fn,marker\)/,"ActiveCardinal must detect its owner anywhere in the wrapper ancestry");
assert.match(activeEnemyFire,/wrapperChainHas\(current,"__ccgV141ActiveEnemyCardinal"\)/,"ActiveCardinal installer must not append a second owner above R24");
assert.match(activeEnemyFire,/wrapped\.__ccgOriginal=current/,"ActiveCardinal must preserve traversable wrapper ancestry");
assert.match(r24Live,/function wrapperChainHas\(fn,marker\)/,"R24 enemy fire must detect its owner anywhere in the wrapper ancestry");
assert.match(r24Live,/wrapperChainHas\(current,"__ccgV141R24EnemyFire"\)/,"R24 installer must not append a second owner above ActiveCardinal");
assert.match(r24Live,/wrapped\.__ccgOriginal=current/,"R24 enemy fire must preserve traversable wrapper ancestry");

const chainHasMarker=(fn,marker)=>{
  const seen=new Set();let current=fn,depth=0;
  while(typeof current==="function"&&!seen.has(current)&&depth<64){
    if(current[marker])return true;
    seen.add(current);current=current.__ccgOriginal;depth++;
  }
  return false;
};
const baseEnemyStep=()=>true;
const installActive=current=>{
  if(chainHasMarker(current,"__ccgV141ActiveEnemyCardinal"))return current;
  const wrapped=function stepEnemiesV141ActiveCardinal(){return current.apply(this,arguments)};
  wrapped.__ccgV141ActiveEnemyCardinal=true;wrapped.__ccgOriginal=current;return wrapped;
};
const installR24=current=>{
  if(chainHasMarker(current,"__ccgV141R24EnemyFire"))return current;
  const wrapped=function stepEnemiesV141R24EnemyFire(){return current.apply(this,arguments)};
  wrapped.__ccgV141R24EnemyFire=true;wrapped.__ccgOriginal=current;return wrapped;
};
let enemyOwner=baseEnemyStep;
for(let cycle=0;cycle<500;cycle++){
  enemyOwner=installActive(enemyOwner);
  enemyOwner=installR24(enemyOwner);
}
const enemyChain=chain(enemyOwner).map(node=>node.name);
assert.equal(enemyChain.filter(name=>name==="stepEnemiesV141ActiveCardinal").length,1,"ActiveCardinal owner multiplied");
assert.equal(enemyChain.filter(name=>name==="stepEnemiesV141R24EnemyFire").length,1,"R24EnemyFire owner multiplied");
assert.equal(enemyChain.length,3,"enemy step wrapper chain must remain base + exactly two compatible owners");
assert.equal(enemyOwner(),true,"bounded enemy wrapper chain must execute without recursion");

console.log(`Solo damage ownership ceiling passed: canonical R58 trap owner + ${postLayers} retained generic post layer across ${cycles} external-owner cycles.`);
