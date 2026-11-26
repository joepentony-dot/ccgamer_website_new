import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const read=p=>fs.readFileSync(new URL("../"+p,import.meta.url),"utf8");
const source=read("js/game-render.js"),asset="assets/pixel/visual-overhaul/r205/ironforge-keep-vault-catacomb-floors.svg",svg=read(asset);
assert.match(svg,/width="168" height="168"/);assert.match(svg,/shape-rendering="crispEdges"/);
assert.doesNotMatch(svg,/<script|<foreignObject|\bhref\s*=/i);assert.equal((svg.match(/<g id=/g)||[]).length,16);
assert.equal(JSON.parse(read("assets/asset-manifest.json")).images.visualOverhaul.r205BiomeFloorAtlas.asset,asset);
const i=source.indexOf("let r205BiomeRasterSource="),j=source.indexOf("function drawTile(x,y)",i);
assert.ok(i>=0&&j>i);
const art={complete:true,naturalWidth:168,naturalHeight:168},calls=[],rasterCalls=[],canvases=[];
let rasterFailure=false;
const document={createElement(tag){assert.equal(tag,"canvas");const canvas={width:0,height:0,getContext(kind){assert.equal(kind,"2d");return {drawImage(...args){rasterCalls.push(args);if(rasterFailure)throw Error("decode")}}}};canvases.push(canvas);return canvas}};
const ctx={globalAlpha:.62,drawImage(...args){calls.push({args,alpha:this.globalAlpha})}},run={floor:2},box={run,C:{tile:42},lostSizzlerPixelAssets:{premiumBiomeFloorsR205:art},ctx,document};
vm.createContext(box);vm.runInContext(source.slice(i,j),box);
assert.equal(box.drawDungeonBiomeFloorR205({x:0,y:0},0,{sanctuary:true}),false);assert.equal(canvases.length,0);
for(let floor=2;floor<=5;floor++){run.floor=floor;for(let h=0;h<32;h++){const before=calls.length;assert.equal(box.drawDungeonBiomeFloorR205({x:10.4,y:21.6},h,null),true);assert.equal(calls.length,before+1);assert.deepEqual(calls.at(-1).args.slice(1),[(h%4)*42,(floor-2)*42,42,42,10,22,42,42]);assert.equal(calls.at(-1).alpha,.9);assert.equal(ctx.globalAlpha,.62)}for(const key of ["sanctuary","traderRoom","sigilRoom","voidRoom","grandHall"])assert.equal(box.drawDungeonBiomeFloorR205({x:0,y:0},0,{[key]:true}),false)}
assert.equal(canvases.length,1);assert.equal(rasterCalls.length,1);assert.deepEqual(rasterCalls[0],[art,0,0,168,168]);assert.equal(canvases[0].width,168);assert.equal(canvases[0].height,168);assert.ok(calls.every(call=>call.args[0]===canvases[0]));
for(const floor of [1,6,7,8,9,10,11,12,13,14,15,2.5,NaN]){run.floor=floor;assert.equal(box.drawDungeonBiomeFloorR205({x:0,y:0},0,null),false)}
run.floor=2;art.complete=false;assert.equal(box.drawDungeonBiomeFloorR205({x:0,y:0},0,null),false);art.complete=true;art.naturalHeight=42;assert.equal(box.drawDungeonBiomeFloorR205({x:0,y:0},0,null),false);art.naturalHeight=168;ctx.drawImage=()=>{throw Error("decode")};assert.equal(box.drawDungeonBiomeFloorR205({x:0,y:0},0,null),false);assert.equal(ctx.globalAlpha,.62);
const nextArt={complete:true,naturalWidth:168,naturalHeight:168};box.lostSizzlerPixelAssets.premiumBiomeFloorsR205=nextArt;
rasterFailure=true;assert.equal(box.drawDungeonBiomeFloorR205({x:0,y:0},0,null),false);assert.equal(canvases[0].width,0);assert.equal(canvases[0].height,0);assert.equal(canvases.length,2);assert.equal(box.drawDungeonBiomeFloorR205({x:0,y:0},0,null),false);assert.equal(canvases.length,2);assert.equal(ctx.globalAlpha,.62);
assert.match(source,/const premiumBiomeFloor=drawDungeonBiomeFloorR205\(s,h,room\)/);assert.match(source,/floorArt\.naturalWidth>=16&&!premiumBiomeFloor/);
assert.doesNotMatch(source.slice(source.indexOf("function drawTilePerformance"),source.indexOf("// R201: original")),/drawDungeonBiomeFloorR205/);
console.log("R205 four original biome floor sets, cached raster, variant selection, protected rooms and fallback PASS");
