import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

const source=read("js/v10-42-r80-wearable-equipment.js");
const css=read("css/v10-42-r80-wearable-equipment.css");
const bootstrap=read("js/v10-42-bootstrap.js");
const version=JSON.parse(read("version.json"));

assert.equal(version.build,"V10.42 r80");
assert.equal(version.cacheToken,"20260930r80");

assert.match(bootstrap,/v10-42-r71-equipment-inventory\.js[\s\S]*v10-42-r80-wearable-equipment\.js[\s\S]*v10-42-r72-map-death-feedback\.js/,"R80 wearables must load after the R71 inventory owner and before later presentation modules");
assert.match(source,/const SLOT_ORDER=\["head","hands","feet"\]/,"wearables must expose genuine Head, Hands and Feet slots");
assert.match(source,/function equipWearable/,"wearables must have one equip transaction");
assert.match(source,/function unequipWearable/,"wearables must support explicit unequip");
assert.match(source,/PGR\.inventoryRemove\(player,index\)/,"equipping must remove the carried item from inventory");
assert.match(source,/PGR\.inventoryAdd\(player,old\)/,"swapping must return the old equipped item to inventory");
assert.match(source,/PGR\.effectiveSight=function r80WearableSight/,"Head equipment must affect the canonical sight calculation");
assert.match(source,/player\.scavenger=Math\.max\(0,Number\(player\.scavenger\|\|0\)-old\+next\)/,"Hands equipment must compose with existing Scavenger progression rather than replacing it");
assert.match(source,/player\.moveMultiplier=Math\.max\(\.1,base\*next\)/,"Feet equipment must compose with existing movement upgrades");
assert.match(source,/preservePlayer=function r80PreserveWearables/,"equipped clothing must survive floor transitions");
assert.match(source,/openChest=function r80OpenChestWearableBonus/,"chests must be capable of producing real wearable loot");
assert.match(source,/WEARABLE GEAR — INVENTORY FULL/,"full inventory must drop the wearable beside the chest instead of deleting it");
assert.match(source,/Boolean\(chest\.v142WardenCache\)/,"Warden Cache bonus gear must key off the real cache flag rather than ID wording alone");
assert.doesNotMatch(source,/ZZAP! (?:VISOR|GAUNTLETS|BOOTS)/,"user-facing top-tier wearable names must use the reconciled LEGENDARY RPG terminology");
assert.match(source,/item\?\.carriedItem\?\.kind==="wearable"/,"a dropped wearable must retain its real item identity when collected");
assert.match(source,/return item\.carriedItem\.name\|\|"WEARABLE GEAR"/,"wearable floor pickup text must use the gear name rather than generic armour copy");
assert.match(source,/data-r80-equip/,"carried wearables must expose an EQUIP action");
assert.match(source,/data-r80-unequip/,"equipped wearables must expose an UNEQUIP action");
assert.match(source,/function wearableComparison/,"wearable INFO must compare the candidate with the currently equipped item");
assert.match(source,/CURRENT: .*NEW:/s,"wearable comparison must expose current and replacement gear before equipping");
assert.match(css,/\.r80-wearable-strip/,"R80 must render a dedicated wearable loadout strip");
assert.match(css,/\.r80-preview-head/,"equipped Head gear must be represented on the character preview");
assert.match(css,/\.r80-preview-hands/,"equipped Hands gear must be represented on the character preview");
assert.match(css,/\.r80-preview-feet/,"equipped Feet gear must be represented on the character preview");
assert.match(source,/function drawLiveWearables/,"R80 must render genuine wearable accents on the live dungeon player");
assert.match(source,/drawPlayerEquipmentOverlay=function r80DrawPlayerEquipmentOverlay/,"live wearables must extend the established player equipment overlay rather than replace the player renderer");
assert.match(source,/if\(head\)[\s\S]*if\(hands\)[\s\S]*if\(feet\)/,"live overlay must represent all three genuine wearable slots");

const inventoryAdd=(player,item)=>{
  player.inventory=player.inventory||[];
  if(player.inventory.length>=6)return false;
  player.inventory.push({...item});
  return true;
};
const inventoryRemove=(player,index)=>{
  player.inventory=player.inventory||[];
  if(index<0||index>=player.inventory.length)return null;
  return player.inventory.splice(index,1)[0];
};
const context={
  console,
  performance:{now:()=>1000},
  Math,
  Date,
  setTimeout,
  clearTimeout,
  run:{floor:3},
  window:{
    CCGProgression:{
      RARITY:["COMMON","UNCOMMON","SIZZLER","GOLD MEDAL","ZZAP! 97%"],
      effectiveSight:()=>5,
      inventoryAdd,
      inventoryRemove,
      inventoryCanAdd:player=>(player.inventory||[]).length<6
    }
  },
  document:{
    querySelector:()=>null,
    createElement:()=>({rel:"",href:"",dataset:{}}),
    head:{appendChild:()=>{}},
    getElementById:()=>null
  }
};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(source,context,{filename:"v10-42-r80-wearable-equipment.js"});
const api=context.window.CCGLostSizzlerV142R80WearableEquipment;
assert.ok(api,"R80 API must initialise");

const generated=api.makeWearable({id:"arena-chest-test",depth:5});
assert.equal(generated.kind,"wearable");
assert.ok(["head","hands","feet"].includes(generated.slot));
assert.ok(generated.name);
assert.ok(api.effectText(generated).length>3);

const player={
  inventory:[{kind:"wearable",slot:"hands",name:"TEST GLOVES",rarity:"SIZZLER",scavengerBonus:.16}],
  scavenger:.2,
  moveMultiplier:.95
};
assert.equal(api.equipWearable(player,0),true);
assert.equal(player.wearables.hands.name,"TEST GLOVES");
assert.equal(Number(player.scavenger.toFixed(2)),.36);
assert.equal(player.inventory.length,0);

player.inventory.push({kind:"wearable",slot:"hands",name:"BETTER GLOVES",rarity:"GOLD MEDAL",scavengerBonus:.20});
assert.equal(api.equipWearable(player,0),true);
assert.equal(player.wearables.hands.name,"BETTER GLOVES");
assert.equal(Number(player.scavenger.toFixed(2)),.40);
assert.equal(player.inventory.length,1);
assert.equal(player.inventory[0].name,"TEST GLOVES");

player.inventory.push({kind:"wearable",slot:"feet",name:"RUNNER BOOTS",rarity:"SIZZLER",moveFactor:.95});
assert.equal(api.equipWearable(player,1),true);
assert.equal(Number(player.moveMultiplier.toFixed(4)),.9025,"boots must multiply the existing Quick Feet-style movement bonus");

player.inventory.push({kind:"wearable",slot:"head",name:"TORCHFINDER",rarity:"SIZZLER",sightBonus:1});
assert.equal(api.equipWearable(player,1),true);
assert.equal(context.window.CCGProgression.effectiveSight(player,context.run),6);

assert.equal(api.unequipWearable(player,"hands"),true);
assert.equal(player.wearables.hands,null);
assert.equal(Number(player.scavenger.toFixed(2)),.20,"unequipping gloves must restore the pre-gear Scavenger value");

console.log("Dungeon R80 genuine wearable equipment contract passed.");
