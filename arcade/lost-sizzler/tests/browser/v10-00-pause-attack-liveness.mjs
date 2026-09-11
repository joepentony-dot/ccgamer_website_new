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
  const context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV142R18SoloPlaytestStability),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(p1)&&Boolean(host),null,{timeout:30000});

  await page.evaluate(()=>{
    host.enemies=[];enemyBullets.length=0;hazards.length=0;bullets.length=0;
    p1.firearmUnlocked=true;p1.weapon=baseWeapon();p1.mana=220;p1.maxMana=Math.max(p1.maxMana,220);
    fire1=0;fireBuffer1=0;projectileCD=0;
  });

  for(let i=0;i<12;i++){
    await page.keyboard.press("KeyP");
    await page.waitForFunction(()=>mode==="paused");
    if(i===11)await page.evaluate(()=>{fire1=1200;fireBuffer1=900;projectileCD=600});
    await page.keyboard.press("KeyP");
    await page.waitForFunction(()=>mode==="playing");
  }

  await page.waitForFunction(()=>fire1===0&&fireBuffer1===0&&projectileCD===0);
  const keyboardBefore=await page.evaluate(()=>({mana:p1.mana,diag:{...window.CCGLostSizzlerV142R18SoloPlaytestStability.diagnostics}}));
  assert.ok(keyboardBefore.diag.pauseResumeAttackRepairs>=1,`finite stuck attack timers must be repaired after repeated P-key pauses: ${JSON.stringify(keyboardBefore)}`);
  await page.keyboard.press("Space");
  await page.waitForFunction(before=>p1.mana<before,keyboardBefore.mana,{timeout:4000});

  await page.keyboard.press("KeyP");
  await page.waitForFunction(()=>mode==="paused");
  await page.evaluate(()=>{fire1=850;fireBuffer1=650;projectileCD=400});
  await page.click("#resume-btn");
  await page.waitForFunction(()=>mode==="playing"&&fire1===0&&fireBuffer1===0&&projectileCD===0);
  const buttonBefore=await page.evaluate(()=>p1.mana);
  await page.keyboard.press("Space");
  await page.waitForFunction(before=>p1.mana<before,buttonBefore,{timeout:4000});

  const finalState=await page.evaluate(()=>({mode,runActive:document.body.dataset.runActive,mana:p1.mana,diag:{...window.CCGLostSizzlerV142R18SoloPlaytestStability.diagnostics}}));
  assert.equal(finalState.mode,"playing");
  assert.equal(finalState.runActive,"true");
  assert.ok(finalState.mana<keyboardBefore.mana,"attacks must remain live after keyboard and Continue-button pause/resume paths");
  assert.deepEqual(errors,[],`pause attack-liveness regression produced page errors: ${JSON.stringify(errors,null,2)}`);
  console.log("Repeated pause/resume attack liveness browser regression passed");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
