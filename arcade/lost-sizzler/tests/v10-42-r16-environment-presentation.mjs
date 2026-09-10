import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const file=path.join(root,"js","v10-42-r16-environment-presentation.js");
const source=fs.readFileSync(file,"utf8");

for(const forbidden of ["Math.random","localStorage","sessionStorage","WebSocket","EventSource","fetch(","setInterval","requestAnimationFrame"]){
  assert.equal(source.includes(forbidden),false,`r16 must not introduce ${forbidden}`);
}

const context={window:{},console,JSON,Math,Object,Number,String,Array,Set};
vm.createContext(context);vm.runInContext(source,context,{filename:file});
const api=context.window.CCGLostSizzlerV142R16EnvironmentPresentation;
assert.ok(api,"r16 API must exist");

const cases=[
  ["threshold","threshold","rain"],
  ["iron keep","iron_keep","interior-draught"],
  ["moss crypt","moss_crypt","crypt-damp"],
  ["spider web","web_hollow","still-air"],
  ["ember depths","ember_depths","thermal-draft"],
  ["sigil sanctum","sigil_sanctum","arcane-static"],
  ["outdoor storm","outdoor","storm"]
];
for(const [input,expectedBiome,expectedWeather] of cases){
  const first=api.recipe({floor:3,roomKey:"room-a",biome:input,roomRole:"combat",route:"main"});
  const second=api.recipe({floor:3,roomKey:"room-a",biome:input,roomRole:"combat",route:"main"});
  assert.equal(first.biome,expectedBiome);
  assert.equal(first.weather,expectedWeather);
  assert.deepEqual(first,second,"same room context must produce identical presentation");
  assert.equal(first.depth.parallaxLayers,3);
  assert.equal(first.depth.softContactShadows,true);
  assert.equal(first.readability.playerRimLight,true);
  assert.equal(first.readability.enemyRimLight,true);
  assert.equal(first.renderOwnership,false);
  assert.equal(first.simulationOwnership,false);
  assert.deepEqual(Array.from(first.runtimeDependencies),[]);
}

const rare=api.recipe({floor:4,roomKey:"rare-7",biome:"crypt",roomRole:"rare",route:"alternate-east"});
const normal=api.recipe({floor:4,roomKey:"combat-7",biome:"crypt",roomRole:"combat",route:"main"});
assert.equal(rare.rare,true);
assert.ok(rare.dressingDensity>normal.dressingDensity,"rare rooms must receive richer dressing");
assert.equal(rare.lighting.occlusion,"strong layered occlusion");

const elite=api.recipe({floor:5,roomKey:"elite",biome:"ember",roomRole:"elite"});
assert.equal(elite.readability.eliteSilhouetteBoost,true);
assert.match(elite.feedback.hit,/directional flash/);
assert.match(elite.feedback.projectile,/contact spark/);
assert.match(elite.feedback.explosion,/floor light pulse/);
assert.match(elite.feedback.breakable,/material fragments/);

const web=api.recipe({floor:2,roomKey:"nest",biome:"spider",roomRole:"secret"});
assert.ok(web.layers.dressing.some(item=>String(item).includes("false-wall")||String(item).includes("concealed")));
assert.ok(web.particles.some(item=>item.kind==="floating silk"));

console.log("V10.42 r16 environment presentation regression passed");
