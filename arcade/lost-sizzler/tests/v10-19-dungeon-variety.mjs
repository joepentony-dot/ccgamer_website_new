import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameDir=path.resolve(here,"..");
const source=fs.readFileSync(path.join(gameDir,"js/v10-19-dungeon-variety.js"),"utf8");
const loader=fs.readFileSync(path.join(gameDir,"js/asset-overrides.js"),"utf8");

assert.match(loader,/v10-19-dungeon-variety\.js\?v=/,"dungeon variety patch is cache-busted and loaded");
assert.match(source,/protectedCells\(w\)/,"progression-sensitive cells are protected before carving");
assert.match(source,/parallelLoops/,"parallel corridor loops are supported");
assert.match(source,/shortcuts/,"cross-corridor shortcuts are supported");
assert.match(source,/greatHalls/,"large interstitial halls are supported");
assert.match(source,/junctions/,"junction plazas are supported");
assert.match(source,/alcoves/,"side alcoves are supported");
assert.match(source,/openThresholds/,"short room links can become broad thresholds");
assert.match(source,/variety-cache-/,"dead-end exploration rewards are installed");

const width=64,height=42;
const config={worldWidth:width,worldHeight:height};
function blank(){return Array.from({length:height},()=>Array(width).fill(1));}
function carveRoom(map,r){for(let y=r.y;y<=r.y+r.h;y++)for(let x=r.x;x<=r.x+r.w;x++)map[y][x]=0;}
function roomAt(world,x,y){for(let i=world.rooms.length-1;i>=0;i--){const r=world.rooms[i];if(x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h)return r.id}return-1;}
function line(a,b){const out=[];let x=a.x,y=a.y;out.push({x,y});while(x!==b.x){x+=Math.sign(b.x-x);out.push({x,y})}while(y!==b.y){y+=Math.sign(b.y-y);out.push({x,y})}return out;}
function makeWorld(){
  const map=blank();
  const rooms=[
    {id:0,x:3,y:4,w:8,h:8,optional:false},
    {id:1,x:27,y:4,w:8,h:8,optional:false},
    {id:2,x:27,y:25,w:8,h:8,optional:false},
    {id:3,x:51,y:25,w:8,h:8,optional:false},
    {id:4,x:51,y:4,w:8,h:8,optional:true}
  ];
  rooms.forEach(r=>carveRoom(map,r));
  const edges=[
    {a:0,b:1,path:line({x:11,y:8},{x:27,y:8})},
    {a:1,b:2,path:line({x:31,y:12},{x:31,y:25})},
    {a:2,b:3,path:line({x:35,y:29},{x:51,y:29})},
    {a:1,b:4,path:line({x:35,y:8},{x:51,y:8})}
  ];
  for(const edge of edges)for(const p of edge.path)map[p.y][p.x]=0;
  return{
    map,rooms,edges,start:{x:7,y:8},exit:{x:55,y:29},startRoomId:0,exitRoomId:3,
    doorSpecs:[{id:"locked-test",x:50,y:8,roomId:4}],optionalCells:new Set(),lockedRooms:new Set([4]),tunnelY:38
  };
}

const baseWorld=makeWorld();
const before=baseWorld.map.map(row=>row.slice());
const sandbox={window:{CCG_CONFIG:config,CCGWorld:{
  generate:()=>makeWorld(),
  createHostState:()=>({items:[],enemies:[],chests:[],doors:[],revision:1}),
  roomAt
}}};
vm.createContext(sandbox);
vm.runInContext(source,sandbox,{filename:"v10-19-dungeon-variety.js"});
const world=sandbox.window.CCGWorld.generate("regression-seed");
const meta=world.dungeonVariety;
assert.equal(meta?.version,"10.19","generated world is marked as V10.19 variety");
assert.ok(meta.changedCells>0,"ordinary corridor structure gains additional walkable geometry");
assert.ok(meta.alcoves.length+meta.galleries.length+meta.junctions.length+meta.parallelLoops.length+meta.greatHalls.length+meta.shortcuts.length>0,"at least one non-standard traversal space is created");

// The patch is additive: it must never close an existing route.
for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(before[y][x]===0)assert.equal(world.map[y][x],0,`existing floor at ${x},${y} remains walkable`);

// The locked optional room and a three-tile safety buffer around it must not receive new holes.
const locked=world.rooms[4];
for(let y=locked.y-3;y<=locked.y+locked.h+3;y++)for(let x=locked.x-3;x<=locked.x+locked.w+3;x++){
  if(x<0||y<0||x>=width||y>=height)continue;
  if(before[y][x]===1)assert.equal(world.map[y][x],1,`locked-room buffer at ${x},${y} was not bypassed`);
}

const host=sandbox.window.CCGWorld.createHostState(world);
if(meta.deadEnds.length)assert.ok(host.items.some(item=>String(item.id).startsWith("variety-cache-")),"dead-end alcoves receive a small exploration reward");

console.log("V10.19 dungeon variety regression checks passed");
