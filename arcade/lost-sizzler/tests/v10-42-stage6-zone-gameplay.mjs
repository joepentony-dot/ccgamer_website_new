import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-42-stage6-zone-gameplay.js"),"utf8");

function runtime(){
  const worldRooms=[
    {id:0,stage5TopologyRole:"route"},
    {id:1,stage5TopologyRole:"crossroads"},
    {id:2,stage5TopologyRole:"alternate-route"},
    {id:3,stage5TopologyRole:"purposeful-dead-end"}
  ];
  const host={
    enemies:[
      {id:"ordinary-a",x:1,y:1,kind:"scout",hp:3,maxHp:3,attackCooldown:900},
      {id:"ordinary-b",x:2,y:1,kind:"ambusher",hp:3,maxHp:3,attackCooldown:900},
      {id:"named",x:3,y:1,kind:"hunter",hp:8,maxHp:8,follower:{name:"Named"},attackCooldown:700},
      {id:"guardian",x:4,y:1,kind:"guardian",hp:20,maxHp:20,guardian:true,attackCooldown:850}
    ],
    traps:[
      {id:"trap-a",roomId:1,kind:"fire",period:1800,phase:10},
      {id:"trap-b",roomId:3,kind:"shock",period:2200,phase:20}
    ],
    hazardRooms:[
      {id:"hazard-a",roomId:2,type:"blade",period:2300,warningMs:700,activeMs:560}
    ],
    generators:[{id:"gen-a",spawnCooldown:7000}],
    v142EncounterRuntime:{rooms:[
      {roomId:1,encounter:{event:{kind:"keep-reinforcements"},elite:true,rewardFocus:"equipment"}},
      {roomId:3,encounter:{event:{kind:"route-cache"},elite:false,rewardFocus:"supplies"}}
    ]}
  };
  const context={
    window:{
      CCG_CONFIG:{maxFloors:5},
      CCGWorld:{
        roomAt(_world,x){return Math.max(0,Math.min(3,Math.floor(x)-1))}
      },
      CCGSystems:{
        decorate(){return host}
      }
    }
  };
  vm.createContext(context);
  vm.runInContext(source,context,{filename:"v10-42-stage6-zone-gameplay.js"});
  return{context,host,world:{rooms:worldRooms,topology:{version:"stage5-r1",profile:"iron-crossroads"}}};
}

const profiles=[
  [1,"threshold"],[2,"iron"],[3,"bone"],[4,"ash"],[5,"sigil"]
];
for(const [floor,id] of profiles){
  const {context}=runtime(),api=context.window.CCGLostSizzlerV142Stage6ZoneGameplay;
  assert.equal(api.profileForFloor(floor).id,id);
}
assert.notDeepEqual(
  profiles.map(([floor])=>runtime().context.window.CCGLostSizzlerV142Stage6ZoneGameplay.profileForFloor(floor).enemyKinds.join(",")),
  Array(5).fill("scout,ambusher,hunter"),
  "zone enemy composition pools must materially differ"
);

{
  const {context,host,world}=runtime(),api=context.window.CCGLostSizzlerV142Stage6ZoneGameplay;
  context.window.CCGSystems.decorate(world,host,{floor:2,seed:"STAGE6-IRON"});
  assert.equal(host.v142ZoneGameplay.zone,"iron");
  assert.equal(host.v142ZoneGameplay.topologyVersion,"stage5-r1");
  assert.equal(host.v142ZoneGameplay.topologyProfile,"iron-crossroads");
  assert.equal(host.v142ZoneGameplay.encounterDirectives.length,2);
  assert.equal(host.v142ZoneGameplay.encounterDirectives[0].routeRole,"crossroads");

  assert.equal(host.enemies.find(e=>e.id==="named").kind,"hunter","named followers must not be retyped");
  assert.equal(host.enemies.find(e=>e.id==="guardian").kind,"guardian","guardian identity must remain authoritative");
  assert.equal(host.enemies.find(e=>e.id==="guardian").v142ZoneBossPattern,"armoured-advance");
  assert.ok(host.traps.every(t=>t.v142Zone==="iron"));
  assert.ok(host.traps.every(t=>["shock","spike"].includes(t.kind)),"Iron Keep traps must use its bounded mechanical palette");
  assert.equal(host.hazardRooms[0].v142Zone,"iron");
  assert.equal(host.generators[0].v142Zone,"iron");
  assert.ok(host.generators[0].spawnCooldown<7000,"Iron Keep generator pressure must use the real existing cooldown primitive");
}

{
  const {context,host,world}=runtime();
  context.window.CCGSystems.decorate(world,host,{floor:4,seed:"STAGE6-ASH"});
  assert.equal(host.v142ZoneGameplay.zone,"ash");
  assert.ok(host.traps.some(t=>t.kind==="fire"),"Ember Depths must materially bias real trap kind toward fire");
  assert.ok(host.generators[0].spawnCooldown<6000,"Ember Depths must increase generator pressure through the existing cooldown");
}

assert.doesNotMatch(source,/\.map\s*\[[^\]]+\]\s*=|carveCell|carvePath|addStage5Topology/,"Stage 6 must not become a topology owner");
assert.doesNotMatch(source,/run\.floor\s*=|floorComplete\(|descendFloor\(|prepareTransit\(|confirmArrival\(/,"Stage 6 must not advance campaign or portal progression");
assert.doesNotMatch(source,/saveCheckpoint|loadCheckpoint|localStorage|sessionStorage|fetch\(|WebSocket|RoomNetwork/,"Stage 6 must not own persistence or networking");
assert.match(source,/const baseDecorate=SYS\.decorate\.bind\(SYS\)/,"Stage 6 must consume established decoration rather than replace it");
assert.match(source,/return applyZoneGameplay\(worldState,result\|\|hostState,runState\)/,"Stage 6 must run as a post-decoration consumer");
assert.match(source,/protectedEnemy\(enemy\)/,"special enemy identities must be explicitly protected from ordinary composition retyping");

console.log("PASS V10.42 Stage 6 zone-specific gameplay");
