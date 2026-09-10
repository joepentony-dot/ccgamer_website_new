import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const source=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-r6-biome-environment-director.js'),'utf8');
const configSource=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/config.js'),'utf8');
const bootstrapSource=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-bootstrap.js'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const configSandbox={window:{}};
vm.runInNewContext(configSource,configSandbox,{filename:'config.js'});
const config=configSandbox.window.CCG_CONFIG;
const fakeDocument={
  body:{dataset:{},classList:{contains(){return false}}},
  addEventListener(){},
  querySelector(){return null},
  querySelectorAll(){return[]},
  getElementById(){return null}
};
const worldState={
  startRoomId:0,exitRoomId:4,
  map:Array.from({length:24},()=>Array(36).fill(0)),
  rooms:[
    {id:0,x:1,y:1,w:6,h:6},
    {id:1,x:9,y:1,w:7,h:7,grandHall:true},
    {id:2,x:18,y:1,w:7,h:7,optional:true},
    {id:3,x:9,y:11,w:7,h:7,sanctuary:true},
    {id:4,x:20,y:12,w:7,h:7}
  ],
  dungeonVariety:{greatHalls:[{cells:[{x:10,y:2}]}],shortcuts:[],parallelLoops:[{cells:[{x:19,y:2}]}],alcoves:[]}
};
const runState={floor:1,seed:'R6-DETERMINISTIC-SEED'};
const baseHost=()=>({items:[],enemies:[],chests:[],doors:[],shops:[],spiderNest:null,skeletonHorde:null});
const windowObject={
  CCG_CONFIG:config,
  CCGWorld:{
    createHostState(){return baseHost()},
    roomAt(w,x,y){return w.rooms.find(room=>x>=room.x&&x<=room.x+room.w&&y>=room.y&&y<=room.y+room.h)?.id??-1}
  }
};
const sandbox={
  window:windowObject,
  document:fakeDocument,
  console,
  run:runState,
  addEventListener(){},
  matchMedia(){return{matches:false}},
  performance:{now(){return 1000}}
};
vm.runInNewContext(source,sandbox,{filename:'v10-42-r6-biome-environment-director.js'});
const api=windowObject.CCGLostSizzlerV142R6BiomeEnvironmentDirector;
assert(api,'R6 biome environment director must export its runtime API.');
assert(Object.keys(api.BIOMES).join(',')==='threshold,iron,bone,ash,sigil','R6 must provide one authored visual biome for each five-depth campaign floor.');
assert(bootstrapSource.includes('["v10-42-r6-biome-environment-director.js","CCGLostSizzlerV142R6BiomeEnvironmentDirector"]'),'Authoritative V10.42 bootstrap must load the R6 environment director.');
assert(bootstrapSource.indexOf('v10-42-r6-biome-environment-director.js')<bootstrapSource.indexOf('v10-42-r1-stability.js'),'Presentation evolution must load before the final V10.42 stability owner.');

const first=windowObject.CCGWorld.createHostState(worldState);
assert(first.v142Environment?.biome==='threshold','Floor 1 must resolve to the ruined Threshold environment.');
assert(first.v142Environment?.weather==='rain','Threshold environment must carry local rain ambience.');
assert(first.v142Environment.roomProfiles.length===worldState.rooms.length,'Every generated room must receive deterministic environment metadata.');
assert(worldState.rooms[1].v142Environment.rareRole==='great-hall','V10.19 great-hall structure must feed the richer room presentation layer.');
assert(worldState.rooms[2].v142Environment.role==='secret','Optional rooms must retain a distinct secret-room presentation role.');
assert(worldState.rooms[3].v142Environment.role==='sanctuary','Sanctuary rooms must remain recognizable to the environment director.');

const snapshot=JSON.stringify(first.v142Environment.roomProfiles);
const second=windowObject.CCGWorld.createHostState(worldState);
assert(JSON.stringify(second.v142Environment.roomProfiles)===snapshot,'Same seed, floor and room graph must produce identical room dressing metadata.');

runState.floor=3;
const crypt=windowObject.CCGWorld.createHostState(worldState);
assert(crypt.v142Environment.biome==='bone','Floor 3 must resolve to the Moss Crypt biome.');
assert(crypt.v142Environment.weather==='crypt-mist','Moss Crypt must expose its crypt-mist ambience to the renderer.');
assert(crypt.v142Environment.roomProfiles.every(row=>row.dressingSeed!==undefined),'Every room profile must expose a stable dressing seed.');

runState.floor=4;
const ember=windowObject.CCGWorld.createHostState(worldState);
assert(ember.v142Environment.biome==='ash'&&ember.v142Environment.weather==='ashfall','Floor 4 must resolve to Ember Depths with ashfall ambience.');
runState.floor=5;
const sigil=windowObject.CCGWorld.createHostState(worldState);
assert(sigil.v142Environment.biome==='sigil'&&sigil.v142Environment.weather==='arcane-dust','Floor 5 must resolve to Sigil Sanctum with arcane atmospheric dressing.');

for(const forbidden of ['fetch(','WebSocket','EventSource','supabase.from','render.com'])assert(!source.includes(forbidden),`R6 environment runtime must stay local/browser-native and must not introduce ${forbidden}.`);
assert(!source.includes('Math.random'),'Environment identity and room dressing must not consume nondeterministic gameplay RNG.');
assert(!source.includes('localStorage')&&!source.includes('sessionStorage'),'Presentation metadata must derive from authoritative run/world state rather than creating a parallel save store.');

console.log('Lost Sizzler V10.42 r6 deterministic biome environment contract passed.');