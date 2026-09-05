import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const r29Source=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-41-r29-spy-engine-isolation.js"),"utf8");
const r30Source=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-41-r30-global-movement-guard.js"),"utf8");
const r32Source=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-41-r32-spy-loader.js"),"utf8");
assert.doesNotMatch(r29Source,/window\.update\s*=/,"Stage 10 must keep Spy on the authoritative mode-controller update boundary");
assert.match(r30Source,/function stopLegacySpyMonitor\(\)/,"Stage 10 must retain R30 retirement of the legacy r29 Spy monitor");
assert.match(r30Source,/engine\.state\.timer=0;state\.spyTimerStopped=true/,"R30 must record retirement of the legacy r29 Spy monitor");
assert.match(r32Source,/new MutationObserver\(/,"Stage 10 must retain event-driven Spy loader activation");
assert.doesNotMatch(r32Source,/setInterval\s*\(/,"the r32 Spy-only lazy loader must not revive its former cross-mode poll");

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
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(window.CCGLostSizzlerSpecialModes)&&Boolean(window.CCGLostSizzlerV141R29SpyEngine)&&Boolean(window.CCGLostSizzlerV141R30)&&Boolean(window.CCGLostSizzlerV141R32SpyLoader)&&typeof quitToMenu==="function",null,{timeout:90000});

  const snapshot=()=>page.evaluate(()=>{
    const runtime=window.CCGLostSizzlerModeRuntime,r29=window.CCGLostSizzlerV141R29SpyEngine,r30=window.CCGLostSizzlerV141R30,r32=window.CCGLostSizzlerV141R32SpyLoader,r56=window.CCGLostSizzlerV141R56PlaytestCompletion,r59=window.CCGLostSizzlerV141R59LiveRegressionFixes,r60=window.CCGLostSizzlerV141R60HordeCombatIntegrity;
    const chain=fn=>{const seen=new Set();let current=fn,depth=0,moveOwners=0,damageBoundaries=0;while(typeof current==="function"&&!seen.has(current)&&depth<64){if(current.__ccgV141R29SpyOwner===true)moveOwners++;if(current.__ccgV141SpyDamageBoundary===true)damageBoundaries++;seen.add(current);depth++;current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null}return{depth,moveOwners,damageBoundaries}};
    const move=chain(window.movePlayer),hurt=chain(window.hurtPlayer),overhaul=window.CCGLostSizzlerV141R32SpyOverhaul;
    return{
      mode:String(typeof mode!=="undefined"?mode:""),activeId:String(runtime?.snapshot?.().activeId||""),specialMode:String(document.body.dataset.specialMode||""),isolated:Boolean(r29?.state?.isolated),
      r29Timer:Number(r29?.state?.timer||0),r30Timer:Number(r30?.state?.timer||0),r30SpyTimerStopped:Boolean(r30?.state?.spyTimerStopped),worldBuilds:Number(r29?.state?.worldBuilds||0),logicalCompactions:Number(r29?.state?.logicalCompactions||0),controllerFrames:Number(r29?.state?.controllerFrames||0),moveReassertions:Number(r29?.state?.moveReassertions||0),updateReassertions:Number(r29?.state?.updateReassertions||0),
      loaderTimer:Number(r32?.state?.timer||0),loaderLoads:Number(r32?.state?.loads||0),uiLoads:Number(r32?.state?.uiLoads||0),loaderReady:Boolean(r32?.state?.loaded),uiReady:Boolean(r32?.state?.uiLoaded),modeObserverInstalled:Boolean(r32?.state?.modeObserverInstalled),pendingActionCode:String(r32?.state?.pendingActionCode||""),tabTogglePending:Boolean(r32?.state?.tabTogglePending),loaderError:String(r32?.state?.lastError||""),uiError:String(r32?.state?.uiLastError||""),
      moveDepth:move.depth,moveOwners:move.moveOwners,hurtDepth:hurt.depth,damageBoundaries:hurt.damageBoundaries,inventoryOpen:Boolean(overhaul?.state?.inventoryOpen),searchPending:Boolean(overhaul?.state?.search),
      r56TrapHits:Number(r56?.state?.trapHits||0),r56EnvironmentHits:Number(r56?.state?.environmentHits||0),r56CombatRearms:Number(r56?.state?.combatRearms||0),r59SoloFrames:Number(r59?.state?.soloFrames||0),r59SoloSubsteps:Number(r59?.state?.soloSubsteps||0),r60HordeFrames:Number(r60?.state?.frames||0)
    }
  });

  const startSpy=async cycle=>{
    const started=await page.evaluate(cycle=>{net.setSolo(`Stage 10 Agent ${cycle}`);const id=String(net.sessionId);return window.CCGLostSizzlerSpecialModes.startOnline({roomMode:"sizzler-saboteurs",players:[{id,name:`Stage 10 Agent ${cycle}`},{id:`STAGE10-SPY-${cycle}-B`,name:"Stage 10 Rival"}],hostId:id,seed:`STAGE10-SPY-${cycle}`,roomCode:`S10${cycle}`})},cycle);
    assert.equal(started,true,`real Spy launch ${cycle} must start through the canonical special-mode adapter`);
    await page.waitForFunction(()=>mode==="playing"&&document.body.dataset.specialMode==="sizzler-saboteurs"&&window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId==="spy-online"&&Boolean(window.CCGLostSizzlerV141R29SpyEngine?.state?.isolated),null,{timeout:30000});
    const ready=await page.evaluate(async()=>{const loader=window.CCGLostSizzlerV141R32SpyLoader;return Boolean(await loader.ensureLoaded()&&await loader.ensureSearchUi())});
    assert.equal(ready,true,`Spy launch ${cycle} must complete lazy-loader and search-owner readiness`);
    await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R32SpyLoader?.state?.loaded&&window.CCGLostSizzlerV141R32SpyLoader?.state?.uiLoaded&&window.CCGLostSizzlerV141R32SpyOverhaul&&window.CCGLostSizzlerV141R32SpySearchUiOwner),null,{timeout:15000});
    await page.waitForTimeout(320);return snapshot()
  };

  const leaveSpy=async cycle=>{
    await page.evaluate(async()=>{await quitToMenu()});
    await page.waitForFunction(()=>mode==="menu"&&document.body.dataset.specialMode!=="sizzler-saboteurs"&&window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId!=="spy-online"&&!window.CCGLostSizzlerV141R29SpyEngine?.state?.isolated,null,{timeout:15000});
    await page.waitForTimeout(120);const state=await snapshot();
    assert.equal(state.isolated,false,`Spy exit ${cycle} must release r29 isolation`);
    assert.notEqual(state.activeId,"spy-online",`Spy exit ${cycle} must release the Spy controller`);
    assert.equal(state.r29Timer,0,`Spy exit ${cycle} must keep the retired legacy r29 Spy monitor stopped`);
    assert.equal(state.r30SpyTimerStopped,true,`Spy exit ${cycle} must retain R30 ownership of legacy-monitor retirement`);
    assert.equal(state.loaderTimer,0,`Spy exit ${cycle} must retain no r32 polling timer`);
    assert.equal(state.pendingActionCode,"",`Spy exit ${cycle} must drain queued first-action state`);
    assert.equal(state.tabTogglePending,false,`Spy exit ${cycle} must drain pending inventory-toggle state`);
    assert.equal(state.inventoryOpen,false,`Spy exit ${cycle} must not retain the independent Spy inventory`);
    assert.equal(state.searchPending,false,`Spy exit ${cycle} must not retain a furniture search`);
    return state
  };

  const before=await snapshot();
  assert.equal(before.loaderTimer,0,"r32 must have no cross-mode polling timer before Spy starts");
  assert.equal(before.r29Timer,0,"R30 must retire the legacy r29 Spy monitor before Stage 10 activation");
  assert.equal(before.r30SpyTimerStopped,true,"R30 must record retirement of the legacy r29 Spy monitor");
  assert.ok(before.r30Timer>0,"the accepted R30 global movement/input watchdog must remain active");
  assert.equal(before.isolated,false,"r29 isolation must be dormant before Spy starts");

  const entries=[],exits=[];
  for(let cycle=1;cycle<=3;cycle++){
    const entry=await startSpy(cycle);entries.push(entry);
    assert.equal(entry.activeId,"spy-online",`Spy entry ${cycle} must use the authoritative Spy Online controller`);
    assert.equal(entry.specialMode,"sizzler-saboteurs",`Spy entry ${cycle} must retain special-mode identity`);
    assert.equal(entry.isolated,true,`Spy entry ${cycle} must activate r29 isolation`);
    assert.equal(entry.r29Timer,0,`Spy entry ${cycle} must keep the retired legacy r29 monitor stopped`);
    assert.equal(entry.r30SpyTimerStopped,true,`Spy entry ${cycle} must keep R30 as the accepted Spy ownership watchdog`);
    assert.equal(entry.r30Timer,before.r30Timer,`Spy entry ${cycle} must reuse the established R30 watchdog handle`);
    assert.equal(entry.loaderTimer,0,`Spy entry ${cycle} must not revive the retired r32 polling timer`);
    assert.equal(entry.loaderReady,true,`Spy entry ${cycle} must retain the loaded Spy owner chain`);
    assert.equal(entry.uiReady,true,`Spy entry ${cycle} must retain the loaded search owner`);
    assert.equal(entry.modeObserverInstalled,true,`Spy entry ${cycle} must retain event-driven loader activation`);
    assert.equal(entry.moveOwners,1,`Spy entry ${cycle} must contain exactly one r29 movement owner`);
    assert.equal(entry.damageBoundaries,1,`Spy entry ${cycle} must contain exactly one Spy damage boundary`);
    assert.equal(entry.loaderError,"",`Spy entry ${cycle} must have no lazy-loader error`);
    assert.equal(entry.uiError,"",`Spy entry ${cycle} must have no search-owner loader error`);

    await page.waitForTimeout(650);const stable=await snapshot();
    assert.ok(stable.controllerFrames>entry.controllerFrames,`Spy entry ${cycle} must advance isolated controller frames`);
    assert.equal(stable.worldBuilds,entry.worldBuilds,`Spy entry ${cycle} must not rebuild the compact world on ordinary frames`);
    assert.equal(stable.logicalCompactions,entry.logicalCompactions,`Spy entry ${cycle} must not compact the logical map repeatedly`);
    assert.equal(stable.moveDepth,entry.moveDepth,`Spy entry ${cycle} must keep movement ancestry depth bounded`);
    assert.equal(stable.hurtDepth,entry.hurtDepth,`Spy entry ${cycle} must keep damage ancestry depth bounded`);
    assert.equal(stable.moveReassertions,entry.moveReassertions,`Spy entry ${cycle} must not reassert movement ownership during stable play`);
    assert.equal(stable.updateReassertions,entry.updateReassertions,`Spy entry ${cycle} must not replace shared update ownership`);
    assert.equal(stable.r29Timer,0,`Spy entry ${cycle} must not resurrect the legacy r29 interval during stable play`);
    assert.equal(stable.r30Timer,entry.r30Timer,`Spy entry ${cycle} must not replace the accepted R30 watchdog timer`);
    assert.equal(stable.r56TrapHits,entry.r56TrapHits,`Spy entry ${cycle} must keep R56 dungeon trap ownership dormant`);
    assert.equal(stable.r56EnvironmentHits,entry.r56EnvironmentHits,`Spy entry ${cycle} must keep R56 environmental ownership dormant`);
    assert.equal(stable.r56CombatRearms,entry.r56CombatRearms,`Spy entry ${cycle} must keep R56 dungeon combat maintenance dormant`);
    assert.equal(stable.r59SoloFrames,entry.r59SoloFrames,`Spy entry ${cycle} must keep R59 Solo frames dormant`);
    assert.equal(stable.r59SoloSubsteps,entry.r59SoloSubsteps,`Spy entry ${cycle} must keep R59 Solo substeps dormant`);
    assert.equal(stable.r60HordeFrames,entry.r60HordeFrames,`Spy entry ${cycle} must keep R60 Horde frames dormant`);
    exits.push(await leaveSpy(cycle))
  }

  assert.equal(entries[0].loaderLoads,1,"first Spy activation must load the r32 owner chain exactly once");
  assert.equal(entries[0].uiLoads,1,"first Spy activation must load the search owner exactly once");
  for(const [index,entry] of entries.entries()){
    assert.equal(entry.loaderLoads,entries[0].loaderLoads,`Spy re-entry ${index+1} must reuse the loaded owner chain`);
    assert.equal(entry.uiLoads,entries[0].uiLoads,`Spy re-entry ${index+1} must reuse the loaded search owner`);
    assert.equal(entry.r29Timer,0,`Spy re-entry ${index+1} must keep the legacy r29 timer retired`);
    assert.equal(entry.r30Timer,entries[0].r30Timer,`Spy re-entry ${index+1} must reuse the accepted R30 watchdog handle`);
    assert.equal(entry.moveDepth,entries[0].moveDepth,`Spy re-entry ${index+1} must not grow movement ancestry`);
    assert.equal(entry.hurtDepth,entries[0].hurtDepth,`Spy re-entry ${index+1} must not grow damage ancestry`)
  }
  for(let index=1;index<entries.length;index++)assert.equal(entries[index].worldBuilds,entries[index-1].worldBuilds+1,`Spy re-entry ${index+1} must build exactly one compact world for its new match identity`);
  assert.equal(exits.length,3,"Stage 10 must complete all three leave/re-entry cycles");
  assert.deepEqual(errors,[],`Stage 10 Spy launch/loader/re-entry qualification must have no uncaught browser errors: ${errors.join("\n")}`);

  console.log("Lost Sizzler Stage 10 real Spy launch, retired legacy-monitor, lazy-loader, isolated-owner and repeated re-entry qualification passed in Chromium.");
  await context.close();
}finally{await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()))}
