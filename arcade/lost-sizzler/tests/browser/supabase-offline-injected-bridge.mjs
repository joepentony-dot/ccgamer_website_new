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
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});
      res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});

await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const gameUrl=`${origin}/arcade/lost-sizzler/`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.addInitScript(()=>{
    const client={id:"must-never-be-returned"};
    const bridge={
      async getClient(){
        window.__ccgInjectedOfflineGetClientCalls=(window.__ccgInjectedOfflineGetClientCalls||0)+1;
        return client
      }
    };
    window.__ccgInjectedOfflineClient=client;
    window.__ccgInjectedOfflineBridge=bridge;
    window.__ccgInjectedOfflineGetClientCalls=0;
    window.ccgSupabase=bridge;
    window.__CCG_LOST_SIZZLER_DELIVERY__={
      mode:"desktop-offline",
      versionManifestUrl:"/arcade/lost-sizzler/version.json"
    };
  });

  const page=await context.newPage();
  page.setDefaultTimeout(45000);
  const pageErrors=[];
  const remoteRequests=[];
  page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  page.on("request",request=>{
    const url=request.url();
    if(/\/js\/ccg-supabase-(?:config|client)\.js(?:\?|$)/i.test(url)||/\.supabase\.co(?:\/|$)/i.test(url))remoteRequests.push(url)
  });

  await page.goto(gameUrl,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerOnlineServices));
  await page.waitForFunction(()=>Boolean(window.CCGNetwork?.RoomNetwork?.prototype?.__ccgOnlineServicesGateBridge));
  await page.waitForTimeout(300);

  const contract=await page.evaluate(async()=>{
    const quarantinedBridge=window.ccgSupabase;
    const directClient=await quarantinedBridge?.getClient?.();
    const networkClient=await window.CCGNetwork.RoomNetwork.prototype.getSupabase.call({});
    let activationError="";
    try{await window.CCGLostSizzlerOnlineServices.activate("offline-injected-bridge-regression")}
    catch(error){activationError=String(error?.message||error)}

    const feedback=document.createElement("form");
    feedback.id="v104-feedback-form";
    let feedbackUnderlying=false;
    feedback.addEventListener("submit",event=>{event.preventDefault();feedbackUnderlying=true});
    document.body.appendChild(feedback);
    feedback.dispatchEvent(new Event("submit",{bubbles:true,cancelable:true}));

    const ratingPanel=document.createElement("div");
    ratingPanel.id="ccg-rating-panel";
    const rating=document.createElement("button");
    rating.type="button";
    rating.dataset.rating="5";
    let ratingUnderlying=false;
    rating.addEventListener("click",()=>{ratingUnderlying=true});
    ratingPanel.appendChild(rating);
    document.body.appendChild(ratingPanel);
    rating.click();

    await new Promise(resolve=>setTimeout(resolve,120));
    feedback.remove();
    ratingPanel.remove();

    return{
      bridgeReplaced:quarantinedBridge!==window.__ccgInjectedOfflineBridge,
      offlineStub:Boolean(quarantinedBridge?.__ccgLostSizzlerOfflineStub),
      directClientNull:directClient===null,
      networkClientNull:networkClient===null,
      activationError,
      feedbackUnderlying,
      ratingUnderlying,
      originalGetClientCalls:Number(window.__ccgInjectedOfflineGetClientCalls||0),
      active:Boolean(window.CCGLostSizzlerOnlineServices?.state?.active),
      onlineEnabled:window.CCGLostSizzlerDelivery?.onlineEnabled
    }
  });

  assert.deepEqual(pageErrors,[],`desktop-offline injected-bridge regression must have no page errors: ${pageErrors.join("\n")}`);
  assert.deepEqual(remoteRequests,[],`desktop-offline injected-bridge regression must make no Supabase request: ${remoteRequests.join("\n")}`);
  assert.equal(contract.onlineEnabled,false,"desktop-offline must expose onlineEnabled=false");
  assert.equal(contract.bridgeReplaced,true,"desktop-offline must replace a pre-injected online-services bridge");
  assert.equal(contract.offlineStub,true,"desktop-offline replacement bridge must be the containment offline stub");
  assert.equal(contract.directClientNull,true,"desktop-offline bridge getClient must resolve to null");
  assert.equal(contract.networkClientNull,true,"RoomNetwork.getSupabase must resolve to null in desktop-offline even when a bridge was injected before boot");
  assert.match(contract.activationError,/disabled in this desktop build/i,"desktop-offline direct activation must fail closed");
  assert.equal(contract.feedbackUnderlying,false,"desktop-offline Feedback Submit must not reach a legacy submit handler when a bridge was injected before boot");
  assert.equal(contract.ratingUnderlying,false,"desktop-offline rating submission must not reach a legacy click handler when a bridge was injected before boot");
  assert.equal(contract.originalGetClientCalls,0,"the quarantined pre-injected bridge must never be consulted in desktop-offline");
  assert.equal(contract.active,false,"desktop-offline must remain inactive after all blocked online actions");

  console.log("Lost Sizzler desktop-offline injected Supabase bridge quarantine passed in Chromium.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
