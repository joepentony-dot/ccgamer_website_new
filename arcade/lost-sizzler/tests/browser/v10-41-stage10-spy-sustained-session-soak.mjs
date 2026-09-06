import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const r29Source=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-41-r29-spy-engine-isolation.js"),"utf8");
const r32Source=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-41-r32-spy-loader.js"),"utf8");
const MAX_OBSERVABLE_MOVE_DEPTH=8;
assert.doesNotMatch(r29Source,/requestAnimationFrame\s*\(/,"Stage 10 sustained Spy gate must retain the shared authoritative RAF");
assert.doesNotMatch(r29Source,/window\.update\s*=/,"Stage 10 sustained Spy gate must not install a competing shared update owner");
assert.doesNotMatch(r32Source,/setInterval\s*\(/,"Stage 10 sustained Spy gate must keep the r32 cross-mode loader poll retired");

const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)})}catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(window.CCGLostSizzlerV141R29SpyEngine)&&Boolean(window.CCGLostSizzlerV141R29SpyNetwork)&&Boolean(window.CCGLostSizzlerV141R30)&&Boolean(window.CCGLostSizzlerV141R32SpyLoader)&&typeof quitToMenu==="function",null,{timeout:90000});

  const startSpy=async cycle=>{
    const started=await page.evaluate(cycle=>{net.setSolo(`Soak Agent ${cycle}`);const id=String(net.sessionId);return window.CCGLostSizzlerSpecialModes.startOnline({roomMode:"sizzler-saboteurs",players:[{id,name:`Soak Agent ${cycle}`},{id:`STAGE10-SOAK-${cycle}-B`,name:"Soak Rival"}],hostId:id,seed:`STAGE10-SPY-SOAK-${cycle}`,roomCode:`S10S${cycle}`})},cycle);
    assert.equal(started,true,`Spy soak cycle ${cycle} must start through the canonical adapter`);
    await page.waitForFunction(()=>mode==="playing"&&document.body.dataset.specialMode==="sizzler-saboteurs"&&window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId==="spy-online"&&Boolean(window.CCGLostSizzlerV141R29SpyEngine?.state?.isolated)&&Boolean(window.CCGLostSizzlerV141R29SpyNetwork?.state?.timer),null,{timeout:30000});
    await page.evaluate(async()=>{const loader=window.CCGLostSizzlerV141R32SpyLoader;await loader.ensureLoaded();await loader.ensureSearchUi()});
    await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R32SpyLoader?.state?.loaded&&window.CCGLostSizzlerV141R32SpyLoader?.state?.uiLoaded));
    await page.waitForTimeout(300)
  };

  const snapshot=()=>page.evaluate(()=>{
    const runtime=window.CCGLostSizzlerModeRuntime,r29=window.CCGLostSizzlerV141R29SpyEngine,network=window.CCGLostSizzlerV141R29SpyNetwork,r30=window.CCGLostSizzlerV141R30,r32=window.CCGLostSizzlerV141R32SpyLoader,r56=window.CCGLostSizzlerV141R56PlaytestCompletion,r59=window.CCGLostSizzlerV141R59LiveRegressionFixes,r60=window.CCGLostSizzlerV141R60HordeCombatIntegrity;
    const chain=fn=>{const seen=new Set();let current=fn,depth=0,r29Move=0,spyDamage=0;while(typeof current==="function"&&!seen.has(current)&&depth<64){if(current.__ccgV141R29SpyOwner===true)r29Move++;if(current.__ccgV141SpyDamageBoundary===true)spyDamage++;seen.add(current);depth++;current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null}return{depth,r29Move,spyDamage}};
    const move=chain(window.movePlayer),hurt=chain(window.hurtPlayer),registry=window.__CCG_STAGE10_SPY_SOAK_IDS__||(window.__CCG_STAGE10_SPY_SOAK_IDS__={next:1,refs:new WeakMap()});
    const identity=value=>{if(!value||!(typeof value==="object"||typeof value==="function"))return 0;if(!registry.refs.has(value))registry.refs.set(value,registry.next++);return registry.refs.get(value)};
    const match=window.CCGLostSizzlerSpecialModes?.active?.state||null;
    return{
      mode:String(typeof mode!=="undefined"?mode:""),activeId:String(runtime?.snapshot?.().activeId||""),specialMode:String(document.body.dataset.specialMode||""),
      controllerFrames:Number(r29?.state?.controllerFrames||0),worldBuilds:Number(r29?.state?.worldBuilds||0),logicalCompactions:Number(r29?.state?.logicalCompactions||0),moveReassertions:Number(r29?.state?.moveReassertions||0),updateReassertions:Number(r29?.state?.updateReassertions||0),r29Timer:Number(r29?.state?.timer||0),
      moveDepth:move.depth,moveOwners:move.r29Move,hurtDepth:hurt.depth,damageOwners:hurt.spyDamage,
      networkTimer:Number(network?.state?.timer||0),networkInstalled:Boolean(network?.state?.installed),networkObserver:Boolean(network?.state?.modeObserverInstalled),networkObserverId:identity(network?.state?.modeObserver),heartbeatsStarted:Number(network?.state?.heartbeatsStarted||0),heartbeatsStopped:Number(network?.state?.heartbeatsStopped||0),networkReassertions:Number(network?.state?.reassertions||0),
      r30Timer:Number(r30?.state?.timer||0),r30SpyTimerStopped:Boolean(r30?.state?.spyTimerStopped),loaderTimer:Number(r32?.state?.timer||0),loaderObserver:Boolean(r32?.state?.modeObserverInstalled),loaderObserverId:identity(r32?.state?.modeObserver),loaderLoads:Number(r32?.state?.loads||0),uiLoads:Number(r32?.state?.uiLoads||0),
      mapId:identity(match?.map),playersId:identity(match?.players),roomsId:identity(match?.map?.rooms),trapsId:identity(match?.traps),
      r56TrapHits:Number(r56?.state?.trapHits||0),r56EnvironmentHits:Number(r56?.state?.environmentHits||0),r59SoloFrames:Number(r59?.state?.soloFrames||0),r60HordeFrames:Number(r60?.state?.frames||0)
    }
  });

  const assertActiveStable=(state,baseline,label)=>{
    assert.equal(state.mode,"playing",`${label} must remain in active play`);
    assert.equal(state.activeId,"spy-online",`${label} must remain under the Spy controller`);
    assert.equal(state.specialMode,"sizzler-saboteurs",`${label} must retain Spy special-mode identity`);
    assert.equal(state.r29Timer,0,`${label} must keep the retired legacy r29 monitor stopped`);
    assert.equal(state.r30Timer,baseline.r30Timer,`${label} must reuse the accepted R30 watchdog handle`);
    assert.equal(state.r30SpyTimerStopped,true,`${label} must retain R30 legacy-monitor retirement`);
    assert.equal(state.loaderTimer,0,`${label} must keep the r32 cross-mode poll retired`);
    assert.equal(state.loaderObserver,true,`${label} must retain the event-driven loader observer`);
    assert.equal(state.loaderObserverId,baseline.loaderObserverId,`${label} must not replace the loader observer`);
    assert.equal(state.networkObserver,true,`${label} must retain the event-driven network observer`);
    assert.equal(state.networkObserverId,baseline.networkObserverId,`${label} must not replace the network observer`);
    assert.ok(state.networkTimer>0,`${label} must retain exactly the active Spy heartbeat handle`);
    assert.equal(state.networkInstalled,true,`${label} must retain the dedicated packet owner`);
    assert.equal(state.moveDepth,baseline.moveDepth,`${label} must keep movement ancestry stable during active play`);
    assert.equal(state.hurtDepth,baseline.hurtDepth,`${label} must keep damage ancestry bounded`);
    assert.equal(state.moveOwners,1,`${label} must retain one r29 movement owner`);
    assert.equal(state.damageOwners,1,`${label} must retain one Spy damage boundary`);
    assert.equal(state.worldBuilds,baseline.worldBuilds,`${label} must not rebuild the compact world during ordinary frames`);
    assert.equal(state.logicalCompactions,baseline.logicalCompactions,`${label} must not repeatedly compact the logical map`);
    assert.equal(state.moveReassertions,baseline.moveReassertions,`${label} must not reassert movement ownership during stable play`);
    assert.equal(state.updateReassertions,baseline.updateReassertions,`${label} must not replace shared update ownership`);
    assert.equal(state.networkReassertions,baseline.networkReassertions,`${label} must not reassert packet ownership during stable play`);
    assert.equal(state.mapId,baseline.mapId,`${label} must preserve map identity`);
    assert.equal(state.playersId,baseline.playersId,`${label} must preserve player-list identity`);
    assert.equal(state.roomsId,baseline.roomsId,`${label} must preserve room-list identity`);
    assert.equal(state.trapsId,baseline.trapsId,`${label} must preserve trap-list identity`);
    assert.equal(state.r56TrapHits,baseline.r56TrapHits,`${label} must keep Dungeon trap ownership dormant`);
    assert.equal(state.r56EnvironmentHits,baseline.r56EnvironmentHits,`${label} must keep Dungeon environmental ownership dormant`);
    assert.equal(state.r59SoloFrames,baseline.r59SoloFrames,`${label} must keep Solo simulation dormant`);
    assert.equal(state.r60HordeFrames,baseline.r60HordeFrames,`${label} must keep Horde simulation dormant`)
  };

  console.log("[Stage 10 Spy soak] sustained active play keeps world and owner identities stable");
  await startSpy(1);
  const baseline=await snapshot();
  assert.ok(baseline.networkTimer>0);
  assert.equal(baseline.moveOwners,1);
  assert.ok(baseline.moveDepth<=MAX_OBSERVABLE_MOVE_DEPTH,`initial Spy soak movement ancestry must stay within the accepted ${MAX_OBSERVABLE_MOVE_DEPTH}-function ceiling`);
  assert.equal(baseline.damageOwners,1);
  let previousFrames=baseline.controllerFrames;
  for(let sample=1;sample<=8;sample++){
    if(sample%2===0){await page.keyboard.press("ArrowRight");await page.keyboard.press("ArrowLeft")}
    await page.waitForFunction(before=>Number(window.CCGLostSizzlerV141R29SpyEngine?.state?.controllerFrames||0)>before,previousFrames,{polling:50,timeout:5000});
    await page.waitForTimeout(250);
    const current=await snapshot();assertActiveStable(current,baseline,`active Spy soak sample ${sample}`);assert.ok(current.controllerFrames>previousFrames,`active Spy soak sample ${sample} must advance isolated controller frames`);previousFrames=current.controllerFrames
  }

  console.log("[Stage 10 Spy soak] repeated leave/re-entry keeps observers singular and owner depth bounded");
  let previous=baseline;
  for(let cycle=2;cycle<=4;cycle++){
    await page.evaluate(async()=>{await quitToMenu()});
    await page.waitForFunction(()=>mode==="menu"&&!window.CCGLostSizzlerV141R29SpyNetwork?.state?.timer&&!window.CCGLostSizzlerV141R29SpyNetwork?.state?.installed&&!window.CCGLostSizzlerV141R29SpyEngine?.state?.isolated);
    const exited=await snapshot();
    assert.equal(exited.networkTimer,0,`Spy soak exit ${cycle-1} must stop heartbeat`);
    assert.equal(exited.networkInstalled,false,`Spy soak exit ${cycle-1} must restore packet owner`);
    assert.equal(exited.loaderTimer,0,`Spy soak exit ${cycle-1} must keep loader polling retired`);
    assert.equal(exited.loaderObserverId,baseline.loaderObserverId,`Spy soak exit ${cycle-1} must retain the same loader observer`);
    assert.equal(exited.networkObserverId,baseline.networkObserverId,`Spy soak exit ${cycle-1} must retain the same network observer`);
    assert.ok(exited.heartbeatsStopped>=previous.heartbeatsStopped+1,`Spy soak exit ${cycle-1} must stop its active heartbeat`);

    await startSpy(cycle);
    const entry=await snapshot();
    assert.equal(entry.loaderObserverId,baseline.loaderObserverId,`Spy soak re-entry ${cycle} must reuse loader observer`);
    assert.equal(entry.networkObserverId,baseline.networkObserverId,`Spy soak re-entry ${cycle} must reuse network observer`);
    assert.equal(entry.loaderLoads,baseline.loaderLoads,`Spy soak re-entry ${cycle} must not reload owner chain`);
    assert.equal(entry.uiLoads,baseline.uiLoads,`Spy soak re-entry ${cycle} must not reload search UI owner`);
    assert.ok(entry.moveDepth<=MAX_OBSERVABLE_MOVE_DEPTH,`Spy soak re-entry ${cycle} must keep observable movement ancestry bounded despite accepted opaque finalizers`);
    assert.equal(entry.hurtDepth,baseline.hurtDepth,`Spy soak re-entry ${cycle} must keep damage ancestry depth bounded`);
    assert.equal(entry.moveOwners,1);
    assert.equal(entry.damageOwners,1);
    assert.equal(entry.worldBuilds,previous.worldBuilds+1,`Spy soak re-entry ${cycle} must build exactly one compact world for the new match identity`);
    assert.equal(entry.heartbeatsStarted,previous.heartbeatsStarted+1,`Spy soak re-entry ${cycle} must start exactly one active heartbeat`);
    const cycleBaseline=entry;
    await page.waitForTimeout(700);
    assertActiveStable(await snapshot(),cycleBaseline,`Spy soak stable re-entry ${cycle}`);
    previous=entry
  }

  await page.evaluate(async()=>{await quitToMenu()});
  await page.waitForFunction(()=>mode==="menu"&&!window.CCGLostSizzlerV141R29SpyNetwork?.state?.timer&&!window.CCGLostSizzlerV141R29SpyNetwork?.state?.installed);
  const finalState=await snapshot();
  assert.equal(finalState.loaderTimer,0);
  assert.equal(finalState.r29Timer,0);
  assert.equal(finalState.networkTimer,0);
  assert.equal(finalState.networkInstalled,false);
  assert.equal(finalState.loaderObserverId,baseline.loaderObserverId);
  assert.equal(finalState.networkObserverId,baseline.networkObserverId);
  assert.deepEqual(errors,[],`Stage 10 sustained Spy soak must have no uncaught browser errors: ${errors.join("\n")}`);

  console.log("Lost Sizzler Stage 10 sustained Spy owner, compact-world, observer, transport and lifecycle soak passed in Chromium.");
  await context.close();
}finally{await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()))}