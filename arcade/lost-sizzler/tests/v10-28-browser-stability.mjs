import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const TEST_TIMEOUT_MS=90000;
const STAGE_TIMEOUT_MS=20000;
const CLEANUP_TIMEOUT_MS=5000;
const startedAt=Date.now();
let currentStage="initialising";

function logStage(name){
  currentStage=name;
  console.log(`[Lost Sizzler browser] ${name}`);
}

function withTimeout(promise,ms,label){
  let timer;
  return Promise.race([
    Promise.resolve(promise),
    new Promise((_,reject)=>{
      timer=setTimeout(()=>reject(new Error(`${label} timed out after ${ms}ms`)),ms);
    })
  ]).finally(()=>clearTimeout(timer));
}

const watchdog=setTimeout(()=>{
  console.error(`[Lost Sizzler browser] OVERALL TIMEOUT at stage: ${currentStage}`);
  process.exitCode=1;
  process.exit(1);
},TEST_TIMEOUT_MS);
watchdog.unref?.();

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
  ".mp3":"audio/mpeg",
  ".wav":"audio/wav",
  ".ogg":"audio/ogg",
  ".m4a":"audio/mp4"
};

const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return;}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404).end("not found");return;}
      res.setHeader("content-type",mime[path.extname(file).toLowerCase()]||"application/octet-stream");
      res.setHeader("cache-control","no-store");
      res.setHeader("connection","close");
      res.end(data);
    });
  }catch(error){res.writeHead(500).end(String(error));}
});
server.on("connection",socket=>{
  sockets.add(socket);
  socket.on("close",()=>sockets.delete(socket));
});

logStage("start local server");
await withTimeout(new Promise((resolve,reject)=>{
  server.once("error",reject);
  server.listen(0,"127.0.0.1",resolve);
}),5000,"local server startup");
const origin=`http://127.0.0.1:${server.address().port}`;
const canonical=`${origin}/arcade/lost-sizzler/`;
const legacy=`${origin}/games/ccg-games/cheeky-commodore-quest/`;

logStage("launch Chromium");
const browser=await withTimeout(chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]}),15000,"Chromium launch");
const contexts=[];

async function newGamePage(viewport={width:1600,height:900}){
  const context=await withTimeout(browser.newContext({viewport}),5000,"browser context creation");
  contexts.push(context);
  const page=await withTimeout(context.newPage(),5000,"browser page creation");
  page.setDefaultTimeout(10000);
  page.setDefaultNavigationTimeout(15000);
  const pageErrors=[];
  let crashed=false;
  page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  page.on("crash",()=>{crashed=true;console.error(`[Lost Sizzler browser] PAGE CRASH during ${currentStage}`);});
  page.on("console",message=>{
    if(message.type()==="error")console.error(`[browser console] ${message.text()}`);
  });
  page.on("request",request=>{
    const url=request.url();
    if(url.includes("/arcade/lost-sizzler/js/"))console.log(`[browser script] ${new URL(url).pathname}${new URL(url).search}`);
  });
  return{context,page,pageErrors,crashed:()=>crashed};
}

async function assertHealthy(state,label){
  assert.equal(state.crashed(),false,`${label}: Chromium page did not crash`);
  assert.deepEqual(state.pageErrors,[],`${label}: no uncaught browser errors: ${state.pageErrors.join("\n")}`);
  assert.equal(await withTimeout(state.page.evaluate(()=>document.body.dataset.gameReady),5000,`${label} ready-state read`),"true",`${label}: game reaches ready state`);
  assert.equal(await withTimeout(state.page.evaluate(()=>Boolean(window.__CCG_LOST_SIZZLER_EARLY_RESIZE_GUARD__)),5000,`${label} resize-guard read`),true,`${label}: early canvas guard is active`);
}

async function waitForReady(state,label){
  await withTimeout(state.page.waitForFunction(()=>document.body.dataset.gameReady==="true",null,{timeout:15000}),STAGE_TIMEOUT_MS,`${label} gameReady`);
}

async function closeSafely(target,label){
  try{await withTimeout(target.close(),CLEANUP_TIMEOUT_MS,label);}catch(error){console.warn(`[Lost Sizzler browser] ${label}: ${error.message}`);}
}

try{
  {
    logStage("canonical desktop: create page");
    const state=await newGamePage();
    logStage("canonical desktop: navigate");
    await withTimeout(state.page.goto(canonical,{waitUntil:"domcontentloaded",timeout:15000}),STAGE_TIMEOUT_MS,"canonical navigation");
    logStage("canonical desktop: wait for gameReady");
    await waitForReady(state,"canonical desktop");
    await state.page.waitForTimeout(1200);
    logStage("canonical desktop: health check");
    await assertHealthy(state,"canonical desktop launch");

    logStage("canonical desktop: metadata and script dedupe");
    const canonicalHref=await withTimeout(state.page.locator('link[rel="canonical"]').getAttribute("href"),5000,"canonical metadata read");
    assert.equal(canonicalHref,"https://www.cheekycommodoregamer.co.uk/arcade/lost-sizzler/","canonical metadata uses the arcade URL");
    const scriptSources=await withTimeout(state.page.evaluate(()=>[...document.scripts].map(script=>script.src).filter(Boolean)),5000,"script source audit");
    const duplicateSources=scriptSources.filter((src,index)=>scriptSources.indexOf(src)!==index);
    assert.deepEqual(duplicateSources,[],`startup does not load the same script twice: ${duplicateSources.join(", ")}`);

    logStage("canonical desktop: canvas stabilisation");
    const menuSamples=[];
    for(let i=0;i<12;i++){
      menuSamples.push(await withTimeout(state.page.evaluate(()=>({w:game.width,h:game.height,pixels:game.width*game.height})),3000,"menu canvas sample"));
      await state.page.waitForTimeout(80);
    }
    const uniqueMenuSizes=new Set(menuSamples.map(sample=>`${sample.w}x${sample.h}`));
    assert.ok(uniqueMenuSizes.size<=3,`menu canvas backing store stabilises instead of reallocating continuously: ${[...uniqueMenuSizes].join(", ")}`);
    assert.ok(menuSamples.every(sample=>sample.pixels<=5000000),"desktop canvas stays within the stability pixel budget");

    logStage("canonical desktop: start Solo run");
    await withTimeout(state.page.locator("#solo-btn").click({timeout:8000,noWaitAfter:true}),10000,"Solo button click");
    logStage("canonical desktop: wait for runActive");
    await withTimeout(state.page.waitForFunction(()=>document.body.dataset.runActive==="true",null,{timeout:15000}),STAGE_TIMEOUT_MS,"Solo run start");

    logStage("canonical desktop: movement");
    await state.page.keyboard.down("d");
    await state.page.waitForTimeout(600);
    await state.page.keyboard.up("d");
    await state.page.waitForTimeout(800);
    await assertHealthy(state,"active solo run");

    logStage("canonical desktop: resize stress");
    const sizes=[
      {width:1920,height:1080},
      {width:1366,height:768},
      {width:1600,height:900},
      {width:1280,height:720},
      {width:1600,height:900}
    ];
    for(const size of sizes){
      await withTimeout(state.page.setViewportSize(size),5000,`resize ${size.width}x${size.height}`);
      await state.page.waitForTimeout(250);
      const canvas=await withTimeout(state.page.evaluate(()=>({w:game.width,h:game.height,pixels:game.width*game.height})),3000,"canvas budget read");
      assert.ok(canvas.pixels<=5000000,`resize ${size.width}x${size.height} remains inside canvas budget: ${canvas.w}x${canvas.h}`);
      await assertHealthy(state,`resize ${size.width}x${size.height}`);
    }

    logStage("canonical desktop: transient render-state audit");
    const transient=await withTimeout(state.page.evaluate(()=>({
      particles:typeof particles!=="undefined"?particles.length:0,
      rings:typeof rings!=="undefined"?rings.length:0,
      floaters:typeof floaters!=="undefined"?floaters.length:0,
      bullets:typeof bullets!=="undefined"?bullets.length:0,
      enemyBullets:typeof enemyBullets!=="undefined"?enemyBullets.length:0
    })),5000,"transient render-state audit");
    assert.ok(transient.particles<=2600&&transient.rings<=700&&transient.floaters<=700&&transient.bullets<=900&&transient.enemyBullets<=1600,`transient render state remains bounded: ${JSON.stringify(transient)}`);
    logStage("canonical desktop: complete");
  }

  {
    logStage("mobile landscape: create and navigate");
    const state=await newGamePage({width:844,height:390});
    await withTimeout(state.page.goto(canonical,{waitUntil:"domcontentloaded",timeout:15000}),STAGE_TIMEOUT_MS,"mobile navigation");
    logStage("mobile landscape: wait for gameReady");
    await waitForReady(state,"mobile landscape");
    await state.page.waitForTimeout(900);
    await assertHealthy(state,"mobile landscape launch");
    const canvas=await withTimeout(state.page.evaluate(()=>({w:game.width,h:game.height,pixels:game.width*game.height})),3000,"mobile canvas budget read");
    assert.ok(canvas.pixels<=1900000,`mobile canvas remains inside coarse-device budget ceiling: ${canvas.w}x${canvas.h}`);
    logStage("mobile landscape: complete");
  }

  {
    logStage("legacy redirect: create and navigate");
    const state=await newGamePage();
    await withTimeout(state.page.goto(legacy,{waitUntil:"domcontentloaded",timeout:15000}),STAGE_TIMEOUT_MS,"legacy navigation");
    logStage("legacy redirect: wait for canonical URL");
    await withTimeout(state.page.waitForURL(url=>url.pathname==="/arcade/lost-sizzler/",{timeout:10000}),12000,"legacy redirect");
    logStage("legacy redirect: wait for gameReady");
    await waitForReady(state,"legacy redirect");
    await assertHealthy(state,"legacy redirect launch");
    assert.equal(new URL(state.page.url()).pathname,"/arcade/lost-sizzler/","legacy URL redirects once to canonical arcade runtime");
    logStage("legacy redirect: complete");
  }

  clearTimeout(watchdog);
  console.log(`Lost Sizzler real-browser startup, resize, redirect and crash checks passed in ${Date.now()-startedAt}ms`);
}catch(error){
  clearTimeout(watchdog);
  console.error(`[Lost Sizzler browser] FAILED at stage: ${currentStage}`);
  throw error;
}finally{
  logStage("cleanup browser contexts");
  for(const context of contexts)await closeSafely(context,"context close");
  logStage("cleanup Chromium");
  await closeSafely(browser,"browser close");
  logStage("cleanup local server");
  try{server.closeAllConnections?.();}catch(_){}
  for(const socket of sockets)try{socket.destroy();}catch(_){}
  try{await withTimeout(new Promise(resolve=>server.close(()=>resolve())),CLEANUP_TIMEOUT_MS,"server close");}catch(error){console.warn(`[Lost Sizzler browser] server close: ${error.message}`);}
  clearTimeout(watchdog);
}
