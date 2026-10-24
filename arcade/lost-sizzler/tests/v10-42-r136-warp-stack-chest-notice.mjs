import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {fileURLToPath} from "node:url";
import path from "node:path";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=filename=>fs.readFileSync(path.join(root,"js",filename),"utf8");
const progression=read("progression.js"),core=read("game-core.js"),play=read("game-play.js");
function between(s,a,b){
  const start=s.indexOf(a),end=s.indexOf(b,start+a.length);
  assert.ok(start>=0&&end>start,"Unable to locate live source section: "+a);
  return s.slice(start,end);
}
const progressEnv={window:{CCG_CONFIG:{player:{inventorySlots:8,startingInventorySlots:3,maxHealth:10,maxMana:100},loot:{rarities:[]},stalker:{},difficulty:{ARCADE:{}}}},localStorage:{getItem(){return null},setItem(){}},Math,Date,console};
vm.createContext(progressEnv);
vm.runInContext(progression,progressEnv,{filename:"progression.js"});
const PGR=progressEnv.window.CCGProgression;
const makePlayer=(inventory=[],magicSacks=0,inventorySlots=3)=>({inventory,magicSacks,inventorySlots});
const warp=()=>({kind:"teleport",name:"Teleport Spell",short:"WARP"});
const sameSlot=makePlayer();
assert.equal(PGR.stackLimit(warp(),sameSlot),3,"Default warp stack must match the three-potion limit");
for(let n=1;n<=3;n++){
  assert.equal(PGR.inventoryCanAdd(sameSlot,warp()),true);
  assert.equal(PGR.inventoryAdd(sameSlot,warp()),true);
  assert.equal(sameSlot.inventory.length,1,"Up to three warps must occupy a single slot");
  assert.equal(PGR.inventoryKindCount(sameSlot,"teleport"),n);
}
assert.equal(PGR.inventoryLabel(sameSlot.inventory[0]),"WARP ×3");
assert.equal(PGR.inventoryAdd(sameSlot,warp()),true);
assert.equal(sameSlot.inventory.length,2,"A fourth warp may start another stack without discarding any spell");
assert.equal(PGR.inventoryKindCount(sameSlot,"teleport"),4);
assert.equal(PGR.inventoryRemove(sameSlot,0,1)?.qty,1,"Casting consumes exactly one spell");
assert.equal(PGR.inventoryKindCount(sameSlot,"teleport"),3);
assert.equal(sameSlot.inventory[0].qty,2,"Remaining spells stay in inventory");
const oldSave=makePlayer([{...warp(),qty:1},{...warp(),qty:1},{...warp(),qty:1}]);
PGR.compactInventory(oldSave);
assert.equal(oldSave.inventory.length,1,"Existing saves must consolidate one-spell warp stacks");
assert.equal(oldSave.inventory[0].qty,3,"Old saved spells must not be lost during consolidation");
const magicPlayer=makePlayer([],3);
assert.equal(PGR.stackLimit(warp(),magicPlayer),6,"Three Magic Sacks raise warp capacity to six");
assert.equal(PGR.inventoryAdd(magicPlayer,{...warp(),qty:6}),true);
assert.equal(magicPlayer.inventory.length,1);
assert.equal(magicPlayer.inventory[0].qty,6);
const full=makePlayer([{...warp(),qty:2},{kind:"potion",qty:3},{kind:"torch",qty:1}],0);
assert.equal(PGR.inventoryCanAdd(full,warp()),true,"Warp can join an existing stack when all inventory slots are filled");
assert.equal(PGR.inventoryAdd(full,warp()),true);
assert.equal(full.inventory.length,3);
assert.equal(full.inventory[0].qty,3);
assert.equal(PGR.inventoryCanAdd(full,warp()),false,"A full stack cannot hide an extra warp in a full inventory");
assert.equal(PGR.stackLimit({kind:"potion"},full),3);
assert.equal(PGR.stackLimit({kind:"torch"},full),1);
assert.equal(PGR.inventoryAdd(makePlayer(),{kind:"banishment",qty:1}),true);
const limited=makePlayer([{kind:"banishment",qty:1}]);
assert.equal(PGR.inventoryCanAdd(limited,{kind:"banishment"}),false,"Special Banishment Flask ownership must be unchanged");

const partialPlayer=makePlayer([{...warp(),qty:2},{kind:"potion",qty:3},{kind:"torch",qty:1}],0,3);
const deathCache={active:true,inventory:[{...warp(),qty:3}],games:[],armour:0,score:0,xp:0};
const deathRun={floorGames:[],stats:{deathCachesRecovered:0}};
const conservedWarps=()=>PGR.inventoryKindCount(partialPlayer,"teleport")+deathCache.inventory.reduce((n,it)=>n+(it.kind==="teleport"?it.qty||1:0),0);
assert.equal(conservedWarps(),5);
assert.equal(PGR.inventoryAdd(partialPlayer,{...warp(),qty:3}),false,
  "A multi-spell add must fail when only part of a stack would fit");
assert.equal(PGR.inventoryKindCount(partialPlayer,"teleport"),2,
  "Failed multi-spell add must roll back edits to the partially filled Warp stack");
const firstAttempt=PGR.recoverDeathCache(partialPlayer,deathRun,deathCache);
assert.equal(firstAttempt.recovered,1,"Full inventory can reclaim just the free space in its Warp stack");
assert.equal(firstAttempt.remaining,2,"Exactly two unavailable spells remain in the death cache");
assert.equal(deathCache.inventory[0].qty,2,"Persistent death cache records the unrecovered quantity");
assert.equal(PGR.inventoryKindCount(partialPlayer,"teleport"),3);
assert.equal(deathCache.active,true);
assert.equal(conservedWarps(),5,"Partial recovery conserves every Warp spell");
assert.equal(deathRun.stats.deathCachesRecovered,0);
// Simulate checkpoint JSON round-trip; no old in-memory item references survive.
const restoredState=JSON.parse(JSON.stringify({player:partialPlayer,cache:deathCache,run:deathRun}));
partialPlayer.inventory=restoredState.player.inventory;
deathCache.inventory=restoredState.cache.inventory;
deathCache.active=restoredState.cache.active;
deathRun.floorGames=restoredState.run.floorGames;
deathRun.stats=restoredState.run.stats;
assert.equal(conservedWarps(),5,"Save and reload preserve total carried plus cached Warps");
const noRoom=PGR.recoverDeathCache(partialPlayer,deathRun,deathCache);
assert.equal(noRoom.recovered,0,"Retry with no capacity does not manufacture a pickup");
assert.equal(noRoom.remaining,2);
assert.equal(conservedWarps(),5,"Blocked post-reload retry neither loses nor duplicates Warps");
PGR.inventoryRemove(partialPlayer,PGR.firstInventory(partialPlayer,"torch"));
const secondAttempt=PGR.recoverDeathCache(partialPlayer,deathRun,deathCache);
assert.equal(secondAttempt.recovered,2,"A freed slot receives the two still-cached Warps");
assert.equal(secondAttempt.remaining,0);
assert.equal(deathCache.active,false);
assert.equal(PGR.inventoryKindCount(partialPlayer,"teleport"),5);
assert.equal(conservedWarps(),5,"After full recovery, carried plus cached Warps remain conserved");
assert.equal(deathRun.stats.deathCachesRecovered,1,"Fully collected death cache must count once");

const toastSource=between(core,"function displayToast(entry){","function rememberTrail(p){");
const chestSource=between(play,"function chestScoreReward(chest){","function diagonalClear(");
const displayed=[];
let clock=2000;
const ui={toast:{classList:{add(){},remove(){}},className:""},toastTitle:{textContent:""},toastText:{textContent:""},toastIcon:null};
const e={UI:ui,toastQueue:[],toastTimer:0,retainedToast:false,Math,
  performance:{now:()=>clock},host:{doors:[],enemies:[],chests:[]},
  PGR:{},S:{sfx(){}},W:{chestAt:(_,x,y)=>e.host.chests.find(c=>c.active&&c.x===x&&c.y===y)||null},
  itemIconSVG(){return""},requestAnimationFrame(fn){fn()},window:{dispatchEvent(){}},CustomEvent:class{},
  console,displayed
};
vm.createContext(e);
vm.runInContext(toastSource+chestSource+";this.owner={showToast,tryChest,openChest,updateToast};",e,{filename:"game-core.js+game-play.js"});
e.window.dispatchEvent=ev=>displayed.push(ev);
const chest={x:4,y:4,active:true,locked:true,roomId:3};e.host.chests=[chest];
const player={x:3,y:4,bronzeKeys:0};
assert.equal(e.owner.tryChest(player,9,9),true,"Far-away tile must never initiate a chest warning");
assert.equal(e.toastQueue.length,0);
assert.equal(e.owner.showToast("IMPORTANT","Hold important information","cyan",8000,{retain:true}),true);
assert.equal(e.retainedToast,true);
assert.equal(e.owner.tryChest(player,4,4),false,"Blocked chest still stops movement");
assert.equal(e.toastQueue.length,0,"Locked chest notice must not be queued behind a retained banner");
e.owner.updateToast(10000);
assert.notEqual(ui.toastTitle.textContent,"LOCKED CHEST","An obsolete warning must not appear after the player has moved away");
clock=3500;
assert.equal(e.owner.tryChest(player,4,4),false);
assert.equal(ui.toastTitle.textContent,"LOCKED CHEST","When in contact with an unoccluded locked chest the warning still appears");
assert.equal(e.owner.tryChest(player,9,9),true);
assert.equal(e.owner.showToast("ANOTHER IMPORTANT","Second priority message","gold",8000,{retain:true}),true);
e.owner.showToast("SIDE QUEST","Must preserve normal queued information","cyan",6000);
assert.equal(e.toastQueue.length,1,"Other retained-toast queue behaviour remains unchanged");
console.log("PASS R136 teleport stack qty, magic sacks, saved inventories, single-use, locked chest stale-toast suppression");
