import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const source=read("js/game-render.js");
const atlas=read("assets/pixel/visual-overhaul/r201/threshold-flagstones.svg");
const manifest=JSON.parse(read("assets/asset-manifest.json"));
assert.ok(atlas.includes('width="168" height="42"')&&atlas.includes('shape-rendering="crispEdges"'));
assert.doesNotMatch(atlas,/<script|<foreignObject|\bhref\s*=/i);
assert.equal(manifest.images.visualOverhaul.r201ThresholdFlagstoneAtlas.asset,"assets/pixel/visual-overhaul/r201/threshold-flagstones.svg");
assert.ok(source.includes('premiumThresholdFlagstones:make("assets/pixel/visual-overhaul/r201/threshold-flagstones.svg")'));
assert.ok(source.includes("if(!drawDungeonPremiumFlagstone(s,h,room)&&floorArt?.complete"));
const fast=source.slice(source.indexOf("function drawTilePerformance"),source.indexOf("// R201: original"));
assert.doesNotMatch(fast,/drawDungeonPremiumFlagstone/);
const begin=source.indexOf("function drawDungeonPremiumFlagstone("),end=source.indexOf("function drawTile(x,y)",begin);
assert.ok(begin>=0&&end>begin);
const calls=[],art={complete:true,naturalWidth:168,naturalHeight:42};
const ctx={globalAlpha:.6,drawImage(...args){calls.push({args,alpha:this.globalAlpha})}};
const box={C:{tile:42},run:{floor:1},lostSizzlerPixelAssets:{premiumThresholdFlagstones:art},ctx};
vm.createContext(box);vm.runInContext(source.slice(begin,end),box);
for(let h=0;h<8;h++){
  assert.equal(box.drawDungeonPremiumFlagstone({x:10.4,y:21.6},h,null),true);
  const {args,alpha}=calls.at(-1);
  assert.deepEqual(args.slice(1),[(h%4)*42,0,42,42,10,22,42,42]);
  assert.equal(alpha,.82);assert.equal(ctx.globalAlpha,.6);
}
assert.equal(calls.length,8);
for(const key of ["sanctuary","traderRoom","sigilRoom","voidRoom","grandHall"]){
  assert.equal(box.drawDungeonPremiumFlagstone({x:0,y:0},0,{[key]:true}),false);
}
for(let floor=2;floor<=15;floor++){box.run.floor=floor;assert.equal(box.drawDungeonPremiumFlagstone({x:0,y:0},0,null),false)}
box.run.floor=1;art.complete=false;assert.equal(box.drawDungeonPremiumFlagstone({x:0,y:0},0,null),false);
art.complete=true;art.naturalWidth=42;assert.equal(box.drawDungeonPremiumFlagstone({x:0,y:0},0,null),false);
art.naturalWidth=168;ctx.drawImage=()=>{throw new Error("decode lost")};
assert.equal(box.drawDungeonPremiumFlagstone({x:0,y:0},0,null),false);assert.equal(ctx.globalAlpha,.6);
assert.equal(calls.length,8);
console.log("R201 original floor atlas selection, protected rooms, decode fallback and bounded bitmap draw PASS");
