import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../js/v10-42-warden-domain-progression.js",import.meta.url),"utf8");
let tick=null,now=10000;
const rooms=[
  {id:0,x:0,y:0,w:4,h:4,depth:0},
  {id:1,x:10,y:10,w:8,h:8,depth:5},
  {id:2,x:25,y:10,w:8,h:8,depth:9},
  {id:3,x:40,y:10,w:8,h:8,depth:12}
];
const map=Array.from({length:60},()=>Array(60).fill(0));
const world={rooms,map,startRoomId:0,exitRoomId:3};
const roomAt=(w,x,y)=>{const room=w.rooms.find(q=>x>=q.x&&x<=q.x+q.w&&y>=q.y&&y<=q.y+q.h);return room?room.id:-1};
const player={id:"p1",x:1,y:1,health:8,maxHealth:10,armor:2};
const player2={id:"p2",x:1,y:1,health:7,maxHealth:9,armor:1};
const count={id:"count",x:28,y:13,x0:28,y0:13,awake:true};
const death={id:"death",x:14,y:14,x0:14,y0:14,alive:true,deathStalker:true};
const generator={id:"gen1",x:15,y:15,roomId:1,alive:true,powered:true,spawnCooldown:5000};
const boss={id:"boss",x:28,y:13,alive:true,keyGuardian:true,hp:20,maxHp:20,armor:4,maxArmor:4};
const host={enemies:[death,boss],stalker:count,generators:[generator],doors:[{id:"secret",x:18,y:13,roomId:1,locked:true,type:"secret",hidden:true}],chests:[],blockingDecor:[],revision:0};
const run={floor:2,stats:{deaths:0},alert:0,floorComplete:false};
const UI={quickKeyring:{textContent:"KEYS 0/3"},quickSpecials:{textContent:"WARD BREAK 1"},floorSummary:{innerHTML:""}};
const context={
  console,window:{},document:{querySelector:()=>null,querySelectorAll:()=>[]},performance:{now:()=>now},
  setInterval:fn=>(tick=fn,1),clearInterval:()=>{},addEventListener:()=>{},host,world,run,p1:player,p2:player2,mode:"playing",UI,
  localPlayers:()=>[player,player2],S:{sfx:()=>{}},showToast:()=>{},broadcastWorld:()=>{},sync:()=>{},resetCamp:()=>{},reveal:()=>{},markRoomVisit:()=>{},
  damageEnemy:(enemy,power)=>{enemy.hp-=power;return power},hitStalker:()=>true,openChest:(p,chest)=>{chest.active=false;return true},
  hurtPlayer:(p)=>{run.stats.deaths++;p.health=p.maxHealth;p.x=1;p.y=1;return true},floorComplete:()=>{run.floorComplete=true;return true},startWorld:()=>true
};
context.window.CCG_CONFIG={maxFloors:5,stalker:{name:"Count Loadula"}};
context.window.CCGProgression={effectiveSight:()=>7};
context.window.CCGWorld={roomAt};
vm.createContext(context);
vm.runInContext(source,context,{filename:"v10-42-warden-domain-progression.js"});

assert.equal(host.v142WardenDomain?.roomId,1,"Warden corruption should install around the selected supernatural threat");
assert.equal(host.v142WardenDomain?.profileId,"iron-surge","Floor 2 should use Iron Surge corruption");
assert.equal(host.v142WardenDomain?.sourceId,"death","The domain should bind permanently to the Death Stalker that owns its room");
assert.equal(run.v142WardenFloors["2"].sourceId,"death","Campaign floor state should persist the bound Warden source ID");
assert.equal(context.window.CCGLostSizzlerV142WardenDomainProgression.boundSourceId(),"death","The progression API should expose the exact bound source for diagnostics");

count.v142WardenRewarded=true;count.v142WardenDefeated=true;
tick();
assert.equal(run.v142SealFragments,0,"Defeating an unbound supernatural enemy must not award the floor Warden Seal Fragment");
assert.equal(run.v142WardenFloors["2"].resolved,false,"Defeating Count Loadula must not resolve a Death-Stalker-owned domain");
assert.equal(host.v142WardenDomain.active,true,"The bound corruption must remain active when the wrong supernatural enemy dies");

host.enemies=host.enemies.filter(enemy=>enemy!==death);
delete host.v142WardenDomain;
context.startWorld();
assert.equal(host.v142WardenDomain,undefined,"A temporary host rebuild without the bound Warden must not create a replacement domain");
assert.equal(run.v142WardenFloors["2"].sourceId,"death","A host rebuild must preserve the original Warden source ID");
assert.equal(run.v142WardenFloors["2"].noWarden,false,"A temporarily absent bound Warden must not be reclassified as a no-Warden floor");
assert.notEqual(run.v142WardenFloors["2"].sourceId,"count","Count Loadula must never inherit a Death-Stalker-owned domain during rebuild recovery");

host.enemies.unshift(death);
tick();
assert.equal(host.v142WardenDomain?.sourceId,"death","When the bound Warden returns after rebuild, its exact domain ownership should be restored");
assert.equal(host.v142WardenDomain?.roomId,1,"Restored exact-source ownership should recover the original Warden room");

death.alive=false;death.v142WardenRewarded=true;death.v142WardenDefeated=true;
host.chests.push({id:"cache",active:true,v142WardenCache:true,v142WardenSource:"death"});
tick();
assert.equal(run.v142SealFragments,1,"The exact bound floor Warden kill should award the first Seal Fragment");
assert.equal(run.v142WardenFloors["2"].resolvedSourceId,"death","Resolution should record the same exact Warden source ID");
assert.equal(generator.v142WardenSuppressed,true,"Cleansing should suppress the bound generator");
assert.ok(generator.spawnCooldown>=1e11,"Suppressed generator should use a finite long cooldown");
assert.equal(host.doors[0].locked,false,"Cleansing should unlock an eligible optional shortcut");
assert.equal(host.v142WardenCheckpoint?.active,true,"Cleansing should create an in-floor recovery anchor");
assert.equal(host.v142WardenCheckpoint?.sourceId,"death","The recovery anchor should retain the Warden source that created it");

context.openChest(player,host.chests[0]);
assert.equal(run.v142SealFragments,2,"Warden Cache should award the second floor Seal Fragment");
assert.equal(run.v142WardenFloors["2"].cacheFragmentAwarded,true,"Cache fragment claim should persist in run state");

const checkpoint={...host.v142WardenCheckpoint};
player.x=1;player.y=1;
context.hurtPlayer(player,99);
assert.deepEqual({x:player.x,y:player.y},{x:checkpoint.x,y:checkpoint.y},"Normal death should relocate the respawn to the cleansed Warden anchor");

run.floor=3;run.floorComplete=false;delete host.v142WardenDomain;
death.alive=true;death.v142WardenRewarded=false;death.v142WardenDefeated=false;
context.floorComplete("contract");
assert.deepEqual([...run.v142SkippedWardenFloors],[3],"Leaving an available Warden unresolved should record one debt floor");

run.floor=4;run.floorComplete=false;delete host.v142WardenDomain;
death.alive=true;boss.hp=boss.maxHp=20;boss.armor=boss.maxArmor=4;
context.startWorld();tick();
assert.equal(boss.maxHp,22,"One skipped Warden floor should add 10% boss maximum HP");
assert.equal(boss.maxArmor,5,"One skipped Warden floor should add one boss armour");

player.x=1;player.y=1;player2.x=14;player2.y=14;player2.armor=2;const p1ArmorBefore=player.armor;
now=10000;delete host.v142WardenDomain;context.startWorld();tick();now=17001;tick();
assert.equal(player2.armor,1,"Floor 4 Ember Drain should affect Player 2 when P2 is the local player inside the corruption domain");
assert.equal(player.armor,p1ArmorBefore,"Floor 4 Ember Drain should not damage Player 1 while only Player 2 is inside the corruption domain");
player2.x=1;player2.y=1;now=10000;

run.v142SealFragments=6;
const testGuardian={id:"guardian-test",alive:true,keyGuardian:true,hp:20,maxHp:20,armor:0,maxArmor:0};
host.enemies.push(testGuardian);
assert.equal(context.damageEnemy(testGuardian,2),3,"Ward Temper should add +1 damage to major guardians at six fragments");
host.v142WardenAftershock={until:30000};tick();
assert.equal(host.v142WardenAftershock.v142Tempered,true,"Ward Temper should mark the active Aftershock as shortened");
assert.equal(host.v142WardenAftershock.until,22000,"Ward Temper should shorten a future Aftershock by eight seconds");

run.floor=5;run.floorComplete=false;delete host.v142WardenDomain;death.alive=true;boss.hp=boss.maxHp=20;boss.armor=boss.maxArmor=4;run.v142SealFragments=10;
player.health=6;player.armor=1;player2.health=5;player2.armor=2;
context.startWorld();tick();
assert.equal(boss.maxHp,19,"Master Seal should counter one prior debt stack plus the live Floor 5 corruption stack");
assert.equal(boss.maxArmor,3,"Master Seal should strip three armour after live corruption is applied");
assert.equal(player.health,8,"Master Seal should grant its immediate health reward to Player 1");
assert.equal(player.armor,3,"Master Seal should grant its immediate armour reward to Player 1");
assert.equal(player2.health,7,"Master Seal should grant its immediate health reward to Player 2 in split-screen");
assert.equal(player2.armor,4,"Master Seal should grant its immediate armour reward to Player 2 in split-screen");
assert.equal(context.window.CCGProgression.effectiveSight(player,run),8,"Seal Sense should add one sight tile outside Static Veil");

console.log("PASS v10-42 Warden exact-source persistence + split-safe domain + Seal progression contract");
