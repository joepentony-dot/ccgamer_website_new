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
  CCGSystems:{decorate(_w,h){return h},updateObjective(){return false},objectiveText(){return'base objective'}},
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
assert(source.includes('hostState.exitSigilCollected=false;hostState.exitOpen=true'),'Floors 1–4 must open stairs without pretending the final Sigil has been collected.');

const expected=[6,5,5,5,5],seen=[];
for(let floor=1;floor<=5;floor++){
  const slice=api.floorPickupSlice('TEST-SEED',floor);
  assert(slice.length===expected[floor-1],`Floor ${floor} must receive ${expected[floor-1]} A-Z game pickups.`);
  seen.push(...slice.map(row=>row.letter));
}
assert(seen.length===26,'Full campaign must distribute exactly 26 collectible letters.');
assert(new Set(seen).size===26,'A letter must not be duplicated between campaign floors.');
assert(seen.sort().join('')===letters.join(''),'Full campaign must cover A through Z exactly once.');

assert(api.globalKeyCount({v142ClaimedDomains:['iron','bone','ash','iron']})===3,'Global Key count must deduplicate domain IDs.');
assert(api.domainForFloor({floor:1})===null,'Floor 1 must not consume one of the three global Keys.');
assert(api.domainForFloor({floor:2})?.id==='iron','Floor 2 must own the Iron Key domain.');
assert(api.domainForFloor({floor:3})?.id==='bone','Floor 3 must own the Bone Key domain.');
assert(api.domainForFloor({floor:4})?.id==='ash','Floor 4 must own the Ash Key domain.');
assert(api.domainForFloor({floor:5})===null,'Floor 5 must be reserved for the completed Sigil rather than a fourth Key.');

const balanceHost={
  items:Array.from({length:12},(_,i)=>({id:`ammo-${i}`,kind:'ammo',active:true,x:i,y:1})),
  enemies:[
    {id:'ordinary',kind:'scout',hp:10,maxHp:10,alive:true},
    {id:'stalker',kind:'ghost',hp:10,maxHp:10,alive:true,deathStalker:true,voidStalker:true},
    {id:'guardian',kind:'guardian',hp:30,maxHp:30,alive:true,keyGuardian:true,domainId:'ash'}
  ],
  doors:[],voidStalkers:['stalker'],deathStalkerId:'stalker',stalker:{spawnTimer:1},shops:[]
};
api.applyFloorBalance(balanceHost,{floor:5});
assert(balanceHost.enemies.find(e=>e.id==='ordinary').maxHp===12,'Floor 5 must increase ordinary enemy durability above baseline.');
assert(balanceHost.enemies.find(e=>e.id==='stalker').moveSpeedScale===0.82,'Floor 5 Death Stalker must use the fastest campaign pursuit scale.');
assert(balanceHost.items.filter(item=>item.kind==='ammo').length===8,'Floor 5 must trim spare ammunition to its configured pressure target.');
assert(balanceHost.stalker.spawnTimer===45000,'Floor 5 Count Loadula pressure must begin substantially earlier than mid-campaign.');

const introHost={items:[],enemies:[{id:'intro-stalker',kind:'ghost',hp:8,maxHp:8,alive:true,deathStalker:true,voidStalker:true}],doors:[],voidStalkers:['intro-stalker'],deathStalkerId:'intro-stalker',stalker:{spawnTimer:1},shops:[]};
api.applyFloorBalance(introHost,{floor:1});
assert(!introHost.enemies.some(enemy=>enemy.deathStalker),'Floor 1 must not immediately pressure a new character with the Death Stalker.');
assert(introHost.stalker.spawnTimer>=900000,'Floor 1 Count Loadula grace period must remain effectively dormant for the intended opening pace.');

console.log('Lost Sizzler V10.42 five-depth campaign runtime contract passed.');