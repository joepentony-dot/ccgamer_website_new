import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source=fs.readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");
const start=source.indexOf("function drawHostileShotHead("),end=source.indexOf("\nfunction drawAmbientMotes(",start);
assert.ok(start>=0&&end>start);
function draw(rich){
  let path=[],calls=[];
  const ctx={save(){},restore(){},beginPath(){path=[]},moveTo(...a){path.push(["M",...a])},lineTo(...a){path.push(["L",...a])},
    arc(...a){path.push(["arc",...a])},closePath(){path.push(["Z"])},
    fill(){calls.push({op:"fill",path:path.slice(),color:this.fillStyle,mode:this.globalCompositeOperation,blur:this.shadowBlur})},
    stroke(){calls.push({op:"stroke",path:path.slice(),color:this.strokeStyle,mode:this.globalCompositeOperation,blur:this.shadowBlur})},
    fillRect(...a){calls.push({op:"rect",a,color:this.fillStyle,mode:this.globalCompositeOperation,blur:this.shadowBlur})}};
  const bullets=[{x:4,y:5,dx:1,dy:0,element:"shock",style:"shock",ttl:7}];
  const enemyBullets=["shock","fire","root","food","physical"].map((style,i)=>({x:4+i,y:5+i,dx:i===1?-1:1,dy:i===1?1:0,style,ttl:8+i}));
  const snapshot=JSON.stringify([bullets,enemyBullets]);
  const P={cyan:"#6cecff",orange:"#f80",white:"#fff",gold:"#fc0",green:"#0f0",red:"#f33"};
  const scope={ctx,C:{tile:32},P,ws:(x,y)=>({x:x*32,y:y*32}),bullets,enemyBullets,dungeonRenderRichFx:()=>rich};
  vm.createContext(scope);vm.runInContext(source.slice(start,end)+"\ndrawShots()",scope);
  assert.equal(JSON.stringify([bullets,enemyBullets]),snapshot,"Presentation never changes position, velocity, TTL or ownership");
  return calls;
}
const rich=draw(true),low=draw(false);
const friendly=rich.filter(c=>c.op==="fill"&&c.mode==="lighter");
assert.equal(friendly.length,1);
assert.equal(friendly[0].path[0][0],"arc","Player fire retains a round luminous head");
assert.equal(friendly[0].color,"#fffbd7");
assert.equal(friendly[0].blur,18);
for(const calls of [rich,low]){
  const hostile=calls.filter(c=>c.op==="fill"&&c.mode==="source-over");
  const outlines=calls.filter(c=>c.op==="stroke"&&c.mode==="source-over");
  const cores=calls.filter(c=>c.op==="rect"&&c.mode==="source-over");
  assert.equal(hostile.length,5,"Every hostile style gets the distinct non-colour-only cue");
  assert.equal(outlines.length,5);
  assert.equal(cores.length,5);
  assert.deepEqual(hostile.map(c=>c.color),["#6cecff","#fc0","#0f0","#f80","#f33"]);
  for(let i=0;i<5;i++){
    assert.deepEqual(hostile[i].path.map(a=>a[0]),["M","L","L","L","Z"]);
    assert.equal(outlines[i].color,"#150a12");
    assert.deepEqual(outlines[i].path,hostile[i].path);
    assert.equal(hostile[i].blur,0);
    assert.equal(cores[i].color,"#fff2cf");
  }
  assert.deepEqual(hostile[0].path,[["M",147,171],["L",152,176],["L",147,181],["L",142,176],["Z"]],"Shock marker follows the existing projectile head coordinate");
  assert.deepEqual(hostile[1].path,[["M",173,205],["L",179,211],["L",173,217],["L",167,211],["Z"]],"Diagonal fire marker follows existing head coordinate");
}
assert.ok(low.every(c=>c.blur===0),"Reduced/severe projectile paint avoids shadow blur");
assert.equal(low.filter(c=>c.op==="stroke"&&c.mode==="lighter").length,12,"Both visual trail strokes remain for player and enemies");
assert.ok(source.includes("drawShots();for(const r of remote.values())"),"Projectile layer remains before fog and actors");
console.log("PASS R191 distinct hostile silhouettes, all five elemental styles, exact head positions, low-quality glow and immutable projectile state");
