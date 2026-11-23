import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

// Execute the actual shipped puzzle generator, not a rewritten approximation.
// When a procedural floor already reserved a tile for loot/monster/door/chest,
// a bridge across that tile can stop in movePlayer before crossing triggers.
const repo=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"../../..");
const source=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/systems.js"),"utf8");
const start=source.indexOf("  function makeWeightBridge(");
const end=source.indexOf("  function installOptionalPuzzles(",start);
assert.ok(start>=0&&end>start,"The canonical Trickster Bridge placement owner must exist");
const actual=source.slice(start,end);
const generate=new Function("world","host","room","gate","used",`
  const cell=(x,y)=>x+","+y;
  const md=(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
  const optionalEntranceSide=(r,g)=>
    g.x<r.x?"west":g.x>r.x+r.w?"east":g.y<r.y?"north":"south";
  const firstFreeCell=(w,r,occupied,pred)=>{
    for(let y=r.y+1;y<r.y+r.h;y++)for(let x=r.x+1;x<r.x+r.w;x++){
      const q={x,y};
      if(w.map[y]?.[x]===0&&!occupied.has(cell(x,y))&&pred(q))return q;
    }
    return null;
  };
  ${actual}
  return makeWeightBridge(world,host,room,gate,used);
`);

const gates={
  west:{x:7,y:13},east:{x:21,y:13},
  north:{x:14,y:7},south:{x:14,y:19}
};
let verified=0;
for(const [side,position] of Object.entries(gates)){
  const scenario=(reserved=[],wall=null)=>{
    const room={id:2,x:8,y:8,w:12,h:10,depth:5};
    const gate={id:"optional-gate",...position,locked:true,type:"bronze"};
    const world={map:Array.from({length:30},()=>Array(30).fill(0))};
    const host={chests:[{id:"existing-cache",x:9,y:9,roomId:room.id,locked:true,active:true}],switches:[]};
    if(wall)world.map[wall.y][wall.x]=1;
    const used=new Set(reserved.map(q=>q.x+","+q.y));
    const bridge=generate(world,host,room,gate,used);
    return{bridge,host,gate};
  };
  const clear=scenario();
  assert.ok(clear.bridge,`Unoccupied ${side} bridge still installs`);
  assert.equal(clear.bridge.bridgeTiles.length,3);
  const dx=side==="west"?1:side==="east"?-1:0;
  const dy=side==="north"?1:side==="south"?-1:0;
  const ordered=[...clear.bridge.bridgeTiles].sort((a,b)=>
    dx?(a.x-b.x)*dx:(a.y-b.y)*dy);
  const approach={x:ordered[0].x-dx,y:ordered[0].y-dy};
  const landing={x:ordered.at(-1).x+dx,y:ordered.at(-1).y+dy};
  for(const [kind,where] of [
    ["approach",approach],["middle bridge span",ordered[1]],["landing",landing]
  ]){
    const blocked=scenario([where]);
    assert.equal(blocked.bridge,null,`Reserved ${kind} must reject ${side} crossing`);
    assert.equal(blocked.gate.locked,true,"Rejected bridge must not unlock an optional room");
    assert.equal(blocked.host.switches.length,0,"Rejected bridge must not install an orphan switch");
    verified++;
  }
  assert.equal(scenario([],landing).bridge,null,`Wall at ${side} landing cannot create a usable bridge`);
  verified++;
}
assert.equal(verified,16);
console.log("PASS R179 actual Trickster Bridge owner: 4 directions, 16 blocked/solid landing cases, clean layouts retained");
