import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";
import vm from "node:vm";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const render=read("js/game-render.js");
const play=read("js/game-play.js");
const audio=read("js/audio.js");
const melee=read("js/v10-25-melee-ammo-balance.js");

assert.match(render,/bladeHazard:make\(selected\("bladeHazard","assets\/pixel\/visual-overhaul\/0x72\/blade-saw\.png"\)\)/,
  "dedicated blade traps must use the imported CC0 blade asset");
assert.match(render,/hazardHole:make\(selected\("hazardHole","assets\/pixel\/visual-overhaul\/0x72\/hole\.png"\)\)/,
  "dedicated blade traps must retain visible floor housing");
assert.match(render,/hazard\.type==="blade"[\s\S]*blade\?\.complete&&blade\.naturalWidth[\s\S]*ctx\.drawImage\(blade/,
  "blade hazard renderer must prefer the imported asset while keeping a fallback");
assert.match(render,/const spin=active\?\(now\/54[\s\S]*warning\?\(Math\.sin/,
  "blade hardware must animate distinctly in warning and active phases");
assert.match(render,/if\(active\)\{ctx\.save\(\);ctx\.globalCompositeOperation="lighter"[\s\S]*ctx\.fillRect/,
  "active blade hardware must add impact/spark motion without altering damage ownership");
assert.match(render,/drawAmbientMotes\(\)[\s\S]*!dungeonRenderRichFx\(\)/,
  "ambient decoration must shed itself outside the hysteretic R70 rich-quality state");
// Execute the actual renderer. Accessibility motion and graphics quality are
// independent; a declaration-order snapshot cannot protect either behaviour.
let now=1000;
const motion={matches:false},calls=[];
const ctx=new Proxy({}, {
  get(target,key){return target[key]??((...args)=>{
    calls.push([key,...args]);
    if(key==="createRadialGradient")return{addColorStop(){}};
  })},
  set(target,key,value){target[key]=value;calls.push([key,value]);return true}
});
const sandbox={window:{matchMedia:()=>motion},document:{querySelector:()=>null,getElementById:()=>null},
  performance:{now:()=>now},ctx,C:{tile:32,player:{torchRadius:7},enemy:{followerLightRadius:10}},
  P:{orange:"#ff9933",gold:"#ffcc66"},focus:{x:2,y:2,rx:2,ry:2,torchMs:1000},
  world:{wallLights:[{x:3,y:2,radius:5}],fireplaces:[{x:4,y:2}],exit:{x:5,y:2}},
  host:{exitOpen:true,enemies:[{id:"follower",x:6,y:2,alive:true,follower:{}}],generators:[],shrines:[]},
  enemyVisuals:new Map(),bullets:[],enemyBullets:[],hazards:[],view:{x:0,y:0,w:320,h:240}};
vm.createContext(sandbox);
vm.runInContext(render,sandbox,{timeout:1000});
// Record pool submissions rather than emulating Canvas gradient rasterisation.
Object.assign(sandbox,{tileInRenderView:()=>true,visibleTo:()=>true,md:()=>0,
  ws:(x,y)=>({x:x*32,y:y*32}),enemySpriteSeed:()=>1,lightPool:(...args)=>calls.push(["pool",...args])});
const performanceOwner=sandbox.window.CCGLostSizzlerV142R70RenderPerformance;
function lightingAt(quality,reducedMotion,timestamp){
  performanceOwner.state.quality=quality;motion.matches=reducedMotion;now=timestamp;calls.length=0;
  vm.runInContext("drawWallLights();drawDynamicLighting();",sandbox,{timeout:1000});
  return JSON.parse(JSON.stringify(calls));
}
for(const quality of ["rich","reduced","severe"]){
  const first=lightingAt(quality,true,1000),later=lightingAt(quality,true,1700);
  assert.deepEqual(first,later,`${quality}: reduced-motion fire and halos must stay steady as time advances`);
  assert.ok(first.some(row=>row[0]==="fill"),`${quality}: physical wall flames must remain visible`);
  const pools=first.filter(row=>row[0]==="pool");
  for(const rgb of ["255,177,67","255,125,42","255,157,54","164,94,255"])
    assert.ok(pools.some(row=>row[4]===rgb),`${quality}: essential player/fireplace/wall/exit illumination ${rgb} must remain`);
  assert.equal(first.some(row=>row[0]==="createRadialGradient"),quality==="rich","only rich quality may draw the optional vignette");
  assert.equal(pools.some(row=>row[4]==="255,142,48"),quality!=="severe","severe must shed optional follower halos");
  const normal=lightingAt(quality,false,1000),normalLater=lightingAt(quality,false,1700);
  if(quality==="rich")assert.notDeepEqual(normal,normalLater,"normal rich fire must animate");
  else assert.deepEqual(normal,normalLater,`${quality}: slowdown fallback must shed decorative motion`);
}
assert.equal(performanceOwner.reducedMotion(),false,"live media preference changes must apply without reloading");
assert.match(render,/if\(!richFx\)return;[\s\S]*createRadialGradient/,
  "the vignette pass must be limited to stable rich-quality rendering");

assert.match(render,/function tileInRenderView\(x,y,pad=2\)/,
  "renderer must expose a cheap camera-bound culling predicate");
assert.match(render,/function drawEnemy\(e\)[\s\S]*!tileInRenderView\(e\.x,e\.y,3\)[\s\S]*!visibleTo/,
  "enemy rendering must cull offscreen entities before expensive visibility checks");
assert.match(render,/function drawItem\(i\)[\s\S]*!tileInRenderView\(i\.x,i\.y,2\)[\s\S]*!visibleTo/,
  "item rendering must cull offscreen pickups before expensive visibility checks");
assert.match(render,/for\(const d of world\.decor\|\|\[\]\)[\s\S]*!tileInRenderView\(d\.x,d\.y,2\)[\s\S]*!visibleTo/,
  "furniture rendering must cull offscreen decor before line-of-sight work");
assert.match(render,/function drawFog\(\)[\s\S]*quality=dungeonRenderQuality\(\),severe=quality==="severe"[\s\S]*torchEnemies=\(host\.enemies\|\|\[\]\)\.filter\(e=>e\.alive&&e\.follower\)\.filter\(e=>!severe/,
  "fog lighting must preserve follower discovery while shedding follower-light comparisons only in the stable severe tier");

assert.match(audio,/melee:\(\)=>\{noise\(/,
  "R69 must provide a dedicated procedural melee SFX fallback");
assert.match(melee,/S\.sfx\("melee"\)/,
  "sword attacks must use the dedicated melee SFX instead of the dash cue");
assert.match(audio,/hazardwarn:\(\)=>/,
  "hazard warning must have a dedicated non-voice SFX cue");
assert.match(audio,/bladehit:\(\)=>/,
  "blade contact must have a dedicated impact SFX cue");
assert.match(play,/S\.sfx\("hazardwarn"\)[\s\S]*hazardWarning/,
  "hazard-cycle warning must pair its SFX with the recorded warning voice");
assert.match(play,/S\.sfx\(hazard\.type==="blade"\?"bladehit":"trap"\)/,
  "dedicated blade contact must use its impact SFX without changing hazard damage ownership");

console.log("Dungeon R69 hazard presentation contract remains compatible with R70 hysteretic performance recovery.");
