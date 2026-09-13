import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const modulePath="arcade/lost-sizzler/js/v10-42-r19-mobile-trap-layout-stability.js";
const bootstrapPath="arcade/lost-sizzler/js/v10-42-bootstrap.js";
const source=fs.readFileSync(modulePath,"utf8");
const bootstrap=fs.readFileSync(bootstrapPath,"utf8");

assert.match(bootstrap,/v10-42-r19-mobile-trap-layout-stability\.js/,"ordered V10.42 bootstrap must load the mobile stability owner");
assert.match(bootstrap,/CCGLostSizzlerV142R19MobileTrapLayoutStability/,"ordered bootstrap must wait for the r19 owner marker");
const r19Index=bootstrap.indexOf("v10-42-r19-mobile-trap-layout-stability.js");
const r1Index=bootstrap.indexOf("v10-42-r1-stability.js");
const r18Index=bootstrap.indexOf("v10-42-r18-solo-playtest-stability.js");
assert.ok(r19Index<r1Index,"mobile stability must load before the final R1/R18 guarded stability pair");
assert.ok(r1Index<r18Index,"R1 must remain immediately before R18 in the ordered bootstrap");

assert.match(source,/__ccgV142R19MobileTrapDamage/,"trap damage must have an isolated owner marker");
assert.match(source,/const beforeHealth=Number\(player\.health\|\|0\),beforeArmor=Number\(player\.armor\|\|0\)/,"trap damage owner must snapshot health and armour");
assert.match(source,/player\.armor=0/,"ordinary floor traps must bypass armour for their promised health hit");
assert.match(source,/finally\{player\.armor=beforeArmor\}/,"trap damage owner must restore armour after delegating the hit");
assert.doesNotMatch(source,/player\.invuln=0/,"trap damage must preserve the canonical invulnerability contract");
assert.match(source,/trapRuntime\?\.contact/,"mobile repair must use the canonical rare-events trap contact latch");
assert.match(source,/trapCycles\.set\(key,false\)/,"mobile repair must re-arm the r57 trap-cycle latch while inactive");
assert.match(source,/aspect-ratio:auto!important/,"portrait playfield must use the live viewport geometry instead of forcing a desktop 16:9 frame");
assert.match(source,/grid-template-rows:28px minmax\(0,1fr\) 54px!important/,"portrait mission and HUD rows must be compacted to return space to gameplay");
assert.match(source,/min-width:44px!important/,"portrait movement controls must retain a 44px touch target");
assert.match(source,/min-height:44px!important/,"portrait controls must retain a 44px touch target");
assert.doesNotMatch(source,/\b(?:gainXp|addXp|grantXp|awardXp|awardXP)\b/,"mobile repair must not introduce an XP source");

const player={id:"P1",x:4,y:5,health:8,armor:6,invuln:0,xp:120,totalXp:450};
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
  hurtPlayer(target,amount){
    if(Number(target.invuln||0)>0)return false;
    let left=Number(amount||0);
    if(Number(target.armor||0)>0){
      const absorbed=Math.min(Number(target.armor||0),left);
      target.armor-=absorbed;
      left-=absorbed;
    }
    if(left<=0){target.invuln=250;return true}
    target.health-=left;
    target.invuln=250;
    return true
  },
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
assert.match(insertedStyle,/aspect-ratio:auto!important/,"runtime style must avoid a forced desktop aspect ratio on portrait phones");
assert.match(insertedStyle,/grid-template-columns:repeat\(3,44px\)!important/,"runtime style must preserve usable movement controls");

context.SYS.trapActive=()=>true;
const beforeHealth=player.health,beforeArmor=player.armor,beforeXp=player.xp,beforeTotalXp=player.totalXp;
context.hurtPlayer(player,1,false,"spike trap");
assert.equal(player.health,beforeHealth-1,"an active floor trap must remove one health even when armour is equipped");
assert.equal(player.armor,beforeArmor,"an ordinary floor trap health hit must not consume armour instead");
assert.equal(player.xp,beforeXp,"trap damage must not award progression XP");
assert.equal(player.totalXp,beforeTotalXp,"trap damage must not mutate total progression XP");
assert.ok(player.invuln>0,"canonical post-hit invulnerability must remain after successful trap damage");

const afterFirstTrap=player.health;
context.hurtPlayer(player,1,false,"spike trap");
assert.equal(player.health,afterFirstTrap,"post-hit invulnerability must prevent an immediate duplicate trap hit");
assert.equal(player.armor,beforeArmor,"duplicate trap suppression must not consume armour");

player.invuln=0;
context.hurtPlayer(player,1,false,"enemy melee");
assert.equal(player.health,afterFirstTrap,"non-trap damage must retain the existing armour-first contract");
assert.equal(player.armor,beforeArmor-1,"non-trap damage must still be absorbed by armour normally");

console.log("v10-42 mobile trap/layout stability contract passed");
