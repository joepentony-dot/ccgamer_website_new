import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

/*
 * Focused LS-SOLO-002 retirement regression.
 *
 * R32 is a Spy lazy-loader. Its historical 20 ms monitor used to wake in every
 * mode merely to keep global R59 available and notice a future Spy transition.
 * The loader now performs one initial prerequisite pass and observes the
 * authoritative mode attributes instead. This contract proves sustained Solo
 * keeps that observer armed with no recurring R32 timer and no Spy owners loaded.
 * The real Spy movement regression separately proves an actual Spy transition
 * still triggers the complete lazy-load path.
 */

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".mjs":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".svg":"image/svg+xml",
  ".png":"image/png",
  ".webp":"image/webp",
  ".ogg":"audio/ogg",
  ".mp3":"audio/mpeg"
};
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
      res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1800,height:1000}});
  const page=await context.newPage();
  page.setDefaultTimeout(90000);

  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&document.body.dataset.gameReady==="true"&&Boolean(document.getElementById("solo-btn"))&&Boolean(window.CCGLostSizzlerV141R32SpyLoader)&&Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes));
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&playMode==="solo"&&Boolean(p1)&&Boolean(host)&&window.CCGLostSizzlerModeRuntime?.state?.activeId==="dungeon-solo",null,{timeout:45000});
  const startupBoundary=await page.evaluate(()=>{
    const before=String(mode||""),panel=document.getElementById("named-dossier-panel"),visible=Boolean(panel&&!panel.classList.contains("hidden"));
    if(before==="dossier"&&visible)hideNamedDossier();
    return{before,visible,after:String(mode||""),runActive:document.body.dataset.runActive==="true",controllerId:String(window.CCGLostSizzlerModeRuntime?.state?.activeId||"")};
  });
  assert.ok(startupBoundary.before==="playing"||(startupBoundary.before==="dossier"&&startupBoundary.visible),`R32 retirement diagnostic encountered an unexpected Solo startup mode: ${JSON.stringify(startupBoundary)}`);
  assert.equal(startupBoundary.after,"playing",`R32 retirement diagnostic must begin its sustained sample in active play: ${JSON.stringify(startupBoundary)}`);
  assert.equal(startupBoundary.runActive,true,"normalising a legitimate startup dossier must preserve the active Solo run");
  assert.equal(startupBoundary.controllerId,"dungeon-solo","normalising a legitimate startup dossier must preserve canonical Solo ownership");
  await page.waitForTimeout(120);

  const read=label=>page.evaluate(label=>{
    const loader=window.CCGLostSizzlerV141R32SpyLoader;
    const state=loader?.state||{};
    return{
      label,
      mode:typeof mode==="string"?mode:null,
      playMode:typeof playMode==="string"?playMode:null,
      controllerId:String(window.CCGLostSizzlerModeRuntime?.state?.activeId||""),
      specialMode:String(document.body.dataset.specialMode||""),
      timer:Number(state.timer||0),
      modeObserverInstalled:Boolean(state.modeObserverInstalled),
      modeObserverUnsupported:Boolean(state.modeObserverUnsupported),
      modeSignals:Number(state.modeSignals||0),
      spyActivationSignals:Number(state.spyActivationSignals||0),
      r59Loaded:Boolean(state.r59Loaded),
      r59Loading:Boolean(state.r59Loading),
      r59Loads:Number(state.r59Loads||0),
      spyLoaded:Boolean(state.loaded),
      spyLoading:Boolean(state.loading),
      spyLoads:Number(state.loads||0),
      spyUiLoaded:Boolean(state.uiLoaded),
      spyUiLoads:Number(state.uiLoads||0),
      r58Loaded:Boolean(state.r58Loaded),
      hidden:Boolean(document.hidden),
      hasFocus:document.hasFocus()
    };
  },label);

  const baseline=await read("baseline");
  await page.waitForTimeout(5000);
  const sustained=await read("sustained-solo");

  console.log("R32_SOLO_MONITOR_DIAGNOSTIC "+JSON.stringify({startupBoundary,baseline,sustained}));

  assert.equal(baseline.controllerId,"dungeon-solo","R32 retirement diagnostic requires canonical Solo ownership");
  assert.equal(sustained.controllerId,"dungeon-solo","R32 retirement diagnostic must remain in canonical Solo ownership");
  assert.equal(sustained.mode,"playing","Solo must remain actively playing during the observation window");
  assert.equal(baseline.timer,0,"R32 must not retain its historical 20 ms timer after installation");
  assert.equal(sustained.timer,0,"R32 must remain timer-free throughout sustained ordinary Solo play");
  assert.equal(baseline.modeObserverInstalled,true,"R32 mode-entry observer must be armed before sustained Solo observation");
  assert.equal(sustained.modeObserverInstalled,true,"R32 mode-entry observer must remain armed while Solo runs without polling");
  assert.equal(sustained.modeObserverUnsupported,false,"supported Chromium must not fall back from event-driven R32 mode observation");
  assert.equal(sustained.spyActivationSignals,0,"ordinary Solo must not signal or activate Spy lazy owners");
  assert.equal(sustained.r59Loaded,true,"global R59 authority must already be loaded during Solo");
  assert.equal(sustained.r59Loading,false,"R59 must not be pending while Solo is stable");
  assert.equal(sustained.spyLoaded,false,"ordinary Solo must not load the Spy overhaul");
  assert.equal(sustained.spyLoading,false,"ordinary Solo must not begin loading the Spy overhaul");
  assert.equal(sustained.spyLoads,0,"ordinary Solo must not perform a Spy overhaul load");
  assert.equal(sustained.spyUiLoaded,false,"ordinary Solo must not load Spy search UI");
  assert.equal(sustained.spyUiLoads,0,"ordinary Solo must not perform a Spy UI load");
  assert.equal(sustained.r58Loaded,false,"ordinary Solo must not load the R58 Spy overhaul");

  console.log("Lost Sizzler R32 Solo retirement regression passed: event-driven Spy loading stays armed with no cross-mode polling timer or Spy owner leakage.");
  await context.close();
}finally{
  await browser.close().catch(()=>{});
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}