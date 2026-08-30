import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".jpg":"image/jpeg",".jpeg":"image/jpeg",".ogg":"audio/ogg",".mp3":"audio/mpeg",".wav":"audio/wav"};
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
  page.setDefaultTimeout(45000);
  const errors=[],crashes=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  page.on("crash",()=>crashes.push("Chromium page crashed"));

  console.log("[r47 all-mode] load canonical runtime and governor");
  await page.goto(`${origin}/arcade/lost-sizzler/?r47-all-mode=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R47AllModeOptimisation));

  const coverage=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R47AllModeOptimisation;
    const modes=["solo","online","split","daily","tutorial","dungeon","horde-survivor","sizzler-saboteurs"];
    return{tier:document.body.dataset.v141R47PerformanceTier,modes:Object.fromEntries(modes.map(mode=>[mode,api.budgets(mode,"severe")]))};
  });
  assert.equal(coverage.tier,"normal");
  for(const [mode,budget] of Object.entries(coverage.modes)){
    assert.ok(budget.particles>=120&&budget.rings>=36&&budget.floaters>=42,`${mode} must receive a bounded visual budget`);
  }
  assert.ok(coverage.modes["horde-survivor"].particles<coverage.modes.solo.particles,"Horde must shed more disposable FX than Solo under the same pressure");
  assert.ok(coverage.modes["sizzler-saboteurs"].particles<=coverage.modes["horde-survivor"].particles,"Spy must retain its tighter two-player visual budget");

  console.log("[r47 all-mode] pressure thresholds and client fault fingerprints are deterministic");
  const pressure=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R47AllModeOptimisation;
    const a=api.errorDetails("runtime",new Error("Synthetic bounded diagnostic"),"https://example.test/game.js?cache=1",42,7);
    const b=api.errorDetails("runtime",new Error("Synthetic bounded diagnostic"),"https://example.test/game.js?cache=2",42,7);
    return{normal:api.chooseTier(16.7,false),reduced:api.chooseTier(22,false),severe:api.chooseTier(31,false),longTask:api.chooseTier(16.7,true),a,b};
  });
  assert.deepEqual([pressure.normal,pressure.reduced,pressure.severe,pressure.longTask],["normal","reduced","severe","severe"]);
  assert.equal(pressure.a.error_fingerprint,pressure.b.error_fingerprint,"cache query strings must not fragment client-error fingerprints");
  assert.ok(pressure.a.error_message.length<=180&&pressure.a.source.length<=120,"fault telemetry must remain bounded");

  console.log("[r47 all-mode] Solo runtime keeps gameplay arrays intact while shedding only disposable visuals");
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof playMode!=="undefined"&&playMode==="solo");
  const trim=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R47AllModeOptimisation;
    const original={particles:particles.length,rings:rings.length,floaters:floaters.length,bullets:bullets.length,enemyBullets:enemyBullets.length,hazards:hazards.length,enemies:host?.enemies?.length||0};
    for(let i=0;i<900;i++)particles.push({});
    for(let i=0;i<180;i++)rings.push({});
    for(let i=0;i<180;i++)floaters.push({});
    const removed=api.trimDecorativeVisuals("solo","severe");
    const after={particles:particles.length,rings:rings.length,floaters:floaters.length,bullets:bullets.length,enemyBullets:enemyBullets.length,hazards:hazards.length,enemies:host?.enemies?.length||0};
    particles.length=original.particles;rings.length=original.rings;floaters.length=original.floaters;
    return{original,after,removed,diag:api.getDiagnostics()};
  });
  assert.ok(trim.removed>0,"severe pressure must remove excess decorative visuals");
  assert.equal(trim.after.bullets,trim.original.bullets,"player projectiles must never be trimmed by R47");
  assert.equal(trim.after.enemyBullets,trim.original.enemyBullets,"enemy projectiles must never be trimmed by R47");
  assert.equal(trim.after.hazards,trim.original.hazards,"gameplay hazards must never be trimmed by R47");
  assert.equal(trim.after.enemies,trim.original.enemies,"enemy simulation count must never be trimmed by R47");

  console.log("[r47 all-mode] pause/resume and resize abuse remain stable under the governor");
  await page.keyboard.press("KeyP");
  await page.waitForFunction(()=>typeof mode!=="undefined"&&mode==="paused");
  await page.locator("#resume-btn").click();
  await page.waitForFunction(()=>typeof mode!=="undefined"&&mode==="playing");
  for(const size of [{width:1024,height:720},{width:1920,height:1080},{width:1280,height:800},{width:1600,height:900}]){
    await page.setViewportSize(size);await page.waitForTimeout(90);
  }

  console.log("[r47 all-mode] Split Screen starts with the same governor and keeps a dedicated budget");
  await page.evaluate(()=>quitToMenu());
  await page.waitForFunction(()=>typeof mode!=="undefined"&&mode==="menu");
  await page.locator("#split-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof playMode!=="undefined"&&playMode==="split");
  await page.waitForTimeout(500);
  const split=await page.evaluate(()=>({mode:window.CCGLostSizzlerV141R47AllModeOptimisation.snapshot().mode,hasP2:Boolean(p2),tier:document.body.dataset.v141R47PerformanceTier}));
  assert.equal(split.mode,"split");assert.equal(split.hasP2,true);assert.ok(["normal","reduced","severe"].includes(split.tier));

  console.log("[r47 all-mode] bounded soak cycles diagnostics without installing extra gameplay ownership");
  const soak=await page.evaluate(async()=>{
    const api=window.CCGLostSizzlerV141R47AllModeOptimisation,modes=["solo","split","daily","tutorial","dungeon","horde-survivor","sizzler-saboteurs"];
    const start=performance.now();let snapshots=0;
    while(performance.now()-start<3500){for(const name of modes){api.budgets(name,api.state.tier);api.snapshot();snapshots++}await new Promise(resolve=>setTimeout(resolve,40))}
    return{snapshots,diag:api.getDiagnostics(),loopGuard:Boolean(window.loop?.__ccgV141R29Stable),networkOwner:Boolean(window.net?.send?.__ccgV141R47AllModeOptimisation)};
  });
  assert.ok(soak.snapshots>=100,`bounded soak must exercise repeated all-mode diagnostic cycles: ${JSON.stringify(soak)}`);
  assert.equal(soak.loopGuard,true,"R47 must leave the existing stable RAF owner intact");
  assert.equal(soak.networkOwner,false,"R47 must not wrap multiplayer transport");

  assert.deepEqual(crashes,[],`Chromium must not crash during R47 all-mode coverage: ${crashes.join("\n")}`);
  assert.deepEqual(errors,[],`R47 all-mode coverage must not emit uncaught page errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.41 r47 all-mode governor, gameplay-ownership, Split/Solo and bounded-soak checks passed in Chromium.");
  await context.close();
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
  for(const socket of sockets)socket.destroy();
}
