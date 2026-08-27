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
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141HordeFramePerformance)&&Boolean(document.getElementById("horde-solo-btn")));
  const prewarm=await page.evaluate(async()=>({ready:await window.CCGLostSizzlerV141HordeFramePerformance.prewarmFirstWave(),started:window.CCGLostSizzlerV141HordeFramePerformance.state.firstWavePrewarmStarted}));
  assert.equal(prewarm.started,true,"Horde first-wave prewarm must start before play");
  assert.equal(prewarm.ready,true,"local first-wave Horde audio must be cache-warmed successfully");

  await page.click("#horde-solo-btn");
  await page.waitForFunction(()=>document.body.dataset.specialMode==="horde-survivor"&&document.body.dataset.hordeSolo==="true"&&Boolean(window.CCGLostSizzlerSpecialModes?.active?.state));
  await page.waitForFunction(()=>Boolean(document.getElementById("horde-performance-status")));
  await page.waitForTimeout(1200);

  const result=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141HordeFramePerformance,combat=window.CCGLostSizzlerV141HordeCombatPolish;
    const status=document.getElementById("horde-performance-status"),gameArea=document.querySelector(".game-area"),old=document.getElementById("horde-live-remaining");
    const sr=status.getBoundingClientRect(),gr=gameArea.getBoundingClientRect();
    return{
      statusText:status.textContent||"",statusDisplay:getComputedStyle(status).display,oldDisplay:old?getComputedStyle(old).display:"missing",
      statusBottom:sr.bottom,gameTop:gr.top,
      radarDraws:api.state.radarDraws,radarSkips:api.state.radarSkips,statusRenders:api.state.statusRenders,
      pacingRuns:combat.state.pacingRuns,navSamples:combat.state.navSamples,
      controllerFrames:window.CCGLostSizzlerModeRuntime?.diagnostics?.()?.controllerState?.frames||0,
      mode:document.body.dataset.modeController||""
    }
  });
  assert.notEqual(result.statusDisplay,"none","Horde remaining-enemy status strip must be visible");
  assert.match(result.statusText,/WAVE\s+\d+\/10/i,"Horde status must show current wave");
  assert.match(result.statusText,/ENEMIES LEFT\s+\d+/i,"Horde status must show remaining monsters in the visible upper strip");
  assert.ok(result.statusBottom<=result.gameTop+2,`Horde remaining status must sit above gameplay: ${JSON.stringify(result)}`);
  assert.equal(result.oldDisplay,"none","old foot-of-screen remaining counter must be suppressed");
  assert.ok(result.radarDraws>=2,`Horde radar should still refresh periodically: ${JSON.stringify(result)}`);
  assert.ok(result.radarSkips>result.radarDraws,`Horde radar should skip most display-frame redraws: ${JSON.stringify(result)}`);
  assert.ok(result.statusRenders>=1,"Horde status should render at least once");
  assert.ok(result.pacingRuns<=8,`Horde enemy pacing scans must be cadence-gated over ~1.2 seconds: ${JSON.stringify(result)}`);
  assert.ok(result.navSamples<=10,`Horde navigation snapshots must be cadence-gated over ~1.2 seconds: ${JSON.stringify(result)}`);
  assert.match(result.mode,/horde-/,"mode controller must remain in a Horde-isolated controller");
  assert.deepEqual(errors,[],`Horde frame-performance regression must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler real Horde frame cadence, radar throttle, prewarm and visible remaining-enemy HUD regressions passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
