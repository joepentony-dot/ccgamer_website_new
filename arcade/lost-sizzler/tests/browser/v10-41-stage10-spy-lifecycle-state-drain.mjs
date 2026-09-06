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
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});
      res.end(data)
    })
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  const page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R29SpyEngine)&&Boolean(window.CCGLostSizzlerV141R29SpyNetwork)&&Boolean(window.CCGLostSizzlerV141R32SpyLoader)&&typeof quitToMenu==="function",null,{timeout:90000});

  const startSpy=async cycle=>{
    const started=await page.evaluate(cycle=>{
      net.setSolo(`Lifecycle Agent ${cycle}`);
      const id=String(net.sessionId);
      return window.CCGLostSizzlerSpecialModes.startOnline({roomMode:"sizzler-saboteurs",players:[{id,name:`Lifecycle Agent ${cycle}`},{id:`STAGE10-LIFE-${cycle}-B`,name:"Lifecycle Rival"}],hostId:id,seed:`STAGE10-LIFE-${cycle}`,roomCode:`S10L${cycle}`})
    },cycle);
    assert.equal(started,true,`Spy lifecycle cycle ${cycle} must start through the canonical adapter`);
    await page.waitForFunction(()=>mode==="playing"&&document.body.dataset.specialMode==="sizzler-saboteurs"&&document.body.dataset.modeController==="spy-online"&&Boolean(window.CCGLostSizzlerV141R29SpyEngine?.state?.isolated)&&Boolean(window.CCGLostSizzlerV141R29SpyNetwork?.state?.timer),null,{timeout:30000});
    await page.evaluate(async()=>{const loader=window.CCGLostSizzlerV141R32SpyLoader;await loader.ensureLoaded();await loader.ensureSearchUi()});
    await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R32SpyLoader?.state?.loaded&&window.CCGLostSizzlerV141R32SpyLoader?.state?.uiLoaded));
    await page.waitForTimeout(250)
  };

  const snap=()=>page.evaluate(()=>{
    const engine=window.CCGLostSizzlerV141R29SpyEngine,network=window.CCGLostSizzlerV141R29SpyNetwork,loader=window.CCGLostSizzlerV141R32SpyLoader,overhaul=window.CCGLostSizzlerV141R32SpyOverhaul;
    return{
      mode:String(typeof mode!=="undefined"?mode:""),specialMode:String(document.body.dataset.specialMode||""),controller:String(document.body.dataset.modeController||""),
      x:Number(p1?.x),y:Number(p1?.y),moves:Number(engine?.state?.moves||0),attacks:Number(engine?.state?.attacks||0),trapPulses:Number(engine?.state?.trapPulses||0),trapHeld:Boolean(engine?.state?.trapHeld),trapPulse:Boolean(engine?.state?.trapPulse),isolated:Boolean(engine?.state?.isolated),
      networkTimer:Number(network?.state?.timer||0),networkInstalled:Boolean(network?.state?.installed),heartbeatsStarted:Number(network?.state?.heartbeatsStarted||0),heartbeatsStopped:Number(network?.state?.heartbeatsStopped||0),modeObserverInstalled:Boolean(network?.state?.modeObserverInstalled),
      loaderTimer:Number(loader?.state?.timer||0),pendingActionCode:String(loader?.state?.pendingActionCode||""),tabTogglePending:Boolean(loader?.state?.tabTogglePending),inventoryOpen:Boolean(overhaul?.state?.inventoryOpen),searchPending:Boolean(overhaul?.state?.search)
    }
  });

  console.log("[Stage 10 Spy lifecycle] first entry establishes active-only transport and clean action state");
  await startSpy(1);
  const first=await snap();
  assert.equal(first.isolated,true);
  assert.ok(first.networkTimer>0,"Spy network heartbeat must exist only during active Spy play");
  assert.equal(first.networkInstalled,true);
  assert.equal(first.loaderTimer,0,"r32 lazy loader must remain event-driven");
  assert.equal(first.pendingActionCode,"");
  assert.equal(first.tabTogglePending,false);

  console.log("[Stage 10 Spy lifecycle] quit while movement/attack/trap keys are still physically held");
  await page.keyboard.down("KeyD");
  await page.keyboard.down("Space");
  await page.keyboard.down("KeyT");
  await page.waitForTimeout(280);
  const held=await snap();
  assert.ok(held.moves>first.moves||held.attacks>first.attacks||held.trapPulses>first.trapPulses,"held input fixture must exercise at least one Spy-owned action before exit");
  await page.evaluate(async()=>{await quitToMenu()});
  await page.waitForFunction(()=>mode==="menu"&&document.body.dataset.specialMode!=="sizzler-saboteurs"&&!window.CCGLostSizzlerV141R29SpyEngine?.state?.isolated&&!window.CCGLostSizzlerV141R29SpyNetwork?.state?.timer&&!window.CCGLostSizzlerV141R29SpyNetwork?.state?.installed,null,{timeout:15000});
  const exited=await snap();
  assert.equal(exited.isolated,false);
  assert.equal(exited.networkTimer,0,"Spy heartbeat must be destroyed on exit");
  assert.equal(exited.networkInstalled,false,"Spy packet owner must restore downstream ownership on exit");
  assert.ok(exited.heartbeatsStopped>=first.heartbeatsStopped+1,"Spy exit must record a matching heartbeat stop");
  assert.equal(exited.trapHeld,false,"Spy exit must clear trap-held state even if KeyT never received keyup");
  assert.equal(exited.trapPulse,false,"Spy exit must clear pending trap pulse state");
  assert.equal(exited.pendingActionCode,"","Spy exit must drain queued first-action state");
  assert.equal(exited.tabTogglePending,false,"Spy exit must drain pending inventory toggle state");
  assert.equal(exited.inventoryOpen,false,"Spy exit must close independent Spy inventory UI");
  assert.equal(exited.searchPending,false,"Spy exit must clear active search state");

  console.log("[Stage 10 Spy lifecycle] re-entry must not replay stale held inputs or grow mode-owned transport state");
  await startSpy(2);
  const reentered=await snap();
  assert.equal(reentered.modeObserverInstalled,true,"Spy transport must keep one event-driven mode observer");
  assert.equal(reentered.heartbeatsStarted,first.heartbeatsStarted+1,"second Spy activation must start exactly one new active-mode heartbeat");
  assert.equal(reentered.loaderTimer,0);
  const stableBefore={x:reentered.x,y:reentered.y,moves:reentered.moves,attacks:reentered.attacks,trapPulses:reentered.trapPulses};
  await page.waitForTimeout(650);
  const stableAfter=await snap();
  assert.equal(stableAfter.x,stableBefore.x,"stale held movement key must not replay after re-entry");
  assert.equal(stableAfter.y,stableBefore.y,"stale held movement key must not replay after re-entry");
  assert.equal(stableAfter.moves,stableBefore.moves,"re-entry without a new keydown must not generate Spy movement");
  assert.equal(stableAfter.attacks,stableBefore.attacks,"re-entry without a new keydown must not generate Spy attacks");
  assert.equal(stableAfter.trapPulses,stableBefore.trapPulses,"re-entry without a new KeyT edge must not generate a trap pulse");

  await page.keyboard.up("KeyD");
  await page.keyboard.up("Space");
  await page.keyboard.up("KeyT");
  await page.evaluate(async()=>{await quitToMenu()});
  await page.waitForFunction(()=>mode==="menu"&&!window.CCGLostSizzlerV141R29SpyNetwork?.state?.timer&&!window.CCGLostSizzlerV141R29SpyNetwork?.state?.installed);
  const finalState=await snap();
  assert.equal(finalState.heartbeatsStarted,reentered.heartbeatsStarted,"final exit must not start another heartbeat");
  assert.equal(finalState.heartbeatsStopped,reentered.heartbeatsStopped+1,"final exit must stop exactly the active heartbeat");
  assert.equal(finalState.networkTimer,0);
  assert.equal(finalState.networkInstalled,false);
  assert.equal(finalState.pendingActionCode,"");
  assert.equal(finalState.tabTogglePending,false);
  assert.deepEqual(errors,[],`Stage 10 Spy lifecycle state-drain qualification must have no uncaught browser errors: ${errors.join("\n")}`);

  console.log("Lost Sizzler Stage 10 Spy lifecycle held-input drain, action cleanup and active-only transport qualification passed in Chromium.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()))
}
