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

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}});
  const page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R43SoloSave),null,{timeout:90000});

  await page.evaluate(()=>window.CCGLostSizzlerV141R43SoloSave.clearSoloSave());
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(run)&&Boolean(p1)&&Boolean(world)&&Boolean(host),null,{timeout:20000});
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R43SoloSave?.readEnvelope?.()?.summary?.floor===1,null,{timeout:10000});

  const saved=await page.evaluate(()=>{
    const envelope=window.CCGLostSizzlerV141R43SoloSave.readEnvelope();
    return{seed:envelope.checkpoint.run.seed,score:envelope.checkpoint.score,health:envelope.checkpoint.player.health,mana:envelope.checkpoint.player.mana,x:envelope.checkpoint.player.x,y:envelope.checkpoint.player.y};
  });

  await page.evaluate(()=>openPauseMenu());
  await page.waitForSelector("#pause:not(.hidden)");
  await page.click("#save-quit-solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="false"&&mode==="menu"&&!document.getElementById("menu").classList.contains("hidden"),null,{timeout:10000});
  await page.waitForFunction(()=>!document.getElementById("continue-save-btn").classList.contains("hidden"),null,{timeout:10000});

  await page.evaluate(()=>{
    window.__r43OriginalLeave=net.leave;
    net.leave=function stalledLeaveForR43Regression(){return new Promise(()=>{})};
  });

  await page.click("#continue-save-btn");
  let resumed=false;
  try{
    await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&run?.floor===1&&Boolean(world)&&Boolean(host)&&Boolean(p1),null,{timeout:3000});
    resumed=true;
  }finally{
    await page.evaluate(()=>{if(window.__r43OriginalLeave)net.leave=window.__r43OriginalLeave;delete window.__r43OriginalLeave});
  }

  assert.equal(resumed,true,"LS-SOLO-008: Continue must not wait for a stalled remote network leave before restoring a local Solo save");
  const restored=await page.evaluate(()=>({seed:run?.seed,score,health:p1?.health,mana:p1?.mana,x:p1?.x,y:p1?.y,playMode:String(playMode||""),connected:Boolean(net?.connected),resumes:Number(window.CCGLostSizzlerV141R43SoloSave?.state?.resumes||0)}));
  assert.equal(restored.seed,saved.seed,"stalled-leave recovery must restore the saved seed");
  assert.equal(restored.score,saved.score,"stalled-leave recovery must restore floor-entry score");
  assert.equal(restored.health,saved.health,"stalled-leave recovery must restore floor-entry health");
  assert.equal(restored.mana,saved.mana,"stalled-leave recovery must restore floor-entry ammunition");
  assert.equal(restored.x,saved.x,"stalled-leave recovery must restore entry X");
  assert.equal(restored.y,saved.y,"stalled-leave recovery must restore entry Y");
  assert.equal(restored.playMode,"solo","stalled-leave recovery must restore Solo ownership");
  assert.equal(restored.connected,false,"stalled-leave recovery must leave the local runtime disconnected");
  assert.ok(restored.resumes>=1,"stalled-leave recovery must advance the r43 resume diagnostic");
  assert.deepEqual(errors,[],`LS-SOLO-008 stalled-leave regression must not produce page errors: ${errors.join("\n")}`);
  console.log("LS-SOLO-008 Continue remains live when remote network leave never settles.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));
}
