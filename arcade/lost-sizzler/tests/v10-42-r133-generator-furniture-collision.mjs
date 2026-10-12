import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,"js",file),"utf8");
const worldSource=read("world.js");
const play=read("game-play.js");
const core=read("game-core.js");
const local=read("game-local-runtime.js");
const systems=read("systems.js");
const render=read("game-render.js");
function part(source,start,end){
  const i=source.indexOf(start),j=source.indexOf(end,i+start.length);
  assert.ok(i>=0&&j>i,"Missing real-source code section: "+start);
  return source.slice(i,j);
}
const ctx={window:{CCG_CONFIG:{worldWidth:24,worldHeight:24}}};
vm.createContext(ctx);
vm.runInContext(worldSource,ctx,{filename:"world.js"});
const W=ctx.window.CCGWorld;
const map=Array.from({length:24},()=>Array(24).fill(0));
const roomA={id:0,x:0,y:0,w:3,h:3,theme:"C64_ARCHIVE"};
const roomB={id:1,x:14,y:14,w:2,h:2,theme:"CPU_KITCHEN"};
const world={map,rooms:[roomA,roomB],start:{x:1,y:1},exit:{x:23,y:23},tunnelY:-1};
const generator={id:"generator-01",x:4,y:4,alive:true,hp:2,maxHp:2};
const worldHost={generators:[generator],enemies:[],items:[],chests:[],blockingDecor:[],shops:[],doors:[],revision:0};
assert.equal(W.walkable(map,4,4,worldHost),true,"Generator tile stays ordinary floor for projectiles/enemies");
assert.equal(W.playerWalkable(map,4,4,worldHost),false,"Living generator must block the player");
assert.equal(W.generatorAt(worldHost,4,4),generator);
assert.equal(W.playerWalkable(map,3,4,worldHost),true);
assert.equal(W.playerWalkable(map,-1,0,worldHost),false);

// Real movePlayer and corner movement; no mock version of the movement function.
const gameplay={
  W,world,host:worldHost,mode:"playing",Math,
  performance:{now:()=>5000},
  S:{sfx(){}},showToast(...args){gameplay.messages.push(args)},messages:[],
  C:{tile:32},P:{green:"#0f0",cyan:"#0ff"},
  weightBridgeBlocks:()=>false,tryDoor:()=>true,tryChest:()=>true,
  requestCollect:()=>{},updateRoomMessage:()=>{},reveal:()=>{},
  movementTriggers:()=>{},trailBetween:()=>{},burst:()=>{},floorComplete:()=>{},
  damageEnemy:()=>{},collideWithEnemy:()=>{},hurtPlayer:()=>{},
  hostStalker:()=>null
};
vm.createContext(gameplay);
vm.runInContext(
  part(play,"function diagonalClear(dx,dy,p){","function activateSwitch(")+
  part(play,"function movePlayer(p,dx,dy,dash=false){","function dashPlayer(")+
  ";this.move=movePlayer;this.diagonalClear=diagonalClear;",
  gameplay,{filename:"game-play.js"}
);
let player={x:3,y:4,rx:3,ry:4,dir:{x:1,y:0},hitStunMs:0};
gameplay.move(player,1,0,false);
assert.deepEqual([player.x,player.y],[3,4],"Player cannot walk through live generator");
assert.ok(gameplay.messages.some(x=>x[0]==="GENERATOR BLOCKS THE WAY"),"Blocked generator must explain the interaction");
player={x:2,y:4,rx:2,ry:4,dir:{x:1,y:0},hitStunMs:0};
gameplay.move(player,1,0,true);
assert.deepEqual([player.x,player.y],[3,4],"Dash must stop before the occupied generator tile");
player={x:3,y:3,rx:3,ry:3,dir:{x:1,y:1},hitStunMs:0};
assert.equal(gameplay.diagonalClear(1,1,player),true);
gameplay.move(player,1,1);
assert.deepEqual([player.x,player.y],[3,3],"Diagonal step cannot enter generator tile");
player={x:3,y:4,rx:3,ry:4,dir:{x:1,y:0},hitStunMs:0};
vm.runInContext(part(play,"function knockPlayerAway(p,from){","function collideWithEnemy(")+";this.knock=knockPlayerAway;",gameplay);
gameplay.knock(player,{x:2,y:4});
assert.deepEqual([player.x,player.y],[3,4],"Enemy knockback cannot force player into generator");
assert.match(play,/const px=lp\.x\+b\.dx,py=lp\.y\+b\.dy;if\(W\.playerWalkable\(world\.map,px,py,host\)\)/,
  "Enemy projectile knockback must use solid-generator player collision");
assert.match(play,/if\(!W\.playerWalkable\(world\.map,warp\.x,warp\.y,host\)\)/,
  "Tunnel travel must not place a player on a live generator");
assert.match(play,/if\(W\.playerWalkable\(world\.map,nx,ny,host\)\)\{p\.x=nx;p\.y=ny\}/,
  "Moving boulders may not push a player through a generator");
assert.match(play,/if\(W\.playerWalkable\(world\.map,backX,backY,host\)/,
  "Collision recoil must respect a live generator");

// Actual generator damage owner: destroying it frees movement without deleting the floor.
const hit={
  W,world,host:worldHost,
  S:{sfx(){}},P:{orange:"#f80",green:"#0f0"},Math:Object.create(Math),
  floatText(){},showToast(){},score:0,
  run:{stats:{generators:0},floor:2},stats:{generators:0},
  SYS:{updateObjective(){}},
  explored:new Map([["P1",new Set()]]),
  PGR:{roomCompletion:()=>0},
  shake:0
};
hit.Math.random=()=>1; // no optional artifact, focus on physical interaction.
vm.createContext(hit);
vm.runInContext(part(play,"function damageGenerator(g,power,p){","function hitStalker(")+";this.damageGenerator=damageGenerator;",hit,{filename:"game-play.js"});
const fighter={id:"P1",x:3,y:4};
hit.damageGenerator(generator,1,fighter);
assert.equal(generator.alive,true,"Damaged generator stays solid until defeated");
assert.equal(W.playerWalkable(map,4,4,worldHost),false);
hit.damageGenerator(generator,1,fighter);
assert.equal(generator.alive,false);
assert.equal(hit.score,700);
assert.equal(hit.run.stats.generators,1);
assert.equal(W.playerWalkable(map,4,4,worldHost),true,"Destroyed generator tile becomes walkable");
assert.equal(W.walkable(map,4,4,worldHost),true);
player={x:3,y:4,rx:3,ry:4,dir:{x:1,y:0},hitStunMs:0};
gameplay.move(player,1,0);
assert.deepEqual([player.x,player.y],[4,4],"Player can traverse former generator tile after destruction");
assert.match(read("v10-25-melee-ammo-balance.js"),/damageGenerator\(generator,meleeDamageFor\(p\),p\)/,
  "Existing melee owner must still damage generators");
assert.match(play,/const g=\(host\.generators\|\|\[\]\)\.find\(g=>g\.alive&&g\.x===Math\.round\(nx\)&&g\.y===Math\.round\(ny\)\)/,
  "Existing projectile collision must still hit active generator");

// Use the real teleport owner and a room where the only landing tile is a generator.
const warpGenerator={id:"generator-warp",x:15,y:15,alive:true};
const traveller={id:"P1",x:1,y:1,rx:1,ry:1,inventory:[{kind:"teleport"}]};
const teleportHost={...worldHost,generators:[warpGenerator],memoryPuzzle:null,timedRooms:[],arenas:[],r114BossFight:null,sigilLockdown:false};
let spent=0;
const teleportEnv={
  W,world,host:teleportHost,P:{purple:"#b7f",cyan:"#0ff"},
  PGR:{firstInventory:()=>0,inventoryRemove:()=>{spent++;return{kind:"teleport"}}},
  run:{},explored:new Map([[traveller.id,new Set(["15,15"])]]),
  showToast(){},S:{sfx(){}},burst(){},ring(){},reveal(){},updateRoomMessage(){},sync(){},Math,
  md:(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y),
  teleportBlockedByChallenge:()=>false,
  performance:{now:()=>5000}
};
vm.createContext(teleportEnv);
vm.runInContext(part(local,"function useTeleport(p){","function useMapReveal(")+";this.useTeleport=useTeleport;",teleportEnv);
assert.equal(teleportEnv.useTeleport(traveller),false,"Teleport cannot land on live generator");
assert.equal(spent,0,"Blocked teleport must not consume the spell");
warpGenerator.alive=false;
assert.equal(teleportEnv.useTeleport(traveller),true,"Teleport still works after generator destroyed");
assert.deepEqual([traveller.x,traveller.y],[15,15]);
assert.equal(spent,1);

// A displayed full-size crate or table must have a matching collision and HP owner.
const furnitureWorld={decor:[
  {id:"table",x:6,y:6,type:"table",blocking:false,hp:2},
  {id:"crate",x:7,y:6,type:"crate",blocking:true,hp:1,maxHp:2},
  {id:"desk",x:8,y:6,type:"desk",blocking:true,hp:2},
  {id:"pillar",x:9,y:6,type:"pillar",blocking:false},
  {id:"cable",x:6,y:7,type:"cable",blocking:false},
  {id:"light",x:7,y:7,type:"lightBar",blocking:false},
  {id:"sconce",x:8,y:7,type:"candleSconce",blocking:false},
  {id:"pipe",x:9,y:7,type:"pipe",blocking:false},
  {id:"gone",x:10,y:6,type:"crate",blocking:true,destroyed:true,hp:0}
]};
const furnitureHost={blockingDecor:[
  {id:"crate",x:7,y:6,type:"crate",hp:1,maxHp:2,structural:false}
],enemies:[],doors:[],generators:[],items:[],shops:[],revision:0};
const repaired=W.reconcileSolidFurniture(furnitureWorld,furnitureHost);
assert.equal(repaired,3,"Missing table, desk and pillar physical records must be restored");
assert.equal(W.reconcileSolidFurniture(furnitureWorld,furnitureHost),0,"Collision reconciliation must be idempotent");
assert.equal(furnitureHost.blockingDecor.length,4,"Do not duplicate existing damaged crate");
for(const [x,y] of [[6,6],[7,6],[8,6],[9,6]]){
  assert.equal(W.walkable(map,x,y,furnitureHost),false,"Visible solid furniture must block tile "+x+","+y);
}
for(const [x,y] of [[6,7],[7,7],[8,7],[9,7],[10,6]]){
  assert.equal(W.walkable(map,x,y,furnitureHost),true,"Small details and destroyed props must not obstruct "+x+","+y);
}
assert.equal(furnitureHost.blockingDecor.find(d=>d.id==="crate").hp,1,"Existing damaged furniture health must survive reconciliation");
assert.equal(furnitureHost.blockingDecor.find(d=>d.id==="pillar").structural,true,"Pillars must remain structural");
assert.equal(furnitureWorld.decor.find(d=>d.id==="table").blocking,true,"Renderer must know table is solid");
assert.match(core,/W\.reconcileSolidFurniture\(world,host\)/,"World start must reconcile furniture AFTER decorators");
assert.match(systems,/const nonBlockingDecor=new Set\(\["cable","pipe","lightBar","candleSconce"\]\)/,
  "Runtime generation must preserve nonblocking wall and floor details");
assert.match(render,/function drawFurniture\(\)/,"Existing furniture renderer must remain installed");

const fx=[];
const furnitureEnv={
  world:furnitureWorld,host:furnitureHost,
  S:{sfx(key){fx.push(key)}},
  P:{grey:"#777",gold:"#fc0"},
  Math,shake:0,burst(){},floatText(){},onFX(){},
  furnitureAmbush:()=>false,furnitureItem:()=>false
};
vm.createContext(furnitureEnv);
vm.runInContext(part(play,"function damageFurnitureAt(x,y,power=1,attacker=null){","function projectileImpactFxAllowed(")+
  ";this.breakFurniture=damageFurnitureAt;",furnitureEnv,{filename:"game-play.js"});
assert.equal(furnitureEnv.breakFurniture(6,6,1),true,"Solid table must respond to a weapon hit");
assert.equal(furnitureHost.blockingDecor.find(d=>d.id==="table").hp,1);
assert.equal(W.walkable(map,6,6,furnitureHost),false);
assert.equal(furnitureEnv.breakFurniture(6,6,1),true,"Two strikes must break a table with two HP");
assert.equal(furnitureWorld.decor.find(d=>d.id==="table").destroyed,true,"Broken table must stop rendering");
assert.equal(W.walkable(map,6,6,furnitureHost),true,"Destroyed table tile becomes walkable");
assert.equal(furnitureEnv.breakFurniture(7,6,1),true,"Already damaged crate breaks in one hit");
assert.equal(furnitureWorld.decor.find(d=>d.id==="crate").destroyed,true);
assert.equal(W.walkable(map,7,6,furnitureHost),true);
assert.equal(furnitureEnv.breakFurniture(9,6,5),true,"Structural pillar absorbs hits");
assert.equal(W.walkable(map,9,6,furnitureHost),false,"Structural pillar must not disappear");

console.log("R133 generator player collision, attacks, dashes/teleport/knockback and furniture integrity: PASS");
