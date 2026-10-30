import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const source=fs.readFileSync(fileURLToPath(new URL("../js/systems.js",import.meta.url)),"utf8");
const start=source.indexOf("  function selectWardenSpawnRooms(");
const end=source.indexOf("  function freeInRoom(",start);
assert.ok(start>=0&&end>start,"Execute the authoritative systems.js Warden placement selector");
assert.match(source,/countRoom:stalkRoom,deathRoom:deathStalkerRoom\}=selectWardenSpawnRooms\(world,host,rooms,run\)/,
  "Count must use the selected non-boss room");
assert.match(source,/const room=deathStalkerRoom,vq=freeInRoom\(world,room,used\)/,
  "The unique floor Death Stalker must use its independently selected room");
assert.match(source,/enforceDeathStalkerSingleton\(host\)/,
  "Existing Death Stalker singleton protection must remain installed");
assert.match(source,/id:"count-loadula"/,"Count's canonical actor identity must remain");
assert.match(source,/id=`death-stalker-floor-\$\{run\.floor\|\|1\}`/,
  "The authored floor Death Stalker identity must remain");

const context=vm.createContext({
  W:{roomAt(world,x,y){
    const room=world.rooms.find(r=>x>=r.x&&x<=r.x+r.w&&y>=r.y&&y<=r.y+r.h);
    return room?.id??-1;
  }}
});
vm.runInContext(source.slice(start,end),context,{filename:"systems.js::selectWardenSpawnRooms",timeout:3000});
const choose=context.selectWardenSpawnRooms;
assert.equal(typeof choose,"function");
const roomsFor=n=>Array.from({length:n},(_,id)=>({
  id,x:id*12,y:0,w:8,h:8,depth:n-id,sanctuary:id===4
}));

for(let n=7;n<=30;n++){
  const rooms=roomsFor(n),world={rooms,startRoomId:n-1,exitRoomId:0};
  const host={sigilRoomId:2,guardian:{x:37,y:3},
    generators:[{id:"gen0",alive:true},{id:"gen1",alive:true},{id:"gen2",alive:true}]};
  const original=JSON.stringify({world,host,rooms});
  assert.equal(rooms[0].id,world.exitRoomId,"Regression fixture: original deepest-room Count would spawn in exit boss chamber");
  for(let floor=1;floor<=15;floor++){
    const selected=choose(world,host,rooms,{floor});
    assert.ok(selected.countRoom&&selected.deathRoom,"Both authored Wardens must retain spawn rooms");
    assert.notEqual(selected.countRoom.id,selected.deathRoom.id,
      `Floor ${floor} with ${n} rooms must not place both ward-dependent hunters together`);
    for(const room of [selected.countRoom,selected.deathRoom]){
      assert.ok(![world.startRoomId,world.exitRoomId,host.sigilRoomId,3,4].includes(room.id),
        `Floor ${floor}: neither Warden may start in the start, boss, Sigil or sanctuary chamber`);
    }
    const restored=JSON.parse(JSON.stringify({world,host,rooms}));
    const after=choose(restored.world,restored.host,restored.rooms,{floor});
    assert.deepEqual([after.countRoom.id,after.deathRoom.id],
      [selected.countRoom.id,selected.deathRoom.id],
      "JSON-restored 2/3-generator encounter must preserve deterministic placement");
    restored.host.generators[2].alive=false;
    const afterThird=choose(restored.world,restored.host,restored.rooms,{floor});
    assert.deepEqual([afterThird.countRoom.id,afterThird.deathRoom.id],
      [selected.countRoom.id,selected.deathRoom.id],
      "3/3 generator destruction must not recreate or move either Warden");
  }
  assert.equal(JSON.stringify({world,host,rooms}),original,
    "Placement must not mutate world, host, generator progress or source room order");
}

const compact=roomsFor(3),smallWorld={rooms:compact,startRoomId:2,exitRoomId:0};
const small=choose(smallWorld,{sigilRoomId:2,guardian:null},compact,{floor:5});
assert.equal(small.countRoom.id,1,"One eligible chamber must remain usable");
assert.equal(small.deathRoom.id,1,"Do not invent a second room or move a hunter into the boss chamber");
const lone=roomsFor(1);
assert.equal(choose({rooms:lone,startRoomId:0,exitRoomId:0},{},lone,{floor:5}).countRoom.id,0,
  "Malformed one-room legacy floors must fail safely without inventing geometry");

console.log("R152 actual systems.js selector: distinct Count/Death Stalker spawn across 24 map sizes x 15 floors, boss/Sigil/sanctuary avoidance, JSON restore and 2/3-to-3/3 generator stability passed.");
