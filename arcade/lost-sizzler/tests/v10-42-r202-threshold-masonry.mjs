import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const source=read("js/game-render.js"),atlas=read("assets/pixel/visual-overhaul/r202/threshold-masonry.svg");
const manifest=JSON.parse(read("assets/asset-manifest.json"));
assert.ok(atlas.includes('width="252" height="42"')&&atlas.includes('shape-rendering="crispEdges"'));
assert.doesNotMatch(atlas,/<script|<foreignObject|\bhref\s*=/i);
assert.equal(manifest.images.visualOverhaul.r202ThresholdMasonryAtlas.asset,"assets/pixel/visual-overhaul/r202/threshold-masonry.svg");
assert.ok(source.includes('premiumThresholdMasonry:make("assets/pixel/visual-overhaul/r202/threshold-masonry.svg")'));
const begin=source.indexOf("function drawDungeonPremiumMasonry("),end=source.indexOf("function drawTile(x,y)",begin);
assert.ok(begin>=0&&end>begin);
const fast=source.slice(source.indexOf("function drawTilePerformance"),source.indexOf("// R201: original"));
assert.doesNotMatch(fast,/drawDungeonPremiumMasonry/);
assert.match(source,/const premiumMasonry=drawDungeonPremiumMasonry\(s,h,room\);\s*if\(!premiumMasonry&&wallArt/);
assert.match(source,/if\(!premiumMasonry\)\{\s*\/\/ Deep blockwork/);
assert.match(source,/\}\s*\/\/ Theme-specific wall hardware keeps rooms materially distinct/);
const art={complete:true,naturalWidth:252,naturalHeight:42},calls=[];
const ctx={globalAlpha:.61,drawImage(...args){calls.push({args,alpha:this.globalAlpha})}};
const box={C:{tile:42},run:{floor:1},lostSizzlerPixelAssets:{premiumThresholdMasonry:art},ctx};
vm.createContext(box);vm.runInContext(source.slice(begin,end),box);
for(let h=0;h<96;h++){
  assert.equal(box.drawDungeonPremiumMasonry({x:10.4,y:21.6},h,null),true);
  const cell=h%31===0?5:h%23===0?4:h%4;
  assert.deepEqual(calls.at(-1).args.slice(1),[cell*42,0,42,42,10,22,42,42]);
  assert.equal(calls.at(-1).alpha,.88);assert.equal(ctx.globalAlpha,.61);
}
for(const key of ["sanctuary","traderRoom","sigilRoom","voidRoom","grandHall"])assert.equal(box.drawDungeonPremiumMasonry({x:0,y:0},0,{[key]:true}),false);
for(let floor=2;floor<=15;floor++){box.run.floor=floor;assert.equal(box.drawDungeonPremiumMasonry({x:0,y:0},0,null),false)}
box.run.floor=1;art.complete=false;assert.equal(box.drawDungeonPremiumMasonry({x:0,y:0},0,null),false);
art.complete=true;art.naturalHeight=16;assert.equal(box.drawDungeonPremiumMasonry({x:0,y:0},0,null),false);
art.naturalHeight=42;ctx.drawImage=()=>{throw Error("decode lost")};
assert.equal(box.drawDungeonPremiumMasonry({x:0,y:0},0,null),false);assert.equal(ctx.globalAlpha,.61);
assert.equal(calls.length,96);
console.log("R202 masonry variants, rare damage, protected rooms, fallback and one-draw contract PASS");
