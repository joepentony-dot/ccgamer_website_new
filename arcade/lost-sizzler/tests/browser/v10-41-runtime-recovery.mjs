import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={
  ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".mjs":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8", ".json":"application/json; charset=utf-8", ".svg":"image/svg+xml", ".webp":"image/webp",
  ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".ogg":"audio/ogg", ".mp3":"audio/mpeg", ".wav":"audio/wav"
};
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
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();page.setDefaultTimeout(30000);
  const pageErrors=[],crashes=[];page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));page.on("crash",()=>crashes.push("Chromium page crashed"));
  await page.goto(`${origin}/arcade/lost-sizzler/?runtime-recovery=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true");
  await page.waitForFunction(()=>window.CCGLostSizzlerV141BrowserStabilityGameplay?.state?.frameGuard===true);
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R29?.state&&window.CCGLostSizzlerV141R29LoopFinalizer&&window.loop?.__ccgV141R29Stable===true&&window.loop?.__ccgV141CrashContained===true);

  const baseline=await page.evaluate(()=>({
    guarded:Boolean(window.loop?.__ccgV141R29Stable&&window.loop?.__ccgV141CrashContained),faults:window.CCGLostSizzlerV141R29.state.frameFaults,
    finalizer:window.CCGLostSizzlerV141R29LoopFinalizer.state.reassertions
  }));
  assert.equal(baseline.guarded,true,"the live browser must be running the final r29 crash-contained RAF callback");

  const injected=await page.evaluate(async()=>{
    const guard=window.CCGLostSizzlerV141R29,originalUpdate=window.update,originalRender=window.render;
    let frames=0,thrown=false;
    window.render=function(){frames++;return originalRender.apply(this,arguments)};
    window.update=function(){
      if(!thrown){thrown=true;window.update=originalUpdate;throw new Error("CCG_SYNTHETIC_SINGLE_FRAME_FAULT")}
      return originalUpdate.apply(this,arguments)
    };
    await new Promise(resolve=>setTimeout(resolve,550));
    window.render=originalRender;window.update=originalUpdate;
    return{frames,thrown,faults:guard.state.frameFaults,updateFaults:guard.state.updateFaults,lastFaultMessage:guard.state.lastFaultMessage,finalLoop:Boolean(window.loop?.__ccgV141R29Stable)};
  });
  assert.equal(injected.thrown,true,"the synthetic update fault must actually execute");
  assert.ok(injected.updateFaults>=1,`the r29 frame guard must record the contained update fault: ${JSON.stringify(injected)}`);
  assert.match(injected.lastFaultMessage,/CCG_SYNTHETIC_SINGLE_FRAME_FAULT/,"the r29 guard must retain the most recent contained fault for diagnosis");
  assert.ok(injected.frames>=4,`rendering must continue after an update exception instead of freezing the browser/game: ${JSON.stringify(injected)}`);
  assert.equal(injected.finalLoop,true,"the r29 RAF owner must remain installed after a contained frame fault");

  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true");
  await page.waitForTimeout(350);
  await page.keyboard.press("KeyP");
  await page.waitForFunction(()=>typeof mode!=="undefined"&&mode==="paused");
  assert.equal(await page.locator("#pause").evaluate(node=>!node.classList.contains("hidden")),true,"Solo pause overlay must open");
  await page.locator("#resume-btn").click();
  await page.waitForFunction(()=>typeof mode!=="undefined"&&mode==="playing");
  await page.waitForTimeout(500);
  const resumed=await page.evaluate(()=>({
    mode,runActive:document.body.dataset.runActive,pausedHidden:UI.pause.classList.contains("hidden"),faults:window.CCGLostSizzlerV141R29.state.frameFaults,
    finalLoop:Boolean(window.loop?.__ccgV141R29Stable),canvas:{w:game.width,h:game.height},player:p1?{x:p1.x,y:p1.y,rx:p1.rx,ry:p1.ry}:null
  }));
  assert.equal(resumed.mode,"playing","Continue must restore active gameplay after pause");
  assert.equal(resumed.runActive,"true","pause/resume must not destroy the run");
  assert.equal(resumed.pausedHidden,true,"pause UI must be removed after resume");
  assert.equal(resumed.finalLoop,true,"pause/resume must retain final r29 RAF ownership");
  assert.ok(resumed.canvas.w>=640&&resumed.canvas.h>=360,"pause recovery must leave a usable canvas backing store");
  assert.ok(Number.isFinite(resumed.player?.x)&&Number.isFinite(resumed.player?.rx),`pause recovery must retain finite player coordinates: ${JSON.stringify(resumed.player)}`);

  const coordinateRecovery=await page.evaluate(()=>{
    const before={x:p1.x,y:p1.y};
    p1.rx=before.x;p1.ry=before.y;p1.x=Number.NaN;p1.y=Number.POSITIVE_INFINITY;
    window.dispatchEvent(new Event("focus"));
    return{before,after:{x:p1.x,y:p1.y,rx:p1.rx,ry:p1.ry},recoveries:window.CCGLostSizzlerV141BrowserStabilityGameplay.state.focusRecoveries};
  });
  assert.deepEqual(coordinateRecovery.after,{x:coordinateRecovery.before.x,y:coordinateRecovery.before.y,rx:coordinateRecovery.before.x,ry:coordinateRecovery.before.y},`focus recovery must restore invalid live coordinates from the last finite render position: ${JSON.stringify(coordinateRecovery)}`);
  assert.ok(coordinateRecovery.recoveries>=1,"focus recovery must record the coordinate-repair pass");

  await page.waitForTimeout(250);
  assert.deepEqual(crashes,[],`Chromium must not crash during fault containment, pause/resume or coordinate recovery: ${crashes.join("\n")}`);
  assert.deepEqual(pageErrors,[],`fault containment, pause/resume and coordinate recovery must produce no uncaught page errors: ${pageErrors.join("\n")}`);
  console.log("Lost Sizzler V10.41 r29 final-loop fault containment, pause/resume and invalid-coordinate recovery checks passed.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}

// This file is already called by the canonical Lost Sizzler Arcade Validation
// workflow. Keep the structural browser regressions chained here so mode
// isolation cannot exist only as dormant tests under tests/browser/. The Spy
// movement suite is scheduled explicitly by Arcade Validation and by Load
// Safety's browser glob, so it must not be run twice through this chain.
for(const regression of [
  "./v10-41-solo-combat-load-movement.mjs",
  "./v10-41-mode-controller-isolation.mjs",
  "./v10-41-horde-controller-update-ownership.mjs"
])await import(regression);
