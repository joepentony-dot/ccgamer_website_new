import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={
  ".html":"text/html; charset=utf-8",
  ".js":"text/javascript; charset=utf-8",
  ".css":"text/css; charset=utf-8",
  ".json":"application/json; charset=utf-8",
  ".svg":"image/svg+xml",
  ".webp":"image/webp",
  ".png":"image/png",
  ".ogg":"audio/ogg"
};

const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404).end("not found");return}
      res.setHeader("content-type",mime[path.extname(file).toLowerCase()]||"application/octet-stream");
      res.setHeader("cache-control","no-store");res.setHeader("connection","close");res.end(data)
    })
  }catch(error){res.writeHead(500).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});

await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  const page=await context.newPage();page.setDefaultTimeout(25000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true");

  const dormant=await page.evaluate(()=>({
    r38:Boolean(document.querySelector('script[data-ccg-v141-r38-colyseus-horde="true"]')),
    r39:Boolean(document.querySelector('script[data-ccg-v141-r39-horde-responsive-handoff="true"]')),
    mode:document.body.dataset.specialMode||""
  }));
  assert.equal(dormant.mode,"","normal menu must not masquerade as Horde");
  assert.equal(dormant.r38,false,"Colyseus Horde adapter must not load on the normal menu");
  assert.equal(dormant.r39,false,"Horde responsive finalizer must not load on the normal menu");

  await page.evaluate(()=>{
    const api=window.CCGLostSizzlerSpecialModes;
    Object.defineProperty(api,"active",{configurable:true,value:{
      type:"horde-survivor",authoritative:false,seed:"R39-LAYOUT",
      state:{seed:"R39-LAYOUT",state:"briefing",wave:0,players:[],activeEnemies:[],boss:null,health:{active:[],nextSpawnAt:Date.now()+20000}}
    }});
    document.body.dataset.specialMode="horde-survivor";
    document.body.dataset.runActive="true";
  });

  // First prove the Horde-only finalizer lazy-loads after Horde activation.
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R39HordeResponsive?.state?.styleInstalled));

  // Exercise the late-roster recovery path deterministically. On a busy browser
  // the retained V10.38 layer can legitimately recreate/place the roster before
  // r39's observer is sampled. Remove any such roster only after r39 is loaded,
  // explicitly arm the finalizer's watcher, then create a late roster and prove
  // that r39 moves it out of the arena into the tactical region.
  await page.evaluate(()=>{
    document.getElementById("horde-live-roster")?.remove();
    window.CCGLostSizzlerV141R39HordeResponsive?.watchRosterPlacement?.();
  });
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R39HordeResponsive?.state?.rosterWatchActive===true);

  // The r39 lazy-loader and the pre-existing Horde status observer are separate
  // ownership paths. Synchronise the status owner directly so geometry checks
  // do not depend on MutationObserver scheduling.
  await page.evaluate(()=>{
    const frame=window.CCGLostSizzlerV141HordeFramePerformance;
    frame?.ensureStatusStrip?.();
    frame?.syncStatusTimer?.();
  });
  await page.waitForFunction(()=>Boolean(document.getElementById("horde-performance-status")));

  await page.evaluate(()=>{
    const gameArea=document.querySelector(".game-area");
    const panel=document.createElement("aside");panel.id="horde-live-roster";panel.setAttribute("aria-label","Horde players currently playing");
    panel.innerHTML='<div class="v138-head"><span>HORDE PLAYERS</span><span id="horde-live-count">1/4</span></div><span id="horde-live-room" class="v138-join">ROOM TEST · JOIN ANY TIME</span><ul id="horde-live-list"><li>CCG Player · YOU</li></ul>';
    gameArea?.appendChild(panel)
  });
  await page.waitForFunction(()=>document.getElementById("horde-live-roster")?.parentElement?.classList?.contains("tactical-zone")&&window.CCGLostSizzlerV141R39HordeResponsive?.state?.rosterWatchActive===false);
  await page.waitForTimeout(100);

  const desktop=await page.evaluate(()=>{
    const rect=selector=>{const node=document.querySelector(selector);if(!node)return null;const r=node.getBoundingClientRect();return{left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,display:getComputedStyle(node).display}};
    const status=rect("#horde-performance-status"),game=rect(".v102-game-area"),wrap=rect(".v102-game-area .canvas-wrap"),hub=rect(".player-hub"),tactical=rect(".tactical-zone"),radar=rect(".tactical-zone>.radar-card"),roster=document.getElementById("horde-live-roster");
    return{innerHeight,scrollHeight:document.documentElement.scrollHeight,status,game,wrap,hub,tactical,radar,rosterParent:roster?.parentElement?.className||"",rosterDisplay:roster?getComputedStyle(roster).display:"missing",rosterMoves:window.CCGLostSizzlerV141R39HordeResponsive?.state?.rosterMoves||0}
  });
  assert.ok(desktop.status&&desktop.game&&desktop.wrap&&desktop.hub&&desktop.tactical&&desktop.radar,"desktop Horde layout elements must exist");
  assert.ok(desktop.status.height>=20&&desktop.status.height<=40,`desktop Horde wave/enemy strip must remain compact: ${desktop.status.height}px`);
  assert.ok(desktop.status.bottom<=desktop.game.top+2,`desktop Horde wave/enemy strip must sit above the arena: status ${desktop.status.bottom}, game ${desktop.game.top}`);
  assert.ok(desktop.game.height>desktop.innerHeight*.58,`desktop Horde arena row must use most of the viewport: ${desktop.game.height}/${desktop.innerHeight}`);
  assert.ok(Math.abs(desktop.wrap.height-desktop.game.height)<=10,`desktop canvas wrapper must fill game row instead of leaving a black band: game ${desktop.game.height}, wrap ${desktop.wrap.height}`);
  assert.ok(Math.abs(desktop.hub.top-desktop.game.bottom)<=8,`desktop HUD must meet the arena without a giant black gap: ${desktop.hub.top-desktop.game.bottom}px`);
  assert.ok(desktop.tactical.left>=desktop.game.right-2,"desktop radar/tactical region must occupy the dedicated right column");
  assert.ok(Math.abs(desktop.tactical.height-desktop.game.height)<=10,"desktop radar column must use the same vertical gameplay row as the arena");
  assert.ok(desktop.rosterParent.includes("tactical-zone"),"Horde roster must use the tactical side region instead of floating over the arena");
  assert.ok(desktop.rosterMoves>=1,"late Horde roster must be actively moved out of the arena by r39");
  assert.equal(desktop.rosterDisplay,"block","Horde roster must remain visible on desktop");
  assert.ok(desktop.scrollHeight<=desktop.innerHeight+2,`desktop Horde must not create page scrolling: ${desktop.scrollHeight}/${desktop.innerHeight}`);

  await page.setViewportSize({width:800,height:1000});
  await page.waitForTimeout(150);
  const tablet=await page.evaluate(()=>{
    window.CCGLostSizzlerV141R39HordeResponsive?.requestResize?.();
    const rect=selector=>{const node=document.querySelector(selector);if(!node)return null;const r=node.getBoundingClientRect();return{top:r.top,bottom:r.bottom,width:r.width,height:r.height,display:getComputedStyle(node).display}};
    const status=rect("#horde-performance-status"),game=rect(".v102-game-area"),wrap=rect(".v102-game-area .canvas-wrap"),hub=rect(".player-hub"),tactical=rect(".tactical-zone"),radar=rect(".tactical-zone>.radar-card"),roster=rect("#horde-live-roster");
    return{innerHeight,scrollHeight:document.documentElement.scrollHeight,status,game,wrap,hub,tactical,radar,roster}
  });
  assert.ok(tablet.status&&tablet.game&&tablet.wrap&&tablet.hub&&tablet.tactical&&tablet.roster,"tablet Horde layout elements must exist");
  assert.ok(tablet.status.bottom<=tablet.game.top+2,"tablet Horde wave/enemy strip must remain directly above gameplay");
  assert.ok(tablet.game.height>tablet.innerHeight*.64,`tablet Horde arena must use the available screen rather than becoming an endless page: ${tablet.game.height}/${tablet.innerHeight}`);
  assert.ok(Math.abs(tablet.wrap.height-tablet.game.height)<=8,"tablet canvas wrapper must fill the bounded gameplay row");
  assert.ok(Math.abs(tablet.hub.top-tablet.game.bottom)<=6,"tablet HUD must follow the arena directly");
  assert.equal(tablet.radar?.display,"none","tablet Horde must remove the desktop radar to preserve arena space");
  assert.equal(tablet.roster?.display,"block","tablet Horde player roster must remain available in the compact lower strip");
  assert.ok(tablet.scrollHeight<=tablet.innerHeight+2,`tablet Horde must remain within one dynamic viewport: ${tablet.scrollHeight}/${tablet.innerHeight}`);

  assert.deepEqual(errors,[],`r39 Horde responsive launch must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.41 r39 lazy Colyseus loading, deterministic late-roster recovery, fixed status row and desktop/tablet Horde viewport layout passed in Chromium.");
  await context.close()
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()))
}
