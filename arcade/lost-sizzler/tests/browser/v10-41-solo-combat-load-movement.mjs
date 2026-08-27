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
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

const directionFor=async page=>page.evaluate(()=>{
  const dirs=[{dx:1,dy:0,code:"ArrowRight"},{dx:-1,dy:0,code:"ArrowLeft"},{dx:0,dy:1,code:"ArrowDown"},{dx:0,dy:-1,code:"ArrowUp"}];
  const q=dirs.find(row=>window.CCGWorld?.walkable?.(world.map,p1.x+row.dx,p1.y+row.dy,host)&&!(host.enemies||[]).some(e=>e.alive&&e.x===p1.x+row.dx&&e.y===p1.y+row.dy));
  return q?{...q,x:p1.x,y:p1.y}:null;
});
const prepareSolo=async(page,seed)=>page.evaluate(seed=>{
  run=PGR.makeRun({difficulty:"ARCADE",seed});playMode="solo";startWorld(PGR.floorSeed(run),false,false);mode="playing";
  document.body.dataset.runActive="true";document.body.dataset.specialMode="";delete document.body.dataset.hordeSolo;UI.menu?.classList.add("hidden");
  host.enemies=[];host.generators=[];host.traps=[];host.hazardRooms=[];hazards.length=0;enemyBullets.length=0;bullets.length=0;particles.length=0;rings.length=0;floaters.length=0;
  move1=0;fire1=0;fireBuffer1=0;input.clear();p1.hitStunMs=0;p1.invuln=0;p1.mana=Math.max(100,Number(p1.maxMana||0));p1.firearmUnlocked=true;
  window.CCGLostSizzlerModeRuntime?.sync?.("Solo combat-load regression prepare");
  return{x:p1.x,y:p1.y,controller:window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId||""};
},seed);

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  const page=await context.newPage();page.setDefaultTimeout(30000);
  const pageErrors=[];page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerModeRuntime)&&Boolean(window.CCGLostSizzlerV141R29));

  const prepared=await prepareSolo(page,"PHASE3-SOLO-FIRE-FAULT");
  assert.equal(prepared.controller,"dungeon-solo","combat-load regression must remain owned by Dungeon Solo");
  const direction=await directionFor(page);assert.ok(direction,"fault-injection regression needs one walkable adjacent tile");
  const ordering=await page.evaluate(async()=>{
    const source=await (await fetch("/arcade/lost-sizzler/js/game-play.js",{cache:"no-store"})).text();
    const updateStart=source.indexOf("function update(dt)");
    const updateSource=updateStart>=0?source.slice(updateStart):"";
    return{movement:updateSource.indexOf("if(move1<=0)"),fire:updateSource.indexOf('input.has("Space")')};
  });
  assert.ok(ordering.movement>=0&&ordering.fire>=0,"the canonical game-play.js update source must expose keyboard movement and firing blocks");
  assert.ok(ordering.movement<ordering.fire,`keyboard movement must be serviced before firing work in the canonical frame: ${JSON.stringify(ordering)}`);

  const faultBefore=await page.evaluate(()=>Number(window.CCGLostSizzlerV141R29?.state?.updateFaults||0));
  await page.evaluate(()=>{
    window.__ccgSoloCombatLoadRealFire=window.firePlayer;
    window.firePlayer=function soloCombatLoadInjectedFireFault(){throw new Error("LS-0826-18 injected fire-path fault")};
    move1=0;fire1=0;fireBuffer1=0;input.clear();p1.hitStunMs=0;
  });
  await page.keyboard.down(direction.code);await page.keyboard.down("Space");await page.waitForTimeout(280);await page.keyboard.up("Space");await page.keyboard.up(direction.code);await page.waitForTimeout(80);
  const faultResult=await page.evaluate(()=>{
    const result={x:p1.x,y:p1.y,updateFaults:Number(window.CCGLostSizzlerV141R29?.state?.updateFaults||0)};
    if(window.__ccgSoloCombatLoadRealFire){window.firePlayer=window.__ccgSoloCombatLoadRealFire;delete window.__ccgSoloCombatLoadRealFire}
    input.clear();return result;
  });
  assert.notDeepEqual({x:faultResult.x,y:faultResult.y},{x:direction.x,y:direction.y},"a firing subsystem fault must not prevent the held movement key being serviced first");
  assert.ok(faultResult.updateFaults>faultBefore,"the injected firing fault must be observed by the retained stable-loop containment path");

  await prepareSolo(page,"PHASE3-SOLO-SUSTAINED-FIRE");
  const loadedDirection=await directionFor(page);assert.ok(loadedDirection,"sustained-fire regression needs one walkable adjacent tile");
  const pressure=await page.evaluate(()=>{
    for(let i=0;i<850;i++)particles.push({x:p1.x*C.tile+C.tile/2,y:p1.y*C.tile+C.tile/2,vx:(i%5-2)*.15,vy:(i%7-3)*.12,life:1800+(i%300),col:P.cyan,size:1.5,drag:.97,glow:4});
    for(let i=0;i<90;i++)rings.push({x:p1.x*C.tile+C.tile/2,y:p1.y*C.tile+C.tile/2,r:3,max:28+(i%12),life:1200,col:P.gold});
    for(let i=0;i<120;i++)floaters.push({x:p1.x*C.tile+C.tile/2,y:p1.y*C.tile-3,text:"LOAD",life:1400,maxLife:1400,col:P.white,ownerId:null,pickup:false,startScale:1,endScale:1.1});
    p1.mana=Math.max(100,Number(p1.maxMana||0));p1.rapidMs=5000;move1=0;fire1=0;input.clear();
    return{particles:particles.length,rings:rings.length,floaters:floaters.length};
  });
  assert.ok(pressure.particles>=800&&pressure.rings>=80&&pressure.floaters>=100,"the sustained-fire scenario must create substantial effect pressure");
  await page.keyboard.down(loadedDirection.code);await page.keyboard.down("Space");await page.waitForTimeout(950);await page.keyboard.up("Space");await page.keyboard.up(loadedDirection.code);await page.waitForTimeout(100);
  const loadedResult=await page.evaluate(()=>({x:p1.x,y:p1.y,mode,controller:window.CCGLostSizzlerModeRuntime?.snapshot?.().activeId||"",recovery:Number(window.CCGLostSizzlerV141R30?.state?.watchdogRecoveries||0)}));
  assert.notDeepEqual({x:loadedResult.x,y:loadedResult.y},{x:loadedDirection.x,y:loadedDirection.y},"Dungeon Solo movement must continue while sustained fire and effect pressure are active");
  assert.equal(loadedResult.mode,"playing","combat pressure must not drop the Solo run out of playing state");
  assert.equal(loadedResult.controller,"dungeon-solo","combat pressure must not leak ownership into another game mode");

  assert.deepEqual(pageErrors,[],`Solo combat-load movement regression must have no uncaught browser errors: ${pageErrors.join("\n")}`);
  console.log("Lost Sizzler LS-0826-18 Solo movement-before-fire, fire-fault isolation ordering and sustained combat-load regression passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
