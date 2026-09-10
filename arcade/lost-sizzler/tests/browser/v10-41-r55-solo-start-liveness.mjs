import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)})}catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1560,height:800}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const pageErrors=[];page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");

  const deadline=Date.now()+20000;
  let active=false;
  while(Date.now()<deadline){
    active=await page.evaluate(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&Boolean(p1)&&Boolean(host));
    if(active)break;
    await page.waitForTimeout(100);
  }

  const state=await page.evaluate(()=>({
    body:{...document.body.dataset},
    mode:typeof mode!=="undefined"?mode:null,
    playMode:typeof playMode!=="undefined"?playMode:null,
    hasP1:typeof p1!=="undefined"&&Boolean(p1),
    hasHost:typeof host!=="undefined"&&Boolean(host),
    hasRun:typeof run!=="undefined"&&Boolean(run),
    activeElement:document.activeElement?.id||document.activeElement?.tagName||null,
    visibility:document.visibilityState,
    hasFocus:document.hasFocus(),
    loadWatchdog:window.CCGLostSizzlerV141LoadWatchdog?.state?{...window.CCGLostSizzlerV141LoadWatchdog.state}:null,
    r30:window.CCGLostSizzlerV141R30?.state?{...window.CCGLostSizzlerV141R30.state}:null,
    r59:window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?{...window.CCGLostSizzlerV141R59LiveRegressionFixes.state}:null,
    lifecycle:window.CCGLostSizzlerV141SoloStabilityDiagnostics?.state?.lifecycleLog?.slice?.(-12)||null
  }));
  assert.equal(active,true,`Solo start failed to reach active playing state within 20s: ${JSON.stringify(state)}`);
  assert.deepEqual(pageErrors,[],`Solo start liveness produced page errors: ${pageErrors.join("\n")}`);
  await context.close();
  console.log(`Solo start liveness passed: ${JSON.stringify({mode:state.mode,playMode:state.playMode,runActive:state.body.runActive})}`);
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
