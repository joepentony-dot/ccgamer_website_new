import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const hotfix=read("js/v10-41-r25-spy-speed-bounty-hotfix.js");
const controller=read("js/v10-41-mode-runtime.js");
const index=read("index.html");

// Delivery: r25 remains part of the canonical runtime under the current r30
// cache shell so browsers cannot retain an older copy of this compatibility layer.
assert.match(index,/v10-41-r25-spy-speed-bounty-hotfix\.js\?v=20260826r30/,"canonical page must load the retained r25 Spy hotfix under the current r30 cache token");

// Ownership: movement cadence belongs to the isolated Spy engine. The retained
// r25 layer may isolate bounty/UI state, but it cannot own the global frame.
assert.match(hotfix,/function controllerFrameIsolation\(controllerId\)/,"r25 must expose an explicit special-mode controller hook");
assert.match(hotfix,/state\.controllerOwnedUpdate=true/,"r25 must declare controller-owned update execution");
assert.doesNotMatch(hotfix,/window\.update\s*=/,"r25 must never replace the controller update boundary");
assert.match(controller,/CCGLostSizzlerV141R25SpySpeedBountyHotfix\?\.controllerFrameIsolation/,"the mode runtime must invoke r25 isolation explicitly");

// Special-mode isolation: ordinary dungeon bounty state and presentation must
// be removed for Spy Vs Spy while remaining available in ordinary dungeon play.
assert.match(hotfix,/new Set\(\["sizzler-saboteurs","horde-survivor"\]\)/,"special-mode isolation must explicitly include Spy Vs Spy and Horde");
assert.match(hotfix,/if\(rare\.bounty\)\{rare\.bounty=null;changed=true\}/,"active rare-event bounty state must be purged in special modes");
assert.match(hotfix,/if\(run\.dungeonBounty\)\{run\.dungeonBounty=null;changed=true\}/,"legacy dungeon bounty state must also be purged");
assert.match(hotfix,/specialActive\(\)&&dungeonOnlyText\(title\)/,"dungeon-only toast presentation must be blocked while a special mode owns the run");
assert.match(hotfix,/specialActive\(\)&&DUNGEON_VOICE_KEYS\.test/,"legacy dungeon bounty voice must be blocked while a special mode owns announcements");

// Wrapper ownership: r24 and the major notification watchdog both periodically
// reassert their wrappers. r25 must inherit their markers rather than causing
// those watchdogs to wrap r25 again forever.
assert.match(hotfix,/function inheritMarkers\(wrapped,current\)/,"r25 must preserve inherited runtime wrapper ownership");
assert.match(hotfix,/Object\.assign\(wrapped,current\)/,"r25 wrapper functions must carry the previous wrapper's markers forward");

// Lightweight behavioural proof of the controller hook. The global update
// identity must remain untouched while the hook removes special-mode Dungeon state.
const body={dataset:{specialMode:"sizzler-saboteurs"},removeAttribute(){}};
function baseStart(){return true}
baseStart.__ccgV141R24SoloBalance=true;
function baseUpdate(){this.p1.x+=1;return true}
baseUpdate.__ccgV141R24SpyMovement=true;
function baseToast(){return true}
baseToast.__ccgV141MajorHardening=true;
function baseVoice(){return true}
baseVoice.__ccgV141MajorVisual=true;
const context={
  console,
  performance:{now:()=>1000},
  setInterval:()=>1,clearInterval:()=>{},
  addEventListener:()=>{},
  document:{body,getElementById:()=>null},
  CCG_CONFIG:{player:{moveDelay:138}},
  run:{specialMode:"sizzler-saboteurs",rareMutation:"ELITE BOUNTY",dungeonBounty:{active:true},activeBounty:{active:true}},
  p1:{id:"P1",x:2,y:1,moveMultiplier:1},
  move1:0,
  startWorld:baseStart,
  update:baseUpdate,
  showToast:baseToast,
  CCGLostSizzlerVoice:{say:baseVoice},
  CCGLostSizzlerRareEvents:{state:{bounty:{type:"KILL 3 HUNTERS"},mutation:{type:"ELITE BOUNTY"},golden:null,hintTarget:null,hintMarkerUntil:0}},
  CCGLostSizzlerV141R24LiveRegressions:{state:{spyMoveCooldownMs:0}},
  CCGLostSizzlerSpecialModes:{active:{type:"sizzler-saboteurs"}}
};
context.window=context;
vm.createContext(context);
vm.runInContext(hotfix,context,{filename:"v10-41-r25-spy-speed-bounty-hotfix.js"});
const api=context.CCGLostSizzlerV141R25SpySpeedBountyHotfix;
assert.ok(api,"r25 hotfix API must install");
assert.equal(api.movementCadence(context.p1),138,"the retained diagnostic helper must remain compatible");
const stableUpdate=context.update;
assert.equal(stableUpdate,baseUpdate,"r25 installation must preserve the existing update owner");
context.CCGLostSizzlerRareEvents.state.bounty={type:"KILL 3 HUNTERS"};
context.run.dungeonBounty={active:true};context.run.activeBounty={active:true};
assert.equal(api.controllerFrameIsolation("dungeon-solo"),false,"r25 isolation must reject a Dungeon controller");
assert.equal(context.run.dungeonBounty.active,true,"a rejected controller hook must not purge Dungeon state");
assert.equal(api.controllerFrameIsolation("spy-online"),true,"the Spy controller must run r25 isolation");
assert.equal(api.state.controllerFrames,1,"controller-owned isolation frames must be measurable");
assert.equal(context.CCGLostSizzlerRareEvents.state.bounty,null,"Spy must not retain a rare-event Dungeon Bounty");
assert.equal(context.run.dungeonBounty,null,"Spy must not retain a legacy Dungeon Bounty");
assert.equal(context.run.activeBounty,null,"Spy must not retain an active legacy bounty");

assert.equal(context.update,baseUpdate,"r25 must leave the inherited update identity untouched");
assert.equal(context.startWorld.__ccgV141R24SoloBalance,true,"r25 start wrapper must preserve r24 balance ownership so r24 does not wrap it again");
assert.equal(context.showToast.__ccgV141MajorHardening,true,"r25 toast wrapper must preserve major-notification ownership");
assert.equal(context.CCGLostSizzlerVoice.say.__ccgV141MajorVisual,true,"r25 voice wrapper must preserve major-notification voice ownership");
const stableStart=context.startWorld,stableToast=context.showToast,stableVoice=context.CCGLostSizzlerVoice.say;
api.install();api.install();
assert.equal(context.update,stableUpdate,"repeated r25 installs must not grow the update wrapper chain");
assert.equal(context.startWorld,stableStart,"repeated r25 installs must not grow the startWorld wrapper chain");
assert.equal(context.showToast,stableToast,"repeated r25 installs must not grow the toast wrapper chain");
assert.equal(context.CCGLostSizzlerVoice.say,stableVoice,"repeated r25 installs must not grow the voice wrapper chain");

// Ordinary dungeon mode must not be purged by the hotfix.
context.CCGLostSizzlerSpecialModes.active={type:"dungeon"};
body.dataset.specialMode="dungeon";
context.run.specialMode="";
context.CCGLostSizzlerRareEvents.state.bounty={type:"KILL 3 HUNTERS"};
assert.equal(api.purgeSpecialDungeonState(),false,"ordinary dungeon bounty behaviour must remain untouched");
assert.deepEqual(context.CCGLostSizzlerRareEvents.state.bounty,{type:"KILL 3 HUNTERS"});

console.log("Lost Sizzler r25 controller-owned Dungeon Bounty isolation and non-update wrapper stability checks passed under r30.");
