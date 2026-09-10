import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const r7Source=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-r7-room-objective-director.js'),'utf8');
const source=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-r8-breakable-interaction-director.js'),'utf8');
const bootstrapSource=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-bootstrap.js'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const runState={floor:3,seed:'R8-BREAKABLE-SEED'};
const worldState={startRoomId:0,exitRoomId:1,rooms:[
  {id:0,x:1,y:1,w:7,h:7,skeletonHorde:true,v142Environment:{biome:'bone',role:'ossuary',rareRole:''}},
  {id:1,x:12,y:1,w:8,h:7,optional:true,v142Environment:{biome:'bone',role:'secret',rareRole:'alternate-route'}}
]};
const windowObject={CCG_CONFIG:{maxFloors:5},CCGWorld:{createHostState(){return {items:[],enemies:[],chests:[],doors:[],shops:[]}}}};
const sandbox={window:windowObject,console,run:runState,Map,Set,WeakSet};
vm.runInNewContext(r7Source,sandbox,{filename:'v10-42-r7-room-objective-director.js'});
vm.runInNewContext(source,sandbox,{filename:'v10-42-r8-breakable-interaction-director.js'});
const api=windowObject.CCGLostSizzlerV142R8BreakableInteractionDirector;
assert(api,'R8 breakable interaction director must export its runtime API.');
assert(bootstrapSource.includes('["v10-42-r8-breakable-interaction-director.js","CCGLostSizzlerV142R8BreakableInteractionDirector"]'),'Authoritative V10.42 bootstrap must load R8.');
assert(bootstrapSource.indexOf('v10-42-r7-room-objective-director.js')<bootstrapSource.indexOf('v10-42-r8-breakable-interaction-director.js'),'R8 must consume R7 room descriptors.');
assert(bootstrapSource.indexOf('v10-42-r8-breakable-interaction-director.js')<bootstrapSource.indexOf('v10-42-r1-stability.js'),'R8 must remain ahead of the final stability owner.');

const host=windowObject.CCGWorld.createHostState(worldState);
assert(host.v142BreakableInteractions?.version==='V10.42-r8','Host state must expose shared R8 breakable interaction state.');
assert(host.v142BreakableInteractions.rooms.length===2,'Every planned room must materialise one shared interaction room.');
const room=host.v142BreakableInteractions.rooms[0];
const prop=[...room.props.values()][0];
assert(prop&&prop.maxHp>=1,'Breakable scenery must materialise with bounded durability.');
const before=api.snapshot();
let result;
for(let i=0;i<prop.maxHp;i++)result=api.damageBreakable(room,prop.id,1);
assert(prop.destroyed===true&&prop.hp===0,'Repeated damage must destroy scenery exactly at zero durability.');
assert(room.destroyedCount===1,'One destroyed prop must advance shared room destruction progress once.');
const rewardCount=api.state.rewards;
const duplicate=api.damageBreakable(room,prop.id,99);
assert(duplicate.changed===false&&room.destroyedCount===1,'Destroyed scenery must reject duplicate destruction.');
assert(api.state.rewards===rewardCount,'Destroyed scenery must never mint its deterministic reward twice.');
assert(result.fx&&['debris-burst','web-burst','ember-burst'].includes(result.fx.kind),'Destruction must emit deterministic presentation feedback metadata.');

const snapshot=api.snapshot();
assert(snapshot.version==='V10.42-r8'&&snapshot.rooms[0].props.some(row=>row.id===prop.id&&row.destroyed),'Snapshot must preserve destroyed/reward-claimed state for the authoritative save owner.');
const freshWindow={CCG_CONFIG:{maxFloors:5},CCGWorld:{createHostState(){return {items:[],enemies:[],chests:[],doors:[],shops:[]}}}};
const freshSandbox={window:freshWindow,console,run:runState,Map,Set,WeakSet};
vm.runInNewContext(r7Source,freshSandbox);vm.runInNewContext(source,freshSandbox);
const freshHost=freshWindow.CCGWorld.createHostState(worldState),freshApi=freshWindow.CCGLostSizzlerV142R8BreakableInteractionDirector;
assert(freshApi.restore(snapshot)===true,'R8 snapshot must restore into a deterministically re-materialised dungeon.');
const restoredRoom=freshHost.v142BreakableInteractions.rooms[0],restored=restoredRoom.props.get(prop.id);
assert(restored.destroyed===true&&restored.rewardClaimed===prop.rewardClaimed,'Restore must retain exactly-once destruction/reward state.');

const repeat=freshApi.outcomeFor(freshHost.v142RoomObjectives.plans[0],freshHost.v142RoomObjectives.plans[0].breakables[0]);
const original=api.outcomeFor(host.v142RoomObjectives.plans[0],host.v142RoomObjectives.plans[0].breakables[0]);
assert(JSON.stringify(repeat)===JSON.stringify(original),'Reward outcomes must be deterministic for the same authoritative run/room/prop identity.');
assert(JSON.stringify(before)!==JSON.stringify(snapshot),'Interaction snapshot must change only after shared breakable state changes.');
for(const forbidden of ['fetch(','WebSocket','EventSource','supabase.from','render.com','localStorage','sessionStorage','setInterval(','requestAnimationFrame(','Math.random'])assert(!source.includes(forbidden),`R8 interaction runtime must not introduce ${forbidden}.`);
console.log('Lost Sizzler V10.42 r8 deterministic breakable interaction contract passed.');