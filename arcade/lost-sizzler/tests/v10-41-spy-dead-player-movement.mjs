import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-41-spy-movement-finalizer.js"),"utf8");

assert.match(source,/Number\(other\.health\?\?1\)>0/,"Spy movement collision must preserve a real zero-health value");
assert.doesNotMatch(source,/Number\(other\.health\|\|1\)>0/,"dead Spy players must never be promoted back to a blocking one-health occupant");

const player={id:"p1",x:4,y:4,rx:4,ry:4,health:5,hitStunMs:0};
const dead={id:"p2",x:5,y:4,rx:5,ry:4,health:0,hitStunMs:0};
const remote=new Map([[dead.id,dead]]);
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
  allPlayers:()=>[player,dead],
  window:{
    CCGLostSizzlerSpecialModes:{active:{type:"sizzler-saboteurs"}},
    CCGWorld:{walkable:()=>true}
  }
};
context.window.window=context.window;
vm.createContext(context);
vm.runInContext(source,context,{filename:"v10-41-spy-movement-finalizer.js"});

const api=context.window.CCGLostSizzlerV141SpyMovementFinalizer;
assert.ok(api,"final Spy movement API must install");
assert.deepEqual(api.validStep(player,1,0),{x:5,y:4},"a dead player may not block the surviving Spy from stepping onto that tile");

dead.health=3;
assert.equal(api.validStep(player,1,0),null,"a living opposing player must still block the occupied Spy tile");

console.log("Lost Sizzler V10.41 Spy dead-player collision regression checks passed.");