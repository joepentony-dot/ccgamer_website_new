import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const procedural=read("js/v10-42-procedural-overhaul.js");
const play=read("js/game-play.js");
const melee=read("js/v10-25-melee-ammo-balance.js");

assert.match(procedural,/id:"might"[\s\S]*Every second point above 5 adds \+1 weapon damage/,
  "Might must continue to advertise a real weapon-damage increase");
assert.match(procedural,/statId==="might"[\s\S]*player\.damageBonus=\(player\.damageBonus\|\|0\)\+1/,
  "Might upgrades must continue to increment the canonical damageBonus");
assert.match(play,/power:\(w\.power\|\|1\)\+\(p\.damageBonus\|\|0\)/,
  "firearm projectiles must continue to receive the full canonical Might bonus");

const meleeDamage=melee.match(/const meleeDamageFor=p=>[^\n]+/)?.[0]||"";
assert.match(meleeDamage,/\+Number\(p\?\.damageBonus\|\|0\)/,
  "melee must receive the full canonical Might-backed damageBonus");
assert.doesNotMatch(meleeDamage,/damageBonus[^;]*\.5/,
  "melee must not halve the Might-backed damage bonus");
assert.match(melee,/Current damage \$\{meleeDamageFor\(p\)\} including level mastery and Might\./,
  "melee equipment feedback must explain that Might contributes to displayed damage");

console.log("Dungeon R75 Might combat parity contract passed.");
