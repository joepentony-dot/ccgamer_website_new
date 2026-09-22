import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".wav":"audio/wav",".mp3":"audio/mpeg",".ogg":"audio/ogg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local"),pathname=decodeURIComponent(url.pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});
try{
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}});
  const page=await context.newPage();
  page.setDefaultTimeout(60000);
  await page.goto(`${origin}/arcade/lost-sizzler/?bugreport=1&r47-inventory-fire=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&window.CCGLostSizzlerV142R47InventoryFireRecovery?.state?.installed===true);
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1),null,{timeout:20000});
  await page.evaluate(()=>{p1.firearmUnlocked=true;p1.mana=Math.max(80,p1.mana||0);fire1=0;fireBuffer1=0;input.clear()});
  for(let cycle=0;cycle<5;cycle++){
    await page.keyboard.press("Tab");
    await page.waitForFunction(()=>mode==="inventory"&&!document.getElementById("inventory-panel")?.classList.contains("hidden"));
    await page.keyboard.press("Tab");
    await page.waitForFunction(()=>mode==="playing"&&document.getElementById("inventory-panel")?.classList.contains("hidden"));
    const before=await page.evaluate(()=>({mana:Number(p1.mana),shots:bullets.filter(b=>b.owner===p1.id&&b.ttl>0).length}));
    await page.keyboard.press("Space");
    await page.waitForFunction(before=>Number(p1.mana)<before.mana||bullets.filter(b=>b.owner===p1.id&&b.ttl>0).length>before.shots||Number(fire1)>0,before,{timeout:3000});
    await page.waitForTimeout(250);
  }
  const state=await page.evaluate(()=>window.CCGLostSizzlerV142R47InventoryFireRecovery.state);
  assert.ok(state.inventoryClosures>=5,`expected at least five observed Inventory closes, got ${state.inventoryClosures}`);
  assert.equal(await page.evaluate(()=>mode),"playing");
  console.log("Dungeon Carnage r47 repeated Inventory -> FIRE browser regression passed.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
