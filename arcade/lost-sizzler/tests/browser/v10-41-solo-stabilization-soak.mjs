import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

/*
 * Accelerated stabilization soak for the unresolved Solo timing defect.
 *
 * This is intentionally not treated as proof that the long-session defect is
 * fixed. It gives CI a repeatable numerical sample of active visible Solo wall
 * time versus run.elapsed, plus RAF/update cadence and owner depth before and
 * after repeated pause/resume boundaries. A genuine long-duration soak is still
 * required before LS-SOLO-001 or LS-SOLO-003 can close.
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

const ACTIVE_SAMPLE_MS=5000;
const PAUSE_CYCLES=16;

async function readTelemetry(page,label){
  return page.evaluate(label=>{
    const api=window.CCGLostSizzlerSoloDiagnostics;
    const snap=api.snapshot();
    const state=api.state;
    return{
      label,
      ...snap,
      minSimulationRatio:Number.isFinite(state.minSimulationRatio)?Number(state.minSimulationRatio.toFixed(4)):null,
      maxSimulationRatio:Number.isFinite(state.maxSimulationRatio)?Number(state.maxSimulationRatio.toFixed(4)):null,
      ratioWarnings:Number(state.ratioWarnings||0),
      samples:Number(state.samples||0),
      recentOwnerChanges:api.ownerChangeLog.slice(-12),
      recentLifecycle:api.lifecycleLog.slice(-12)
    };
  },label);
}


async function readOwnershipDebug(page,label){
  return page.evaluate(label=>{
    const diagnostics=window.CCGLostSizzlerSoloDiagnostics;
    const r30=window.CCGLostSizzlerV141R30;
    const spy=window.CCGLostSizzlerV141R29SpyEngine;
    const r60=window.CCGLostSizzlerV141R60LivePlayIntegrity;
    const describe=fn=>{
      if(typeof fn!=="function")return null;
      const chain=[];
      const seen=new Set();
      let current=fn,depth=0;
      while(typeof current==="function"&&!seen.has(current)&&depth++<12){
        seen.add(current);
        const markers=[];
        for(const key of ["__ccgV141R60CadenceSeal","__ccgV141R29SpyOwner","__ccgV141SpyFinal","__ccgV141TutorialMoveFinal","__ccgV141SpyIsolated","__ccgV141R60EnvironmentSeal","__ccgV141R56EnvironmentDamage","__ccgV141R29HordeFriendly","__ccgV141PostPlaytestHurt"]){
          try{if(current[key])markers.push(key)}catch(_){}
        }
        chain.push({name:String(current.name||"anonymous"),markers});
        try{current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null}catch(_){current=null}
      }
      return{depth:chain.length,chain};
    };
    return{
      label,
      current:{move:describe(window.movePlayer),hurt:describe(window.hurtPlayer)},
      r30:r30?{
        forcedRestores:Number(r30.state?.forcedRestores||0),
        ownershipRepairs:Number(r30.state?.ownershipRepairs||0),
        movementRepairs:Number(r30.state?.movementRepairs||0),
        goldenLocked:Boolean(r30.state?.goldenLocked),
        goldenMovePromotions:Number(r30.state?.goldenMovePromotions||0),
        goldenMovePromotionRejects:Number(r30.state?.goldenMovePromotionRejects||0),
        lastRestoreReason:String(r30.state?.lastRestoreReason||""),
        baselineMove:describe(r30.state?.baselineMove),
        goldenMove:describe(r30.state?.goldenMove),
        baselineHurt:describe(r30.state?.baselineHurt),
        goldenHurt:describe(r30.state?.goldenHurt)
      }:null,
      spy:spy?{
        isolated:Boolean(spy.state?.isolated),
        timer:Number(spy.state?.timer||0),
        moveReassertions:Number(spy.state?.moveReassertions||0),
        baseMove:describe(spy.state?.baseMove),
        baseHurt:describe(spy.state?.baseHurt)
      }:null,
      r60:r60?{
        timer:Number(r60.state?.timer||0),
        ownerReassertions:Number(r60.state?.ownerReassertions||0),
        moveWrapped:Boolean(r60.state?.moveWrapped),
        hurtWrapped:Boolean(r60.state?.hurtWrapped),
        moveSource:describe(r60.state?.moveSource),
        hurtSource:describe(r60.state?.hurtSource)
      }:null,
      recentOwnerChanges:diagnostics?.ownerChangeLog?.slice(-20)||[]
    };
  },label);
}

function assertMeasurementHealthy(sample,label){
  assert.ok(sample.activeWallMs>=ACTIVE_SAMPLE_MS*0.55,`${label}: diagnostics must observe a meaningful active wall-time sample, got ${sample.activeWallMs} ms`);
  assert.ok(sample.observedSimulationMs>0,`${label}: diagnostics must observe advancing Solo simulation time`);
  assert.ok(Number.isFinite(sample.simulationRatio),`${label}: simulation ratio must be finite`);
  // Wide diagnostic guard only. The final stabilization exit criterion is much
  // tighter (~1.00x) and requires a genuinely long session, not this fast soak.
  assert.ok(sample.simulationRatio>=0.45&&sample.simulationRatio<=1.65,`${label}: accelerated sample is already pathologically far from wall time: ${sample.simulationRatio}`);
  assert.ok(sample.rafAcceptedRate>0,`${label}: accepted RAF cadence must remain live`);
  assert.ok(sample.updateRate>0,`${label}: update cadence must remain live`);
}

function assertDamageOwnerCeiling(sample,label){
  // R60 intentionally carries retained R56/R29 compatibility markers, so R29
  // and R56 may each appear twice (their own layer plus R60). Anything above
  // these ceilings means historical damage owners are multiplying again.
  assert.ok(sample.damageR29Layers<=2,`${label}: retained R29-compatible damage layers multiplied to ${sample.damageR29Layers}`);
  assert.ok(sample.damageR56Layers<=2,`${label}: retained R56-compatible damage layers multiplied to ${sample.damageR56Layers}`);
  assert.ok(sample.damageR60Layers<=1,`${label}: R60 environmental damage layers multiplied to ${sample.damageR60Layers}`);
}

try{
  const context=await browser.newContext({viewport:{width:1800,height:1000}});
  const page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  console.log("[solo-soak] load canonical runtime and start Solo");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerSoloDiagnostics)&&Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&window.CCGLostSizzlerModeRuntime?.state?.activeId==="dungeon-solo",null,{timeout:20000});

  console.log("[solo-soak] measure uninterrupted active baseline");
  await page.evaluate(()=>window.CCGLostSizzlerSoloDiagnostics.reset());
  const initial=await readTelemetry(page,"initial");
  await page.waitForTimeout(ACTIVE_SAMPLE_MS);
  const baseline=await readTelemetry(page,"baseline");
  const baselineOwnership=await readOwnershipDebug(page,"baseline");
  assertMeasurementHealthy(baseline,"baseline");
  assertDamageOwnerCeiling(baseline,"baseline");

  const baselineDepths={
    loop:baseline.loopOwnerDepth,
    update:baseline.updateOwnerDepth,
    move:baseline.moveOwnerDepth,
    damage:baseline.damageOwnerDepth
  };

  console.log(`[solo-soak] cross ${PAUSE_CYCLES} real pause/resume boundaries`);
  await page.evaluate(()=>window.CCGLostSizzlerSoloDiagnostics.reset());
  const pauseStateBefore=await page.evaluate(()=>Number(window.CCGLostSizzlerV141R59LiveRegressionFixes.state.pauseBoundaries||0));
  for(let cycle=0;cycle<PAUSE_CYCLES;cycle++){
    await page.keyboard.press("KeyP");
    await page.waitForFunction(()=>mode==="paused");
    await page.waitForTimeout(90);
    await page.keyboard.press("KeyP");
    await page.waitForFunction(()=>mode==="playing");
    await page.waitForTimeout(170);
  }
  const pauseStateAfter=await page.evaluate(()=>Number(window.CCGLostSizzlerV141R59LiveRegressionFixes.state.pauseBoundaries||0));
  assert.ok(pauseStateAfter-pauseStateBefore>=PAUSE_CYCLES*2,`R59 must observe both sides of every pause cycle: before=${pauseStateBefore}, after=${pauseStateAfter}`);

  // Preserve the transition window as evidence, but do not use it as the
  // post-cycle cadence sample. Rapid pause/resume intentionally alternates
  // active/inactive diagnostics windows and is not comparable with the
  // uninterrupted five-second baseline.
  const transitionSoak=await readTelemetry(page,"pause-transition-window");
  assertDamageOwnerCeiling(transitionSoak,"pause-transition-window");

  console.log("[solo-soak] measure uninterrupted post-cycle active cadence");
  await page.evaluate(()=>window.CCGLostSizzlerSoloDiagnostics.reset());
  await page.waitForTimeout(ACTIVE_SAMPLE_MS);
  const stressed=await readTelemetry(page,"post-pause-soak");
  const stressedOwnership=await readOwnershipDebug(page,"post-pause-soak");
  assertMeasurementHealthy(stressed,"post-pause-soak");
  assertDamageOwnerCeiling(stressed,"post-pause-soak");

  console.log("SOLO_STABILIZATION_OWNERSHIP_DEBUG "+JSON.stringify({
    baseline:baselineOwnership,
    stressed:stressedOwnership
  }));

  const depthGrowth={
    loop:stressed.loopOwnerDepth-baselineDepths.loop,
    update:stressed.updateOwnerDepth-baselineDepths.update,
    move:stressed.moveOwnerDepth-baselineDepths.move,
    damage:stressed.damageOwnerDepth-baselineDepths.damage
  };
  for(const [owner,growth] of Object.entries(depthGrowth)){
    assert.ok(growth<=1,`${owner} owner wrapper depth must remain bounded across pause cycling; baseline=${baselineDepths[owner]}, final=${baselineDepths[owner]+growth}`);
  }

  const cadenceRatio=stressed.simulationRatio/Math.max(0.0001,baseline.simulationRatio);
  assert.ok(cadenceRatio>=0.65&&cadenceRatio<=1.45,`pause cycling must not multiply or collapse observed Solo simulation cadence: baseline=${baseline.simulationRatio}, stressed=${stressed.simulationRatio}, relative=${cadenceRatio.toFixed(3)}`);
  assert.equal(stressed.controllerId,"dungeon-solo","accelerated soak must remain in the Solo controller");
  assert.equal(stressed.mode,"playing","accelerated soak must finish in active play");
  assert.equal(stressed.hidden,false,"accelerated soak must finish visible");
  assert.deepEqual(errors,[],`accelerated Solo soak produced page errors: ${errors.join("\n")}`);

  const soloClockDeltas={
    frames:stressed.r59SoloFrames-baseline.r59SoloFrames,
    substeps:stressed.r59SoloSubsteps-baseline.r59SoloSubsteps,
    catchupFrames:stressed.r59SoloCatchupFrames-baseline.r59SoloCatchupFrames,
    discardedVisibleMs:stressed.r59SoloDiscardedVisibleMs-baseline.r59SoloDiscardedVisibleMs
  };
  assert.ok(soloClockDeltas.frames>0,"bounded Solo clock must continue accepting Solo frames after lifecycle stress");
  assert.ok(soloClockDeltas.substeps>=soloClockDeltas.frames,"bounded Solo clock must execute at least one simulation substep for every active Solo frame it services");

  console.log("SOLO_STABILIZATION_SOAK_METRICS "+JSON.stringify({
    initial,
    baseline,
    transitionSoak,
    stressed,
    pauseBoundariesAdded:pauseStateAfter-pauseStateBefore,
    depthGrowth,
    soloClockDeltas,
    relativeSimulationCadence:Number(cadenceRatio.toFixed(4))
  }));
  console.log("Lost Sizzler accelerated Solo timing/ownership soak completed. This is diagnostic evidence, not long-session closure.");
  await context.close();
}finally{
  await browser.close().catch(()=>{});
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}