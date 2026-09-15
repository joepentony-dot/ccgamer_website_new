import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync("arcade/lost-sizzler/js/dungeon-progression-foundation.js","utf8");
const PGR={
  RARITY:["COMMON","UNCOMMON","SIZZLER","GOLD MEDAL","ZZAP! 97%"],
  makeRun:()=>({floor:1,score:0}),
  loadCheckpoint:()=>({version:"V10.3",run:{floor:2,score:500},player:{firearmUnlocked:true,weapon:{id:"pulse",name:"Pulse",rarity:"COMMON",rating:1,mods:[]}},player2:{firearmUnlocked:false,weapon:null}}),
  makeCheckpoint:(run,player,player2,score)=>({version:"V10.3",run,player,player2,score})
};
const window={CCGProgression:PGR};
const context={
  window,console,Math,JSON,Date,
  document:{body:{dataset:{releaseReady:"false"}}},
  addEventListener:()=>{},
  queueMicrotask:fn=>fn(),
  setInterval:()=>1,
  clearInterval:()=>{},
  setTimeout:()=>1
};
window.window=window;
vm.createContext(context);
vm.runInContext(source,context,{filename:"dungeon-progression-foundation.js"});
const F=window.CCGDungeonProgressionFoundation;
assert.ok(F,"foundation API is exported");
assert.equal(F.ready,false,"runtime waits for the release gate");

const run=PGR.makeRun();
assert.equal(run.gold,0,"new runs migrate to explicit zero Gold");
assert.equal(F.earnGold(run,5),5);assert.equal(run.gold,5);
assert.equal(F.canAffordGold(run,4),true);
assert.equal(F.spendGold(run,4),true);assert.equal(run.gold,1);
assert.equal(F.spendGold(run,2),false);assert.equal(run.gold,1,"failed spend is non-destructive");
assert.equal(F.shopGoldPrice({}),2);
assert.equal(F.shopGoldPrice({goldPurchases:1}),3);
assert.equal(F.shopGoldPrice({scorePurchases:2}),4,"legacy shop purchase count migrates to the linear Gold ladder");
assert.equal(F.creditGoldValue({kind:"credits"}),1);
assert.equal(F.creditGoldValue({kind:"credits",goldValue:3}),3);

const legacy=PGR.loadCheckpoint();
assert.equal(legacy.run.gold,0,"legacy saves gain Gold without changing the checkpoint version");
assert.equal(legacy.player.ownedWeapons.length,1,"legacy P1 firearm migrates into ownership");
assert.equal(legacy.player.activeWeaponIndex,0);
assert.deepEqual(legacy.player2.ownedWeapons,[],"locked P2 does not gain a firearm during migration");

const w1={id:"pulse",displayName:"COMMON Pulse",rarity:"COMMON",rating:1,power:1,delay:1,shots:1,element:"energy",mods:[]};
const w2={id:"fire",displayName:"SIZZLER Fire",rarity:"SIZZLER",rating:5,power:3,delay:1.2,shots:1,element:"fire",mods:["Turbo"]};
const player={firearmUnlocked:false,weapon:null,ownedWeapons:[],activeWeaponIndex:-1};
F.rememberWeapon(player,w1,{equip:true});F.rememberWeapon(player,w2,{equip:true});
assert.equal(player.ownedWeapons.length,2,"weapon acquisition is non-destructive");
assert.equal(player.weapon.id,"fire");
F.equipOwnedWeapon(player,0);
assert.equal(player.weapon.id,"pulse","owned firearms can be switched back to");
assert.equal(player.ownedWeapons.length,2);

const bat={treasureBat:true};const batRun={gold:0};
assert.equal(F.awardTreasureBatGold(bat,batRun),5);
assert.equal(F.awardTreasureBatGold(bat,batRun),0);
assert.equal(batRun.gold,5,"Treasure Bat Gold is single-award");

assert.match(source,/id:\"bronze\",name:\"BRONZE KEY\"/,"Bronze Key is purchasable");
assert.match(source,/spendGold\(runState,price\)/,"standard shop stock spends Gold");
assert.doesNotMatch(source,/score\s*-=/,"foundation never spends Score");
assert.match(source,/ownedWeapons/);
assert.match(source,/activeWeaponIndex/);
assert.match(source,/event===\"v131_player_state\"/,"co-op player state restores permanent ownership");
assert.match(source,/special!==\"horde-survivor\"&&special!==\"sizzler-saboteurs\"/,"special-mode ownership stays isolated");

for(const file of [
  "arcade/lost-sizzler/js/v10-33-special-modes.js",
  "arcade/lost-sizzler/js/v10-39-horde-live-loadout.js",
  "arcade/lost-sizzler/js/v10-41-r35-spy-rules-hardening.js",
  "arcade/lost-sizzler/js/v10-41-r58-spy-overhaul.js"
]){
  const existing=fs.readFileSync(file,"utf8");
  assert.ok(existing.length>0,`${file} remains present and independently owned`);
}

console.log("Dungeon progression foundation contract: PASS");
