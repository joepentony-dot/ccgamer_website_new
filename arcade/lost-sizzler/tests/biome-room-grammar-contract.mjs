import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const runtimePath=path.join(root,"js/v10-42-r24-biome-room-grammar.js");
const bootstrapPath=path.join(root,"js/v10-42-bootstrap.js");
const runtime=fs.readFileSync(runtimePath,"utf8");
const bootstrap=fs.readFileSync(bootstrapPath,"utf8");

assert.match(runtime,/Semantic metadata only:/,"R24 must declare its non-simulation ownership boundary.");
assert.match(runtime,/const baseCreateHostState=W\.createHostState\.bind\(W\);/,"R24 must compose through the existing host-state creation chain.");
assert.match(runtime,/room\.v142RoomGrammar=grammar;/,"R24 must attach room grammar as additive metadata.");
assert.match(runtime,/simulationOwnership:false,collisionOwnership:false,progressionOwnership:false,saveOwnership:false,networkOwnership:false/,"R24 room grammar must explicitly reject protected ownership domains.");
assert.doesNotMatch(runtime,/worldState\.map\s*\[/,"R24 must not rewrite map topology.");
assert.doesNotMatch(runtime,/hostState\.(?:items|enemies|doors|chests|shops)\s*=/,"R24 must not replace live host entity collections.");
assert.doesNotMatch(runtime,/\b(?:movePlayer|hurtPlayer|awardXP|applySkill|floorLevelCap)\s*=/,"R24 must not take input, damage, XP or progression ownership.");
assert.doesNotMatch(runtime,/localStorage|indexedDB|supabase/i,"R24 must not introduce save, browser persistence or cloud ownership.");
assert.doesNotMatch(runtime,/setInterval|requestAnimationFrame/,"R24 metadata must not add polling or frame ownership.");

const r7Index=bootstrap.indexOf('["v10-42-r7-room-objective-director.js","CCGLostSizzlerV142R7RoomObjectiveDirector"]');
const r24Index=bootstrap.indexOf('["v10-42-r24-biome-room-grammar.js","CCGLostSizzlerV142R24BiomeRoomGrammar"]');
const r8Index=bootstrap.indexOf('["v10-42-r8-breakable-interaction-director.js","CCGLostSizzlerV142R8BreakableInteractionDirector"]');
assert.ok(r7Index>=0&&r24Index>r7Index&&r8Index>r24Index,"Ordered bootstrap must load R24 after R6/R7 metadata and before downstream room interaction layers.");

const campaignFloors=[
  {floor:1,id:"threshold"},{floor:2,id:"iron"},{floor:3,id:"bone"},{floor:4,id:"ash"},{floor:5,id:"sigil"}
];
const sandbox={console,run:{seed:"R24-CONTRACT",floor:1}};
sandbox.window=sandbox;
sandbox.CCG_CONFIG={maxFloors:5,proceduralDungeon:{campaignFloors}};
sandbox.CCGWorld={createHostState:worldState=>({revision:17,items:[{id:"item"}],enemies:[{id:"enemy"}],doors:[{id:"door"}],chests:[{id:"chest"}],shops:[{id:"shop"}],sourceWorld:worldState})};
vm.createContext(sandbox);
vm.runInContext(runtime,sandbox,{filename:runtimePath});

const api=sandbox.CCGLostSizzlerV142R24BiomeRoomGrammar;
assert.ok(api,"R24 API must publish after installation.");
assert.equal(api.version,"V10.42-r24","R24 API version must remain explicit.");

const biomeIds=["threshold","iron","bone","ash","sigil"];
const identities=[];
const landmarks=[];
for(let index=0;index<biomeIds.length;index++){
  const floor=index+1,biome=biomeIds[index];
  sandbox.run={seed:"R24-CONTRACT",floor};
  const room={id:7,x:3,y:4,w:8,h:7,v142Environment:{biome,role:"chamber",rareRole:"",variant:`${biome}-variant`,dressingSeed:100+floor},v142Objective:{type:"recover-cache",title:"RECOVER THE CACHE"}};
  const world={rooms:[room],startRoomId:1,exitRoomId:9,map:[[1]]};
  const beforeMap=JSON.stringify(world.map);
  const host=sandbox.CCGWorld.createHostState(world);
  const grammar=room.v142RoomGrammar;
  assert.ok(grammar,`Floor ${floor} must receive R24 room grammar.`);
  assert.equal(grammar.floor,floor,`Floor ${floor} grammar must retain its campaign depth.`);
  assert.equal(grammar.biome,biome,`Floor ${floor} grammar must retain its R6 biome identity.`);
  assert.equal(grammar.objectiveType,"recover-cache","R24 must consume the existing R7 objective type without replacing it.");
  assert.match(grammar.objectiveCue,/RECOVER THE CACHE/,"R24 objective cue must preserve the existing objective title.");
  assert.equal(grammar.simulationOwnership,false,"R24 grammar must remain descriptive only.");
  assert.equal(JSON.stringify(world.map),beforeMap,"R24 must not change map topology while applying grammar.");
  assert.equal(host.revision,17,"R24 must preserve existing host-state fields.");
  assert.deepEqual(host.items,[{id:"item"}],"R24 must preserve item ownership.");
  assert.deepEqual(host.enemies,[{id:"enemy"}],"R24 must preserve enemy ownership.");
  assert.equal(host.v142RoomGrammar.floor,floor,"Host summary must match the active floor.");
  assert.equal(host.v142RoomGrammar.plans.length,1,"Host summary must expose one plan per room.");
  identities.push(grammar.biomeIdentity);landmarks.push(grammar.landmark);
}
assert.equal(new Set(identities).size,5,"All five campaign depths must expose distinct R24 biome identities.");
assert.equal(new Set(landmarks).size,5,"A fixed room/seed across all five depths must expose distinct biome landmarks.");

sandbox.run={seed:"R24-DETERMINISM",floor:3};
const makeRoom=()=>({id:12,v142Environment:{biome:"bone",role:"secret",rareRole:"hidden-alcove",variant:"bone-secret",dressingSeed:313},v142Objective:{type:"recover-hidden-cache",title:"RECOVER THE HIDDEN CACHE"}});
const first=api.grammarForRoom(makeRoom(),{rooms:[]},{},sandbox.run);
const second=api.grammarForRoom(makeRoom(),{rooms:[]},{},sandbox.run);
assert.deepEqual(first,second,"Identical run/floor/room metadata must produce identical room grammar.");
assert.equal(first.archetype,"concealed alcove","Rare-role grammar must refine the ordinary room role.");
assert.equal(first.routeIntent,"search","Hidden alcoves must communicate their exploration intent.");

console.log("R24 biome room-grammar contract passed.");
