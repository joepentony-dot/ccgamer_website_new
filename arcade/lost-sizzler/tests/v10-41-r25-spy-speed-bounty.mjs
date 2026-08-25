import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const hotfix=read("js/v10-41-r25-spy-speed-bounty-hotfix.js");
const index=read("index.html");

// Delivery: r25 must be loaded directly by the canonical game page so a browser
// cannot keep the already-cached r24 movement/notification chain without the fix.
assert.match(index,/v10-41-r25-spy-speed-bounty-hotfix\.js\?v=20260825r25/,"canonical page must load the r25 Spy hotfix with the r25 cache token");

// Movement: the emergency r24 fallback and ordinary movement must be re-armed
// from one normal dungeon cadence after any real Spy movement.
assert.match(hotfix,/r24\.spyMoveCooldownMs=Math\.max\(Number\(r24\.spyMoveCooldownMs\)\|\|0,cadence\)/,"r25 must synchronise the r24 fallback cooldown after a real movement step");
assert.match(hotfix,/move1=Math\.max\(Number\(move1\)\|\|0,cadence\)/,"r25 must synchronise the normal P1 movement timer with the fallback timer");
assert.match(hotfix,/CCG_CONFIG\?\.player\?\.moveDelay\|\|138/,"Spy cadence must derive from the normal dungeon movement delay");

// Special-mode isolation: ordinary dungeon bounty state and presentation must
// be removed for Spy Vs Spy while remaining available in ordinary dungeon play.
assert.match(hotfix,/new Set\(\["sizzler-saboteurs","horde-survivor"\]\)/,"special-mode isolation must explicitly include Spy Vs Spy and Horde");
assert.match(hotfix,/if\(rare\.bounty\)\{rare\.bounty=null;changed=true\}/,"active rare-event bounty state must be purged in special modes");
assert.match(hotfix,/if\(run\.dungeonBounty\)\{run\.dungeonBounty=null;changed=true\}/,"legacy dungeon bounty state must also be purged");
assert.match(hotfix,/specialActive\(\)&&dungeonOnlyText\(title\)/,"dungeon-only toast presentation must be blocked while a special mode owns the run");
assert.match(hotfix,/specialActive\(\)&&DUNGEON_VOICE_KEYS\.test/,"legacy dungeon bounty voice must be blocked while a special mode owns the run");

// Lightweight behavioural proof using the exported helpers. This executes the
// actual hotfix rather than validating strings alone.
const body={dataset:{specialMode:"sizzler-saboteurs"},removeAttribute(){}};
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
  startWorld(){return true},
  update(){return true},
  showToast(){return true},
  CCGLostSizzlerRareEvents:{state:{bounty:{type:"KILL 3 HUNTERS"},mutation:{type:"ELITE BOUNTY"},golden:null,hintTarget:null,hintMarkerUntil:0}},
  CCGLostSizzlerV141R24LiveRegressions:{state:{spyMoveCooldownMs:0}},
  CCGLostSizzlerSpecialModes:{active:{type:"sizzler-saboteurs"}}
};
context.window=context;
vm.createContext(context);
vm.runInContext(hotfix,context,{filename:"v10-41-r25-spy-speed-bounty-hotfix.js"});
const api=context.CCGLostSizzlerV141R25SpySpeedBountyHotfix;
assert.ok(api,"r25 hotfix API must install");
assert.equal(api.movementCadence(context.p1),138,"Spy should use the ordinary dungeon cadence rather than an accelerated fallback cadence");
assert.equal(api.syncSpyCadence({x:1,y:1},context.p1),true,"a real Spy step must re-arm movement pacing");
assert.equal(context.move1,138,"normal movement cooldown must be re-armed after the Spy step");
assert.equal(context.CCGLostSizzlerV141R24LiveRegressions.state.spyMoveCooldownMs,138,"fallback cooldown must match normal movement cooldown");
api.purgeSpecialDungeonState();
assert.equal(context.CCGLostSizzlerRareEvents.state.bounty,null,"Spy must not retain a rare-event Dungeon Bounty");
assert.equal(context.run.dungeonBounty,null,"Spy must not retain a legacy Dungeon Bounty");
assert.equal(context.run.activeBounty,null,"Spy must not retain an active legacy bounty");

// Ordinary dungeon mode must not be purged by the hotfix.
context.CCGLostSizzlerSpecialModes.active={type:"dungeon"};
body.dataset.specialMode="dungeon";
context.run.specialMode="";
context.CCGLostSizzlerRareEvents.state.bounty={type:"KILL 3 HUNTERS"};
assert.equal(api.purgeSpecialDungeonState(),false,"ordinary dungeon bounty behaviour must remain untouched");
assert.deepEqual(context.CCGLostSizzlerRareEvents.state.bounty,{type:"KILL 3 HUNTERS"});

console.log("Lost Sizzler r25 Spy movement cadence and Dungeon Bounty isolation checks passed.");
