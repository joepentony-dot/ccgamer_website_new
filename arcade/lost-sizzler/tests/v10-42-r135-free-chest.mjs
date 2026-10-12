import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {createHash} from "node:crypto";
import {fileURLToPath} from "node:url";
import path from "node:path";
import vm from "node:vm";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=p=>readFileSync(path.join(root,p));
const manifest=JSON.parse(read("assets/asset-manifest.json"));
const record=manifest.images?.visualOverhaul?.r135FreeCommercial;
const originalHashes=["df188678f04d6f1875e4c485fcf089d2fdf88cb004b99447a9d87fda48b05fac","b3ee6b134fef678b2c345b56e747b0a291b987bf59bc6886e692993ee1ae47b3","8e52b060fc94ad04d8a33a5646da849e51780c221256b596a42fd1ad81b8ab9d"];
const originalPaths=["assets/pixel/user-r135/will-tice-chest-0.png","assets/pixel/user-r135/will-tice-chest-1.png","assets/pixel/user-r135/will-tice-chest-2.png"];
assert.equal(record?.creator,"Will Tice","Original creator credit is required");
assert.match(record?.license||"",/Free commercial game use/);
assert.match(record?.license||"",/NOT CC0/);
assert.match(record?.license||"",/standalone reusable asset redistribution prohibited/);
assert.equal(record?.sourceArchiveSHA256,"9945dd9eb7e0a8848c5a7797319a9b18bcc60808ee886ff1d747ed59cd7ee002");
assert.deepEqual(record?.activeChestFrames,originalPaths);
assert.deepEqual(record?.activeFrameSHA256,originalHashes);
const overrides=read("js/asset-overrides.js").toString("utf8");
const render=read("js/game-render.js").toString("utf8");
const credits=read("assets/THIRD-PARTY-ART-CREDITS.md").toString("utf8");
const provenance=read("assets/pixel/user-r135/PROVENANCE.md").toString("utf8");
assert.match(credits,/Will Tice/);
assert.match(provenance,/free-commercial/);
for(let i=0;i<3;i++){
  const source=originalPaths[i],bytes=read(source);
  const hash=createHash("sha256").update(bytes).digest("hex");
  assert.equal(hash,originalHashes[i],"Unverified chest binary must be rejected: "+i);
  assert.equal(bytes.subarray(0,8).toString("hex"),"89504e470d0a1a0a");
  assert.equal(bytes.readUInt32BE(16),32);
  assert.equal(bytes.readUInt32BE(20),32);
  assert.ok(overrides.includes(`chestFrame${i}:"${source}"`));
  assert.ok(provenance.includes(hash));
}
assert.match(render,/chestFrames:\s*\[/,"Original frame-based chest renderer must remain");
assert.ok(render.includes('chestReplacement:make(selected("chestSheet"))'),"Explicit owner chest-sheet precedence must remain");
assert.ok(render.includes("frameArtReady=frameSet.length===3"),"Fallback remains when any chest frame does not load");
assert.ok(render.includes("const index=c.openedAt?Math.min(2,Math.floor(anim*3)):0"),"Visual opening phase must derive from actual chest state");
assert.ok(render.includes("drawAnimatedChestFallback"),"Rich Canvas chest fallback must remain present");

const from=render.indexOf("function drawChests(){");
const to=render.indexOf("\nfunction label(",from);
assert.ok(from>0 && to>from,"Real chest renderer must remain accessible");
const drawSource=render.slice(from,to)+"\ndrawChests();";
const approvedFrames=[0,1,2].map(i=>({name:"r135-"+i,complete:true,naturalWidth:32,naturalHeight:32}));
function probeDraw({now=2000,openedAt=0,frames=approvedFrames,custom=null,legacy={name:"legacy",complete:true,naturalWidth:160,naturalHeight:96}}={}){
  const drawn=[];
  let richFallback=0;
  const ctx={save(){},restore(){},beginPath(){},ellipse(){},fill(){},strokeRect(){},fillRect(){},drawImage(image){drawn.push(image?.name||"unknown");}};
  const context={
    ctx,performance:{now:()=>now},
    lostSizzlerPixelAssets:{chestFrames:frames,chestReplacement:custom,chests:legacy},
    host:{chests:[{x:4,y:4,active:true,locked:false,openedAt,loot:{rarity:"COMMON"}}]},
    focus:{},PGR:{colourForRarity:()=>"#fff"},P:{gold:"#ffa"},C:{tile:42},
    ws:(x,y)=>({x:x*42,y:y*42}),tileInRenderView:()=>true,visibleTo:()=>true,
    md:()=>999,label(){},drawAnimatedChestFallback(){richFallback++;},
    chestRenderDiagnostics:{assetFrames:0,richFallbackFrames:0},Math
  };
  vm.runInNewContext(drawSource,context,{timeout:1000});
  return {drawn,mode:context.chestRenderDiagnostics.lastMode,richFallback};
}
assert.deepEqual(probeDraw().drawn,["r135-0"],"Unopened chests must use the closed source frame");
assert.deepEqual(probeDraw({openedAt:1700}).drawn,["r135-1"],"Opening chests must use the transitional frame");
assert.deepEqual(probeDraw({openedAt:1380}).drawn,["r135-2"],"Opened chests must use the fully opened frame");
const brokenFrames=[approvedFrames[0],{...approvedFrames[1],complete:false},approvedFrames[2]];
assert.deepEqual(probeDraw({frames:brokenFrames}).drawn,["legacy"],"Failed chest sprite must keep V10.34 sheet fallback");
assert.equal(probeDraw({frames:brokenFrames,legacy:null}).richFallback,1,"Missing assets must keep drawn Canvas fallback");
assert.deepEqual(probeDraw({custom:{name:"owner-custom",complete:true,naturalWidth:160,naturalHeight:96}}).drawn,["owner-custom"],"Explicit owner sheet must preserve precedence");

console.log("R135 free-commercial chest source, 32x32 PNGs, three-state lifecycle and fallbacks PASS");
