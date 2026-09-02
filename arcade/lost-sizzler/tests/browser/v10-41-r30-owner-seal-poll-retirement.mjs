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

  const readiness=await page.evaluate(()=>{
    const seal=window.CCGLostSizzlerV141R30OwnerSeal;
    const installed=Boolean(seal.installAssignmentGate?.());
    seal.seal?.("poll-retirement regression readiness");
    seal.retirePollIfGated?.();
    return{
      installed,
      assignmentGate:Boolean(seal.state?.assignmentGate),
      assignmentGateUnsupported:Boolean(seal.state?.assignmentGateUnsupported),
      timer:Number(seal.state?.timer||0),
      goldenLocked:Boolean(window.CCGLostSizzlerV141R30?.state?.goldenLocked)
    }
  });
  assert.equal(readiness.goldenLocked,true,"R30 poll-retirement regression requires the proven locked golden movement owner");
  assert.equal(readiness.assignmentGateUnsupported,false,`R30 synchronous assignment gate must remain supported: ${JSON.stringify(readiness)}`);
  assert.equal(readiness.installed,true,`R30 synchronous assignment gate must install once the golden owner is ready: ${JSON.stringify(readiness)}`);
  assert.equal(readiness.assignmentGate,true,`R30 synchronous assignment gate must be active before poll-retirement assertions: ${JSON.stringify(readiness)}`);
  await page.waitForTimeout(120);

  const result=await page.evaluate(()=>{
    const guard=window.CCGLostSizzlerV141R30,seal=window.CCGLostSizzlerV141R30OwnerSeal;
    const golden=guard.state.goldenMove,beforeBlocked=Number(seal.state.blockedWrites||0),beforeRepairs=Number(guard.state.ownershipRepairs||0);
    const dead=function r30PollRetirementDeadOwner(){return false};dead.__ccgOriginal=window.movePlayer;
    window.movePlayer=dead;
    return{
      assignmentGate:Boolean(seal.state.assignmentGate),
      sealTimer:Number(seal.state.timer||0),
      fallbackPollStarts:Number(seal.state.pollStarts||0),
      pollRetirements:Number(seal.state.pollRetirements||0),
      globalGuardTimer:Number(guard.state.timer||0),
      blockedDelta:Number(seal.state.blockedWrites||0)-beforeBlocked,
      repairDelta:Number(guard.state.ownershipRepairs||0)-beforeRepairs,
      moveStillGolden:window.movePlayer===golden,
      goldenStable:guard.state.goldenMove===golden
    }
  });

  assert.equal(result.assignmentGate,true,"R30 owner seal must retain its synchronous movePlayer assignment gate");
  assert.equal(result.sealTimer,0,"R30 16ms owner-seal poll must retire after the assignment gate is active");
  assert.ok(result.globalGuardTimer>0,"the broader R30 40ms recovery guard must remain active during this consolidation step");
  assert.ok(result.blockedDelta>=1,"an illegal normal-mode movePlayer assignment must still be blocked synchronously after poll retirement");
  assert.ok(result.repairDelta>=1,"blocked assignment must remain visible in R30 ownership diagnostics");
  assert.equal(result.moveStillGolden,true,"poll retirement must not permit a dead movement owner to replace the locked golden owner");
  assert.equal(result.goldenStable,true,"poll retirement must not mutate the locked golden owner identity");
  assert.deepEqual(errors,[],`R30 owner-seal poll-retirement regression must not produce page errors: ${errors.join("\n")}`);
  console.log(`R30 owner-seal 16ms poll retired safely: blocked=${result.blockedDelta}, globalGuardTimer=${result.globalGuardTimer}.`);
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));
}
