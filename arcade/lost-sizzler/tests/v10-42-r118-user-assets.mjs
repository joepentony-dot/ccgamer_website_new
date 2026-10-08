import fs from "node:fs";

const root=new URL("../",import.meta.url);
const overrides=fs.readFileSync(new URL("js/asset-overrides.js",root),"utf8");
const render=fs.readFileSync(new URL("js/game-render.js",root),"utf8");
const manifest=fs.readFileSync(new URL("assets/asset-manifest.json",root),"utf8");
const provenance=fs.readFileSync(new URL("assets/pixel/user-r118/PROVENANCE.md",root),"utf8");

function assert(condition,message){if(!condition)throw new Error(message)}

const assets=[
  "floor-1.png","floor-2.png","floor-3.png","floor-4.png",
  "prop-barrel.png","prop-bookcase.png","pickup-armour.png",
  "spike-inactive.png","spike-active.png",
  "torch-sconce-0.png","torch-sconce-1.png","torch-sconce-2.png","torch-sconce-3.png",
  "fireplace-0.png","fireplace-1.png","fireplace-2.png","fireplace-3.png","fireplace-4.png"
];
for(const name of assets){
  const url=new URL(`assets/pixel/user-r118/${name}`,root);
  assert(fs.existsSync(url),`Missing R118 owner-supplied asset: ${name}`);
  assert(fs.statSync(url).size>250,`R118 asset is unexpectedly small: ${name}`);
}

for(let i=1;i<=8;i++){
  const source=((i-1)%4)+1;
  assert(overrides.includes(`floorTile${i}:"assets/pixel/user-r118/floor-${source}.png"`),`R118 floor override missing for tile ${i}`);
}
assert(overrides.includes('propBarrel:"assets/pixel/user-r118/prop-barrel.png"'),"R118 barrel override missing");
assert(overrides.includes('propBookcase:"assets/pixel/user-r118/prop-bookcase.png"'),"R118 bookcase override missing");
assert(overrides.includes('armour:"assets/pixel/user-r118/pickup-armour.png"'),"R118 armour pickup override missing");
assert(overrides.includes('spikeTrapFrame0:"assets/pixel/user-r118/spike-inactive.png"'),"R118 safe spike art missing");
assert(overrides.includes('spikeTrapFrame1:"assets/pixel/user-r118/spike-active.png"'),"R118 active spike art missing");

assert(render.includes("fireplaceFrames:["),"R118 fireplace frame loader missing");
assert(render.includes("torchSconceFrames:["),"R118 torch-sconce frame loader missing");
assert(render.includes('d.type==="fireplace"&&fireplaceFrames.length===5'),"R118 fireplace renderer missing");
assert(render.includes('d.type==="candleSconce"&&torchSconceFrames.length===4'),"R118 wall-sconce renderer missing");
assert(render.includes('d.type==="barrel"?lostSizzlerPixelAssets.propBarrel'),"R118 barrel is not wired into furniture rendering");
assert(render.includes('["bookcase","shelf"].includes(d.type)?lostSizzlerPixelAssets.propBookcase'),"R118 bookcase is not wired into furniture rendering");

assert(manifest.includes('"r118OwnerAssets"')||manifest.includes('"r118FloorTile1"'),"R118 assets must be catalogued in the manifest");
assert(provenance.includes("owner-supplied")&&provenance.includes("No README, author credit or licence file"),"R118 provenance must preserve the supplied-source licensing caveat");

console.log("R118 owner-supplied dungeon art contracts passed.");
