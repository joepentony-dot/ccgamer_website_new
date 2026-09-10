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
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(window.CCGLostSizzlerSpecialModes)&&Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes)&&Boolean(window.CCGLostSizzlerV141R60HordeCombatIntegrity)&&Boolean(window.CCGLostSizzlerV141R29SpyNetwork)&&Boolean(window.CCGLostSizzlerV141R32SpyLoader)&&Boolean(document.getElementById("solo-btn"))&&Boolean(document.getElementById("horde-solo-btn"))&&typeof quitToMenu==="function",null,{timeout:90000});

  const snapshot=()=>page.evaluate(()=>({
    mode:String(typeof mode!=="undefined"?mode:""),runActive:String(document.body.dataset.runActive||""),specialMode:String(document.body.dataset.specialMode||""),activeId:String(window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId||""),
    soloFrames:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?.soloFrames||0),
    hordeFrames:Number(window.CCGLostSizzlerV141R60HordeCombatIntegrity?.state?.frames||0),
    hordeStatusTimer:Number(window.CCGLostSizzlerV141HordeFramePerformance?.state?.statusTimer||0),
    spyHeartbeat:Number(window.CCGLostSizzlerV141R29SpyNetwork?.state?.timer||0),spyInstalled:Boolean(window.CCGLostSizzlerV141R29SpyNetwork?.state?.installed),spyIsolated:Boolean(window.CCGLostSizzlerV141R29SpyEngine?.state?.isolated),
    r29Timer:Number(window.CCGLostSizzlerV141R29SpyEngine?.state?.timer||0),loaderTimer:Number(window.CCGLostSizzlerV141R32SpyLoader?.state?.timer||0),spyRuleFrames:Number(window.CCGLostSizzlerModeRuntime?.state?.spyRuleFrames||0)
  }));
  const quit=async()=>{await page.evaluate(async()=>{await quitToMenu()});await page.waitForFunction(()=>mode==="menu"&&document.body.dataset.runActive!=="true",null,{timeout:20000});await page.waitForTimeout(180)};

  console.log("[Stage 11] Solo -> menu");
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId==="dungeon-solo"&&Boolean(p1)&&Boolean(host),null,{timeout:30000});
  const solo1=await snapshot();await page.waitForFunction(before=>Number(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?.soloFrames||0)>before,solo1.soloFrames,{timeout:5000});
  const solo1Active=await snapshot();assert.equal(solo1Active.specialMode,"");assert.equal(solo1Active.spyHeartbeat,0);assert.equal(solo1Active.hordeStatusTimer,0);assert.ok(solo1Active.soloFrames>solo1.soloFrames,"initial Solo session must advance the authoritative Solo simulation");
  await quit();const afterSolo=await snapshot();assert.equal(afterSolo.spyHeartbeat,0);assert.equal(afterSolo.hordeStatusTimer,0);

  console.log("[Stage 11] Horde -> menu");
  await page.click("#horde-solo-btn");
  await page.waitForFunction(()=>mode==="playing"&&document.body.dataset.specialMode==="horde-survivor"&&window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId==="horde-solo"&&Number(window.CCGLostSizzlerV141HordeFramePerformance?.state?.statusTimer||0)>0,null,{timeout:30000});
  const horde=await snapshot();await page.waitForFunction(before=>Number(window.CCGLostSizzlerV141R60HordeCombatIntegrity?.state?.frames||0)>before,horde.hordeFrames,{timeout:5000});await page.waitForTimeout(200);
  const hordeActive=await snapshot();assert.equal(hordeActive.soloFrames,horde.soloFrames,"Horde must not advance Solo simulation frames");assert.ok(hordeActive.hordeFrames>horde.hordeFrames,"Horde must advance its authoritative frame service");assert.equal(hordeActive.spyHeartbeat,0,"Horde must not retain a Spy heartbeat");
  await quit();const afterHorde=await snapshot();assert.equal(afterHorde.hordeStatusTimer,0,"Horde exit must drain its status timer");assert.equal(afterHorde.spyHeartbeat,0);

  console.log("[Stage 11] Spy -> menu");
  const started=await page.evaluate(()=>{net.setSolo("Stage 11 Spy Agent");const id=String(net.sessionId);return window.CCGLostSizzlerSpecialModes.startOnline({roomMode:"sizzler-saboteurs",players:[{id,name:"Stage 11 Spy Agent"},{id:"STAGE11-SPY-B",name:"Stage 11 Rival"}],hostId:id,seed:"STAGE11-RELEASE-SPY",roomCode:"S11RLS"})});
  assert.equal(started,true,"Stage 11 Spy session must start through the canonical special-mode adapter");
  await page.waitForFunction(()=>mode==="playing"&&document.body.dataset.specialMode==="sizzler-saboteurs"&&window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId==="spy-online"&&Boolean(window.CCGLostSizzlerV141R29SpyNetwork?.state?.timer),null,{timeout:30000});
  await page.evaluate(async()=>{const loader=window.CCGLostSizzlerV141R32SpyLoader;await loader.ensureLoaded();await loader.ensureSearchUi()});
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R32SpyLoader?.state?.loaded&&window.CCGLostSizzlerV141R32SpyLoader?.state?.uiLoaded));
  const spy=await snapshot();await page.waitForFunction(before=>Number(window.CCGLostSizzlerModeRuntime?.state?.spyRuleFrames||0)>before,spy.spyRuleFrames,{timeout:5000});await page.waitForTimeout(200);
  const spyActive=await snapshot();assert.equal(spyActive.soloFrames,spy.soloFrames,"Spy must not advance Solo simulation frames");assert.equal(spyActive.hordeFrames,spy.hordeFrames,"Spy must not advance Horde simulation frames");assert.ok(spyActive.spyRuleFrames>spy.spyRuleFrames,"Spy must advance the final mode-runtime controller frames");assert.ok(spyActive.spyHeartbeat>0,"Spy must retain its active heartbeat while playing");assert.equal(spyActive.r29Timer,0,"Spy must keep the retired r29 monitor stopped");assert.equal(spyActive.loaderTimer,0,"Spy must keep the retired cross-mode loader poll stopped");
  await quit();await page.waitForFunction(()=>!window.CCGLostSizzlerV141R29SpyNetwork?.state?.timer&&!window.CCGLostSizzlerV141R29SpyNetwork?.state?.installed&&!window.CCGLostSizzlerV141R29SpyEngine?.state?.isolated,null,{timeout:10000});
  const afterSpy=await snapshot();assert.equal(afterSpy.spyHeartbeat,0,"Spy exit must drain its heartbeat");assert.equal(afterSpy.spyInstalled,false,"Spy exit must restore packet ownership");assert.equal(afterSpy.hordeStatusTimer,0);

  console.log("[Stage 11] final Solo re-entry");
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId==="dungeon-solo"&&Boolean(p1)&&Boolean(host),null,{timeout:30000});
  const solo2=await snapshot();await page.waitForFunction(before=>Number(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?.soloFrames||0)>before,solo2.soloFrames,{timeout:5000});await page.waitForTimeout(180);
  const final=await snapshot();assert.equal(final.activeId,"dungeon-solo");assert.equal(final.specialMode,"");assert.equal(final.spyHeartbeat,0);assert.equal(final.spyInstalled,false);assert.equal(final.hordeStatusTimer,0);assert.equal(final.r29Timer,0);assert.equal(final.loaderTimer,0);assert.ok(final.soloFrames>solo2.soloFrames,"final Solo re-entry must resume the authoritative Solo simulation");assert.equal(final.hordeFrames,solo2.hordeFrames,"final Solo re-entry must keep Horde simulation dormant");
  assert.deepEqual(errors,[],`Stage 11 cross-mode release lifecycle must have no uncaught browser errors: ${errors.join("\n")}`);

  console.log("Lost Sizzler Stage 11 Solo -> Horde -> Spy -> Solo release lifecycle passed in Chromium.");
  await context.close();
}finally{await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()))}
