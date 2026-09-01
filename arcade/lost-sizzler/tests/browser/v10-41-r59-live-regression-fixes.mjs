import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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
  const context=await browser.newContext({viewport:{width:1800,height:1000}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  console.log("[r59] load canonical runtime and wait for final clock owner");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes)&&Boolean(window.CCGLostSizzlerV141R32SpyLoader),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1)&&window.loop?.__ccgV141R59PauseClock===true,null,{timeout:20000});

  // Hosted headless runners can render the fully loaded game well below 60 FPS.
  // The regression is acceleration relative to the same runtime before pausing,
  // not an absolute FPS target. Use a longer matched sample to reduce scheduler
  // noise, then reject the ~2x+ multiplication produced by duplicate resume loops.
  const CADENCE_SAMPLE_MS=1500;
  console.log("[r59] establish runner-relative accepted-frame cadence before pause cycling");
  const baselineStart=await page.evaluate(()=>Number(window.CCGLostSizzlerV141R59LiveRegressionFixes.state.acceptedFrames||0));
  await page.waitForTimeout(CADENCE_SAMPLE_MS);
  const baselineEnd=await page.evaluate(()=>Number(window.CCGLostSizzlerV141R59LiveRegressionFixes.state.acceptedFrames||0));
  const baselineFrames=baselineEnd-baselineStart;
  assert.ok(baselineFrames>=5,`baseline R59 clock must continue advancing, got ${baselineFrames} accepted frames in ${CADENCE_SAMPLE_MS} ms`);

  console.log("[r59] five pause/resume cycles cannot pay paused wall-clock time into recovery");
  for(let cycle=0;cycle<5;cycle++){
    await page.keyboard.press("KeyP");
    await page.waitForFunction(()=>mode==="paused");
    const before=await page.evaluate(()=>({r29:Number(window.CCGLostSizzlerV141R29?.state?.combatStallRecoveries||0),discarded:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?.pausedGapsDiscarded||0)}));
    await page.evaluate(()=>{const until=performance.now()+620;while(performance.now()<until){}});
    await page.waitForTimeout(80);
    const paused=await page.evaluate(()=>({mode,r29:Number(window.CCGLostSizzlerV141R29?.state?.combatStallRecoveries||0),discarded:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?.pausedGapsDiscarded||0)}));
    assert.equal(paused.mode,"paused",`cycle ${cycle+1}: blocking pause fixture must remain paused`);
    assert.equal(paused.r29,before.r29,`cycle ${cycle+1}: paused wall-clock gap must not enter R29 combat recovery`);
    assert.ok(paused.discarded>before.discarded,`cycle ${cycle+1}: R59 must record the paused long gap as discarded`);
    await page.keyboard.press("KeyP");
    await page.waitForFunction(()=>mode==="playing");
    await page.waitForTimeout(100);
  }

  console.log("[r59] repeated resume cannot multiply accepted simulation cadence");
  const afterStart=await page.evaluate(()=>Number(window.CCGLostSizzlerV141R59LiveRegressionFixes.state.acceptedFrames||0));
  await page.waitForTimeout(CADENCE_SAMPLE_MS);
  const afterEnd=await page.evaluate(()=>Number(window.CCGLostSizzlerV141R59LiveRegressionFixes.state.acceptedFrames||0));
  const afterFrames=afterEnd-afterStart,ratio=afterFrames/Math.max(1,baselineFrames);
  assert.ok(afterFrames>=5,`post-pause R59 clock must continue advancing, got ${afterFrames} accepted frames in ${CADENCE_SAMPLE_MS} ms`);
  assert.ok(ratio>=0.5&&ratio<=1.75,`five resumes must not multiply or collapse simulation cadence: baseline=${baselineFrames}, after=${afterFrames}, ratio=${ratio.toFixed(2)}`);
  const pauseState=await page.evaluate(()=>({...window.CCGLostSizzlerV141R59LiveRegressionFixes.state}));
  assert.ok(pauseState.pauseBoundaries>=10,`five pause/resume cycles must cross at least ten R59 boundaries, got ${pauseState.pauseBoundaries}`);

  console.log("[r59] reload and start real Spy fixture for TAB/F ownership");
  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R32SpyLoader)&&Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes),null,{timeout:90000});
  const started=await page.evaluate(()=>{net.setSolo("Agent One");const id=String(net.sessionId);return window.CCGLostSizzlerSpecialModes.startOnline({roomMode:"sizzler-saboteurs",players:[{id,name:"Agent One"},{id:"R59-SPY-B",name:"Agent Two"}],hostId:id,seed:"V141-R59-LIVE-REGRESSION",roomCode:"R59SPY"})});
  assert.equal(started,true,"R59 Spy fixture must start through the real special-mode adapter");
  await page.waitForFunction(()=>document.body.dataset.specialMode==="sizzler-saboteurs"&&Boolean(window.CCGLostSizzlerV141R32SpyLoader?.state?.r58Loaded)&&Boolean(window.CCGLostSizzlerV141R58SpyOverhaul)&&window.CCGLostSizzlerV141R32SpyLoader?.state?.r27KeyDetached===true,null,{timeout:30000});

  const prepared=await page.evaluate(()=>{
    const loader=window.CCGLostSizzlerV141R32SpyLoader,r32=window.CCGLostSizzlerV141R32SpyOverhaul,r58=window.CCGLostSizzlerV141R58SpyOverhaul;
    r32.buildOverhaulWorld(false);r58.tick();r32.setInventory(false);
    if(typeof mode!=="undefined")mode="playing";UI?.inventory?.classList?.add?.("hidden");input?.clear?.();move1=0;p1.hitStunMs=0;
    window.__r59FullscreenCalls=0;window.__r59OriginalToggleFullscreen=window.toggleFullscreen;
    window.toggleFullscreen=function(){window.__r59FullscreenCalls++;return true};
    document.getElementById("game")?.focus?.();
    return{detached:Boolean(loader.state.r27KeyDetached),inventoryOpen:Boolean(r32.state.inventoryOpen),mode:String(mode),sharedHidden:Boolean(UI?.inventory?.classList?.contains?.("hidden"))}
  });
  assert.equal(prepared.detached,true,"legacy R27 Spy keyboard listener must be detached before live input");
  assert.equal(prepared.inventoryOpen,false);assert.equal(prepared.mode,"playing");assert.equal(prepared.sharedHidden,true);

  console.log("[r59] TAB opens only the private Spy field kit");
  await page.keyboard.press("Tab");
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R32SpyOverhaul?.state?.inventoryOpen===true);
  const tabOpen=await page.evaluate(()=>({privateOpen:Boolean(window.CCGLostSizzlerV141R32SpyOverhaul.state.inventoryOpen),mode:String(mode),sharedHidden:Boolean(UI?.inventory?.classList?.contains?.("hidden")),tabToggles:Number(window.CCGLostSizzlerV141R32SpyLoader.state.tabToggles||0)}));
  assert.equal(tabOpen.privateOpen,true);assert.equal(tabOpen.mode,"playing","Spy TAB must never put shared game mode into inventory");assert.equal(tabOpen.sharedHidden,true,"Spy TAB must leave the shared Dungeon inventory hidden");assert.ok(tabOpen.tabToggles>=1);
  await page.keyboard.press("Tab");
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R32SpyOverhaul?.state?.inventoryOpen===false);

  console.log("[r59] F reaches fullscreen owner and cannot reopen/poison Spy inventory");
  await page.keyboard.press("KeyF");
  await page.waitForFunction(()=>Number(window.__r59FullscreenCalls||0)>=1);
  const fState=await page.evaluate(()=>({calls:Number(window.__r59FullscreenCalls||0),privateOpen:Boolean(window.CCGLostSizzlerV141R32SpyOverhaul.state.inventoryOpen),mode:String(mode),sharedHidden:Boolean(UI?.inventory?.classList?.contains?.("hidden")),move:Number(move1||0)}));
  assert.equal(fState.calls,1,"one F press must reach the canonical fullscreen owner exactly once");assert.equal(fState.privateOpen,false,"F must not open Spy field kit");assert.equal(fState.mode,"playing","F must not enter shared inventory mode");assert.equal(fState.sharedHidden,true,"F must not expose Dungeon inventory");

  console.log("[r59] movement remains live immediately after F");
  const movementFixture=await page.evaluate(()=>{
    const dirs=[{code:"ArrowRight",dx:1,dy:0},{code:"ArrowLeft",dx:-1,dy:0},{code:"ArrowDown",dx:0,dy:1},{code:"ArrowUp",dx:0,dy:-1}],players=typeof allPlayers==="function"?allPlayers():[p1];
    const choice=dirs.find(d=>{const x=Number(p1.x)+d.dx,y=Number(p1.y)+d.dy;return window.CCGWorld?.walkable?.(world.map,x,y,host)&&!players.some(other=>other&&other!==p1&&Number(other.x)===x&&Number(other.y)===y)});
    if(!choice)throw new Error("no walkable Spy movement neighbour after F");
    p1.hitStunMs=0;move1=0;input.clear();return{code:choice.code,x:Number(p1.x),y:Number(p1.y)}
  });
  await page.keyboard.down(movementFixture.code);
  await page.waitForTimeout(260);
  await page.keyboard.up(movementFixture.code);
  await page.waitForFunction(before=>Number(p1?.x)!==before.x||Number(p1?.y)!==before.y,movementFixture,{timeout:3000});
  const movementAfter=await page.evaluate(()=>({x:Number(p1.x),y:Number(p1.y),mode:String(mode),inventoryOpen:Boolean(window.CCGLostSizzlerV141R32SpyOverhaul.state.inventoryOpen)}));
  assert.ok(movementAfter.x!==movementFixture.x||movementAfter.y!==movementFixture.y,"Spy movement must remain responsive after F fullscreen input");assert.equal(movementAfter.mode,"playing");assert.equal(movementAfter.inventoryOpen,false);

  await page.evaluate(()=>{if(window.__r59OriginalToggleFullscreen)window.toggleFullscreen=window.__r59OriginalToggleFullscreen;delete window.__r59OriginalToggleFullscreen});
  assert.deepEqual(errors,[],`R59 live-regression browser test produced page errors: ${errors.join("\n")}`);
  console.log(`Lost Sizzler V10.41 R59 pause cadence (${baselineFrames}->${afterFrames}, ratio ${ratio.toFixed(2)}), paused-gap isolation, TAB field kit, F fullscreen and post-F movement passed in Chromium.`);
  await context.close();
}finally{
  await browser.close().catch(()=>{});for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));
}
