import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const game=path.resolve(here,"..");
const source=fs.readFileSync(path.join(game,"js/game-network.js"),"utf8");

let syncCalls=0;
let sendCalls=0;
const originalHost={revision:7,doors:[{id:"door-a",open:false}],enemies:[{id:"enemy-a"}]};
const originalRemote=new Map([["remote-a",{id:"remote-a",x:4,y:5}]]);
const context={
  console,
  performance:{now:()=>600000},
  net:{isHost:true,sessionId:"host-a",connected:true,send(){sendCalls++}},
  playMode:"solo",
  mode:"playing",
  host:originalHost,
  remote:originalRemote,
  sync(){syncCalls++},
  window:{}
};
vm.createContext(context);
vm.runInContext(source,context,{filename:"game-network.js"});

assert.equal(vm.runInContext("serialWorld()",context),null,"retired world serialization must remain disabled");
vm.runInContext("onPacket('world',{doors:[{id:'replacement'}]})",context);
vm.runInContext("onPlayer({id:'remote-b',x:9,y:9})",context);
vm.runInContext("sendPlayer()",context);
vm.runInContext("sendRemotePlayerState({id:'remote-a'})",context);
vm.runInContext("processRemoteMovement({id:'remote-a'})",context);
vm.runInContext("broadcastWorld()",context);
vm.runInContext("onWorld({revision:99,doors:[{id:'replacement'}]})",context);

assert.equal(sendCalls,0,"retired compatibility callbacks must never transmit network packets");
assert.equal(context.host,originalHost,"retired world receive must not replace local host state");
assert.deepEqual([...context.remote.entries()],[...originalRemote.entries()],"retired remote-player callbacks must not mutate remote-player state");

vm.runInContext("onMembers([],true,true)",context);
assert.equal(syncCalls,1,"the retained membership callback may still request a local UI sync while the RoomNetwork shell remains");

console.log("Dungeon Carnage retired multiplayer transport runtime checks passed.");
