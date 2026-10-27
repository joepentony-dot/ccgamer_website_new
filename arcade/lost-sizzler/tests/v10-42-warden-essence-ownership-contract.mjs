import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const source=fs.readFileSync(new URL("../js/v10-42-warden-purpose-overhaul.js",import.meta.url),"utf8");
let timer=null;
const p1={id:"p1",x:22,y:2,level:2,health:8,maxHealth:10,armor:1,mana:20,maxMana:100,totalXp:0,banishmentEssence:0};
const p2={id:"p2",x:3,y:2,level:2,health:7,maxHealth:9,armor:1,mana:0,maxMana:100,totalXp:0,banishmentEssence:0};
const death={id:"death-stalker-test",x:4,y:2,alive:true,deathStalker:true,armor:3,maxArmor:3};
const pursuer={id:"ordinary-pursuer",x:5,y:2,alive:true,armor:2,moveCooldown:700};
const host={enemies:[death,pursuer],stalker:null,chests:[],timedRooms:[],revision:0};
const run={floor:3,alert:0,stats:{kills:0}};
const world={map:Array.from({length:12},()=>Array(32).fill(0)),rooms:[null,{id:1,x:0,y:0,w:11,h:11,depth:6},{id:2,x:20,y:0,w:11,h:11,depth:7}]};
const roomAt=(w,x)=>Number(x)<12?1:Number(x)>=20?2:-1;
const context={
  console,
  window:{
    CCG_CONFIG:{stalker:{name:"Count Loadula",banishPromptDistance:8}},
    CCGProgression:{
      firstInventory:()=>-1,
      inventoryRemove:()=>false,
      inventoryKindCount:()=>0
    }
  },
  document:{querySelector:()=>null,querySelectorAll:()=>[]},
  performance:{now:()=>10000},
  setInterval:fn=>(timer=fn,1),clearInterval:()=>{},addEventListener:()=>{},
  host,run,world,p1,p2,mode:"playing",score:0,shake:0,
  localPlayers:()=>[p1,p2],
  P:{purple:"purple",gold:"gold",white:"white"},
  W:{roomAt,playerWalkable:(map,x,y)=>map[y]?.[x]===0},
  S:{sfx:()=>{},setStalkerNear:()=>{}},
  showToast:()=>{},broadcastWorld:()=>{},burst:()=>{},ring:()=>{},floatText:()=>{},
  isDeathStalkerEnemy:enemy=>Boolean(enemy?.deathStalker),
  damageEnemy:(enemy,power,element,attacker)=>{
    enemy.alive=false;
    context.score+=120;
    attacker.totalXp=(Number(attacker.totalXp)||0)+100;
    return true;
  },
  awardXP:(player,xp)=>{player.totalXp=(Number(player.totalXp)||0)+Number(xp||0);return player.totalXp}
};

vm.createContext(context);
vm.runInContext(source,context,{filename:"v10-42-warden-purpose-overhaul.js"});

const api=context.window.CCGLostSizzlerV142WardenPurposeOverhaul;
assert.ok(api,"Warden purpose overhaul should install");
assert.equal(api.breakWard(death,p1),true,"P1 should be able to break the sealed Death Stalker ward");
assert.equal(death.v142WardBroken,true,"Ward Break should expose the Warden to normal combat");

context.damageEnemy(death,999,"energy",p2);

assert.equal(death.v142WardenDefeated,true,"P2 killing blow should still defeat the Warden");
assert.equal(context.score,7500,"Warden score should normalize to exactly 7,500 even when P2 gets the killing blow");
assert.equal(p2.totalXp,250,"Warden XP should normalize to exactly 250 on the actual killer");
assert.equal(p2.armor,3,"Combat recovery should grant +2 armour to the actual killer");
assert.equal(p2.mana,18,"Combat recovery should refill ammunition/mana on the actual killer");
assert.equal(p1.banishmentEssence,1,"The Warden Essence must go to P1, the campaign Ward-Break/alchemy owner");
assert.equal(p2.banishmentEssence,0,"A P2 killing blow must not strand Banishment Essence on a player who cannot spend it");
assert.equal(run.stats.wardenKills,1,"The Warden kill should be counted once");
assert.equal(host.chests.length,1,"The Warden kill should create exactly one high-tier cache");
assert.equal(host.chests[0].v142WardenSource,"death-stalker-test","The cache should remain bound to the defeated Warden");
assert.equal(host.v142WardenAftershock?.sourceId,"death-stalker-test","The Warden kill should still trigger its aftershock");
assert.equal(run.alert,82,"The Warden aftershock should raise alert to the configured floor");
assert.equal(typeof timer,"function","The normal Warden maintenance timer should still install");

timer();
assert.equal(pursuer.aiState,"chase","The Warden Aftershock should push an ordinary enemy into pursuit");
assert.deepEqual({x:pursuer.lastSeen?.x,y:pursuer.lastSeen?.y},{x:p2.x,y:p2.y},"A P2-room Aftershock pursuer should target P2 rather than remote P1");
assert.equal(pursuer.memoryMs,2800,"Aftershock pursuit should keep the existing pursuit-memory floor");
assert.equal(pursuer.moveCooldown,500,"Aftershock pursuit should keep the existing movement-pressure ceiling");

console.log("PASS v10-42 Warden P2 kill keeps operational Essence on P1 and Aftershock pursuit split-safe");

// Solo P0 regression: real damage/death, inventory and Warden owners. Only
// presentation/audio/network side effects are inert; no mocked killing blow.
const readOwner=name=>fs.readFileSync(new URL(`../js/${name}.js`,import.meta.url),"utf8");
function soloEncounter(){
  let now=10000;const ticks=[];
  const ctx={window:{},console,document:{querySelector:()=>null,querySelectorAll:()=>[]},
    performance:{now:()=>now},setInterval:fn=>(ticks.push(fn),ticks.length),clearInterval(){},addEventListener(){},
    setTimeout(){},mode:"playing",score:0,shake:0,stats:{},UI:{},explored:new Map(),
    S:{sfx(){},setStalkerNear(){}},P:{purple:"purple",gold:"gold",white:"white",orange:"orange",blue:"blue",cyan:"cyan",pink:"pink"},
    showToast(){},broadcastWorld(){},sync(){},burst(){},ring(){},floatText(){},onFX(){},
    knockEnemyAway(){},updateQuests(){},OVERRIDES:{images:{}},
    awardXP:(p,xp)=>{p.totalXp=(p.totalXp||0)+xp}
  };
  vm.createContext(ctx);
  for(const name of ["config","world","progression","systems","ai"])vm.runInContext(readOwner(name),ctx,{filename:`${name}.js`});
  ctx.C=ctx.window.CCG_CONFIG;ctx.W=ctx.window.CCGWorld;ctx.PGR=ctx.window.CCGProgression;ctx.SYS=ctx.window.CCGSystems;ctx.A=ctx.window.CCGAI;
  ctx.p1={id:"p1",name:"Solo",x:2,y:2,level:1,totalXp:0,inventory:[],inventorySlots:3,health:10,maxHealth:10,mana:0,maxMana:100};
  ctx.localPlayers=()=>[ctx.p1];
  ctx.run={floor:4,alert:0,stats:{kills:0},v142WardenFloors:{}};
  ctx.world={map:Array.from({length:13},(_,y)=>Array.from({length:13},(_,x)=>x&&y&&x<12&&y<12?0:1)),rooms:[{id:0,x:1,y:1,w:10,h:10,depth:8}]};
  const death={id:"death-stalker-floor-4",x:5,y:5,kind:"ghost",alive:true,hp:10,maxHp:10,deathStalker:true,voidStalker:true};
  const guardian={id:"guardian",x:6,y:5,kind:"guardian",alive:true,hp:4,maxHp:4,guardian:true};
  const count={id:"count-loadula",x:8,y:5,awake:true,hp:20,maxHp:20,spawnTimer:0};
  ctx.host={enemies:[death,guardian],guardian,stalker:count,items:[],chests:[],deathCaches:[],switches:[],shrines:[],doors:[],shops:[],generators:[],timedRooms:[],blockingDecor:[],revision:0};
  vm.runInContext(readOwner("game-local-runtime"),ctx,{filename:"game-local-runtime.js"});
  const gameplay=readOwner("game-play"),hitStart=gameplay.indexOf("function hitStalker(b){"),hitEnd=gameplay.indexOf("\nfunction projectilePathClear",hitStart);
  assert.ok(hitStart>=0&&hitEnd>hitStart,"Real Count projectile owner must be available");
  vm.runInContext(gameplay.slice(hitStart,hitEnd),ctx,{filename:"game-play.js::hitStalker"});
  vm.runInContext(source,ctx,{filename:"v10-42-warden-purpose-overhaul.js"});
  const tick=()=>{for(const fn of ticks)fn()};
  return{ctx,death,guardian,count,tick,advance:ms=>{now+=ms;tick()}};
}

// P0 owner Floor 5 feedback pressure: rapid ordinary fire against two
// distinct sealed supernatural classes must not queue a long-lived warning,
// floater and audio event for every immune projectile. Combat and ward state
// are unchanged, and a restored monotonic-clock reset must allow new advice.
const feedback=soloEncounter(),f=feedback.ctx,wardToasts=[],wardFloaters=[],wardSounds=[];
f.showToast=(...args)=>wardToasts.push(args);
f.floatText=(...args)=>wardFloaters.push(args);
f.S.sfx=name=>wardSounds.push(name);
const sealedHp=feedback.death.hp;
for(let i=0;i<80;i++)f.damageEnemy(feedback.death,9,"energy",f.p1);
assert.equal(feedback.death.hp,sealedHp,"Immune Death Stalker must take no damage under sustained fire");
assert.equal(feedback.death.alive,true);
assert.equal(feedback.death.v142WardBroken,undefined);
assert.equal(wardToasts.filter(row=>String(row[0]).includes("INDESTRUCTIBLE")).length,1,"80 sealed Stalker impacts yield one advisory toast");
assert.equal(wardFloaters.filter(row=>row[2]==="KNOCKED BACK").length,1,"80 sealed Stalker impacts yield one advisory floater");
assert.equal(wardSounds.filter(name=>name==="stalker").length,1,"80 sealed Stalker impacts yield one advisory sound");
assert.equal(f.run.stats.kills,0);
assert.equal(f.score,0);
feedback.advance(1600);
f.damageEnemy(feedback.death,9,"energy",f.p1);
assert.equal(wardToasts.filter(row=>String(row[0]).includes("INDESTRUCTIBLE")).length,2,"Advisory resumes after the real 1600ms cooldown");
feedback.death._ccgSealedWardNoticeAt=99999999;
f.damageEnemy(feedback.death,9,"energy",f.p1);
assert.equal(wardToasts.filter(row=>String(row[0]).includes("INDESTRUCTIBLE")).length,3,"A restored future timestamp cannot suppress advice indefinitely");
const another={id:"second-sealed-stalker",x:7,y:5,kind:"ghost",hp:10,maxHp:10,alive:true,deathStalker:true,voidStalker:true};
f.host.enemies.push(another);
f.damageEnemy(another,9,"energy",f.p1);
assert.equal(wardToasts.filter(row=>String(row[0]).includes("INDESTRUCTIBLE")).length,4,"Different sealed actor retains independent first-hit guidance");
const countBullet={x:feedback.count.x,y:feedback.count.y,power:1,owner:"p1"};
const countNoticeCount=()=>wardToasts.filter(row=>String(row[0]).includes("CANNOT BE KNOCKED BACK")).length;
for(let i=0;i<60;i++){feedback.count.stunMs=0;assert.equal(f.hitStalker(countBullet),true)}
assert.equal(countNoticeCount(),1,"60 sealed Count impacts yield one advisory toast");
assert.equal(wardSounds.filter(name=>name==="stalker").length,5,"Sealed Count guidance is audio-throttled separately");
assert.equal(feedback.count.v142WardBroken,undefined);
assert.equal(feedback.count.hp,feedback.count.maxHp);
feedback.advance(1600);
feedback.count.stunMs=0;f.hitStalker(countBullet);
assert.equal(countNoticeCount(),2,"Sealed Count guidance resumes after cooldown");
assert.equal(f.run.stats.kills,0,"Immune-hit feedback never manufactures defeat or XP");

const pair=soloEncounter(),c=pair.ctx;
c.damageEnemy(pair.death,999,"energy",c.p1);
assert.equal(pair.death.hp,10,"Sealed Death Stalker must retain ordinary-fire immunity");
c.damageEnemy(pair.guardian,999,"energy",c.p1);
assert.equal(pair.guardian.alive,false,"Ordinary guardian alongside Stalker needs no Flask");
assert.equal(c.run.stats.kills,1,"Guardian defeat must be recorded once");
assert.equal(c.activateBanishment(c.p1),false,"No-charge activation must not break either supernatural ward");
assert.equal(pair.death.v142WardBroken,undefined);
c.PGR.inventoryAdd(c.p1,{kind:"banishment",qty:1});
assert.equal(c.activateBanishment(c.p1),true);
assert.equal(c.PGR.inventoryKindCount(c.p1,"banishment"),0,"One ward consumes exactly one charge");
assert.equal(pair.death.alive,true,"Ward break permits combat; it does not grant a free kill");
assert.equal(pair.count.v142WardBroken,undefined,"Nearest-target activation must not break the second supernatural ward");
c.damageEnemy(pair.death,999,"energy",c.p1);
assert.equal(pair.death.alive,false);
assert.equal(pair.death.v142WardenDefeated,true);
assert.equal(c.run.stats.kills,2);
assert.deepEqual(Array.from(c.host.defeatedDeathStalkers),[pair.death.id]);
assert.equal(c.score,900+7500,"Paired ordinary guardian and Warden retain their separate rewards");
assert.equal(c.p1.totalXp,100+250);
for(let i=0;i<4;i++){c.damageEnemy(pair.death,999,"energy",c.p1);c.damageEnemy(pair.guardian,999,"energy",c.p1);pair.advance(2100)}
assert.equal(c.run.stats.kills,2,"Repeated combat/ticks must not revive or re-reward defeated actors");
assert.equal(c.host.chests.length,1);
assert.equal(c.score,8400);
assert.equal(c.p1.banishmentEssence,1);

function killAtOccupiedCell(kind){
  const fixture=soloEncounter(),{ctx,death}=fixture;
  const occupied={x:death.x,y:death.y,active:true,alive:true,id:"occupied"};
  if(kind==="player"){ctx.p1.x=death.x;ctx.p1.y=death.y}
  else if(kind==="count"){fixture.count.x=death.x;fixture.count.y=death.y}
  else if(kind==="rescue")ctx.host.rescue={...occupied};
  else ctx.host[kind].push({...occupied});
  ctx.permanentlyBanish(death,ctx.p1);ctx.damageEnemy(death,999,"energy",ctx.p1);
  const cache=ctx.host.chests.find(chest=>chest.v142WardenCache);
  assert.ok(cache,`${kind}: a reachable alternate should receive the Warden Cache`);
  assert.notEqual(`${cache.x},${cache.y}`,`${occupied.x},${occupied.y}`,`${kind}: reward must not overlap active occupancy`);
  assert.equal(ctx.W.playerWalkable(ctx.world.map,cache.x,cache.y,ctx.host),true);
  fixture.advance(2100);
  assert.equal(ctx.host.chests.filter(chest=>chest.v142WardenCache).length,1,`${kind}: no duplicate reward`);
}
for(const kind of ["generators","enemies","items","chests","deathCaches","switches","shrines","doors","shops","rescue","player","count"])killAtOccupiedCell(kind);

for(const list of ["enemies","generators","items","chests","deathCaches"]){
  const fixture=soloEncounter(),{ctx,death}=fixture;
  ctx.host[list].push({x:death.x,y:death.y,active:false,alive:false});
  ctx.permanentlyBanish(death,ctx.p1);ctx.damageEnemy(death,999,"energy",ctx.p1);
  const cache=ctx.host.chests.find(q=>q.v142WardenCache);
  assert.equal(cache.x,death.x,`${list}: inactive/dead occupancy must free the original kill tile`);
  assert.equal(cache.y,death.y);
}

const deferred=soloEncounter(),d=deferred.ctx;
d.openChest=(_player,chest)=>{chest.active=false;return true};
vm.runInContext(readOwner("v10-42-warden-domain-progression"),d,{filename:"v10-42-warden-domain-progression.js"});
// All reachable reward cells occupied; a physically free tile behind a locked
// door must never be selected merely because it is close to the enemy.
for(let y=1;y<12;y++)for(let x=1;x<12;x++)d.host.items.push({x,y,active:true});
d.host.items=d.host.items.filter(q=>q.x!==10);
for(let y=1;y<12;y++)d.world.map[y][9]=1;
d.world.map[5][9]=0;d.host.doors=[{id:"sealed",x:9,y:5,locked:true,open:false}];
d.permanentlyBanish(deferred.death,d.p1);d.damageEnemy(deferred.death,999,"energy",d.p1);
assert.equal(d.host.chests.length,0,"No cache may spawn on occupied cells or across the sealed route");
assert.equal(deferred.death.v142WardenCachePending,true);
assert.equal(d.score,7500,"Completed kill reward is retained even while cache placement is reserved");
// Domain resolution can happen before the reserved cache is placed.
deferred.tick();
assert.equal(d.run.v142WardenFloors["4"].resolvedSourceId,deferred.death.id);
assert.equal(d.run.v142SealFragments,1,"Actual domain cleansing must award only its kill half before cache placement");
d.host.items.find(q=>q.x===5&&q.y===5).active=false;
deferred.advance(1999);
assert.equal(d.host.chests.length,0,"Retry is bounded, not a search on every maintenance tick");
d.mode="paused";deferred.advance(1);
assert.equal(d.host.chests.length,0,"Paused game must not place a reserved reward");
d.mode="playing";deferred.tick();
assert.equal(d.host.chests.length,1,"Vacated reachable tile should release the reserved cache");
assert.equal(d.host.chests[0].x,5);assert.equal(d.host.chests[0].y,5);
assert.equal(d.host.chests[0].v142SealEligible,true,"Deferred domain cache must retain its Seal Fragment eligibility");
assert.equal(d.host.chests[0].v142WardenFloor,4);
d.openChest(d.p1,d.host.chests[0]);
assert.equal(d.run.v142SealFragments,2,"Actual domain chest-open owner must award the deferred cache half");
d.openChest(d.p1,d.host.chests[0]);deferred.advance(2100);
assert.equal(d.run.v142SealFragments,2,"Repeated opening/ticks cannot duplicate the deferred Seal Fragment");
assert.equal(d.host.chests.length,1,"Opening the cache must not recreate it");
assert.equal(d.score,7500);assert.equal(d.p1.totalXp,250);assert.equal(d.p1.banishmentEssence,1);
deferred.death.v142WardenCachePending=true;deferred.death.v142WardenCacheRetryAt=0;deferred.tick();
assert.equal(deferred.death.v142WardenCachePending,false,"Restored pending flag must reconcile an already-created/opened cache");
assert.equal(d.host.chests.length,1);

const countKill=soloEncounter(),k=countKill.ctx;
k.permanentlyBanish(countKill.count,k.p1);
k.hitStalker({x:countKill.count.x,y:countKill.count.y,power:999,owner:"p1"});
assert.equal(countKill.count.permanentlyBanished,true,"Count defeat must retain its permanent no-respawn state");
assert.equal(countKill.count.awake,false);
assert.equal(k.host.chests.length,1,"Count and Death Stalker use the same safe cache owner");
countKill.advance(2100);
assert.equal(k.run.stats.kills,1);assert.equal(k.host.chests.length,1);


// P0 charge ownership: exercise actual Warden source, progression inventory
// and live Solo encounter. A failed removal or stale ward may never charge
// the player or leave the supernatural actor in the wrong state.
function wardPaymentFixture(){
  const fixture=soloEncounter(),ctx=fixture.ctx;
  assert.equal(ctx.PGR.inventoryAdd(ctx.p1,{kind:"banishment",name:"Ward-Break Charge",qty:1}),true);
  return fixture;
}
const missingPayment=wardPaymentFixture(),missing=missingPayment.ctx;
const missingOriginalRemove=missing.PGR.inventoryRemove;
const missingInventoryBefore=JSON.stringify(missing.p1.inventory);
missing.PGR.inventoryRemove=(player,index)=>{
  missingOriginalRemove(player,index,1);return null;
};
assert.equal(missing.activateBanishment(missing.p1),false,"No successful removal means no free ward break");
assert.equal(JSON.stringify(missing.p1.inventory),missingInventoryBefore,"Failed payment restores exact Flask inventory");
assert.equal(missingPayment.death.v142WardBroken,undefined,"Failed payment must not strip Death Stalker immunity");
assert.equal(missing.run.stats.wardsBroken||0,0);
assert.equal(missing.score,0,"Failed Flask payment cannot award score");
missing.PGR.inventoryRemove=missingOriginalRemove;
assert.equal(missing.activateBanishment(missing.p1),true,"A restored charge can be spent on a valid retry");
assert.equal(missing.PGR.inventoryKindCount(missing.p1,"banishment"),0);
assert.equal(missing.run.stats.wardsBroken,1);

const stalePayment=wardPaymentFixture(),stale=stalePayment.ctx;
const staleOriginalRemove=stale.PGR.inventoryRemove;
const staleInventoryBefore=JSON.stringify(stale.p1.inventory);
stale.PGR.inventoryRemove=(player,index)=>{
  const charge=staleOriginalRemove(player,index,1);
  stalePayment.death.v142WardenDefeated=true; // simulate target changing after target selection
  return charge;
};
assert.equal(stale.activateBanishment(stale.p1),false,"Rejected stale ward must not consume its charge");
assert.equal(JSON.stringify(stale.p1.inventory),staleInventoryBefore,"Rejected ward must refund exact item");
assert.equal(stale.run.stats.wardsBroken||0,0);
assert.equal(stale.score,0);
stale.PGR.inventoryRemove=staleOriginalRemove;
stalePayment.death.v142WardenDefeated=false;
assert.equal(stale.activateBanishment(stale.p1),true,"Revalidated sealed ward accepts refunded charge");
assert.equal(stale.PGR.inventoryKindCount(stale.p1,"banishment"),0);
assert.equal(stale.run.stats.wardsBroken,1);

for(const issue of ["unexpected item","exception"]){
  const fixture=wardPaymentFixture(),ctx=fixture.ctx,prior=JSON.stringify(ctx.p1.inventory);
  const remove=ctx.PGR.inventoryRemove;
  ctx.PGR.inventoryRemove=(player,index)=>{
    const paid=remove(player,index,1);
    if(issue==="exception")throw Error("simulated inventory interruption");
    return{...paid,kind:"torch"};
  };
  assert.equal(ctx.activateBanishment(ctx.p1),false,issue+": no ward change on invalid payment");
  assert.equal(JSON.stringify(ctx.p1.inventory),prior,issue+": exact Flask restored");
  assert.equal(fixture.death.v142WardBroken,undefined,issue+": enemy remains sealed");
  assert.equal(ctx.score,0,issue+": no score granted");
  ctx.PGR.inventoryRemove=remove;
}

// R143 P0: a paid charge must revalidate the exact live actor, not a stale
// pre-payment reference after a death or restored host roster replacement.
for(const staleKind of ["defeated", "replaced"]){
  const fixture=wardPaymentFixture(),ctx=fixture.ctx,remove=ctx.PGR.inventoryRemove;
  const before=JSON.stringify(ctx.p1.inventory);
  ctx.PGR.inventoryRemove=(player,index)=>{
    const paid=remove(player,index,1);
    if(staleKind==="defeated")fixture.death.alive=false;
    else ctx.host.enemies=ctx.host.enemies.filter(e=>e!==fixture.death);
    return paid;
  };
  assert.equal(ctx.activateBanishment(ctx.p1),false,`${staleKind}: stale Warden cannot spend a charge`);
  assert.equal(JSON.stringify(ctx.p1.inventory),before,`${staleKind}: failed ward break refunds the exact charge`);
  assert.equal(fixture.death.v142WardBroken,undefined,`${staleKind}: stale Warden remains unchanged`);
  assert.equal(ctx.run.stats.wardsBroken||0,0);
  ctx.PGR.inventoryRemove=remove;
  if(staleKind==="defeated")fixture.death.alive=true;
  else ctx.host.enemies.unshift(fixture.death);
  assert.equal(ctx.activateBanishment(ctx.p1),true,`${staleKind}: valid live retry succeeds`);
  assert.equal(ctx.PGR.inventoryKindCount(ctx.p1,"banishment"),0);
  assert.equal(ctx.run.stats.wardsBroken,1);
}

// Two different sealed Wardens in the same chamber need two separate, valid
// charges. A JSON-restored host must preserve the first break and permit the
// second, without retargeting the already vulnerable actor or duplicating XP.
const dualWarden=soloEncounter(),dual=dualWarden.ctx;
dual.p1.x=6;dual.p1.y=5;
assert.equal(dual.PGR.inventoryAdd(dual.p1,{kind:"banishment",qty:2}),true);
assert.equal(dual.PGR.inventoryKindCount(dual.p1,"banishment"),2);
assert.equal(dual.banishmentState(dual.p1).targets.length,2);
assert.equal(dual.activateBanishment(dual.p1),true,"First charge breaks the nearer Death Stalker");
assert.equal(dualWarden.death.v142WardBroken,true);
assert.equal(dualWarden.count.v142WardBroken,undefined);
assert.equal(dual.PGR.inventoryKindCount(dual.p1,"banishment"),1);
dual.host=JSON.parse(JSON.stringify(dual.host));
const restoredDeath=dual.host.enemies.find(e=>e.id===dualWarden.death.id);
const restoredCount=dual.host.stalker;
assert.equal(dual.banishmentState(dual.p1).targets.length,1,"Restored broken Stalker cannot steal the second target");
assert.equal(dual.banishmentState(dual.p1).nearest,restoredCount);
assert.equal(dual.activateBanishment(dual.p1),true,"Second charge breaks the separate Count ward");
assert.equal(restoredCount.v142WardBroken,true);
assert.equal(restoredDeath.v142WardBroken,true);
assert.equal(dual.PGR.inventoryKindCount(dual.p1,"banishment"),0);
assert.equal(dual.run.stats.wardsBroken,2);
assert.equal(dual.activateBanishment(dual.p1),false,"No phantom third charge after two valid payments");
assert.equal(dual.run.stats.wardsBroken,2);

const exactPayment=wardPaymentFixture(),paid=exactPayment.ctx;
const paidInitial=JSON.stringify(paid.p1.inventory);
assert.equal(paid.activateBanishment(paid.p1),true,"Successful charge breaks one actual sealed ward");
assert.equal(exactPayment.death.alive,true,"One Flask removes immunity, not the whole enemy");
assert.equal(exactPayment.death.v142WardBroken,true);
assert.equal(paid.run.stats.wardsBroken,1);
assert.equal(paid.PGR.inventoryKindCount(paid.p1,"banishment"),0);
assert.equal(paid.activateBanishment(paid.p1),false,"No second activation without charge");
assert.equal(paid.PGR.inventoryAdd(paid.p1,{kind:"banishment",qty:1}),true);
assert.equal(paid.activateBanishment(paid.p1),false,"Already-broken supernatural ward cannot eat a second charge");
assert.equal(paid.PGR.inventoryKindCount(paid.p1,"banishment"),1);
assert.equal(paid.run.stats.wardsBroken,1,"Exactly one recorded Ward Break");
assert.equal(paid.score,0,"Ward Break alone must not grant kill score");
assert.notEqual(JSON.stringify(paid.p1.inventory),paidInitial,"One-charge ownership state changes only on valid payment");


// Source-executed P0 Flask sight: the real CCGAI ray respects locked doors,
// walls and decor, and a failed B press never charges the solo player.
function wardSightFixture({asCount=false,gate="locked",wall=false}={}){
  const t=soloEncounter(),ctx=t.ctx;
  if(asCount){
    ctx.host.enemies=ctx.host.enemies.filter(e=>!e.deathStalker);
    t.count.x=5;t.count.y=5;
  }
  ctx.host.doors=gate==="none"?[]:[{id:"ward-line-gate",type:"room",roomId:0,
    x:3,y:3,locked:gate==="locked",open:gate==="open"}];
  if(wall)ctx.world.map[3][3]=1;
  assert.equal(ctx.PGR.inventoryAdd(ctx.p1,{kind:"banishment",qty:1,name:"Ward-Break Charge"}),true);
  return t;
}
for(const asCount of [false,true]){
  const f=wardSightFixture({asCount}),ctx=f.ctx;
  const initial=JSON.stringify(ctx.p1.inventory);
  assert.equal(ctx.banishmentState(ctx.p1).ready,false,
    "Closed room gate must block B targeting, even inside the charge range");
  assert.equal(ctx.activateBanishment(ctx.p1),false);
  assert.equal(JSON.stringify(ctx.p1.inventory),initial,"Closed gate must preserve exact Flask");
  assert.equal(ctx.run.stats.wardsBroken||0,0);
  ctx.host=JSON.parse(JSON.stringify(ctx.host));
  assert.equal(ctx.banishmentState(ctx.p1).ready,false,"Saved locked gate remains blocked");
  ctx.host.doors[0].open=true;ctx.host.doors[0].locked=false;
  assert.equal(ctx.banishmentState(ctx.p1).ready,true);
  assert.equal(ctx.activateBanishment(ctx.p1),true,"Opening room gate restores normal B use");
  assert.equal(ctx.PGR.inventoryKindCount(ctx.p1,"banishment"),0);
  assert.equal(ctx.run.stats.wardsBroken,1);
  const target=asCount?ctx.host.stalker:ctx.host.enemies.find(e=>e.deathStalker);
  assert.equal(target.v142WardBroken,true);
  assert.equal(ctx.activateBanishment(ctx.p1),false,"No second charge can be spent");
}
const wallWard=wardSightFixture({gate:"none",wall:true}),wallCtx=wallWard.ctx;
assert.equal(wallCtx.banishmentState(wallCtx.p1).ready,false,"Solid stone blocks supernatural ward-break");
assert.equal(wallCtx.activateBanishment(wallCtx.p1),false);
assert.equal(wallCtx.PGR.inventoryKindCount(wallCtx.p1,"banishment"),1);
wallCtx.world.map[3][3]=0;
assert.equal(wallCtx.banishmentState(wallCtx.p1).ready,true);
assert.equal(wallCtx.activateBanishment(wallCtx.p1),true);
const visibleWard=wardSightFixture({gate:"none",wall:true}),visibleCtx=visibleWard.ctx;
visibleWard.count.x=2;visibleWard.count.y=7;
assert.equal(visibleCtx.banishmentState(visibleCtx.p1).nearest,visibleWard.count,
  "Visible Count may be selected instead of nearer blocked Stalker");
assert.equal(visibleCtx.activateBanishment(visibleCtx.p1),true);
assert.notEqual(visibleWard.death.v142WardBroken,true);
assert.equal(visibleWard.count.v142WardBroken,true);

console.log("PASS solo paired guardian/Stalker combat and safe, reachable, reserved Warden caches");
