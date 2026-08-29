import assert from "node:assert/strict";
import { Client } from "@colyseus/sdk";

const endpoint=process.env.COLYSEUS_TEST_ENDPOINT||"http://127.0.0.1:10000";
const client=new Client(endpoint);
const code=`CI${Date.now().toString(36).slice(-4)}`.toUpperCase();
const room=await client.joinOrCreate("horde_v1",{
  roomCode:code,
  seed:`${code}-SMOKE`,
  name:"CI Horde Tester",
  actorId:"CI-P1",
  isLobbyHost:true,
  expectedPlayers:1
});

assert.equal(room.name,"horde_v1");
assert.ok(room.sessionId,"client must receive a Colyseus session id");

const width=12,height=12;
room.send("arena_init",{width,height,walkable:"1".repeat(width*height)});
room.send("player_state",{x:6,y:6,dirX:1,dirY:0,mana:120,maxMana:120});

const deadline=Date.now()+6000;
while(Date.now()<deadline){
  const server=room.state;
  if(server?.serverAuthoritative===true&&server?.arenaReady===true&&String(server?.status||"")!=="warming")break;
  await new Promise(resolve=>setTimeout(resolve,75));
}

assert.equal(room.state?.serverAuthoritative,true,"room state must declare dedicated server authority");
assert.equal(room.state?.arenaReady,true,"host arena upload must be accepted");
assert.notEqual(String(room.state?.status||""),"warming","room must advance after the arena arrives");
assert.ok(Number(room.state?.playerCount||0)>=1,"server state must contain the joined Horde player");
assert.ok(room.state?.players?.get?.("CI-P1"),"schema player map must use the stable CCG actor id");

room.send("ping",{sentAt:Date.now()});
await new Promise(resolve=>setTimeout(resolve,100));
await room.leave();

console.log("Lost Sizzler Colyseus Horde room protocol smoke test passed.");
