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
  await page.waitForFunction(()=>document.body.dataset.v142BootstrapReady==="true"&&Boolean(window.CCGLostSizzlerV142ZeroServerRelease),null,{timeout:90000});

  const audit=await page.evaluate(()=>({
    bootstrap:[...(window.CCGLostSizzlerV142Bootstrap?.loaded||[])],
    releaseModel:document.body.dataset.releaseModel,
    onlineFlag:document.body.dataset.onlineMultiplayer,
    zeroServer:Boolean(window.CCGLostSizzlerV142ZeroServerRelease?.enabled),
    onlineMultiplayer:window.CCGLostSizzlerV142ZeroServerRelease?.onlineMultiplayer,
    stateInstalled:Boolean(window.CCGLostSizzlerV142MultiplayerState?.state?.installed),
    collectInstalled:Boolean(window.CCGLostSizzlerV142MultiplayerCollectAuthority?.installed),
    stateScript:Boolean(document.querySelector('script[data-ccg-v142-multiplayer-state="true"]')),
    collectScript:Boolean(document.querySelector('script[data-ccg-v142-multiplayer-collect-authority="true"]')),
    localModes:[...(window.CCGLostSizzlerV142ZeroServerRelease?.localModes||[])],
    networkConnected:Boolean(net?.connected),
    networkTransport:String(net?.transport||""),
    onlineButtons:Object.fromEntries(["create-btn","horde-mode-btn","saboteurs-mode-btn","join-btn"].map(id=>{
      const node=document.getElementById(id);return[id,Boolean(node&&!node.hidden&&getComputedStyle(node).display!=="none")]
    })),
    localButtons:Object.fromEntries(["solo-btn","tutorial-zone-btn","split-btn"].map(id=>{
      const node=document.getElementById(id);return[id,Boolean(node&&!node.hidden&&getComputedStyle(node).display!=="none")]
    }))
  }));

  assert.equal(audit.zeroServer,true,"Canonical V10.42 page must install the zero-server release policy.");
  assert.equal(audit.releaseModel,"zero-server-cost","Canonical runtime must identify the zero-server-cost release model.");
  assert.equal(audit.onlineFlag,"disabled","Canonical runtime must mark online multiplayer disabled.");
  assert.equal(audit.onlineMultiplayer,false,"Release diagnostics must keep online multiplayer disabled.");
  assert.deepEqual(audit.localModes,["solo","tutorial","split-screen"],"Solo, Tutorial and local 2P Split Screen must remain the supported release modes.");
  assert.equal(audit.stateInstalled,false,"Production V10.42 must not install the retired online multiplayer state adapter.");
  assert.equal(audit.collectInstalled,false,"Production V10.42 must not install the retired online collection authority bridge.");
  assert.equal(audit.stateScript,false,"Canonical dynamic loader must not mount the retired multiplayer state script.");
  assert.equal(audit.collectScript,false,"Canonical dynamic loader must not mount the retired multiplayer collection bridge script.");
  assert.ok(!audit.bootstrap.includes("v10-42-multiplayer-state.js"),"Ordered V10.42 bootstrap must exclude the online multiplayer state adapter.");
  assert.ok(!audit.bootstrap.includes("v10-42-multiplayer-collect-authority.js"),"Ordered V10.42 bootstrap must exclude the online collection authority bridge.");
  assert.ok(audit.bootstrap.includes("v10-42-zero-server-release.js"),"Ordered V10.42 bootstrap must include the zero-server release policy.");
  assert.equal(audit.networkConnected,false,"Canonical zero-server page must not connect to an online room.");
  assert.equal(audit.networkTransport,"solo","Canonical network object must remain in inert Solo transport state.");
  for(const id of ["create-btn","horde-mode-btn","saboteurs-mode-btn","join-btn"])assert.equal(audit.onlineButtons[id],false,`${id} must remain unavailable in production.`);
  for(const id of ["solo-btn","tutorial-zone-btn","split-btn"])assert.equal(audit.localButtons[id],true,`${id} must remain available in production.`);
  assert.deepEqual(pageErrors,[],`Canonical V10.42 zero-server startup must not raise page errors: ${pageErrors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`Canonical V10.42 ordered scripts must load without same-origin request failures: ${failedScripts.join("\n")}`);
  console.log("Lost Sizzler V10.42 zero-server canonical loader browser contract passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}