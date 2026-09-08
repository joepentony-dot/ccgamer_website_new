import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const source=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-42-r11-spy-packet-rejection-seal.js"),"utf8");
const bootstrap=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-42-bootstrap.js"),"utf8");

assert.doesNotMatch(source,/Math\.random/);
assert.doesNotMatch(source,/localStorage|sessionStorage|fetch\s*\(|WebSocket|EventSource|setInterval|requestAnimationFrame/);
assert.match(source,/result!==false/,"seal must only roll back rejected packets");
assert.match(source,/map\.delete\(id\)/,"new remote state created by a rejected packet must be removed");
assert.match(source,/map\.set\(id,before\)/,"pre-existing remote state must be restored exactly");
assert.ok(bootstrap.indexOf("v10-42-r11-spy-packet-rejection-seal.js")>bootstrap.indexOf("v10-42-r10-breakable-objective-runtime.js"));
assert.ok(bootstrap.indexOf("v10-42-r11-spy-packet-rejection-seal.js")<bootstrap.indexOf("v10-42-r1-stability.js"));

const remote=new Map();
const network={
  applyPosition(payload){
    const id=String(payload?.actorId||payload?.player?.id||"");
    if(id)remote.set(id,{id,x:99,y:99,contaminated:true});
    return false;
  }
};
const window={CCGLostSizzlerV141R29SpyNetwork:network};
vm.runInNewContext(source,{window,remote});
assert.equal(window.CCGLostSizzlerV142R11SpyPacketRejectionSeal.state.installed,true);
assert.equal(network.applyPosition({roomMode:"dungeon",actorId:"RIVAL",player:{id:"RIVAL",x:2,y:3}}),false);
assert.equal(remote.has("RIVAL"),false,"rejected packet must not create a rival presentation entry");

const stable={id:"RIVAL",x:4,y:5,spyPosition:true};
remote.set("RIVAL",stable);
assert.equal(network.applyPosition({roomMode:"dungeon",actorId:"RIVAL",player:{id:"RIVAL",x:8,y:9}}),false);
assert.equal(remote.get("RIVAL"),stable,"rejected packet must preserve the exact pre-existing rival entry");
assert.equal(window.CCGLostSizzlerV142R11SpyPacketRejectionSeal.state.rejections,2);
assert.equal(window.CCGLostSizzlerV142R11SpyPacketRejectionSeal.state.rollbacks,2);

console.log("Lost Sizzler V10.42 r11 transactional Spy packet rejection seal contract passed.");
