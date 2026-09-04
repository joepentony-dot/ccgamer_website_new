import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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
  const context=await browser.newContext({viewport:{width:1560,height:800}}),page=await context.newPage();
  page.setDefaultTimeout(60000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R57DesktopPrepStability)&&Boolean(document.getElementById("solo-btn")));
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&String(playMode)==="solo"&&String(mode)==="playing"&&Boolean(p1)&&Boolean(host),null,{timeout:20000});

  const sample=()=>page.evaluate(()=>{
    const r57=window.CCGLostSizzlerV141R57DesktopPrepStability.state,r56=window.CCGLostSizzlerV141R56PlaytestCompletion.state;
    return {
      r57:{bridges:Number(r57.r56Bridges||0),skips:Number(r57.r56BridgeSkips||0),dirty:Boolean(r57.r56BridgeDirty),retired:Number(r57.r56TimerRetired||0),stall:Number(r57.stallRecoveries||0),move:Number(r57.movementRepairs||0),trap:Number(r57.trapHits||0),shrine:Number(r57.shrinesActivated||0)},
      r56:{timer:Number(r56.timer||0),pending:Number(r56.pendingChests?.size||0),combat:Number(r56.combatRearms||0),cooldown:Number(r56.cooldownRepairs||0),buffer:Number(r56.bufferRepairs||0),stun:Number(r56.stunRepairs||0),mode:Number(r56.modeRepairs||0),trap:Number(r56.trapHits||0)}
    };
  });

  await page.waitForTimeout(360);
  const before=await sample();
  await page.waitForTimeout(1040);
  const stable=await sample();
  assert.equal(stable.r56.timer,0,"R57 must retire the retained R56 80 ms timer");
  assert.equal(stable.r56.pending,0,"stable Solo bridge measurement must not be contaminated by pending chest work");
  assert.equal(stable.r57.bridges-before.r57.bridges,0,`stable Solo must not re-run the retained R56 bridge while nothing changes: before=${JSON.stringify(before)} after=${JSON.stringify(stable)}`);
  assert.equal(stable.r56.cooldown-before.r56.cooldown,0,`stable Solo must not repeatedly repair retained R56 combat cooldowns: before=${JSON.stringify(before)} after=${JSON.stringify(stable)}`);
  assert.equal(stable.r56.buffer-before.r56.buffer,0,"stable Solo must not repeatedly repair retained R56 attack buffers");
  assert.equal(stable.r56.stun-before.r56.stun,0,"stable Solo must not repeatedly repair retained R56 stun state");
  assert.ok(stable.r57.skips>before.r57.skips,"stable Solo ticks must be observable as skipped R56 bridge work");

  const eventBefore=await sample();
  await page.evaluate(()=>{document.body.dataset.modeController="r57-stable-bridge-contract"});
  await page.waitForFunction(count=>Number(window.CCGLostSizzlerV141R57DesktopPrepStability.state.r56Bridges||0)>count,eventBefore.r57.bridges,{timeout:2000});
  const eventAfter=await sample();
  assert.equal(eventAfter.r57.bridges,eventBefore.r57.bridges+1,`one lifecycle mutation must drive exactly one retained R56 bridge pass: before=${JSON.stringify(eventBefore)} after=${JSON.stringify(eventAfter)}`);

  await page.waitForTimeout(640);
  const afterSettle=await sample();
  assert.equal(afterSettle.r57.bridges,eventAfter.r57.bridges,`R57 must return to skipped stable Solo bridge ticks after the lifecycle bridge settles: event=${JSON.stringify(eventAfter)} after=${JSON.stringify(afterSettle)}`);
  assert.equal(afterSettle.r56.cooldown,eventAfter.r56.cooldown,"post-event stable Solo must not resume retained R56 cooldown polling");
  assert.deepEqual(errors,[],`R57 stable bridge retirement regression must have no uncaught errors: ${errors.join("\n")}`);
  await context.close();
  console.log("R57 stable Solo retained bridge retirement regression passed.");
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
