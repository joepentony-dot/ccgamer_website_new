import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const r7Source=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-r7-room-objective-director.js'),'utf8');
const r8Source=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-r8-breakable-interaction-director.js'),'utf8');
const source=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-r9-breakable-presentation-director.js'),'utf8');
const bootstrapSource=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-bootstrap.js'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const runState={floor:4,seed:'R9-PRESENTATION-SEED'};
const worldState={startRoomId:0,exitRoomId:1,rooms:[
  {id:0,x:1,y:1,w:8,h:8,v142Environment:{biome:'ash',role:'chamber',rareRole:''}},
  {id:1,x:12,y:1,w:8,h:8,spiderNest:true,v142Environment:{biome:'ash',role:'web-nest',rareRole:'alternate-route'}}
]};
const ctx={save(){},restore(){},fillRect(){},strokeRect(){},beginPath(){},ellipse(){},fill(){},stroke(){},moveTo(){},lineTo(){},quadraticCurveTo(){},arc(){},closePath(){},translate(){},rotate(){}};
const document={body:{classList:{contains:()=>false},dataset:{v141R47PerformanceTier:'normal'}}};
const windowObject={CCG_CONFIG:{maxFloors:5,tile:42},CCGWorld:{createHostState(){return {items:[],enemies:[],chests:[],doors:[],shops:[]}}},drawTile(){return 'base-tile'}};
const sandbox={window:windowObject,console,run:runState,Map,Set,WeakMap,WeakSet,Object,Math,Date,document,ctx,performance:{now:()=>1000},matchMedia:()=>({matches:false}),ws:(x,y)=>({x:x*42,y:y*42})};
vm.runInNewContext(r7Source,sandbox,{filename:'v10-42-r7-room-objective-director.js'});
vm.runInNewContext(r8Source,sandbox,{filename:'v10-42-r8-breakable-interaction-director.js'});
vm.runInNewContext(source,sandbox,{filename:'v10-42-r9-breakable-presentation-director.js'});

const api=windowObject.CCGLostSizzlerV142R9BreakablePresentationDirector,r8=windowObject.CCGLostSizzlerV142R8BreakableInteractionDirector;
assert(api,'R9 breakable presentation director must export its runtime API.');
assert(windowObject.drawTile.__ccgV142R9Breakables===true,'R9 must compose with the established tile renderer instead of owning a new frame loop.');
assert(bootstrapSource.includes('["v10-42-r9-breakable-presentation-director.js","CCGLostSizzlerV142R9BreakablePresentationDirector"]'),'Authoritative V10.42 bootstrap must load R9.');
assert(bootstrapSource.indexOf('v10-42-r8-breakable-interaction-director.js')<bootstrapSource.indexOf('v10-42-r9-breakable-presentation-director.js'),'R9 must consume R8 shared interaction state.');
assert(bootstrapSource.indexOf('v10-42-r9-breakable-presentation-director.js')<bootstrapSource.indexOf('v10-42-r1-stability.js'),'R9 must remain ahead of the final stability owner.');

const host=windowObject.CCGWorld.createHostState(worldState);sandbox.host=host;
const room=host.v142BreakableInteractions.rooms[0],prop=[...room.props.values()][0];
assert(prop,'R9 test dungeon must contain materialised breakable scenery.');
const style=api.styleFor(prop);
assert(style&&style.palette&&style.health===1,'R9 must derive a full-health material presentation from R8 state.');
assert(api.materialFor('ember-brazier')==='ember','Ember furniture must receive a dedicated glowing material identity.');
assert(api.materialFor('web-sac')==='web','Spider/web furniture must receive a dedicated web material identity.');
assert(api.materialFor('burial-urn')==='bone','Crypt burial furniture must receive a bone/crypt material identity.');
assert(api.materialFor('crystal-plinth')==='arcane','Sigil/crystal furniture must receive an arcane material identity.');

const beforeDraw=api.state.propsDrawn;
windowObject.drawTile(prop.x,prop.y);
assert(api.state.propsDrawn>beforeDraw,'Established tile rendering must draw breakable scenery on its deterministic dungeon tile.');
assert(api.propsAt(prop.x,prop.y,host).some(row=>row.prop===prop),'R9 tile index must resolve shared R8 scenery without creating duplicate interaction state.');

const fxBefore=api.state.fx.length;
let result;
for(let i=0;i<prop.maxHp;i++)result=r8.damageBreakable(room,prop.id,1);
assert(prop.destroyed===true,'R9 presentation composition must preserve R8 destruction semantics.');
assert(api.state.fx.length>fxBefore,'Damage/destruction must feed bounded presentation feedback into R9.');
assert(result?.fx&&/burst/.test(result.fx.kind),'Final destruction must retain the deterministic R8 burst descriptor.');
assert(api.state.destructions>=1,'R9 must count captured destruction bursts for diagnostics.');
assert(room.destroyedCount===1,'Rendering/feedback composition must not duplicate authoritative destruction progress.');

const duplicateCount=room.destroyedCount;
r8.damageBreakable(room,prop.id,99);
assert(room.destroyedCount===duplicateCount,'Presentation wrapping must preserve R8 exactly-once destroyed-scenery ownership.');
assert(api.state.fx.length<=72,'R9 feedback queue must remain bounded for long sessions.');

for(const forbidden of ['fetch(','WebSocket','EventSource','supabase.from','render.com','localStorage','sessionStorage','setInterval(','requestAnimationFrame(','Math.random'])assert(!source.includes(forbidden),`R9 presentation runtime must not introduce ${forbidden}.`);
console.log('Lost Sizzler V10.42 r9 breakable scenery presentation contract passed.');