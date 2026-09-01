import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerModeRuntime));
  const ownedGateNames=["updateCamping","updateHazards","updateDedicatedHazards","updateGenerators","updateArena","updateTimed","updateBoulder","updateMemoryPuzzle","updateRescue","updateBanishment","updateStalker","updateFloorObjective","updateAlert","updateRoomEvents","triggerTrap","triggerArena","triggerTimed","triggerBoulder","tryChest"];
  await page.waitForFunction(names=>names.every(name=>Boolean(window.CCGLostSizzlerModeRuntime?.ownedSystemState?.(name)?.installed)),ownedGateNames);

  const contract=await page.evaluate(gateNames=>{
    const api=window.CCGLostSizzlerModeRuntime,ids=api.IDS,profiles=api.PROFILES;
    return{
      ids:Object.values(ids),
      profileCount:Object.keys(profiles).length,
      uniqueStateCount:new Set([...api.controllers.values()].map(controller=>controller.state)).size,
      sharedCore:[...api.SHARED_CORE],modeOwned:[...api.MODE_OWNED],
      dungeonCaps:[profiles[ids.DUNGEON_SOLO].dungeonSystems,profiles[ids.DUNGEON_ONLINE].dungeonSystems,profiles[ids.SPLIT_SCREEN].dungeonSystems],
      dungeonInteractions:[profiles[ids.DUNGEON_SOLO].dungeonInteractions,profiles[ids.DUNGEON_ONLINE].dungeonInteractions,profiles[ids.SPLIT_SCREEN].dungeonInteractions],
      specialCaps:[profiles[ids.HORDE_SOLO].dungeonSystems,profiles[ids.HORDE_ONLINE].dungeonSystems,profiles[ids.SPY_ONLINE].dungeonSystems],
      specialInteractions:[profiles[ids.HORDE_SOLO].dungeonInteractions,profiles[ids.HORDE_ONLINE].dungeonInteractions,profiles[ids.SPY_ONLINE].dungeonInteractions],
      gates:gateNames.map(name=>({name,state:api.ownedSystemState(name)}))
    };
  },ownedGateNames);
  assert.deepEqual(contract.ids.sort(),["dungeon-online","dungeon-solo","horde-online","horde-solo","split-screen","spy-online"].sort(),"the runtime must expose exactly six isolated mode controllers");
  assert.equal(contract.profileCount,6,"each mode must have its own capability profile");
  assert.equal(contract.uniqueStateCount,6,"each mode controller must own a distinct state object");
  assert.deepEqual(contract.dungeonCaps,[true,true,true],"Solo, Dungeon Multiplayer and split-screen retain dungeon systems");
  assert.deepEqual(contract.dungeonInteractions,[true,true,true],"all three dungeon controllers retain dungeon interactions");
  assert.deepEqual(contract.specialCaps,[false,false,false],"Horde Solo, Horde Multiplayer and Spy must not own dungeon-only systems");
  assert.deepEqual(contract.specialInteractions,[false,false,false],"Horde Solo, Horde Multiplayer and Spy must not own dungeon-only interaction triggers");
  for(const gate of contract.gates){assert.ok(gate.state?.installed,`${gate.name} must be routed through the active mode controller`)}
  for(const required of ["rendering","collision","audio","basic-weapons","player-movement"])assert.ok(contract.sharedCore.includes(required),`shared core must declare ${required}`);
  for(const required of ["wave-transitions","control-locking","death-state","respawning","hazards","scoring","multiplayer-sync","mode-ui"])assert.ok(contract.modeOwned.includes(required),`mode-owned contract must declare ${required}`);

  const routing=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerModeRuntime,special=window.CCGLostSizzlerSpecialModes;
    const descriptor=Object.getOwnPropertyDescriptor(special,"active"),previousPlay=playMode,previousSpecial=document.body.dataset.specialMode,previousSolo=document.body.dataset.hordeSolo;
    const result={};
    try{
      Object.defineProperty(special,"active",{configurable:true,value:null});delete document.body.dataset.specialMode;delete document.body.dataset.hordeSolo;
      playMode="solo";result.solo=api.sync("test solo").id;
      playMode="online";result.dungeonOnline=api.sync("test dungeon online").id;
      playMode="split";result.split=api.sync("test split").id;
      playMode="online";document.body.dataset.specialMode="horde-survivor";document.body.dataset.hordeSolo="true";
      Object.defineProperty(special,"active",{configurable:true,value:{type:"horde-survivor",state:{wave:3,state:"wave"}}});result.hordeSolo=api.sync("test horde solo").id;
      document.body.dataset.hordeSolo="false";result.hordeOnline=api.sync("test horde online").id;
      document.body.dataset.specialMode="sizzler-saboteurs";Object.defineProperty(special,"active",{configurable:true,value:{type:"sizzler-saboteurs",state:{}}});result.spy=api.sync("test spy").id;
    }finally{
      playMode=previousPlay;
      if(previousSpecial===undefined)delete document.body.dataset.specialMode;else document.body.dataset.specialMode=previousSpecial;
      if(previousSolo===undefined)delete document.body.dataset.hordeSolo;else document.body.dataset.hordeSolo=previousSolo;
      if(descriptor)Object.defineProperty(special,"active",descriptor);else delete special.active;
      api.sync("test restore");
    }
    return result;
  });
  assert.deepEqual(routing,{solo:"dungeon-solo",dungeonOnline:"dungeon-online",split:"split-screen",hordeSolo:"horde-solo",hordeOnline:"horde-online",spy:"spy-online"},"router must select the six controllers without cross-mode ambiguity");

  const dungeonAllowed=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerModeRuntime,special=window.CCGLostSizzlerSpecialModes;
    const descriptor=Object.getOwnPropertyDescriptor(special,"active"),previousPlay=playMode,previousSpecial=document.body.dataset.specialMode,previousSolo=document.body.dataset.hordeSolo;
    try{
      run=PGR.makeRun({difficulty:"ARCADE",seed:"MODE-ISOLATION-DUNGEON"});playMode="solo";startWorld(PGR.floorSeed(run),false,false);mode="playing";document.body.dataset.runActive="true";
      Object.defineProperty(special,"active",{configurable:true,value:null});delete document.body.dataset.specialMode;delete document.body.dataset.hordeSolo;api.sync("test dungeon capability");
      campStates.clear();const before=api.snapshot();window.updateCamping(p1,1);const after=api.snapshot();
      return{activeId:after.activeId,camping:campStates.size,blockedDelta:after.blockedOwnedSystemCalls-before.blockedOwnedSystemCalls,callDelta:after.ownedSystemCalls-before.ownedSystemCalls};
    }finally{
      playMode=previousPlay;
      if(previousSpecial===undefined)delete document.body.dataset.specialMode;else document.body.dataset.specialMode=previousSpecial;
      if(previousSolo===undefined)delete document.body.dataset.hordeSolo;else document.body.dataset.hordeSolo=previousSolo;
      if(descriptor)Object.defineProperty(special,"active",descriptor);else delete special.active;
      api.sync("test dungeon restore");
    }
  });
  assert.equal(dungeonAllowed.activeId,"dungeon-solo","dungeon capability check must run under Dungeon Solo");
  assert.equal(dungeonAllowed.blockedDelta,0,"Dungeon Solo anti-camping must execute rather than being blocked by another mode");
  assert.ok(dungeonAllowed.callDelta>=1,"Dungeon Solo anti-camping must pass through the controller-owned dispatcher");
  assert.ok(dungeonAllowed.camping>=1,"Dungeon Solo anti-camping must retain its own camping state");

  const hordeReset=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerModeRuntime,special=window.CCGLostSizzlerSpecialModes;
    const descriptor=Object.getOwnPropertyDescriptor(special,"active"),previousPlay=playMode,previousSpecial=document.body.dataset.specialMode,previousSolo=document.body.dataset.hordeSolo;
    try{
      run=PGR.makeRun({difficulty:"ARCADE",seed:"MODE-ISOLATION-HORDE"});playMode="solo";startWorld(PGR.floorSeed(run),false,false);mode="playing";document.body.dataset.runActive="true";
      host.enemies=[];host.generators=[];move1=0;fire1=0;fireBuffer1=0;input.clear();
      if(!p1)throw new Error("mode-isolation Horde scenario requires an initialized P1");
      document.body.dataset.specialMode="horde-survivor";document.body.dataset.hordeSolo="true";
      Object.defineProperty(special,"active",{configurable:true,value:{type:"horde-survivor",state:{wave:3,state:"wave"}}});api.sync("test horde reset");
      const before=api.snapshot(),alertBefore=Number(run.alert||0),healthBefore=Number(p1.health||0);
      campStates.clear();hazards.length=0;
      window.updateCamping(p1,Math.max(1000,Number(C.camping?.graceMs||0)+1000));
      host.traps=[{id:"forbidden-horde-trap",active:true,x:p1.x,y:p1.y,kind:"spike"}];window.triggerTrap(p1);
      const blocked={hazards:hazards.length,camping:campStates.size,alert:Number(run.alert||0),health:Number(p1.health||0),snapshot:api.snapshot()};
      host.traps=[];
      hazards.push({x:p1.x,y:p1.y,life:1000,campOwner:"P1",direct:true});campStates.set("P1",{x:p1.x,y:p1.y,stillMs:9999});
      move1=9999;fire1=9999;fireBuffer1=9999;p1.hitStunMs=9999;
      special.active.state.wave=4;special.active.state.state="intermission";api.monitorHordeLifecycle();
      const deathBefore=api.snapshot().hordeDeathPresentations;
      const hordeDead={id:"horde-death-test",x:p1.x+1,y:p1.y,hordeEnemy:true,alive:false},dungeonDead={id:"dungeon-death-control",x:p1.x+2,y:p1.y,alive:false};host.enemies.push(hordeDead,dungeonDead);
      const presented=api.presentHordeDeaths(),deathAfter=api.snapshot().hordeDeathPresentations;
      return{
        hazards:hazards.length,camping:campStates.size,move1,fire1,fireBuffer1,hitStun:p1.hitStunMs,snapshot:api.snapshot(),before,
        blocked,alertBefore,healthBefore,presented,deathDelta:deathAfter-deathBefore,hordeDeathMarked:Boolean(hordeDead._ccgModeHordeDeathPresented),dungeonDeathMarked:Boolean(dungeonDead._ccgModeHordeDeathPresented)
      };
    }finally{
      playMode=previousPlay;
      if(previousSpecial===undefined)delete document.body.dataset.specialMode;else document.body.dataset.specialMode=previousSpecial;
      if(previousSolo===undefined)delete document.body.dataset.hordeSolo;else document.body.dataset.hordeSolo=previousSolo;
      if(descriptor)Object.defineProperty(special,"active",descriptor);else delete special.active;
      api.sync("test reset restore");
    }
  });
  assert.equal(hordeReset.blocked.hazards,0,"Horde must block dungeon anti-camping before it can create a red-circle hazard");
  assert.equal(hordeReset.blocked.camping,0,"Horde must block dungeon anti-camping before it can create camping state");
  assert.equal(hordeReset.blocked.alert,hordeReset.alertBefore,"blocked dungeon camping must not alter Horde alert state");
  assert.equal(hordeReset.blocked.health,hordeReset.healthBefore,"blocked dungeon trap interactions must not damage a Horde player");
  assert.ok(hordeReset.blocked.snapshot.blockedOwnedSystemCalls>=hordeReset.before.blockedOwnedSystemCalls+2,"Horde must record blocked dungeon update and interaction calls at the controller boundary");
  assert.equal(hordeReset.hazards,0,"Horde lifecycle must purge stale dungeon red-circle hazard state at a wave/phase transition");
  assert.equal(hordeReset.camping,0,"Horde lifecycle must purge stale dungeon camping state at a wave/phase transition");
  assert.equal(hordeReset.move1,0,"Horde wave transition must release movement cooldown/lock state");
  assert.equal(hordeReset.fire1,0,"Horde wave transition must release firing cooldown/lock state");
  assert.equal(hordeReset.fireBuffer1,0,"Horde wave transition must release stale firing buffers");
  assert.equal(hordeReset.hitStun,0,"Horde wave transition must release stale player hit-stun state");
  assert.ok(hordeReset.snapshot.hordeWaveResets>hordeReset.before.hordeWaveResets,"Horde wave reset counter must advance");
  assert.ok(hordeReset.snapshot.hordePhaseResets>hordeReset.before.hordePhaseResets,"Horde phase reset counter must advance");
  assert.equal(hordeReset.presented,1,"Horde physical enemy removal must produce one Horde-owned death presentation");
  assert.equal(hordeReset.deathDelta,1,"Horde death presentation telemetry must advance once");
  assert.equal(hordeReset.hordeDeathMarked,true,"a defeated Horde physical enemy must be marked after its death effect is emitted");
  assert.equal(hordeReset.dungeonDeathMarked,false,"Horde death presentation must never alter ordinary dungeon enemy death behaviour");

  const spyBlocked=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerModeRuntime,special=window.CCGLostSizzlerSpecialModes;
    const descriptor=Object.getOwnPropertyDescriptor(special,"active"),previousPlay=playMode,previousSpecial=document.body.dataset.specialMode,previousSolo=document.body.dataset.hordeSolo;
    try{
      playMode="online";document.body.dataset.specialMode="sizzler-saboteurs";delete document.body.dataset.hordeSolo;
      Object.defineProperty(special,"active",{configurable:true,value:{type:"sizzler-saboteurs",state:{}}});api.sync("test spy capability");
      campStates.clear();hazards.length=0;const before=api.snapshot();window.updateCamping(p1,Math.max(1000,Number(C.camping?.graceMs||0)+1000));const after=api.snapshot();
      return{activeId:after.activeId,hazards:hazards.length,camping:campStates.size,blockedDelta:after.blockedOwnedSystemCalls-before.blockedOwnedSystemCalls};
    }finally{
      playMode=previousPlay;
      if(previousSpecial===undefined)delete document.body.dataset.specialMode;else document.body.dataset.specialMode=previousSpecial;
      if(previousSolo===undefined)delete document.body.dataset.hordeSolo;else document.body.dataset.hordeSolo=previousSolo;
      if(descriptor)Object.defineProperty(special,"active",descriptor);else delete special.active;
      api.sync("test spy restore");
    }
  });
  assert.equal(spyBlocked.activeId,"spy-online","Spy capability check must run under the Spy controller");
  assert.equal(spyBlocked.hazards,0,"Spy must never execute dungeon anti-camping hazards");
  assert.equal(spyBlocked.camping,0,"Spy must never create dungeon camping state");
  assert.ok(spyBlocked.blockedDelta>=1,"Spy must reject dungeon anti-camping at the controller boundary");

  assert.deepEqual(errors,[],`six-mode controller regression must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler six-mode routing, controller-owned dungeon gates, Horde lifecycle reset and Horde death presentation passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}