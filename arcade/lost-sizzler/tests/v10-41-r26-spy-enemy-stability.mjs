import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const hotfix=read("js/v10-41-r26-spy-enemy-stability.js");
const controller=read("js/v10-41-mode-runtime.js");
const index=read("index.html");

assert.match(index,/v10-41-r26-spy-enemy-stability\.js\?v=20260826r30/,"canonical page must retain the r26 stability hotfix under the current r30 cache shell");
assert.match(hotfix,/const SPY_MOVE_CADENCE_MS=220;/,"the retained r26 diagnostic API must preserve the historical 220ms value");
assert.match(hotfix,/state\.controllerOwnedMovement=true/,"r26 must declare controller-owned Spy movement");
assert.match(hotfix,/state\.controllerOwnedUpdate=true/,"r26 must declare controller-owned frame execution");
assert.doesNotMatch(hotfix,/window\.movePlayer\s*=/,"r26 must never replace the isolated Spy movement owner");
assert.doesNotMatch(hotfix,/window\.update\s*=/,"r26 must never replace the controller update boundary");
assert.match(controller,/CCGLostSizzlerV141R26SpyEnemyStability\?\.preControllerFrame/,"the mode runtime must invoke r26 pre-frame compatibility explicitly");
assert.match(controller,/CCGLostSizzlerV141R26SpyEnemyStability\?\.postControllerFrame/,"the mode runtime must invoke r26 post-frame compatibility explicitly");
assert.match(hotfix,/enemy\._ccgHomeRoomId=r24Room;enemy\.roomId=r24Room;/,"r26 must retain compatibility for any stale population-rehome marker already present in runtime state");
assert.match(hotfix,/jump>ENEMY_VISUAL_SNAP_DISTANCE/,"large enemy relocations must snap render interpolation");
assert.match(hotfix,/drawPixelEnemySpriteV141R26StableFacing/,"enemy render facing must be stabilised at the final sprite handoff");
assert.match(hotfix,/Visual\/interpolation repair must never own idle\/chase\/search/,"r26 visual stability must explicitly leave alert-state ownership with the core AI");

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

const originalUpdate=context.update,originalMove=context.movePlayer;
context.update(16);
assert.equal(p1.x,1,"the inherited source remains executable for the ownership proof");
assert.equal(context.update,originalUpdate,"r26 installation must preserve the existing update owner");
assert.equal(context.movePlayer,originalMove,"r26 installation must preserve the existing movement owner");
const beforeMove1=context.move1,beforeFallback=r24.state.spyMoveCooldownMs;
assert.equal(api.preControllerFrame("spy-online",16),false,"r26 Dungeon compatibility must reject the Spy controller");
assert.equal(context.move1,beforeMove1,"rejected r26 compatibility must not rewrite Spy movement cadence");
assert.equal(r24.state.spyMoveCooldownMs,beforeFallback,"rejected r26 compatibility must not arm the retired r24 fallback");

body.dataset.specialMode="";
context.CCGLostSizzlerSpecialModes.active={type:"dungeon"};
r24.normalSoloDungeonMode=()=>true;
const enemy={id:"E1",alive:true,x:12,y:2,roomId:0,_ccgHomeRoomId:0,_ccgR24LastRoomId:1,aiState:"chase",lastSeen:{x:1,y:1},targetId:"P1",memoryMs:5000,searchMs:500,facing:{x:-1,y:0},moveCooldown:0};
host.enemies=[enemy];
visualMap.set("E1",{rx:2,ry:2});
assert.equal(api.preControllerFrame("dungeon-solo",16),true,"Dungeon Solo must invoke the retained r26 compatibility hook");
assert.equal(api.state.controllerPreFrames,1,"Dungeon Solo compatibility pre-frames must be measurable");
assert.equal(enemy._ccgHomeRoomId,1);
assert.equal(enemy.roomId,1);
assert.equal(enemy.aiState,"idle");
assert.equal(visualMap.get("E1").rx,12,"rehome compatibility must snap stale enemy interpolation X");
assert.equal(visualMap.get("E1").ry,2,"rehome compatibility must snap stale enemy interpolation Y");

api.postControllerFrame("dungeon-solo",16);
enemy.aiState="chase";enemy.targetId="P1";enemy.lastSeen={x:p1.x,y:p1.y};
api.postControllerFrame("dungeon-solo",16);
assert.equal(enemy.aiState,"chase","visual stability must not force a live chase into search and create !/? alert flicker");
assert.equal(enemy.targetId,"P1","visual stability must not clear the core AI target while chasing");

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
console.log("Lost Sizzler r26 controller-owned Dungeon Solo enemy compatibility and non-owner Spy checks passed under the r30 cache shell.");