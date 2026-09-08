import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const source=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-r12-dynamic-encounter-director.js'),'utf8');
const bootstrapSource=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-bootstrap.js'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};
const hash32=input=>{let h=2166136261>>>0;for(const ch of String(input)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0};

const plans=[
  {saveKey:'v142-r7:F1:R1:a',floor:1,roomId:1,biome:'threshold',role:'great-hall',grandHall:true,objective:{type:'hold-great-hall',risk:4,rewardTier:2,rewardFocus:'equipment',elite:true,optional:false}},
  {saveKey:'v142-r7:F2:R2:b',floor:2,roomId:2,biome:'iron-keep',role:'alternate-route',rareRole:'alternate-route',objective:{type:'claim-elite-cache',risk:3,rewardTier:2,rewardFocus:'artefact',optional:true,routeBonus:'alternate-route-cache'}},
  {saveKey:'v142-r7:F3:R3:c',floor:3,roomId:3,biome:'moss-crypt',role:'web-nest',objective:{type:'cut-web-anchors',risk:4,rewardTier:3,rewardFocus:'supplies',optional:false}},
  {saveKey:'v142-r7:F3:R4:d',floor:3,roomId:4,biome:'moss-crypt',role:'ossuary',objective:{type:'break-bone-totems',risk:5,rewardTier:3,rewardFocus:'dossier',optional:false}},
  {saveKey:'v142-r7:F4:R5:e',floor:4,roomId:5,biome:'ember-depths',role:'standard',objective:{type:'survive-hazard',risk:5,rewardTier:3,rewardFocus:'equipment',optional:false}},
  {saveKey:'v142-r7:F5:R6:f',floor:5,roomId:6,biome:'sigil-sanctum',role:'secret',rareRole:'secret',objective:{type:'recover-dossier',risk:3,rewardTier:3,rewardFocus:'dossier',optional:true,routeBonus:'secret-cache'}}
];
const host=()=>({v142RoomObjectives:{version:'V10.42-r7',plans}});
const windowObject={CCGLostSizzlerV142R7RoomObjectiveDirector:{hash32},CCGWorld:{createHostState(){return host()}}};
vm.runInNewContext(source,{window:windowObject,console},{filename:'v10-42-r12-dynamic-encounter-director.js'});
const api=windowObject.CCGLostSizzlerV142R12DynamicEncounterDirector;
assert(api,'R12 dynamic encounter director must export its API.');
assert(bootstrapSource.includes('["v10-42-r12-dynamic-encounter-director.js","CCGLostSizzlerV142R12DynamicEncounterDirector"]'),'Bootstrap must load R12 dynamic encounters.');
assert(bootstrapSource.indexOf('v10-42-r10-breakable-objective-runtime.js')<bootstrapSource.indexOf('v10-42-r12-dynamic-encounter-director.js'),'R12 must build after the room/objective interaction foundation.');
assert(bootstrapSource.indexOf('v10-42-r12-dynamic-encounter-director.js')<bootstrapSource.indexOf('v10-42-r1-stability.js'),'R12 must remain before the final stability owner.');

const first=windowObject.CCGWorld.createHostState({});
const rows=first.v142DynamicEncounters?.rooms||[];
assert(rows.length===plans.length,'Every planned room must receive deterministic encounter direction.');
assert(rows.find(r=>r.roomId===1)?.eliteSpec?.name==='RAIN REAVER','Threshold great halls must support the Rain Reaver elite identity.');
assert(rows.find(r=>r.roomId===3)?.family==='web'&&rows.find(r=>r.roomId===3)?.event.kind==='web-descent','Spider/web objectives must receive brood-specific encounter direction.');
assert(rows.find(r=>r.roomId===4)?.family==='crypt'&&rows.find(r=>r.roomId===4)?.eliteSpec?.name==='BONE MARSHAL','Crypt objectives must receive skeleton-command elite direction.');
assert(rows.find(r=>r.roomId===5)?.event.kind==='ember-surge','Ember Depths must receive biome-specific pressure events.');
assert(rows.find(r=>r.roomId===6)?.event.kind==='rune-lock','Sigil Sanctum must receive rune-specific dynamic events.');
for(const row of rows){
  assert(row.pressure>=1&&row.pressure<=5,'Encounter pressure must stay on the bounded five-step scale.');
  assert(row.waves>=1&&row.waves<=3,'Encounter waves must stay bounded to three.');
  assert(row.rewardTier>=1&&row.rewardTier<=4,'Encounter reward amplification must remain bounded.');
  assert(row.event?.oneShot===true,'Dynamic room events must be one-shot and save-safe by identity.');
  assert(row.saveKey.endsWith(':encounter'),'Encounter state must expose a stable re-derivable save key.');
}
const snapshot=JSON.stringify(rows);
const second=windowObject.CCGWorld.createHostState({});
assert(JSON.stringify(second.v142DynamicEncounters.rooms)===snapshot,'Same room plans must produce identical elite/event direction.');

for(const forbidden of ['fetch(','WebSocket','EventSource','supabase.from','render.com'])assert(!source.includes(forbidden),`R12 must remain local/browser-native and not introduce ${forbidden}.`);
assert(!source.includes('Math.random'),'R12 encounters must remain deterministic.');
assert(!source.includes('localStorage')&&!source.includes('sessionStorage'),'R12 must not create a parallel save authority.');
assert(!source.includes('setInterval(')&&!source.includes('requestAnimationFrame('),'R12 must not create a second simulation/render owner.');
console.log('Lost Sizzler V10.42 r12 deterministic dynamic encounter contract passed.');
