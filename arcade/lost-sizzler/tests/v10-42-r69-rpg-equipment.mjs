import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const procedural=read("js/v10-42-procedural-overhaul.js");
const play=read("js/game-play.js");
const melee=read("js/v10-25-melee-ammo-balance.js");
const render=read("js/game-render.js");

assert.match(procedural,/id:"might"[\s\S]*Every second point above 5 adds \+1 weapon damage/,
  "Might must advertise its actual weapon-damage progression");
assert.match(procedural,/statId==="might"[\s\S]*player\.damageBonus=\(player\.damageBonus\|\|0\)\+1/,
  "Might must change the canonical player damageBonus value");
assert.match(play,/power:\(w\.power\|\|1\)\+\(p\.damageBonus\|\|0\)/,
  "firearm projectiles must consume the canonical Might-backed damageBonus");
assert.match(melee,/meleeDamageFor=p=>[\s\S]*damageBonus/,
  "melee damage must remain connected to the same canonical damageBonus owner");

assert.match(render,/function drawPlayerEquipmentOverlay\(p,cx,cy,d\)/,
  "player renderer must expose one armour presentation overlay");
assert.match(render,/const armour=Math\.max\(0,Math\.min\(12,Number\(p\?\.armor\)\|\|0\)\)/,
  "equipment visuals must derive from real player armour rather than a second inventory");
assert.match(render,/drawPlayerEquipmentOverlay\(p,cx,cy,d\)/,
  "actual player rendering must call the armour overlay");
assert.doesNotMatch(render,/p\.equipment\s*=|equipmentInventory|clothingInventory/,
  "R69 must not introduce a parallel equipment ownership system");

console.log("Dungeon R69 RPG stat and equipment ownership regression checks passed.");
