import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source=fs.readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");
const start=source.indexOf("function placeCombatFloater("),end=source.indexOf("\nfunction drawHazards(",start);
assert.ok(start>=0&&end>start);
function fixture({quality="rich",many=false,viewX=0,camX=0,edges=false,labels=false}={}){
  const particles=Array.from({length:many?360:6},(_,i)=>({x:i%2===0?80:1200,y:80,vx:2,vy:1,life:300,col:"gold",size:4,glow:10}));
  const rings=Array.from({length:many?72:4},(_,i)=>({x:i%2===0?90:1200,y:90,r:20,life:250,col:"red"}));
  if(edges){
    particles.push({x:-8,y:80,vx:1,vy:1,life:300,col:"edge-particle",size:4,glow:10});
    rings.push({x:-10,y:90,r:20,life:250,col:"edge-ring"});
  }
  const floaters=labels?[{x:80,y:70,text:"+100 XP",life:720,maxLife:720,col:"white"}]:[];
  const snapshot=JSON.stringify([particles,rings,floaters]);
  const ops={rect:0,stroke:0,fill:0,blur:0,maxBlur:0,colors:[],text:[]};
  const ctx={save(){},restore(){},beginPath(){},arc(){},stroke(){ops.stroke++;ops.colors.push(this.strokeStyle)},fill(){ops.fill++},
    fillRect(){ops.rect++;ops.colors.push(this.fillStyle)},set shadowBlur(v){if(v>0){ops.blur++;ops.maxBlur=Math.max(ops.maxBlur,v)}},
    translate(){},rotate(){},scale(){},strokeText(){},fillText(t){ops.text.push(t)},measureText(t){return{width:t.length*9}}};
  const scope={ctx,view:{x:viewX,y:0,w:320,h:240},cam:{x:camX,y:0},particles,rings,floaters,localPlayers:()=>[],C:{tile:32},dungeonRenderQuality:()=>quality};
  vm.createContext(scope);
  vm.runInContext(source.slice(start,end)+"\ndrawEffects()",scope);
  assert.equal(JSON.stringify([particles,rings,floaters]),snapshot,"Rendering must not mutate or retire authoritative effect state");
  return ops;
}
const rich=fixture();
assert.equal(rich.rect,6,"Visible rich sparks retain their primary and trail paint");
assert.equal(rich.stroke,2,"Only onscreen rings are drawn");
assert.equal(rich.maxBlur,10,"Quiet rich presentation retains full glow");
const crowded=fixture({many:true});
assert.equal(crowded.rect,180,"Crowded 360-particle fixture draws only visible primary sparks");
assert.equal(crowded.stroke,36);
assert.equal(crowded.maxBlur,4);
for(const quality of ["reduced","severe"]){
  const low=fixture({quality});
  assert.equal(low.rect,3);
  assert.equal(low.stroke,2);
  assert.equal(low.blur,0,"Lower quality removes decorative shadow work, not the primary combat cues");
}
const split=fixture({viewX:320,camX:1100});
assert.equal(split.rect,6,"Second viewport still sees its own sparks");
assert.equal(split.stroke,2);
const edge=fixture({edges:true});
assert.ok(edge.colors.includes("edge-particle"),"Particle glow intersecting the viewport edge remains visible");
assert.ok(edge.colors.includes("edge-ring"),"Ring crossing the viewport edge remains visible");
assert.deepEqual(fixture({labels:true}).text,["+100 XP"],"Reward text still draws");
console.log("PASS R190 visible combat sparks/rings, adaptive glow, independent viewport, edge preservation and immutable effect state");
