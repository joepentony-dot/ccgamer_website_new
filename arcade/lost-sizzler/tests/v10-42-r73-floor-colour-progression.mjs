import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

const render=read("js/game-render.js");
const biome=read("js/v10-42-r6-biome-environment-director.js");

assert.match(render,/const FLOOR_TILE_PALETTES=Object\.freeze\(\{/,"renderer must own the fifteen-floor palette table");
const palettes=[
  "threshold-stone","drive-steel","iron-keep","budget-amber","cartridge-green",
  "tape-violet","crypt-moss","demo-magenta","modem-cyan","sid-red",
  "ember-orange","foundry-copper","score-gold","crt-green","blood-citadel"
];
for(const id of palettes)assert.ok(render.includes(`id:"${id}"`),`missing floor palette ${id}`);
assert.equal((render.match(/Object\.freeze\(\{id:"/g)||[]).length>=15,true,"renderer must expose at least fifteen explicit floor palettes");
assert.match(render,/function applyFloorTilePalette\(s,wall\)/,"floor palette must apply at tile level");
assert.ok((render.match(/applyFloorTilePalette\(s,true\)/g)||[]).length>=2,"both normal and severe wall rendering must keep floor identity");
assert.ok((render.match(/applyFloorTilePalette\(s,false\)/g)||[]).length>=2,"both normal and severe floor rendering must keep floor identity");
assert.match(render,/1:Object\.freeze\(\{id:"threshold-stone".*rgba\(105,99,94,/s,"Floor 1 must remain neutral stone");
assert.match(render,/7:Object\.freeze\(\{id:"crypt-moss".*rgba\(66,99,57,/s,"Floor 7 must retain the Moss Crypt green identity");
assert.match(render,/11:Object\.freeze\(\{id:"ember-orange".*rgba\(139,70,32,/s,"Floor 11 must retain the Ember Depths orange identity");
assert.match(render,/15:Object\.freeze\(\{id:"blood-citadel".*rgba\(145,29,48,/s,"Floor 15 must finish in Blood Citadel danger red");
assert.ok(render.includes("const max=Math.max(1,Number(C.maxFloors)||15)"),"floor palette selection must follow the fifteen-floor campaign cap");
assert.ok(render.includes("if(floor===max&&h%5===0)"),"final-floor corridors must reinforce the Blood Citadel danger identity");

const biomeIds=["threshold","driveworks","iron","budget","cartridge","tapes","bone","demo","modem","sid","ash","foundry","scores","crt","citadel"];
for(const id of biomeIds)assert.ok(biome.includes(`${id}:{id:"${id}"`),`missing biome identity ${id}`);
assert.match(biome,/threshold:\{id:"threshold",name:"RUINED THRESHOLD".*accent:"168,163,156"/,"Threshold accents must stay neutral");
assert.match(biome,/bone:\{id:"bone",name:"MOSS CRYPT".*accent:"153,194,125"/,"Moss Crypt must remain green");
assert.match(biome,/ash:\{id:"ash",name:"EMBER DEPTHS".*accent:"255,120,72"/,"Ember Depths must remain orange");
assert.match(biome,/citadel:\{id:"citadel",name:"BLOOD CITADEL",material:"blood-rune obsidian".*accent:"255,75,87"/,"Floor 15 biome must finish in Blood Citadel danger colours");

console.log("Dungeon R87 fifteen-floor colour progression contract passed.");
