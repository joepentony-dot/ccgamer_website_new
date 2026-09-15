import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".mjs":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".svg":"image/svg+xml",
  ".webp":"image/webp",
  ".png":"image/png",
  ".jpg":"image/jpeg",
  ".jpeg":"image/jpeg",
  ".ogg":"audio/ogg",
  ".mp3":"audio/mpeg",
  ".wav":"audio/wav"
};

const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local"),pathname=decodeURIComponent(url.pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
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

async function auditPage(context,label){
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  const pageErrors=[],failedScripts=[];
  page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.(?:js|mjs)(?:\?|$)/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});
  await page.goto(`${origin}/arcade/lost-sizzler/?v142-trial-compat=${label}`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142DemoPaywall));
  return{page,pageErrors,failedScripts};
}

function assertCleanRuntime(result,label){
  assert.deepEqual(result.pageErrors,[],`${label} must not raise page errors: ${result.pageErrors.join("\n")}`);
  assert.deepEqual(result.failedScripts,[],`${label} must not create same-origin script load failures: ${result.failedScripts.join("\n")}`);
}

try{
  const normalContext=await browser.newContext({viewport:{width:1280,height:800}});
  const normal=await auditPage(normalContext,"normal");
  const normalAudit=await normal.page.evaluate(()=>{
    const api=window.CCGLostSizzlerV142DemoPaywall,diagnostics=api.diagnostics();
    return{
      apiFrozen:Object.isFrozen(api),
      diagnosticsFrozen:Object.isFrozen(diagnostics),
      productSlug:api.productSlug,
      demoMode:api.demoMode,
      trialMode:api.trialMode,
      trialMs:api.trialMs,
      trialStarted:diagnostics.trialStarted,
      shown:diagnostics.shown,
      locked:document.body.dataset.v142DemoLocked||"",
      badges:document.querySelectorAll(".v142-demo-lock-badge").length,
      directUnlock:typeof api.unlockRuntime,
      mutableState:typeof api.state,
      overlayHidden:document.getElementById("v142-demo-paywall")?.classList.contains("hidden")===true
    };
  });
  assert.equal(normalAudit.apiFrozen,true,"Timed-trial public API must remain immutable.");
  assert.equal(normalAudit.diagnosticsFrozen,true,"Timed-trial diagnostics must remain immutable snapshots.");
  assert.equal(normalAudit.productSlug,"c64-dungeon-carnage","Timed-trial product identity must remain fixed.");
  assert.equal(normalAudit.demoMode,false,"The retired menu-button demo mode must remain disabled.");
  assert.equal(normalAudit.trialMode,true,"The canonical browser release must use the timed-trial model.");
  assert.equal(normalAudit.trialMs,120000,"The free browser trial must remain exactly two minutes.");
  assert.equal(normalAudit.trialStarted,false,"Loading the page alone must not consume trial time.");
  assert.equal(normalAudit.shown,false,"Loading the page alone must not show the permanent-unlock screen.");
  assert.notEqual(normalAudit.locked,"true","The retired demo menu lock must remain absent.");
  assert.equal(normalAudit.badges,0,"The retired FULL GAME menu badges must remain absent.");
  assert.equal(normalAudit.directUnlock,"undefined","The internal entitlement unlock function must not be browser-callable.");
  assert.equal(normalAudit.mutableState,"undefined","Mutable entitlement state must not be exported to browser callers.");
  assert.equal(normalAudit.overlayHidden,true,"The permanent-unlock overlay must remain hidden before expiry.");
  assertCleanRuntime(normal,"Normal timed-trial boot");
  await normalContext.close();

  const hostileContext=await browser.newContext({viewport:{width:1280,height:800}});
  await hostileContext.addInitScript(()=>{
    window.CCG_LOST_SIZZLER_DEMO_MODE=true;
    window.CCGLostSizzlerCommerce={
      isAuthenticated:async()=>false,
      getEntitlement:async()=>null,
      getOffer:async()=>({display_price:'£1<img id="v142-offer-xss">',checkout_configured:false})
    };
  });
  const hostile=await auditPage(hostileContext,"hostile-offer");
  await hostile.page.evaluate(()=>window.CCGLostSizzlerV142DemoPaywall.showPaywall({reason:"manual"}));
  await hostile.page.waitForFunction(()=>window.CCGLostSizzlerV142DemoPaywall.diagnostics().shown===true);
  const hostileAudit=await hostile.page.evaluate(()=>({
    demoMode:window.CCGLostSizzlerV142DemoPaywall.demoMode,
    price:document.querySelector("#v142-demo-paywall .v142-price")?.textContent||"",
    injected:Boolean(document.querySelector("#v142-demo-paywall #v142-offer-xss")),
    locked:document.body.dataset.v142DemoLocked||"",
    badges:document.querySelectorAll(".v142-demo-lock-badge").length,
    canClose:window.CCGLostSizzlerV142DemoPaywall.closePaywall(),
    overlayHidden:document.getElementById("v142-demo-paywall")?.classList.contains("hidden")===true
  }));
  assert.equal(hostileAudit.demoMode,false,"The obsolete demo-mode flag must not restore the retired menu-button gate.");
  assert.match(hostileAudit.price,/£1<img id="v142-offer-xss"> ONE-OFF/,"Commerce-controlled offer text should remain visible as literal text after sanitization.");
  assert.equal(hostileAudit.injected,false,"Commerce-controlled offer text must not create HTML inside the paywall.");
  assert.notEqual(hostileAudit.locked,"true","The obsolete demo-mode flag must not lock the runtime before trial expiry.");
  assert.equal(hostileAudit.badges,0,"The obsolete demo-mode flag must not restore legacy FULL GAME badges.");
  assert.equal(hostileAudit.canClose,true,"A non-expiry informational unlock screen must remain dismissible.");
  assert.equal(hostileAudit.overlayHidden,true,"Closing a non-expiry unlock screen must hide it.");
  assertCleanRuntime(hostile,"Hostile timed-trial offer rendering");
  await hostileContext.close();

  const expiredContext=await browser.newContext({viewport:{width:1280,height:800}});
  const expired=await auditPage(expiredContext,"expired");
  await expired.page.evaluate(()=>{
    localStorage.setItem("ccg-dungeon-carnage-trial-deadline-v2",String(Date.now()-1000));
    document.body.dataset.runActive="true";
  });
  await expired.page.waitForFunction(()=>{
    const d=window.CCGLostSizzlerV142DemoPaywall.diagnostics();
    return d.trialStarted===true&&d.expired===true&&d.shown===true;
  });
  const expiredAudit=await expired.page.evaluate(()=>({
    diagnostics:window.CCGLostSizzlerV142DemoPaywall.diagnostics(),
    trialExpired:document.body.dataset.v142TrialExpired,
    countdown:document.querySelector("#v142-trial-countdown [data-trial-time]")?.textContent||"",
    badgeExpired:document.getElementById("v142-trial-countdown")?.classList.contains("expired")===true,
    overlayHidden:document.getElementById("v142-demo-paywall")?.classList.contains("hidden")===true,
    laterButtons:document.querySelectorAll("#v142-demo-paywall [data-later]").length,
    closeResult:window.CCGLostSizzlerV142DemoPaywall.closePaywall()
  }));
  assert.equal(expiredAudit.diagnostics.remainingMs,0,"An already-expired stored deadline must have no reusable trial time.");
  assert.equal(expiredAudit.trialExpired,"true","Expired trial must mark the runtime as locked.");
  assert.equal(expiredAudit.countdown,"00:00","Expired trial countdown must stop at 00:00.");
  assert.equal(expiredAudit.badgeExpired,true,"Expired trial badge must retain its expired state.");
  assert.equal(expiredAudit.overlayHidden,false,"Expired trial must show the permanent-unlock screen.");
  assert.equal(expiredAudit.laterButtons,0,"Expired trial must not expose a NOT NOW bypass.");
  assert.equal(expiredAudit.closeResult,false,"Expired trial paywall must not be dismissible without entitlement.");
  assertCleanRuntime(expired,"Expired timed-trial lock");
  await expiredContext.close();

  const ownedContext=await browser.newContext({viewport:{width:1280,height:800}});
  await ownedContext.addInitScript(()=>{
    window.CCGLostSizzlerCommerce={
      isAuthenticated:async()=>true,
      getEntitlement:async()=>({kind:"permanent",active:true,download_ready:false}),
      getOffer:async()=>({display_price:"£1.99",checkout_configured:true})
    };
  });
  const owned=await auditPage(ownedContext,"owned");
  await owned.page.waitForFunction(()=>window.CCGLostSizzlerV142DemoPaywall.diagnostics().entitled===true);
  await owned.page.evaluate(()=>{document.body.dataset.runActive="true"});
  await owned.page.waitForTimeout(350);
  const ownedAudit=await owned.page.evaluate(()=>({
    diagnostics:window.CCGLostSizzlerV142DemoPaywall.diagnostics(),
    entitled:document.body.dataset.fullGameEntitled,
    trialExpired:document.body.dataset.v142TrialExpired,
    badgeHidden:document.getElementById("v142-trial-countdown")?.classList.contains("hidden")===true,
    overlayHidden:document.getElementById("v142-demo-paywall")?.classList.contains("hidden")===true
  }));
  assert.equal(ownedAudit.diagnostics.entitled,true,"Server-confirmed permanent ownership must unlock the browser game.");
  assert.equal(ownedAudit.diagnostics.trialStarted,false,"Owned accounts must bypass the two-minute trial clock.");
  assert.equal(ownedAudit.entitled,"true","Owned accounts must expose the full-game entitlement state.");
  assert.equal(ownedAudit.trialExpired,"false","Owned accounts must clear any trial-expired lock.");
  assert.equal(ownedAudit.badgeHidden,true,"Owned accounts must not see the trial countdown.");
  assert.equal(ownedAudit.overlayHidden,true,"Owned accounts must not be interrupted by a trial paywall during active play.");
  assertCleanRuntime(owned,"Owned-account timed-trial bypass");
  await ownedContext.close();

  console.log("C64 Dungeon Carnage timed-trial compatibility and paywall security browser contract passed.");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
