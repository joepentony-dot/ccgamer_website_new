import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const source=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-five-depth-campaign.js'),'utf8');
const configSource=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/config.js'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const configSandbox={window:{}};
vm.runInNewContext(configSource,configSandbox,{filename:'config.js'});
const config=configSandbox.window.CCG_CONFIG;
const letters='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
const deterministicDeck=letters.map(letter=>({letter,title:`${letter} TEST GAME`}));

const fakeDocument={
  querySelector(){return null},
  querySelectorAll(){return[]},
  getElementById(){return null}
};
const windowObject={
  CCG_CONFIG:config,
  CCGProgression:{
    seededRandom(seed){let n=[...String(seed)].reduce((sum,ch)=>sum+ch.charCodeAt(0),0)||1;return()=>{n=(n*1664525+1013904223)>>>0;return n/4294967296}},
    roomCompletion(){return 0}
  },
  CCGWorld:{createHostState(){return{items:[],enemies:[],chests:[],doors:[],shops:[],voidStalkers:[],keysCollected:0,objective:{type:'keys',complete:false}}}},
  CCGSystems:{
    decorate(_w,h){return h},
    updateObjective(h,_run,explorePct=0){
      const type=h.objective?.type;let done=false;
      if(type==='keys')done=(Number(h.keysCollected)||0)>=3;
      else if(type==='generators')done=(h.generators||[]).every(g=>!g.alive);
      else if(type==='rescue')done=Boolean(h.rescue?.rescued);
      else if(type==='explore_guardian')done=explorePct>=70&&!h.guardian?.alive;
      else if(type==='guardian')done=!h.guardian?.alive;
      if(h.objective)h.objective.complete=done;
      h.exitOpen=done&&Boolean(h.exitSigilCollected);
      return h.exitOpen;
    },
    objectiveText(h,_run,explorePct=0){
      const type=h.objective?.type;let base='Explore the dungeon';
      if(type==='keys')base=`Recover main vault keys: ${Number(h.keysCollected)||0}/3`;
      else if(type==='generators'){const generators=h.generators||[];base=`Destroy monster generators: ${generators.filter(g=>!g.alive).length}/${generators.length}`}
      else if(type==='rescue')base=h.rescue?.rescued?'CCG scout rescued':'Find the trapped CCG scout and escort them to a sanctuary';
      else if(type==='explore_guardian')base=`Map floor ${Math.floor(explorePct)}% / 70% and defeat the guardian`;
      else if(type==='guardian')base=h.guardian?.alive?'Defeat the Zzap! Citadel guardian':'Guardian defeated';
      return h.objective?.complete?(h.exitSigilCollected?`${base} — EXIT SIGIL acquired: reach the floor exit`:`${base} — recover the EXIT SIGIL`):base;
    }
  },
  CCGAI:{stepEnemies(){return true}},
  CCGLostSizzlerV142ProceduralOverhaul:{gameDeck(){return deterministicDeck.map(row=>({...row}))}}
};
const sandbox={
  window:windowObject,
  document:fakeDocument,
  console,
  addEventListener(){},
  setInterval(){return 1},
  clearInterval(){},
  run:{floor:1,seed:'TEST-SEED',v142ClaimedDomains:[]}
};
vm.runInNewContext(source,sandbox,{filename:'v10-42-five-depth-campaign.js'});
const api=windowObject.CCGLostSizzlerV142FiveDepthCampaign;
assert(api,'Campaign runtime must install once its dependencies are available.');
assert(source.includes('hostState.exitSigilCollected=false;hostState.exitOpen=true'),'Floors 1–14 must open stairs without pretending the final Sigil has been collected.');

const floorProfiles=config.proceduralDungeon.campaignFloors;
function hostForProfile(profile,complete){
  const host={
    objective:{type:profile.objective,complete:false},
    generators:[],
    rescue:null,
    guardian:null,
    doors:[{sigilGate:true,locked:true,open:false,opening:true}],
    items:[],enemies:[],keysCollected:0,
    sigilLockdown:true,sigilResolved:false,
    exitSigilCollected:false,exitOpen:false
  };
  if(profile.objective==='generators')host.generators=complete?[{alive:false},{alive:false},{alive:false}]:[{alive:false},{alive:true},{alive:false}];
  if(profile.objective==='rescue')host.rescue={rescued:complete};
  if(profile.objective==='explore_guardian'||profile.objective==='guardian')host.guardian={alive:!complete};
  if(profile.objective==='keys'){
    host.keysCollected=complete?1:0;
    if(!complete){
      const domain=config.proceduralDungeon.keyDomains.find(row=>Number(row.floor)===Number(profile.floor));
      host.items.push({id:`key-${profile.floor}`,kind:'key',active:true,domainId:domain?.id});
      host.enemies.push({id:`key-guardian-${profile.floor}`,keyGuardian:true,domainId:domain?.id,alive:true});
    }
  }
  return host;
}
function explorePctFor(profile,complete){return profile.objective==='explore_guardian'?(complete?70:69):0}

for(const profile of floorProfiles.slice(0,-1)){
  const floor=Number(profile.floor);
  sandbox.run.floor=floor;
  sandbox.run.v142ClaimedDomains=[];
  const blocked=hostForProfile(profile,false);
  assert(windowObject.CCGSystems.updateObjective(blocked,sandbox.run,explorePctFor(profile,false))===false,`Floor ${floor} must stay sealed before its authored objective is complete.`);

  const completed=hostForProfile(profile,true);
  const opened=windowObject.CCGSystems.updateObjective(completed,sandbox.run,explorePctFor(profile,true));
  assert(opened===true&&completed.exitOpen===true,`Floor ${floor} must always expose a completion route once its authored objective is complete.`);
  assert(completed.exitSigilCollected===false,`Floor ${floor} must never require or fake an interim Exit Sigil.`);
  assert(completed.sigilLockdown===false&&completed.sigilResolved===true,`Floor ${floor} must clear stale Sigil lockdown state after objective completion.`);
  assert(completed.doors[0].locked===false&&completed.doors[0].open===true&&completed.doors[0].opening===false,`Floor ${floor} must unseal any stale Sigil gate after objective completion.`);
  const mission=windowObject.CCGSystems.objectiveText(completed,sandbox.run,explorePctFor(profile,true));
  assert(/reach the stairs/i.test(mission),`Floor ${floor} mission text must direct the player to the stairs after completion.`);
  assert(!/EXIT SIGIL/i.test(mission),`Floor ${floor} mission text must never demand a non-existent Exit Sigil.`);
}

sandbox.run.floor=15;
sandbox.run.v142ClaimedDomains=['iron','bone','ash'];
const finalProfile=floorProfiles.at(-1);
const finalHost=hostForProfile(finalProfile,true);
assert(windowObject.CCGSystems.updateObjective(finalHost,sandbox.run,0)===false,'Floor 15 must remain sealed after the guardian falls until the real final Sigil is collected.');
assert(/AWAKENED SIGIL/i.test(windowObject.CCGSystems.objectiveText(finalHost,sandbox.run,0)),'Floor 15 must retain the real Awakened Sigil objective.');
finalHost.exitSigilCollected=true;
assert(windowObject.CCGSystems.updateObjective(finalHost,sandbox.run,0)===true&&finalHost.exitOpen===true,'Floor 15 must open only after both the final objective and the Awakened Sigil are complete.');

sandbox.run.floor=3;
sandbox.run.v142ClaimedDomains=[];
const missingDomainHost={
  objective:{type:'keys',complete:false},
  keysCollected:0,
  items:[],
  enemies:[{id:'iron-guardian',keyGuardian:true,domainId:'iron',alive:false}],
  doors:[{sigilGate:true,locked:true,open:false}],
  exitOpen:false
};
assert(api.recoverMissingDomainKey(missingDomainHost,sandbox.run,api.domainForFloor(sandbox.run))===true,'A missing domain Key after its guardian is defeated must self-recover instead of deadlocking the floor.');
assert(sandbox.run.v142ClaimedDomains.includes('iron'),'Recovered domain Key must bind to the campaign run.');
assert(windowObject.CCGSystems.updateObjective(missingDomainHost,sandbox.run,0)===true&&missingDomainHost.exitOpen===true,'Recovered domain progression must immediately expose the stairs.');

sandbox.run.floor=8;
sandbox.run.v142ClaimedDomains=[];
const restoredInterimHost={
  objective:{type:'rescue',complete:true},
  doors:[{sigilGate:true,locked:true,open:false,opening:true}],
  exitSigilCollected:false,
  exitOpen:false,
  sigilLockdown:true,
  sigilResolved:false
};
assert(api.ensureInterimExit(restoredInterimHost,sandbox.run)===true,'A restored save with a completed interim objective must repair a stale closed exit.');
assert(restoredInterimHost.exitOpen===true&&restoredInterimHost.doors[0].open===true,'Restored interim progression repair must reopen the route without demanding a Sigil.');

sandbox.run.floor=15;
sandbox.run.v142ClaimedDomains=['iron','bone','ash'];
const missingFinalSigilHost={
  objective:{type:'guardian',complete:true},
  items:[],
  enemies:[],
  doors:[{sigilGate:true,locked:true,open:false,opening:true}],
  sigilDefenderIds:[],
  sigilDropPos:{x:9,y:7},
  exitSigilCollected:false,
  exitOpen:false
};
assert(api.recoverMissingFinalSigil(missingFinalSigilHost,sandbox.run)===true,'A missing final Sigil after the chamber is cleared must self-recover instead of deadlocking Floor 15.');
assert(missingFinalSigilHost.items.some(item=>item.kind==='exitSigil'&&item.active!==false),'Final recovery must create a collectible Awakened Sigil.');
assert(missingFinalSigilHost.doors[0].locked===false&&missingFinalSigilHost.doors[0].open===true,'Final recovery must release the Sigil chamber gate.');
const expected=[2,2,2,2,2,2,2,2,2,2,2,1,1,1,1],seen=[];
for(let floor=1;floor<=15;floor++){
  const slice=api.floorPickupSlice('TEST-SEED',floor);
  assert(slice.length===expected[floor-1],`Floor ${floor} must receive ${expected[floor-1]} A-Z game pickups.`);
  seen.push(...slice.map(row=>row.letter));
}
assert(seen.length===26,'Full campaign must distribute exactly 26 collectible letters.');
assert(new Set(seen).size===26,'A letter must not be duplicated between campaign floors.');
assert(seen.sort().join('')===letters.join(''),'Full campaign must cover A through Z exactly once.');

assert(api.globalKeyCount({v142ClaimedDomains:['iron','bone','ash','iron']})===3,'Global Key count must deduplicate domain IDs.');
assert(api.domainForFloor({floor:1})===null,'Floor 1 must not consume one of the three global Keys.');
assert(api.domainForFloor({floor:3})?.id==='iron','Floor 3 must own the Iron Key domain.');
assert(api.domainForFloor({floor:7})?.id==='bone','Floor 7 must own the Bone Key domain.');
assert(api.domainForFloor({floor:11})?.id==='ash','Floor 11 must own the Ash Key domain.');
assert(api.domainForFloor({floor:15})===null,'Floor 15 must be reserved for the completed Sigil rather than a fourth Key.');

const balanceHost={
  items:Array.from({length:12},(_,i)=>({id:`ammo-${i}`,kind:'ammo',active:true,x:i,y:1})),
  enemies:[
    {id:'ordinary',kind:'scout',hp:10,maxHp:10,alive:true},
    {id:'stalker',kind:'ghost',hp:10,maxHp:10,alive:true,deathStalker:true,voidStalker:true},
    {id:'guardian',kind:'guardian',hp:30,maxHp:30,alive:true,keyGuardian:true,domainId:'ash'}
  ],
  doors:[],voidStalkers:['stalker'],deathStalkerId:'stalker',stalker:{spawnTimer:1},shops:[]
};
api.applyFloorBalance(balanceHost,{floor:15});
assert(balanceHost.enemies.find(e=>e.id==='ordinary').maxHp===15,'Floor 15 must increase ordinary enemy durability above baseline.');
assert(balanceHost.enemies.find(e=>e.id==='stalker').moveSpeedScale===0.66,'Floor 15 Death Stalker must use the fastest campaign pursuit scale.');
assert(balanceHost.items.filter(item=>item.kind==='ammo').length===7,'Floor 15 must trim spare ammunition to its configured pressure target.');
assert(balanceHost.stalker.spawnTimer===40000,'Floor 15 Count Loadula pressure must begin substantially earlier than mid-campaign.');

const introHost={items:[],enemies:[{id:'intro-stalker',kind:'ghost',hp:8,maxHp:8,alive:true,deathStalker:true,voidStalker:true}],doors:[],voidStalkers:['intro-stalker'],deathStalkerId:'intro-stalker',stalker:{spawnTimer:1},shops:[]};
api.applyFloorBalance(introHost,{floor:1});
assert(!introHost.enemies.some(enemy=>enemy.deathStalker),'Floor 1 must not immediately pressure a new character with the Death Stalker.');
assert(introHost.stalker.spawnTimer>=900000,'Floor 1 Count Loadula grace period must remain effectively dormant for the intended opening pace.');

console.log('Dungeon Carnage V10.42 fifteen-floor campaign runtime contract passed.');