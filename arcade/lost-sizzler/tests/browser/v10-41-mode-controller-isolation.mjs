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

  const contract=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerModeRuntime,ids=api.IDS,profiles=api.PROFILES;
    return{
      ids:Object.values(ids),
      profileCount:Object.keys(profiles).length,
      uniqueStateCount:new Set([...api.controllers.values()].map(controller=>controller.state)).size,
      sharedCore:[...api.SHARED_CORE],modeOwned:[...api.MODE_OWNED],
      dungeonCaps:[profiles[ids.DUNGEON_SOLO].dungeonSystems,profiles[ids.DUNGEON_ONLINE].dungeonSystems,profiles[ids.SPLIT_SCREEN].dungeonSystems],
      specialCaps:[profiles[ids.HORDE_SOLO].dungeonSystems,profiles[ids.HORDE_ONLINE].dungeonSystems,profiles[ids.SPY_ONLINE].dungeonSystems]
    };
  });
  assert.deepEqual(contract.ids.sort(),["dungeon-online","dungeon-solo","horde-online","horde-solo","split-screen","spy-online"].sort(),"the runtime must expose exactly six isolated mode controllers");
  assert.equal(contract.profileCount,6,"each mode must have its own capability profile");
  assert.equal(contract.uniqueStateCount,6,"each mode controller must own a distinct state object");
  assert.deepEqual(contract.dungeonCaps,[true,true,true],"Solo, Dungeon Multiplayer and split-screen retain dungeon systems");
  assert.deepEqual(contract.specialCaps,[false,false,false],"Horde Solo, Horde Multiplayer and Spy must not own dungeon-only systems");
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

  const hordeReset=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerModeRuntime,special=window.CCGLostSizzlerSpecialModes;
    const descriptor=Object.getOwnPropertyDescriptor(special,"active"),previousPlay=playMode,previousSpecial=document.body.dataset.specialMode,previousSolo=document.body.dataset.hordeSolo;
    const before=api.snapshot();
    try{
      playMode="online";document.body.dataset.specialMode="horde-survivor";document.body.dataset.hordeSolo="true";
      Object.defineProperty(special,"active",{configurable:true,value:{type:"horde-survivor",state:{wave:3,state:"wave"}}});api.sync("test horde reset");
      hazards.push({x:p1.x,y:p1.y,life:1000,campOwner:"P1",direct:true});campStates.set("P1",{x:p1.x,y:p1.y,stillMs:9999});
      move1=9999;fire1=9999;fireBuffer1=9999;p1.hitStunMs=9999;
      special.active.state.wave=4;special.active.state.state="intermission";api.monitorHordeLifecycle();
      return{hazards:hazards.length,camping:campStates.size,move1,fire1,fireBuffer1,hitStun:p1.hitStunMs,snapshot:api.snapshot(),before};
    }finally{
      playMode=previousPlay;
      if(previousSpecial===undefined)delete document.body.dataset.specialMode;else document.body.dataset.specialMode=previousSpecial;
      if(previousSolo===undefined)delete document.body.dataset.hordeSolo;else document.body.dataset.hordeSolo=previousSolo;
      if(descriptor)Object.defineProperty(special,"active",descriptor);else delete special.active;
      api.sync("test reset restore");
    }
  });
  assert.equal(hordeReset.hazards,0,"Horde lifecycle must purge dungeon red-circle hazard state");
  assert.equal(hordeReset.camping,0,"Horde lifecycle must purge dungeon camping state");
  assert.equal(hordeReset.move1,0,"Horde wave transition must release movement cooldown/lock state");
  assert.equal(hordeReset.fire1,0,"Horde wave transition must release firing cooldown/lock state");
  assert.equal(hordeReset.fireBuffer1,0,"Horde wave transition must release stale firing buffers");
  assert.equal(hordeReset.hitStun,0,"Horde wave transition must release stale player hit-stun state");
  assert.ok(hordeReset.snapshot.hordeWaveResets>hordeReset.before.hordeWaveResets,"Horde wave reset counter must advance");
  assert.ok(hordeReset.snapshot.hordePhaseResets>hordeReset.before.hordePhaseResets,"Horde phase reset counter must advance");

  assert.deepEqual(errors,[],`six-mode controller regression must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler six-mode controller routing, independent state and Horde lifecycle reset checks passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
