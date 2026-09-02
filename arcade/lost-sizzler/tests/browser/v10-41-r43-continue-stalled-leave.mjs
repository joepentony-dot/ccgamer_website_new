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

  const beforeQuit=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R43SoloSave,envelope=api.readEnvelope(),entry=api.state?.entryCheckpoint;
    return{
      liveSeed:String(run?.seed||""),entrySeed:String(entry?.run?.seed||""),envelopeSeed:String(envelope?.checkpoint?.run?.seed||""),
      envelopeReason:String(envelope?.reason||""),score:Number(envelope?.checkpoint?.score||0),health:Number(envelope?.checkpoint?.player?.health||0),mana:Number(envelope?.checkpoint?.player?.mana||0),
      x:Number(envelope?.checkpoint?.player?.x||0),y:Number(envelope?.checkpoint?.player?.y||0),resumes:Number(api.state?.resumes||0),saves:Number(api.state?.saves||0)
    };
  });

  await page.evaluate(()=>openPauseMenu());
  await page.waitForSelector("#pause:not(.hidden)");
  await page.click("#save-quit-solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="false"&&mode==="menu"&&!document.getElementById("menu").classList.contains("hidden"),null,{timeout:10000});
  await page.waitForFunction(()=>!document.getElementById("continue-save-btn").classList.contains("hidden"),null,{timeout:10000});

  const afterQuit=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R43SoloSave,envelope=api.readEnvelope(),entry=api.state?.entryCheckpoint;
    return{
      liveSeed:String(run?.seed||""),entrySeed:String(entry?.run?.seed||""),envelopeSeed:String(envelope?.checkpoint?.run?.seed||""),
      envelopeReason:String(envelope?.reason||""),score:Number(envelope?.checkpoint?.score||0),health:Number(envelope?.checkpoint?.player?.health||0),mana:Number(envelope?.checkpoint?.player?.mana||0),
      x:Number(envelope?.checkpoint?.player?.x||0),y:Number(envelope?.checkpoint?.player?.y||0),resumes:Number(api.state?.resumes||0),saves:Number(api.state?.saves||0),
      mode:String(mode||""),playMode:String(playMode||""),runActive:String(document.body.dataset.runActive||"")
    };
  });

  await page.evaluate(()=>{
    window.__r43OriginalLeave=net.leave;
    net.leave=function stalledLeaveForR43Regression(){return new Promise(()=>{})};
  });

  const beforeContinue=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R43SoloSave,envelope=api.readEnvelope();
    return{
      envelopeSeed:String(envelope?.checkpoint?.run?.seed||""),envelopeReason:String(envelope?.reason||""),
      resumes:Number(api.state?.resumes||0),mode:String(mode||""),playMode:String(playMode||""),connected:Boolean(net?.connected),
      transport:String(net?.transport||""),channelPresent:Boolean(net?.channel),clientPresent:Boolean(net?.client)
    };
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
  const restored=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R43SoloSave,envelope=api.readEnvelope(),entry=api.state?.entryCheckpoint;
    return{
      seed:String(run?.seed||""),entrySeed:String(entry?.run?.seed||""),envelopeSeed:String(envelope?.checkpoint?.run?.seed||""),envelopeReason:String(envelope?.reason||""),
      score:Number(score||0),health:Number(p1?.health||0),mana:Number(p1?.mana||0),x:Number(p1?.x||0),y:Number(p1?.y||0),
      playMode:String(playMode||""),connected:Boolean(net?.connected),transport:String(net?.transport||""),resumes:Number(api.state?.resumes||0),
      mode:String(mode||""),runActive:String(document.body.dataset.runActive||"")
    };
  });

  const diagnostic={beforeQuit,afterQuit,beforeContinue,restored};
  assert.equal(afterQuit.envelopeSeed,beforeQuit.envelopeSeed,`Save & Quit must preserve the captured floor-entry seed: ${JSON.stringify(diagnostic)}`);
  assert.equal(beforeContinue.envelopeSeed,afterQuit.envelopeSeed,`the saved envelope must remain stable before Continue: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.seed,afterQuit.envelopeSeed,`stalled-leave recovery must restore the Save & Quit envelope seed: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.entrySeed,afterQuit.envelopeSeed,`r43 entry checkpoint must match the restored Save & Quit seed: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.envelopeSeed,afterQuit.envelopeSeed,`Continue must not replace the saved envelope while restoring: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.score,afterQuit.score,`stalled-leave recovery must restore floor-entry score: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.health,afterQuit.health,`stalled-leave recovery must restore floor-entry health: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.mana,afterQuit.mana,`stalled-leave recovery must restore floor-entry ammunition: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.x,afterQuit.x,`stalled-leave recovery must restore entry X: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.y,afterQuit.y,`stalled-leave recovery must restore entry Y: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.playMode,"solo",`stalled-leave recovery must restore Solo ownership: ${JSON.stringify(diagnostic)}`);
  assert.equal(restored.connected,false,`stalled-leave recovery must leave the local runtime disconnected: ${JSON.stringify(diagnostic)}`);
  assert.ok(restored.resumes>=1,`stalled-leave recovery must advance the r43 resume diagnostic: ${JSON.stringify(diagnostic)}`);
  assert.deepEqual(errors,[],`LS-SOLO-008 stalled-leave regression must not produce page errors: ${errors.join("\n")} diagnostic=${JSON.stringify(diagnostic)}`);
  console.log(`LS-SOLO-008 stalled-leave diagnostic passed: ${JSON.stringify(diagnostic)}`);
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));
}
