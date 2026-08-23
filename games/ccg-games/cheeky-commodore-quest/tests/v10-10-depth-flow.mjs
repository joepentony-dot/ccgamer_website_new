import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameDir=path.resolve(here,"..");
const depthFile=path.join(gameDir,"js/v10-10-depth-flow.js");
const loaderFile=path.join(gameDir,"js/asset-overrides.js");
const depthSource=fs.readFileSync(depthFile,"utf8");
const loaderSource=fs.readFileSync(loaderFile,"utf8");

assert.match(loaderSource,/v10-10-depth-flow\.js\?v=\$\{CCG_DEPTH_FLOW_REV\}/,"depth-flow patch is cache-busted in the late loader");
assert.ok(
  loaderSource.indexOf("v10-10-depth-flow.js")>loaderSource.indexOf("v10-9-browser-stability.js"),
  "depth-flow runs after the existing AI/runtime stability patches"
);
assert.match(depthSource,/current!==home\|\|tooCloseToDoor/,"ordinary enemies are kept out of corridors and doorway cells");
assert.match(depthSource,/roomAt\(worldState,player\.x,player\.y\)===home/,"ordinary enemy attacks require the player to be in the same room");
assert.match(depthSource,/deathStalker/,"Death Stalker keeps its roaming exception");
assert.match(depthSource,/ENTRY_GRACE_EARLY_MS=1250/,"early room entry has a reaction window");
assert.match(depthSource,/const cadence=\.72\+progress\*\.52/,"combat cadence ramps with map depth");

const originalWindow=globalThis.window;
const originalDocument=globalThis.document;
const originalRun=globalThis.run;

let meleeCalls=0;
let shootCalls=0;
const baseAI={
  stepEnemies(host,map,players,dt,hooks,world){
    const enemy=host.enemies[0];
    enemy.x=9;enemy.y=2; // corridor immediately outside room 1
    hooks.melee?.(enemy,players[0],1);
    hooks.shoot?.({enemyId:enemy.id,power:1,damageScale:1});
    return dt;
  }
};
const world={
  startRoomId:0,
  rooms:[
    {id:0,x:0,y:0,w:5,h:5,depth:0},
    {id:1,x:10,y:0,w:5,h:5,depth:1},
    {id:2,x:30,y:0,w:5,h:5,depth:5}
  ],
  map:Array.from({length:8},()=>Array(40).fill(0))
};
const roomAt=(state,x,y)=>{
  for(const room of state.rooms){
    if(x>=room.x&&x<=room.x+room.w&&y>=room.y&&y<=room.y+room.h)return room.id;
  }
  return -1;
};

globalThis.window={
  CCGAI:baseAI,
  CCGWorld:{
    roomAt,
    walkable:()=>true
  },
  __CCG_WORLD:world
};
globalThis.document={querySelectorAll:()=>[]};
globalThis.run={floor:1};

try{
  vm.runInThisContext(depthSource,{filename:depthFile});
  assert.ok(window.CCGLostSizzlerDepthFlowV110,"depth-flow runtime exposes diagnostics");

  const start=window.CCGLostSizzlerDepthFlowV110.profileForDepth(0,10);
  const middle=window.CCGLostSizzlerDepthFlowV110.profileForDepth(5,10);
  const deep=window.CCGLostSizzlerDepthFlowV110.profileForDepth(10,10);
  assert.ok(start.cadence<middle.cadence&&middle.cadence<deep.cadence,"cadence rises steadily with traversal depth");
  assert.ok(start.damage<middle.damage&&middle.damage<deep.damage,"damage pressure rises steadily with traversal depth");
  assert.ok(start.shotChance<middle.shotChance&&middle.shotChance<=deep.shotChance,"ranged pressure rises steadily with traversal depth");

  const host={
    enemies:[{id:"enemy-1",x:12,y:2,roomId:1,alive:true,attackCooldown:0,moveCooldown:0}],
    doors:[{x:10,y:2,roomId:1}]
  };
  const corridorPlayer={id:"p1",x:8,y:2,health:8};
  const result=window.CCGAI.stepEnemies(host,world.map,[corridorPlayer],100,{
    melee(){meleeCalls++},
    shoot(){shootCalls++}
  },world);

  assert.ok(result<100,"early-map cadence slows the underlying AI clock");
  assert.equal(meleeCalls,0,"ordinary enemies cannot melee a player in a corridor");
  assert.equal(shootCalls,0,"ordinary enemies cannot shoot at a player in a corridor");
  assert.equal(roomAt(world,host.enemies[0].x,host.enemies[0].y),1,"ordinary enemy is restored to its home room after trying to enter a corridor");
  assert.notDeepEqual(
    {x:host.enemies[0].x,y:host.enemies[0].y},
    {x:10,y:2},
    "ordinary enemy is not left on a doorway cell"
  );

  const stalkerHost={
    enemies:[{id:"stalker",x:12,y:2,roomId:1,alive:true,deathStalker:true}],
    doors:[{x:10,y:2,roomId:1}]
  };
  window.CCGAI.stepEnemies(stalkerHost,world.map,[corridorPlayer],100,{melee(){},shoot(){}},world);
  assert.equal(stalkerHost.enemies[0].x,9,"Death Stalker retains corridor roaming behaviour");

  console.log("V10.10 depth difficulty and safe threshold checks passed");
}finally{
  if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;
  if(originalDocument===undefined)delete globalThis.document;else globalThis.document=originalDocument;
  if(originalRun===undefined)delete globalThis.run;else globalThis.run=originalRun;
}
