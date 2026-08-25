import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-41-spy-movement-finalizer.js"),"utf8");

assert.match(source,/spyModelFor=player/,"Spy movement collision must consult the live Saboteurs model when available");
assert.match(source,/model\.status==="active"&&Number\(model\.hp\?\?player\?\.health\?\?1\)>0/,"only an active Saboteurs model may occupy a movement tile");

const player={id:"p1",x:4,y:4,rx:4,ry:4,health:5,hitStunMs:0};
const knockedOutAvatar={id:"p2",x:5,y:4,rx:5,ry:4,health:1,hitStunMs:0};
const models=[
  {id:"p1",status:"active",hp:5},
  {id:"p2",status:"knocked-out",hp:0}
];
const remote=new Map([[knockedOutAvatar.id,knockedOutAvatar]]);
const world={map:Array.from({length:12},()=>Array(12).fill(0))};
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
  window:{
    CCGLostSizzlerSpecialModes:{active:{type:"sizzler-saboteurs",state:{players:models}}},
    CCGWorld:{walkable:()=>true}
  }
};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(source,context,{filename:"v10-41-spy-movement-finalizer.js"});

const api=context.window.CCGLostSizzlerV141SpyMovementFinalizer;
assert.ok(api,"final Spy movement API must install");
const knockedOutStep=api.validStep(player,1,0);
assert.deepEqual({x:knockedOutStep?.x,y:knockedOutStep?.y},{x:5,y:4},"a knocked-out Saboteurs model must not block movement even though its live dungeon avatar is kept at one HP");

models[1].status="active";models[1].hp=3;
assert.equal(api.validStep(player,1,0),null,"a living active opposing Spy must still block its occupied tile");

console.log("Lost Sizzler V10.41 Spy knocked-out model occupancy regression checks passed.");