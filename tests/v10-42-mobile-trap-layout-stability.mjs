import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

const modulePath="arcade/lost-sizzler/js/v10-42-r19-mobile-trap-layout-stability.js";
const bootstrapPath="arcade/lost-sizzler/js/v10-42-bootstrap.js";
const touchPath="arcade/lost-sizzler/js/v10-4-patch.js";
const gameplayPath="arcade/lost-sizzler/js/game-play.js";
const source=fs.readFileSync(modulePath,"utf8");
const bootstrap=fs.readFileSync(bootstrapPath,"utf8");
const touchSource=fs.readFileSync(touchPath,"utf8");
const gameplaySource=fs.readFileSync(gameplayPath,"utf8");

assert.match(bootstrap,/v10-42-r19-mobile-trap-layout-stability\.js/,"ordered V10.42 bootstrap must load the mobile stability owner");
assert.match(bootstrap,/CCGLostSizzlerV142R19MobileTrapLayoutStability/,"ordered bootstrap must wait for the r19 owner marker");
const r19Index=bootstrap.indexOf("v10-42-r19-mobile-trap-layout-stability.js");
const r1Index=bootstrap.indexOf("v10-42-r1-stability.js");
const r18Index=bootstrap.indexOf("v10-42-r18-solo-playtest-stability.js");
assert.ok(r19Index<r1Index,"mobile stability must load before the final R1/R18 guarded stability pair");
assert.ok(r1Index<r18Index,"R1 must remain immediately before R18 in the ordered bootstrap");

assert.match(source,/__ccgV142R19MobileTrapDamage/,"trap damage must have an isolated owner marker");
assert.match(source,/const existing=chainOwner\(current,"__ccgV142R19MobileTrapDamage"\)/,"trap guard installation must recover the existing R19 owner from the hurtPlayer ancestry");
assert.match(source,/trapDamageOwner=existing/,"trap guard installation must retain a callable R19 owner when later wrappers replace window.hurtPlayer");
assert.match(source,/trapProtectionUntil=new Map\(\)/,"trap damage owner must retain the successful hit protection window independently of mutable player state");
assert.match(source,/protectedUntil>now/,"trap damage owner must reject re-entry while the original trap protection window remains active");
assert.match(source,/trapProtectionUntil\.set\(contactKey,performance\.now\(\)\+protectionMs\)/,"successful trap health damage must preserve its canonical invulnerability duration for re-entry");
assert.match(source,/if\(!contactKey\)return current\.apply\(this,arguments\)/,"non-contact trap-labelled damage must delegate to the established downstream environment owner");
assert.match(source,/trapContacts\.has\(contactKey\)/,"trap damage owner must suppress duplicate damage on one active trap contact");
assert.match(source,/trapContacts\.add\(contactKey\)/,"successful trap health damage must latch the active contact");
assert.match(source,/trapDamageOwner=wrapped/,"a newly installed R19 damage owner must be retained independently of mutable window ownership");
assert.match(source,/trapDamageOwner\|\|chainOwner\(window\.hurtPlayer,"__ccgV142R19MobileTrapDamage"\)/,"trap repair must prefer the retained R19 owner during a transient wrapper race");
assert.match(source,/function guaranteeTrapContactDamage\(player,trap,beforeHealth,beforeArmor\)/,"R19 must expose one stable synchronous floor-trap repair boundary");
assert.match(source,/trapContacts\.delete\(contactKey\)/,"leaving or deactivating a trap must re-arm the contact latch");
assert.match(source,/const beforeHealth=Number\(player\.health\|\|0\),beforeArmor=Number\(player\.armor\|\|0\)/,"trap damage owner must snapshot health and armour");
assert.match(source,/player\.armor=0/,"ordinary floor traps must bypass armour for their promised health hit");
assert.match(source,/finally\{[\s\S]*?player\.armor=beforeArmor/,"trap damage owner must restore armour after delegating the hit");
assert.doesNotMatch(source,/player\.invuln=0/,"trap damage must preserve the canonical invulnerability contract");
assert.match(source,/trapRuntime\?\.contact/,"mobile repair must use the canonical rare-events trap contact latch");
assert.match(source,/trapCycles\.set\(key,false\)/,"mobile repair must re-arm the r57 trap-cycle latch while inactive");
assert.match(source,/function syncPortraitCanvasAspect\(\)/,"portrait stability must own a bounded backing-store aspect repair");
assert.match(source,/Math\.max\(1,640\/cssW,360\/cssH\)/,"portrait backing store must scale both axes together from the canonical minimums");
assert.match(source,/aspect-ratio:auto!important/,"portrait playfield must use the live viewport geometry instead of forcing a desktop 16:9 frame");
assert.match(source,/grid-template-rows:28px minmax\(0,1fr\) 74px!important/,"portrait mission, dungeon and HUD must own the active phone shell rows");
assert.match(source,/\.ccg-game>\.v102-topbar,[\s\S]*?\.ccg-game>\.tactical-zone\{[\s\S]*?display:none!important/,"portrait active play must remove desktop-only direct rows instead of leaving implicit grid rows");
assert.match(source,/\.ccg-game>\.game-area\{[\s\S]*?grid-row:2!important/,"portrait dungeon must own the flexible middle grid row");
assert.match(source,/\.ccg-game>\.player-hub\{[\s\S]*?grid-row:3!important/,"portrait combat HUD must own the final explicit grid row");
assert.match(source,/\.player-hub>\.hub-inventory,[\s\S]*?\.player-hub>\.hub-telemetry\{[\s\S]*?display:none!important/,"portrait combat HUD must omit duplicate desktop inventory and telemetry panels");
assert.match(source,/min-width:44px!important/,"portrait movement controls must retain a 44px touch target");
assert.match(source,/min-height:44px!important/,"portrait controls must retain a 44px touch target");
assert.doesNotMatch(source,/\b(?:gainXp|addXp|grantXp|awardXp|awardXP)\b/,"mobile repair must not introduce an XP source");

// Lock the real phone input route, not just the delegated damage owner. V10.4
// touch movement feeds the same input Set consumed by d1(), which enters the
// canonical movePlayer -> movementTriggers -> triggerTrap chain.
for(const key of ["KeyW","KeyA","KeyD","KeyS"])assert.match(touchSource,new RegExp(`data-key=["']${key}["']`),`touch pad must retain ${key} movement mapping`);
assert.match(touchSource,/querySelectorAll\("\[data-key\]"\)[\s\S]*?addEventListener\("pointerdown"[\s\S]*?input\.add\(button\.dataset\.key\)/,"touch pointerdown must feed movement into the canonical input Set");
const d1Function=gameplaySource.match(/function d1\(\)\{[^\n]+\}/)?.[0]||"";
for(const key of ["KeyW","KeyA","KeyD","KeyS"])assert.match(d1Function,new RegExp(`input\\.has\\(["']${key}["']\\)`),`P1 movement resolver must consume ${key} from mobile touch input`);
assert.match(gameplaySource,/function movePlayer\(p,dx,dy,dash=false\)[\s\S]*?movementTriggers\(p\)/,"successful player movement must enter the shared movement trigger boundary");
assert.match(gameplaySource,/function movementTriggers\(p\)[\s\S]*?triggerTrap\(p\)/,"movement trigger boundary must include floor traps");
const trapFunction=gameplaySource.match(/function triggerTrap\(p\)\{[^\n]+\}/)?.[0]||"";
assert.match(trapFunction,/SYS\.trapActive\(t,now\)/,"floor trap boundary must require an active trap cycle");
assert.match(trapFunction,/hurtPlayer\(p,1,false,`\$\{t\.kind\} trap`\)/,"active floor trap movement must delegate one point through hurtPlayer");
assert.match(trapFunction,/CCGLostSizzlerV142R19MobileTrapLayoutStability\?\.guaranteeTrapContactDamage\?\.\(p,t,beforeHealth,beforeArmor\)/,"canonical triggerTrap must hand a missed active contact to the stable R19 repair API");
assert.doesNotMatch(trapFunction,/\b(?:gainXp|addXp|grantXp|awardXp|awardXP)\b/,"canonical floor trap movement must not award progression XP");

const player={id:"P1",x:4,y:5,health:8,armor:6,invuln:0,xp:120,totalXp:450};
const trap={id:"trap-1",x:4,y:5,active:true,kind:"spike"};
const contact=new Set(["test-run|F1|P1|trap-1"]);
const trapCycles=new Map([["P1|trap-1",true]]);
const canvas={width:640,height:360};
const ctx={imageSmoothingEnabled:true};
const cameras=new Map([["P1",{}]]);
const canvasWrap={getBoundingClientRect:()=>({width:360,height:520})};
let insertedStyle="";
let intervalHandler=null;
let now=1000;

const document={
  body:{dataset:{runActive:"true",specialMode:""}},
  head:{appendChild(node){insertedStyle=String(node.textContent||"")}},
  getElementById(id){return id==="game"?canvas:null},
  querySelector(selector){return selector===".canvas-wrap"?canvasWrap:null},
  createElement(){return {id:"",textContent:""}}
};
const context={
  console,
  document,
  performance:{now:()=>now},
  innerWidth:360,
  innerHeight:800,
  matchMedia(query){return {matches:query.includes("orientation: portrait")||query.includes("pointer: coarse")}},
  canvas,
  ctx,
  cameras,
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
  Map,
  Math
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
assert.match(insertedStyle,/grid-template-rows:28px minmax\(0,1fr\) 74px!important/,"runtime style must retain definite portrait shell rows");

const cssAspect=360/520;
const canvasAspect=canvas.width/canvas.height;
assert.ok(Math.abs(canvasAspect-cssAspect)<=0.004,`portrait canvas backing aspect ${canvasAspect} must match displayed aspect ${cssAspect}`);
assert.ok(canvas.width>=640&&canvas.height>=360,"portrait aspect repair must retain the canonical minimum backing-store dimensions");
assert.equal(ctx.imageSmoothingEnabled,false,"portrait aspect repair must retain crisp pixel rendering");
assert.equal(context.CCGLostSizzlerV142R19MobileTrapLayoutStability.state.canvasAspectRepairs,1,"initial squashed portrait backing store must be repaired exactly once");
const repairedWidth=canvas.width,repairedHeight=canvas.height;
assert.equal(context.CCGLostSizzlerV142R19MobileTrapLayoutStability.syncPortraitCanvasAspect(),false,"stable portrait geometry must not churn the backing store");
assert.equal(canvas.width,repairedWidth,"stable portrait width must remain unchanged");
assert.equal(canvas.height,repairedHeight,"stable portrait height must remain unchanged");

function chainStats(owner){
  const seen=new Set();
  let current=owner,depth=0,r19Owners=0;
  while(typeof current==="function"&&!seen.has(current)){
    seen.add(current);depth++;
    if(current.__ccgV142R19MobileTrapDamage===true)r19Owners++;
    current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null;
  }
  return{depth,r19Owners};
}

// Simulate a later guarded owner (like R18). R19 must remain exactly once in
// the linked ancestry rather than repeatedly re-wrapping later owners on each
// lifecycle pass. Its independent contact/protection state still screens the
// delegated trap call when that later owner reaches R19.
const firstR19Owner=context.hurtPlayer;
const initialInstalls=context.CCGLostSizzlerV142R19MobileTrapLayoutStability.state.damageOwnerInstalls;
const lateRepairOwner=function lateRepairOwner(target,...args){target.invuln=0;return firstR19Owner(target,...args)};
lateRepairOwner.__ccgOriginal=firstR19Owner;
context.hurtPlayer=lateRepairOwner;
const beforeReinstallStats=chainStats(context.hurtPlayer);
context.CCGLostSizzlerV142R19MobileTrapLayoutStability.installTrapDamageOwner();
const afterReinstallStats=chainStats(context.hurtPlayer);
assert.equal(context.hurtPlayer,lateRepairOwner,"a legitimate later guarded owner must remain outermost");
assert.equal(afterReinstallStats.r19Owners,1,"hurtPlayer ancestry must contain exactly one R19 trap owner");
assert.equal(afterReinstallStats.depth,beforeReinstallStats.depth,"guard installation must not grow an ancestry that already contains R19");
assert.equal(context.CCGLostSizzlerV142R19MobileTrapLayoutStability.state.damageOwnerInstalls,initialInstalls,"bounded ownership must not record a duplicate R19 installation");
context.CCGLostSizzlerV142R19MobileTrapLayoutStability.installTrapDamageOwner();
assert.deepEqual(chainStats(context.hurtPlayer),afterReinstallStats,"repeated guarded installation must keep wrapper depth and R19 ownership stable");

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
assert.equal(player.health,afterFirstTrap,"post-hit protection must prevent an immediate duplicate trap hit before a later wrapper can mutate invulnerability");
assert.equal(player.armor,beforeArmor,"duplicate trap suppression must not consume armour");

player.invuln=0;
context.hurtPlayer(player,1,false,"dungeon trap");
assert.equal(player.health,afterFirstTrap,"the successful hit protection window must survive a mutable player invulnerability field during the same contact");
assert.equal(player.armor,beforeArmor,"protected duplicate trap contact must preserve armour");

// Leaving/deactivating a trap is a genuine lifecycle boundary. It must clear
// both the active-contact latch and its temporary protection so the next real
// active contact can inflict exactly one new hit, matching R57's cycle contract.
player.x=3;
context.CCGLostSizzlerV142R19MobileTrapLayoutStability.rearmInactiveTrapContacts();
player.x=4;
player.invuln=0;
context.hurtPlayer(player,1,false,"spike trap");
const afterSecondContact=player.health;
assert.equal(afterSecondContact,afterFirstTrap-1,"a re-armed floor-trap contact must deal exactly one new health hit");
assert.equal(player.armor,beforeArmor,"a re-armed floor-trap hit must still preserve armour");
assert.equal(player.xp,beforeXp,"re-armed trap damage must not award progression XP");
assert.equal(player.totalXp,beforeTotalXp,"re-armed trap damage must not mutate total progression XP");

context.hurtPlayer(player,1,false,"spike trap");
assert.equal(player.health,afterSecondContact,"the new active contact must still suppress its immediate duplicate hit");
assert.equal(player.armor,beforeArmor,"duplicate suppression on the re-armed contact must preserve armour");
assert.ok(context.CCGLostSizzlerV142R19MobileTrapLayoutStability.state.trapProtectionBlocks>=3,"same-contact duplicates must remain blocked by independent trap protection");

now=1300;
player.invuln=0;
context.hurtPlayer(player,1,false,"spike trap");
assert.equal(player.health,afterSecondContact,"expiry of the time window alone must not duplicate-hit while the active contact latch remains set");
assert.ok(context.CCGLostSizzlerV142R19MobileTrapLayoutStability.state.trapContactBlocks>=1,"active contact latch must continue suppressing damage after the temporary protection window expires");

player.x=3;
context.CCGLostSizzlerV142R19MobileTrapLayoutStability.rearmInactiveTrapContacts();
player.x=4;
player.invuln=0;
context.hurtPlayer(player,1,false,"spike trap");
assert.equal(player.health,afterSecondContact-1,"a later independently re-armed trap cycle may deal exactly one further health hit");
assert.equal(player.armor,beforeArmor,"later re-armed trap cycle must preserve armour");

const afterRearmedTrap=player.health;
player.invuln=0;
context.hurtPlayer(player,1,false,"enemy melee");
assert.equal(player.health,afterRearmedTrap,"non-trap damage must retain the existing armour-first contract");
assert.equal(player.armor,beforeArmor-1,"non-trap damage must still be absorbed by armour normally");

console.log("v10-42 mobile trap/layout stability contract passed");