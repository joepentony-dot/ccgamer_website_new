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
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(60000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  console.log("[r36 Solo] load canonical page");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R31SoloDungeon)&&Boolean(window.CCGLostSizzlerV141R36SoloRenderRecovery)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});

  console.log("[r36 Solo] start real Solo Dungeon");
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&window.CCGLostSizzlerModeRuntime?.detect?.()==="dungeon-solo"&&Boolean(world&&host&&p1));
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R36SoloRenderRecovery?.state?.installed===true&&window.CCGLostSizzlerV141R36SoloRenderRecovery?.state?.renderWrapped===true);
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R36SoloRenderRecovery?.canvasHasVisibleFrame?.()===true);
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R36SoloRenderRecovery?.state?.backupReady===true,null,{timeout:10000});

  const initial=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R36SoloRenderRecovery;
    return{visible:api.canvasHasVisibleFrame(),backupReady:api.state.backupReady,backupCaptures:api.state.backupCaptures,controller:window.CCGLostSizzlerModeRuntime.detect(),health:Number(p1.health)};
  });
  assert.equal(initial.controller,"dungeon-solo","r36 browser regression must run under the Solo Dungeon controller");
  assert.equal(initial.visible,true,"a healthy Solo run must expose a visible game frame before fault injection");
  assert.equal(initial.backupReady,true,"r36 must preserve a healthy Solo frame before a fault occurs");
  assert.ok(initial.backupCaptures>=1,"the throttled watchdog must capture at least one healthy frame");

  console.log("[r36 Solo] inject persistent post-clear render fault");
  await page.evaluate(()=>{
    host.enemies=[];
    window.__r36OriginalDrawTile=window.drawTile;
    window.drawTile=function drawTileR36InjectedFault(){throw new Error("r36 injected tile render fault")};
  });
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R36SoloRenderRecovery?.state?.renderFaults>=2,null,{timeout:10000});
  await page.waitForFunction(()=>typeof mode!=="undefined"&&mode==="paused"&&!document.getElementById("pause").classList.contains("hidden"),null,{timeout:10000});

  const faulted=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R36SoloRenderRecovery;
    return{visible:api.canvasHasVisibleFrame(),faults:api.state.renderFaults,recoveries:api.state.renderFaultRecoveries,pauses:api.state.renderFaultPauses,mode,health:Number(p1.health),pauseVisible:!document.getElementById("pause").classList.contains("hidden"),message:api.state.lastRenderFault};
  });
  assert.ok(faulted.faults>=2,"the injected renderer must pass through the r36 persistent-fault boundary");
  assert.ok(faulted.recoveries>=1,"a render exception after the black clear must restore the last healthy frame");
  assert.equal(faulted.visible,true,"the user must continue seeing the last healthy game frame instead of a black canvas");
  assert.equal(faulted.mode,"paused","repeated render faults must pause Solo gameplay");
  assert.equal(faulted.pauseVisible,true,"persistent render failure must present a visible pause/recovery surface");
  assert.ok(faulted.pauses>=1,"persistent render failure must record the invisible-combat safety pause");
  assert.match(faulted.message,/r36 injected tile render fault/,"the recovery owner must retain useful render-fault diagnostics");
  assert.equal(faulted.health,initial.health,"the fault fixture must not lose health while the renderer is unavailable");
  await page.waitForTimeout(850);
  const pausedHealth=await page.evaluate(()=>Number(p1.health));
  assert.equal(pausedHealth,faulted.health,"the player must not keep taking damage behind a failed Solo renderer");

  console.log("[r36 Solo] restore renderer and resume");
  await page.evaluate(()=>{window.drawTile=window.__r36OriginalDrawTile;delete window.__r36OriginalDrawTile;window.CCGLostSizzlerV141R36SoloRenderRecovery.resumeAfterRecovery()});
  await page.waitForFunction(()=>typeof mode!=="undefined"&&mode==="playing"&&window.CCGLostSizzlerV141R36SoloRenderRecovery?.canvasHasVisibleFrame?.()===true,null,{timeout:10000});

  console.log("[r36 Solo] recover a pure black canvas without an exception");
  const beforeBlank=await page.evaluate(()=>window.CCGLostSizzlerV141R36SoloRenderRecovery.state.blankRecoveries);
  await page.evaluate(()=>{ctx.save();ctx.setTransform?.(1,0,0,1,0,0);ctx.fillStyle=P.black;ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore()});
  const blackBeforeRecovery=await page.evaluate(()=>window.CCGLostSizzlerV141R36SoloRenderRecovery.canvasHasVisibleFrame());
  assert.equal(blackBeforeRecovery,false,"the blank-canvas fixture must actually produce a black game frame");
  await page.evaluate(()=>window.CCGLostSizzlerV141R36SoloRenderRecovery.recoverBlankCanvas(true));
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R36SoloRenderRecovery.canvasHasVisibleFrame()===true);
  const blankRecovered=await page.evaluate(()=>({count:window.CCGLostSizzlerV141R36SoloRenderRecovery.state.blankRecoveries,visible:window.CCGLostSizzlerV141R36SoloRenderRecovery.canvasHasVisibleFrame()}));
  assert.ok(blankRecovered.count>beforeBlank,"the watchdog recovery path must record a black-canvas restoration");
  assert.equal(blankRecovered.visible,true,"a pure black Solo canvas must be restored from the last healthy frame");

  console.log("[r36 Solo] repair invalid player coordinates");
  const coordinateRepair=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R36SoloRenderRecovery,before=api.state.coordinateRepairs;
    p1.x=Number.NaN;p1.y=Number.POSITIVE_INFINITY;p1.rx=Number.NaN;p1.ry=Number.NaN;
    const repaired=api.repairSoloCoordinates();
    return{repaired,before,after:api.state.coordinateRepairs,x:Number(p1.x),y:Number(p1.y),rx:Number(p1.rx),ry:Number(p1.ry),startX:Number(world.start.x),startY:Number(world.start.y)};
  });
  assert.equal(coordinateRepair.repaired,true,"invalid Solo player/camera input must enter the coordinate repair boundary");
  assert.ok(coordinateRepair.after>coordinateRepair.before,"coordinate repair must be observable");
  assert.equal(coordinateRepair.x,coordinateRepair.startX,"invalid x must recover to the current floor start");
  assert.equal(coordinateRepair.y,coordinateRepair.startY,"invalid y must recover to the current floor start");
  assert.ok(Number.isFinite(coordinateRepair.rx)&&Number.isFinite(coordinateRepair.ry),"render coordinates must be finite after recovery");

  assert.deepEqual(errors,[],`r36 Solo render recovery must contain injected render faults without uncaught page errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler r36 Solo render-fault, black-canvas backup and invisible-combat recovery passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}