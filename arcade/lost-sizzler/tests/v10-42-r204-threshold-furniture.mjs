import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const source=read("js/game-render.js"),asset="assets/pixel/visual-overhaul/r204/threshold-furniture.svg",svg=read(asset);
assert.match(svg,/width="420" height="42"/);
assert.match(svg,/shape-rendering="crispEdges"/);
assert.doesNotMatch(svg,/<script|<foreignObject|\\bhref\\s*=/i);
assert.equal((svg.match(/<g id=/g)||[]).length,10);
assert.equal(JSON.parse(read("assets/asset-manifest.json")).images.visualOverhaul.r204ThresholdFurnitureAtlas.asset,asset);
const i=source.indexOf("function drawDungeonPremiumFurniture("),j=source.indexOf("function drawFurniture(){",i);
assert.ok(i>=0&&j>i);
const art={complete:true,naturalWidth:420,naturalHeight:42},calls=[],room={},box={run:{floor:1},C:{tile:42},world:{rooms:[room]},W:{roomAt:()=>0},lostSizzlerPixelAssets:{premiumThresholdFurniture:art},ctx:{drawImage(...args){calls.push(args)}},dungeonRenderSevere:()=>box.severe,severe:false};
vm.createContext(box);vm.runInContext(source.slice(i,j),box);
const types={crate:0,barrel:2,bookcase:4,shelf:5,table:6,desk:7,readingDesk:7,bench:8,roundChair:9};
for(const [type,base] of Object.entries(types))for(let h=0;h<16;h++){
 const d=Object.freeze({type,x:1,y:1,blocking:true,id:"test"}),count=calls.length;
 assert.equal(box.drawDungeonPremiumFurniture(d,{x:9.6,y:16.2},h),true);
 assert.equal(calls.length,count+1);
 assert.deepEqual(calls.at(-1).slice(1),[(base+(type==="crate"||type==="barrel"?h%2:0))*42,0,42,42,10,16,42,42]);
 assert.equal(d.blocking,true);
}
const d={type:"crate",x:1,y:1},q={x:0,y:0};
for(const type of ["terminal","console","pillar","fireplace","reactor","pool","shield","counter","tapeStack"])assert.equal(box.drawDungeonPremiumFurniture({...d,type},q,0),false);
for(const key of ["sanctuary","traderRoom","sigilRoom","voidRoom","grandHall"]){room[key]=true;assert.equal(box.drawDungeonPremiumFurniture(d,q,0),false);delete room[key]}
for(let floor=2;floor<=15;floor++){box.run.floor=floor;assert.equal(box.drawDungeonPremiumFurniture(d,q,0),false)}
box.run.floor=1;box.severe=true;assert.equal(box.drawDungeonPremiumFurniture(d,q,0),false);box.severe=false;
art.complete=false;assert.equal(box.drawDungeonPremiumFurniture(d,q,0),false);art.complete=true;art.naturalHeight=16;assert.equal(box.drawDungeonPremiumFurniture(d,q,0),false);art.naturalHeight=42;
box.ctx.drawImage=()=>{throw Error("decode failure")};assert.equal(box.drawDungeonPremiumFurniture(d,q,0),false);
const furniture=source.slice(j,source.indexOf("function drawGenerators()",j));
assert.match(furniture,/if\(d\.destroyed\|\|d\.blocking&&!d\.structural/);
assert.match(furniture,/const premiumFurniture=drawDungeonPremiumFurniture\(d,q,h\)/);
assert.match(furniture,/else if\(propArt\?\.complete&&propArt\.naturalWidth\)/);
assert.match(furniture,/blocker\.hp<blocker\.maxHp/);
console.log("R204 original furniture variants, single bitmap, protected rooms, severe/decode fallback and damage owner PASS");


// R9 also owns objective-prop silhouettes: exercise its actual helper and
// silhouette, not just the ordinary furniture drawing route.
const director=read("js/v10-42-r9-breakable-presentation-director.js");
const start=director.indexOf("  function drawThresholdBreakableArt("),end=director.indexOf("  function pruneFx(",start);
assert.ok(start>=0&&end>start);
const submissions=[],marks=[];
const spy={save(){},restore(){},beginPath(){},ellipse(){},fill(){},stroke(){marks.push("stroke")},moveTo(){},lineTo(){},fillRect(){marks.push("rect")},strokeRect(){marks.push("outline")},arc(){}};
const propBox={drawDungeonPremiumFurniture(d,q,h){submissions.push({d,q,h});return propBox.ready},ready:true,reduced:()=>true,constrained:()=>false};
vm.createContext(propBox);vm.runInContext(director.slice(start,end),propBox);
const style={material:"wood",palette:{body:"118,76,46",edge:"213,154,87",detail:"80,48,31"},health:1,hazardous:false};
const location={x:8,y:12},p=Object.freeze({kind:"rotted-crate",x:5,y:6,hp:3,maxHp:3,destroyed:false});
propBox.silhouette(spy,location,42,p,style);
assert.equal(submissions.length,1);assert.equal(submissions[0].d.type,"crate");
assert.equal(marks.length,0,"successful original art must not draw legacy box or cross braces");
propBox.silhouette(spy,location,42,{...p,kind:"rain-barrel"},{...style,health:.5});
assert.equal(submissions.at(-1).d.type,"barrel");assert.deepEqual(marks,["stroke"],"damage crack must remain");
for(const patch of [{destroyed:true},{hazardous:true},{webbed:true},{kind:"forge-cask"},{kind:"fallen-statue"}]){
 const count=submissions.length;assert.equal(propBox.drawThresholdBreakableArt({...p,...patch},location),false);assert.equal(submissions.length,count);
}
marks.length=0;propBox.ready=false;propBox.silhouette(spy,location,42,p,style);
assert.ok(marks.includes("outline"),"failed decode or out-of-scope art must retain procedural silhouette");
assert.equal(p.hp,3);
console.log("R204 objective crates/barrels, legacy fallback and damage feedback PASS");
