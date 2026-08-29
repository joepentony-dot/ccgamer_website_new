import assert from "node:assert/strict";
import { Client } from "@colyseus/sdk";

const endpoint=process.env.COLYSEUS_TEST_ENDPOINT||"http://127.0.0.1:10000";
const hostClient=new Client(endpoint),guestClient=new Client(endpoint);
const code=`DG${Date.now().toString(36).slice(-4)}`.toUpperCase();

const hostRoom=await hostClient.joinOrCreate("dungeon_v1",{
  roomCode:code,
  name:"CI Dungeon Host",
  actorId:"CI-D1",
  isLobbyHost:true
});
const guestRoom=await guestClient.joinOrCreate("dungeon_v1",{
  roomCode:code,
  name:"CI Dungeon Guest",
  actorId:"CI-D2",
  isLobbyHost:false
});

assert.equal(hostRoom.name,"dungeon_v1");
assert.equal(guestRoom.name,"dungeon_v1");
assert.equal(guestRoom.roomId,hostRoom.roomId,"host and guest using the same CCG room code must share one Dungeon Colyseus room");

let guestPacket=null,hostPacket=null,lastStatus=null;
guestRoom.onMessage("game",message=>{guestPacket=message});
hostRoom.onMessage("game",message=>{hostPacket=message});
guestRoom.onMessage("server_status",message=>{lastStatus=message});
hostRoom.send("role",{name:"CI Dungeon Host",isLobbyHost:true});
await new Promise(resolve=>setTimeout(resolve,120));

hostRoom.send("game",{event:"world",payload:{revision:7,syncSequence:11,testMarker:"host-world"}});
const guestDeadline=Date.now()+3000;
while(!guestPacket&&Date.now()<guestDeadline)await new Promise(resolve=>setTimeout(resolve,40));
assert.equal(guestPacket?.event,"world","guest must receive host Dungeon gameplay packets through Colyseus");
assert.equal(guestPacket?.payload?.testMarker,"host-world");
assert.equal(guestPacket?.senderActorId,"CI-D1");
assert.ok(Number(guestPacket?.sequence)>0,"server must stamp a monotonic relay sequence");

hostPacket=null;
guestRoom.send("game",{event:"hit",payload:{enemyId:"CI-ENEMY",owner:"CI-D2",power:2}});
const hostDeadline=Date.now()+3000;
while(!hostPacket&&Date.now()<hostDeadline)await new Promise(resolve=>setTimeout(resolve,40));
assert.equal(hostPacket?.event,"hit","host must receive guest Dungeon gameplay requests through Colyseus");
assert.equal(hostPacket?.payload?.enemyId,"CI-ENEMY");
assert.equal(hostPacket?.senderActorId,"CI-D2");

assert.equal(lastStatus?.mode,"dungeon");
assert.equal(lastStatus?.transport,"colyseus");
assert.equal(lastStatus?.roomCode,code);
assert.equal(lastStatus?.hostActorId,"CI-D1","server status must track the existing lobby host identity");
assert.ok(Number(lastStatus?.playerCount)>=2,"server status must report both Dungeon players");

hostRoom.send("ping",{sentAt:Date.now()});
await new Promise(resolve=>setTimeout(resolve,80));
await guestRoom.leave();await hostRoom.leave();
console.log("Lost Sizzler Colyseus two-client Dungeon transport smoke test passed.");
