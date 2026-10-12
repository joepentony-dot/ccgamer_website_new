import fs from "node:fs";

const root=new URL("../",import.meta.url);
const overrides=fs.readFileSync(new URL("js/asset-overrides.js",root),"utf8");
const render=fs.readFileSync(new URL("js/game-render.js",root),"utf8");

function assert(condition,message){if(!condition)throw new Error(message)}

const assets=[
  "pickup-ammo.svg","pickup-gold.svg","pickup-armour.svg","pickup-firearm-upgrade.svg",
  "pickup-health.svg","pickup-xp.svg","prop-crate.svg","prop-barrel.svg","prop-bookcase.svg","prop-console.svg"
];
for(const name of assets){
  const url=new URL(`assets/pixel/visual-overhaul/r85/${name}`,root);
  assert(fs.existsSync(url),`Missing R85 authored sprite: ${name}`);
  const svg=fs.readFileSync(url,"utf8");
  assert(svg.includes('shape-rendering="crispEdges"'),`R85 sprite must preserve pixel edges: ${name}`);
}

for(const [kind,file] of Object.entries({
  health:"pickup-health.svg",ammo:"pickup-ammo.svg",potion:"pickup-health.svg",
  credits:"pickup-gold.svg",xpOrb:"pickup-xp.svg",armour:"pickup-armour.svg",weapon:"pickup-firearm-upgrade.svg"
})){
  assert(overrides.includes(`${kind}:"assets/pixel/visual-overhaul/r85/${file}"`),`Pickup override missing for ${kind}`);
}


// R134 improves the semantically incorrect R85 ammo-as-mana icon only.
// All original R85 assets remain bundled; the replacement must be a
// separately licensed, fingerprint-pinned, 32x32 commercial-free sprite.
const manaPath="assets/pixel/user-r134/indie-vova-mana.png";
const manaRecord=JSON.parse(fs.readFileSync(new URL("assets/asset-manifest.json",root),"utf8")).images?.visualOverhaul?.r134FreeCommercial;
assert(manaRecord?.creator==="Indie_Vova (Vladimir Ivanov)","Mana icon must identify the free-commercial creator");
assert(manaRecord?.activeManaPickup===manaPath&&manaRecord?.license?.includes("not CC0"),"Mana override must retain commercial free-edition licence");
assert(overrides.includes(`mana:"${manaPath}"`),"Mana must have only the approved non-ammunition R134 art");
const manaBytes=fs.readFileSync(new URL(manaPath,root));
assert(manaBytes.readUInt32BE(16)===32&&manaBytes.readUInt32BE(20)===32,"Mana icon must remain a 32x32 pixel sprite");
assert(manaRecord.activePNGSHA256==="2e41a3939fcb5e1a6a560962b8875be85c023fb418f44345302494ac5f8f741e","Mana icon must preserve original audited fingerprint");

for(const key of ["propCrate","propBarrel","propBookcase","propConsole"]){
  assert(render.includes(`${key}:make(selected("${key}"`),`Renderer asset missing: ${key}`);
}
assert(render.includes('d.type==="crate"?lostSizzlerPixelAssets.propCrate'),"Crate sprite is not wired into furniture rendering.");
assert(render.includes('d.type==="barrel"?lostSizzlerPixelAssets.propBarrel'),"Barrel sprite is not wired into furniture rendering.");
assert(render.includes('["bookcase","shelf"].includes(d.type)?lostSizzlerPixelAssets.propBookcase'),"Bookcase sprite is not wired into furniture rendering.");
assert(render.includes('["terminal","console"].includes(d.type)?lostSizzlerPixelAssets.propConsole'),"Console sprite is not wired into furniture rendering.");

console.log("R85 authored object/pickup sprite contracts passed.");
