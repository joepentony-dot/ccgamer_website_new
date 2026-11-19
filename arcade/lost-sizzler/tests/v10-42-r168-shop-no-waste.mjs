import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../js/dungeon-progression-foundation.js",import.meta.url),"utf8");
const beginning=source.indexOf("  function buyGoldShopItem(id){");
const end=source.indexOf("\n  function installShop(){",beginning);
assert.ok(beginning>=0&&end>beginning,"actual foundation Gold-shop purchase source is present");
const run={gold:100,floor:4},shop={id:"real-shop",sold:{},goldPurchases:0};
const player={mana:100,maxMana:100,armor:15,wearables:{body:{armourBonus:3}}};
const notices=[];
const PGR={
  armourCap(p){
    const gear=Object.values(p.wearables||{});
    return 12+Math.min(9,gear.reduce((n,it)=>n+Math.max(0,Math.floor(Number(it.armourBonus)||0)),0));
  }
};
const ctx={
  Math,Number,Set,PGR,player,
  activeShop:shop,host:{revision:0},state:{shopPurchases:0},
  C:{player:{ammoFlashMs:160,inventorySlots:12}},
  currentP1:()=>player,currentRun:()=>run,ensureRunGold:()=>{},
  shopGoldPrice:s=>2+Math.max(0,Number(s.goldPurchases||0)),
  spendGold:(r,n)=>{if(r.gold<n)return false;r.gold-=n;return true},
  canAffordGold:(r,n)=>r.gold>=n,
  nonNegativeInt:n=>Math.max(0,Math.trunc(Number(n)||0)),
  showToast:(name,detail)=>notices.push({name,detail}),
  S:{sfx:()=>{}},broadcastWorld:()=>{},renderGoldShop:()=>true,
  sync:()=>{},syncGoldHud:()=>{}
};
vm.createContext(ctx);
vm.runInContext(source.slice(beginning,end),ctx,{filename:"current-real-shop-owner.js"});
const buy=id=>ctx.buyGoldShopItem(id);

assert.equal(buy("ammo"),false,"full ammo cannot consume Gold");
assert.equal(buy("armour"),false,"armour at wearable 15-cap cannot consume Gold");
assert.equal(run.gold,100,"refused purchases retain every Gold coin");
assert.equal(shop.goldPurchases,0,"refused purchases do not inflate future shop prices");
assert.equal(player.armor,15,"full repair must not reduce armour to 12");

player.armor=13;
assert.equal(buy("armour"),true,"wearable 15-cap accepts repair");
assert.equal(player.armor,15,"wearable cap is honoured");
assert.equal(run.gold,98,"first real repair costs two Gold");
assert.equal(shop.goldPurchases,1,"one successful purchase increments ladder once");
assert.equal(buy("armour"),false,"repeated full repair is refused");
assert.equal(run.gold,98,"repeat repair does not charge again");

player.wearables={};player.armor=11;
assert.equal(buy("armour"),true,"ordinary armour can repair one missing point");
assert.equal(player.armor,12,"repair stops at ordinary cap 12");
assert.equal(run.gold,95,"second real repair costs three Gold");
assert.equal(buy("armour"),false,"ordinary armour at cap is refused");

player.mana=90;
assert.equal(buy("ammo"),true,"partial ammo crate purchase succeeds");
assert.equal(player.mana,100,"partial ammo purchase is capped at maximum");
assert.equal(run.gold,91,"third successful purchase costs four Gold");
assert.equal(buy("ammo"),false,"repeat full ammo purchase is refused");
assert.equal(run.gold,91,"no Gold on zero-gain ammo purchase");
assert.equal(shop.goldPurchases,3,"no-op purchases do not advance shop inflation");

player.armor=16;
assert.equal(buy("armour"),false,"over-cap imported armour cannot be decreased");
assert.equal(player.armor,16,"refused repair never destroys protection");
assert.equal(run.gold,91,"over-cap armour remains non-billable");
assert.ok(notices.some(x=>x.name==="AMMUNITION ALREADY FULL"));
assert.ok(notices.some(x=>x.name==="ARMOUR ALREADY FULL"));

const ui=fs.readFileSync(new URL("../js/v10-42-r71-equipment-inventory.js",import.meta.url),"utf8");
assert.match(ui,/armourLimit=Math\.max\(12,Number\(PGR\.armourCap\?\.\(player\)\|\|12\)\)/,"equipment uses authoritative wearable cap");
assert.match(ui,/ARMOUR \x24\{armour\}\/\x24\{armourLimit\}/,"equipment shows actual armour capacity");
assert.doesNotMatch(ui,/ARMOUR \x24\{armour\}\/12/,"legacy hardcoded armour 12 display retired");
console.log("PASS R168 shop: no-charge full ammo/armour, gear-aware repair, non-destructive over-cap, shop-price count and equipment display");
