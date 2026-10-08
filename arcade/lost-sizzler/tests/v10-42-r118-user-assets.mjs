import fs from "node:fs";
import crypto from "node:crypto";
import vm from "node:vm";

const root=new URL("../",import.meta.url);
const read=path=>fs.readFileSync(new URL(path,root),"utf8");
const overrides=read("js/asset-overrides.js");
const render=read("js/game-render.js");
const manifest=JSON.parse(read("assets/asset-manifest.json"));
const provenance=read("assets/pixel/user-r118/PROVENANCE.md");
const sandbox={window:{}};
const ownerEnd=overrides.indexOf("\n/* Every enhancement URL inherits");
assert(ownerEnd>0,"R118 test could not isolate the owner-override declaration");
vm.runInNewContext(overrides.slice(0,ownerEnd),sandbox,{timeout:1000});
const visuals=sandbox.window.CCG_ASSET_OVERRIDES?.images?.visuals;
const items=sandbox.window.CCG_ASSET_OVERRIDES?.images?.items;
function assert(ok,message){if(!ok)throw new Error(message)}
assert(visuals&&items,"R118 override object must parse and expose image owners");
const folder="assets/pixel/user-r118/";
const active=[0,1,2,3].map(i=>"wall-torch-"+i+".png");
const key="extended-gold-key.png";
const crate="cc0-crate-0x72-ii.png";
const pillar="cc0-column-0x72-ii.png";
const barrel="kenney-tiny-dungeon-barrel.png";
const coinFiles=[0,1,2].map(i=>"pixel-poem-credit-coin-"+i+".png");
const staged=["floor-stairs.png","monster-dark-knight.png","monster-imp.png","monster-necromancer.png","plague-doc.png","prop-boxes-stacked.png","prop-column.png","pumpkin-dude.png"];
const stagedFreeCommercial=["skeleton-move.png","vampire-move.png"];
for(const name of [...active,key,crate,pillar,barrel,...coinFiles,...staged,...stagedFreeCommercial]){
  const bytes=fs.readFileSync(new URL(folder+name,root));
  assert(bytes.length>100,"Missing/empty CC0 candidate: "+name);
  assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),"Invalid PNG signature: "+name);
  const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
  assert(w>0&&h>0&&w<=512&&h<=512,"R118 PNG exceeds candidate size envelope: "+name+" "+w+"x"+h);
}
for(let i=0;i<4;i++)assert(visuals["torchSconceFrame"+i]===folder+active[i],"Verified CC0 wall torch frame not selected: "+i);
assert(items.key===folder+key,"Only source-matched Niji CC0 key may override the established key pickup");
assert(visuals.propCrate===folder+crate,"Verified 0x72 DungeonTileset II crate must replace R85 default crate");
assert(visuals.propPillar===folder+pillar,"Verified 0x72 DungeonTileset II column must be selected for existing pillar decor");
const sha256=bytes=>crypto.createHash("sha256").update(bytes).digest("hex");
const keyBytes=fs.readFileSync(new URL(folder+key,root));
const crateBytes=fs.readFileSync(new URL(folder+crate,root));
const pillarBytes=fs.readFileSync(new URL(folder+pillar,root));
const barrelBytes=fs.readFileSync(new URL(folder+barrel,root));
assert(keyBytes.readUInt32BE(16)===16&&keyBytes.readUInt32BE(20)===16,"Gold key must remain exactly 16x16");
assert(crateBytes.readUInt32BE(16)===16&&crateBytes.readUInt32BE(20)===24,"New 0x72 crate must remain exactly 16x24");
assert(pillarBytes.readUInt32BE(16)===16&&pillarBytes.readUInt32BE(20)===48,"New 0x72 column must remain exactly 16x48");
assert(sha256(keyBytes)==="3d7b2609fa1c00fa9b679799cc549058106eb03a37fbf14434111723f21d1f01","Gold key binary no longer matches provenanced atlas extraction");
assert(sha256(crateBytes)==="e602c9be47378d5f4bd767cb7c5487928d289c887131ccd9dd5a9ebd69570db8","Crate binary no longer matches original 0x72 II archive");
assert(sha256(pillarBytes)==="3fb915b96de71b6d939f434124d9c3c27831c54458a5daa5df3f447dd34c8e0e","Pillar binary no longer matches original 0x72 II archive");
const coinDigests=[
  "7e5956295c3b484f1d8dc3cc4d620538fe666bd23492a329e485c2a634df5989",
  "7bfb1fe833ae9da9097edf914fd78a43f72421fb633913020f41bf9286025755",
  "0f54e2f2b5a71b6a03a61addf7aa0752bddc2abb50c8d24b5b4ece77d1de2370"
];
for(let i=0;i<coinFiles.length;i++){
  const bytes=fs.readFileSync(new URL(folder+coinFiles[i],root));
  assert(bytes.readUInt32BE(16)===16&&bytes.readUInt32BE(20)===16,"Animated credit coin must remain 16x16: "+i);
  assert(sha256(bytes)===coinDigests[i],"Pixel_Poem original coin PNG must retain exact source bytes: "+i);
}
const coinPaths=[0,1,2,1].map(i=>folder+coinFiles[i]);
for(let i=0;i<4;i++)assert(visuals["creditCoinFrame"+i]===coinPaths[i],"Animated credit coins must preserve the original four-frame sequence: "+i);
assert(items.credits==="assets/pixel/visual-overhaul/r85/pickup-gold.svg","Existing R85 credit SVG fallback must be retained");
assert(barrelBytes.readUInt32BE(16)===16&&barrelBytes.readUInt32BE(20)===16,"Kenney barrel must remain exactly 16x16");
assert(sha256(barrelBytes)==="2efb31e30cd6f1527329fe5d7704e41c65a8376d498bf93372f46155600420c9","Kenney barrel binary must match declared curated CC0 asset");
const fitStart=render.indexOf("function dungeonAssetFitRect(");
const fitEnd=render.indexOf("\nfunction drawFurniture()",fitStart);
assert(fitStart>=0&&fitEnd>fitStart,"Missing proportional artwork fitting function");
const fitSandbox={window:{}};
vm.runInNewContext(render.slice(fitStart,fitEnd)+"\nwindow.fit=dungeonAssetFitRect;",fitSandbox,{timeout:1000});
const fit=fitSandbox.window.fit;
const torchFit=fit({naturalWidth:14,naturalHeight:23},0,0,32,36);
const crateFit=fit({naturalWidth:16,naturalHeight:24},0,0,38,38,true);
const pillarFit=fit({naturalWidth:16,naturalHeight:48},0,0,38,38,true);
assert(torchFit.w===22&&torchFit.h===36&&torchFit.x===5,"14x23 R118 torch must not be stretched to a square-ish viewport");
assert(crateFit.w===25&&crateFit.h===38&&crateFit.y===0,"16x24 imported crate must remain proportional and bottom aligned");
assert(pillarFit.w===13&&pillarFit.h===38&&pillarFit.y===0,"16x48 pillar must remain proportional and bottom aligned");
assert(render.includes("dungeonAssetFitRect(frame,q.x+4,q.y+2,C.tile-8,C.tile-4)"),"Animated torches must use proportional fit");
assert(render.includes("dungeonAssetFitRect(propArt,q.x+1,q.y+1,C.tile-2,C.tile-2,true)"),"Props must use proportional bottom aligned fit");
assert(render.includes('d.type==="pillar"?lostSizzlerPixelAssets.propPillar:null'),"Column artwork must only be applied to the existing pillar decoration");
assert(render.includes('if(d.type==="pillar"){')&&render.includes('ctx.fillRect(q.x+4,q.y+C.tile-9,C.tile-8,7)'),"Proportional narrow column must retain its wider existing blocking-plinth visual");

for(let i=1;i<=8;i++)assert(visuals["floorTile"+i]===null,"Unknown-rights R118 floor override must remain disabled: "+i);
for(let i=0;i<4;i++)assert(visuals["spikeTrapFrame"+i]===null,"Unknown-rights R118 spike art must remain disabled: "+i);
for(let i=0;i<5;i++)assert(visuals["fireplaceFrame"+i]===null,"Unknown-rights R118 fireplace art must remain disabled: "+i);
assert(visuals.propBarrel===folder+barrel,"Barrel must use separately licensed Kenney CC0 artwork, not excluded unidentified art");
assert(visuals.propBookcase===null,"Unknown-rights bookcase override must remain disabled");
assert(items.armour==="assets/pixel/visual-overhaul/r85/pickup-armour.svg","Licensed R85 armour fallback must be retained");
const catalogue=manifest.images?.visualOverhaul?.r118LicensedCC0;
assert(catalogue?.license==="CC0-1.0","R118 catalogue must record CC0 licence");
const tracedCharSheets=[
  ["pumpkin-dude.png","85d180f0a42d3a0bbcf14c1bce08d6b77bea6217013a73aa0235f8c9f8efdf17",[0,9]],
  ["plague-doc.png","2bb0c93615ac1a9c99e0f32be98d2d8e48fa78d7c4449627b3980dc9a849276e",[-1,9]]
];
for(const [name,sourcePNG_SHA256,offset] of tracedCharSheets){
  const art=fs.readFileSync(new URL(folder+name,root));
  const record=catalogue?.stagedCharacterSourceVerified?.[name];
  assert(art.readUInt32BE(16)===128&&art.readUInt32BE(20)===32,"Staged 0x72 animation sheet must remain eight 16x32 cells: "+name);
  assert(sha256(art)===sourcePNG_SHA256&&record?.stagedPNG_SHA256===sourcePNG_SHA256,"Staged 0x72 animation sheet fingerprint changed: "+name);
  assert(record.license==="CC0-1.0"&&record.archive==="0x72_DungeonTilesetII_v1.7.zip","Unverified paid/non-CC0 character art may not enter the staged catalogue: "+name);
  assert(record.archiveSHA256==="a5b23341ebc831d7798bfb9666d864a08c079bb7aed18e3cf023a27d517c1512","Original author archive identity must be preserved: "+name);
  assert(JSON.stringify(record.perCellOffsetPx)===JSON.stringify(offset),"Source-frame atlas offsets must preserve exact traced CC0 source: "+name);
  assert(Array.isArray(record.sourceFrameSHA256)&&record.sourceFrameSHA256.length===8,"Staged spritesheet must trace all eight original frames: "+name);
}
assert(!render.includes('make(selected("r118PumpkinDude"))')&&!render.includes('make(selected("r118PlagueDoc"))'),"Staged character sprites must not displace the main authored enemy atlas before owner visual approval");

assert(JSON.stringify(catalogue.activeWallTorchFrames)===JSON.stringify(active.map(x=>folder+x)),"R118 wall torch manifest differs from runtime");
assert(catalogue.activeKeyCandidate===folder+key,"Provenanced Niji key must remain active in manifest");
assert(catalogue.activeCrateSprite===folder+crate,"Source-verified 0x72 crate must be recorded in manifest");
assert(catalogue.activePillarSprite===folder+pillar,"Source-verified 0x72 pillar must be recorded in manifest");
assert(catalogue.sources?.activePillarSprite?.sourcePNG_SHA256===sha256(pillarBytes),"Pillar provenance digest must match exact original 0x72 PNG");
assert(catalogue.sources.activePillarSprite.license==="CC0-1.0","Pillar must preserve recorded original creator commercial-use CC0 license");
assert(catalogue.activeBarrelSprite===folder+barrel,"Licensed Kenney barrel must be recorded in manifest");
const freeCommercial=manifest.images?.visualOverhaul?.r118FreeCommercial;
assert(freeCommercial?.creator==="Pixel_Poem","Free commercial sprite author attribution missing");
assert(freeCommercial.license.includes("commercial game projects"),"Coin visual replacement requires commercial game permission");
assert(freeCommercial.originalArchiveSHA256==="efb5711728cd031b14d1333ad71329d2622bf9f11853a7cb7d216326e1d33f9d","Original uploaded free pack SHA-256 must be recorded");
assert(JSON.stringify(freeCommercial.activeCreditCoinFrames)===JSON.stringify(coinPaths),"Coin catalogue and renderer selection paths must match");
assert(JSON.stringify(freeCommercial.originalSHA256)===JSON.stringify([coinDigests[0],coinDigests[1],coinDigests[2],coinDigests[1]]),"Source original coin hashes and byte-duplicate frame mapping must match");
assert(freeCommercial.importedDistinctFrames===3,"Duplicate source frame must not be bundled twice");
const coinDrawStart=render.indexOf("function drawPickupGlyph("),coinDrawEnd=render.indexOf("\nfunction ",coinDrawStart+1);
assert(coinDrawStart>=0&&coinDrawEnd>coinDrawStart,"Failed to find the complete in-game pickup rendering function");
const drawCalls=[];
const coinImages=coinPaths.map((source,id)=>({source,id,complete:true,naturalWidth:16,naturalHeight:16}));
const ctxStub={save(){},restore(){},drawImage(...args){drawCalls.push(args)}};
const ctxEnvironment={ctx:ctxStub,performance:{now:()=>240},pickupOverrideImages:new Map(),lostSizzlerPixelAssets:{creditCoinFrames:coinImages},P:{gold:"#ffc84b"}};
vm.runInNewContext(render.slice(coinDrawStart,coinDrawEnd)+'\ndrawPickupGlyph({kind:"credits"},"#ffc84b");',ctxEnvironment,{timeout:1000});
assert(drawCalls.length===3,"The animated pickup must render three bounded gold coins");
assert(JSON.stringify(drawCalls.map(args=>args[3]))===JSON.stringify([16,16,21]),"Gold animation must remain within intended pickup dimensions");
assert(drawCalls.every(args=>coinImages.includes(args[0])),"Gold animation must use the source-audited frames only");
assert(ctxStub.imageSmoothingEnabled===false,"Gold animation must preserve nearest-neighbour pixel presentation");
assert(render.includes("if(custom?.complete&&custom.naturalWidth)"),"Existing R85 pickup fallback must remain");
assert(catalogue.sources?.activeBarrelSprite?.sourcePNG_SHA256===sha256(barrelBytes),"Barrel binary no longer matches audited mirror asset");
assert(catalogue.sources.activeBarrelSprite.sourceSpriteIndex==="tile_0082.png"&&catalogue.sources.activeBarrelSprite.license==="CC0-1.0","Kenney source index and CC0 source licence are mandatory");
assert(catalogue.sources?.activeKeyCandidate?.cropPixelSHA256==="580342c73c73cef8dd79c2a3c99094435fc6f2e724f2ac7fac96bb6ff8f207be","Niji key pixel match must remain documented");
assert(JSON.stringify(catalogue.sources?.activeKeyCandidate?.atlasCropPx)===JSON.stringify([320,320,16,16]),"Niji key crop identity is missing");
assert(catalogue.sources?.activeCrateSprite?.sourcePNG_SHA256===sha256(crateBytes),"Crate provenance digest does not match source sprite");
assert(catalogue.sources.activeKeyCandidate.license==="CC0-1.0"&&catalogue.sources.activeCrateSprite.license==="CC0-1.0","Active added artwork must retain commercial CC0 source records");

assert(JSON.stringify(catalogue.stagedNotWired)===JSON.stringify(staged.map(x=>folder+x)),"R118 staged manifest differs from files");
assert(JSON.stringify(freeCommercial.stagedNotWired)===JSON.stringify(stagedFreeCommercial.map(x=>folder+x)),"Pixel_Poem commercial-use staging must be separate from CC0 sources");
for(const [name,digest,dimensions,expectedFrames] of [
  ["skeleton-move.png","11ad26aaeda377fdad64aa6127e575900fd01198a36dbda6fdb19020d4d85469",[320,32],10],
  ["vampire-move.png","d84afcd7da250d7f890a325970e145967168703bcb3bb6e45b2f5a7e75fc903d",[256,32],8]
]){
  const png=fs.readFileSync(new URL(folder+name,root));
  const record=freeCommercial.stagedOriginalAnimationSheets?.[name];
  assert(sha256(png)===digest&&record?.originalPNG_SHA256===digest,"Movement animation must match exact free original Pixel_Poem bytes: "+name);
  assert(png.readUInt32BE(16)===dimensions[0]&&png.readUInt32BE(20)===dimensions[1],"Original animation grid dimensions must not change: "+name);
  assert(record.originalArchive==="Enemy_Animations_Set.zip"&&record.archiveSHA256==="4e17a982f71f688de7c86c9fa5feb63ad2709c649281b62b46cf6ce3de900dcd","Movement animation source archive provenance missing: "+name);
  assert(record.frameCount===expectedFrames&&JSON.stringify(record.frameDimensionsPx)==="[32,32]","Movement sheet must be indexed by its original 32x32 frames: "+name);
}
assert(!catalogue.stagedNotWired.some(path=>/skeleton-move|vampire-move/.test(path)),"Non-CC0 Pixel_Poem movement sheets must not be falsely classified as CC0");
const excluded=["floor-1.png","floor-2.png","floor-3.png","floor-4.png","prop-barrel.png","prop-bookcase.png","pickup-armour.png","spike-inactive.png","spike-active.png","fireplace.gif","torch-sconce.gif",...Array.from({length:5},(_,i)=>"fireplace-"+i+".png"),...Array.from({length:4},(_,i)=>"torch-sconce-"+i+".png")];
for(const name of excluded)assert(!fs.existsSync(new URL(folder+name,root)),"Unknown-rights source still bundled: "+name);
assert(render.includes('make(selected("floorTile1","assets/pixel/visual-overhaul/0x72/floor-1.png"))'),"Licensed floor fallback must remain");
assert(render.includes('make(selected("spikeTrapFrame0","assets/pixel/visual-overhaul/0x72/spikes-f0.png"))'),"Licensed trap fallback must remain");
assert(render.includes('d.type==="fireplace"')&&render.includes('d.type==="candleSconce"'),"Procedural fireplace/sconce fallback must remain");
assert(provenance.includes("CC0-1.0")&&provenance.includes("no README, author credit or licence file"),"Provenance must distinguish licensed and excluded sources");
console.log("R118 CC0 art, commercial-free gold animation, aspect-preserving render and unknown-rights exclusions passed.");
