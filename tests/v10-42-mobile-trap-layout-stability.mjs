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

assert.match(bootstrap,/v10-42-r19-mobile-trap-layout-stability\.js/,"ordered V10.42 bootstrap must load the portrait mobile layout adapter");
assert.match(bootstrap,/CCGLostSizzlerV142R19MobileLayoutCompatibility/,"ordered bootstrap must wait for the non-gameplay layout marker");
const r19Index=bootstrap.indexOf("v10-42-r19-mobile-trap-layout-stability.js");
const r1Index=bootstrap.indexOf("v10-42-r1-stability.js");
const r18Index=bootstrap.indexOf("v10-42-r18-solo-playtest-stability.js");
assert.ok(r19Index>=0&&r19Index<r1Index,"portrait layout must load before the final R1/R18 guarded stability pair");
assert.ok(r1Index<r18Index,"R1 must remain immediately before R18 in the ordered bootstrap");

assert.match(source,/gameplayOwnership:false/,"R19 compatibility must explicitly be non-gameplay ownership");
assert.doesNotMatch(source,/__ccgV142R19MobileTrapDamage/,"layout compatibility must not restore the retired R19 damage owner");
assert.doesNotMatch(source,/window\.hurtPlayer\s*=/,"layout compatibility must not replace hurtPlayer");
assert.doesNotMatch(source,/window\.triggerTrap\s*=/,"layout compatibility must not replace triggerTrap");
assert.doesNotMatch(source,/hurtPlayer\([^)]*trap/,"layout compatibility must not apply ordinary trap HEALTH damage");
assert.match(source,/CCGLostSizzlerV142R58AuthoritativeTrapCore/,"layout compatibility must delegate trap API calls to the canonical R58 owner");
assert.match(source,/function syncPortraitCanvasAspect\(\)/,"portrait compatibility must own bounded backing-store aspect repair");
assert.match(source,/Math\.max\(1,640\/cssW,360\/cssH\)/,"portrait backing store must scale both axes together from canonical minimums");
assert.match(source,/grid-template-rows:28px minmax\(0,1fr\) 74px!important/,"portrait mission, dungeon and HUD must own the active phone shell rows");
assert.match(source,/aspect-ratio:auto!important/,"portrait playfield must use live viewport geometry instead of forcing desktop 16:9");
assert.match(source,/min-width:44px!important/,"portrait movement controls must retain a 44px touch target");
assert.match(source,/min-height:44px!important/,"portrait controls must retain a 44px touch target");

assert.match(gameplaySource,/const authoritativeDamagePlayer=hurtPlayer/,"canonical gameplay must capture the damage/death primitive before compatibility modules load");
assert.match(gameplaySource,/function applyActiveTrapContact\(p,t,now=performance\.now\(\)\)/,"canonical gameplay must own active floor-trap contacts");
assert.match(gameplaySource,/beforeInvuln=Math\.max\(0,Number\(p\.invuln\|\|0\)\)[\s\S]*p\.invuln=0[\s\S]*authoritativeDamagePlayer\(p,1,false,/,"validated active trap contact must bypass unrelated pre-existing invulnerability");
assert.match(gameplaySource,/const healthLost=afterHealth<beforeHealth,deathRecorded=afterDeaths>beforeDeaths,verified=\(healthLost\|\|deathRecorded\)&&\/trap\/i\.test\(damageSource\)/,"trap success must require real HEALTH loss or a canonical death transition");
assert.match(gameplaySource,/if\(!verified\)\{p\.invuln=beforeInvuln;authoritativeTrapState\.damageRetries\+\+;return false\}/,"failed trap damage must restore prior invulnerability and remain retryable");
assert.match(gameplaySource,/trapCycleHits\.set\(key,cycle\)/,"verified trap contact must consume exactly that active cycle");
assert.match(gameplaySource,/window\.CCGLostSizzlerV142R58AuthoritativeTrapCore=authoritativeTrapApi/,"canonical R58 trap API must be exported");

for(const key of ["KeyW","KeyA","KeyD","KeyS"])assert.match(touchSource,new RegExp(`data-key=["']${key}["']`),`touch pad must retain ${key} movement mapping`);
assert.match(touchSource,/querySelectorAll\("\[data-key\]"\)[\s\S]*?addEventListener\("pointerdown"[\s\S]*?input\.add\(button\.dataset\.key\)/,"touch pointerdown must feed movement into the canonical input Set");
assert.match(gameplaySource,/function movementTriggers\(p,deliberate=false\)[\s\S]*?triggerTrap\(p\)/,"movement boundary must include canonical floor traps");

const canvas={width:640,height:360};
const ctx={imageSmoothingEnabled:true};
const cameras=new Map([["P1",{}]]);
const canvasWrap={getBoundingClientRect:()=>({width:360,height:520})};
let insertedStyle="";
let intervalHandler=null;
const canonicalState={trapHits:2,damageRetries:1};
let delegated=0;
const canonical={
  state:canonicalState,
  damageValidatedTrapContact(){delegated++;return true},
  guaranteeTrapContactDamage(){return true},
  damageOccupiedActiveTraps(){return true},
  rearmInactiveTrapContacts(){return true},
  rearmStaleCycleContact(){return{contactKey:"P1|trap",cycle:1}},
  updateTrapContacts(){return true},
  trapActive(){return true},
  trapCycleId(){return 1}
};
const document={
  body:{dataset:{runActive:"true",specialMode:""}},
  head:{appendChild(node){insertedStyle=String(node.textContent||"")}},
  getElementById(id){return id==="game"?canvas:null},
  querySelector(selector){return selector===".canvas-wrap"?canvasWrap:null},
  createElement(){return{id:"",textContent:""}}
};
const context={
  console,document,performance:{now:()=>1000},innerWidth:360,innerHeight:800,
  matchMedia(query){return{matches:query.includes("orientation: portrait")||query.includes("pointer: coarse")}},
  canvas,ctx,cameras,
  CCGLostSizzlerSpecialModes:{active:null},
  CCGLostSizzlerV142R58AuthoritativeTrapCore:canonical,
  setInterval(fn){intervalHandler=fn;return 1},
  clearInterval(){},addEventListener(){},Set,Map,Math,Object
};
context.window=context;context.globalThis=context;
vm.createContext(context);
vm.runInContext(source,context,{filename:modulePath});

assert.equal(typeof intervalHandler,"function","portrait layout adapter must retain its bounded layout/aspect timer");
assert.match(insertedStyle,/grid-template-rows:28px minmax\(0,1fr\) 74px!important/,"runtime style must install compact portrait shell rows");
assert.match(insertedStyle,/grid-template-columns:repeat\(3,44px\)!important/,"runtime style must retain usable movement controls");
const cssAspect=360/520,canvasAspect=canvas.width/canvas.height;
assert.ok(Math.abs(canvasAspect-cssAspect)<=0.004,`portrait canvas backing aspect ${canvasAspect} must match displayed aspect ${cssAspect}`);
assert.ok(canvas.width>=640&&canvas.height>=360,"portrait repair must retain canonical minimum backing-store dimensions");
assert.equal(ctx.imageSmoothingEnabled,false,"portrait repair must preserve crisp pixel rendering");
assert.equal(context.CCGLostSizzlerV142R19MobileTrapLayoutStability.state.canvasAspectRepairs,1,"initial portrait mismatch must repair once");
assert.equal(context.CCGLostSizzlerV142R19MobileTrapLayoutStability.state.trapHits,2,"layout facade must expose canonical trap diagnostics without owning them");
assert.equal(context.CCGLostSizzlerV142R19MobileTrapLayoutStability.damageValidatedTrapContact({},{}),true,"layout facade must delegate legacy API calls to canonical R58");
assert.equal(delegated,1,"delegated compatibility call must reach canonical R58 exactly once");
const repairedWidth=canvas.width,repairedHeight=canvas.height;
assert.equal(context.CCGLostSizzlerV142R19MobileTrapLayoutStability.syncPortraitCanvasAspect(),false,"stable portrait geometry must not churn backing store");
assert.equal(canvas.width,repairedWidth);
assert.equal(canvas.height,repairedHeight);

console.log("v10-42 mobile layout + canonical trap ownership contract passed");
