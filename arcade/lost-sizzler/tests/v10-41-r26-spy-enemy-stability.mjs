import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const hotfix=read("js/v10-41-r26-spy-enemy-stability.js");
const index=read("index.html");

assert.match(index,/v10-41-r26-spy-enemy-stability\.js\?v=20260825r27/,"canonical page must retain the r26 stability hotfix under the current r27 cache shell");
assert.match(hotfix,/const SPY_MOVE_CADENCE_MS=220;/,"Spy Vs Spy walking must use the slower 220ms tactical cadence");
assert.match(hotfix,/value\+Math\.max\(0,Number\(dt\)\|\|0\)/,"r26 must arm the older direct fallback beyond the current frame decrement");
assert.match(hotfix,/enemy\._ccgHomeRoomId=r24Room;enemy\.roomId=r24Room;/,"r26 must retain compatibility for any stale population-rehome marker already present in runtime state");
assert.match(hotfix,/jump>ENEMY_VISUAL_SNAP_DISTANCE/,"large enemy relocations must snap render interpolation");
assert.match(hotfix,/drawPixelEnemySpriteV141R26StableFacing/,"enemy render facing must be stabilised at the final sprite handoff");

let clock=1000;
const visualMap=new Map();
const body={dataset:{specialMode:"sizzler-saboteurs",tutorialActive:"false"}};
const world={rooms:[{id:0},{id:1}],map:[[0]]};
const host={enemies:[]};
const p1={id:"P1",x:0,y:0,health:8};
const r24={state:{spyMoveCooldownMs:0},normalSoloDungeonMode:()=>false};
function baseMove(player,dx,dy){player.x+=dx;player.y+=dy;return true}
baseMove.__ccgV141SpyFinal=true;
function baseRender(enemy){return enemy.facing?.x||0}
baseRender.__ccgV135Atlas=true;
let context;
function baseUpdate(dt){
  context.move1-=dt;
  r24.state.spyMoveCooldownMs=Math.max(0,r24.state.spyMoveCooldownMs-dt);
  const before=p1.x;
  if(context.move1<=0){context.movePlayer(p1,1,0);context.move1=138}
  if(p1.x===before&&r24.state.spyMoveCooldownMs<=0){p1.x+=1;r24.state.spyMoveCooldownMs=138}
}
baseUpdate.__ccgV141R25SpyCadence=true;
context={
  console,performance:{now:()=>clock},Date,
  setInterval:()=>1,clearInterval:()=>{},addEventListener:()=>{},document:{body},
  CCG_CONFIG:{player:{moveDelay:138}},
  CCGLostSizzlerSpecialModes:{active:{type:"sizzler-saboteurs",seed:"SPY",state:{round:1,players:[{id:"P1",status:"active"}]}}},
  CCGLostSizzlerV141R24LiveRegressions:r24,
  CCGWorld:{roomAt:(_world,x)=>x<10?0:1},
  world,host,p1,p2:null,remote:new Map(),run:{daily:false},mode:"playing",net:{mode:"solo"},move1:0,move2:0,
  movePlayer:baseMove,update:baseUpdate,drawPixelEnemySprite:baseRender,enemyVisuals:visualMap,allPlayers:()=>[p1]
};
context.window=context;
vm.createContext(context);
vm.runInContext(hotfix,context,{filename:"v10-41-r26-spy-enemy-stability.js"});
const api=context.CCGLostSizzlerV141R26SpyEnemyStability;
assert.ok(api,"r26 stability API must install");
assert.equal(api.constants.SPY_MOVE_CADENCE_MS,220);

context.update(16);
assert.equal(p1.x,1,"first Spy frame should allow one movement step");
assert.ok(context.move1>=220,"normal movement timer must be re-armed to the r26 Spy cadence");
assert.ok(r24.state.spyMoveCooldownMs>=220,"legacy direct fallback timer must also be re-armed");
clock=1100;
context.update(100);
assert.equal(p1.x,1,"legacy r24 fallback must not bypass the Spy governor");
clock=1221;
context.update(121);
assert.equal(p1.x,2,"Spy movement should resume after the full 220ms cadence");

body.dataset.specialMode="";
context.CCGLostSizzlerSpecialModes.active={type:"dungeon"};
r24.normalSoloDungeonMode=()=>true;
const enemy={id:"E1",alive:true,x:12,y:2,roomId:0,_ccgHomeRoomId:0,_ccgR24LastRoomId:1,aiState:"chase",lastSeen:{x:1,y:1},targetId:"P1",memoryMs:5000,searchMs:500,facing:{x:-1,y:0},moveCooldown:0};
host.enemies=[enemy];
visualMap.set("E1",{rx:2,ry:2});
assert.equal(api.syncEnemyHomeOwnership(),1,"r26 compatibility must reconcile a stale population-rehome marker before the next AI step");
assert.equal(enemy._ccgHomeRoomId,1);
assert.equal(enemy.roomId,1);
assert.equal(enemy.aiState,"idle");
assert.equal(visualMap.get("E1").rx,12,"rehome compatibility must snap stale enemy interpolation X");
assert.equal(visualMap.get("E1").ry,2,"rehome compatibility must snap stale enemy interpolation Y");

api.stabiliseEnemyVisualState();
enemy.x=11;enemy.facing={x:0,y:-1};
api.stabiliseEnemyVisualState();
assert.equal(context.drawPixelEnemySprite(enemy,0,0),-1,"vertical AI facing must not flip a left-moving enemy sprite to the wrong horizontal direction");
assert.equal(enemy.facing.x,0,"render-only facing override must restore logical AI facing");
assert.equal(enemy.facing.y,-1,"render-only facing override must restore logical AI facing");

const stableUpdate=context.update,stableMove=context.movePlayer,stableRender=context.drawPixelEnemySprite;
api.install();api.install();
assert.equal(context.update,stableUpdate,"repeated installs must not grow the update wrapper chain");
assert.equal(context.movePlayer,stableMove,"repeated installs must not grow the move wrapper chain");
assert.equal(context.drawPixelEnemySprite,stableRender,"repeated installs must not grow the render wrapper chain");
console.log("Lost Sizzler r26 Spy movement and Solo enemy stability compatibility checks passed under the r27 cache shell.");
