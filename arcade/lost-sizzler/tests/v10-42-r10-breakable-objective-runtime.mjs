import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const read=name=>fs.readFileSync(path.join(root,'arcade/lost-sizzler/js',name),'utf8');
const r7Source=read('v10-42-r7-room-objective-director.js');
const r8Source=read('v10-42-r8-breakable-interaction-director.js');
const r9Source=read('v10-42-r9-breakable-presentation-director.js');
const source=read('v10-42-r10-breakable-objective-runtime.js');
const bootstrapSource=read('v10-42-bootstrap.js');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const runState={floor:3,seed:'R10-OBJECTIVE-SEED'};
const worldState={startRoomId:0,exitRoomId:9,rooms:[
  {id:1,x:1,y:1,w:8,h:8,spiderNest:true,v142Environment:{biome:'bone',role:'web-nest',rareRole:'alternate-route'}},
  {id:2,x:12,y:1,w:8,h:8,skeletonHorde:true,v142Environment:{biome:'bone',role:'ossuary',rareRole:'hidden-alcove'}},
  {id:3,x:23,y:1,w:8,h:8,v142Environment:{biome:'ash',role:'chamber',rareRole:''}}
]};
const ctx={save(){},restore(){},fillRect(){},strokeRect(){},beginPath(){},ellipse(){},fill(){},stroke(){},moveTo(){},lineTo(){},quadraticCurveTo(){},arc(){},closePath(){},translate(){},rotate(){}};
const document={body:{classList:{contains:()=>false},dataset:{v141R47PerformanceTier:'normal'}}};
const windowObject={CCG_CONFIG:{maxFloors:5,tile:42},CCGWorld:{createHostState(){return {items:[],enemies:[],chests:[],doors:[],shops:[]}}},drawTile(){return 'base'}};
const sandbox={window:windowObject,console,run:runState,host:null,Map,Set,WeakMap,WeakSet,Object,Math,Date,document,ctx,performance:{now:()=>1000},matchMedia:()=>({matches:false}),ws:(x,y)=>({x:x*42,y:y*42})};
vm.runInNewContext(r7Source,sandbox,{filename:'r7'});
vm.runInNewContext(r8Source,sandbox,{filename:'r8'});
vm.runInNewContext(r9Source,sandbox,{filename:'r9'});
vm.runInNewContext(source,sandbox,{filename:'r10'});

const api=windowObject.CCGLostSizzlerV142R10BreakableObjectiveRuntime;
const r8=windowObject.CCGLostSizzlerV142R8BreakableInteractionDirector;
assert(api,'R10 must export its runtime API.');
assert(bootstrapSource.includes('["v10-42-r10-breakable-objective-runtime.js","CCGLostSizzlerV142R10BreakableObjectiveRuntime"]'),'Authoritative bootstrap must load R10.');
assert(bootstrapSource.indexOf('v10-42-r9-breakable-presentation-director.js')<bootstrapSource.indexOf('v10-42-r10-breakable-objective-runtime.js'),'R10 must consume the proven R8/R9 breakable stack.');
assert(bootstrapSource.indexOf('v10-42-r10-breakable-objective-runtime.js')<bootstrapSource.indexOf('v10-42-r1-stability.js'),'R10 must remain before final V10.42 stability ownership.');

let host=windowObject.CCGWorld.createHostState(worldState);sandbox.host=host;
assert(host.v142BreakableObjectiveRuntime?.rooms?.length===3,'Every materialised dungeon room must receive shared R10 objective runtime state.');

const spiderRoom=host.v142BreakableInteractions.rooms.find(room=>room.roomId===1);
const spiderRuntime=api.state.rooms.get(spiderRoom.key);
if(spiderRuntime.type==='cut-web-anchors'){
  assert(spiderRuntime.target>=1&&spiderRuntime.target<=spiderRuntime.eligibleIds.length,'Web-anchor target must be achievable from deterministic web scenery.');
  for(const id of spiderRuntime.eligibleIds.slice(0,spiderRuntime.target))r8.damageBreakable(spiderRoom,id,99);
  assert(spiderRuntime.completed===true,'Destroying the required web scenery must complete CUT THE WEB ANCHORS.');
  assert(spiderRuntime.rewardClaimed===true&&spiderRuntime.reward?.kind==='web-cache','Web objective completion must award exactly one deterministic web cache.');
  const rewards=api.state.rewards;r8.damageBreakable(spiderRoom,spiderRuntime.eligibleIds[0],99);assert(api.state.rewards===rewards,'Completed web objectives must never duplicate their completion reward.');
}

const cryptRoom=host.v142BreakableInteractions.rooms.find(room=>room.roomId===2);
const cryptRuntime=api.state.rooms.get(cryptRoom.key);
if(cryptRuntime.type==='break-bone-totems'){
  assert(cryptRuntime.target>=1&&cryptRuntime.target<=cryptRuntime.eligibleIds.length,'Bone-totem target must be achievable from deterministic crypt scenery.');
  for(const id of cryptRuntime.eligibleIds.slice(0,cryptRuntime.target))r8.damageBreakable(cryptRoom,id,99);
  assert(cryptRuntime.completed===true&&cryptRuntime.reward?.kind==='crypt-reliquary','Crypt breakable objective must resolve to one reliquary reward.');
}

const ashRoom=host.v142BreakableInteractions.rooms.find(room=>room.roomId===3);
const hazardous=[...ashRoom.props.values()].find(prop=>prop.hazardous);
if(hazardous){
  const result=r8.damageBreakable(ashRoom,hazardous.id,99);
  const runtime=api.state.rooms.get(ashRoom.key);
  assert(runtime.hazardEvents.length===1,'Destroying an Ember brazier must create one deterministic ember-surge consequence.');
  assert(runtime.hazardEvents[0].damage===1&&runtime.hazardEvents[0].durationMs===900,'Ember consequence must remain bounded and gameplay-readable.');
  r8.damageBreakable(ashRoom,hazardous.id,99);assert(runtime.hazardEvents.length===1,'Destroyed hazardous scenery must not duplicate Ember consequences.');
  assert(result.hazard===null||result.hazard?.kind==='ember-surge','Damage response may expose the deterministic Ember hazard without inventing another owner.');
}

const saved=api.snapshot();
assert(saved.version==='V10.42-r10'&&saved.rooms.length===3,'R10 must expose save-safe objective progress without browser storage ownership.');
const before=JSON.stringify(saved);
const sandbox2={window:{CCG_CONFIG:{maxFloors:5,tile:42},CCGWorld:{createHostState(){return {items:[],enemies:[],chests:[],doors:[],shops:[]}}},drawTile(){return 'base'}},console,run:runState,host:null,Map,Set,WeakMap,WeakSet,Object,Math,Date,document,ctx,performance:{now:()=>1000},matchMedia:()=>({matches:false}),ws:(x,y)=>({x:x*42,y:y*42})};
vm.runInNewContext(r7Source,sandbox2);vm.runInNewContext(r8Source,sandbox2);vm.runInNewContext(r9Source,sandbox2);vm.runInNewContext(source,sandbox2);
const host2=sandbox2.window.CCGWorld.createHostState(worldState);sandbox2.host=host2;
assert(sandbox2.window.CCGLostSizzlerV142R10BreakableObjectiveRuntime.restore(saved)===true,'R10 snapshot must restore onto a deterministically regenerated dungeon.');
assert(JSON.stringify(sandbox2.window.CCGLostSizzlerV142R10BreakableObjectiveRuntime.snapshot())===before,'Restored R10 objective state must reproduce the saved deterministic progress.');

for(const forbidden of ['fetch(','WebSocket','EventSource','supabase.from','render.com','localStorage','sessionStorage','setInterval(','requestAnimationFrame(','Math.random'])assert(!source.includes(forbidden),`R10 runtime must not introduce ${forbidden}.`);
console.log('Lost Sizzler V10.42 r10 breakable objective runtime contract passed.');