import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {createRequire} from "node:module";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameDir=path.resolve(here,"..");
const repo=path.resolve(here,"../../../..");
const read=name=>fs.readFileSync(path.join(gameDir,name),"utf8");

const loader=read("js/asset-overrides.js");
const insights=read("js/v10-8-player-insights.js");
const audio=read("js/lost-sizzler-playlist-audio.js");
const layout=read("css/v10-9-stability-layout.css");
const stability=read("js/v10-9-browser-stability.js");

assert.match(loader,/v10-9-stability-layout\.css\?v=/,"final non-overlap CSS is cache-busted and loaded");
assert.match(loader,/v10-9-browser-stability\.js\?v=/,"browser stability guard is cache-busted and loaded last");
assert.match(insights,/showToast\(title,text,tone,duration\)/,"desktop insight notices use the existing single toast channel");
assert.doesNotMatch(insights,/stack\.appendChild\(notice\)/,"insights no longer creates a second stacked notification system");
assert.match(layout,/grid-template-rows:auto minmax\(0,1fr\)/,"game area reserves a real row above the canvas for notifications");
assert.match(layout,/\.game-message-rail:not\(:has\(#pickup-toast\.show\)/,"notification lane collapses when inactive");
assert.match(layout,/position:relative!important;/,"notification layout overrides old absolute toast positioning");
assert.match(audio,/audio\.preload="metadata"/,"inactive music categories do not eagerly buffer full audio files");
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
const base=`http://127.0.0.1:${server.address().port}/games/ccg-games/cheeky-commodore-quest/`;

const browser=await chromium.launch({headless:true,executablePath:browserPath});
const context=await browser.newContext({viewport:{width:1600,height:900}});
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

  await page.evaluate(()=>showToast("STABILITY TEST","This banner must stay above the playfield.","cyan",9000));
  await page.locator("#pickup-toast.show").waitFor();
  await page.waitForTimeout(80);
  let toast=await page.locator("#pickup-toast").boundingBox();
  let canvas=await page.locator(".canvas-wrap").boundingBox();
  assert.ok(toast&&canvas,"toast and canvas have measurable boxes");
  assert.ok(toast.y+toast.height<=canvas.y+2,`notification stays above canvas: ${JSON.stringify({toast,canvas})}`);
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
  const rail=await page.locator(".game-message-rail").boundingBox();
  canvas=await page.locator(".canvas-wrap").boundingBox();
  assert.ok(rail&&canvas,"rating rail and canvas have measurable boxes");
  assert.ok(rail.y+rail.height<=canvas.y+2,`rating prompt also stays outside canvas: ${JSON.stringify({rail,canvas})}`);
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
