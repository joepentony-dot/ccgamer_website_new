import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".ogg":"audio/ogg",".mp3":"audio/mpeg",".wav":"audio/wav"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});
      res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  await context.route("https://*.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:"{}"}));
  const page=await context.newPage();
  page.setDefaultTimeout(90000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  let releaseFirstScript;
  const firstScriptGate=new Promise(resolve=>{releaseFirstScript=resolve});
  let firstScriptSeen;
  const firstScriptPaused=new Promise(resolve=>{firstScriptSeen=resolve});
  await page.route("**/arcade/lost-sizzler/js/v10-41-cache-guard.js*",async route=>{
    firstScriptSeen();
    await firstScriptGate;
    await route.continue();
  });

  let releaseFiveDepth;
  const fiveDepthGate=new Promise(resolve=>{releaseFiveDepth=resolve});
  let fiveDepthSeen;
  const fiveDepthPaused=new Promise(resolve=>{fiveDepthSeen=resolve});
  await page.route("**/arcade/lost-sizzler/js/v10-42-five-depth-campaign.js*",async route=>{
    fiveDepthSeen();
    await fiveDepthGate;
    await route.continue();
  });

  await page.goto(`${origin}/arcade/lost-sizzler/?startup-first-visual=1`,{waitUntil:"commit",timeout:90000});
  await firstScriptPaused;
  await page.waitForFunction(()=>{
    const loaderCss=document.querySelector('link[data-ccg-v136-special-ui="true"]');
    const startupCss=[...document.querySelectorAll('link[rel="stylesheet"]')].find(link=>String(link.getAttribute("href")||"").includes("v10-42-startup-first-visual.css"));
    return Boolean(document.getElementById("ccg-release-loading")&&loaderCss?.sheet&&startupCss?.sheet);
  },null,{timeout:10000});

  const first=await page.evaluate(()=>{
    const loader=document.getElementById("ccg-release-loading"),rect=loader?.getBoundingClientRect(),style=loader?getComputedStyle(loader):null;
    const sample=id=>{
      const element=document.getElementById(id),computed=element?getComputedStyle(element):null;
      return element&&computed?{
        color:computed.color,
        minHeight:computed.minHeight,
        padding:computed.padding,
        textShadow:computed.textShadow,
        filter:computed.filter,
        beforeTop:getComputedStyle(element,"::before").top,
        afterBottom:getComputedStyle(element,"::after").bottom
      }:null;
    };
    return {
      releaseReady:document.body?.dataset?.releaseReady,
      loader:{
        exists:Boolean(loader),
        hidden:Boolean(loader?.hidden),
        display:style?.display||"",
        position:style?.position||"",
        zIndex:Number(style?.zIndex||0),
        left:Math.round(rect?.left||0),
        top:Math.round(rect?.top||0),
        width:Math.round(rect?.width||0),
        height:Math.round(rect?.height||0)
      },
      viewport:{width:innerWidth,height:innerHeight},
      buttons:Object.fromEntries(["solo-btn","split-btn","tutorial-zone-btn","daily-btn"].map(id=>[id,sample(id)]))
    };
  });

  assert.equal(first.releaseReady,"false","release readiness must still be false before the first runtime script executes");
  assert.equal(first.loader.exists,true,"release loader must already exist before any runtime script executes");
  assert.equal(first.loader.hidden,false,"release loader must be visible for the parser-blocked first visual state");
  assert.equal(first.loader.display,"grid","blocking loader CSS must already be applied before runtime JavaScript");
  assert.equal(first.loader.position,"fixed","first visual loader must own viewport geometry");
  assert.ok(first.loader.zIndex>1000000,"first visual loader must sit above the game shell");
  assert.equal(first.loader.left,0);assert.equal(first.loader.top,0);
  assert.ok(first.loader.width>=first.viewport.width&&first.loader.height>=first.viewport.height,"first visual loader must cover the complete viewport");
  for(const [id,state] of Object.entries(first.buttons))assert.ok(state,`${id} must already exist under the loader at the parser-blocked first visual state`);

  releaseFirstScript();
  await page.waitForLoadState("domcontentloaded",{timeout:90000});
  await fiveDepthPaused;
  await page.waitForFunction(()=>window.CCGLostSizzlerReleaseGate?.state?.ready===true,null,{timeout:90000});
  await page.waitForFunction(()=>window.CCGLostSizzlerV142Bootstrap&&window.CCGLostSizzlerV142Bootstrap.ready!==true,null,{timeout:10000});

  const legacyReadyMid=await page.evaluate(()=>{
    const loader=document.getElementById("ccg-release-loading");
    const feature=[...document.querySelectorAll("#menu .feature-strip span")].map(node=>String(node.textContent||"").trim());
    return {
      legacyReady:Boolean(window.CCGLostSizzlerReleaseGate?.state?.ready),
      v142Ready:Boolean(window.CCGLostSizzlerV142Bootstrap?.ready),
      bodyReleaseReady:document.body?.dataset?.releaseReady,
      v142BootstrapReady:document.body?.dataset?.v142BootstrapReady,
      loaderHidden:Boolean(loader?.hidden),
      loaderDisplay:loader?getComputedStyle(loader).display:"",
      feature
    };
  });

  assert.equal(legacyReadyMid.legacyReady,true,"legacy release gate must be ready in the held V10.42 startup window");
  assert.equal(legacyReadyMid.v142Ready,false,"held five-depth module must keep V10.42 ordered bootstrap unfinished");
  assert.notEqual(legacyReadyMid.bodyReleaseReady,"true","authoritative release readiness must remain false while V10.42 is unfinished");
  assert.equal(legacyReadyMid.loaderHidden,false,"legacy readiness alone must not reveal the pre-V10.42 menu");
  assert.equal(legacyReadyMid.loaderDisplay,"grid","loader must continue covering the old/intermediate menu while V10.42 is unfinished");
  assert.ok(!legacyReadyMid.feature.some(text=>text.startsWith("5 PROCEDURAL DEPTHS")),"held five-depth owner must prove the final campaign copy has not landed yet");

  const transientLegacyPulse=await page.evaluate(()=>{
    const loader=document.getElementById("ccg-release-loading");
    const before=document.body?.dataset?.releaseReady;
    document.body.dataset.releaseReady="true";
    const during={
      display:loader?getComputedStyle(loader).display:"",
      visibility:loader?getComputedStyle(loader).visibility:"",
      hidden:Boolean(loader?.hidden),
      v142Ready:Boolean(window.CCGLostSizzlerV142Bootstrap?.ready),
      v142BootstrapReady:document.body?.dataset?.v142BootstrapReady
    };
    document.body.dataset.releaseReady=before||"false";
    return during;
  });

  assert.equal(transientLegacyPulse.v142Ready,false,"legacy pulse probe must run while V10.42 is unfinished");
  assert.notEqual(transientLegacyPulse.v142BootstrapReady,"true","legacy pulse probe must precede authoritative V10.42 readiness");
  assert.equal(transientLegacyPulse.hidden,false,"legacy readiness pulse must not set the canonical loader hidden flag");
  assert.equal(transientLegacyPulse.display,"grid","legacy readiness pulse must not expose the underlying menu even for one rendered frame");
  assert.notEqual(transientLegacyPulse.visibility,"hidden","legacy readiness pulse must not CSS-hide the loader");

  releaseFiveDepth();
  await page.waitForFunction(()=>document.body?.dataset?.releaseReady==="true"&&document.body?.dataset?.gameReady==="true",null,{timeout:90000});
  await page.waitForFunction(()=>document.querySelector("#menu .game-mode-buttons")?.dataset?.r55TextLayout==="true",null,{timeout:15000});
  await page.waitForFunction(()=>document.getElementById("ccg-release-loading")?.hidden===true,null,{timeout:15000});

  const settled=await page.evaluate(()=>{
    const loader=document.getElementById("ccg-release-loading");
    const sample=id=>{
      const element=document.getElementById(id),computed=element?getComputedStyle(element):null;
      return element&&computed?{
        color:computed.color,
        minHeight:computed.minHeight,
        padding:computed.padding,
        textShadow:computed.textShadow,
        filter:computed.filter,
        beforeTop:getComputedStyle(element,"::before").top,
        afterBottom:getComputedStyle(element,"::after").bottom
      }:null;
    };
    return {
      loaderHidden:Boolean(loader?.hidden),
      loaderDisplay:loader?getComputedStyle(loader).display:"",
      feature:[...document.querySelectorAll("#menu .feature-strip span")].map(node=>String(node.textContent||"").trim()),
      buttons:Object.fromEntries(["solo-btn","split-btn","tutorial-zone-btn","daily-btn"].map(id=>[id,sample(id)]))
    };
  });

  assert.equal(settled.loaderHidden,true,"loader must be removed atomically only after the release is ready");
  assert.equal(settled.loaderDisplay,"none","settled release loader must not intercept the ready menu");
  assert.equal(settled.feature[0]?.startsWith("5 PROCEDURAL DEPTHS"),true,"menu must reveal only after final five-depth campaign copy is installed");
  assert.equal(settled.feature[1]?.startsWith("RPG CHARACTER BUILD"),true,"RPG campaign copy must be settled before reveal");
  assert.equal(settled.feature[2]?.startsWith("THREE GLOBAL KEYS"),true,"global-key campaign copy must be settled before reveal");
  for(const id of Object.keys(first.buttons)){
    assert.deepEqual(settled.buttons[id],first.buttons[id],`${id} must not visibly change colour or text geometry between first paint and the settled R55 state`);
  }
  assert.deepEqual(errors,[],`startup first-visual contract must have no uncaught browser errors: ${errors.join("\n")}`);

  console.log("DUNGEON_STARTUP_FIRST_VISUAL",JSON.stringify({first,legacyReadyMid,transientLegacyPulse,settled}));
  console.log("Dungeon Carnage startup first-visual browser contract passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
