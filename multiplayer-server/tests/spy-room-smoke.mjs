import assert from "node:assert/strict";
import { Client } from "@colyseus/sdk";

const endpoint=process.env.COLYSEUS_TEST_ENDPOINT||"http://127.0.0.1:10000";
const hostClient=new Client(endpoint),guestClient=new Client(endpoint);
const code=`SP${Date.now().toString(36).slice(-4)}`.toUpperCase();

const hostRoom=await hostClient.joinOrCreate("spy_v1",{
  roomCode:code,
  name:"CI Spy Host",
  actorId:"CI-S1",
  isLobbyHost:true
});
const guestRoom=await guestClient.joinOrCreate("spy_v1",{
  roomCode:code,
  name:"CI Spy Guest",
  actorId:"CI-S2",
  isLobbyHost:false
});

assert.equal(hostRoom.name,"spy_v1");
assert.equal(guestRoom.name,"spy_v1");
assert.equal(guestRoom.roomId,hostRoom.roomId,"both Spy agents using the same CCG room code must share one Colyseus room");

let guestPacket=null,hostPacket=null,lastStatus=null;
guestRoom.onMessage("game",message=>{guestPacket=message});
hostRoom.onMessage("game",message=>{hostPacket=message});
guestRoom.onMessage("server_status",message=>{lastStatus=message});
hostRoom.send("role",{name:"CI Spy Host",isLobbyHost:true});
await new Promise(resolve=>setTimeout(resolve,120));

hostRoom.send("game",{event:"v133_special_state",payload:{mode:"sizzler-saboteurs",revision:9,testMarker:"spy-state"}});
const guestDeadline=Date.now()+3000;
while(!guestPacket&&Date.now()<guestDeadline)await new Promise(resolve=>setTimeout(resolve,40));
assert.equal(guestPacket?.event,"v133_special_state","guest must receive host Spy state through Colyseus");
assert.equal(guestPacket?.payload?.testMarker,"spy-state");
assert.equal(guestPacket?.senderActorId,"CI-S1");
assert.ok(Number(guestPacket?.sequence)>0,"Spy relay packets must receive a server sequence");

hostPacket=null;
guestRoom.send("game",{event:"v141_spy_position",payload:{id:"CI-S2",x:8,y:11,seq:27}});
const hostDeadline=Date.now()+3000;
while(!hostPacket&&Date.now()<hostDeadline)await new Promise(resolve=>setTimeout(resolve,40));
assert.equal(hostPacket?.event,"v141_spy_position","host must receive guest Spy position packets through Colyseus");
assert.equal(hostPacket?.payload?.id,"CI-S2");
assert.equal(hostPacket?.senderActorId,"CI-S2");

assert.equal(lastStatus?.mode,"spy");
assert.equal(lastStatus?.transport,"colyseus");
assert.equal(lastStatus?.roomCode,code);
assert.equal(lastStatus?.hostActorId,"CI-S1","Spy room status must retain the existing lobby host identity");
assert.ok(Number(lastStatus?.playerCount)>=2,"Spy room status must report both agents");

await guestRoom.leave();await hostRoom.leave();
console.log("Lost Sizzler Colyseus two-client Spy transport smoke test passed.");
