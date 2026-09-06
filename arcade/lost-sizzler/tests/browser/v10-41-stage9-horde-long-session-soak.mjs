import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const r60Source=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-41-r60-horde-combat-integrity.js"),"utf8");
const frameSource=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-41-horde-frame-performance.js"),"utf8");
assert.doesNotMatch(r60Source,/requestAnimationFrame\s*\(/,"the sustained Horde gate must retain the shared controller frame boundary");
assert.doesNotMatch(frameSource,/window\.update\s*=/,"the sustained Horde gate must not add a competing shared update owner");

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
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(window.CCGLostSizzlerSpecialModes)&&Boolean(window.CCGLostSizzlerV141R60HordeCombatIntegrity?.state?.installed)&&Boolean(window.CCGLostSizzlerV141HordeFramePerformance?.state)&&Boolean(window.CCGLostSizzlerV141R60HordeOwnerComposition?.state?.retired)&&Boolean(document.getElementById("horde-solo-btn")),null,{timeout:90000});
  await page.click("#horde-solo-btn");
  await page.waitForFunction(()=>mode==="playing"&&document.body.dataset.specialMode==="horde-survivor"&&document.body.dataset.hordeSolo==="true"&&window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId==="horde-solo"&&Boolean(p1)&&Boolean(host)&&Number(window.CCGLostSizzlerV141HordeFramePerformance?.state?.statusTimer||0)>0,null,{timeout:30000});
  await page.waitForTimeout(350);

  const snapshot=()=>page.evaluate(()=>{
    const runtime=window.CCGLostSizzlerModeRuntime,perf=window.CCGLostSizzlerV141HordeFramePerformance,r60=window.CCGLostSizzlerV141R60HordeCombatIntegrity,composition=window.CCGLostSizzlerV141R60HordeOwnerComposition,live=window.CCGLostSizzlerV138,owner=r60?.state?.liveOwner;
    const chain=(fn,target)=>{const seen=new Set();let current=fn,depth=0,count=0;while(typeof current==="function"&&!seen.has(current)&&depth<48){if(current===target)count++;seen.add(current);depth++;current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null}return{depth,count}};
    const ancestry=chain(live?.updateHordeLive,owner);
    return{
      mode:String(typeof mode!=="undefined"?mode:""),activeId:String(runtime?.snapshot?.().activeId||""),specialMode:String(document.body.dataset.specialMode||""),
      statusTimer:Number(perf?.state?.statusTimer||0),statusStarts:Number(perf?.state?.statusStarts||0),statusStops:Number(perf?.state?.statusStops||0),r60LiveTimer:Number(perf?.state?.r60LiveTimer||0),
      frameOwnerInstalls:Number(perf?.state?.r60HordeLiveOwnerInstalls||0),frameOwnerReassertions:Number(perf?.state?.r60HordeLiveOwnerReassertions||0),frameOwnerErrors:Number(perf?.state?.r60HordeLiveOwnerErrors||0),
      liveOwnerInstalls:Number(r60?.state?.liveOwnerInstalls||0),liveOwnerReassertions:Number(r60?.state?.liveOwnerReassertions||0),hookReassertions:Number(r60?.state?.hookReassertions||0),lastError:String(r60?.state?.lastError||""),
      ownerDepth:ancestry.depth,ownerCount:ancestry.count,frames:Number(r60?.state?.frames||0),liveElapsedFrames:Number(r60?.state?.liveElapsedFrames||0),projectileSteps:Number(r60?.state?.projectileSteps||0),enemySteps:Number(r60?.state?.enemySteps||0),
      liveSubsteps:Number(r60?.state?.liveSubsteps||0),liveCatchupSubsteps:Number(r60?.state?.liveCatchupSubsteps||0),visibleGapClamps:Number(r60?.state?.visibleGapClamps||0),discardedVisibleMs:Number(r60?.state?.discardedVisibleMs||0),
      pauseGapsDiscarded:Number(r60?.state?.pauseGapsDiscarded||0),resumeGuardFrames:Number(r60?.state?.resumeGuardFrames||0),duplicateCombatServices:Number(r60?.state?.duplicateCombatServices||0),
      compositionRetired:Boolean(composition?.state?.retired),compositionTimer:Number(composition?.state?.timer||0)
    }
  });
  const protectPlayer=()=>page.evaluate(()=>{
    if(p1){p1.maxHealth=Math.max(100000,Number(p1.maxHealth)||0);p1.health=p1.maxHealth;p1.armor=Math.max(10000,Number(p1.armor)||0);p1.invuln=5000;p1.hitStunMs=0}
    const state=window.CCGLostSizzlerSpecialModes?.active?.state,model=state?.players?.find?.(row=>String(row?.id)===String(p1?.id||net?.sessionId))||state?.players?.[0];
    if(model){model.maxHp=Math.max(100000,Number(model.maxHp)||0);model.hp=model.maxHp;model.status="active";model.invulnerableUntil=Date.now()+5000}
  });
  const assertStable=(state,baseline,label)=>{
    assert.equal(state.activeId,"horde-solo",`${label} must remain under the Horde Solo controller`);
    assert.equal(state.specialMode,"horde-survivor",`${label} must retain Horde special-mode ownership`);
    assert.equal(state.ownerCount,1,`${label} must retain exactly one R60 Horde live owner`);
    assert.equal(state.ownerDepth,baseline.ownerDepth,`${label} must keep live-owner ancestry depth bounded`);
    assert.equal(state.liveOwnerInstalls,baseline.liveOwnerInstalls,`${label} must not install another R60 live owner`);
    assert.equal(state.liveOwnerReassertions,baseline.liveOwnerReassertions,`${label} must not reassert the R60 live owner`);
    assert.equal(state.frameOwnerInstalls,baseline.frameOwnerInstalls,`${label} must not install another frame-performance owner`);
    assert.equal(state.frameOwnerReassertions,baseline.frameOwnerReassertions,`${label} must not reassert the frame-performance owner`);
    assert.equal(state.frameOwnerErrors,baseline.frameOwnerErrors,`${label} must not add a frame-owner error`);
    assert.equal(state.hookReassertions,baseline.hookReassertions,`${label} must not replace the established Horde hooks`);
    assert.equal(state.lastError,baseline.lastError,`${label} must not add an R60 runtime error`);
    assert.equal(state.statusTimer,baseline.statusTimer,`${label} must reuse the same Horde status timer`);
    assert.equal(state.r60LiveTimer,baseline.r60LiveTimer,`${label} must reuse the same Horde owner-maintenance timer`);
    assert.equal(state.statusStarts,baseline.statusStarts,`${label} must not restart status maintenance`);
    assert.equal(state.statusStops,baseline.statusStops,`${label} must not stop status maintenance during the active run`);
    assert.equal(state.compositionRetired,true,`${label} must keep the composition bridge retired`);
    assert.equal(state.compositionTimer,0,`${label} must not revive the composition polling timer`)
  };

  await protectPlayer();
  const baseline=await snapshot();
  assert.equal(baseline.ownerCount,1,"the sustained Horde baseline must contain exactly one R60 live owner");
  assert.ok(baseline.statusTimer>0,"the sustained Horde baseline must have one status timer handle");
  assert.ok(baseline.r60LiveTimer>0,"the sustained Horde baseline must have one bounded owner-maintenance timer handle");

  for(let sample=1;sample<=6;sample++){
    await page.waitForTimeout(700);await protectPlayer();
    const current=await snapshot();assert.equal(current.mode,"playing",`active Horde soak sample ${sample} must remain in play`);assertStable(current,baseline,`active Horde soak sample ${sample}`)
  }

  const beforeStalls=await snapshot();
  for(let stall=1;stall<=2;stall++){
    await page.evaluate(()=>{const end=performance.now()+260;while(performance.now()<end){}});
    await page.waitForTimeout(320);await protectPlayer();assertStable(await snapshot(),baseline,`bounded visible-stall sample ${stall}`)
  }
  const afterStalls=await snapshot();
  assert.ok(afterStalls.visibleGapClamps>beforeStalls.visibleGapClamps,"two active 260 ms stalls must exercise the R60 visible-gap clamp");
  assert.ok(afterStalls.liveCatchupSubsteps>beforeStalls.liveCatchupSubsteps,"active stalls must use bounded Horde live catch-up substeps");
  assert.ok(afterStalls.discardedVisibleMs-beforeStalls.discardedVisibleMs<2000,`bounded active stalls must not create runaway retained debt: ${JSON.stringify({before:beforeStalls.discardedVisibleMs,after:afterStalls.discardedVisibleMs})}`);

  for(let cycle=1;cycle<=3;cycle++){
    await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="paused");await page.waitForTimeout(180);
    const paused=await snapshot();assert.equal(paused.activeId,"horde-solo",`pause soak ${cycle} must retain the Horde controller`);assert.equal(paused.ownerCount,1,`pause soak ${cycle} must retain one R60 live owner`);assert.equal(paused.ownerDepth,baseline.ownerDepth,`pause soak ${cycle} must keep owner ancestry bounded`);
    await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="playing"&&window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId==="horde-solo");await page.waitForTimeout(450);await protectPlayer();assertStable(await snapshot(),baseline,`pause/resume soak ${cycle}`)
  }

  await page.waitForTimeout(1200);await protectPlayer();
  const final=await snapshot();assertStable(final,baseline,"final sustained Horde sample");
  assert.ok(final.frames>baseline.frames,"the sustained Horde run must advance R60 frame accounting");
  assert.ok(final.liveElapsedFrames>baseline.liveElapsedFrames,"the sustained Horde run must advance live elapsed frames");
  assert.ok(final.projectileSteps>baseline.projectileSteps,"the sustained Horde run must continue projectile cadence");
  assert.ok(final.enemySteps>baseline.enemySteps,"the sustained Horde run must continue enemy cadence");
  assert.ok(final.liveSubsteps>baseline.liveSubsteps,"the sustained Horde run must advance bounded live substeps");
  assert.ok(final.pauseGapsDiscarded>baseline.pauseGapsDiscarded,"pause/resume soak must discard inactive gaps");
  assert.ok(final.resumeGuardFrames>baseline.resumeGuardFrames,"pause/resume soak must exercise the bounded recovery guard");
  assert.equal(final.duplicateCombatServices,baseline.duplicateCombatServices,"the sustained run must not service combat twice for one controller frame");
  assert.deepEqual(errors,[],`Stage 9 sustained Horde qualification must have no uncaught browser errors: ${errors.join("\n")}`);

  console.log("Lost Sizzler Stage 9 sustained Horde owner, timer, cadence and pause-recovery soak passed in Chromium.");
  await context.close();
}finally{await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()))}
