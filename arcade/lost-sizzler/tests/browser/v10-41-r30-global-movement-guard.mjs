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

const directionFor=async page=>page.evaluate(()=>{
  const dirs=[{dx:1,dy:0,code:"ArrowRight"},{dx:-1,dy:0,code:"ArrowLeft"},{dx:0,dy:1,code:"ArrowDown"},{dx:0,dy:-1,code:"ArrowUp"}];
  const occupied=(x,y)=>{
    if((host.enemies||[]).some(e=>e.alive&&e.x===x&&e.y===y))return true;
    if(host.stalker?.awake&&host.stalker.x===x&&host.stalker.y===y)return true;
    try{if(typeof allPlayers==="function"&&allPlayers().some(other=>other&&other!==p1&&other.x===x&&other.y===y))return true}catch(_){}
    return false;
  };
  const q=dirs.find(row=>{
    const x=p1.x+row.dx,y=p1.y+row.dy;
    if(!window.CCGWorld?.walkable?.(world.map,x,y,host)||occupied(x,y))return false;
    if(world?.exit&&world.exit.x===x&&world.exit.y===y)return false;
    return true;
  });
  return q?{...q,x:p1.x,y:p1.y}:null;
});
const prepareSolo=async(page,seed)=>page.evaluate(seed=>{
  run=PGR.makeRun({difficulty:"ARCADE",seed});playMode="solo";startWorld(PGR.floorSeed(run),false,false);mode="playing";
  document.body.dataset.runActive="true";document.body.dataset.specialMode="";UI.menu?.classList.add("hidden");
  host.enemies=[];host.generators=[];host.traps=[];host.chests=[];host.weightBridge=null;
  if(host.stalker)host.stalker.awake=false;
  try{hazards.length=0}catch(_){}
  p1.hitStunMs=0;move1=0;input.clear();return{x:p1.x,y:p1.y};
},seed);
const assertKeyboardMove=async(page,label,wait=320)=>{
  const d=await directionFor(page);assert.ok(d,`${label}: an immediately traversable adjacent tile is required`);
  await page.keyboard.down(d.code);await page.waitForTimeout(wait);await page.keyboard.up(d.code);await page.waitForTimeout(100);
  const after=await page.evaluate(()=>({x:p1.x,y:p1.y}));
  assert.notDeepEqual(after,{x:d.x,y:d.y},`${label}: held keyboard movement must change player coordinates`);
};

try{
  const context=await browser.newContext({viewport:{width:1920,height:1080}});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R30?.state?.goldenLocked));
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R29SpyEngine));

  const release=await page.evaluate(()=>({
    build:document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content,
    cache:document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content,
    r29Timer:window.CCGLostSizzlerV141R29?.state?.timer||0,
    cooperative:Boolean(window.CCGLostSizzlerV141R29?.install?.__ccgV141R30Cooperative),
    golden:Boolean(window.CCGLostSizzlerV141R30?.state?.goldenLocked)
  }));
  assert.deepEqual({build:release.build,cache:release.cache},{build:"2026.08.26.30",cache:"20260826r30"});
  assert.equal(release.r29Timer,0,"r30 must stop the competing r29 installer interval");
  assert.equal(release.cooperative,true,"r29 maintenance must be cooperative before gameplay starts");
  assert.equal(release.golden,true,"r30 must lock a known-good normal runtime ownership snapshot after release readiness");

  await prepareSolo(page,"R30-SOLO-FRESH");
  await assertKeyboardMove(page,"fresh Solo");

  await prepareSolo(page,"R30-INPUT-REASSERT");
  const inputReassert=await directionFor(page);assert.ok(inputReassert);
  const beforeReassert=await page.evaluate(()=>window.CCGLostSizzlerV141R30.state.inputReassertions);
  await page.keyboard.down(inputReassert.code);
  await page.waitForTimeout(70);
  await page.evaluate(()=>input.clear());
  await page.waitForTimeout(140);
  const reasserted=await page.evaluate(code=>({held:input.has(code),count:window.CCGLostSizzlerV141R30.state.inputReassertions}),inputReassert.code);
  await page.keyboard.up(inputReassert.code);
  assert.equal(reasserted.held,true,"held movement must be reinserted after another layer clears the shared input set");
  assert.ok(reasserted.count>beforeReassert,"input reassertion counter must record the self-heal");

  await prepareSolo(page,"R30-DEAD-WRAPPER");
  const deadDirection=await directionFor(page);assert.ok(deadDirection);
  const beforeWatchdog=await page.evaluate(()=>window.CCGLostSizzlerV141R30.state.watchdogRecoveries);
  await page.evaluate(()=>{const dead=function(){return false};dead.__ccgOriginal=window.movePlayer;window.movePlayer=dead;});
  await page.keyboard.down(deadDirection.code);await page.waitForTimeout(1050);await page.keyboard.up(deadDirection.code);await page.waitForTimeout(120);
  const deadRecovery=await page.evaluate(()=>({x:p1.x,y:p1.y,watchdog:window.CCGLostSizzlerV141R30.state.watchdogRecoveries}));
  assert.notDeepEqual({x:deadRecovery.x,y:deadRecovery.y},{x:deadDirection.x,y:deadDirection.y},"movement watchdog must recover from an unmarked wrapper that silently returns false");
  assert.ok(deadRecovery.watchdog>beforeWatchdog,"movement watchdog recovery counter must advance");

  const contaminatedRepair=await page.evaluate(()=>{
    const r30=window.CCGLostSizzlerV141R30,before=r30.state.ownershipRepairs;
    const poisoned=function(){return false};poisoned.__ccgV141SpyIsolated=true;window.movePlayer=poisoned;
    const injected=r30.spyContaminated(window.movePlayer);
    const repaired=r30.assertNormalRuntimeOwnership("browser injected isolated owner");
    return{injected,repaired,contaminated:r30.spyContaminated(window.movePlayer),repairs:r30.state.ownershipRepairs-before,golden:window.movePlayer===r30.state.goldenMove};
  });
  assert.equal(contaminatedRepair.injected,true,"browser fault injection must install an isolated Spy owner before the direct invariant check");
  assert.equal(contaminatedRepair.repaired,true,"r30 normal-mode invariant must actively repair injected isolated ownership");
  assert.equal(contaminatedRepair.contaminated,false,"r30 direct invariant must remove an isolated Spy owner immediately");
  assert.ok(contaminatedRepair.repairs>=1,"ownership repair counter must record contamination repair");
  assert.equal(contaminatedRepair.golden,true,"ownership repair must restore the locked known-good movement owner");

  await prepareSolo(page,"R30-PERIODIC-REPAIR");
  const periodicRepair=await page.evaluate(async()=>{
    const r30=window.CCGLostSizzlerV141R30;
    const poisoned=function(){return false};poisoned.__ccgV141SpyIsolated=true;window.movePlayer=poisoned;
    const injected=r30.spyContaminated(window.movePlayer);
    await new Promise(r=>setTimeout(r,140));
    return{injected,contaminated:r30.spyContaminated(window.movePlayer),functional:typeof window.movePlayer==="function",golden:window.movePlayer===r30.state.goldenMove};
  });
  assert.equal(periodicRepair.injected,true,"periodic fault injection must install an isolated Spy owner before monitor recovery");
  assert.equal(periodicRepair.contaminated,false,"continuous normal-mode ownership monitoring must remove isolated Spy contamination");
  assert.equal(periodicRepair.functional,true,"continuous ownership recovery must leave a callable normal movement owner");
  assert.equal(periodicRepair.golden,true,"continuous ownership recovery must restore the locked known-good movement owner");
  await assertKeyboardMove(page,"Solo after periodic ownership recovery");

  const spyCycles=await page.evaluate(async()=>{
    const special=window.CCGLostSizzlerSpecialModes,engine=window.CCGLostSizzlerV141R29SpyEngine,SAB=window.CCGLostSizzlerSaboteurs,r30=window.CCGLostSizzlerV141R30;
    const descriptor=Object.getOwnPropertyDescriptor(special,"active"),failures=[];
    run=PGR.makeRun({difficulty:"ARCADE",seed:"R30-SPY-CYCLES"});playMode="online";startWorld(PGR.floorSeed(run),false,false);mode="playing";document.body.dataset.runActive="true";p1.id="R30-HOST";
    for(let cycle=0;cycle<3;cycle++){
      const t=Date.now()+cycle,match=SAB.createMatch({players:[{id:String(p1.id),name:"HOST"},{id:`R30-GUEST-${cycle}`,name:"GUEST"}],hostId:String(p1.id),seed:`R30-SPY-${cycle}`,now:t});
      SAB.beginRound(match,t);Object.defineProperty(special,"active",{configurable:true,value:{type:"sizzler-saboteurs",state:match,authoritative:true,cooldowns:new Map(),seed:match.seed}});document.body.dataset.specialMode="sizzler-saboteurs";
      engine.enterIsolation();await new Promise(r=>setTimeout(r,100));const owner=window.movePlayer;
      for(let i=0;i<8;i++)window.CCGLostSizzlerV141R29.install();
      if(window.movePlayer!==owner)failures.push(`cycle ${cycle}: r29 replaced isolated owner`);
      Object.defineProperty(special,"active",{configurable:true,value:null});delete document.body.dataset.specialMode;await new Promise(r=>setTimeout(r,180));
      if(engine.state.isolated)failures.push(`cycle ${cycle}: isolation did not exit`);
      if(r30.spyContaminated(window.movePlayer))failures.push(`cycle ${cycle}: stale Spy owner survived`);
    }
    if(descriptor)Object.defineProperty(special,"active",descriptor);else delete special.active;
    return{failures,restores:r30.state.forcedRestores,transitions:r30.state.modeTransitions};
  });
  assert.deepEqual(spyCycles.failures,[],`repeated Spy handoffs must remain clean: ${spyCycles.failures.join("; ")}`);
  assert.ok(spyCycles.restores>=1,"repeated Spy exits must execute explicit normal-owner restoration");
  assert.ok(spyCycles.transitions>=3,"mode transition guard must observe repeated special-mode handoffs");

  await prepareSolo(page,"R30-SOLO-AFTER-SPY");
  await assertKeyboardMove(page,"Solo after repeated Spy exits");

  assert.deepEqual(errors,[],`r30 movement failsafe regression must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.41 r30 movement ownership, input reassertion, watchdog recovery and repeated Spy handoff failsafes passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
