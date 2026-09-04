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
const browser=await chromium.launch({headless:true,executablePath:process.env.CHROMIUM_PATH,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R30?.state?.goldenLocked)&&Boolean(window.CCGLostSizzlerV141R29?.install?.__ccgV141R30Cooperative));

  await page.evaluate(()=>{
    run=PGR.makeRun({difficulty:"ARCADE",seed:"R30-R29-BRIDGE-RETIREMENT"});
    playMode="solo";startWorld(PGR.floorSeed(run),false,false);mode="playing";
    document.body.dataset.runActive="true";document.body.dataset.specialMode="";document.body.dataset.modeController="dungeon-solo";
    UI.menu?.classList.add("hidden");
    host.enemies=[];host.generators=[];host.traps=[];host.chests=[];host.weightBridge=null;if(host.stalker)host.stalker.awake=false;
    try{hazards.length=0}catch(_){}
    p1.hitStunMs=0;move1=0;input.clear();
  });
  await page.waitForTimeout(220);

  await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R29,original=api.install;
    window.__r30R29BridgeProbe={calls:0,returns:0};
    api.install=function r29CooperativeBridgeProbe(){
      window.__r30R29BridgeProbe.calls++;
      const result=original.apply(this,arguments);
      window.__r30R29BridgeProbe.returns++;
      return result;
    };
    api.install.__ccgV141R30Cooperative=true;
    api.install.__ccgOriginal=original;
  });
  await page.waitForTimeout(1040);
  const stable=await page.evaluate(()=>({
    probe:window.__r30R29BridgeProbe,
    r30:{
      timer:Number(window.CCGLostSizzlerV141R30?.state?.timer||0),
      r29TimerStopped:Boolean(window.CCGLostSizzlerV141R30?.state?.r29TimerStopped),
      r29InstallCooperative:Boolean(window.CCGLostSizzlerV141R30?.state?.r29InstallCooperative),
      ownershipRepairs:Number(window.CCGLostSizzlerV141R30?.state?.ownershipRepairs||0),
      forcedRestores:Number(window.CCGLostSizzlerV141R30?.state?.forcedRestores||0),
      inputReassertions:Number(window.CCGLostSizzlerV141R30?.state?.inputReassertions||0),
      watchdogRecoveries:Number(window.CCGLostSizzlerV141R30?.state?.watchdogRecoveries||0)
    },
    r29Timer:Number(window.CCGLostSizzlerV141R29?.state?.timer||0),
    cooperative:Boolean(window.CCGLostSizzlerV141R29?.install?.__ccgV141R30Cooperative),
    golden:Boolean(window.CCGLostSizzlerV141R30?.state?.goldenLocked)
  }));

  assert.equal(stable.r30.timer>0,true,"R30 global guard keeps its established movement watchdog monitor");
  assert.equal(stable.r29Timer,0,"R30 must keep the original R29 installer timer stopped");
  assert.equal(stable.cooperative,true,"R29 install must remain marked cooperative");
  assert.equal(stable.r30.r29InstallCooperative,true,"R30 must retain cooperative-install state");
  assert.equal(stable.probe.calls,0,`stable Solo must not re-enter the cooperative R29 installer every 40 ms: ${JSON.stringify(stable)}`);
  assert.equal(stable.probe.returns,0,`stable Solo must not complete redundant R29 installer calls: ${JSON.stringify(stable)}`);
  assert.equal(stable.r30.ownershipRepairs,0,"stable Solo must not need R30 ownership repairs during R29 bridge retirement");
  assert.equal(stable.r30.forcedRestores,0,"stable Solo must not force ownership restores during R29 bridge retirement");
  assert.equal(stable.r30.inputReassertions,0,"stable Solo must not reassert input while no keys are held");
  assert.equal(stable.r30.watchdogRecoveries,0,"stable Solo must not invoke movement watchdog recovery while idle");
  assert.equal(stable.golden,true,"R30 must preserve its locked golden movement owner");
  assert.deepEqual(errors,[],`R30 R29 bridge retirement regression produced page errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler R30 retained R29 bridge retirement passed: stable Solo keeps cooperative ownership without re-running R29 install.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
