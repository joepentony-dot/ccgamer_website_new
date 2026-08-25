import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={
  ".html":"text/html; charset=utf-8", ".js":"text/javascript; charset=utf-8", ".mjs":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8", ".json":"application/json; charset=utf-8", ".svg":"image/svg+xml", ".webp":"image/webp",
  ".png":"image/png", ".jpg":"image/jpeg", ".jpeg":"image/jpeg", ".ogg":"audio/ogg", ".mp3":"audio/mpeg", ".wav":"audio/wav"
};

const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local");
    if(url.pathname==="/__ccg_test_setup"){
      res.writeHead(200,{"content-type":"text/html; charset=utf-8","cache-control":"no-store","connection":"close"});
      res.end("<!doctype html><meta charset=utf-8><title>CCG test setup</title>");
      return;
    }
    const pathname=decodeURIComponent(url.pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{"connection":"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store","connection":"close"});
      res.end(data);
    });
  }catch(error){res.writeHead(500,{"connection":"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});

await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(30000);
  const pageErrors=[],failedScripts=[],crashes=[];
  page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  page.on("crash",()=>crashes.push(`page crashed at ${new Date().toISOString()}`));
  page.on("requestfailed",request=>{
    try{const url=new URL(request.url());if(url.origin===origin&&/\.(?:js|mjs)(?:\?|$)/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}
  });

  await page.goto(`${origin}/__ccg_test_setup`,{waitUntil:"domcontentloaded"});
  await page.evaluate(async()=>{
    const cache=await caches.open("ccg-load-safety-test");
    await cache.put(new Request(`${location.origin}/arcade/lost-sizzler/js/v10-30-polish.js?v=STALE`),new Response("window.__STALE_LOST_SIZZLER__=true",{status:200,headers:{"content-type":"text/javascript"}}));
    await cache.put(new Request(`${location.origin}/unrelated-cache-test.txt`),new Response("keep-me",{status:200,headers:{"content-type":"text/plain"}}));
    localStorage.setItem("ccg-lost-sizzler:last-sanitised-cache","20260824-old-build");
  });

  async function loadAndAudit(iteration){
    await page.goto(`${origin}/arcade/lost-sizzler/?load-safety=${iteration}`,{waitUntil:"domcontentloaded"});
    await page.waitForSelector("#ccg-release-loading",{state:"visible"});
    await page.waitForFunction(()=>window.CCGLostSizzlerCacheGuard?.state?.done===true);
    await page.waitForFunction(()=>document.body.dataset.releaseReady==="true");
    await page.waitForFunction(()=>document.getElementById("ccg-release-loading")?.hidden===true);

    const audit=await page.evaluate(async()=>{
      const cache=await caches.open("ccg-load-safety-test");
      const stale=await cache.match(new Request(`${location.origin}/arcade/lost-sizzler/js/v10-30-polish.js?v=STALE`));
      const unrelated=await cache.match(new Request(`${location.origin}/unrelated-cache-test.txt`));
      const delay=await new Promise(resolve=>{const start=performance.now();setTimeout(()=>resolve(performance.now()-start),150)});
      return{
        releaseReady:document.body.dataset.releaseReady,
        cacheToken:document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content||"",
        storedToken:localStorage.getItem("ccg-lost-sizzler:last-sanitised-cache")||"",
        cacheGuard:{...window.CCGLostSizzlerCacheGuard.state,runtimeErrors:window.CCGLostSizzlerCacheGuard.runtimeErrors},
        watchdog:window.CCGLostSizzlerLoadWatchdog?{...window.CCGLostSizzlerLoadWatchdog.state}:null,
        staleStillCached:Boolean(stale),unrelatedStillCached:Boolean(unrelated),delay,
        loadingHidden:Boolean(document.getElementById("ccg-release-loading")?.hidden)
      };
    });

    assert.equal(audit.releaseReady,"true",`iteration ${iteration}: release gate must complete`);
    assert.equal(audit.cacheToken,"20260825r20",`iteration ${iteration}: current cache token must be r20`);
    assert.equal(audit.storedToken,"20260825r20",`iteration ${iteration}: successful sanitation must record r20`);
    assert.equal(audit.staleStillCached,false,`iteration ${iteration}: stale Lost Sizzler cache entry must be removed`);
    assert.equal(audit.unrelatedStillCached,true,`iteration ${iteration}: unrelated cached data must not be deleted`);
    assert.equal(audit.loadingHidden,true,`iteration ${iteration}: loading overlay must close after successful startup`);
    assert.equal(audit.watchdog?.finished,true,`iteration ${iteration}: loading watchdog must finish and detach after startup`);
    assert.equal(audit.watchdog?.timer,0,`iteration ${iteration}: watchdog interval must stop after startup`);
    assert.deepEqual(audit.cacheGuard.runtimeErrors,[],`iteration ${iteration}: no uncaught Lost Sizzler startup errors are allowed`);
    assert.ok(audit.delay<1200,`iteration ${iteration}: browser main thread appears stalled after loading (${Math.round(audit.delay)}ms for a 150ms timer)`);
    return audit;
  }

  const first=await loadAndAudit(1);
  assert.equal(first.cacheGuard.needed,true,"first visit from an old build must perform game-cache sanitation");
  assert.ok(first.cacheGuard.deletedEntries>=1,"first sanitation pass must remove the seeded stale Lost Sizzler entry");

  const second=await loadAndAudit(2);
  assert.equal(second.cacheGuard.needed,false,"second r20 visit must not repeatedly purge caches");

  const third=await loadAndAudit(3);
  assert.equal(third.cacheGuard.needed,false,"repeated current-build visits must stay out of cache-clean loops");

  assert.deepEqual(crashes,[],`Chromium must not crash while repeatedly loading The Lost Sizzler: ${crashes.join("\n")}`);
  assert.deepEqual(pageErrors,[],`The Lost Sizzler must have no uncaught page errors during repeated startup: ${pageErrors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`All same-origin game JavaScript must load successfully: ${failedScripts.join("\n")}`);
  console.log("Lost Sizzler V10.41 r20 repeated Chromium load, cache sanitation and main-thread responsiveness checks passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}