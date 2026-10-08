import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

// Run the real procedural generator + decorated host without a browser.
// These deterministic seeds include historical direct-neighbour sanctuary
// failures. Validate progression protection on early and late floors.
const sources=["config.js","progression.js","world.js","systems.js"];
const context={window:{},console,Math,Date};
vm.createContext(context);
for(const file of sources){
  vm.runInContext(fs.readFileSync("arcade/lost-sizzler/js/"+file,"utf8"),context,{filename:file});
}
const W=context.window.CCGWorld,SYS=context.window.CCGSystems;
assert.ok(W?.generate&&W?.createHostState&&SYS?.decorate,
  "Must exercise the actual World and Systems generator, not mock placement");

function edgeGap(a,b){
  return Math.max(0,a.x-b.x-b.w,b.x-a.x-a.w)+
         Math.max(0,a.y-b.y-b.h,b.y-a.y-a.h);
}
function graphHops(world,start,end){
  const seen=new Set([start.id]),queue=[[start.id,0]];
  for(let index=0;index<queue.length;index++){
    const [id,dist]=queue[index];
    if(id===end.id)return dist;
    for(const next of world.graph[id]||[]){
      if(seen.has(next.to))continue;
      seen.add(next.to);queue.push([next.to,dist+1]);
    }
  }
  return -1;
}
let samples=0,minGap=Infinity,minHops=Infinity;
for(const floor of [1,3,9,15]){
  for(let index=0;index<7;index++){
    const seed="ccg-sanctuary-spacing-"+floor+"-"+index;
    const world=W.generate(seed);
    const host=W.createHostState(world);
    SYS.decorate(world,host,{floor,stats:{},seed});
    const sanctuaries=world.rooms.filter(r=>r.sanctuary);
    assert.equal(sanctuaries.length,2,
      "Normal seeded floors retain both refuges: "+seed);
    assert.deepEqual([...world.sanctuaryRooms].sort((a,b)=>a-b),
      sanctuaries.map(r=>r.id).sort((a,b)=>a-b),
      "Room flags and sanctuary ID list must agree: "+seed);
    const [first,second]=sanctuaries;
    const gap=edgeGap(first,second),hops=graphHops(world,first,second);
    assert.ok(gap>=18,"Refuges too close in world tiles: "+seed+" gap="+gap);
    assert.ok(hops>=3,"Refuges directly or nearly adjacent in corridor graph: "+seed+" hops="+hops);
    for(const room of sanctuaries){
      assert.notEqual(room.id,world.startRoomId,"Start room cannot become a refuge");
      assert.notEqual(room.id,world.exitRoomId,"Exit room cannot become a refuge");
      assert.ok(!room.dedicatedHazardReserved,"Reserved hazard room must remain hazardous");
      assert.ok(!room.sigilRoom,"Required Sigil route cannot become a refuge");
    }
    minGap=Math.min(minGap,gap);minHops=Math.min(minHops,hops);samples++;
  }
}
console.log("R119 sanctuary spacing PASS: "+samples+
  " real early/late floor generations; 2 refuges per floor, minimum gap="+minGap+
  " tiles, minimum corridor distance="+minHops+" hops; hazards/start/exit/sigil reserved");
