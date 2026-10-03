import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const configSource=fs.readFileSync(path.join(root,"js/config.js"),"utf8");
const worldSource=fs.readFileSync(path.join(root,"js/world.js"),"utf8");

function runtime(){
  const context={window:{}};
  vm.createContext(context);
  vm.runInContext(configSource,context,{filename:"config.js"});
  vm.runInContext(worldSource,context,{filename:"world.js"});
  return{C:context.window.CCG_CONFIG,W:context.window.CCGWorld};
}

function serialiseMap(map){return map.map(row=>row.join("")).join("\n")}

function reachable(C,map,start,end){
  const key=(x,y)=>`${x},${y}`;
  const seen=new Set([key(start.x,start.y)]),queue=[start];
  for(let i=0;i<queue.length;i++){
    const p=queue[i];
    if(p.x===end.x&&p.y===end.y)return true;
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const x=p.x+dx,y=p.y+dy,k=key(x,y);
      if(x<0||y<0||x>=C.worldWidth||y>=C.worldHeight||map[y][x]!==0||seen.has(k))continue;
      seen.add(k);queue.push({x,y});
    }
  }
  return false;
}

const profiles=[
  {floor:1,id:"threshold-branches",minLoops:1},
  {floor:2,id:"driveworks-crossroads",minLoops:1},
  {floor:3,id:"iron-keep-rings",minLoops:1},
  {floor:4,id:"budget-vault-braids",minLoops:1},
  {floor:5,id:"cartridge-catacomb-web",minLoops:1},
  {floor:6,id:"tape-labyrinth",minLoops:1},
  {floor:7,id:"moss-iron-keep-rings",minLoops:1},
  {floor:8,id:"demo-undercroft-weave",minLoops:1},
  {floor:9,id:"modem-warrens",minLoops:1},
  {floor:10,id:"sid-furnace-braids",minLoops:1},
  {floor:11,id:"ember-depths-forks",minLoops:1},
  {floor:12,id:"pixel-foundry-circuit",minLoops:1},
  {floor:13,id:"high-score-iron-keep-rings",minLoops:1},
  {floor:14,id:"crt-maze-web",minLoops:1},
  {floor:15,id:"blood-citadel-siege",minLoops:1}
];

for(const profile of profiles){
  const seed=`STAGE5-CONTRACT-F${profile.floor}`;
  const first=runtime(),second=runtime();
  const a=first.W.generate(seed),b=second.W.generate(seed);

  assert.equal(a.map.length,first.C.worldHeight,`Floor ${profile.floor} height must stay on the established world size`);
  assert.equal(a.map[0].length,first.C.worldWidth,`Floor ${profile.floor} width must stay on the established world size`);
  assert.equal(serialiseMap(a.map),serialiseMap(b.map),`Floor ${profile.floor} topology must be deterministic for the same seed`);
  assert.deepEqual(JSON.parse(JSON.stringify(a.topology)),JSON.parse(JSON.stringify(b.topology)),`Floor ${profile.floor} topology metadata must be deterministic`);

  assert.equal(a.topology?.version,"stage5-r1");
  assert.equal(a.topology?.floor,profile.floor);
  assert.equal(a.topology?.profile,profile.id);
  assert.equal(a.topology?.dimensions?.width,first.C.worldWidth);
  assert.equal(a.topology?.dimensions?.height,first.C.worldHeight);
  assert.ok(a.topology?.protectedSecretCells>0,`Floor ${profile.floor} must reserve wall space for established hidden/nested secret ownership`);
  assert.equal(a.topology?.doorTopology?.checked,a.doorSpecs.length,`Floor ${profile.floor} must validate every generated optional door after Stage 5 carving`);
  assert.equal(a.topology?.doorTopology?.valid,true,`Floor ${profile.floor} must finish with every generated optional door structurally anchored`);
  assert.ok(a.topology?.loops?.length>=profile.minLoops,`Floor ${profile.floor} must expose at least one real alternate route`);
  assert.ok(a.topology.loops.length<=a.topology.loopTarget,`Floor ${profile.floor} must not exceed its bounded loop budget`);

  assert.equal(reachable(first.C,a.map,a.start,a.exit),true,`Floor ${profile.floor} must preserve start-to-exit reachability`);

  for(const loop of a.topology.loops){
    assert.ok(loop.graphDistanceBefore>=3,`Stage 5 shortcuts must connect rooms that were meaningfully separated before the loop`);
    assert.ok(loop.length>=4,`Stage 5 loops must represent a real corridor rather than an adjacent-room bookkeeping edge`);
    const edge=a.edges.find(candidate=>candidate.stage5Loop===true&&((candidate.a===loop.a&&candidate.b===loop.b)||(candidate.a===loop.b&&candidate.b===loop.a)));
    assert.ok(edge,`Every Stage 5 loop descriptor must have one authoritative graph edge`);
    assert.equal(edge.routeKind,"alternate");
  }

  const deadEnds=new Set(a.topology.deadEnds);
  const crossroads=new Set(a.topology.crossroads);
  for(const id of deadEnds)assert.equal(a.rooms[id]?.stage5TopologyRole,"purposeful-dead-end");
  for(const id of crossroads)assert.equal(a.rooms[id]?.stage5TopologyRole,"crossroads");
  for(const id of a.topology.landmarks){
    assert.equal(a.rooms[id]?.stage5Landmark,true);
    assert.notEqual(id,a.startRoomId,"Stage 5 landmarks must not overwrite the guaranteed start room");
    assert.notEqual(id,a.exitRoomId,"Stage 5 landmarks must not overwrite the guaranteed exit room");
  }
}

for(const profile of profiles){
  for(const variant of ["A","B","C"]){
    const seed=`R98-LAYOUT-${variant}-F${profile.floor}`;
    const {C,W}=runtime();
    const generated=W.generate(seed);
    assert.equal(generated.topology?.floor,profile.floor,`Floor ${profile.floor} must retain its own topology profile for seed ${variant}`);
    assert.equal(generated.topology?.profile,profile.id,`Floor ${profile.floor} must not fall back to another floor's topology for seed ${variant}`);
    assert.equal(generated.topology?.doorTopology?.checked,generated.doorSpecs.length,`Floor ${profile.floor} must validate every optional door for seed ${variant}`);
    assert.equal(generated.topology?.doorTopology?.valid,true,`Floor ${profile.floor} must finish with anchored optional doors for seed ${variant}`);
    assert.equal(reachable(C,generated.map,generated.start,generated.exit),true,`Floor ${profile.floor} must preserve start-to-exit reachability for seed ${variant}`);
    assert.ok(generated.topology?.loops?.length>=1,`Floor ${profile.floor} must retain at least one alternate route for seed ${variant}`);
    assert.ok(generated.topology.loops.length<=generated.topology.loopTarget,`Floor ${profile.floor} must respect its loop budget for seed ${variant}`);
  }
}

const topologySource=worldSource.slice(
  worldSource.indexOf("function stage5Floor"),
  worldSource.indexOf("function generate(seedText)")
);
assert.ok(topologySource.includes("addStage5Topology"),"Stage 5 topology helpers must remain a bounded pre-generation layer");
assert.match(topologySource,/protectedCells\.has\(cell\(point\.x,point\.y\)\)/,"Stage 5 alternate routes must reject established secret-reserve wall cells");
assert.match(worldSource,/const protectedSecretCells=stage5SecretReserveCells\(seedText,rooms,doorSpecs\),protectedDoorCells=reserveDoorTopology\(doorSpecs\),protectedTopologyCells=new Set\(\[\.\.\.protectedSecretCells,\.\.\.protectedDoorCells\]\);\s*const topology=addStage5Topology\(seedText,map,rooms,edges,graph,startRoom,exitRoom,protectedTopologyCells\)/,"Stage 5 must reserve hidden/nested-secret space plus door anchor cells before carving alternate routes");
assert.ok(worldSource.indexOf("const protectedSecretCells=stage5SecretReserveCells")>worldSource.lastIndexOf("attachBonusRoom(map,source,bonusIndex,rooms)"),"Stage 5 topology must run after the optional annex set is frozen");
assert.doesNotMatch(topologySource,/\brandom\s*\(/,"Stage 5 topology decisions must not consume the established world RNG stream");
assert.doesNotMatch(topologySource,/run\.floor|floorComplete\(|descendFloor\(|saveCheckpoint|loadCheckpoint/,"Stage 5 topology must not become a progression or save owner");
assert.ok(worldSource.includes("const topology=addStage5Topology(seedText,map,rooms,edges,graph,startRoom,exitRoom,protectedTopologyCells)"),"the authoritative world generator must own Stage 5 topology with the combined secret/door reserve boundary");
assert.match(worldSource,/for\(const door of doorSpecs\)if\(!doorTopologyValid\(map,door\)&&repairDoorTopology\(map,door\)\)repairedDoorTopology\+\+/,"the authoritative world generator must post-validate and structurally repair orphaned doors");
assert.match(worldSource,/return\{map,rooms,edges,graph,[^\n]+hauntedCorridor,topology\}/,"Stage 5 metadata must travel with the authoritative generated world");

console.log("PASS V10.42 Stage 5 deterministic procedural topology");
