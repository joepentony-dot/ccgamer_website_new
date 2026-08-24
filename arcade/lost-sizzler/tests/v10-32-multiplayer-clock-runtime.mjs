import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const game=path.resolve(here,"..");
const source=fs.readFileSync(path.join(game,"js/game-network.js"),"utf8");
let now=600000;
const hostState={
  revision:7,keysCollected:0,exitOpen:false,exitSigilCollected:false,exitSigilDropped:false,
  doors:[{id:"door-a",x:8,y:8,type:"room",locked:false,open:false,opening:true,openingStart:599100,openAt:600900}],
  floorElapsed:432100,chests:[{id:"chest-a",active:false,openedAt:599800}],enemies:[],items:[],traps:[{id:"trap-a",period:4000,phase:750}],generators:[],shrines:[],switches:[],arenas:[],timedRooms:[],blockingDecor:[],hazardRooms:[],shops:[],deathCaches:[],voidStalkers:[],defeatedDeathStalkers:[],enteredRoomIds:[]
};
const context={
  console,performance:{now:()=>now},net:{isHost:true,sessionId:"host-a",connected:true},playMode:"online",mode:"playing",
  host:hostState,run:{floor:1},world:{decor:[]},remote:new Map(),sync(){},window:{},
  PGR:{},C:{maxPlayers:4},localPlayers:()=>[],allPlayers:()=>[],explored:new Map(),roomVisits:new Map(),playerTrails:new Map(),pendingItems:new Set()
};
vm.createContext(context);vm.runInContext(source,context,{filename:"game-network.js"});

const snapshot=vm.runInContext("serialWorld()",context);
assert.equal(snapshot.doors[0].openingRemainingMs,900,"host must publish a transferable remaining duration");
assert.equal(snapshot.doors[0].openAt,0,"host-local monotonic deadlines must not cross the network");
assert.equal(snapshot.traps[0].cycleElapsedMs,750,"trap cycle position must be serialized instead of a browser-local phase");
assert.equal(snapshot.chests[0].openedAgeMs,200,"chest animation must be serialized as an age");

now=1000;context.net.isHost=false;vm.runInContext("onWorld(__snapshot)",Object.assign(context,{__snapshot:snapshot}));
const hydrated=vm.runInContext("host.doors[0]",context);
assert.equal(hydrated.openAt,1900,"guest must rebuild the deadline from its own monotonic clock");
assert.equal(hydrated.openingStart,100,"guest must preserve the correct animation progress");
assert.equal(vm.runInContext("(performance.now()+host.traps[0].phase)%host.traps[0].period",context),750,"guest trap cycle must match the host cycle");
assert.equal(vm.runInContext("host.chests[0].openedAt",context),800,"guest must reconstruct recent chest animation timing on its own clock");
assert.equal(vm.runInContext("host.floorElapsed",context),432100,"late joiners must inherit the authoritative floor hazard clock");

const newer={...snapshot,syncSequence:3,doors:[{...snapshot.doors[0],opening:false,open:true,openingRemainingMs:0}]};
const older={...snapshot,syncSequence:2,doors:[{...snapshot.doors[0],opening:false,open:false,openingRemainingMs:0}]};
context.__snapshot=newer;vm.runInContext("onWorld(__snapshot)",context);context.__snapshot=older;vm.runInContext("onWorld(__snapshot)",context);
assert.equal(vm.runInContext("host.doors[0].open",context),true,"an older delayed snapshot must not re-close a newer open door");

const migrated={...older,syncHostId:"host-b",syncSequence:1,doors:[{...snapshot.doors[0],opening:false,open:false}]};
context.__snapshot=migrated;vm.runInContext("onWorld(__snapshot)",context);
assert.equal(vm.runInContext("host.doors[0].open",context),false,"a new host must be allowed to restart snapshot sequencing after migration");

console.log("Lost Sizzler V10.32 multiplayer door-clock and snapshot-order runtime checks passed.");
