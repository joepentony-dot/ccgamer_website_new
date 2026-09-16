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

async function auditPage(context,label){
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  const pageErrors=[],failedScripts=[];
  page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.(?:js|mjs)(?:\?|$)/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});
  await page.goto(`${origin}/arcade/lost-sizzler/?v142-demo-paywall=${label}`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142DemoPaywall));
  return{page,pageErrors,failedScripts};
}

async function waitForDemoGuards(page){
  await page.waitForFunction(()=>{
    const api=window.CCGLostSizzlerV142DemoPaywall;
    const ids=["solo-btn","split-btn","daily-btn","continue-save-btn"];
    const present=ids.filter(id=>Boolean(document.getElementById(id)));
    return document.body.dataset.v142DemoLocked==="true"&&!document.getElementById("create-btn")&&!document.getElementById("join-btn")&&!document.getElementById("horde-mode-btn")&&!document.getElementById("saboteurs-mode-btn")&&present.length===4&&api?.diagnostics().guardedCount===present.length;
  });
}

async function closeDemoOffer(page){
  await page.evaluate(()=>document.querySelector("#v142-demo-paywall [data-later]")?.click());
  await page.waitForFunction(()=>document.getElementById("v142-demo-paywall")?.classList.contains("hidden")===true);
}

try{
  const normalContext=await browser.newContext({viewport:{width:1280,height:800}});
  const normal=await auditPage(normalContext,"normal");
  const normalAudit=await normal.page.evaluate(()=>({
    demoMode:window.CCGLostSizzlerV142DemoPaywall.demoMode,
    locked:document.body.dataset.v142DemoLocked||"",
    badges:document.querySelectorAll(".v142-demo-lock-badge").length,
    guarded:window.CCGLostSizzlerV142DemoPaywall.diagnostics().guardedCount,
    diagnosticsFrozen:Object.isFrozen(window.CCGLostSizzlerV142DemoPaywall.diagnostics()),
    directUnlock:typeof window.CCGLostSizzlerV142DemoPaywall.unlockRuntime,
    mutableState:typeof window.CCGLostSizzlerV142DemoPaywall.state,
    overlayHidden:document.getElementById("v142-demo-paywall")?.classList.contains("hidden")===true,
    tutorialBadge:Boolean(document.querySelector("#tutorial-zone-btn .v142-demo-lock-badge"))
  }));
  assert.equal(normalAudit.demoMode,false,"Normal canonical V10.42 play must not enter demo lock unless the wrapper explicitly opts in.");
  assert.notEqual(normalAudit.locked,"true","Normal canonical play must leave full-game controls unlocked.");
  assert.equal(normalAudit.guarded,0,"Normal canonical play must not install demo interception handlers on full-game buttons.");
  assert.equal(normalAudit.badges,0,"Normal canonical play must not add FULL GAME badges to controls.");
  assert.equal(normalAudit.diagnosticsFrozen,true,"Public paywall diagnostics must be immutable snapshots.");
  assert.equal(normalAudit.directUnlock,"undefined","The internal entitlement unlock function must not be browser-callable.");
  assert.equal(normalAudit.mutableState,"undefined","Mutable entitlement state must not be exported to browser callers.");
  assert.equal(normalAudit.overlayHidden,true,"Permanent-unlock overlay must remain hidden during an ordinary full-game boot.");
  assert.equal(normalAudit.tutorialBadge,false,"Tutorial must never be presented as a paid full-game control.");
  assert.deepEqual(normal.pageErrors,[],`Normal V10.42 paywall boot must not raise page errors: ${normal.pageErrors.join("\n")}`);
  assert.deepEqual(normal.failedScripts,[],`Normal V10.42 paywall scripts must load without same-origin failures: ${normal.failedScripts.join("\n")}`);
  await normalContext.close();

  const hostileOfferContext=await browser.newContext({viewport:{width:1280,height:800}});
  await hostileOfferContext.addInitScript(()=>{
    window.CCG_LOST_SIZZLER_DEMO_MODE=true;
    window.CCGLostSizzlerCommerce={isAuthenticated:async()=>false,getOffer:async()=>({display_price:'£1<img id="v142-offer-xss">'})};
  });
  const hostile=await auditPage(hostileOfferContext,"hostile-offer");
  await waitForDemoGuards(hostile.page);
  await hostile.page.evaluate(()=>document.getElementById("solo-btn").click());
  await hostile.page.waitForFunction(()=>!document.getElementById("v142-demo-paywall")?.classList.contains("hidden"));
  const hostileAudit=await hostile.page.evaluate(()=>({
    price:document.querySelector("#v142-demo-paywall .v142-price")?.textContent||"",
    injected:Boolean(document.querySelector("#v142-demo-paywall #v142-offer-xss"))
  }));
  assert.match(hostileAudit.price,/£1<img id="v142-offer-xss"> ONE-OFF/,"Commerce offer text should remain visible as literal text after sanitization.");
  assert.equal(hostileAudit.injected,false,"Commerce-controlled offer text must not create HTML elements inside the paywall.");
  assert.deepEqual(hostile.pageErrors,[],`Hostile-offer rendering must not raise page errors: ${hostile.pageErrors.join("\n")}`);
  assert.deepEqual(hostile.failedScripts,[],`Hostile-offer rendering must not create same-origin script load failures: ${hostile.failedScripts.join("\n")}`);
  await hostileOfferContext.close();

  const callbackContext=await browser.newContext({viewport:{width:1280,height:800}});
  await callbackContext.addInitScript(()=>{
    window.CCG_LOST_SIZZLER_DEMO_MODE=true;
    window.CCGLostSizzlerCommerce={
      isAuthenticated:async()=>true,
      openPayPalCheckout:async()=>({entitlement:{kind:"permanent",active:true}}),
      getEntitlement:async()=>null
    };
  });
  const callback=await auditPage(callbackContext,"callback-only");
  await waitForDemoGuards(callback.page);
  await callback.page.evaluate(()=>document.getElementById("solo-btn").click());
  await callback.page.waitForFunction(()=>Boolean(document.querySelector("#v142-demo-paywall [data-paypal]")));
  await callback.page.evaluate(()=>document.querySelector("#v142-demo-paywall [data-paypal]")?.click());
  await callback.page.waitForFunction(()=>/Purchase was not verified/i.test(document.querySelector("#v142-demo-paywall .v142-status")?.textContent||""));
  const callbackAudit=await callback.page.evaluate(()=>({
    entitled:window.CCGLostSizzlerV142DemoPaywall.diagnostics().entitled,
    locked:document.body.dataset.v142DemoLocked,
    guarded:window.CCGLostSizzlerV142DemoPaywall.diagnostics().guardedCount,
    owned:Boolean(document.querySelector("#v142-demo-paywall .v142-owned")),
    status:document.querySelector("#v142-demo-paywall .v142-status")?.textContent||""
  }));
  assert.equal(callbackAudit.entitled,false,"A checkout callback claiming permanent ownership must not set entitlement without a fresh provider read.");
  assert.equal(callbackAudit.locked,"true","Callback-only purchase data must leave demo mode locked.");
  assert.equal(callbackAudit.guarded,4,"Callback-only purchase data must retain all four DOM-backed supported full-game guards until entitlement is verified.");
  assert.equal(callbackAudit.owned,false,"Callback-only purchase data must not render the full-game-owned state.");
  assert.match(callbackAudit.status,/Purchase was not verified/i,"Callback-only purchase data must report verification failure.");
  assert.deepEqual(callback.pageErrors,[],`Callback-only checkout verification must not raise page errors: ${callback.pageErrors.join("\n")}`);
  assert.deepEqual(callback.failedScripts,[],`Callback-only checkout verification must not create same-origin script load failures: ${callback.failedScripts.join("\n")}`);
  await callbackContext.close();

  const demoContext=await browser.newContext({viewport:{width:1280,height:800}});
  await demoContext.addInitScript(()=>{window.CCG_LOST_SIZZLER_DEMO_MODE=true});
  const demo=await auditPage(demoContext,"demo");
  await waitForDemoGuards(demo.page);
  const lockedAudit=await demo.page.evaluate(()=>({
    demoMode:window.CCGLostSizzlerV142DemoPaywall.demoMode,
    locked:document.body.dataset.v142DemoLocked,
    badges:document.querySelectorAll(".v142-demo-lock-badge").length,
    guarded:window.CCGLostSizzlerV142DemoPaywall.diagnostics().guardedCount,
    tutorialBadge:Boolean(document.querySelector("#tutorial-zone-btn .v142-demo-lock-badge")),
    resumeBadge:Boolean(document.querySelector("#continue-save-btn .v142-demo-lock-badge")),
    retiredCreatePresent:Boolean(document.getElementById("create-btn")),
    retiredJoinPresent:Boolean(document.getElementById("join-btn")),
    runActive:document.body.dataset.runActive
  }));
  assert.equal(lockedAudit.demoMode,true,"Explicit demo mode must activate the V10.42 permanent-unlock boundary.");
  assert.equal(lockedAudit.locked,"true","Demo mode must mark the full-game runtime as locked.");
  assert.equal(lockedAudit.guarded,4,"Demo guard registry must retain the four DOM-backed supported full-game controls until entitlement is verified.");
  assert.equal(lockedAudit.badges,4,"Every DOM-backed supported demo guard must retain one FULL GAME badge until entitlement is verified.");
  assert.equal(lockedAudit.tutorialBadge,false,"The free Tutorial must remain outside the paid-control guard set.");
  assert.equal(lockedAudit.resumeBadge,true,"A visible saved-run Resume control must remain behind the demo entitlement boundary.");
  assert.equal(lockedAudit.retiredCreatePresent,false,"Retired Dungeon Multiplayer entry must remain physically absent in demo mode.");
  assert.equal(lockedAudit.retiredJoinPresent,false,"Retired Room-code Join must remain physically absent in demo mode.");

  await demo.page.evaluate(()=>document.getElementById("solo-btn").click());
  await demo.page.waitForFunction(()=>!document.getElementById("v142-demo-paywall")?.classList.contains("hidden"));
  const offerAudit=await demo.page.evaluate(()=>({
    shown:window.CCGLostSizzlerV142DemoPaywall.diagnostics().shown,
    title:document.querySelector("#v142-demo-paywall h2")?.textContent||"",
    price:document.querySelector("#v142-demo-paywall .v142-price")?.textContent||"",
    account:document.querySelector("#v142-demo-paywall .v142-account-note")?.textContent||"",
    paypalButtons:document.querySelectorAll("#v142-demo-paywall [data-paypal]").length,
    loginHref:document.querySelector("#v142-demo-paywall .v142-login")?.getAttribute("href")||"",
    registerHref:document.querySelector("#v142-demo-paywall .v142-register")?.getAttribute("href")||"",
    runActive:document.body.dataset.runActive
  }));
  assert.equal(offerAudit.shown,true,"A guarded full-game click must present the permanent-unlock screen.");
  assert.match(offerAudit.title,/Unlock The Lost Sizzler permanently/i,"Demo offer must describe a permanent Lost Sizzler unlock.");
  assert.match(offerAudit.price,/£1\.99 ONE-OFF/i,"Demo offer must retain the draft £1.99 one-off launch presentation.");
  assert.match(offerAudit.account,/SIGN IN OR CREATE A CCG ACCOUNT TO CONTINUE/i,"Signed-out demo users must be directed through account access before checkout.");
  assert.equal(offerAudit.paypalButtons,0,"Signed-out demo users must not receive a direct PayPal purchase button.");
  assert.match(offerAudit.loginHref,/^\/auth\/login\.html\?returnTo=/,"Demo sign-in must preserve the Lost Sizzler purchase return target.");
  assert.match(offerAudit.registerHref,/^\/auth\/register\.html\?returnTo=/,"Demo registration must preserve the Lost Sizzler purchase return target.");
  assert.notEqual(offerAudit.runActive,"true","The intercepted Solo click must not start paid gameplay underneath the unlock screen.");
  await closeDemoOffer(demo.page);

  await demo.page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142ZeroServerRelease));
  const retiredOnlineAudit=await demo.page.evaluate(()=>{
    const zero=window.CCGLostSizzlerV142ZeroServerRelease;
    return{
      zeroServer:Boolean(zero?.enabled),
      releaseModel:document.body.dataset.releaseModel||"",
      onlineMultiplayer:document.body.dataset.onlineMultiplayer||"",
      createPresent:Boolean(document.getElementById("create-btn")),
      joinPresent:Boolean(document.getElementById("join-btn")),
      roomCodePresent:Boolean(document.getElementById("room-code")),
      lobbyPresent:Boolean(document.getElementById("online-lobby")),
      overlayHidden:document.getElementById("v142-demo-paywall")?.classList.contains("hidden")===true,
      runActive:document.body.dataset.runActive
    };
  });
  assert.equal(retiredOnlineAudit.zeroServer,true,"V10.42 zero-server release must remain authoritative for retired online entry points.");
  assert.equal(retiredOnlineAudit.releaseModel,"zero-server-cost","Online entry retirement must remain part of the zero-server-cost release model.");
  assert.equal(retiredOnlineAudit.onlineMultiplayer,"disabled","Online multiplayer must remain disabled in the zero-server release.");
  assert.equal(retiredOnlineAudit.createPresent,false,"Dungeon Multiplayer entry must remain physically absent from the rendered release UI.");
  assert.equal(retiredOnlineAudit.joinPresent,false,"Room-code Join must remain physically absent from the rendered release UI.");
  assert.equal(retiredOnlineAudit.roomCodePresent,false,"Retired room-code input must remain physically absent from the rendered release UI.");
  assert.equal(retiredOnlineAudit.lobbyPresent,false,"Retired online lobby must remain physically absent from the rendered release UI.");
  assert.equal(retiredOnlineAudit.overlayHidden,true,"Retired online entry removal must not open the permanent-unlock overlay.");
  assert.notEqual(retiredOnlineAudit.runActive,"true","Retired online entry removal must never start online gameplay.");

  await demo.page.evaluate(()=>{const button=document.getElementById("continue-save-btn");button.classList.remove("hidden");button.click()});
  await demo.page.waitForFunction(()=>!document.getElementById("v142-demo-paywall")?.classList.contains("hidden"));
  assert.notEqual(await demo.page.evaluate(()=>document.body.dataset.runActive),"true","Saved-run Resume must be intercepted before paid gameplay can start in demo mode.");
  await closeDemoOffer(demo.page);

  const entitlementAudit=await demo.page.evaluate(async()=>{
    const api=window.CCGLostSizzlerV142DemoPaywall;
    window.CCGLostSizzlerCommerce={getEntitlement:async()=>({kind:"subscription",active:true})};
    const rejected=await api.refreshEntitlement(),rejectedSnapshot=api.diagnostics(),stillLocked=document.body.dataset.v142DemoLocked;
    window.CCGLostSizzlerCommerce={getEntitlement:async()=>({kind:"permanent",active:true})};
    const accepted=await api.refreshEntitlement(),acceptedSnapshot=api.diagnostics();
    return{
      rejected,stillLocked,accepted,
      rejectedEntitled:rejectedSnapshot.entitled,
      entitled:acceptedSnapshot.entitled,
      diagnosticsFrozen:Object.isFrozen(acceptedSnapshot),
      directUnlock:typeof api.unlockRuntime,
      mutableState:typeof api.state,
      fullGameEntitled:document.body.dataset.fullGameEntitled,
      locked:document.body.dataset.v142DemoLocked,
      guarded:acceptedSnapshot.guardedCount,
      badges:document.querySelectorAll(".v142-demo-lock-badge").length
    };
  });
  assert.equal(entitlementAudit.rejected,false,"A non-permanent commerce-provider entitlement must not unlock the full game.");
  assert.equal(entitlementAudit.rejectedEntitled,false,"Rejected provider entitlement data must leave internal ownership false.");
  assert.equal(entitlementAudit.stillLocked,"true","Rejected provider entitlement data must leave the demo runtime locked.");
  assert.equal(entitlementAudit.accepted,true,"A permanent entitlement returned through the commerce-provider path must unlock the runtime.");
  assert.equal(entitlementAudit.entitled,true,"Accepted provider ownership must be retained by internal paywall state.");
  assert.equal(entitlementAudit.diagnosticsFrozen,true,"Entitlement diagnostics must remain immutable after ownership changes.");
  assert.equal(entitlementAudit.directUnlock,"undefined","Browser callers must not receive a direct unlockRuntime function.");
  assert.equal(entitlementAudit.mutableState,"undefined","Browser callers must not receive the mutable entitlement state object.");
  assert.equal(entitlementAudit.fullGameEntitled,"true","Accepted permanent ownership must mark the canonical runtime as entitled.");
  assert.equal(entitlementAudit.locked,"false","Accepted permanent ownership must release the demo lock.");
  assert.equal(entitlementAudit.guarded,0,"Accepted permanent ownership must remove demo interception handlers.");
  assert.equal(entitlementAudit.badges,0,"Accepted permanent ownership must remove FULL GAME badges.");
  assert.deepEqual(demo.pageErrors,[],`Demo-mode V10.42 paywall flow must not raise page errors: ${demo.pageErrors.join("\n")}`);
  assert.deepEqual(demo.failedScripts,[],`Demo-mode V10.42 paywall scripts must load without same-origin failures: ${demo.failedScripts.join("\n")}`);
  console.log("Lost Sizzler V10.42 explicit demo lock, safe offer rendering, post-checkout verification, provider-bound entitlement, resume guard and physical zero-server online-entry retirement browser contract passed.");
  await demoContext.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}