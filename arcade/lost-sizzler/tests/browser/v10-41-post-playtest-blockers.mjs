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
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141PostPlaytestStability)&&Boolean(document.getElementById("solo-btn")));
  await page.waitForFunction(()=>window.CCGLostSizzlerV142Bootstrap?.ready===true&&window.CCGLostSizzlerV142ZeroServerRelease?.enabled===true);

  const retired=await page.evaluate(()=>({
    onlineMultiplayer:document.body.dataset.onlineMultiplayer||"",
    releaseModel:document.body.dataset.releaseModel||"",
    hordeEntryPresent:Boolean(document.getElementById("horde-mode-btn")),
    spyEntryPresent:Boolean(document.getElementById("saboteurs-mode-btn")),
    specialModeActive:Boolean(window.CCGLostSizzlerSpecialModes?.active),
    localModes:[...(window.CCGLostSizzlerV142ZeroServerRelease?.localModes||[])]
  }));
  assert.equal(retired.onlineMultiplayer,"disabled","V10.42 production must keep online multiplayer disabled");
  assert.equal(retired.releaseModel,"zero-server-cost","V10.42 production must advertise the zero-server release model");
  assert.equal(retired.hordeEntryPresent,false,"retired Horde Multiplayer entry must be absent from the production menu");
  assert.equal(retired.spyEntryPresent,false,"retired Spy Vs Spy Multiplayer entry must be absent from the production menu");
  assert.equal(retired.specialModeActive,false,"zero-server enforcement must not leave a retired special-mode controller active");
  assert.deepEqual(retired.localModes,["solo","tutorial","split-screen"],"V10.42 production must retain the supported local modes");

  await page.reload({waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141PostPlaytestStability)&&Boolean(document.getElementById("solo-btn")));
  await page.waitForFunction(()=>window.CCGLostSizzlerV142Bootstrap?.ready===true);
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing");
  const fireRecovery=await page.evaluate(()=>{
    fire1=Infinity;fireBuffer1=Infinity;
    window.CCGLostSizzlerV141PostPlaytestStability.monitor();
    return{fire1:Number(fire1),fireBuffer1:Number(fireBuffer1),cooldownRepairs:window.CCGLostSizzlerV141PostPlaytestStability.state.fireCooldownRepairs,bufferRepairs:window.CCGLostSizzlerV141PostPlaytestStability.state.fireBufferRepairs};
  });
  assert.equal(fireRecovery.fire1,0,"non-finite Solo fire cooldown must recover instead of permanently disabling shooting");
  assert.equal(fireRecovery.fireBuffer1,0,"non-finite Solo fire buffer must recover");
  assert.ok(fireRecovery.cooldownRepairs>=1,"Solo fire cooldown recovery must be recorded");
  assert.ok(fireRecovery.bufferRepairs>=1,"Solo fire buffer recovery must be recorded");

  assert.deepEqual(errors,[],`active post-playtest browser regression must have no uncaught browser errors: ${errors.join("\n")}`);
  console.log("C64 Dungeon Carnage zero-server retirement boundary and Solo fire recovery passed in Chromium.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
