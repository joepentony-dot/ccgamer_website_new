import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  console.log("[r57 video] load canonical Solo runtime");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R29)&&Boolean(window.CCGLostSizzlerV141R56PlaytestCompletion)&&Boolean(window.CCGLostSizzlerV141R59LiveRegressionFixes)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1)&&Boolean(host)&&Boolean(window.loop?.__ccgV141R29Stable)&&Boolean(window.loop?.__ccgV141R59PauseClock),null,{timeout:20000});

  console.log("[r57 video] duplicate RAF timestamp cannot accelerate simulation");
  const duplicate=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R29,state=api.state,r59=window.CCGLostSizzlerV141R59LiveRegressionFixes;
    const oldUpdate=window.update,oldRender=window.render,oldRaf=window.requestAnimationFrame,oldLoop=window.loop,oldLast=last,oldAccepted=r59.state.lastAcceptedRafTimestamp;
    let updates=0,renders=0,rafs=0;const dts=[];
    try{
      window.update=dt=>{updates++;dts.push(Number(dt))};
      window.render=()=>{renders++};
      window.requestAnimationFrame=()=>{rafs++;return 1};
      window.loop=api.stableLoop;
      const base=performance.now();last=base-16;r59.setAcceptedRafTimestamp(null);
      const skippedBefore=Number(state.duplicateFramesSkipped||0);
      api.stableLoop(base);
      api.stableLoop(base);
      const afterDuplicate={updates,renders,rafs,skipped:Number(state.duplicateFramesSkipped||0)-skippedBefore};
      api.stableLoop(base+16);
      return{afterDuplicate,afterNext:{updates,renders,rafs},dts:[...dts]};
    }finally{
      window.update=oldUpdate;window.render=oldRender;window.requestAnimationFrame=oldRaf;window.loop=oldLoop;last=oldLast;r59.setAcceptedRafTimestamp(oldAccepted);
    }
  });
  assert.deepEqual(duplicate.afterDuplicate,{updates:1,renders:1,rafs:1,skipped:1},`same-timestamp duplicate RAF callback must not advance or perpetuate a second simulation chain: ${JSON.stringify(duplicate)}`);
  assert.deepEqual(duplicate.afterNext,{updates:2,renders:2,rafs:2},`the next real RAF timestamp must resume exactly one simulation chain: ${JSON.stringify(duplicate)}`);
  assert.ok(duplicate.dts.every(dt=>dt>=0&&dt<=45),`accepted frame deltas must remain bounded: ${JSON.stringify(duplicate)}`);

  console.log("[r57 video] browser stall cannot leave PULSE fire input dead");
  const stallBefore=await page.evaluate(()=>{
    for(const enemy of host.enemies||[]){enemy.alive=false;enemy.active=false}
    host.blockingDecor=[];host.generators=[];
    p1.health=Math.max(3,Number(p1.maxHealth)||3);p1.firearmUnlocked=true;
    p1.weapon={id:"pulse",name:"Pulse Blaster",displayName:"Pulse Blaster",element:"energy",power:1,delay:1,shots:1,ammo:1};
    p1.mana=50;p1.maxMana=Math.max(120,Number(p1.maxMana)||120);p1.hitStunMs=500;p1.controlLocked=true;p1.controlsLocked=true;
    fire1=500;fireBuffer1=0;bullets.length=0;input.clear();
    const before={stalls:Number(window.CCGLostSizzlerV141R29.state.frameStalls||0),recoveries:Number(window.CCGLostSizzlerV141R29.state.combatStallRecoveries||0),mana:Number(p1.mana)};
    const until=performance.now()+800;while(performance.now()<until){}
    return before;
  });
  await page.waitForFunction(before=>Number(window.CCGLostSizzlerV141R29?.state?.frameStalls||0)>before.stalls&&Number(fire1||0)<=0&&Number(p1?.hitStunMs||0)<=0&&!p1?.controlLocked&&!p1?.controlsLocked,stallBefore,{timeout:5000});
  const recovered=await page.evaluate(before=>({stalls:Number(window.CCGLostSizzlerV141R29.state.frameStalls||0)-before.stalls,recoveries:Number(window.CCGLostSizzlerV141R29.state.combatStallRecoveries||0)-before.recoveries,fire:Number(fire1||0),stun:Number(p1.hitStunMs||0),locked:Boolean(p1.controlLocked||p1.controlsLocked),mana:Number(p1.mana),bullets:bullets.length}),stallBefore);
  assert.ok(recovered.stalls>=1,`the real 800 ms main-thread stall must be detected by the authoritative frame loop: ${JSON.stringify(recovered)}`);
  assert.ok(recovered.recoveries>=1,`post-stall combat timing/locks must be repaired once: ${JSON.stringify(recovered)}`);
  assert.ok(recovered.fire<=0,`elapsed stall time must leave the stale PULSE cooldown ready to fire: ${JSON.stringify(recovered)}`);
  assert.equal(recovered.stun,0,`elapsed stall time must clear the stale hit-stun: ${JSON.stringify(recovered)}`);
  assert.equal(recovered.locked,false,`retained combat locks must not survive the browser stall: ${JSON.stringify(recovered)}`);

  const attackBefore=await page.evaluate(()=>({mana:Number(p1.mana),bullets:bullets.length}));
  await page.keyboard.press("Space");
  await page.waitForFunction(before=>Number(p1?.mana)<before.mana||bullets.length>before.bullets,attackBefore,{timeout:3000});
  const attackAfter=await page.evaluate(()=>({mana:Number(p1.mana),bullets:bullets.length,fire:Number(fire1||0),mode}));
  assert.ok(attackAfter.mana<attackBefore.mana,`PULSE with ammunition must fire after stall recovery instead of becoming unresponsive: before=${JSON.stringify(attackBefore)} after=${JSON.stringify(attackAfter)}`);
  assert.ok(attackAfter.bullets>attackBefore.bullets||attackAfter.fire>0,`post-stall PULSE input must create live firearm state: ${JSON.stringify(attackAfter)}`);
  assert.equal(attackAfter.mode,"playing","combat recovery must not change the active game mode");

  assert.deepEqual(errors,[],`video-regression browser test produced page errors: ${errors.join("\n")}`);
  console.log("R57 video-reproduced duplicate-frame acceleration and dead-PULSE recovery passed in Chromium.");
  await context.close();
}finally{
  await browser.close().catch(()=>{});
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}