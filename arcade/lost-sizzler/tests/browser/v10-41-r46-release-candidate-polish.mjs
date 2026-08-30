import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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
  const context=await browser.newContext({viewport:{width:1700,height:960}}),page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  console.log("[r46 RC] load canonical game and release-candidate layer");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R46ReleaseCandidatePolish));

  const installed=await page.evaluate(()=>({options:Boolean(document.getElementById("ccg-r46-options-btn")),stats:Boolean(document.getElementById("ccg-r46-stats-btn")),styles:Boolean(document.getElementById("ccg-r46-styles"))}));
  assert.deepEqual(installed,{options:true,stats:true,styles:true},"r46 controls and styles must install on the canonical menu");

  console.log("[r46 RC] accessibility preferences persist and apply without changing gameplay state");
  const prefResult=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R46ReleaseCandidatePolish;
    api.savePrefs({version:1,reducedMotion:true,reducedFlashes:true,largeText:true,musicPercent:40});
    const stored=api.loadPrefs();
    return{stored,classes:[document.body.classList.contains("ccg-reduced-motion"),document.body.classList.contains("ccg-reduced-flashes"),document.body.classList.contains("ccg-large-text")]};
  });
  assert.equal(prefResult.stored.reducedMotion,true);assert.equal(prefResult.stored.reducedFlashes,true);assert.equal(prefResult.stored.largeText,true);assert.equal(prefResult.stored.musicPercent,40);assert.deepEqual(prefResult.classes,[true,true,true]);

  console.log("[r46 RC] menu options and lifetime statistics open and close normally");
  await page.click("#ccg-r46-options-btn");await page.waitForFunction(()=>!document.getElementById("ccg-r46-options")?.classList.contains("hidden"));await page.click("#ccg-r46-options [data-close]");
  await page.click("#ccg-r46-stats-btn");await page.waitForFunction(()=>!document.getElementById("ccg-r46-stats")?.classList.contains("hidden"));await page.click("#ccg-r46-stats [data-close]");

  console.log("[r46 RC] run lifecycle records durable stats and enriches the existing end overlay");
  const lifecycle=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R46ReleaseCandidatePolish;
    localStorage.removeItem(api.STATS_KEY);
    score=12345;
    if(run)run.floor=3;
    if(p1)p1.level=4;
    document.getElementById("hud-score").textContent="012345";
    document.getElementById("hud-kills").textContent="17";
    document.getElementById("hud-room").textContent="F3";
    document.getElementById("quick-level").textContent="LEVEL 4";
    api.recordRunStart();
    api.state.lastKills=17;
    api.state.runStartedAt=Date.now()-125000;
    document.getElementById("end-title").textContent="Citadel Complete";
    const snapshot=api.recordRunEnd("win");
    const stats=api.loadStats(),report=document.getElementById("ccg-r46-run-results");
    return{snapshot,stats,reportText:report?.textContent||"",reportAttached:Boolean(report?.closest("#end-text"))};
  });
  assert.equal(lifecycle.stats.runs,1,"one observed run must produce one lifetime run");
  assert.equal(lifecycle.stats.wins,1,"explicit winning end must produce one lifetime win");
  assert.ok(lifecycle.stats.bestScore>=12345,"best score must retain the canonical run score");
  assert.ok(lifecycle.stats.deepestFloor>=3,"deepest floor must retain the canonical run floor");
  assert.ok(lifecycle.stats.totalKills>=17,"lifetime kills must retain observed kills");
  assert.equal(lifecycle.reportAttached,true,"run report must enrich the existing canonical end text rather than replace the overlay");
  assert.match(lifecycle.reportText,/RUN REPORT/);assert.match(lifecycle.reportText,/BEST SCORE/);assert.match(lifecycle.reportText,/12,345/);

  console.log("[r46 RC] repeated resize/visibility-style recovery calls leave runtime responsive");
  for(const size of [{width:1280,height:720},{width:1920,height:1080},{width:1024,height:768},{width:1700,height:960}]){await page.setViewportSize(size);await page.waitForTimeout(80);await page.evaluate(()=>window.CCGLostSizzlerBrowserStability?.resize?.())}
  const responsive=await page.evaluate(()=>({ready:document.body.dataset.releaseReady,canvas:Boolean(document.querySelector("canvas")),options:Boolean(document.getElementById("ccg-r46-options-btn")),stats:Boolean(document.getElementById("ccg-r46-stats-btn"))}));
  assert.equal(responsive.ready,"true");assert.equal(responsive.canvas,true);assert.equal(responsive.options,true);assert.equal(responsive.stats,true);
  assert.deepEqual(errors,[],`r46 canonical browser path must not emit page errors: ${errors.join("\n")}`);

  console.log("Lost Sizzler V10.41 r46 accessibility, lifetime stats, run report and resize-abuse regression passed in Chromium.");
  await context.close();
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
  for(const socket of sockets)socket.destroy();
}