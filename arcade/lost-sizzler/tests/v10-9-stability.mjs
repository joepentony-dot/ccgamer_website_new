import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameDir=path.resolve(here,"..");
const repo=path.resolve(here,"../../..");
const read=name=>fs.readFileSync(path.join(gameDir,name),"utf8");

const loader=read("js/asset-overrides.js");
const insights=read("js/v10-8-player-insights.js");
const audio=read("js/lost-sizzler-playlist-audio.js");
const layout=read("css/v10-9-stability-layout.css");
const r29Layout=read("css/v10-41-r29.css");
const stability=read("js/v10-9-browser-stability.js");

assert.match(loader,/v10-9-stability-layout\.css\?v=/,"final non-overlap CSS is cache-busted and loaded");
assert.match(loader,/v10-9-browser-stability\.js\?v=/,"browser stability guard is cache-busted and loaded last");
assert.match(insights,/showToast\(title,text,tone,duration\)/,"desktop insight notices use the existing single toast channel");
assert.doesNotMatch(insights,/stack\.appendChild\(notice\)/,"insights no longer creates a second stacked notification system");
assert.match(layout,/grid-template-rows:auto minmax\(0,1fr\)/,"v10.9 fallback layout still reserves a real notification row above the canvas");
assert.match(layout,/\.game-message-rail:not\(:has\(#pickup-toast\.show\)/,"notification lane collapses when inactive");
assert.match(r29Layout,/game-message-rail\{[\s\S]*display:contents!important/,"retained r29 gameplay notifications must not reserve or release canvas height");
assert.match(r29Layout,/body\[data-run-active="true"\] \.ccg-game>\.game-area #pickup-toast\{[\s\S]*position:absolute!important/,"retained r29 gameplay toasts must overlay without canvas reflow");
assert.match(audio,/audio\.preload=meteredRemote\?"none":"metadata"/,"metered remote music avoids eager preload while bundled/local music remains metadata-only");
assert.match(audio,/audio\.loop=meteredRemote/,"metered remote music loops within the run instead of downloading the next playlist file");
assert.match(audio,/RETRY_MAX_MS=60000/,"audio failures use a bounded retry backoff");
assert.doesNotMatch(audio,/setTimeout\(\(\)=>transition\(true,true\),250\)/,"the old 250ms infinite audio retry churn is gone");
assert.match(stability,/canvasPixelBudget/,"canvas allocation has a pixel budget");
assert.match(stability,/trimRunawayRenderState/,"runaway transient render arrays have a last-resort ceiling");

const runtimeModules=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const runtimeRequire=createRequire(path.join(runtimeModules||here,"runtime-loader.cjs"));
let chromium;
for(const moduleName of ["playwright","playwright-core"]){
  try{({chromium}=runtimeRequire(moduleName));break}catch{}
}
if(!chromium){
  console.log("V10.9 static stability checks passed; browser checks skipped because Playwright is not installed");
  process.exit(0);
}

const candidates=[process.env.CHROMIUM_PATH,"/usr/bin/google-chrome","/usr/bin/google-chrome-stable","/usr/bin/chromium","/usr/bin/chromium-browser"].filter(Boolean);
let browserPath=candidates.find(candidate=>fs.existsSync(candidate));
if(!browserPath){
  try{const bundled=chromium.executablePath();if(bundled&&fs.existsSync(bundled))browserPath=bundled}catch{}
}
if(!browserPath){
  console.log("V10.9 static stability checks passed; browser checks skipped because Chromium is unavailable");
  process.exit(0);
}

const mime={".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".mp3":"audio/mpeg",".wav":"audio/wav"};
const server=http.createServer((req,res)=>{
  const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
  const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
  const file=path.resolve(repo,`.${relative}`);
  if(!file.startsWith(repo)){res.writeHead(403).end();return;}
  fs.readFile(file,(error,data)=>{
    if(error){res.writeHead(404).end("not found");return;}
    res.setHeader("content-type",mime[path.extname(file)]||"application/octet-stream");
    res.setHeader("cache-control","no-store");
    res.end(data);
  });
});
await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
const base=`http://127.0.0.1:${server.address().port}/arcade/lost-sizzler/`;

const browser=await chromium.launch({headless:true,executablePath:browserPath});const context=await browser.newContext({viewport:{width:1600,height:900}});
await context.addInitScript(()=>{
  let fsElement=null;
  Object.defineProperty(document,"fullscreenElement",{configurable:true,get:()=>fsElement});
  Element.prototype.requestFullscreen=function(){fsElement=this;document.dispatchEvent(new Event("fullscreenchange"));return Promise.resolve()};
  document.exitFullscreen=()=>{fsElement=null;document.dispatchEvent(new Event("fullscreenchange"));return Promise.resolve()};
  window.ccgSupabase={getClient:async()=>({functions:{invoke:async()=>({data:{},error:null})}})};
});

const page=await context.newPage();
const pageErrors=[];
page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));

try{
  await page.goto(base,{waitUntil:"load"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&window.__CCG_LOST_SIZZLER_PLAYER_INSIGHTS__&&window.__CCG_LOST_SIZZLER_BROWSER_STABILITY__,null,{timeout:15000});
  await page.locator("#solo-btn").click();
  await page.waitForFunction(()=>document.body.dataset.runActive==="true");
  await page.evaluate(()=>document.getElementById("pickup-toast")?.classList.remove("show"));
  await page.waitForFunction(()=>getComputedStyle(document.querySelector(".game-message-rail")).display==="none",null,{timeout:3000});
  const baseGeometry=await page.evaluate(()=>{
    const wrap=document.querySelector(".canvas-wrap"),canvas=document.getElementById("game"),rail=document.querySelector(".game-message-rail");
    const box=element=>{const rect=element.getBoundingClientRect();return{x:rect.x,y:rect.y,width:rect.width,height:rect.height,bottom:rect.bottom}};
    return{canvas:box(wrap),backing:{width:canvas.width,height:canvas.height},railDisplay:getComputedStyle(rail).display}
  });
  assert.equal(baseGeometry.railDisplay,"none","idle retained r29 notification rail collapses completely");

  await page.evaluate(()=>showToast("STABILITY TEST","This banner must overlay without resizing the playfield.","cyan",9000));
  await page.locator("#pickup-toast.show").waitFor();
  await page.waitForTimeout(80);
  const toastGeometry=await page.evaluate(()=>{
    const wrap=document.querySelector(".canvas-wrap"),canvas=document.getElementById("game"),rail=document.querySelector(".game-message-rail"),toast=document.getElementById("pickup-toast");
    const box=element=>{const rect=element.getBoundingClientRect();return{x:rect.x,y:rect.y,width:rect.width,height:rect.height,bottom:rect.bottom}};
    return{toast:box(toast),canvas:box(wrap),backing:{width:canvas.width,height:canvas.height},railDisplay:getComputedStyle(rail).display,toastPosition:getComputedStyle(toast).position}
  });
  assert.ok(toastGeometry.toast&&toastGeometry.canvas,"toast and canvas have measurable boxes");
  assert.equal(toastGeometry.railDisplay,"contents","visible retained r29 notification rail uses contents-only geometry");
  assert.equal(toastGeometry.toastPosition,"absolute","retained r29 gameplay toast overlays instead of resizing the canvas row");
  assert.equal(toastGeometry.backing.width,baseGeometry.backing.width,"toast appearance must not change canvas backing width");
  assert.equal(toastGeometry.backing.height,baseGeometry.backing.height,"toast appearance must not change canvas backing height");
  assert.ok(Math.abs(toastGeometry.canvas.width-baseGeometry.canvas.width)<1&&Math.abs(toastGeometry.canvas.height-baseGeometry.canvas.height)<1,`toast appearance must not resize the canvas host: ${JSON.stringify({before:baseGeometry,after:toastGeometry})}`);
  assert.ok(toastGeometry.toast.y>=toastGeometry.canvas.y-2&&toastGeometry.toast.bottom<=toastGeometry.canvas.bottom+2,`toast overlay must stay inside the canvas host bounds: ${JSON.stringify(toastGeometry)}`);
  assert.equal(await page.locator("#ccg-important-notices").count(),0,"legacy stacked notice container is absent");

  await page.evaluate(()=>{for(let i=0;i<40;i++)showToast(`NOTICE ${i}`,"Burst replacement test.","gold",9000)});
  await page.waitForTimeout(60);
  assert.equal(await page.locator("#pickup-toast.show").count(),1,"a notification burst still renders one banner only");
  assert.equal(await page.locator(".ccg-important-notice").count(),0,"a notification burst cannot accumulate old cards");

  await page.evaluate(()=>{
    document.getElementById("pickup-toast")?.classList.remove("show");
    document.getElementById("ccg-rating-panel")?.classList.remove("hidden");
    window.CCGLostSizzlerBrowserStability?.resize?.();
  });
  await page.waitForTimeout(80);
  const ratingGeometry=await page.evaluate(()=>{
    const wrap=document.querySelector(".canvas-wrap"),canvas=document.getElementById("game"),rail=document.querySelector(".game-message-rail"),rating=document.getElementById("ccg-rating-panel");
    const box=element=>{const rect=element.getBoundingClientRect();return{x:rect.x,y:rect.y,width:rect.width,height:rect.height,bottom:rect.bottom}};
    return{rating:box(rating),canvas:box(wrap),backing:{width:canvas.width,height:canvas.height},railDisplay:getComputedStyle(rail).display,ratingPosition:getComputedStyle(rating).position}
  });
  assert.ok(ratingGeometry.rating&&ratingGeometry.canvas,"rating prompt and canvas have measurable boxes");
  assert.equal(ratingGeometry.railDisplay,"contents","visible retained r29 rating rail uses contents-only geometry");
  assert.ok(["absolute","fixed"].includes(ratingGeometry.ratingPosition),`retained r29 rating prompt overlays instead of resizing the canvas row: ${JSON.stringify(ratingGeometry)}`);
  assert.equal(ratingGeometry.backing.width,baseGeometry.backing.width,"rating prompt must not change canvas backing width");
  assert.equal(ratingGeometry.backing.height,baseGeometry.backing.height,"rating prompt must not change canvas backing height");
  assert.ok(Math.abs(ratingGeometry.canvas.width-baseGeometry.canvas.width)<1&&Math.abs(ratingGeometry.canvas.height-baseGeometry.canvas.height)<1,`rating prompt must not resize the canvas host: ${JSON.stringify({before:baseGeometry,after:ratingGeometry})}`);
  assert.ok(ratingGeometry.rating.y>=ratingGeometry.canvas.y-2&&ratingGeometry.rating.bottom<=ratingGeometry.canvas.bottom+2,`rating prompt overlay must stay inside the canvas host bounds: ${JSON.stringify(ratingGeometry)}`);
  await page.evaluate(()=>document.getElementById("ccg-rating-panel")?.classList.add("hidden"));

  for(const [width,height] of [[1920,1080],[1280,720],[2560,1440],[1366,768],[1600,900],[2560,1440],[1600,900]]){
    await page.setViewportSize({width,height});
    await page.waitForTimeout(35);
    const state=await page.evaluate(()=>({
      pixels:document.getElementById("game").width*document.getElementById("game").height,
      budget:window.CCGLostSizzlerBrowserStability.pixelBudget(),
      width:document.getElementById("game").width,
      height:document.getElementById("game").height
    }));
    assert.ok(state.pixels<=state.budget+1500,`canvas backing store remains inside allocation budget: ${JSON.stringify(state)}`);
  }

  assert.equal(page.isClosed(),false,"page remains alive after popup and rapid resize stress");
  assert.deepEqual(pageErrors,[],`no uncaught page errors during stability stress: ${pageErrors.join("\n")}`);
  console.log("V10.9 popup non-overlap and browser stability checks passed");
}finally{
  await page.close().catch(()=>{});
  await context.close();
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
