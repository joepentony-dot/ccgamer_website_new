import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source=fs.readFileSync(new URL("../js/game-render.js",import.meta.url),"utf8");

const equipment=source.slice(source.indexOf("function playerEquipmentPresentation("),source.indexOf("\nfunction drawPlayer("));
const merchant=source.slice(source.indexOf("function merchantVisual("),source.indexOf("\nfunction drawSpecialObjects("));
assert.ok(equipment.includes("drawPlayerEquipmentOverlay")&&merchant.includes("merchantInteractionLabel"));
let time=0,quality="rich",motion=false;
const calls=[],ctx=new Proxy({}, {get(t,k){return t[k]??((...args)=>calls.push([k,...args]))},set(t,k,v){t[k]=v;calls.push([k,v]);return true}});
const scope={ctx,P:{cyan:"#0ff",purple:"#a0f",gold:"#fc0"},C:{tile:32},px:(...args)=>calls.push(["px",...args]),performance:{now:()=>time},dungeonReducedMotion:()=>motion,dungeonRenderQuality:()=>quality};
vm.createContext(scope);vm.runInContext(equipment+"\n"+merchant,scope);
const gear=p=>JSON.parse(JSON.stringify(scope.playerEquipmentPresentation(p)));
for(const [armor,tier,reinforced] of [[0,0,false],[1,1,false],[4,2,false],[7,3,false],[10,4,false],[12,4,false],[13,4,true],[21,4,true],[99,4,true],[-1,0,false],[Infinity,0,false]]){
  const p={armor,relics:[],wearables:{}},before=JSON.stringify(p);
  const g=gear(p);assert.equal(g.tier,tier);assert.equal(g.reinforced,reinforced);
  calls.length=0;scope.drawPlayerEquipmentOverlay(p,16,16,{x:1});
  const marks=calls.filter(x=>x[0]==="fillRect"&&x[2]===14&&x[3]===1&&x[4]===2&&(x[1]===12||x[1]===19));
  assert.equal(marks.length,reinforced?2:0);
  assert.equal(JSON.stringify(p),before);
}
for(const t of [{stage7NpcName:"Bex Harrow",shopType:"entrance"},{stage7NpcName:"Nix Calder",shopType:"hidden"},{stage7NpcName:"Orin Vale",shopType:"hidden"},{shopType:"hidden"}]){
  const name=t.stage7NpcName?.toUpperCase()||"MERCHANT";
  assert.equal(scope.merchantInteractionLabel(t),name+" — STEP ON");
  assert.equal(scope.merchantInteractionLabel({...t,v142Alchemist:true}),"ALCHEMIST — STEP ON");
  assert.equal(scope.merchantInteractionLabel({...t,title:"FLOOR ALCHEMIST"}),"ALCHEMIST — STEP ON");
}
function draw(q,m,n){
  quality=q;motion=m;time=n;calls.length=0;
  const t={stage7NpcId:"collector_nix",id:"shop",shopType:"hidden"},before=JSON.stringify(t);
  scope.drawMerchantNpc(t,{x:64,y:96},"#fc0");assert.equal(JSON.stringify(t),before);
  return JSON.parse(JSON.stringify(calls));
}
for(const q of ["rich","reduced","severe"]){
  const first=draw(q,true,0),second=draw(q,true,750);
  assert.deepEqual(first,second);assert.ok(first.some(x=>x[0]==="px"));
  assert.ok(!first.some(x=>x[0]==="shadowBlur"&&x[1]>0));
}
for(const q of ["reduced","severe"])assert.deepEqual(draw(q,false,0),draw(q,false,750));
assert.notDeepEqual(draw("rich",false,0),draw("rich",false,750));
assert.ok(draw("rich",false,0).some(x=>x[0]==="shadowBlur"&&x[1]===10));
assert.match(source,/if\(md\(t,focus\)<=3\)label\(merchantInteractionLabel\(t\),s,col\)/);
console.log("PASS R195 armour accents, Alchemist service prompt, merchant motion and quality");
