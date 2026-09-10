import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

/*
 * Sustained Solo timing/ownership soak.
 *
 * Unlike the five-second accelerated stabilization fixture, this test keeps a
 * real Solo run active for two 60-second measurement windows separated by
 * pause/focus lifecycle stress. It is intended to provide materially stronger
 * evidence for LS-SOLO-001/003, but a single green run is still not treated as
 * sufficient reason to close a historically long-session defect.
 */

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".mjs":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".svg":"image/svg+xml",
  ".png":"image/png",
  ".webp":"image/webp",
  ".ogg":"audio/ogg",
  ".mp3":"audio/mpeg"
};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});
      res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

const ACTIVE_WINDOW_MS=60000;
const PAUSE_CYCLES=12;
const MIN_RATIO=0.90;
const MAX_RATIO=1.10;
const LIFECYCLE_EDGE_TIMEOUT_MS=10000;
const SOAK_HEALTH_RESERVE=1000000;

async function snapshot(page,label){
  return page.evaluate(label=>{
    const api=window.CCGLostSizzlerSoloDiagnostics;
    const snap=api.snapshot();
    const r30=window.CCGLostSizzlerV141R30GlobalMovementGuard?.state||{};
    const seal=window.CCGLostSizzlerV141R30OwnerSeal?.state||{};
    return{
      label,
      ...snap,
      r30OwnershipRepairs:Number(r30.ownershipRepairs||0),
      r30MovementRepairs:Number(r30.movementRepairs||0),
      sealRepairs:Number(seal.repairs||0),
      recentOwnerChanges:api.ownerChangeLog.slice(-16),
      recentLifecycle:api.lifecycleLog.slice(-16)
    };
  },label);
}

async function r59Counters(page,label){
  return page.evaluate(label=>{
    const state=window.CCGLostSizzlerV141R59LiveRegressionFixes?.state||{};
    return{
      label,
      at:Number(performance.now()),
      acceptedFrames:Number(state.acceptedFrames||0),
      duplicateFramesSkipped:Number(state.duplicateFramesSkipped||0),
      longGaps:Number(state.longGaps||0),
      longGapRecoveries:Number(state.longGapRecoveries||0),
      pausedGapsDiscarded:Number(state.pausedGapsDiscarded||0),
      pauseBoundaries:Number(state.pauseBoundaries||0),
      soloFrames:Number(state.soloFrames||0),
      soloSubsteps:Number(state.soloSubsteps||0),
      soloCatchupFrames:Number(state.soloCatchupFrames||0),
      soloDiscardedVisibleMs:Number(state.soloDiscardedVisibleMs||0),
      soloLastElapsed:Number(state.soloLastElapsed||0),
      soloLastSteps:Number(state.soloLastSteps||0)
    };
  },label);
}

function counterDelta(start,end){
  const delta={};
  for(const key of ["acceptedFrames","duplicateFramesSkipped","longGaps","longGapRecoveries","pausedGapsDiscarded","pauseBoundaries","soloFrames","soloSubsteps","soloCatchupFrames","soloDiscardedVisibleMs"]){
    delta[key]=Number(end[key]||0)-Number(start[key]||0);
  }
  delta.wallMs=Number((Number(end.at||0)-Number(start.at||0)).toFixed(2));
  return delta;
}

function compactWindow(sample,counters){
  return{
    activeWallMs:sample.activeWallMs,
    observedSimulationMs:sample.observedSimulationMs,
    simulationRatio:sample.simulationRatio,
    rafAcceptedRate:sample.rafAcceptedRate,
    updateRate:sample.updateRate,
    maxSampleGapMs:sample.maxSampleGapMs,
    sampleOverruns:sample.sampleOverruns,
    r59LongGaps:sample.r59LongGaps,
    r59PausedGapsDiscarded:sample.r59PausedGapsDiscarded,
    r59SoloDiscardedVisibleMs:sample.r59SoloDiscardedVisibleMs,
    r59SoloFrames:sample.r59SoloFrames,
    r59SoloSubsteps:sample.r59SoloSubsteps,
    r59SoloCatchupFrames:sample.r59SoloCatchupFrames,
    r59SoloLastElapsed:sample.r59SoloLastElapsed,
    r59SoloLastSteps:sample.r59SoloLastSteps,
    loopOwnerDepth:sample.loopOwnerDepth,
    updateOwnerDepth:sample.updateOwnerDepth,
    moveOwnerDepth:sample.moveOwnerDepth,
    damageOwnerDepth:sample.damageOwnerDepth,
    ownerChanges:sample.ownerChanges,
    r30OwnershipRepairs:sample.r30OwnershipRepairs,
    r30MovementRepairs:sample.r30MovementRepairs,
    sealRepairs:sample.sealRepairs,
    counters
  };
}

async function waitForLifecycleMode(page,expected,cycle,edge){
  try{
    await page.waitForFunction(expectedMode=>mode===expectedMode,expected,{timeout:LIFECYCLE_EDGE_TIMEOUT_MS});
  }catch(error){
    const state=await page.evaluate(()=>{
      const r59=window.CCGLostSizzlerV141R59LiveRegressionFixes?.state||{};
      const primitiveR59={};
      for(const [key,value] of Object.entries(r59)){
        if(value===null||["string","number","boolean"].includes(typeof value))primitiveR59[key]=value;
      }
      const player=typeof p1!=="undefined"&&p1?{
        health:Number(p1.health),
        maxHealth:Number(p1.maxHealth),
        armor:Number(p1.armor||0),
        dead:Boolean(p1.dead),
        down:Boolean(p1.down),
        hitStunMs:Number(p1.hitStunMs||0),
        controlLocked:Boolean(p1.controlLocked||p1.controlsLocked)
      }:null;
      const runState=typeof run!=="undefined"&&run?{
        floor:Number(run.floor||0),
        alert:Number(run.alert||0),
        complete:Boolean(run.complete),
        ended:Boolean(run.ended),
        gameOver:Boolean(run.gameOver)
      }:null;
      return{
        mode:typeof mode==="string"?mode:null,
        playMode:typeof playMode==="string"?playMode:null,
        runActive:document.body.dataset.runActive||"",
        releaseReady:document.body.dataset.releaseReady||"",
        controllerId:window.CCGLostSizzlerModeRuntime?.state?.activeId||"",
        hidden:document.hidden,
        visibilityState:document.visibilityState,
        hasFocus:document.hasFocus(),
        activeElement:document.activeElement?.id||document.activeElement?.tagName||"",
        player,
        run:runState,
        endText:String(document.querySelector("#game-over,#death-screen,#run-end,#end-screen")?.textContent||"").trim().slice(0,300),
        r59:primitiveR59,
        recentLifecycle:window.CCGLostSizzlerSoloDiagnostics?.lifecycleLog?.slice(-20)||[]
      };
    });
    console.error("SOLO_LONG_SESSION_LIFECYCLE_TIMEOUT "+JSON.stringify({cycle:cycle+1,totalCycles:PAUSE_CYCLES,edge,expected,state}));
    throw error;
  }
}

async function isolateTimingSoakFromNaturalDeath(page){
  const state=await page.evaluate(reserve=>{
    if(typeof p1==="undefined"||!p1)return null;
    const before={health:Number(p1.health),maxHealth:Number(p1.maxHealth)};
    p1.maxHealth=Math.max(reserve,Number(p1.maxHealth)||0);
    p1.health=p1.maxHealth;
    return{
      before,
      after:{health:Number(p1.health),maxHealth:Number(p1.maxHealth)},
      mode:typeof mode==="string"?mode:null,
      controllerId:window.CCGLostSizzlerModeRuntime?.state?.activeId||""
    };
  },SOAK_HEALTH_RESERVE);
  assert.ok(state,"timing soak requires a live Solo player");
  assert.equal(state.mode,"playing","timing soak survivability fixture must be installed during active play");
  assert.equal(state.controllerId,"dungeon-solo","timing soak survivability fixture must remain inside the Solo controller");
  assert.ok(state.after.health>=SOAK_HEALTH_RESERVE&&state.after.maxHealth>=SOAK_HEALTH_RESERVE,"timing soak survivability reserve was not applied");
  console.log(`[solo-long-soak] fixture-only survivability reserve ${state.before.health}/${state.before.maxHealth} -> ${state.after.health}/${state.after.maxHealth}; canonical AI, hazards, hurtPlayer and runtime owners remain untouched`);
}

function assertSustainedWindow(sample,label){
  assert.ok(sample.activeWallMs>=ACTIVE_WINDOW_MS*0.80,`${label}: expected sustained active wall-time evidence, got ${sample.activeWallMs} ms`);
  assert.ok(sample.observedSimulationMs>0,`${label}: Solo simulation did not advance`);
  assert.ok(Number.isFinite(sample.simulationRatio),`${label}: simulation ratio must be finite`);
  assert.ok(sample.simulationRatio>=MIN_RATIO&&sample.simulationRatio<=MAX_RATIO,`${label}: sustained Solo simulation must remain approximately 1.00x active wall time; got ${sample.simulationRatio}`);
  assert.ok(sample.rafAcceptedRate>0,`${label}: accepted RAF cadence must remain live`);
  assert.ok(sample.updateRate>0,`${label}: update cadence must remain live`);
  assert.equal(sample.controllerId,"dungeon-solo",`${label}: controller must remain dungeon-solo`);
  assert.equal(sample.mode,"playing",`${label}: run must remain actively playing`);
  assert.equal(sample.hidden,false,`${label}: measurement must finish visible`);
  assert.ok(sample.damageR29Layers<=2,`${label}: R29-compatible damage ancestry multiplied to ${sample.damageR29Layers}`);
  assert.ok(sample.damageR56Layers<=2,`${label}: R56-compatible damage ancestry multiplied to ${sample.damageR56Layers}`);
  assert.ok(sample.damageR60Layers<=1,`${label}: R60 damage ancestry multiplied to ${sample.damageR60Layers}`);
}

try{
  const context=await browser.newContext({viewport:{width:1800,height:1000}});
  const page=await context.newPage();
  page.setDefaultTimeout(90000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  console.log("[solo-long-soak] load canonical runtime and start Solo");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerSoloDiagnostics)&&Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&window.CCGLostSizzlerModeRuntime?.state?.activeId==="dungeon-solo",null,{timeout:20000});
  await isolateTimingSoakFromNaturalDeath(page);

  console.log("[solo-long-soak] sustained baseline window");
  const baselineCountersStart=await r59Counters(page,"baseline-start");
  await page.evaluate(()=>window.CCGLostSizzlerSoloDiagnostics.reset());
  await page.waitForTimeout(ACTIVE_WINDOW_MS);
  const baseline=await snapshot(page,"sustained-baseline");
  const baselineCountersEnd=await r59Counters(page,"baseline-end");
  const baselineCounterDelta=counterDelta(baselineCountersStart,baselineCountersEnd);
  assertSustainedWindow(baseline,"sustained-baseline");

  const ownerDepths={
    loop:baseline.loopOwnerDepth,
    update:baseline.updateOwnerDepth,
    move:baseline.moveOwnerDepth,
    damage:baseline.damageOwnerDepth
  };
  const repairCounts={
    ownership:baseline.r30OwnershipRepairs,
    movement:baseline.r30MovementRepairs,
    seal:baseline.sealRepairs
  };

  console.log(`[solo-long-soak] cross ${PAUSE_CYCLES} pause/focus lifecycle cycles`);
  const pauseBefore=await page.evaluate(()=>Number(window.CCGLostSizzlerV141R59LiveRegressionFixes.state.pauseBoundaries||0));
  for(let cycle=0;cycle<PAUSE_CYCLES;cycle++){
    console.log(`[solo-long-soak] lifecycle cycle ${cycle+1}/${PAUSE_CYCLES}: enter pause`);
    await page.keyboard.press("KeyP");
    await waitForLifecycleMode(page,"paused",cycle,"enter-pause");
    await page.evaluate(()=>window.dispatchEvent(new Event("blur")));
    await page.waitForTimeout(120);
    await page.evaluate(()=>window.dispatchEvent(new Event("focus")));
    console.log(`[solo-long-soak] lifecycle cycle ${cycle+1}/${PAUSE_CYCLES}: resume`);
    await page.keyboard.press("KeyP");
    await waitForLifecycleMode(page,"playing",cycle,"resume-play");
    await page.waitForTimeout(180);
  }
  const pauseAfter=await page.evaluate(()=>Number(window.CCGLostSizzlerV141R59LiveRegressionFixes.state.pauseBoundaries||0));
  assert.ok(pauseAfter-pauseBefore>=PAUSE_CYCLES*2,`R59 must observe both sides of each pause cycle: before=${pauseBefore}, after=${pauseAfter}`);

  console.log("[solo-long-soak] sustained post-lifecycle window");
  const stressedCountersStart=await r59Counters(page,"post-lifecycle-start");
  await page.evaluate(()=>window.CCGLostSizzlerSoloDiagnostics.reset());
  await page.waitForTimeout(ACTIVE_WINDOW_MS);
  const stressed=await snapshot(page,"sustained-post-lifecycle");
  const stressedCountersEnd=await r59Counters(page,"post-lifecycle-end");
  const stressedCounterDelta=counterDelta(stressedCountersStart,stressedCountersEnd);
  assertSustainedWindow(stressed,"sustained-post-lifecycle");

  const relative=stressed.simulationRatio/Math.max(0.0001,baseline.simulationRatio);
  const timingEvidence={
    activeWindowMs:ACTIVE_WINDOW_MS,
    pauseCycles:PAUSE_CYCLES,
    pauseBoundariesAdded:pauseAfter-pauseBefore,
    relativeSimulationCadence:Number(relative.toFixed(4)),
    baseline:compactWindow(baseline,baselineCounterDelta),
    stressed:compactWindow(stressed,stressedCounterDelta),
    delta:{
      simulationRatio:Number((stressed.simulationRatio-baseline.simulationRatio).toFixed(4)),
      activeWallMs:Number(stressed.activeWallMs)-Number(baseline.activeWallMs),
      observedSimulationMs:Number(stressed.observedSimulationMs)-Number(baseline.observedSimulationMs),
      maxSampleGapMs:Number((Number(stressed.maxSampleGapMs)-Number(baseline.maxSampleGapMs)).toFixed(2)),
      sampleOverruns:Number(stressed.sampleOverruns)-Number(baseline.sampleOverruns),
      r30OwnershipRepairs:Number(stressed.r30OwnershipRepairs)-Number(baseline.r30OwnershipRepairs),
      r30MovementRepairs:Number(stressed.r30MovementRepairs)-Number(baseline.r30MovementRepairs),
      sealRepairs:Number(stressed.sealRepairs)-Number(baseline.sealRepairs),
      windowDiscardedVisibleMs:Number((stressedCounterDelta.soloDiscardedVisibleMs-baselineCounterDelta.soloDiscardedVisibleMs).toFixed(2)),
      windowLongGaps:Number(stressedCounterDelta.longGaps)-Number(baselineCounterDelta.longGaps)
    }
  };
  console.log("SOLO_LONG_SESSION_WINDOW_METRICS "+JSON.stringify(timingEvidence));

  assert.ok(relative>=0.95&&relative<=1.05,`lifecycle stress must not materially change Solo cadence: baseline=${baseline.simulationRatio}, post=${stressed.simulationRatio}, relative=${relative.toFixed(4)}`);

  for(const [owner,before] of Object.entries(ownerDepths)){
    const key=`${owner}OwnerDepth`;
    const growth=Number(stressed[key])-Number(before);
    assert.ok(growth<=1,`${owner} owner depth grew unexpectedly during sustained soak: ${before} -> ${stressed[key]}`);
  }

  assert.ok(stressed.r30OwnershipRepairs-repairCounts.ownership<=1,`unexplained R30 ownership repairs accumulated during sustained play: ${repairCounts.ownership} -> ${stressed.r30OwnershipRepairs}`);
  assert.ok(stressed.r30MovementRepairs-repairCounts.movement<=1,`unexplained R30 movement repairs accumulated during sustained play: ${repairCounts.movement} -> ${stressed.r30MovementRepairs}`);
  assert.ok(stressed.sealRepairs-repairCounts.seal<=1,`owner-seal repairs accumulated during sustained play: ${repairCounts.seal} -> ${stressed.sealRepairs}`);
  assert.deepEqual(errors,[],`sustained Solo soak produced page errors: ${errors.join("\n")}`);

  console.log("SOLO_LONG_SESSION_SOAK_METRICS "+JSON.stringify({
    activeWindowMs:ACTIVE_WINDOW_MS,
    pauseCycles:PAUSE_CYCLES,
    baseline,
    stressed,
    baselineCounterDelta,
    stressedCounterDelta,
    pauseBoundariesAdded:pauseAfter-pauseBefore,
    relativeSimulationCadence:Number(relative.toFixed(4))
  }));
  console.log("Lost Sizzler sustained Solo timing/ownership soak completed. Repeated clean long-session evidence is still required before closing historical defects.");
  await context.close();
}finally{
  await browser.close().catch(()=>{});
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
