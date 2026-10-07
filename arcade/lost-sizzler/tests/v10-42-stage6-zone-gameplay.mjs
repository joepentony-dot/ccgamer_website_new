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
      {id:"hazard-a",roomId:2,type:"blade",period:2300,warningMs:700,activeMs:560,groups:3,cells:[{x:5,y:5,group:0}]}
    ],
    generators:[{id:"gen-a",spawnCooldown:7000}],
    v142EncounterRuntime:{rooms:[
      {roomId:1,encounter:{event:{kind:"keep-reinforcements"},elite:true,rewardFocus:"equipment"}},
      {roomId:3,encounter:{event:{kind:"route-cache"},elite:false,rewardFocus:"supplies"}}
    ]}
  };
  const context={
    window:{
      CCG_CONFIG:{maxFloors:15},
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
  [1,"threshold"],[2,"driveworks"],[3,"iron"],[4,"budget"],[5,"cartridge"],
  [6,"tapes"],[7,"bone"],[8,"demo"],[9,"modem"],[10,"sid"],
  [11,"ash"],[12,"foundry"],[13,"scores"],[14,"crt"],[15,"citadel"]
];
for(const [floor,id] of profiles){
  const {context}=runtime(),api=context.window.CCGLostSizzlerV142Stage6ZoneGameplay;
  assert.equal(api.profileForFloor(floor).id,id);
}
{
  const {context}=runtime(),api=context.window.CCGLostSizzlerV142Stage6ZoneGameplay;
  assert.equal(api.profileForFloor(15).tier,5,"Floor 15 must reach the final enemy/hazard tier");
  assert.notEqual(api.profileForFloor(6).id,api.profileForFloor(5).id,"Floor 6 must no longer clamp to the old Floor 5 profile");
}

assert.notDeepEqual(
  profiles.map(([floor])=>runtime().context.window.CCGLostSizzlerV142Stage6ZoneGameplay.profileForFloor(floor).enemyKinds.join(",")),
  Array(15).fill("scout,ambusher,hunter"),
  "zone enemy composition pools must materially differ"
);

{
  const {context,host,world}=runtime(),api=context.window.CCGLostSizzlerV142Stage6ZoneGameplay;
  context.window.CCGSystems.decorate(world,host,{floor:3,seed:"STAGE6-IRON"});
  assert.equal(host.v142ZoneGameplay.zone,"iron");
  assert.equal(host.v142ZoneGameplay.topologyVersion,"stage5-r1");
  assert.equal(host.v142ZoneGameplay.topologyProfile,"iron-crossroads");
  assert.equal(host.v142ZoneGameplay.encounterDirectives.length,2);
  assert.equal(host.v142ZoneGameplay.encounterDirectives[0].routeRole,"crossroads");

  assert.equal(host.enemies.find(e=>e.id==="named").kind,"hunter","named followers must not be retyped");
  assert.equal(host.enemies.find(e=>e.id==="guardian").kind,"guardian","guardian identity must remain authoritative");
  assert.equal(host.enemies.find(e=>e.id==="guardian").v142ZoneBossPattern,"armoured-advance");
  assert.equal(host.traps.length,0,"R67 must retire ordinary procedural floor traps during Stage 6 decoration");
  assert.equal(host.hazardRooms[0].v142Zone,"iron");
  assert.ok(["blade","arrows"].includes(host.hazardRooms[0].type),"Iron Keep must express its mechanical hazard palette through the dedicated hazard room");
  assert.equal(host.generators[0].v142Zone,"iron");
  assert.ok(host.generators[0].spawnCooldown<7000,"Iron Keep generator pressure must use the real existing cooldown primitive");
}

{
  const {context,host,world}=runtime();
  context.window.CCGSystems.decorate(world,host,{floor:11,seed:"STAGE6-ASH"});
  assert.equal(host.v142ZoneGameplay.zone,"ash");
  assert.equal(host.traps.length,0,"Ash Depths must not reintroduce retired ordinary floor traps");
  assert.ok(["embers","blade"].includes(host.hazardRooms[0].type),"Ash Depths must bias the dedicated hazard room toward its ember/blade palette");
  assert.ok(host.hazardRooms[0].r114Unpredictable,"late dedicated hazards must use the less predictable pattern owner");
  assert.ok(host.generators[0].spawnCooldown<6000,"late floors must increase generator pressure through the existing cooldown");
}

assert.doesNotMatch(source,/\.map\s*\[[^\]]+\]\s*=|carveCell|carvePath|addStage5Topology/,"Stage 6 must not become a topology owner");
assert.doesNotMatch(source,/run\.floor\s*=|floorComplete\(|descendFloor\(|prepareTransit\(|confirmArrival\(/,"Stage 6 must not advance campaign or portal progression");
assert.doesNotMatch(source,/saveCheckpoint|loadCheckpoint|localStorage|sessionStorage|fetch\(|WebSocket|RoomNetwork/,"Stage 6 must not own persistence or networking");
assert.match(source,/const baseDecorate=SYS\.decorate\.bind\(SYS\)/,"Stage 6 must consume established decoration rather than replace it");
assert.match(source,/return applyZoneGameplay\(worldState,result\|\|hostState,runState\)/,"Stage 6 must run as a post-decoration consumer");
assert.match(source,/protectedEnemy\(enemy\)/,"special enemy identities must be explicitly protected from ordinary composition retyping");

console.log("PASS V10.42 Stage 6 zone-specific gameplay");
