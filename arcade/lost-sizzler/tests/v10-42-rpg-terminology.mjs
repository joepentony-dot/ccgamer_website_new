import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";
import path from "node:path";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-42-rpg-terminology.js"),"utf8");
const bootstrap=fs.readFileSync(path.join(root,"js/v10-42-bootstrap.js"),"utf8");
const progression=fs.readFileSync(path.join(root,"js/progression.js"),"utf8");

const PGR={
  generateWeapon(){return{rarity:"SIZZLER",name:"Pulse Blaster",displayName:"SIZZLER Turbo Pulse Blaster"}},
  lootForChest(){return{kind:"armour",rarity:"ZZAP! 97%",name:"ZZAP! 97% Armour Plate"}},
  objectiveLabel(){return"Defeat the Zzap! Citadel guardian"},
  inventoryLabel(item){return item?.name||""}
};
const context={window:{CCGProgression:PGR},console};
vm.runInNewContext(source,context,{filename:"v10-42-rpg-terminology.js"});

const layer=context.window.CCGLostSizzlerV142RpgTerminology;
assert.ok(layer,"terminology layer should install");
assert.equal(layer.rarityLabel("UNCOMMON"),"RARE");
assert.equal(layer.rarityLabel("SIZZLER"),"ENCHANTED");
assert.equal(layer.rarityLabel("GOLD MEDAL"),"RELIC");
assert.equal(layer.rarityLabel("ZZAP! 97%"),"LEGENDARY");

const weapon=PGR.generateWeapon();
assert.equal(weapon.rarity,"SIZZLER","internal rarity identity must remain stable for save/progression compatibility");
assert.equal(weapon.displayName,"ENCHANTED Turbo Pulse Blaster");

const loot=PGR.lootForChest();
assert.equal(loot.rarity,"ZZAP! 97%","loot rarity identity must remain stable internally");
assert.equal(loot.name,"LEGENDARY Armour Plate");
assert.equal(PGR.objectiveLabel(),"Defeat the Citadel guardian");
assert.equal(PGR.inventoryLabel({rarity:"GOLD MEDAL",name:"GOLD MEDAL Restoration Potion"}),"RELIC Restoration Potion");

for(const legacy of ["UNCOMMON","SIZZLER","GOLD MEDAL","ZZAP! 97%"]){
  assert.match(progression,new RegExp(legacy.replace(/[!.*+?^${}()|[\]\\]/g,"\\$&")),`base progression should retain internal ${legacy} identity`);
}
assert.match(bootstrap,/V10\.42 r42/);
assert.match(bootstrap,/20260921r42/);
assert.ok(bootstrap.indexOf('v10-42-rpg-terminology.js')<bootstrap.indexOf('v10-42-owned-firearm-clarity.js'),"terminology must load before Owned Firearms presentation");

console.log("PASS v10-42 RPG terminology reconciliation");
