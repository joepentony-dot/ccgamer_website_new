import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R42SoloLiveRecovery)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&Boolean(run)&&Boolean(p1)&&Boolean(world)&&Boolean(host),null,{timeout:20000});
  await page.waitForTimeout(250);
  const diagnostic=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R42SoloLiveRecovery;
    const onboarding=window.CCGLostSizzlerOnboardingV120?.state||null;
    return{
      mode:typeof mode!=="undefined"?String(mode):"<undefined>",
      playMode:typeof playMode!=="undefined"?String(playMode):"<undefined>",
      runActive:document.body?.dataset?.runActive||"",
      specialMode:document.body?.dataset?.specialMode||"",
      hordeSolo:document.body?.dataset?.hordeSolo||"",
      tutorialActive:document.body?.dataset?.tutorialActive||"",
      run:Boolean(typeof run!=="undefined"&&run),
      runDaily:Boolean(typeof run!=="undefined"&&run?.daily),
      p1:Boolean(typeof p1!=="undefined"&&p1),
      p2:Boolean(typeof p2!=="undefined"&&p2),
      world:Boolean(typeof world!=="undefined"&&world),
      host:Boolean(typeof host!=="undefined"&&host),
      netConnected:Boolean(typeof net!=="undefined"&&net?.connected),
      controller:window.CCGLostSizzlerModeRuntime?.detect?.()||"",
      activeSpecialType:String(window.CCGLostSizzlerSpecialModes?.active?.type||""),
      onboarding:onboarding?{active:Boolean(onboarding.active),tutorialRequested:Boolean(onboarding.tutorialRequested),forceTutorial:Boolean(onboarding.forceTutorial)}:null,
      standardSoloRun:Boolean(api?.standardSoloRun?.()),
      standardSoloPlaying:Boolean(api?.standardSoloPlaying?.())
    }
  });
  console.log(`R42_SOLO_OWNERSHIP_DIAGNOSTIC ${JSON.stringify(diagnostic)}`);
  assert.equal(diagnostic.controller,"dungeon-solo",`fresh Solo must remain under the dungeon-solo controller: ${JSON.stringify(diagnostic)}`);
  assert.equal(diagnostic.standardSoloRun,true,`r42 must recognize a fresh normal Solo run: ${JSON.stringify(diagnostic)}`);
  assert.equal(diagnostic.standardSoloPlaying,true,`r42 must recognize fresh Solo playing state: ${JSON.stringify(diagnostic)}`);
  assert.deepEqual(errors,[],`r42 Solo ownership diagnostic must not produce page errors: ${errors.join("\n")}`);
  console.log("V10.41 r42 fresh Solo ownership diagnostic passed.");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
