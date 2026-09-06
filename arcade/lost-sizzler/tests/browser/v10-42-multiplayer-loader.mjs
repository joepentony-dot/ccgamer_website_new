import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".wav":"audio/wav",".mp3":"audio/mpeg",".ogg":"audio/ogg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local"),pathname=decodeURIComponent(url.pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{"connection":"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store","connection":"close"});res.end(data)});
  }catch(error){res.writeHead(500,{"connection":"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1280,height:800}}),page=await context.newPage();
  page.setDefaultTimeout(30000);
  const pageErrors=[],failedScripts=[];
  page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.js(?:\?|$)/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});

  await page.goto(`${origin}/arcade/lost-sizzler/?v142-multiplayer-loader=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142MultiplayerState?.state?.installed));
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142MultiplayerCollectAuthority?.installed));

  const audit=await page.evaluate(()=>({
    stateInstalled:Boolean(window.CCGLostSizzlerV142MultiplayerState?.state?.installed),
    collectInstalled:Boolean(window.CCGLostSizzlerV142MultiplayerCollectAuthority?.installed),
    stateScript:Boolean(document.querySelector('script[data-ccg-v142-multiplayer-state="true"]')),
    collectScript:Boolean(document.querySelector('script[data-ccg-v142-multiplayer-collect-authority="true"]')),
    playerNetworkWrapped:Boolean(globalThis.playerStateForNetwork?.__v142CampaignState),
    worldSendWrapped:Boolean(globalThis.net?.send?.__v142CampaignState),
    collectWrapped:Boolean(globalThis.onCollectRequest?.__v142CollectAuthority)
  }));

  assert.equal(audit.stateInstalled,true,"V10.42 multiplayer character/campaign adapter must install on canonical page load.");
  assert.equal(audit.collectInstalled,true,"V10.42 remote Key collection authority bridge must install on canonical page load.");
  assert.equal(audit.stateScript,true,"Canonical dynamic loader must mount the multiplayer state script.");
  assert.equal(audit.collectScript,true,"Canonical dynamic loader must mount the remote Key collection bridge script.");
  assert.equal(audit.playerNetworkWrapped,true,"Outgoing player-state serializer must be wrapped for V10.42 state.");
  assert.equal(audit.worldSendWrapped,true,"World sender must be wrapped for V10.42 campaign state.");
  assert.equal(audit.collectWrapped,true,"Authoritative collection handler must be wrapped for remote V10.42 domain Keys.");
  assert.deepEqual(pageErrors,[],`Canonical V10.42 multiplayer adapter startup must not raise page errors: ${pageErrors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`Canonical V10.42 multiplayer adapter scripts must load without same-origin request failures: ${failedScripts.join("\n")}`);
  console.log("Lost Sizzler V10.42 multiplayer canonical loader browser contract passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}