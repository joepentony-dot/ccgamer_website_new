import fs from "node:fs";
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
const staged=["floor-stairs.png","monster-dark-knight.png","monster-imp.png","monster-necromancer.png","plague-doc.png","prop-boxes-stacked.png","prop-column.png","pumpkin-dude.png","skeleton-move.png","vampire-move.png"];
for(const name of [...active,key,...staged]){
  const bytes=fs.readFileSync(new URL(folder+name,root));
  assert(bytes.length>100,"Missing/empty CC0 candidate: "+name);
  assert(bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),"Invalid PNG signature: "+name);
  const w=bytes.readUInt32BE(16),h=bytes.readUInt32BE(20);
  assert(w>0&&h>0&&w<=512&&h<=512,"R118 PNG exceeds candidate size envelope: "+name+" "+w+"x"+h);
}
for(let i=0;i<4;i++)assert(visuals["torchSconceFrame"+i]===folder+active[i],"Verified CC0 wall torch frame not selected: "+i);
assert(items.key===folder+key,"R118 key candidate must remain explicitly catalogued pending source-lineage acceptance");
for(let i=1;i<=8;i++)assert(visuals["floorTile"+i]===null,"Unknown-rights R118 floor override must remain disabled: "+i);
for(let i=0;i<4;i++)assert(visuals["spikeTrapFrame"+i]===null,"Unknown-rights R118 spike art must remain disabled: "+i);
for(let i=0;i<5;i++)assert(visuals["fireplaceFrame"+i]===null,"Unknown-rights R118 fireplace art must remain disabled: "+i);
for(const key of ["propBarrel","propBookcase"])assert(visuals[key]===null,"Unknown-rights R118 prop override must remain disabled: "+key);
assert(items.armour==="assets/pixel/visual-overhaul/r85/pickup-armour.svg","Licensed R85 armour fallback must be retained");
const catalogue=manifest.images?.visualOverhaul?.r118LicensedCC0;
assert(catalogue?.license==="CC0-1.0","R118 catalogue must record CC0 licence");
assert(JSON.stringify(catalogue.activeWallTorchFrames)===JSON.stringify(active.map(x=>folder+x)),"R118 wall torch manifest differs from runtime");
assert(catalogue.activeKeyCandidate===folder+key,"R118 key candidate not catalogued");
assert(JSON.stringify(catalogue.stagedNotWired)===JSON.stringify(staged.map(x=>folder+x)),"R118 staged manifest differs from files");
const excluded=["floor-1.png","floor-2.png","floor-3.png","floor-4.png","prop-barrel.png","prop-bookcase.png","pickup-armour.png","spike-inactive.png","spike-active.png","fireplace.gif","torch-sconce.gif",...Array.from({length:5},(_,i)=>"fireplace-"+i+".png"),...Array.from({length:4},(_,i)=>"torch-sconce-"+i+".png")];
for(const name of excluded)assert(!fs.existsSync(new URL(folder+name,root)),"Unknown-rights source still bundled: "+name);
assert(render.includes('make(selected("floorTile1","assets/pixel/visual-overhaul/0x72/floor-1.png"))'),"Licensed floor fallback must remain");
assert(render.includes('make(selected("spikeTrapFrame0","assets/pixel/visual-overhaul/0x72/spikes-f0.png"))'),"Licensed trap fallback must remain");
assert(render.includes('d.type==="fireplace"')&&render.includes('d.type==="candleSconce"'),"Procedural fireplace/sconce fallback must remain");
assert(provenance.includes("CC0-1.0")&&provenance.includes("no README, author credit or licence file"),"Provenance must distinguish licensed and excluded sources");
console.log("R118 licensed asset staging and unknown-rights exclusion contracts passed.");
