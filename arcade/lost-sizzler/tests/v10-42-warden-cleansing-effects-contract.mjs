import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../js/v10-42-warden-cleansing-effects.js",import.meta.url),"utf8");
let tick=null,revealCount=0,baseFloorCompletions=0;
const makeRooms=()=>[
  {id:0,x:0,y:0,w:5,h:5,depth:0},
  {id:1,x:10,y:10,w:8,h:8,depth:6,dangerous:true,dedicatedHazard:false},
  {id:2,x:25,y:10,w:8,h:8,depth:10,dangerous:true}
];
const makeWorld=()=>({rooms:makeRooms(),map:Array.from({length:50},()=>Array(50).fill(0)),wallLights:[],startRoomId:0,exitRoomId:2});
const roomAt=(world,x,y)=>{const room=world.rooms.find(q=>x>=q.x&&x<=q.x+q.w&&y>=q.y&&y<=q.y+q.h);return room?room.id:-1};
const makePlayer=()=>({id:"p1",x:13,y:13,health:8,maxHealth:10,armor:1,mana:10,maxMana:100});
const makeHost=(floor,{enemySet=[],hazards=[]}={})=>({
  enemies:enemySet,
  traps:[{id:`trap-${floor}-inside`,x:12,y:12,roomId:1,kind:"fire",active:true},{id:`trap-${floor}-outside`,x:27,y:12,roomId:2,kind:"shock",active:true}],
  hazardRooms:hazards,
  v142WardenDomain:{floor,roomId:1,cleansed:true},
  v142WardenCheckpoint:{floor,roomId:1,x:14,y:14,active:true},
  revision:0
});
const makeRun=floor=>({floor,alert:60,v142WardenFloors:{[String(floor)]:{resolved:true}},stats:{}});

const context={
  console,
  window:{CCGWorld:{roomAt}},
  document:{querySelector:()=>null,querySelectorAll:()=>[]},
  performance:{now:()=>10000},
  setInterval:fn=>(tick=fn,1),clearInterval:()=>{},addEventListener:()=>{},
  showToast:()=>{},broadcastWorld:()=>{},sync:()=>{},
  S:{sfx:()=>{}},UI:{surroundings:{textContent:""},floorSummary:{innerHTML:"BASE FLOOR SUMMARY"}},
  reveal:()=>{revealCount++},floorComplete:()=>{baseFloorCompletions++;return true},mode:"playing"
};
context.world=makeWorld();context.p1=makePlayer();context.run=makeRun(2);context.host=makeHost(2);context.localPlayers=()=>[context.p1];
vm.createContext(context);
vm.runInContext(source,context,{filename:"v10-42-warden-cleansing-effects.js"});

// Floor 2: visible refuge, local trap shutdown and a one-time ammunition recovery.
assert.equal(context.host.v142CleansedRefuge?.roomId,1,"Cleansing should establish a refuge in the Warden room");
assert.equal(context.world.wallLights.filter(light=>light.kind==="warden-cleansed").length,2,"Floor 2 refuge should restore two permanent lights");
assert.equal(context.host.traps[0].active,false,"A regular trap inside the cleansed chamber should be disabled");
assert.equal(context.host.traps[0].v142WardenCleansed,true,"Disabled chamber trap should retain an audit marker");
assert.equal(context.host.traps[1].active,true,"A trap outside the Warden chamber must remain active");
assert.equal(context.p1.mana,35,"Iron Surge cleansing should restore 25% maximum ammunition");
assert.equal(context.world.rooms[1].wardenRefuge,true,"The Warden room should become a refuge landmark");
assert.equal(context.world.rooms[1].dangerous,false,"The cleansed room should no longer be marked dangerous");
assert.equal(context.run.v142WardenFloors["2"].refugeEstablished,true,"Refuge state should be recorded in persistent run data");
assert.equal(context.run.v142WardenFloors["2"].refugeInitialBenefitClaimed,true,"Initial cleansing recovery should be persisted separately from environmental refuge state");
const floor2LightCount=context.world.wallLights.length,floor2Mana=context.p1.mana;
tick();
assert.equal(context.world.wallLights.length,floor2LightCount,"Repeated scans must not duplicate restored lights");
assert.equal(context.p1.mana,floor2Mana,"Repeated scans must not grant repeated initial ammunition");

// Leaving and later returning gives one useful recovery without consuming it at establishment.
assert.equal(context.run.v142WardenFloors["2"].refugeRestUsed,undefined,"The return-rest must not be consumed when the refuge is first created");
context.p1.health=6;context.p1.mana=20;context.p1.x=27;context.p1.y=12;tick();
assert.equal(context.host.v142RefugeSeenLeaving,true,"Leaving the refuge should arm the one-use return-rest");
context.p1.x=13;context.p1.y=13;tick();
assert.equal(context.p1.health,8,"Returning to the refuge should restore two health");
assert.equal(context.p1.mana,35,"Returning to the refuge should restore 15% maximum ammunition");
assert.equal(context.run.v142WardenFloors["2"].refugeRestUsed,true,"The return-rest should persist as spent after a useful recovery");
const spentHealth=5,spentMana=10;context.p1.health=spentHealth;context.p1.mana=spentMana;context.p1.x=27;context.p1.y=12;tick();context.p1.x=13;context.p1.y=13;tick();
assert.equal(context.p1.health,spentHealth,"A spent refuge must not heal again on a later return");
assert.equal(context.p1.mana,spentMana,"A spent refuge must not refill ammunition again on a later return");

// Floor-clear feedback exposes the Warden result, both fragments, cache and refuge state.
context.run.v142WardenFloors["2"].fragmentAwarded=true;context.run.v142WardenFloors["2"].cacheFragmentAwarded=true;context.UI.floorSummary.innerHTML="BASE FLOOR SUMMARY";
context.floorComplete("contract");
assert.equal(baseFloorCompletions,1,"The Warden summary wrapper must preserve the existing floor-complete handler");
assert.match(context.UI.floorSummary.innerHTML,/WARDEN LEGACY/,"Floor clear should include a Warden legacy section");
assert.match(context.UI.floorSummary.innerHTML,/WARDEN CLEANSED/,"Floor clear should state that the Warden was cleansed");
assert.match(context.UI.floorSummary.innerHTML,/SEAL FRAGMENTS 2\/2/,"Floor clear should show both floor Seal Fragments when claimed");
assert.match(context.UI.floorSummary.innerHTML,/WARDEN CACHE CLAIMED/,"Floor clear should report a claimed Warden Cache fragment");
assert.match(context.UI.floorSummary.innerHTML,/RETURN-REST SPENT/,"Floor clear should report the refuge rest state");

// A same-floor host/world rebuild recreates environmental refuge state but cannot replay the initial reward.
context.world=makeWorld();context.host=makeHost(2);context.p1.x=13;context.p1.y=13;context.p1.health=5;context.p1.mana=10;tick();
assert.equal(context.host.v142CleansedRefuge?.active,true,"Resolved run state should recreate the refuge after a host/world rebuild");
assert.equal(context.world.wallLights.filter(light=>light.kind==="warden-cleansed").length,2,"A rebuilt resolved floor should restore its environmental lights");
assert.equal(context.host.traps[0].active,false,"A rebuilt resolved floor should reapply environmental trap suppression");
assert.equal(context.p1.mana,10,"Persistent initial-benefit state must prevent duplicate Floor 2 ammunition after a rebuild");

// Floor 3: the supernatural pursuit is removed from ordinary enemies only.
context.world=makeWorld();context.p1=makePlayer();context.run=makeRun(3);context.run.alert=70;
const ordinary={id:"ordinary",x:13,y:13,alive:true,kind:"guard",aiState:"chase",lastSeen:{x:1,y:1},memoryMs:9999,searchMs:500,targetId:"p1",moveCooldown:100,attackCooldown:200};
const major={id:"major",x:14,y:13,alive:true,keyGuardian:true,aiState:"chase",lastSeen:{x:1,y:1},memoryMs:9999,searchMs:500,targetId:"p1",moveCooldown:100,attackCooldown:200};
context.host=makeHost(3,{enemySet:[ordinary,major]});tick();
assert.equal(ordinary.aiState,"idle","Grave Call cleansing should release ordinary enemies from forced pursuit");
assert.equal(ordinary.lastSeen,null,"Grave Call should erase ordinary-enemy pursuit memory");
assert.equal(ordinary.targetId,null,"Grave Call should clear the ordinary-enemy target");
assert.equal(major.aiState,"chase","Major guardians must not be pacified by Grave Call cleansing");
assert.equal(context.run.alert,58,"Generic cleansing should reduce ambient alert by 12");

// An unresolved floor reports the debt consequence instead of pretending it was cleansed.
context.run.v142WardenFloors["3"].resolved=false;context.run.v142SkippedWardenFloors=[3];context.UI.floorSummary.innerHTML="BASE FLOOR SUMMARY";context.floorComplete("skip-contract");
assert.equal(baseFloorCompletions,2,"Unresolved Warden feedback must still preserve the base floor-complete handler");
assert.match(context.UI.floorSummary.innerHTML,/WARDEN UNRESOLVED/,"Floor clear should state when the Warden was left alive");
assert.match(context.UI.floorSummary.innerHTML,/WARDEN DEBT \+1/,"Floor clear should expose the future guardian penalty from a skipped Warden");

// Floor 4: dedicated hazard cells are extinguished and armour is restored once.
context.world=makeWorld();context.world.rooms[1].dedicatedHazard=true;context.world.rooms[1].hazardType="embers";context.p1=makePlayer();context.p1.armor=1;context.run=makeRun(4);
const hazard={id:"embers",roomId:1,type:"embers",cells:[{x:12,y:12,group:0},{x:13,y:12,group:1}],groups:2,title:"EMBER-TILE VAULT"};
context.host=makeHost(4,{hazards:[hazard]});tick();
assert.equal(hazard.v142WardenCleansed,true,"Floor 4 dedicated hazard should be marked cleansed");
assert.equal(hazard.v142CleansedCellCount,2,"Floor 4 should retain how many hazard cells were extinguished");
assert.equal(hazard.cells.length,0,"Extinguished dedicated hazards must have no active damage cells");
assert.equal(context.world.rooms[1].dedicatedHazard,false,"The room should stop presenting itself as an active hazard chamber");
assert.equal(context.p1.armor,3,"Ember Drain cleansing should restore two armour");
const floor4Armour=context.p1.armor;tick();assert.equal(context.p1.armor,floor4Armour,"Floor 4 armour recovery must not repeat on later scans");

// Floor 5: Sigil Pressure is removed without altering the Warden reward system.
context.world=makeWorld();context.p1=makePlayer();context.run=makeRun(5);context.run.alert=90;context.host=makeHost(5);tick();
assert.equal(context.run.alert,35,"Sigil Pressure cleansing should collapse ambient alert to 35% or lower");
assert.match(context.host.v142CleansedRefuge.benefit,/final defenders lose corruption support/i,"Floor 5 refuge should explain the final-defender consequence");

// Floor 1: Static Veil receives the strongest restored-light footprint.
context.world=makeWorld();context.p1=makePlayer();context.run=makeRun(1);context.host=makeHost(1);const revealsBefore=revealCount;tick();
assert.equal(context.world.wallLights.filter(light=>light.kind==="warden-cleansed").length,3,"Static Veil cleansing should restore three permanent lights");
assert.ok(revealCount>revealsBefore,"Static Veil cleansing should immediately refresh player visibility");
assert.match(context.host.v142CleansedRefuge.benefit,/stays illuminated/i,"Floor 1 refuge should describe its lasting restored-light benefit");

console.log("PASS v10-42 visible Warden cleansing + refuge return-rest + floor-clear feedback contract");
