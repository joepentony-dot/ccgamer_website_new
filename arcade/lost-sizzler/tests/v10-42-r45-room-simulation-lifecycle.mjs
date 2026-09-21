import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/ai.js"),"utf8");

const roomAt=(_world,x)=>{
  if(x<10)return 0;
  if(x<20)return 1;
  if(x>=30)return 2;
  return -1;
};
const world={
  rooms:[{id:0},{id:1},{id:2}],
  graph:[[1],[0],[]],
  map:Array.from({length:8},()=>Array(48).fill(0))
};
const W={
  roomAt,
  sameRoom(w,a,b){const ar=roomAt(w,a.x,a.y),br=roomAt(w,b.x,b.y);return ar>=0&&ar===br},
  walkable(map,x,y){return Boolean(map[y]?.[x]===0)},
  doorAt(){return null}
};
const C={enemy:{
  lineOfSightRange:14,torchSightRange:20,searchTime:2200,
  idleStepMin:900,idleStepMax:1300,namedAttackMultiplier:.7,
  alertMemory:{scout:2200,ghost:2600},
  chaseStep:{scout:900,ghost:880}
}};
const context={window:{CCG_CONFIG:C,CCGWorld:W,CCGSystems:{inSanctuary(){return false}}},console,Math,Map,Set,Number,String,Boolean,Array,Object};
context.window.window=context.window;
context.window.__CCG_WORLD=world;
vm.createContext(context);
vm.runInContext(source,context,{filename:"ai.js"});
const A=context.window.CCGAI;
assert.ok(A,"AI runtime must install");

const makeEnemy=(id,x,extra={})=>({
  id,x,y:2,kind:"scout",hp:3,maxHp:3,alive:true,aiState:"idle",facing:{x:1,y:0},
  lastSeen:null,memoryMs:0,searchMs:0,moveCooldown:5000,attackCooldown:5000,
  chargeCooldown:5000,healCooldown:5000,flash:0,...extra
});
const adjacent=makeEnemy("adjacent",12);
const distant=makeEnemy("distant",35);
const stalker=makeEnemy("stalker",36,{kind:"ghost",deathStalker:true,voidStalker:true});
const host={enemies:[adjacent,distant,stalker],doors:[],enteredRoomIds:[0],revision:1};
const player={id:"P1",x:2,y:2,health:8,torchMs:0,dir:{x:1,y:0}};

A.stepEnemies(host,world.map,[player],100,{},world);

assert.equal(adjacent.attackCooldown,4900,"enemy in a room adjacent to the player must continue normal simulation");
assert.equal(distant.attackCooldown,5000,"distant ordinary room enemy must sleep instead of consuming a full AI step");
assert.equal(distant.moveCooldown,5000,"sleeping enemy state must be retained rather than destructively unloaded");
assert.equal(stalker.attackCooldown,4900,"the roaming Death Stalker must remain globally simulated");

const diagnostics=A.getSimulationDiagnostics();
assert.equal(diagnostics.total,3);
assert.equal(diagnostics.active,2);
assert.equal(diagnostics.sleeping,1);
assert.deepEqual([...diagnostics.activeRooms].sort((a,b)=>a-b),[0,1],"player room and directly connected room must stay awake");

assert.match(source,/enemyOccupancy=buildEnemyOccupancy\(host\)/,"AI tick must build one occupancy index instead of repeatedly scanning the full enemy roster during pathfinding");
assert.match(source,/const activeRooms=simulationRoomsForPlayers/,"AI tick must derive a bounded room simulation neighbourhood");
assert.match(source,/host\.enemies\.filter\(e=>simulationEligible/,"full enemy stepping must be limited to awake simulation entities");

console.log("Dungeon Carnage r45 room-aware AI lifecycle contract passed.");
