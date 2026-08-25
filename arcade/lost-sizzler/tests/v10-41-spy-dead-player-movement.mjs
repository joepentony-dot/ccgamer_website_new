import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-41-spy-movement-finalizer.js"),"utf8");
const adapter=fs.readFileSync(path.join(root,"js/v10-33-special-modes.js"),"utf8");
const rules=fs.readFileSync(path.join(root,"js/sizzler-saboteurs.js"),"utf8");

assert.match(adapter,/else p\.health=1/,"the live dungeon adapter keeps a knocked-out Spy avatar present at one HP");
assert.match(rules,/player\.status = "knocked-out"; player\.hp = 0;/,"Saboteurs rules must expose the knockout state separately from the live avatar health");
assert.match(rules,/player\.status = "active"; player\.hp = player\.maxHp; player\.roomId = match\.map\.spawnRoomIds\[player\.slot - 1\]/,"Saboteurs rules must move a respawned model back to its logical spawn room");
assert.match(source,/spyModelFor=player/,"Spy movement collision must consult the live Saboteurs model when available");
assert.match(source,/canSpyMove=player/,"Spy final movement ownership must understand whether the Saboteurs model is active");
assert.match(source,/if\(spyActive\(\)&&!canSpyMove\(player\)\)return false/,"a knocked-out Spy must not move or dash through the underlying dungeon controller");
assert.match(source,/model\.status==="active"&&Number\(model\.hp\?\?player\?\.health\?\?1\)>0/,"only an active Saboteurs model may occupy a movement tile");
assert.match(source,/previous==="knocked-out"&&current==="active"/,"Spy finalizer must detect the rules-engine respawn transition");
assert.match(source,/materialiseRespawn\(model\)/,"a detected Spy respawn must be placed into its mapped dungeon room before the old live position can overwrite it");

const player={id:"p1",x:4,y:4,rx:4,ry:4,health:5,hitStunMs:0};
const knockedOutAvatar={id:"p2",x:5,y:4,rx:5,ry:4,health:1,hitStunMs:0};
const models=[
  {id:"p1",status:"active",hp:5,maxHp:6,roomId:"spawn-a"},
  {id:"p2",status:"knocked-out",hp:0,maxHp:6,roomId:"old-room"}
];
const modeRooms=[
  {id:"spawn-a",dungeonRoomId:0},
  {id:"old-room",dungeonRoomId:0},
  {id:"spawn-b",dungeonRoomId:1}
];
const remote=new Map([[knockedOutAvatar.id,knockedOutAvatar]]);
const world={
  map:Array.from({length:12},()=>Array(20).fill(0)),
  rooms:[{id:0,x:0,y:0,w:8,h:8},{id:1,x:8,y:0,w:8,h:8}]
};
const host={};
const context={
  console,
  setInterval:()=>1,
  clearInterval:()=>{},
  addEventListener:()=>{},
  document:{body:{dataset:{specialMode:"sizzler-saboteurs",releaseReady:"false"}}},
  mode:"playing",
  world,
  host,
  p1:player,
  remote,
  allPlayers:()=>[player,knockedOutAvatar],
  sync:()=>{},reveal:()=>{},markRoomVisit:()=>{},rememberTrail:()=>{},
  window:{
    CCGLostSizzlerSpecialModes:{active:{type:"sizzler-saboteurs",state:{players:models,map:{rooms:modeRooms}}}},
    CCGWorld:{walkable:()=>true}
  }
};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(source,context,{filename:"v10-41-spy-movement-finalizer.js"});

const api=context.window.CCGLostSizzlerV141SpyMovementFinalizer;
assert.ok(api,"final Spy movement API must install");
assert.equal(api.canSpyMove(knockedOutAvatar),false,"a one-HP live avatar must remain immobile while its Saboteurs model is knocked out");
const knockedOutStep=api.validStep(player,1,0);
assert.deepEqual({x:knockedOutStep?.x,y:knockedOutStep?.y},{x:5,y:4},"a knocked-out Saboteurs model must not block movement even though its live dungeon avatar is kept at one HP");

api.syncRespawns();
models[1].status="active";models[1].hp=6;models[1].roomId="spawn-b";
assert.equal(api.canSpyMove(knockedOutAvatar),true,"a respawned active Spy must regain movement");
assert.equal(api.validStep(player,1,0),null,"an active opposing Spy still blocks its old live tile until the respawn is materialised");
assert.equal(api.syncRespawns(),true,"knocked-out to active must trigger a live dungeon respawn");
assert.deepEqual({x:knockedOutAvatar.x,y:knockedOutAvatar.y,rx:knockedOutAvatar.rx,ry:knockedOutAvatar.ry},{x:12,y:4,rx:12,ry:4},"respawned Spy must move to the centre of the mapped dungeon spawn room");
assert.equal(knockedOutAvatar.health,6,"respawn materialisation must immediately restore the live avatar health from the Saboteurs model");
assert.equal(api.state.respawns,1,"successful Spy respawn materialisation must be recorded once");
const vacatedStep=api.validStep(player,1,0);
assert.deepEqual({x:vacatedStep?.x,y:vacatedStep?.y},{x:5,y:4},"the old knockout tile must become walkable after the opponent is moved to its spawn room");

console.log("Lost Sizzler V10.41 Spy knockout movement, occupancy and mapped respawn regression checks passed.");