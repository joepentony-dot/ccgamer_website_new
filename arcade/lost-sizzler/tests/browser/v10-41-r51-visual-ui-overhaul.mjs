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
const server=http.createServer((req,res)=>{try{const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)})}catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&Boolean(window.CCGLostSizzlerV141R51VisualUIOverhaul)&&Boolean(window.CCGLostSizzlerV141R51WorldLighting)&&Boolean(window.CCGLostSizzlerV141R51MenuFocus)&&Boolean(window.CCGLostSizzlerV141R51RenderOwnershipFinalizer));
  await page.waitForFunction(()=>document.body.dataset.v141R51Menu==="true"&&document.body.dataset.v141R51Visual==="true"&&document.body.dataset.v141R51Lighting==="true"&&document.body.dataset.v141R51MenuFocus==="true"&&document.body.dataset.v141R51RenderOwner==="true");

  const menu=await page.evaluate(()=>({
    styled:Boolean(document.querySelector('link[data-ccg-v141-r51-style="true"]')),
    panel:document.querySelector("#menu .panel")?.classList.contains("r51-menu-panel"),
    guide:Boolean(document.getElementById("ccg-r51-menu-guide")),
    soloDesc:document.getElementById("solo-btn")?.dataset.r51Desc,
    dungeonDesc:document.getElementById("create-btn")?.dataset.r51Desc,
    focusLabel:document.getElementById("split-btn")?.getAttribute("aria-label")
  }));
  assert.equal(menu.styled,true);
  assert.equal(menu.panel,true);
  assert.equal(menu.guide,true);
  assert.match(menu.soloDesc,/Five floors/);
  assert.match(menu.dungeonDesc,/four players/i);
  assert.match(menu.focusLabel,/Two controllers/i);

  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof p1!=="undefined"&&Boolean(p1));
  await page.waitForFunction(()=>Boolean(window.drawPlayer?.__ccgV141R51VisualPolish)&&Boolean(window.drawEnemy?.__ccgV141R51VisualPolish));

  const ownershipRecovery=await page.evaluate(()=>{
    const owner=window.CCGLostSizzlerV141R51RenderOwnershipFinalizer;
    const before=owner.state.enemyRepairs;
    const wrapped=window.drawEnemy;
    const underlying=wrapped?.__ccgOriginal;
    if(typeof underlying==="function")window.drawEnemy=underlying;
    const detached=Boolean(typeof window.drawEnemy==="function"&&!window.drawEnemy.__ccgV141R51VisualPolish);
    owner.repair();
    return{detached,repaired:Boolean(window.drawEnemy?.__ccgV141R51VisualPolish),repairDelta:owner.state.enemyRepairs-before,preservedCurrent:Boolean(window.drawEnemy?.__ccgOriginal===underlying)}
  });
  assert.equal(ownershipRecovery.detached,true,"fixture must reproduce a late renderer replacing R51");
  assert.equal(ownershipRecovery.repaired,true,"R51 ownership finalizer must reattach visual polish");
  assert.ok(ownershipRecovery.repairDelta>=1,"R51 ownership finalizer must record the enemy repair");
  assert.equal(ownershipRecovery.preservedCurrent,true,"R51 must wrap the active late renderer rather than discard it");

  await page.waitForTimeout(650);
  await page.waitForFunction(()=>Boolean(window.drawPlayer?.__ccgV141R51VisualPolish)&&Boolean(window.drawEnemy?.__ccgV141R51VisualPolish));
  const visual=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R51VisualUIOverhaul,before={x:p1.x,y:p1.y,health:p1.health,score:typeof score!=="undefined"?score:null},player=api.playerTransform(p1),enemy=(host?.enemies||[]).find(row=>row?.alive),enemyTransformValue=enemy?api.enemyTransform(enemy):null,layer=document.getElementById("ccg-r51-world-lighting"),canvas=document.getElementById("game");
    document.body.dataset.v141R47PerformanceTier="normal";
    window.CCGLostSizzlerV141R51WorldLighting?.install?.();
    api.updateLighting();
    const normalFilter=canvas?.style.filter||"";
    document.body.dataset.v141R47PerformanceTier="severe";
    window.CCGLostSizzlerV141R51WorldLighting?.install?.();
    const severeFilter=canvas?.style.filter||"";
    document.body.dataset.v141R47PerformanceTier="normal";
    window.CCGLostSizzlerV141R51WorldLighting?.install?.();
    const after={x:p1.x,y:p1.y,health:p1.health,score:typeof score!=="undefined"?score:null};
    return{before,after,player,enemyTransformValue,layer:Boolean(layer),ambient:layer?.style.getPropertyValue("--r51-ambient-rgb"),normalFilter,severeFilter,playerWrapped:Boolean(window.drawPlayer?.__ccgV141R51VisualPolish),enemyWrapped:Boolean(window.drawEnemy?.__ccgV141R51VisualPolish),diag:{playerFrames:api.state.playerFrames,enemyFrames:api.state.enemyFrames,lightingUpdates:api.state.lightingUpdates}}
  });
  assert.deepEqual(visual.after,visual.before,"visual polish must not mutate canonical gameplay state");
  assert.equal(visual.layer,true);
  assert.ok(visual.ambient.length>0);
  assert.match(visual.normalFilter,/saturate/,"normal R47 performance tier must receive the bounded R51 canvas polish");
  assert.equal(visual.severeFilter,"","severe R47 performance tier must shed the optional R51 canvas filter");
  assert.equal(visual.playerWrapped,true);
  assert.equal(visual.enemyWrapped,true);
  assert.ok(Number.isFinite(visual.player.sx)&&Number.isFinite(visual.player.sy));
  assert.ok(visual.diag.playerFrames>0,"real player renderer must pass through R51");
  assert.ok(visual.diag.enemyFrames>=0);
  assert.ok(visual.diag.lightingUpdates>0);

  const focus=await page.evaluate(async()=>{await quitToMenu();const api=window.CCGLostSizzlerV141R51MenuFocus,before=api.state.focusMoves,button=document.getElementById("create-btn");button.focus();await new Promise(resolve=>setTimeout(resolve,40));const style=getComputedStyle(button);return{active:document.activeElement?.id,outline:style.outlineStyle,outlineWidth:style.outlineWidth,moves:api.state.focusMoves-before}});
  assert.equal(focus.active,"create-btn");
  assert.notEqual(focus.outline,"none","keyboard/controller focus must remain visually obvious");
  assert.ok(focus.moves>=1,"menu focus helper must keep keyboard/controller focus visible");
  assert.deepEqual(errors,[],`r51 browser test must not raise page errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler V10.41 r51 visual polish, adaptive lighting, renderer recovery and menu usability passed in Chromium.");
  await context.close();
}finally{
  await browser.close().catch(()=>{});for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}