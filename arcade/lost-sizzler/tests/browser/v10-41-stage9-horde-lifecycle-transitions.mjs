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
const server=http.createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)})}catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(window.CCGLostSizzlerSpecialModes)&&Boolean(window.CCGLostSizzlerV141R60HordeCombatIntegrity?.state?.installed)&&Boolean(window.CCGLostSizzlerV141HordeFramePerformance?.state)&&Boolean(window.CCGLostSizzlerV141R60HordeOwnerComposition?.state?.retired)&&Boolean(document.getElementById("horde-solo-btn"))&&Boolean(document.getElementById("pause-quit-btn")),null,{timeout:90000});

  const snapshot=()=>page.evaluate(()=>{
    const runtime=window.CCGLostSizzlerModeRuntime,perf=window.CCGLostSizzlerV141HordeFramePerformance,r60=window.CCGLostSizzlerV141R60HordeCombatIntegrity,composition=window.CCGLostSizzlerV141R60HordeOwnerComposition,live=window.CCGLostSizzlerV138;
    const owner=r60?.state?.liveOwner;
    const chainCount=(fn,target)=>{if(typeof fn!=="function"||typeof target!=="function")return 0;const seen=new Set();let current=fn,count=0,depth=0;while(typeof current==="function"&&!seen.has(current)&&depth++<48){if(current===target)count++;seen.add(current);current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null}return count};
    const chainDepth=fn=>{const seen=new Set();let current=fn,depth=0;while(typeof current==="function"&&!seen.has(current)&&depth<48){seen.add(current);depth++;current=typeof current.__ccgOriginal==="function"?current.__ccgOriginal:null}return depth};
    return{
      mode:String(typeof mode!=="undefined"?mode:""),
      specialMode:String(document.body.dataset.specialMode||""),
      hordeSolo:String(document.body.dataset.hordeSolo||""),
      activeId:String(runtime?.snapshot?.().activeId||""),
      statusTimer:Number(perf?.state?.statusTimer||0),statusStarts:Number(perf?.state?.statusStarts||0),statusStops:Number(perf?.state?.statusStops||0),
      r60LiveTimer:Number(perf?.state?.r60LiveTimer||0),frameOwnerInstalls:Number(perf?.state?.r60HordeLiveOwnerInstalls||0),frameOwnerReassertions:Number(perf?.state?.r60HordeLiveOwnerReassertions||0),frameOwnerErrors:Number(perf?.state?.r60HordeLiveOwnerErrors||0),
      liveOwnerInstalls:Number(r60?.state?.liveOwnerInstalls||0),liveOwnerReassertions:Number(r60?.state?.liveOwnerReassertions||0),liveOwnerMonitorStops:Number(r60?.state?.liveOwnerMonitorStops||0),r60LastError:String(r60?.state?.lastError||""),
      ownerCount:chainCount(live?.updateHordeLive,owner),ownerDepth:chainDepth(live?.updateHordeLive),
      compositionRetired:Boolean(composition?.state?.retired),compositionTimer:Number(composition?.state?.timer||0)
    }
  });

  const waitForHorde=async()=>{
    await page.waitForFunction(()=>mode==="playing"&&document.body.dataset.specialMode==="horde-survivor"&&document.body.dataset.hordeSolo==="true"&&window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId==="horde-solo"&&Number(window.CCGLostSizzlerV141HordeFramePerformance?.state?.statusTimer||0)>0,null,{timeout:30000});
    await page.waitForTimeout(240);
    return snapshot()
  };
  const assertOwnerStable=(state,baseline,label)=>{
    assert.equal(state.ownerCount,1,`${label} must retain exactly one authoritative R60 Horde live owner in ancestry`);
    assert.equal(state.liveOwnerInstalls,baseline.liveOwnerInstalls,`${label} must not install another R60 Horde live owner`);
    assert.equal(state.liveOwnerReassertions,baseline.liveOwnerReassertions,`${label} must not reassert the R60 Horde live owner`);
    assert.equal(state.frameOwnerInstalls,baseline.frameOwnerInstalls,`${label} must not install another Horde frame-performance live owner`);
    assert.equal(state.frameOwnerReassertions,baseline.frameOwnerReassertions,`${label} must not reassert the Horde frame-performance live owner`);
    assert.equal(state.frameOwnerErrors,baseline.frameOwnerErrors,`${label} must not add Horde frame-owner errors`);
    assert.equal(state.r60LastError,baseline.r60LastError,`${label} must not add an R60 timing/combat error`);
    assert.equal(state.ownerDepth,baseline.ownerDepth,`${label} must keep Horde live-owner ancestry depth bounded`);
    assert.equal(state.compositionRetired,true,`${label} must keep the bounded owner-composition bridge retired`);
    assert.equal(state.compositionTimer,0,`${label} must not revive the owner-composition polling timer`)
  };

  await page.click("#horde-solo-btn");
  const baseline=await waitForHorde();
  assert.equal(baseline.activeId,"horde-solo","first real Horde launch must enter the Horde Solo controller");
  assert.equal(baseline.ownerCount,1,"first real Horde launch must contain exactly one authoritative R60 Horde live owner");
  assert.ok(baseline.statusTimer>0,"Horde launch must own exactly one active status timer handle");
  assert.equal(baseline.compositionRetired,true,"the owner-composition bridge must already be retired before lifecycle stress");
  assert.equal(baseline.compositionTimer,0,"the retired owner-composition bridge must have no active timer");

  let previousExit=null;
  for(let cycle=1;cycle<=3;cycle++){
    const entry=cycle===1?baseline:await (async()=>{await page.click("#horde-solo-btn");return waitForHorde()})();
    assert.equal(entry.activeId,"horde-solo",`Horde lifecycle entry ${cycle} must route to the Horde Solo controller`);
    assert.equal(entry.mode,"playing",`Horde lifecycle entry ${cycle} must be actively playing`);
    assert.equal(entry.specialMode,"horde-survivor",`Horde lifecycle entry ${cycle} must retain the Horde special mode`);
    assert.ok(entry.statusTimer>0,`Horde lifecycle entry ${cycle} must have one live status timer handle`);
    assertOwnerStable(entry,baseline,`Horde lifecycle entry ${cycle}`);
    if(previousExit){
      assert.equal(entry.statusStarts,previousExit.statusStarts+1,`Horde re-entry ${cycle} must start the status timer exactly once`);
      assert.equal(entry.statusStops,previousExit.statusStops,`Horde re-entry ${cycle} must not add a stop before the next exit`)
    }

    const entryStatusTimer=entry.statusTimer,entryStarts=entry.statusStarts,entryR60Timer=entry.r60LiveTimer;
    for(let pauseCycle=1;pauseCycle<=2;pauseCycle++){
      await page.keyboard.press("KeyP");
      await page.waitForFunction(()=>mode==="paused");await page.waitForTimeout(100);
      const paused=await snapshot();
      assert.equal(paused.activeId,"horde-solo",`Horde lifecycle ${cycle}.${pauseCycle} pause must retain the Horde Solo controller`);
      assert.equal(paused.specialMode,"horde-survivor",`Horde lifecycle ${cycle}.${pauseCycle} pause must retain Horde special-mode ownership`);
      assert.equal(paused.statusTimer,entryStatusTimer,`Horde lifecycle ${cycle}.${pauseCycle} pause must not restart the status timer`);
      assert.equal(paused.statusStarts,entryStarts,`Horde lifecycle ${cycle}.${pauseCycle} pause must not increment status timer starts`);
      assert.equal(paused.r60LiveTimer,entryR60Timer,`Horde lifecycle ${cycle}.${pauseCycle} pause must not create a competing R60 owner timer`);
      assertOwnerStable(paused,baseline,`Horde lifecycle ${cycle}.${pauseCycle} paused`);

      await page.keyboard.press("KeyP");
      await page.waitForFunction(()=>mode==="playing"&&window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId==="horde-solo");await page.waitForTimeout(140);
      const resumed=await snapshot();
      assert.equal(resumed.statusTimer,entryStatusTimer,`Horde lifecycle ${cycle}.${pauseCycle} resume must reuse the existing status timer`);
      assert.equal(resumed.statusStarts,entryStarts,`Horde lifecycle ${cycle}.${pauseCycle} resume must not restart status maintenance`);
      assert.equal(resumed.r60LiveTimer,entryR60Timer,`Horde lifecycle ${cycle}.${pauseCycle} resume must not create a competing R60 owner timer`);
      assertOwnerStable(resumed,baseline,`Horde lifecycle ${cycle}.${pauseCycle} resumed`)
    }

    await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="paused");
    await page.click("#pause-quit-btn");
    await page.waitForFunction(()=>mode==="menu"&&document.body.dataset.specialMode!=="horde-survivor"&&window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId!=="horde-solo",null,{timeout:15000});
    await page.waitForTimeout(180);
    const exited=await snapshot();
    assert.equal(exited.mode,"menu",`Horde lifecycle exit ${cycle} must return through the real main-menu path`);
    assert.notEqual(exited.specialMode,"horde-survivor",`Horde lifecycle exit ${cycle} must release Horde special-mode ownership`);
    assert.equal(exited.statusTimer,0,`Horde lifecycle exit ${cycle} must drain the Horde status timer`);
    assert.equal(exited.r60LiveTimer,0,`Horde lifecycle exit ${cycle} must drain any Horde-only R60 owner timer`);
    assert.equal(exited.statusStarts,entry.statusStarts,`Horde lifecycle exit ${cycle} must not start another status timer while leaving`);
    assert.equal(exited.statusStops,entry.statusStops+1,`Horde lifecycle exit ${cycle} must stop the status timer exactly once`);
    assertOwnerStable(exited,baseline,`Horde lifecycle exit ${cycle}`);
    previousExit=exited
  }

  assert.equal(previousExit.statusStarts-baseline.statusStarts,2,"three real Horde sessions must add exactly two status-timer starts after the baseline session");
  assert.equal(previousExit.statusStops-baseline.statusStops,3,"three real Horde exits must add exactly three matching status-timer stops");
  assert.equal(previousExit.statusTimer,0,"final menu state must retain no Horde status timer");
  assert.equal(previousExit.r60LiveTimer,0,"final menu state must retain no Horde-only R60 owner timer");
  assert.deepEqual(errors,[],`Stage 9 Horde lifecycle qualification must have no uncaught browser errors: ${errors.join("\n")}`);

  console.log("Lost Sizzler Stage 9 Horde pause/resume, quit-to-menu and repeated re-entry lifecycle qualification passed in Chromium.");
  await context.close();
}finally{await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()))}
