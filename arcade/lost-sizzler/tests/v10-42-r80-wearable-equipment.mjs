import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

const source=read("js/v10-42-r80-wearable-equipment.js");
const core=read("js/game-core.js");
const proceduralOverhaul=read("js/v10-42-procedural-overhaul.js");
const css=read("css/v10-42-r80-wearable-equipment.css");
const bootstrap=read("js/v10-42-bootstrap.js");
const version=JSON.parse(read("version.json"));

assert.match(version.build,/^V10\.42 r\d+$/,"feature contract requires the current V10.42 release family");
assert.match(version.cacheToken,/^\d{8}r\d+$/,"feature contract requires a valid current release cache token");

assert.match(bootstrap,/v10-42-r71-equipment-inventory\.js[\s\S]*v10-42-r80-wearable-equipment\.js[\s\S]*v10-42-r72-map-death-feedback\.js/,"R80 wearables must load after the R71 inventory owner and before later presentation modules");
assert.match(source,/const SLOT_ORDER=\["head","hands","feet"\]/,"wearables must expose genuine Head, Hands and Feet slots");
assert.match(source,/function gearTierFor/,"wearables must map the existing loot rarity stream into RPG armour tiers");
assert.match(source,/armourBonus:3,enchanted:true/,"Enchanted gear must be the best armour tier at +3");
assert.match(core,/id==="armour"\)\{const before=p1\.armor\|\|0,cap=PGR\.armourCap\?\.\(p1\)\|\|12;p1\.armor=Math\.min\(cap,before\+3\)/,"shop Armour Repair must respect wearable-derived armour capacity instead of hard-coding 12");
assert.match(core,/up to your current armour limit/,"shop Armour Repair copy must describe the wearable-aware current cap");
assert.match(read("js/progression.js"),/Armour Repair[\s\S]{0,180}Math\.min\(armourCap\(p\),p\.armor\+2\)/,"level-up Armour Repair must respect wearable-derived armour capacity");
assert.doesNotMatch(read("js/progression.js"),/Armour Repair[\s\S]{0,180}Math\.min\(12,p\.armor\+2\)/,"level-up Armour Repair must not clamp wearable users to the base armour cap");
assert.match(proceduralOverhaul,/statId==="endurance"[\s\S]{0,180}PROG\.armourCap\?\.\(player\)/,"Endurance armour gain must respect wearable-derived capacity.");
assert.match(proceduralOverhaul,/player\.sigilWard[\s\S]{0,180}PROG\.armourCap\?\.\(player\)/,"Sigil WARD repair must respect wearable-derived capacity.");
assert.doesNotMatch(proceduralOverhaul,/statId==="endurance"[\s\S]{0,180}Math\.min\(12/,"Endurance must not retain the obsolete base armour clamp.");
assert.doesNotMatch(proceduralOverhaul,/player\.sigilWard[\s\S]{0,180}player\.armor<12/,"Sigil WARD must not stop at the obsolete base armour cap.");
assert.match(source,/if\(!tier\.enchanted\)return base/,"secondary wearable bonuses must be reserved for Enchanted gear");
assert.match(source,/PGR\.createDeathCache=function r114CreateDeathCacheWithWearables/,"death cache creation must strip equipped wearables into the cache");
assert.match(source,/const cache=baseCreateDeathCache\(player,runState,x,y,\.\.\.args\),equipped=stripWearablesForDeath\(player\)/,"death cache must snapshot carried items and armour before equipped gear is stripped");


assert.match(source,/function equipWearable/,"wearables must have one equip transaction");
assert.match(source,/function unequipWearable/,"wearables must support explicit unequip");
assert.match(source,/PGR\.inventoryRemove\(player,index\)/,"equipping must remove the carried item from inventory");
assert.match(source,/PGR\.inventoryAdd\(player,old\)/,"swapping must return the old equipped item to inventory");
assert.match(source,/if\(slot==="head"\)return\{\.\.\.base,sightBonus:/,"generated Enchanted Head wearables must preserve tier armour and emit the sightBonus field consumed by sight/equipment UI");
assert.match(source,/if\(slot==="hands"\)return\{\.\.\.base,scavengerBonus:/,"generated Enchanted Hands wearables must preserve tier armour and emit the scavengerBonus field consumed by ammo/equipment logic");
assert.match(source,/PGR\.effectiveSight=function r80WearableSight/,"Head equipment must affect the canonical sight calculation");
assert.match(source,/player\.scavenger=Math\.max\(0,Number\(player\.scavenger\|\|0\)-old\+next\)/,"Hands equipment must compose with existing Scavenger progression rather than replacing it");
assert.match(source,/player\._v105Base\.moveMultiplier=nextBase/,"Feet equipment must update the V10.5 temporary-effect base when boots change during an active movement effect");
assert.match(source,/player\.moveMultiplier=Math\.max\(\.1,nextBase\*activeScale\)/,"Feet equipment must preserve the currently active temporary movement scale while updating its base");
assert.match(source,/renderInventoryPanel=function r80RenderInventory/,"R80 wearable decoration must compose through the canonical inventory render boundary");
assert.doesNotMatch(source,/visibilityObserver|new MutationObserver/,"R80 must not restore a second inventory visibility observer");
assert.match(source,/wrapped renderInventoryPanel call above is the only wearable[\s\S]*duplicate loadout rebuild/,"R80 must document the single-owner inventory boundary that prevents duplicate open-time redraws");
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
      inventoryCanAdd:player=>(player.inventory||[]).length<6,
      createDeathCache(player){
        const inventory=(player.inventory||[]).map(item=>({...item})),armour=Math.max(0,Number(player.armor||0));
        player.inventory=[];player.armor=0;
        return{inventory,armour,active:inventory.length>0||armour>0}
      }
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

assert.equal(JSON.stringify(api.gearTierFor("UNCOMMON")),JSON.stringify({name:"RARE",armourBonus:1,enchanted:false}),"Rare wearable tier must retain +1 armour-cap semantics");
assert.equal(JSON.stringify(api.gearTierFor("SIZZLER")),JSON.stringify({name:"SUPERIOR",armourBonus:2,enchanted:false}),"Superior wearable tier must retain +2 armour-cap semantics");
assert.equal(JSON.stringify(api.gearTierFor("GOLD MEDAL")),JSON.stringify({name:"ENCHANTED",armourBonus:3,enchanted:true}),"Enchanted wearable tier must retain +3 armour-cap semantics");
const enchantedHead=api.makeWearable({id:"enchanted-head-search",depth:12},{rpgStats:{luck:10}});
assert.ok(["COMMON","RARE","SUPERIOR","ENCHANTED"].includes(enchantedHead.gearTier));
if(enchantedHead.gearTier==="ENCHANTED")assert.ok(/SIGHT|AMMO PICKUPS|FASTER MOVEMENT/.test(api.effectText(enchantedHead)),"Enchanted wearables must add a secondary slot bonus");

const lowLuck={rpgStats:{luck:5}};
const highLuck={rpgStats:{luck:10}};
const lowLuckGear=api.makeWearable({id:"luck-test-0",depth:1},lowLuck);
const highLuckGear=api.makeWearable({id:"luck-test-0",depth:1},highLuck);
assert.ok(context.window.CCGProgression.RARITY.indexOf(highLuckGear.rarity)>context.window.CCGProgression.RARITY.indexOf(lowLuckGear.rarity),"higher Luck must be able to promote the same deterministic wearable roll");
assert.equal(api.qualifiesForDrop({id:"drop-luck-0",depth:1},lowLuck),false,"baseline Luck should not force the selected ordinary chest to drop gear");
assert.equal(api.qualifiesForDrop({id:"drop-luck-0",depth:1},highLuck),true,"higher Luck must be able to turn the same deterministic ordinary chest roll into a wearable drop");

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

const tempPlayer={
  inventory:[{kind:"wearable",slot:"feet",name:"TURBO RUNNER BOOTS",rarity:"SIZZLER",moveFactor:.95}],
  moveMultiplier:.76,
  _v105Base:{moveMultiplier:1,dashDamage:0},
  v142R80FeetFactor:1
};
assert.equal(api.equipWearable(tempPlayer,0),true);
assert.equal(Number(tempPlayer._v105Base.moveMultiplier.toFixed(4)),.95,"equipping boots during a V10.5 movement effect must move the effect owner's baseline to the equipped value");
assert.equal(Number(tempPlayer.moveMultiplier.toFixed(4)),.722,"equipping boots during a V10.5 movement effect must preserve the active temporary movement scale");
assert.equal(api.unequipWearable(tempPlayer,"feet"),true);
assert.equal(Number(tempPlayer._v105Base.moveMultiplier.toFixed(4)),1,"unequipping boots during a V10.5 movement effect must restore the effect owner's pre-gear baseline");
assert.equal(Number(tempPlayer.moveMultiplier.toFixed(4)),.76,"unequipping boots during a V10.5 movement effect must preserve the active temporary movement scale without permanent slowdown");

player.inventory.push({kind:"wearable",slot:"head",name:"TORCHFINDER",rarity:"SIZZLER",sightBonus:1});
assert.equal(api.equipWearable(player,1),true);
assert.equal(context.window.CCGProgression.effectiveSight(player,context.run),6);

assert.equal(api.unequipWearable(player,"hands"),true);
assert.equal(player.wearables.hands,null);
assert.equal(Number(player.scavenger.toFixed(2)),.20,"unequipping gloves must restore the pre-gear Scavenger value");

player.armor=9;
const deathCache=context.window.CCGProgression.createDeathCache(player,{floor:4},12,8);
assert.equal(player.armor,0,"death must strip current armour protection");
assert.equal(player.inventory.length,0,"death must move all carried inventory into the cache");
assert.equal(player.wearables.head,null,"death must remove equipped Head gear");
assert.equal(player.wearables.feet,null,"death must remove equipped Feet gear");
assert.ok(deathCache.inventory.some(item=>item.kind==="wearable"&&item.deathEquippedSlot==="head"),"death cache must contain equipped Head gear");
assert.ok(deathCache.inventory.some(item=>item.kind==="wearable"&&item.deathEquippedSlot==="feet"),"death cache must contain equipped Feet gear");
assert.equal(deathCache.armour,9,"death cache must retain the armour protection snapshot");

console.log("Dungeon R80 genuine wearable equipment contract passed.");
