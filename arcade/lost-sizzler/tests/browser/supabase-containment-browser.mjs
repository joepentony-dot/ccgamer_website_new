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
    const url=new URL(req.url,"http://local");
    const pathname=decodeURIComponent(url.pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
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
const gameUrl=`${origin}/arcade/lost-sizzler/`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

function supabaseRequest(url){
  return /\/js\/ccg-supabase-(?:config|client)\.js(?:\?|$)/i.test(url)||/\.supabase\.co(?:\/|$)/i.test(url);
}

async function auditPage(page,label){
  page.setDefaultTimeout(45000);
  const pageErrors=[];
  const failedScripts=[];
  const remoteRequests=[];
  page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  page.on("request",request=>{if(supabaseRequest(request.url()))remoteRequests.push(request.url())});
  page.on("requestfailed",request=>{
    try{
      const url=new URL(request.url());
      if(url.origin===origin&&/\.(?:js|mjs)(?:\?|$)/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)
    }catch(_){}
  });
  await page.goto(gameUrl,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&document.body.dataset.releaseReady==="true");
  await page.waitForTimeout(1200);
  assert.deepEqual(pageErrors,[],`${label}: no uncaught page errors are allowed: ${pageErrors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`${label}: all same-origin game JavaScript must load: ${failedScripts.join("\n")}`);
  return{pageErrors,failedScripts,remoteRequests}
}

async function mockFullscreen(page){
  await page.addInitScript(()=>{
    let element=null;
    Object.defineProperty(document,"fullscreenElement",{configurable:true,get:()=>element});
    Element.prototype.requestFullscreen=function(){element=this;document.dispatchEvent(new Event("fullscreenchange"));return Promise.resolve()};
    document.exitFullscreen=()=>{element=null;document.dispatchEvent(new Event("fullscreenchange"));return Promise.resolve()};
  });
}

try{
  {
    const context=await browser.newContext({viewport:{width:1440,height:900}});
    const page=await context.newPage();
    const audit=await auditPage(page,"web local-first boot");
    assert.deepEqual(audit.remoteRequests,[],`web local-first boot must not request Supabase before an explicit online feature: ${audit.remoteRequests.join("\n")}`);
    assert.equal(await page.evaluate(()=>window.CCGLostSizzlerDelivery?.mode),"web","normal website delivery must default to web mode");
    assert.equal(await page.evaluate(()=>window.CCGLostSizzlerOnlineServices?.state?.active),false,"normal website boot must leave online services inactive");
    assert.ok(await page.locator("#solo-btn").isEnabled(),"web local-first boot must keep Solo available");
    assert.ok(await page.locator("#tutorial-zone-btn").isEnabled(),"web local-first boot must keep Tutorial available");
    assert.ok(await page.locator("#split-btn").isEnabled(),"web local-first boot must keep 2P Split Screen available");
    await context.close();
  }

  {
    const context=await browser.newContext({viewport:{width:1440,height:900}});
    await context.addInitScript(()=>{
      window.__CCG_LOST_SIZZLER_DELIVERY__={
        mode:"desktop-offline",
        versionManifestUrl:"/arcade/lost-sizzler/version.json",
        exitGame(){window.__ccgDesktopExitCount=(window.__ccgDesktopExitCount||0)+1}
      };
    });
    const page=await context.newPage();
    await mockFullscreen(page);
    const audit=await auditPage(page,"desktop-offline");
    assert.deepEqual(audit.remoteRequests,[],`desktop-offline must not request Supabase: ${audit.remoteRequests.join("\n")}`);
    assert.equal(await page.locator("html").getAttribute("data-ccg-delivery-mode"),"desktop-offline","desktop-offline mode must be exposed on the document");
    assert.equal(await page.evaluate(()=>window.CCGLostSizzlerDelivery?.onlineEnabled),false,"desktop-offline must report online services disabled");
    for(const id of ["daily-btn","create-btn","horde-mode-btn","saboteurs-mode-btn","join-btn"]){
      assert.equal(await page.locator(`#${id}`).isDisabled(),true,`desktop-offline must disable #${id}`)
    }
    assert.equal(await page.locator("#room-code").isDisabled(),true,"desktop-offline must disable room-code input");
    assert.equal(await page.locator("#weekly-auth-actions").isHidden(),true,"desktop-offline must hide website authentication actions");
    assert.equal(await page.locator(".online-howto").isHidden(),true,"desktop-offline must hide online multiplayer instructions");
    assert.ok(await page.locator("#solo-btn").isEnabled(),"desktop-offline must keep Solo available");
    assert.ok(await page.locator("#tutorial-zone-btn").isEnabled(),"desktop-offline must keep Tutorial available");
    assert.ok(await page.locator("#split-btn").isEnabled(),"desktop-offline must keep 2P Split Screen available");

    const activationError=await page.evaluate(async()=>{
      try{await window.CCGLostSizzlerOnlineServices.activate("browser-containment-contract");return"NO_ERROR"}
      catch(error){return String(error?.message||error)}
    });
    assert.match(activationError,/disabled in this desktop build/i,"desktop-offline must refuse direct online-service activation");

    await page.evaluate(()=>{
      const daily=document.getElementById("daily-btn");
      const auth=document.getElementById("weekly-auth-actions");
      daily.disabled=false;
      daily.removeAttribute("aria-disabled");
      auth.hidden=false;
      auth.classList.remove("hidden");
      window.dispatchEvent(new Event("ccg:auth-changed"));
    });
    await page.waitForFunction(()=>{
      const daily=document.getElementById("daily-btn"),auth=document.getElementById("weekly-auth-actions");
      return daily?.disabled===true&&auth?.hidden===true&&auth?.classList.contains("hidden")===true
    });

    const beforeExit=page.url();
    await page.locator(".menu-exit-link").first().click();
    await page.waitForFunction(()=>window.__ccgDesktopExitCount===1);
    assert.equal(page.url(),beforeExit,"desktop Exit must not navigate the packaged game page away from the game");

    await page.locator("#solo-btn").click();
    await page.waitForFunction(()=>document.body.dataset.runActive==="true");
    assert.equal(await page.evaluate(()=>window.CCGLostSizzlerOnlineServices?.state?.active),false,"offline Solo must not activate online services");
    assert.deepEqual(audit.remoteRequests,[],`offline Solo must still make no Supabase request: ${audit.remoteRequests.join("\n")}`);
    await context.close();
  }

  {
    const context=await browser.newContext({viewport:{width:1440,height:900}});
    await context.addInitScript(()=>{
      const client={
        functions:{invoke:async()=>({data:{ok:false,error:"browser containment offline stub"},error:null})}
      };
      window.__ccgInjectedClient=client;
      window.ccgSupabase={getClient:async()=>client};
      window.__CCG_LOST_SIZZLER_DELIVERY__={
        mode:"desktop-online",
        versionManifestUrl:"/arcade/lost-sizzler/version.json",
        openExternal(url,meta){window.__ccgOpenedExternal={url,reason:meta?.reason||""}},
        exitGame(){window.__ccgDesktopExitCount=(window.__ccgDesktopExitCount||0)+1}
      };
    });
    const page=await context.newPage();
    const audit=await auditPage(page,"desktop-online injected bridge");
    assert.deepEqual(audit.remoteRequests,[],`desktop-online with an injected bridge must not load website Supabase scripts or contact Supabase during boot: ${audit.remoteRequests.join("\n")}`);
    assert.equal(await page.locator("html").getAttribute("data-ccg-delivery-mode"),"desktop-online","desktop-online mode must be exposed on the document");
    assert.equal(await page.locator("#create-btn").isDisabled(),false,"an injected bridge must count as configured online services");
    assert.equal(await page.locator("#room-code").isDisabled(),false,"an injected bridge must leave room-code input available");

    const activated=await page.evaluate(async()=>{
      const client=await window.CCGLostSizzlerOnlineServices.activate("browser-containment-contract");
      return{same:client===window.__ccgInjectedClient,state:window.CCGLostSizzlerOnlineServices.state}
    });
    assert.equal(activated.same,true,"desktop-online activation must reuse the injected service client");
    assert.equal(activated.state.active,true,"desktop-online injected bridge must mark online services active");
    assert.deepEqual(audit.remoteRequests,[],`activating an injected bridge must not load Supabase scripts: ${audit.remoteRequests.join("\n")}`);

    const beforeAuth=page.url();
    await page.locator("#weekly-auth-actions a").first().click();
    await page.waitForFunction(()=>Boolean(window.__ccgOpenedExternal?.url));
    const external=await page.evaluate(()=>window.__ccgOpenedExternal);
    assert.match(external.url,/^https:\/\/www\.cheekycommodoregamer\.co\.uk\/auth\/register\.html\?/i,"desktop-online account action must open the real CCG website URL externally");
    assert.equal(external.reason,"account-auth","desktop-online account action must be identified as account authentication");
    assert.equal(page.url(),beforeAuth,"desktop-online account action must not replace the packaged game page");

    const beforeExit=page.url();
    await page.locator(".menu-exit-link").first().click();
    await page.waitForFunction(()=>window.__ccgDesktopExitCount===1);
    assert.equal(page.url(),beforeExit,"desktop-online Exit must use the wrapper exit hook instead of navigating away");
    await context.close();
  }

  console.log("Lost Sizzler Supabase containment Chromium delivery-mode checks passed.");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
