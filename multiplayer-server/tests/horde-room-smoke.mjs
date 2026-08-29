import assert from "node:assert/strict";
import { Client } from "@colyseus/sdk";

const endpoint=process.env.COLYSEUS_TEST_ENDPOINT||"http://127.0.0.1:10000";
const hostClient=new Client(endpoint),guestClient=new Client(endpoint);
const code=`CI${Date.now().toString(36).slice(-4)}`.toUpperCase();

const hostRoom=await hostClient.joinOrCreate("horde_v1",{
  roomCode:code,
  seed:`${code}-SMOKE`,
  name:"CI Horde Host",
  actorId:"CI-P1",
  isLobbyHost:true,
  expectedPlayers:2
});
const guestRoom=await guestClient.joinOrCreate("horde_v1",{
  roomCode:code,
  seed:`${code}-SMOKE`,
  name:"CI Horde Guest",
  actorId:"CI-P2",
  isLobbyHost:false,
  expectedPlayers:2
});

assert.equal(hostRoom.name,"horde_v1");
assert.equal(guestRoom.name,"horde_v1");
assert.equal(guestRoom.roomId,hostRoom.roomId,"host and guest using the same CCG room code must share one Colyseus room");
assert.ok(hostRoom.sessionId&&guestRoom.sessionId,"both Horde clients must receive Colyseus session ids");

const width=12,height=12;
hostRoom.send("arena_init",{width,height,walkable:"1".repeat(width*height)});
hostRoom.send("player_state",{x:5,y:6,dirX:1,dirY:0,mana:120,maxMana:120});
guestRoom.send("player_state",{x:7,y:6,dirX:-1,dirY:0,mana:120,maxMana:120});

const deadline=Date.now()+7000;
while(Date.now()<deadline){
  const host=hostRoom.state,guest=guestRoom.state;
  const hostReady=host?.serverAuthoritative===true&&host?.arenaReady===true&&String(host?.status||"")!=="warming"&&Number(host?.playerCount||0)>=2;
  const guestReady=guest?.serverAuthoritative===true&&guest?.arenaReady===true&&String(guest?.status||"")!=="warming"&&Number(guest?.playerCount||0)>=2;
  if(hostReady&&guestReady&&host?.players?.get?.("CI-P1")&&host?.players?.get?.("CI-P2")&&guest?.players?.get?.("CI-P1")&&guest?.players?.get?.("CI-P2"))break;
  await new Promise(resolve=>setTimeout(resolve,75));
}

for(const [label,room] of [["host",hostRoom],["guest",guestRoom]]){
  assert.equal(room.state?.serverAuthoritative,true,`${label} state must declare dedicated server authority`);
  assert.equal(room.state?.arenaReady,true,`${label} must receive the host arena state`);
  assert.notEqual(String(room.state?.status||""),"warming",`${label} must advance beyond server warming`);
  assert.ok(Number(room.state?.playerCount||0)>=2,`${label} must see both Horde players`);
  assert.ok(room.state?.players?.get?.("CI-P1"),`${label} must receive the host actor state`);
  assert.ok(room.state?.players?.get?.("CI-P2"),`${label} must receive the guest actor state`);
}

hostRoom.send("ping",{sentAt:Date.now()});guestRoom.send("ping",{sentAt:Date.now()});
await new Promise(resolve=>setTimeout(resolve,100));
await guestRoom.leave();await hostRoom.leave();

console.log("Lost Sizzler Colyseus two-client Horde room protocol smoke test passed.");
