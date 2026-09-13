import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const modulePath="arcade/lost-sizzler/js/v10-42-r19-mobile-trap-layout-stability.js";
const bootstrapPath="arcade/lost-sizzler/js/v10-42-bootstrap.js";
const source=fs.readFileSync(modulePath,"utf8");
const bootstrap=fs.readFileSync(bootstrapPath,"utf8");

assert.match(bootstrap,/v10-42-r19-mobile-trap-layout-stability\.js/,"ordered V10.42 bootstrap must load the mobile stability owner");
assert.match(bootstrap,/CCGLostSizzlerV142R19MobileTrapLayoutStability/,"ordered bootstrap must wait for the r19 owner marker");
assert.ok(bootstrap.indexOf("v10-42-r19-mobile-trap-layout-stability.js")>bootstrap.indexOf("v10-42-r18-solo-playtest-stability.js"),"mobile stability must load after the existing r18 solo stability layer");

assert.match(source,/__ccgV142R19MobileTrapDamage/,"trap damage must have an isolated owner marker");
assert.match(source,/player\.invuln=0/,"trap contact must bypass stale invulnerability before delegating damage");
assert.match(source,/trapRuntime\?\.contact/,"mobile repair must use the canonical rare-events trap contact latch");
assert.match(source,/trapCycles\.set\(key,false\)/,"mobile repair must re-arm the r57 trap-cycle latch while inactive");
assert.match(source,/aspect-ratio:16\/9!important/,"portrait playfield must preserve the 1280x720 canvas aspect ratio");
assert.match(source,/object-fit:contain!important/,"portrait canvas must not use the global stretch-to-fill behaviour");
assert.doesNotMatch(source,/\b(?:gainXp|addXp|grantXp|awardXp)\b/i,"mobile repair must not introduce an XP source");

const player={id:"P1",x:4,y:5,health:8,armor:0,invuln:500};
const trap={id:"trap-1",x:4,y:5,active:true,kind:"spike"};
const contact=new Set(["test-run|F1|P1|trap-1"]);
const trapCycles=new Map([["P1|trap-1",true]]);
let insertedStyle="";
let intervalHandler=null;

const document={
  body:{dataset:{runActive:"true",specialMode:""}},
  head:{appendChild(node){insertedStyle=String(node.textContent||"")}},
  getElementById(){return null},
  createElement(){return {id:"",textContent:""}}
};
const context={
  console,
  document,
  performance:{now:()=>1000},
  run:{seed:"test-run",floor:1},
  host:{traps:[trap]},
  p1:player,
  p2:null,
  localPlayers:()=>[player],
  SYS:{trapActive:()=>false},
  CCGLostSizzlerSpecialModes:{active:null},
  CCGLostSizzlerRareEventsBalance:{trapRuntime:{worldKey:"test-run|F1",contact}},
  CCGLostSizzlerV141R57DesktopPrepStability:{state:{trapCycles}},
  hurtPlayer(target,amount){if(Number(target.invuln||0)>0)return false;target.health-=Number(amount||0);target.invuln=250;return true},
  setInterval(fn){intervalHandler=fn;return 1},
  clearInterval(){},
  addEventListener(){},
  Set,
  Map
};
context.window=context;
context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:modulePath});

assert.equal(contact.has("test-run|F1|P1|trap-1"),false,"inactive trap cycle must clear the canonical contact latch");
assert.equal(trapCycles.get("P1|trap-1"),false,"inactive trap cycle must clear the r57 active-cycle latch");
assert.equal(typeof intervalHandler,"function","mobile stability owner must retain its small periodic re-arm check");
assert.match(insertedStyle,/aspect-ratio:16\/9!important/,"runtime style must preserve portrait aspect ratio");
assert.match(insertedStyle,/object-fit:contain!important/,"runtime style must override stretch-to-fill on portrait phones");

context.SYS.trapActive=()=>true;
player.invuln=500;
const before=player.health;
context.hurtPlayer(player,1,false,"spike trap");
assert.equal(player.health,before-1,"trap damage must land even when stale mobile invulnerability was present");
assert.ok(player.invuln>0,"normal post-hit invulnerability must remain after successful trap damage");

const afterTrap=player.health;
player.invuln=500;
context.hurtPlayer(player,1,false,"enemy melee");
assert.equal(player.health,afterTrap,"non-trap damage must retain the existing invulnerability contract");

console.log("v10-42 mobile trap/layout stability contract passed");
