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
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R43SoloSave)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});

  await page.evaluate(()=>window.CCGLostSizzlerV141R43SoloSave.clearSoloSave());
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(run)&&Boolean(p1)&&Boolean(world)&&Boolean(host),null,{timeout:20000});
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R43SoloSave?.readEnvelope?.()?.summary?.floor===1,null,{timeout:10000});

  const entry=await page.evaluate(()=>{const e=window.CCGLostSizzlerV141R43SoloSave.readEnvelope();return{seed:e?.checkpoint?.run?.seed,score:e?.checkpoint?.score,health:e?.checkpoint?.player?.health,mana:e?.checkpoint?.player?.mana,x:e?.checkpoint?.player?.x,y:e?.checkpoint?.player?.y}});
  await page.evaluate(()=>openPauseMenu());
  await page.waitForSelector("#pause:not(.hidden)");
  await page.click("#save-quit-solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="false"&&mode==="menu"&&!document.getElementById("menu").classList.contains("hidden"),null,{timeout:10000});
  await page.waitForFunction(()=>!document.getElementById("continue-save-btn").classList.contains("hidden")&&/Floor 1/.test(document.getElementById("continue-save-btn").textContent||""),null,{timeout:10000});

  const before=await page.evaluate(()=>({
    runActive:document.body.dataset.runActive,
    mode:String(mode||""),
    runFloor:Number(run?.floor)||0,
    world:Boolean(world),host:Boolean(host),p1:Boolean(p1),p2:Boolean(p2),
    playMode:String(playMode||""),connected:Boolean(net?.connected),channel:Boolean(net?.channel),
    resumes:Number(window.CCGLostSizzlerV141R43SoloSave?.state?.resumes)||0,
    lastError:String(window.CCGLostSizzlerV141R43SoloSave?.state?.lastError||""),
    menuHidden:Boolean(document.getElementById("menu")?.classList.contains("hidden")),
    pauseHidden:Boolean(document.getElementById("pause")?.classList.contains("hidden"))
  }));

  await page.click("#continue-save-btn");
  const deadline=Date.now()+20000;
  let resumed=false;
  while(Date.now()<deadline){
    resumed=await page.evaluate(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&run?.floor===1&&Boolean(world)&&Boolean(host)&&Boolean(p1));
    if(resumed)break;
    await page.waitForTimeout(100);
  }

  const after=await page.evaluate(()=>({
    runActive:document.body.dataset.runActive,
    mode:String(mode||""),
    runFloor:Number(run?.floor)||0,
    world:Boolean(world),host:Boolean(host),p1:Boolean(p1),p2:Boolean(p2),
    playMode:String(playMode||""),connected:Boolean(net?.connected),channel:Boolean(net?.channel),
    resumes:Number(window.CCGLostSizzlerV141R43SoloSave?.state?.resumes)||0,
    lastError:String(window.CCGLostSizzlerV141R43SoloSave?.state?.lastError||""),
    saveFloor:Number(window.CCGLostSizzlerV141R43SoloSave?.readEnvelope?.()?.summary?.floor)||0,
    menuHidden:Boolean(document.getElementById("menu")?.classList.contains("hidden")),
    pauseHidden:Boolean(document.getElementById("pause")?.classList.contains("hidden")),
    activeElement:String(document.activeElement?.id||document.activeElement?.tagName||"")
  }));

  assert.equal(resumed,true,`LS-SOLO-008 Continue failed within 20s. before=${JSON.stringify(before)} after=${JSON.stringify(after)} pageErrors=${JSON.stringify(errors)}`);
  const restored=await page.evaluate(()=>({seed:run?.seed,score,health:p1?.health,mana:p1?.mana,x:p1?.x,y:p1?.y}));
  assert.equal(restored.seed,entry.seed,"LS-SOLO-008 diagnostic must restore the saved seed");
  assert.equal(restored.score,entry.score,"LS-SOLO-008 diagnostic must restore floor-entry score");
  assert.equal(restored.health,entry.health,"LS-SOLO-008 diagnostic must restore floor-entry health");
  assert.equal(restored.mana,entry.mana,"LS-SOLO-008 diagnostic must restore floor-entry ammunition");
  assert.equal(restored.x,entry.x,"LS-SOLO-008 diagnostic must restore entry X");
  assert.equal(restored.y,entry.y,"LS-SOLO-008 diagnostic must restore entry Y");
  assert.deepEqual(errors,[],`LS-SOLO-008 diagnostic must not produce page errors: ${errors.join("\n")}`);
  console.log("LS-SOLO-008 focused Save & Quit -> Continue lifecycle diagnostic passed.");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
