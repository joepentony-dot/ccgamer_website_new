import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const shopSource=fs.readFileSync("arcade/lost-sizzler/js/v10-42-artefact-shop-stability.js","utf8");
const progressionSource=fs.readFileSync("arcade/lost-sizzler/js/progression.js","utf8");

function game({essence=0,artefacts=0,shop=true,gold=175,score=2640,inventorySlots=8,inventoryItems=[],sealDiscount=false}={}){
  const player={
    id:"player-one",health:8,maxHealth:10,
    banishmentEssence:essence,inventorySlots,
    inventory:[...(artefacts?[{kind:"artefact",name:"Legacy Banishment Artefact",qty:artefacts}]:[]),...inventoryItems.map(item=>({...item}))]
  };
  const trace={toasts:[],sounds:[],otherPurchases:0,renderCalls:0};
  const runtime={
    console,Math,Date,
    window:{
      CCGDungeonProgressionFoundation:{ready:true},
      CCG_CONFIG:{stalker:{flaskArtefacts:3},loot:{rarities:[]},player:{inventorySlots:8,startingInventorySlots:3}},
      CCGLostSizzlerV142ProceduralOverhaul:{essenceCost:()=>sealDiscount?2:3},
    },
    p1:player,
    score,run:{gold,score},host:{revision:0},
    activeShop:shop?{v142Alchemist:true,title:"BANISHMENT ALCHEMIST"}:{title:"ORDINARY SHOP"},
    UI:{shopItems:null},
    S:{sfx:(...args)=>trace.sounds.push(args)},
    showToast:(...args)=>trace.toasts.push(args),
    broadcastWorld:()=>{},
    sync:()=>{},
    renderShop:()=>{trace.renderCalls++},
    buyShopItem:()=>{trace.otherPurchases++;return true},
    setTimeout:()=>0,clearTimeout:()=>{},
    setInterval:()=>0,clearInterval:()=>{},
    addEventListener:()=>{},
    queueMicrotask:()=>{}
  };
  vm.createContext(runtime);
  vm.runInContext(progressionSource,runtime,{filename:"progression.js"});
  assert.equal(typeof runtime.window.CCGProgression?.inventoryAdd,"function","Must execute actual inventory implementation");
  vm.runInContext(shopSource,runtime,{filename:"v10-42-artefact-shop-stability.js"});
  const api=runtime.window.CCGLostSizzlerV142ArtefactShopStability;
  assert.ok(api?.isInstalled(),"Real final Alchemist buyShopItem owner must install");
  const flasks=()=>player.inventory.filter(item=>item?.kind==="banishment");
  return {runtime,player,trace,flasks,api};
}

test("three Vessel Essence buy one Flask without any previous Gold Flask; Gold and Score unchanged",()=>{
  const g=game({essence:3,gold:123,score:4567});
  const oldGold=g.runtime.run.gold,oldScore=g.runtime.score;
  assert.equal(g.flasks().length,0,"No pre-purchased Flask may be required");
  assert.equal(g.runtime.buyShopItem("banishment"),true);
  assert.equal(g.flasks().length,1,"Exactly one Flask must be created");
  assert.equal(g.flasks()[0].qty??1,1);
  assert.equal(g.player.banishmentEssence,0);
  assert.equal(g.runtime.run.gold,oldGold);
  assert.equal(g.runtime.score,oldScore);
  assert.equal(g.api.diagnostics.trades,1);
  assert.equal(g.trace.otherPurchases,0,"Exchange must not purchase a score-funded Flask");
});

test("two Essence do not create a Flask or alter Gold, Score or inventory",()=>{
  const g=game({essence:2,gold:239,score:999});
  const before=JSON.stringify(g.player.inventory);
  assert.equal(g.runtime.buyShopItem("banishment"),false);
  assert.equal(g.flasks().length,0);
  assert.equal(g.player.banishmentEssence,2);
  assert.equal(JSON.stringify(g.player.inventory),before);
  assert.equal(g.runtime.run.gold,239);
  assert.equal(g.runtime.score,999);
  assert.equal(g.api.diagnostics.insufficient,1);
});

test("Alchemist's Seal two-Essence discount is honoured by actual transaction",()=>{
  const g=game({essence:2,sealDiscount:true});
  assert.equal(g.runtime.buyShopItem("banishment"),true);
  assert.equal(g.flasks().length,1);
  assert.equal(g.player.banishmentEssence,0);
});

test("legacy three-Artefact stack exchanges for exactly one Flask",()=>{
  const g=game({artefacts:3});
  assert.equal(g.runtime.buyShopItem("banishment"),true);
  assert.equal(g.flasks().length,1);
  assert.equal(g.player.inventory.filter(x=>x.kind==="artefact").length,0);
  assert.equal(g.player.banishmentEssence,0);
});

test("mixed legacy Artefact and Vessel Essence are charged exactly once",()=>{
  const g=game({artefacts:1,essence:2,gold:7,score:280});
  assert.equal(g.runtime.buyShopItem("banishment"),true);
  assert.equal(g.flasks().length,1);
  assert.equal(g.player.inventory.filter(x=>x.kind==="artefact").length,0);
  assert.equal(g.player.banishmentEssence,0);
  assert.equal(g.runtime.run.gold,7);assert.equal(g.runtime.score,280);
});

test("full three-slot inventory funded by Vessel Essence rolls back real insertion",()=>{
  const items=[{kind:"potion",name:"Healing Potion",qty:3},{kind:"torch",name:"Torch",qty:1},{kind:"teleport",name:"Teleport",qty:1}];
  const g=game({essence:3,inventorySlots:3,inventoryItems:items,gold:33,score:544});
  assert.equal(g.runtime.window.CCGProgression.inventoryCapacity(g.player),3);
  const before=JSON.stringify(g.player.inventory);
  assert.equal(g.runtime.buyShopItem("banishment"),false);
  assert.equal(JSON.stringify(g.player.inventory),before);
  assert.equal(g.player.banishmentEssence,3);
  assert.equal(g.flasks().length,0);
  assert.equal(g.runtime.run.gold,33);
  assert.equal(g.runtime.score,544);
  assert.equal(g.api.diagnostics.rollbacks,1);
});

test("existing Banishment Flask rejects second insertion and restores Essence",()=>{
  const g=game({essence:3,inventoryItems:[{kind:"banishment",name:"Ward-Break Charge",qty:1}]});
  const before=JSON.stringify(g.player.inventory);
  assert.equal(g.runtime.buyShopItem("banishment"),false);
  assert.equal(JSON.stringify(g.player.inventory),before);
  assert.equal(g.player.banishmentEssence,3);
  assert.equal(g.flasks().length,1);
  assert.equal(g.api.diagnostics.rollbacks,1);
});

test("non-Alchemist and deprecated Score-funded Flask both fail closed",()=>{
  const ordinary=game({essence:3,shop:false});
  assert.equal(ordinary.runtime.buyShopItem("banishment"),false);
  assert.equal(ordinary.player.banishmentEssence,3);
  const alchemist=game({essence:3});
  assert.equal(alchemist.runtime.buyShopItem("banishmentScore"),false);
  assert.equal(alchemist.player.banishmentEssence,3);
  assert.equal(alchemist.flasks().length,0);
});


// The real Sigil-escape reward owner must not announce a free Flask that was
// lost to a full bag. Reuse the actual progression inventory, not a mock.
const proceduralSource=fs.readFileSync("arcade/lost-sizzler/js/v10-42-procedural-overhaul.js","utf8");
const escapeStart=proceduralSource.indexOf("function deliverPendingEscapeFlask(");
const escapeEnd=proceduralSource.indexOf("if(typeof movementTriggers",escapeStart);
assert.ok(escapeStart>=0&&escapeEnd>escapeStart,"Live escape reward and pending-delivery owner must be present");
assert.match(proceduralSource,/if\(r\.v142EscapeFlaskPending\)deliverPendingEscapeFlask\(player,r\)/,"Regular playing-loop owner must retry pending reward");
function escapeGame(options={}){
  const g=game({...options,essence:0,gold:47,score:812});
  const runtime=g.runtime;
  runtime.PROG=runtime.window.CCGProgression;
  runtime.PD={escapeAlert:78};
  runtime.currentRun=()=>runtime.run;
  runtime.currentHost=()=>runtime.host;
  runtime.announce=(...args)=>g.trace.toasts.push(args);
  runtime.broadcast=()=>{};
  runtime.syncNow=()=>{};
  vm.runInContext(proceduralSource.slice(escapeStart,escapeEnd)+
    ";this.beginEscape=beginEscape;this.deliverPendingEscapeFlask=deliverPendingEscapeFlask;",runtime,
    {filename:"v10-42-procedural-overhaul.js::escape",timeout:1200});
  return g;
}

test("Sigil Flask entitlement waits through full unlocked inventory, survives run save and delivers once",()=>{
  const g=escapeGame({inventorySlots:3,inventoryItems:[
    {kind:"potion",qty:3},{kind:"torch",qty:1},{kind:"teleport",qty:1}
  ]});
  const originalInventory=JSON.stringify(g.player.inventory);
  g.runtime.beginEscape(g.player);
  assert.equal(g.flasks().length,0,"No actual Flask was inserted into the full inventory");
  assert.equal(JSON.stringify(g.player.inventory),originalInventory,"Escape cannot remove carried items");
  assert.equal(g.runtime.run.v142EscapeFlaskPending,true,"Free reward must remain pending");
  assert.equal(g.runtime.run.v142EscapeFlaskGranted,false);
  assert.match(g.trace.toasts.at(-1)?.[1]||"",/reserved/i,"UI must not claim it has already been granted");
  // JSON simulates actual run/player state serialization rather than a second
  // free entitlement created by re-entering the Sigil.
  g.runtime.run=JSON.parse(JSON.stringify(g.runtime.run));
  g.runtime.p1=JSON.parse(JSON.stringify(g.runtime.p1));
  g.runtime.window.CCGProgression.inventoryRemove(g.runtime.p1,2,1);
  assert.equal(g.runtime.deliverPendingEscapeFlask(g.runtime.p1),true,"Free slot allows exact-once recovery after restore");
  assert.equal(g.runtime.p1.inventory.filter(item=>item.kind==="banishment").length,1);
  assert.equal(g.runtime.run.v142EscapeFlaskPending,false);
  assert.equal(g.runtime.run.v142EscapeFlaskGranted,true);
  assert.equal(g.runtime.deliverPendingEscapeFlask(g.runtime.p1),false,"Repeat maintenance must never grant a second charge");
  assert.equal(g.runtime.run.gold,47);
  assert.equal(g.runtime.score,812);
});

test("Sigil reward is immediate with space and remains exactly once on replay",()=>{
  const g=escapeGame({inventorySlots:3,inventoryItems:[]});
  g.runtime.beginEscape(g.player);
  assert.equal(g.flasks().length,1);
  assert.equal(g.runtime.run.v142EscapeFlaskPending,false);
  assert.equal(g.runtime.run.v142EscapeFlaskGranted,true);
  assert.match(g.trace.toasts.at(-1)?.[1]||"",/has been added/i);
  g.runtime.beginEscape(g.player);
  assert.equal(g.flasks().length,1);
  assert.equal(g.runtime.deliverPendingEscapeFlask(g.player),false);
  assert.equal(g.runtime.run.gold,47);assert.equal(g.runtime.score,812);
});

test("Sigil reward waits while already carrying one charge, then grants exactly once after consumption",()=>{
  const g=escapeGame({inventorySlots:3,inventoryItems:[
    {kind:"banishment",qty:1},{kind:"torch",qty:1},{kind:"potion",qty:1}
  ]});
  g.runtime.beginEscape(g.player);
  assert.equal(g.flasks().length,1);
  assert.equal(g.runtime.run.v142EscapeFlaskPending,true);
  assert.equal(g.runtime.deliverPendingEscapeFlask(g.player),false);
  const slot=g.runtime.window.CCGProgression.firstInventory(g.player,"banishment");
  g.runtime.window.CCGProgression.inventoryRemove(g.player,slot,1);
  assert.equal(g.runtime.deliverPendingEscapeFlask(g.player),true);
  assert.equal(g.flasks().length,1);
  assert.equal(g.runtime.deliverPendingEscapeFlask(g.player),false);
  assert.equal(g.runtime.run.v142EscapeFlaskGranted,true);
});

test("Sigil reward remains pending if insertion fails despite apparent capacity",()=>{
  const g=escapeGame({inventorySlots:3,inventoryItems:[]});
  g.runtime.PROG={...g.runtime.window.CCGProgression,inventoryAdd:()=>false};
  g.runtime.beginEscape(g.player);
  assert.equal(g.flasks().length,0);
  assert.equal(g.runtime.run.v142EscapeFlaskPending,true);
  assert.match(g.trace.toasts.at(-1)?.[1]||"",/reserved/i);
  g.runtime.PROG=g.runtime.window.CCGProgression;
  assert.equal(g.runtime.deliverPendingEscapeFlask(g.player),true);
  assert.equal(g.flasks().length,1);
  assert.equal(g.runtime.run.v142EscapeFlaskPending,false);
  assert.equal(g.runtime.run.gold,47);assert.equal(g.runtime.score,812);
});
