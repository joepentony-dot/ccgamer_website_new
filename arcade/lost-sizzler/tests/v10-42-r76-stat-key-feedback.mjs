import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

const play=read("js/game-play.js");
const rpg=read("js/v10-42-procedural-overhaul.js");
const melee=read("js/v10-25-melee-ammo-balance.js");
const voice=read("js/v10-16-voice-director.js");

assert.match(play,/if\(p\.bronzeKeys<=0\)\{S\.sfx\("locked"\);floatText\(p\.x,p\.y,"NO KEY",P\.red\);showToast\("LOCKED BRONZE DOOR"/,"bronze doors must show local NO KEY feedback as well as the explanatory toast");
assert.match(play,/floatText\(chest\.x,chest\.y,"NO KEY",P\.red\);showToast\("LOCKED CHEST"/,"locked chests must show local NO KEY feedback");
assert.match(play,/function chestBronzeDoorAlreadyPaid\(chest\)/,"chests behind an already-paid bronze room door must retain the one-key ownership rule");
assert.match(voice,/LOCKED BRONZE DOOR[^\n]*bronzeKeyRequired|bronzeKeyRequired[^\n]*LOCKED BRONZE DOOR/,"bronze-door feedback must remain wired to the recorded key-required voice");
assert.match(voice,/LOCKED CHEST[^\n]*chestKeyRequired|chestKeyRequired[^\n]*LOCKED CHEST/,"locked-chest feedback must remain wired to the recorded key-required voice");

for(const stat of ["might","vitality","agility","endurance","luck","arcana"]){
  assert.match(rpg,new RegExp(`id:"${stat}"`),`six-stat owner must still expose ${stat}`);
}
assert.match(rpg,/statId==="might"[^\n]*player\.damageBonus/,"Might must still increase the canonical damage bonus");
assert.match(melee,/damageBonus[^\n]*levelMastery/,"melee damage must consume the canonical Might-linked damage bonus after R75");
assert.match(rpg,/statId==="vitality"[^\n]*player\.maxHealth\+=1/,"Vitality must increase maximum health");
assert.match(rpg,/statId==="agility"[^\n]*moveMultiplier[^\n]*\.97/,"Agility must improve movement speed");
assert.match(rpg,/statId==="endurance"[^\n]*maxMana\+=14[^\n]*armor/,"Endurance must increase ammunition capacity and armour");
assert.match(rpg,/luck=Math\.max\(0,stat\(player,"luck"\)-RPG_BASE\),boost=luck\*1\.35/,"Luck must improve generated chest-loot quality");
assert.match(rpg,/statId==="arcana"[^\n]*banishmentEssenceCost[^\n]*v142WardCooldownMs/,"Arcana must improve Banishment/Sigil mechanics");

console.log("Dungeon R76 six-stat and Bronze Key feedback contracts passed.");
