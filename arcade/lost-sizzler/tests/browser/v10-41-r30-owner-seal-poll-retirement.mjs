import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(60000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R30?.state?.goldenLocked));
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R30OwnerSeal));
  // R30 can lock an initial release owner and then deliberately promote the
  // final R60 cadence wrapper. Do not snapshot an obsolete pre-R60 golden owner.
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R30?.state?.goldenMove?.__ccgV141R60CadenceSeal),null,{timeout:15000});

  const readiness=await page.evaluate(()=>{
    const guard=window.CCGLostSizzlerV141R30,seal=window.CCGLostSizzlerV141R30OwnerSeal;
    seal.seal?.("poll-retirement regression readiness");
    seal.retirePollIfCovered?.();
    window.__r30PollRetirementGolden=guard.state.goldenMove;
    window.__r30PollRetirementBefore={
      blocked:Number(seal.state?.blockedWrites||0),
      repairs:Number(guard.state?.ownershipRepairs||0),
      promotions:Number(guard.state?.goldenMovePromotions||0),
      rejectedPromotions:Number(guard.state?.goldenMovePromotionRejects||0)
    };
    return{
      assignmentGate:Boolean(seal.state?.assignmentGate),
      assignmentGateUnsupported:Boolean(seal.state?.assignmentGateUnsupported),
      retirementCoverage:String(seal.retirementCoverage?.()||""),
      retirementReason:String(seal.state?.pollRetirementReason||""),
      sealTimer:Number(seal.state?.timer||0),
      globalGuardTimer:Number(guard.state?.timer||0),
      goldenLocked:Boolean(guard.state?.goldenLocked),
      r60Golden:Boolean(guard.state?.goldenMove?.__ccgV141R60CadenceSeal),
      tutorialCompatible:Boolean(guard.state?.goldenMove?.__tutorial)
    }
  });
  assert.equal(readiness.goldenLocked,true,"R30 poll-retirement regression requires the proven locked golden movement owner");
  assert.equal(readiness.r60Golden,true,"R30 poll-retirement regression must snapshot the final R60-promoted movement owner");
  assert.equal(readiness.tutorialCompatible,true,"the final R30 golden movement owner must remain tutorial-compatible");
  assert.ok(readiness.globalGuardTimer>0,"R30 40ms global recovery guard must be active before the 16ms seal poll retires");
  assert.ok(["assignment-gate","r30-global-guard"].includes(readiness.retirementCoverage),`R30 seal poll needs a live replacement recovery path: ${JSON.stringify(readiness)}`);
  assert.equal(readiness.sealTimer,0,`R30 16ms owner-seal poll must retire when replacement coverage exists: ${JSON.stringify(readiness)}`);

  await page.evaluate(()=>{
    const dead=function r30PollRetirementDeadOwner(){return false};dead.__r30PollRetirementHostile=true;dead.__ccgOriginal=window.movePlayer;window.movePlayer=dead;
  });
  let recoveryTimeout=null;
  try{
    await page.waitForFunction(()=>typeof window.__r30PollRetirementGolden==="function"&&window.movePlayer===window.__r30PollRetirementGolden,null,{timeout:500});
  }catch(error){recoveryTimeout=String(error?.message||error)}
  if(recoveryTimeout){
    const diagnostic=await page.evaluate(()=>{
      const guard=window.CCGLostSizzlerV141R30,seal=window.CCGLostSizzlerV141R30OwnerSeal;
      const current=window.movePlayer,golden=window.__r30PollRetirementGolden;
      let descriptor=null;try{descriptor=Object.getOwnPropertyDescriptor(window,"movePlayer")}catch(_){}
      const tutorial=window.CCGLostSizzlerOnboardingV120?.state||null;
      const spyEngine=window.CCGLostSizzlerV141R29SpyEngine?.state||null;
      const tutorialFinal=window.CCGLostSizzlerV141TutorialActionFinalizer?.state||null;
      const spyFinal=window.CCGLostSizzlerV141SpyMovementFinalizer?.state||null;
      const stability=window.CCGLostSizzlerV141BrowserStabilityGameplay?.state||null;
      return{
        mode:typeof mode!=="undefined"?String(mode||""):"<missing>",
        runActive:String(document.body?.dataset?.runActive||""),
        specialMode:String(document.body?.dataset?.specialMode||""),
        specialActive:String(window.CCGLostSizzlerSpecialModes?.active?.type||""),
        spyOwned:Boolean(seal.spyOwned?.()),
        tutorialOwned:Boolean(seal.tutorialOwned?.()),
        spyIsolated:Boolean(spyEngine?.isolated),
        tutorialState:tutorial?{active:Boolean(tutorial.active),tutorialRequested:Boolean(tutorial.tutorialRequested),forceTutorial:Boolean(tutorial.forceTutorial)}:null,
        tutorialFinalInstalled:Boolean(tutorialFinal?.installed),
        spyFinalMoveInstalled:Boolean(spyFinal?.moveInstalled),
        stabilityMoveGuard:Boolean(stability?.moveGuard),
        assignmentGateState:Boolean(seal.state?.assignmentGate),
        assignmentGateActive:Boolean(seal.assignmentGateActive?.()),
        assignmentGateUnsupported:Boolean(seal.state?.assignmentGateUnsupported),
        assignmentGateLosses:Number(seal.state?.assignmentGateLosses||0),
        retirementCoverage:String(seal.retirementCoverage?.()||""),
        retirementReason:String(seal.state?.pollRetirementReason||""),
        sealTimer:Number(seal.state?.timer||0),
        globalGuardTimer:Number(guard.state?.timer||0),
        goldenLocked:Boolean(guard.state?.goldenLocked),
        currentName:String(current?.name||""),
        goldenName:String(golden?.name||""),
        currentEqualsGolden:current===golden,
        guardGoldenEqualsExpected:guard.state?.goldenMove===golden,
        goldenR60:Boolean(guard.state?.goldenMove?.__ccgV141R60CadenceSeal),
        goldenPromotions:Number(guard.state?.goldenMovePromotions||0),
        rejectedPromotions:Number(guard.state?.goldenMovePromotionRejects||0),
        currentContainsHostile:Boolean(guard.chainHas?.(current,"__r30PollRetirementHostile")),
        goldenContainsHostile:Boolean(guard.chainHas?.(guard.state?.goldenMove,"__r30PollRetirementHostile")),
        baselineEqualsCurrent:guard.state?.baselineMove===current,
        baselineEqualsGolden:guard.state?.baselineMove===golden,
        currentOriginalEqualsGolden:current?.__ccgOriginal===golden,
        currentSpyContaminated:Boolean(guard.spyContaminated?.(current)),
        ownershipRepairs:Number(guard.state?.ownershipRepairs||0),
        forcedRestores:Number(guard.state?.forcedRestores||0),
        descriptorKind:descriptor?.get||descriptor?.set?"accessor":"value",
        descriptorGet:String(descriptor?.get?.name||""),
        descriptorSet:String(descriptor?.set?.name||""),
        descriptorValueName:String(descriptor?.value?.name||"")
      }
    });
    assert.fail(`R30 owner-seal hostile movement-owner write was not recovered within 500ms. timeout=${recoveryTimeout} diagnostic=${JSON.stringify(diagnostic)}`)
  }

  const result=await page.evaluate(()=>{
    const guard=window.CCGLostSizzlerV141R30,seal=window.CCGLostSizzlerV141R30OwnerSeal,before=window.__r30PollRetirementBefore||{};
    return{
      assignmentGate:Boolean(seal.state.assignmentGate),
      assignmentGateUnsupported:Boolean(seal.state.assignmentGateUnsupported),
      sealTimer:Number(seal.state.timer||0),
      retirementCoverage:String(seal.retirementCoverage?.()||""),
      globalGuardTimer:Number(guard.state.timer||0),
      blockedDelta:Number(seal.state.blockedWrites||0)-Number(before.blocked||0),
      repairDelta:Number(guard.state.ownershipRepairs||0)-Number(before.repairs||0),
      promotionDelta:Number(guard.state.goldenMovePromotions||0)-Number(before.promotions||0),
      rejectedPromotionDelta:Number(guard.state.goldenMovePromotionRejects||0)-Number(before.rejectedPromotions||0),
      moveStillGolden:window.movePlayer===window.__r30PollRetirementGolden,
      goldenStable:guard.state.goldenMove===window.__r30PollRetirementGolden,
      currentContainsHostile:Boolean(guard.chainHas?.(window.movePlayer,"__r30PollRetirementHostile")),
      goldenContainsHostile:Boolean(guard.chainHas?.(guard.state.goldenMove,"__r30PollRetirementHostile")),
      tutorialCompatible:Boolean(window.movePlayer?.__tutorial)
    }
  });

  assert.equal(result.sealTimer,0,"R30 16ms owner-seal poll must remain retired after a hostile movement-owner write");
  assert.ok(result.globalGuardTimer>0,"the broader R30 40ms recovery guard must remain active during this consolidation step");
  assert.equal(result.moveStillGolden,true,"the surviving R30 recovery path must restore the final locked golden movement owner within 500ms");
  assert.equal(result.goldenStable,true,"the surviving recovery path must not mutate the final R60-promoted golden owner identity");
  assert.equal(result.promotionDelta,0,"a hostile intermediary must never trigger a further golden movement promotion");
  assert.equal(result.currentContainsHostile,false,"hostile movement ownership must not survive anywhere in the restored live movement chain");
  assert.equal(result.goldenContainsHostile,false,"hostile movement ownership must never be admitted into the R30 golden movement chain");
  assert.equal(result.tutorialCompatible,true,"hostile-owner recovery must preserve the golden owner's tutorial compatibility marker");
  assert.ok(result.repairDelta>=1||result.blockedDelta>=1,`the hostile assignment must be visible to either the synchronous gate or the R30 global recovery diagnostics: ${JSON.stringify(result)}`);

  const tutorialStability=await page.evaluate(async()=>{
    const guard=window.CCGLostSizzlerV141R30,seal=window.CCGLostSizzlerV141R30OwnerSeal,ts=window.CCGLostSizzlerOnboardingV120?.state;
    const original={active:Boolean(ts?.active),requested:Boolean(ts?.tutorialRequested),force:Boolean(ts?.forceTutorial),dataset:String(document.body?.dataset?.tutorialActive||"")};
    const beforeRepairs=Number(guard.state?.ownershipRepairs||0),beforeBlocked=Number(seal.state?.blockedWrites||0),golden=guard.state.goldenMove;
    if(ts){ts.tutorialRequested=true;ts.active=true;ts.forceTutorial=false}
    document.body.dataset.tutorialActive="true";
    seal.syncTutorialWindow?.();
    await new Promise(resolve=>setTimeout(resolve,650));
    const during={
      sameOwner:window.movePlayer===golden,
      goldenStable:guard.state.goldenMove===golden,
      tutorialMarker:Boolean(golden?.__tutorial),
      currentMarker:Boolean(window.movePlayer?.__tutorial),
      repairs:Number(guard.state?.ownershipRepairs||0)-beforeRepairs,
      blocked:Number(seal.state?.blockedWrites||0)-beforeBlocked
    };
    if(ts){ts.active=original.active;ts.tutorialRequested=original.requested;ts.forceTutorial=original.force}
    if(original.dataset)document.body.dataset.tutorialActive=original.dataset;else delete document.body.dataset.tutorialActive;
    seal.syncTutorialWindow?.();
    return during
  });
  assert.equal(tutorialStability.sameOwner,true,`legacy onboarding must not rewrap the R30 golden movement owner during a 650ms Tutorial window: ${JSON.stringify(tutorialStability)}`);
  assert.equal(tutorialStability.goldenStable,true,"Tutorial ownership compatibility must not promote or replace the final R30 golden movement owner");
  assert.equal(tutorialStability.tutorialMarker,true,"R30 golden movement owner must retain __tutorial throughout Tutorial activity");
  assert.equal(tutorialStability.currentMarker,true,"live movement owner must remain tutorial-compatible throughout Tutorial activity");

  assert.deepEqual(errors,[],`R30 owner-seal poll-retirement regression must not produce page errors: ${errors.join("\n")}`);
  console.log(`R30 owner-seal 16ms poll retired with ${result.retirementCoverage}; assignmentGate=${result.assignmentGate}, recoveryDiagnostics=${result.repairDelta+result.blockedDelta}, rejectedPromotions=${result.rejectedPromotionDelta}; Tutorial owner remained stable across legacy installer cadence.`);
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));
}
