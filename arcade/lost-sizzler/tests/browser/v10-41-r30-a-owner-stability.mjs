// Exact-head regression: trace late movement ownership against the current main merge ref.
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
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1920,height:1080}});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R30?.state?.goldenLocked));
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R29SpyEngine));
  await page.waitForTimeout(300);

  const direction=await page.evaluate(()=>{
    run=PGR.makeRun({difficulty:"ARCADE",seed:"R30-OWNER-STABILITY"});playMode="solo";startWorld(PGR.floorSeed(run),false,false);mode="playing";
    document.body.dataset.runActive="true";document.body.dataset.specialMode="";UI.menu?.classList.add("hidden");
    host.enemies=[];host.generators=[];host.traps=[];host.chests=[];host.weightBridge=null;if(host.stalker)host.stalker.awake=false;
    try{hazards.length=0}catch(_){}p1.hitStunMs=0;move1=0;input.clear();
    const dirs=[{dx:1,dy:0,code:"ArrowRight"},{dx:-1,dy:0,code:"ArrowLeft"},{dx:0,dy:1,code:"ArrowDown"},{dx:0,dy:-1,code:"ArrowUp"}];
    const occupied=(x,y)=>(host.enemies||[]).some(e=>e.alive&&e.x===x&&e.y===y);
    return dirs.find(row=>window.CCGWorld?.walkable?.(world.map,p1.x+row.dx,p1.y+row.dy,host)&&!occupied(p1.x+row.dx,p1.y+row.dy))||null;
  });
  assert.ok(direction,"owner-stability regression requires a traversable Solo tile");

  await page.evaluate(()=>{
    const r30=window.CCGLostSizzlerV141R30;
    const initialGolden=r30.state.goldenMove;
    const ids=new WeakMap();let nextId=1,lastMove=window.movePlayer,lastGolden=r30.state.goldenMove;
    const id=fn=>{if(typeof fn!=="function")return 0;if(!ids.has(fn))ids.set(fn,nextId++);return ids.get(fn)};
    const describe=fn=>({
      id:id(fn),name:String(fn?.name||""),golden:fn===initialGolden,
      spyFinal:Boolean(fn?.__ccgV141SpyFinal),split:Boolean(fn?.__ccgV141SplitBudge),tutorial:Boolean(fn?.__ccgV141TutorialMoveFinal),
      r27:Boolean(fn?.__ccgV141R27SpyDoorIsolation),r29:Boolean(fn?.__ccgV141R29SpyOwner),isolated:Boolean(fn?.__ccgV141SpyIsolated),
      source:String(fn||"").slice(0,140).replace(/\s+/g," ")
    });
    window.__r30OwnerTrace={initialGolden,events:[],timer:0};
    const record=reason=>window.__r30OwnerTrace.events.push({at:Math.round(performance.now()),reason,move:describe(window.movePlayer),storedGolden:describe(r30.state.goldenMove),locked:r30.state.goldenLocked,repairs:r30.state.ownershipRepairs,watchdog:r30.state.watchdogRecoveries});
    record("initial");
    window.__r30OwnerTrace.timer=setInterval(()=>{
      const move=window.movePlayer,golden=r30.state.goldenMove;
      if(move!==lastMove||golden!==lastGolden){lastMove=move;lastGolden=golden;record("identity-change")}
    },5);
    const dead=function deadR30OwnerStability(){return false};dead.__ccgOriginal=window.movePlayer;window.movePlayer=dead;lastMove=dead;record("dead-injected");
  });

  await page.keyboard.down(direction.code);await page.waitForTimeout(1150);await page.keyboard.up(direction.code);await page.waitForTimeout(650);
  const result=await page.evaluate(()=>{
    clearInterval(window.__r30OwnerTrace.timer);
    const r30=window.CCGLostSizzlerV141R30,trace=window.__r30OwnerTrace;
    const events=trace.events;
    const firstRestored=events.findIndex(event=>event.reason==="identity-change"&&event.move.golden);
    const driftAfterRestore=firstRestored>=0?events.slice(firstRestored+1).filter(event=>!event.move.golden||!event.storedGolden.golden):[];
    return{events,firstRestored,driftAfterRestore,finalMoveGolden:window.movePlayer===trace.initialGolden,storedGoldenStable:r30.state.goldenMove===trace.initialGolden,repairs:r30.state.ownershipRepairs,watchdog:r30.state.watchdogRecoveries};
  });

  assert.ok(result.firstRestored>=0,`r30 must restore the initial locked owner after dead-wrapper injection. Trace: ${JSON.stringify(result.events)}`);
  assert.equal(result.storedGoldenStable,true,`the locked golden owner must be immutable after release. Trace: ${JSON.stringify(result.events)}`);
  assert.deepEqual(result.driftAfterRestore,[],`no late installer may reclaim movement after r30 restores the golden owner. Trace: ${JSON.stringify(result.events)}`);
  assert.equal(result.finalMoveGolden,true,`final movement owner must remain the initial locked golden owner. Trace: ${JSON.stringify(result.events)}`);
  assert.ok(result.repairs>0||result.watchdog>0,"owner-stability injection must exercise an r30 recovery path");
  console.log("Lost Sizzler r30 locked-owner stability passed across repeated late-installer intervals.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
