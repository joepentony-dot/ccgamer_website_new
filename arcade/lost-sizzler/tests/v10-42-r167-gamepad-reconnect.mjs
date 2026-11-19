import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
const source=fs.readFileSync(new URL("../js/game-play.js",import.meta.url),"utf8");
const start=source.indexOf("let gamepadDashDown=false,gamepadFireDown=false");
const end=source.indexOf("function setDir(p,code)",start);
assert.ok(start>=0&&end>start,"gamepad source owner present");
const pad=(index,id,fire=false,connected=true,dash=false)=>({index,id,connected,axes:[0,0],buttons:[{pressed:fire},{pressed:dash}]});
let pads=[],shots=0,dashes=0;
const player={dir:{x:1,y:0},moveMultiplier:1};
const ctx={navigator:{getGamepads:()=>pads},mode:"playing",p1:player,move1:1,fire1:0,C:{player:{moveDelay:1}},attackDirection:()=>({x:1,y:0}),attackNowUnbuffered:()=>{shots++;return true},queueAttack:()=>{},dashPlayer:()=>{dashes++},movePlayer:()=>{}};
vm.createContext(ctx);
vm.runInContext(source.slice(start,end),ctx);
pads=[pad(0,"old",true,false,true),pad(1,"live",true,true,true)];
ctx.updateGamepad();assert.equal(shots,1,"disconnected first pad must not mask connected second pad");
assert.equal(dashes,1,"connected controller dash fires");
pads=[pad(0,"old",true,false,true),pad(1,"live",true,true,true)];
ctx.updateGamepad();assert.equal(shots,2,"same pad across fresh browser snapshots preserves held-fire cadence");
assert.equal(dashes,1,"same held dash does not retrigger on snapshot");
pads=[pad(0,"old",true,false,true)];
ctx.updateGamepad();assert.equal(ctx.gamepadDirection(),null,"disconnected pads are ignored");
pads=[pad(2,"replacement",true,true,true)];
ctx.updateGamepad();assert.equal(shots,3,"replacement pad can fire immediately after disconnect");
assert.equal(dashes,2,"replacement pad gets a fresh dash edge");
console.log("PASS R167 gamepad disconnect, snapshot continuity and reconnect");


// R167_CACHE_RELEASE_CONTRACT: public routes must fetch this patched gameplay source,
 // rather than serving previously cached r166 code to returning players.
const cacheToken="20261119r168",build="V10.42 r168";
for(const htmlFile of ["../index.html","../../c64-dungeon-carnage/index.html"]){
  const page=fs.readFileSync(new URL(htmlFile,import.meta.url),"utf8");
  assert.ok(page.includes('content="'+build+'"'),htmlFile+" build marker");
  assert.ok(page.includes('content="'+cacheToken+'"'),htmlFile+" cache marker");
  assert.ok(page.includes('src="js/game-play.js?v='+cacheToken+'"'),htmlFile+" patched script URL");
}
const bootstrap=fs.readFileSync(new URL("../js/v10-42-bootstrap.js",import.meta.url),"utf8");
assert.ok(bootstrap.includes('const BUILD="'+build+'"'),"ordered bootstrap build parity");
assert.ok(bootstrap.includes('const CACHE="'+cacheToken+'"'),"ordered bootstrap cache parity");
const version=JSON.parse(fs.readFileSync(new URL("../version.json",import.meta.url),"utf8"));
assert.equal(version.build,build,"version manifest build parity");
assert.equal(version.cacheToken,cacheToken,"version manifest cache parity");
console.log("PASS current public route, ordered bootstrap and manifest cache parity");
