import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const source=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-r7-room-objective-director.js'),'utf8');
const bootstrapSource=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-bootstrap.js'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const runState={floor:1,seed:'R7-DETERMINISTIC-SEED'};
const worldState={
  startRoomId:0,exitRoomId:6,
  rooms:[
    {id:0,x:1,y:1,w:6,h:6,v142Environment:{biome:'threshold',role:'arrival',rareRole:''}},
    {id:1,x:10,y:1,w:9,h:8,grandHall:true,v142Environment:{biome:'threshold',role:'great-hall',rareRole:'great-hall'}},
    {id:2,x:22,y:1,w:7,h:7,optional:true,v142Environment:{biome:'threshold',role:'secret',rareRole:'alternate-route'}},
    {id:3,x:1,y:12,w:8,h:7,spiderNest:true,v142Environment:{biome:'threshold',role:'web-nest',rareRole:''}},
    {id:4,x:12,y:12,w:8,h:7,skeletonHorde:true,v142Environment:{biome:'bone',role:'ossuary',rareRole:''}},
    {id:5,x:23,y:12,w:7,h:7,sanctuary:true,v142Environment:{biome:'threshold',role:'sanctuary',rareRole:''}},
    {id:6,x:31,y:12,w:6,h:6,v142Environment:{biome:'threshold',role:'exit',rareRole:''}}
  ]
};
const baseHost=()=>({items:[],enemies:[],chests:[],doors:[],shops:[]});
const windowObject={
  CCG_CONFIG:{maxFloors:5},
  CCGWorld:{createHostState(){return baseHost()}}
};
const sandbox={window:windowObject,console,run:runState};
vm.runInNewContext(source,sandbox,{filename:'v10-42-r7-room-objective-director.js'});
const api=windowObject.CCGLostSizzlerV142R7RoomObjectiveDirector;
assert(api,'R7 room objective director must export its runtime API.');
assert(bootstrapSource.includes('["v10-42-r7-room-objective-director.js","CCGLostSizzlerV142R7RoomObjectiveDirector"]'),'Authoritative V10.42 bootstrap must load the R7 room objective director.');
assert(bootstrapSource.indexOf('v10-42-r6-biome-environment-director.js')<bootstrapSource.indexOf('v10-42-r7-room-objective-director.js'),'R7 objective planning must build on R6 biome metadata.');
assert(bootstrapSource.indexOf('v10-42-r7-room-objective-director.js')<bootstrapSource.indexOf('v10-42-r1-stability.js'),'Dungeon evolution must remain ahead of the final stability owner.');

const first=windowObject.CCGWorld.createHostState(worldState);
assert(first.v142RoomObjectives?.version==='V10.42-r7','Host state must expose the R7 room objective plan.');
assert(first.v142RoomObjectives.plans.length===worldState.rooms.length,'Every authored room must receive one deterministic objective plan.');
assert(worldState.rooms.every(room=>room.v142Objective&&Array.isArray(room.v142Breakables)),'Each room must expose objective and breakable-scene descriptors.');

const great=first.v142RoomObjectives.plans.find(plan=>plan.roomId===1);
assert(great.objective.elite||['hold-great-hall','claim-elite-cache'].includes(great.objective.type),'Great halls must drive elite or high-pressure objective direction.');
assert(great.objective.rewardTier>=2,'Great-hall risk must pay above baseline rewards.');
const alternate=first.v142RoomObjectives.plans.find(plan=>plan.roomId===2);
assert(alternate.objective.optional===true,'Alternate-route objectives must remain optional.');
assert(alternate.objective.routeBonus==='alternate-route-cache','Alternate routes must carry a deterministic route incentive.');
const web=first.v142RoomObjectives.plans.find(plan=>plan.roomId===3);
assert(['cut-web-anchors','purge-brood','rescue-cocooned-scout'].includes(web.objective.type),'Spider rooms must receive spider-specific objective direction.');
assert(web.breakables.some(prop=>['web-sac','hanging-cocoon'].includes(prop.kind)),'Spider rooms must include breakable web/cocoon scenery in their local furnishing pool.');
const crypt=first.v142RoomObjectives.plans.find(plan=>plan.roomId===4);
assert(['break-bone-totems','silence-crypt-guard','recover-reliquary'].includes(crypt.objective.type),'Crypt rooms must receive crypt/skeleton-specific objective direction.');
assert(crypt.breakables.some(prop=>['bone-pile','burial-urn'].includes(prop.kind)),'Crypt rooms must include breakable bone/urn scenery.');
for(const plan of first.v142RoomObjectives.plans){
  assert(plan.objective.risk>=1&&plan.objective.risk<=5,'Objective risk must stay within the authored five-step scale.');
  assert(plan.objective.rewardTier>=1&&plan.objective.rewardTier<=4,'Objective reward tier must stay within the authored four-step scale.');
  assert(api.REWARD_FOCUS.includes(plan.objective.rewardFocus),'Each room must make a meaningful deterministic reward focus choice.');
  assert(plan.breakables.length>=2&&plan.breakables.length<=5,'Room dressing must stay within the bounded breakable-scenery budget.');
  assert(plan.saveKey.startsWith(`v142-r7:F${plan.floor}:R${plan.roomId}:`),'Room objective identity must expose a stable re-derivable save key.');
}

const firstSnapshot=JSON.stringify(first.v142RoomObjectives.plans);
const second=windowObject.CCGWorld.createHostState(worldState);
assert(JSON.stringify(second.v142RoomObjectives.plans)===firstSnapshot,'Same run seed, floor and room graph must produce identical objectives, rewards and breakable scenery.');
runState.seed='R7-ALTERNATE-SEED';
const changed=windowObject.CCGWorld.createHostState(worldState);
assert(JSON.stringify(changed.v142RoomObjectives.plans)!==firstSnapshot,'Changing the authoritative run seed must vary dungeon objective presentation and rewards.');

for(const forbidden of ['fetch(','WebSocket','EventSource','supabase.from','render.com'])assert(!source.includes(forbidden),`R7 objective runtime must remain local/browser-native and must not introduce ${forbidden}.`);
assert(!source.includes('Math.random'),'Room objectives and breakable scenery must not consume nondeterministic gameplay RNG.');
assert(!source.includes('localStorage')&&!source.includes('sessionStorage'),'R7 must derive save-safe descriptors from authoritative run/world state rather than creating a parallel save store.');
assert(!source.includes('setInterval(')&&!source.includes('requestAnimationFrame('),'R7 must not introduce a competing timing/render owner.');

console.log('Lost Sizzler V10.42 r7 deterministic room objective contract passed.');