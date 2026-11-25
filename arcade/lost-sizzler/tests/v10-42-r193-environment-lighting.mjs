import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source=fs.readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");

const from=source.indexOf("function lightPool("),to=source.indexOf("\nfunction drawFog()",from);
assert.ok(from>=0&&to>from);
const lighting=source.slice(from,to);
function capture(quality,reduced,now=0){
  const pools=[],fills=[],ctx={save(){},restore(){},createRadialGradient(...args){const row={args,stops:[]};pools.push(row);return {addColorStop:(pos,colour)=>row.stops.push([pos,colour])}},fillRect(...args){fills.push(args)}};
  const scope={ctx,view:{x:0,y:0,w:500,h:500},C:{tile:32,player:{torchRadius:5},enemy:{}},focus:{torchMs:1,rx:4,ry:4},world:{fireplaces:[{x:6,y:6}],wallLights:[{x:7,y:7}]},host:{enemies:[],generators:[],shrines:[],exitOpen:false},bullets:[],enemyBullets:[],hazards:[],performance:{now:()=>now},dungeonRenderQuality:()=>quality,dungeonReducedMotion:()=>reduced,tileInRenderView:()=>true,ws:(x,y)=>({x:x*32,y:y*32})};
  const before=JSON.stringify([scope.focus,scope.world,scope.host]);
  vm.createContext(scope);vm.runInContext(lighting+"\ndrawDynamicLighting();lightPool(-10000,-10000,16,'1,2,3');",scope);
  assert.equal(JSON.stringify([scope.focus,scope.world,scope.host]),before);
  assert.equal(fills.length,pools.length);
  return pools;
}
for(const quality of ["rich","reduced","severe"]){
  const p=capture(quality,true);
  assert.equal(p.length,quality==="rich"?6:quality==="reduced"?4:3);
  const selected=quality==="severe"?[p[0],p[1],p[2]]:[p[0],p[2],p[quality==="rich"?4:3]];
  const core=quality==="severe"?["255,177,67","255,125,42","255,157,54"]:["255,197,100","255,154,68","255,185,83"];
  const edge=quality==="severe"?core:["180,95,37","197,61,25","184,85,34"];
  const strength=quality==="severe"?[.15,.16,.11]:[.21,.22,.15];
  for(let i=0;i<3;i++){
    assert.deepEqual(selected[i].stops,[[0,"rgba("+core[i]+","+strength[i]+")"],[.25,"rgba("+core[i]+","+strength[i]*.62+")"],[.68,"rgba("+edge[i]+","+strength[i]*.18+")"],[1,"rgba("+edge[i]+",0)"]]);
  }
  assert.deepEqual(capture(quality,true,987),p,"Reduced motion keeps light radius and colour steady");
}
assert.notDeepEqual(capture("rich",false,987),capture("rich",false,0),"Existing rich flicker retained");
console.log("PASS R193 warm-core copper-edge lighting, unchanged light budgets, offscreen cull and reduced motion");
