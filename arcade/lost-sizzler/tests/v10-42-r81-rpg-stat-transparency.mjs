import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

const source=read("js/v10-42-procedural-overhaul.js");
const version=JSON.parse(read("version.json"));

assert.equal(version.build,"V10.42 r93");
assert.equal(version.cacheToken,"20261002r93");
assert.match(source,/function attributeEffect\(player,id\)/,"R81 must expose one live-effect formatter for RPG attributes");
assert.match(source,/canonical melee\/firearm damage/,"Might must explain its real canonical damage contribution");
assert.match(source,/max health from Vitality/,"Vitality must explain its real maximum-health contribution");
assert.match(source,/lower movement delay/,"Agility must describe the real reduction in movement cadence delay rather than the inverse speed percentage");
assert.match(source,/max ammo from Endurance/,"Endurance must explain its real ammunition contribution");
assert.match(source,/wearable rolls up to/,"Luck must explain its real chest and wearable influence");
assert.match(source,/permanentSight=specialised\?1:0/,"Arcana transparency must derive the permanent sight contribution from the active ARC 10 specialisation");
assert.match(source,/Permanent \+\$\{permanentSight\} sight/,"Arcana transparency must label the permanent specialisation sight separately");
assert.match(source,/Reveal \+\$\{reveal\} sight/,"Arcana transparency must label conditional Reveal sight separately");
assert.match(source,/class="v142-rpg-effect"/,"the RPG sheet must render the calculated effect under each stat");

const start=source.indexOf("function attributeEffect(player,id)");
const end=source.indexOf("function renderRpgSheet()",start);
assert.ok(start>0&&end>start,"attributeEffect source must be extractable");

const RPG_BASE=5;
const context={
  Math,
  Number,
  Boolean,
  stat:(player,id)=>Math.max(RPG_BASE,Math.floor(Number(player?.rpgStats?.[id])||RPG_BASE)),
  essenceCost:player=>Math.max(2,Number(player?.banishmentEssenceCost)||3),
  RPG_BASE
};
vm.createContext(context);
vm.runInContext(source.slice(start,end),context,{filename:"r81-attribute-effect.js"});

const player={
  rpgStats:{might:9,vitality:10,agility:10,endurance:10,luck:10,arcana:10},
  v142R23BuildMilestones:{vitality:10,agility:10,endurance:10,arcana:10},
  banishmentEssenceCost:2,
  v142WardCooldownMs:18000,
  sigilReveal:true
};
assert.match(context.attributeEffect(player,"might"),/\+2 canonical melee\/firearm damage/);
assert.match(context.attributeEffect(player,"vitality"),/\+7 max health/);
assert.match(context.attributeEffect(player,"agility"),/dash contact damage/);
assert.match(context.attributeEffect(player,"agility"),/about 18% lower movement delay/);
assert.match(context.attributeEffect(player,"endurance"),/\+110 max ammo/);
assert.match(context.attributeEffect(player,"luck"),/\+6\.75/);
assert.match(context.attributeEffect(player,"arcana"),/Flask cost 2 Essence · Ward 18s · Permanent \+1 sight · Reveal \+3 sight/);

console.log("Dungeon R81 RPG stat transparency contract passed.");
