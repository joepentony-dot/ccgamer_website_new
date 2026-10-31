import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {fileURLToPath} from "node:url";
import path from "node:path";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=filename=>fs.readFileSync(path.join(root,"js",filename),"utf8");
const progression=read("progression.js"),core=read("game-core.js"),play=read("game-play.js"),render=read("game-render.js");
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
// R144: a locked chest underneath a later-painted actor or full-tile object
// cannot be visible, so movement must not emit a phantom Bronze Key warning.
const warningAt=chest._lockedFeedbackAt;
const occlusions=[
  ["ordinary enemy",()=>{e.host.enemies=[{x:4,y:4,alive:true}]},()=>{e.host.enemies=[]}],
  ["Count Loadula",()=>{e.host.stalker={x:4,y:4,awake:true}},()=>{e.host.stalker=null}],
  ["Guardian",()=>{e.host.guardian={x:4,y:4,alive:true}},()=>{e.host.guardian=null}],
  ["blocking furniture",()=>{e.host.blockingDecor=[{x:4,y:4,hp:2}]},()=>{e.host.blockingDecor=[]}],
  ["death cache",()=>{e.host.deathCaches=[{x:4,y:4,active:true}]},()=>{e.host.deathCaches=[]}],
  ["merchant",()=>{e.host.shops=[{x:4,y:4,active:true}]},()=>{e.host.shops=[]}],
  ["rescue NPC",()=>{e.host.rescue={x:4,y:4,active:true}},()=>{e.host.rescue=null}]
];
for(const [name,occupy,clear] of occlusions){
  occupy();clock+=1500;
  assert.equal(e.owner.tryChest(player,4,4),true,name+" takes foreground interaction ownership");
  assert.equal(chest._lockedFeedbackAt,warningAt,name+" cannot trigger a hidden chest-key warning");
  assert.equal(chest.active,true,name+" must not delete or open the concealed chest");
  clear();
}
e.tileInRenderView=()=>false;
assert.equal(e.owner.tryChest(player,4,4),true,"Camera-clipped chest is not interactable");
assert.equal(chest._lockedFeedbackAt,warningAt,"Offscreen collision cannot issue an invisible key warning");
e.tileInRenderView=()=>true;
player.x=0;player.y=0;
assert.equal(e.owner.tryChest(player,4,4),true,"Remote target cannot be opened through stale movement");
player.x=3;player.y=4;
e.P={gold:"#fc0",pink:"#f0f",cyan:"#0ff"};
e.PGR.lootForChest=()=>({kind:"potion",rarity:"COMMON",name:"Test Potion"});
e.run={stats:{chests:0}};e.score=0;e.shake=0;e.floatText=()=>{};e.setTimeout=()=>{};
player.bronzeKeys=1;
assert.equal(e.owner.tryChest(player,4,4),true,"Visible adjacent locked chest opens with a Bronze Key");
assert.equal(player.bronzeKeys,0,"Exactly one Bronze Key is consumed");
assert.equal(chest.active,false,"Chest opens only once");
assert.equal(e.run.stats.chests,1,"Chest reward is recorded once");
assert.equal(e.score,100,"Normal chest score is retained");
assert.equal(e.owner.tryChest(player,4,4),true);
assert.equal(e.run.stats.chests,1,"An already-opened chest cannot award a second reward");

// Execute the actual canvas chest loop: diagonal movement is allowed, so a
// diagonal next-step chest must be drawn even if fog visibility lags one tick.
const drawSource=between(render,"function drawChests(){","function label(");
let drawn=0;
const canvasEnv={
  Math,performance:{now:()=>6000},host:{chests:[{x:5,y:5,active:true,locked:true}]},
  focus:{x:4,y:4},C:{tile:40},P:{gold:"#fc0"},PGR:{colourForRarity:()=>"#fff"},
  lostSizzlerPixelAssets:{chestFrames:[],chestReplacement:null,chests:null},
  chestRenderDiagnostics:{richFallbackFrames:0,lastMode:"",lastAt:0},
  ws:()=>({x:0,y:0}),md:(a,b)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y),
  visibleTo:()=>false,tileInRenderView:()=>true,
  drawAnimatedChestFallback(){drawn++},label(){}
};
vm.createContext(canvasEnv);
vm.runInContext(drawSource+";this.drawChests=drawChests;",canvasEnv,{filename:"game-render.js"});
canvasEnv.drawChests();
assert.equal(drawn,1,"Diagonal next-step chest must be drawn before its collision/key prompt");
canvasEnv.focus={x:2,y:2};canvasEnv.drawChests();
assert.equal(drawn,1,"Unexplored distant chest remains concealed");
canvasEnv.focus={x:4,y:4};canvasEnv.tileInRenderView=()=>false;canvasEnv.drawChests();
assert.equal(drawn,1,"Camera-clipped chest is not drawn");
canvasEnv.tileInRenderView=()=>true;canvasEnv.visibleTo=()=>true;canvasEnv.drawChests();
assert.equal(drawn,2,"Ordinary visible chest remains rendered");
console.log("PASS R136 teleport stack qty, magic sacks, saved inventories, single-use, locked chest stale-toast suppression, R144 foreground/diagonal visual ownership and key conservation");
