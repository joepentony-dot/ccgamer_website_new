import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const source=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-r13-encounter-progression-runtime.js'),'utf8');
const bootstrapSource=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-bootstrap.js'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const encounters=[
  {roomId:1,key:'room-1',saveKey:'room-1:encounter',pressure:4,waves:3,elite:true,eliteSpec:{name:'RAIN REAVER'},event:{kind:'storm-ambush',trigger:'room-entry',oneShot:true},rewardFocus:'equipment',rewardTier:3,routeBonus:''},
  {roomId:2,key:'room-2',saveKey:'room-2:encounter',pressure:3,waves:2,elite:false,event:{kind:'web-descent',trigger:'objective-interact',oneShot:true},rewardFocus:'supplies',rewardTier:2,routeBonus:'alternate-route-cache'}
];
const windowObject={CCGLostSizzlerV142R12DynamicEncounterDirector:{},CCGWorld:{createHostState(){return {v142DynamicEncounters:{rooms:encounters}}}}};
vm.runInNewContext(source,{window:windowObject,console,JSON,Math},{filename:'v10-42-r13-encounter-progression-runtime.js'});
const api=windowObject.CCGLostSizzlerV142R13EncounterProgressionRuntime;
assert(api,'R13 encounter progression runtime must export its API.');
assert(bootstrapSource.includes('["v10-42-r13-encounter-progression-runtime.js","CCGLostSizzlerV142R13EncounterProgressionRuntime"]'),'Bootstrap must load R13 encounter progression.');
assert(bootstrapSource.indexOf('v10-42-r12-dynamic-encounter-director.js')<bootstrapSource.indexOf('v10-42-r13-encounter-progression-runtime.js'),'R13 must load after R12 encounter planning.');
assert(bootstrapSource.indexOf('v10-42-r13-encounter-progression-runtime.js')<bootstrapSource.indexOf('v10-42-r1-stability.js'),'R13 must remain before final stability ownership.');

const host=windowObject.CCGWorld.createHostState({});
const runtime=host.v142EncounterRuntime;
assert(runtime?.rooms?.length===2,'R13 must materialise every R12 encounter into shared runtime state.');
const elite=runtime.rooms.find(row=>row.roomId===1),web=runtime.rooms.find(row=>row.roomId===2);
assert(elite.waveTargets.length===3&&elite.waveTargets.every(value=>value>=2&&value<=7),'Elite encounter wave targets must be deterministic and bounded.');
assert(web.waveTargets.length===2,'Non-elite encounter must retain its planned wave count.');
assert(runtime.activate(1,'room-entry')===true,'Matching room-entry trigger must activate the encounter.');
assert(elite.eventFired===true,'One-shot room event must fire on first activation.');
assert(runtime.activate(1,'room-entry')===true&&elite.eventFired===true,'Repeated activation must not duplicate the one-shot event.');
for(const target of elite.waveTargets)runtime.reportDefeat(1,target);
assert(elite.eliteReady===true&&!elite.completed,'Elite encounter must gate completion on the elite defeat after its waves.');
assert(runtime.claimReward(1)===null,'Incomplete elite encounter must not pay its reward.');
assert(runtime.reportEliteDefeat(1)===true&&elite.completed===true,'Reporting the ready elite defeat must complete the encounter.');
const reward=runtime.claimReward(1);
assert(reward?.focus==='equipment'&&reward?.tier===3,'Completion reward must preserve the encounter build/reward focus.');
assert(runtime.claimReward(1)===null,'Encounter completion reward must be exactly once.');
assert(runtime.activate(2,'room-entry')===false,'Wrong trigger must not activate an objective-interaction encounter.');
assert(runtime.activate(2,'objective-interact')===true,'Matching objective trigger must activate the encounter.');
for(const target of web.waveTargets)runtime.reportDefeat(2,target);
assert(web.completed===true,'Non-elite encounter must resolve after its final planned wave.');
assert(runtime.claimReward(2)?.routeBonus==='alternate-route-cache','Alternate-route reward identity must survive runtime resolution.');

const saved=runtime.snapshot();
const host2=windowObject.CCGWorld.createHostState({});
host2.v142EncounterRuntime.restore(saved);
const restored=host2.v142EncounterRuntime.rooms.find(row=>row.roomId===1);
assert(restored.completed===true&&restored.eliteDefeated===true&&restored.rewardClaimed===true,'Snapshot/restore must retain elite completion and claimed reward state.');
assert(JSON.stringify(api.waveTargets(encounters[0]))===JSON.stringify(api.waveTargets(encounters[0])),'Wave targets must remain deterministic for the same encounter identity.');

for(const forbidden of ['fetch(','WebSocket','EventSource','supabase.from','render.com'])assert(!source.includes(forbidden),`R13 must remain local/browser-native and not introduce ${forbidden}.`);
assert(!source.includes('Math.random'),'R13 progression must remain deterministic.');
assert(!source.includes('localStorage')&&!source.includes('sessionStorage'),'R13 must not create a parallel persistence authority.');
assert(!source.includes('setInterval(')&&!source.includes('requestAnimationFrame('),'R13 must not create a second AI/simulation/render owner.');
console.log('Lost Sizzler V10.42 r13 encounter progression runtime contract passed.');
