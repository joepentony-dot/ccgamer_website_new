import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

/*
 * Stage 1 retirement boundary for the historical R32 Solo monitor contract.
 *
 * The original regression waited for CCGLostSizzlerV141R32SpyLoader and then
 * proved that its Spy activation observer stayed armed without a polling timer.
 * That premise is intentionally obsolete: Sizzler Saboteurs / Spy is retired
 * and the R32 Spy loader must no longer be installed during supported startup.
 *
 * This contract now protects the remaining supported ownership guarantee:
 * ordinary Solo must reach canonical dungeon-solo ownership with the explicit
 * R56/R59/R60 support chain present, while the retired Spy startup/observer
 * owner and its lazily loaded assets remain absent even after Solo has been
 * running long enough for a historical monitor to have activated.
 *
 * Movement recovery, attack liveness and pause/resume cadence remain covered by
 * their dedicated R30/R56/R59/R60 and V10.42 Solo endurance contracts. Keeping
 * those assertions in their authoritative tests avoids rebuilding a second,
 * weaker copy here merely to preserve a retired R32 filename.
 */

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".ogg":"audio/ogg",".mp3":"audio/mpeg",".wav":"audio/wav"};
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

const RETIRED_SPY_SCRIPTS=[
  "v10-41-r30-spy-exit-control-reset.js",
  "v10-41-r32-spy-world-owner.js",
  "v10-41-r32-spy-loader.js",
  "v10-41-r32-spy-overhaul.js",
  "v10-41-r32-spy-packet-owner.js",
  "v10-41-r32-spy-search-ui-owner.js",
  "v10-41-r35-spy-rules-hardening.js",
  "v10-41-r35-spy-knockout-finalizer.js",
  "v10-41-r34-spy-fullscreen-ui.js",
  "v10-41-r36-spy-perfection.js",
  "v10-41-r45-spy-trap-presentation.js",
  "v10-41-r58-spy-overhaul.js"
];

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  await context.route("https://*.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:"{}"}));
  const page=await context.newPage();
  page.setDefaultTimeout(60000);
  const errors=[];
  const localScripts=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  page.on("request",request=>{
    try{
      const url=new URL(request.url());
      if(url.origin===origin&&/\/arcade\/lost-sizzler\/js\/.*\.js$/i.test(url.pathname))localScripts.push(path.basename(url.pathname));
    }catch(_){}
  });

  console.log("[Stage 1 R32 retirement] load supported runtime without the retired Spy monitor");
  await page.goto(`${origin}/arcade/lost-sizzler/?r32-retirement-boundary=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>
    document.body?.dataset?.releaseReady==="true"&&
    document.body?.dataset?.gameReady==="true"&&
    Boolean(document.getElementById("solo-btn"))&&
    Boolean(window.CCGLostSizzlerV141R56PlaytestCompletion)&&
    Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes)&&
    Boolean(window.CCGLostSizzlerV141HordeFramePerformance)&&
    Boolean(window.CCGLostSizzlerV141R60LivePlayIntegrity)&&
    Boolean(window.CCGLostSizzlerV141R60HordeOwnerComposition)
  ,null,{timeout:90000});

  const startup=await page.evaluate(()=>({
    specialMode:String(document.body?.dataset?.specialMode||""),
    r56:Boolean(window.CCGLostSizzlerV141R56PlaytestCompletion),
    r59:Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes),
    r60Live:Boolean(window.CCGLostSizzlerV141R60LivePlayIntegrity),
    r60Composition:Boolean(window.CCGLostSizzlerV141R60HordeOwnerComposition),
    hordeFrameBridge:Boolean(window.CCGLostSizzlerV141HordeFramePerformance),
    spyExit:Boolean(window.CCGLostSizzlerV141R30SpyExitControlReset),
    spyWorld:Boolean(window.CCGLostSizzlerV141R32SpyWorldOwner),
    spyLoader:Boolean(window.CCGLostSizzlerV141R32SpyLoader),
    spyLoaderScript:Boolean(document.querySelector('script[data-ccg-r32-spy-loader="true"]'))
  }));

  assert.equal(startup.r56,true,"supported R56 ordinary-dungeon ownership must load explicitly");
  assert.equal(startup.r59,true,"supported R59 pause/Solo authority must load explicitly");
  assert.equal(startup.r60Live,true,"supported R60 Solo live-play integrity owner must remain available");
  assert.equal(startup.r60Composition,true,"supported R60 maintenance/damage ancestry bridge must remain available");
  assert.equal(startup.hordeFrameBridge,true,"historical Horde-named bridge required for supported Solo R60 ownership must remain available");
  assert.equal(startup.spyExit,false,"retired Spy exit owner must not install during supported startup");
  assert.equal(startup.spyWorld,false,"retired Spy world owner must not install during supported startup");
  assert.equal(startup.spyLoader,false,"retired R32 Spy loader must not install during supported startup");
  assert.equal(startup.spyLoaderScript,false,"retired R32 Spy loader script marker must be absent");
  assert.equal(startup.specialMode,"","supported startup must not activate a retired special mode");

  console.log("[Stage 1 R32 retirement] start canonical Solo and observe for late retired-owner activation");
  await page.click("#solo-btn");
  await page.waitForFunction(()=>
    document.body?.dataset?.runActive==="true"&&
    typeof mode!=="undefined"&&mode==="playing"&&
    typeof playMode!=="undefined"&&playMode==="solo"&&
    Boolean(p1)&&Boolean(host)&&
    window.CCGLostSizzlerModeRuntime?.state?.activeId==="dungeon-solo"
  ,null,{timeout:30000});

  // Legitimate named-dossier startup presentation is not a control failure.
  await page.evaluate(()=>{
    try{
      const panel=document.getElementById("named-dossier-panel");
      if(typeof mode!=="undefined"&&mode==="dossier"&&panel&&!panel.classList.contains("hidden"))window.hideNamedDossier?.();
    }catch(_){}
  });
  await page.waitForFunction(()=>typeof mode!=="undefined"&&mode==="playing",null,{timeout:10000});

  const requestsAtSoloStart=localScripts.length;
  await page.waitForTimeout(5000);

  const solo=await page.evaluate(()=>({
    active:document.body?.dataset?.runActive||"",
    mode:String(typeof mode!=="undefined"?mode:""),
    playMode:String(typeof playMode!=="undefined"?playMode:""),
    controller:String(window.CCGLostSizzlerModeRuntime?.state?.activeId||""),
    specialMode:String(document.body?.dataset?.specialMode||""),
    r56:Boolean(window.CCGLostSizzlerV141R56PlaytestCompletion),
    r59:Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes),
    r60Live:Boolean(window.CCGLostSizzlerV141R60LivePlayIntegrity),
    r60Composition:Boolean(window.CCGLostSizzlerV141R60HordeOwnerComposition),
    spyExit:Boolean(window.CCGLostSizzlerV141R30SpyExitControlReset),
    spyWorld:Boolean(window.CCGLostSizzlerV141R32SpyWorldOwner),
    spyLoader:Boolean(window.CCGLostSizzlerV141R32SpyLoader),
    spyLoaderScript:Boolean(document.querySelector('script[data-ccg-r32-spy-loader="true"]'))
  }));

  assert.equal(solo.active,"true","supported Solo run must remain active");
  assert.equal(solo.mode,"playing","supported Solo run must remain in playing mode");
  assert.equal(solo.playMode,"solo","supported Solo playMode must remain selected");
  assert.equal(solo.controller,"dungeon-solo","supported Solo must retain canonical dungeon-solo ownership");
  assert.equal(solo.specialMode,"","ordinary Solo must not activate retired special-mode state");
  assert.equal(solo.r56,true,"R56 supported ownership must survive canonical Solo start");
  assert.equal(solo.r59,true,"R59 supported Solo authority must survive canonical Solo start");
  assert.equal(solo.r60Live,true,"R60 supported Solo live-play ownership must survive canonical Solo start");
  assert.equal(solo.r60Composition,true,"R60 supported maintenance/damage ancestry must survive canonical Solo start");
  assert.equal(solo.spyExit,false,"retired Spy exit owner must remain absent during Solo");
  assert.equal(solo.spyWorld,false,"retired Spy world owner must remain absent during Solo");
  assert.equal(solo.spyLoader,false,"retired R32 Spy loader/observer owner must remain absent during Solo");
  assert.equal(solo.spyLoaderScript,false,"retired R32 Spy loader script must not appear late during Solo");

  const retiredRequests=localScripts.filter(name=>RETIRED_SPY_SCRIPTS.includes(name));
  assert.deepEqual(retiredRequests,[],`retired Spy/Saboteur assets must not be requested by supported startup or Solo: ${retiredRequests.join(", ")}`);
  assert.ok(localScripts.length>=requestsAtSoloStart,"request accounting must remain monotonic during the Solo observation window");
  assert.deepEqual(errors,[],`Stage 1 R32 retirement boundary must have no uncaught browser errors: ${errors.join("\n")}`);

  console.log("DUNGEON_R32_RETIREMENT_BOUNDARY",JSON.stringify({startup,solo,scriptRequests:localScripts.length}));
  console.log("Dungeon Carnage retired R32 Solo-monitor contract passed: supported R56/R59/R60 ownership remains explicit and no retired Spy monitor or assets activate.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
