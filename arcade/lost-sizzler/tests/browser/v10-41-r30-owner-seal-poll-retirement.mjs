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
    const guard=window.CCGLostSizzlerV141R30,seal=window.CCGLostSizzlerV141R30OwnerSeal;
    seal.seal?.("poll-retirement regression readiness");
    seal.retirePollIfCovered?.();
    return{
      assignmentGate:Boolean(seal.state?.assignmentGate),
      assignmentGateUnsupported:Boolean(seal.state?.assignmentGateUnsupported),
      retirementCoverage:String(seal.retirementCoverage?.()||""),
      retirementReason:String(seal.state?.pollRetirementReason||""),
      sealTimer:Number(seal.state?.timer||0),
      globalGuardTimer:Number(guard.state?.timer||0),
      goldenLocked:Boolean(guard.state?.goldenLocked)
    }
  });
  assert.equal(readiness.goldenLocked,true,"R30 poll-retirement regression requires the proven locked golden movement owner");
  assert.ok(readiness.globalGuardTimer>0,"R30 40ms global recovery guard must be active before the 16ms seal poll retires");
  assert.ok(["assignment-gate","r30-global-guard"].includes(readiness.retirementCoverage),`R30 seal poll needs a live replacement recovery path: ${JSON.stringify(readiness)}`);
  assert.equal(readiness.sealTimer,0,`R30 16ms owner-seal poll must retire when replacement coverage exists: ${JSON.stringify(readiness)}`);

  const before=await page.evaluate(()=>({
    golden:window.CCGLostSizzlerV141R30.state.goldenMove,
    blocked:Number(window.CCGLostSizzlerV141R30OwnerSeal.state.blockedWrites||0),
    repairs:Number(window.CCGLostSizzlerV141R30.state.ownershipRepairs||0)
  }));
  await page.evaluate(()=>{
    const dead=function r30PollRetirementDeadOwner(){return false};dead.__ccgOriginal=window.movePlayer;window.movePlayer=dead;
  });
  await page.waitForFunction(golden=>window.movePlayer===golden,before.golden,{timeout:500});

  const result=await page.evaluate(({beforeBlocked,beforeRepairs})=>{
    const guard=window.CCGLostSizzlerV141R30,seal=window.CCGLostSizzlerV141R30OwnerSeal;
    return{
      assignmentGate:Boolean(seal.state.assignmentGate),
      assignmentGateUnsupported:Boolean(seal.state.assignmentGateUnsupported),
      sealTimer:Number(seal.state.timer||0),
      retirementCoverage:String(seal.retirementCoverage?.()||""),
      globalGuardTimer:Number(guard.state.timer||0),
      blockedDelta:Number(seal.state.blockedWrites||0)-beforeBlocked,
      repairDelta:Number(guard.state.ownershipRepairs||0)-beforeRepairs,
      moveStillGolden:window.movePlayer===guard.state.goldenMove
    }
  },{beforeBlocked:before.blocked,beforeRepairs:before.repairs});

  assert.equal(result.sealTimer,0,"R30 16ms owner-seal poll must remain retired after a hostile movement-owner write");
  assert.ok(result.globalGuardTimer>0,"the broader R30 40ms recovery guard must remain active during this consolidation step");
  assert.equal(result.moveStillGolden,true,"the surviving R30 recovery path must restore the locked golden movement owner within 500ms");
  assert.ok(result.repairDelta>=1||result.blockedDelta>=1,`the hostile assignment must be visible to either the synchronous gate or the R30 global recovery diagnostics: ${JSON.stringify(result)}`);
  assert.deepEqual(errors,[],`R30 owner-seal poll-retirement regression must not produce page errors: ${errors.join("\n")}`);
  console.log(`R30 owner-seal 16ms poll retired with ${result.retirementCoverage}; assignmentGate=${result.assignmentGate}, recoveryDiagnostics=${result.repairDelta+result.blockedDelta}.`);
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));
}
