import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const read=path=>fs.readFileSync(fileURLToPath(new URL(path,import.meta.url)),"utf8");
const systems=read("../js/systems.js"),ai=read("../js/ai.js");
const select=(source,from,to)=>{const a=source.indexOf(from),b=source.indexOf(to,a);assert.ok(a>=0&&b>a,"Source owner missing: "+from);return source.slice(a,b)};
const W={
  roomAt:(_world,x)=>x>=5?1:0,
  walkable:(_map,x,y)=>x>=0&&x<10&&y>=0&&y<10,
  doorAt:()=>null
};
const C={worldWidth:10,worldHeight:10};
const DIRS=[[1,0],[-1,0],[0,1],[0,-1]];
const inside=(room,p)=>p.x>=room.x&&p.x<=room.x+room.w&&p.y>=room.y&&p.y<=room.y+room.h;
const world={rooms:[{id:0,x:0,y:0,w:4,h:9},{id:1,x:5,y:0,w:4,h:9}],
  map:Array.from({length:10},()=>Array(10).fill(0)),sanctuaryRooms:[]};
const host={doors:[],enemies:[{id:"boss-5",alive:true}],r114BossFight:{roomId:1,bossId:"boss-5",cleared:false},
  generators:[{id:"g1",alive:false},{id:"g2",alive:false},{id:"g3",alive:true}],enteredRoomIds:[0,1]};
const contextS=vm.createContext({W,C,DIRS,inside,Int32Array,Uint8Array,Set,Number});
vm.runInContext(select(systems,"  function liveBossRoomId(","  function objectiveBaseText("),contextS,
  {filename:"systems.js::pathStep",timeout:3000});
const contextA=vm.createContext({W,window:{CCGSystems:{inSanctuary:()=>false}},
  occupied:()=>false,occupiedByPlayer:()=>false,stalkerDoor:()=>null,
  roomEntered:()=>true,clearOfUnenteredDoor:()=>true,Number});
vm.runInContext(select(ai,"  function passable(","  function stageUnenteredEnemies("),contextA,
  {filename:"ai.js::passable",timeout:3000});
const count={id:"count-loadula",x:4,y:4},death={id:"death-stalker-floor-5",deathStalker:true,x:4,y:4};
const target={x:7,y:4};
const step=(actor=count)=>contextS.pathStep(world,host,actor,target,false);
const enter=(actor=death)=>contextA.passable(actor,host,world.map,5,4,world);
const before=JSON.stringify(host);
assert.equal(step(),null,"Count must not path into a live authored boss room");
assert.equal(enter(),false,"Death Stalker must not enter a live authored boss room");
assert.equal(enter({id:"ordinary",x:4,y:4}),true,"Ordinary enemies retain authored AI");
assert.equal(step({id:"ordinary",x:4,y:4})?.x,5,"Other pathStep users retain their routes");
assert.equal(contextS.pathStep(world,host,{id:"count-loadula",x:6,y:4},{x:3,y:4},false)?.x,5,
  "Legacy Count already in the boss chamber can leave, without teleport/deletion");
assert.equal(contextA.passable({...death,x:5},host,world.map,4,4,world),true,
  "Legacy Death Stalker in the boss chamber can leave");
assert.equal(JSON.stringify(host),before,"No boss, actor, inventory, generator or reward state mutated");
const restored=JSON.parse(JSON.stringify(host));
assert.equal(contextS.pathStep(world,restored,count,target,false),null,
  "JSON-restored 2/3-generator state retains the boss-room boundary");
restored.generators[2].alive=false;
assert.equal(contextS.pathStep(world,restored,count,target,false),null,
  "3/3 generator completion must not remove living boss protection");
assert.equal(restored.generators.filter(g=>!g.alive).length,3);
host.enemies[0].alive=false;
assert.equal(step()?.x,5,"Count resumes hunt after boss death");
assert.equal(enter(),true,"Death Stalker resumes hunt after boss death");
host.enemies[0].alive=true;host.r114BossFight.cleared=true;
assert.equal(step()?.x,5,"Boss clear releases Count without erasing it");
assert.equal(enter(),true,"Boss clear releases Death Stalker without erasing it");
delete host.r114BossFight;
assert.equal(step()?.x,5,"Ordinary floors without a boss fight are unchanged");
assert.equal(enter(),true,"Death Stalker remains global on ordinary floors");
console.log("R153 real systems.js and ai.js: living boss chamber excludes Count/Death Stalker, old saves can exit, ordinary AI unaffected, boss death/clear restores pursuit, JSON 2/3-to-3/3 generator state unchanged.");
