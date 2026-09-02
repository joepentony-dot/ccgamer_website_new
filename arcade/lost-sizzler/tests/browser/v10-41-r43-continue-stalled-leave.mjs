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
  const page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R43SoloSave),null,{timeout:90000});

  await page.evaluate(()=>window.CCGLostSizzlerV141R43SoloSave.clearSoloSave());
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(run)&&Boolean(p1)&&Boolean(world)&&Boolean(host),null,{timeout:20000});
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R43SoloSave?.readEnvelope?.()?.summary?.floor===1,null,{timeout:10000});

  const soloLivenessAfterStart=await page.evaluate(()=>{
    const watchdog=window.CCGLostSizzlerLoadWatchdog?.state;
    return{
      recoveryTimerActive:Boolean(watchdog?.soloRecoveryTimer),
      observerActive:Boolean(watchdog?.soloLivenessObserver),
      recoveries:Number(watchdog?.soloRecoveries||0),
      intentSerial:Number(watchdog?.soloIntentSerial||0)
    };
  });
  assert.equal(soloLivenessAfterStart.recoveryTimerActive,false,"a successful Solo launch must retire its watchdog liveness timer before Save & Quit can return to the menu");
  assert.equal(soloLivenessAfterStart.observerActive,false,"a successful Solo launch must retire its watchdog liveness observer");

  const beforeQuit=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R43SoloSave,envelope=api.readEnvelope(),entry=api.state?.entryCheckpoint;
    return{
      liveSeed:String(run?.seed||""),entrySeed:String(entry?.run?.seed||""),envelopeSeed:String(envelope?.checkpoint?.run?.seed||""),
      envelopeReason:String(envelope?.reason||""),score:Number(envelope?.checkpoint?.score||0),health:Number(envelope?.checkpoint?.player?.health||0),mana:Number(envelope?.checkpoint?.player?.mana||0),
      x:Number(envelope?.checkpoint?.player?.x||0),y:Number(envelope?.checkpoint?.player?.y||0),resumes:Number(api.state?.resumes||0),saves:Number(api.state?.saves||0)
    };
  });

  await page.evaluate(()=>openPauseMenu());
  await page.waitForSelector("#pause:not(.hidden)");
  await page.click("#save-quit-solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="false"&&mode==="menu"&&!document.getElementById("menu").classList.contains("hidden"),null,{timeout:10000});
  await page.waitForFunction(()=>!document.getElementById("continue-save-btn").classList.contains("hidden"),null,{timeout:10000});

  const afterQuit=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R43SoloSave,envelope=api.readEnvelope(),entry=api.state?.entryCheckpoint;
    return{
      liveSeed:String(run?.seed||""),entrySeed:String(entry?.run?.seed||""),envelopeSeed:String(envelope?.checkpoint?.run?.seed||""),
      envelopeReason:String(envelope?.reason||""),score:Number(envelope?.checkpoint?.score||0),health:Number(envelope?.checkpoint?.player?.health||0),mana:Number(envelope?.checkpoint?.player?.mana||0),
      x:Number(envelope?.checkpoint?.player?.x||0),y:Number(envelope?.checkpoint?.player?.y||0),resumes:Number(api.state?.resumes||0),saves:Number(api.state?.saves||0),
      mode:String(mode||""),playMode:String(playMode||""),runActive:String(document.body.dataset.runActive||"")
    };
  });

  // Model the production defect precisely: leave() must still execute all of its
  // synchronous local cleanup, but its remote channel cleanup never settles.
  // Record the caller stack as well so a failure identifies which lifecycle
  // owner reached the stale channel before the v2 Continue transaction.
  await page.evaluate(()=>{
    window.__r43StalledUntrackCalls=0;
    window.__r43UnexpectedRemoveCalls=0;
    window.__r43LeaveCalls=[];
    window.__r43OriginalLeave=net.leave;
    net.leave=function r43LeaveCallerProbe(...args){
      window.__r43LeaveCalls.push(String(new Error("LS-SOLO-008 net.leave caller").stack||""));
      return window.__r43OriginalLeave.apply(this,args)
    };
    net.channel={untrack(){window.__r43StalledUntrackCalls++;return new Promise(()=>{})}};
    net.client={removeChannel(){window.__r43UnexpectedRemoveCalls++;return Promise.resolve()}};
  });

  const beforeContinue=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R43SoloSave,envelope=api.readEnvelope(),watchdog=window.CCGLostSizzlerLoadWatchdog?.state;
    return{
      envelopeSeed:String(envelope?.checkpoint?.run?.seed||""),envelopeReason:String(envelope?.reason||""),
      resumes:Number(api.state?.resumes||0),mode:String(mode||""),playMode:String(playMode||""),connected:Boolean(net?.connected),
      transport:String(net?.transport||""),channelPresent:Boolean(net?.channel),clientPresent:Boolean(net?.client),
      stalledUntrackCalls:Number(window.__r43StalledUntrackCalls||0),unexpectedRemoveCalls:Number(window.__r43UnexpectedRemoveCalls||0),leaveCalls:Number(window.__r43LeaveCalls?.length||0),
      soloRecoveryTimerActive:Boolean(watchdog?.soloRecoveryTimer),soloLivenessObserverActive:Boolean(watchdog?.soloLivenessObserver),
      soloRecoveries:Number(watchdog?.soloRecoveries||0)
    };
  });
  assert.equal(beforeContinue.channelPresent,true,"LS-SOLO-008 regression requires a stale remote channel before Continue");
  assert.equal(beforeContinue.clientPresent,true,"LS-SOLO-008 regression requires a stale remote client before Continue");
  assert.equal(beforeContinue.soloRecoveryTimerActive,false,"Continue must not inherit a stale Play Solo liveness timer");
  assert.equal(beforeContinue.soloLivenessObserverActive,false,"Continue must not inherit a stale Play Solo liveness observer");

  await page.click("#continue-save-btn");
  let resumed=false,remoteCleanup={stalledUntrackCalls:0,unexpectedRemoveCalls:0,leaveCalls:[]},resumeFailure=null;
  try{
    try{
      await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&run?.floor===1&&Boolean(world)&&Boolean(host)&&Boolean(p1),null,{timeout:3000});
      resumed=true;
    }catch(error){
      resumeFailure=await page.evaluate(()=>{
        const api=window.CCGLostSizzlerV141R43SoloSave,envelope=api?.readEnvelope?.(),watchdog=window.CCGLostSizzlerLoadWatchdog?.state;
        return{
          resumeInProgress:Boolean(api?.state?.resumeInProgress),resumes:Number(api?.state?.resumes||0),lastError:String(api?.state?.lastError||""),
          mode:String(mode||""),playMode:String(playMode||""),runActive:String(document.body?.dataset?.runActive||""),
          runSeed:String(run?.seed||""),runFloor:Number(run?.floor||0),envelopeSeed:String(envelope?.checkpoint?.run?.seed||""),envelopeReason:String(envelope?.reason||""),
          p1Present:Boolean(p1),worldPresent:Boolean(world),hostPresent:Boolean(host),menuHidden:Boolean(document.getElementById("menu")?.classList.contains("hidden")),
          connected:Boolean(net?.connected),transport:String(net?.transport||""),channelPresent:Boolean(net?.channel),clientPresent:Boolean(net?.client),memberCount:Number(net?.members?.size||0),
          stalledUntrackCalls:Number(window.__r43StalledUntrackCalls||0),unexpectedRemoveCalls:Number(window.__r43UnexpectedRemoveCalls||0),
          leaveCalls:(window.__r43LeaveCalls||[]).map(stack=>String(stack).slice(0,1800)),
          soloRecoveryTimerActive:Boolean(watchdog?.soloRecoveryTimer),soloLivenessObserverActive:Boolean(watchdog?.soloLivenessObserver),soloRecoveries:Number(watchdog?.soloRecoveries||0)
        };
      });
      resumeFailure.waitError=String(error?.message||error);
    }
    remoteCleanup=await page.evaluate(()=>({
      stalledUntrackCalls:Number(window.__r43StalledUntrackCalls||0),
      unexpectedRemoveCalls:Number(window.__r43UnexpectedRemoveCalls||0),
      leaveCalls:(window.__r43LeaveCalls||[]).map(stack=>String(stack).slice(0,1800))
    }));
  }finally{
    await page.evaluate(()=>{
      if(window.__r43OriginalLeave)net.leave=window.__r43OriginalLeave;
      delete window.__r43OriginalLeave;delete window.__r43LeaveCalls;delete window.__r43StalledUntrackCalls;delete window.__r43UnexpectedRemoveCalls
    });
  }

  assert.equal(resumed,true,`LS-SOLO-008: Continue must not wait for stalled remote channel cleanup before restoring a local Solo save; diagnostic=${JSON.stringify({beforeContinue,resumeFailure,remoteCleanup})}`);
  const restored=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R43SoloSave,envelope=api.readEnvelope(),entry=api.state?.entryCheckpoint,watchdog=window.CCGLostSizzlerLoadWatchdog?.state;
    return{
      seed:String(run?.seed||""),entrySeed:String(entry?.run?.seed||""),envelopeSeed:String(envelope?.checkpoint?.run?.seed||""),envelopeReason:String(envelope?.reason||""),
      score:Number(score||0),health:Number(p1?.health||0),mana:Number(p1?.mana||0),x:Number(p1?.x||0),y:Number(p1?.y||0),
      playMode:String(playMode||""),connected:Boolean(net?.connected),transport:String(net?.transport||""),resumes:Number(api.state?.resumes||0),
      mode:String(mode||""),runActive:String(document.body.dataset.runActive||""),channelPresent:Boolean(net?.channel),clientPresent:Boolean(net?.client),
      memberCount:Number(net?.members?.size||0),soloRecoveryTimerActive:Boolean(watchdog?.soloRecoveryTimer),
      soloLivenessObserverActive:Boolean(watchdog?.soloLivenessObserver),soloRecoveries:Number(watchdog?.soloRecoveries||0)
    };
  });

  const diagnostic={soloLivenessAfterStart,beforeQuit,afterQuit,beforeContinue,restored,remoteCleanup};
  assert.equal(afterQuit.envelopeSeed,beforeQuit.envelopeSeed,`Save & Quit must preserve the captured floor-entry seed: ${JSON.stringify(diagnostic)}`);
  assert.equal(beforeContinue.envelopeSeed,afterQuit.envelopeSeed,`the saved envelope must remain stable before Continue: ${JSON.stringify(diagnostic)}`);
  assert.ok(remoteCleanup.stalledUntrackCalls>=1,`the regression must prove that real leave() reached a remote untrack promise that remained stalled: ${JSON.stringify(diagnostic)}`);
  assert.equal(remoteCleanup.unexpectedRemoveCalls,0,`removeChannel must remain unreachable while the preceding untrack promise is stalled: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.seed,afterQuit.envelopeSeed,`stalled-cleanup recovery must restore the Save & Quit envelope seed: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.entrySeed,afterQuit.envelopeSeed,`r43 entry checkpoint must match the restored Save & Quit seed: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.envelopeSeed,afterQuit.envelopeSeed,`Continue must not replace the saved envelope while restoring: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.score,afterQuit.score,`stalled-cleanup recovery must restore floor-entry score: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.health,afterQuit.health,`stalled-cleanup recovery must restore floor-entry health: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.mana,afterQuit.mana,`stalled-cleanup recovery must restore floor-entry ammunition: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.x,afterQuit.x,`stalled-cleanup recovery must restore entry X: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.y,afterQuit.y,`stalled-cleanup recovery must restore entry Y: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.playMode,"solo",`stalled-cleanup recovery must restore Solo ownership: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.connected,false,`stalled-cleanup recovery must leave the local runtime disconnected: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.transport,"solo",`stalled-cleanup recovery must leave the local transport in Solo mode: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.channelPresent,false,`leave() synchronous cleanup must detach the stale channel before its remote await stalls: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.clientPresent,false,`leave() synchronous cleanup must detach the stale client before its remote await stalls: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.memberCount,1,`net.setSolo() must rebuild exactly one local member while remote cleanup remains stalled: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.soloRecoveryTimerActive,false,`restored Continue must not arm a Play Solo liveness timer: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.soloLivenessObserverActive,false,`restored Continue must not arm a Play Solo liveness observer: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.soloRecoveries,beforeContinue.soloRecoveries,`Continue must not trigger a stale Play Solo liveness recovery: ${JSON.stringify(diagnostic)}`);
  assert.ok(restored.resumes>=1,`stalled-cleanup recovery must advance the r43 resume diagnostic: ${JSON.stringify(diagnostic)}`);
  assert.deepEqual(errors,[],`LS-SOLO-008 stalled-cleanup regression must not produce page errors: ${errors.join("\n")} diagnostic=${JSON.stringify(diagnostic)}`);
  console.log(`LS-SOLO-008 stalled remote-cleanup diagnostic passed: ${JSON.stringify(diagnostic)}`);
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));
}
