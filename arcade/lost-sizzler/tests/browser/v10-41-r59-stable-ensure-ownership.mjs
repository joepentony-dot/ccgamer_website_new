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
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes)&&Boolean(window.CCGLostSizzlerV141R29));

  await page.evaluate(()=>{
    run=PGR.makeRun({difficulty:"ARCADE",seed:"R59-STABLE-ENSURE"});
    playMode="solo";startWorld(PGR.floorSeed(run),false,false);mode="playing";
    document.body.dataset.runActive="true";document.body.dataset.specialMode="";document.body.dataset.modeController="dungeon-solo";
    UI.menu?.classList.add("hidden");
    host.enemies=[];host.generators=[];host.traps=[];host.chests=[];host.weightBridge=null;if(host.stalker)host.stalker.awake=false;
    try{hazards.length=0}catch(_){}
    p1.hitStunMs=0;move1=0;input.clear();
  });
  await page.waitForTimeout(220);

  await page.evaluate(()=>{
    const r29=window.CCGLostSizzlerV141R29;
    window.__r59StableEnsureProbe={stableWrites:0,stableChanges:0,events:[]};
    let stableValue=r29.stableLoop;
    Object.defineProperty(r29,"stableLoop",{
      configurable:true,
      get(){return stableValue},
      set(value){
        window.__r59StableEnsureProbe.stableWrites++;
        if(value!==stableValue){
          window.__r59StableEnsureProbe.stableChanges++;
          window.__r59StableEnsureProbe.events.push({at:Math.round(performance.now()),name:String(value?.name||"")});
        }
        stableValue=value;
      }
    });
  });

  const before=await page.evaluate(()=>({
    reassertions:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes.state.clockOwnerReassertions||0),
    r58Reassertions:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes.state.r58Reassertions||0),
    r58Ticks:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes.state.r58Ticks||0),
    loopR59:Boolean(window.loop?.__ccgV141R59PauseClock),
    stableR59:Boolean(window.CCGLostSizzlerV141R29?.stableLoop?.__ccgV141R59PauseClock),
    captureR59:Boolean(window.captureFloorEntryCheckpoint?.__ccgV141R59SoloAutosave)
  }));
  await page.waitForTimeout(1040);
  const stable=await page.evaluate(before=>({
    before,
    probe:window.__r59StableEnsureProbe,
    reassertions:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes.state.clockOwnerReassertions||0)-before.reassertions,
    r58Reassertions:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes.state.r58Reassertions||0)-before.r58Reassertions,
    r58Ticks:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes.state.r58Ticks||0)-before.r58Ticks,
    timer:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes.state.timer||0),
    loopR59:Boolean(window.loop?.__ccgV141R59PauseClock),
    stableR59:Boolean(window.CCGLostSizzlerV141R29?.stableLoop?.__ccgV141R59PauseClock),
    captureR59:Boolean(window.captureFloorEntryCheckpoint?.__ccgV141R59SoloAutosave)
  }),before);

  assert.equal(before.loopR59,true,"R59 must own the global RAF loop before stable Solo sampling");
  assert.equal(before.stableR59,true,"R59 must own the exported R29 stable loop before stable Solo sampling");
  assert.equal(before.captureR59,true,"R59 must own the synchronous floor checkpoint before stable Solo sampling");
  assert.equal(stable.probe.stableWrites,0,`stable Solo must not repeatedly reassign R29.stableLoop from the 40 ms ensure path: ${JSON.stringify(stable)}`);
  assert.equal(stable.probe.stableChanges,0,`stable Solo must not churn the R29 stable-loop owner identity: ${JSON.stringify(stable)}`);
  assert.equal(stable.reassertions,0,`stable Solo must not count clock-owner reassertions while owners remain installed: ${JSON.stringify(stable)}`);
  assert.equal(stable.r58Reassertions,0,"R59 must not reassert Spy rules while Solo is stable");
  assert.equal(stable.r58Ticks,0,"R59 must not tick Spy live state while Solo is stable");
  assert.notEqual(stable.timer,0,"R59 retains its established 40 ms ensure timer as a compatibility monitor");
  assert.equal(stable.loopR59,true,"R59 must retain global loop ownership after stable sampling");
  assert.equal(stable.stableR59,true,"R59 must retain exported R29 loop ownership after stable sampling");
  assert.equal(stable.captureR59,true,"R59 must retain floor checkpoint ownership after stable sampling");
  assert.deepEqual(errors,[],`R59 stable ensure ownership regression produced page errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler R59 stable Solo ensure ownership passed without repeated clock-owner writes.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
