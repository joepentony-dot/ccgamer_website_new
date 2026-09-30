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
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV142R58AuthoritativeFireCore));
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
    await page.waitForFunction(before=>Number(p1.mana)<before.mana||bullets.filter(b=>b.owner===p1.id&&b.ttl>0).length>before.shots,before,{timeout:3000});
    await page.waitForTimeout(250);
  }
  await page.evaluate(()=>{
    // Isolate the stale-state recovery assertion from a legitimate enemy hit
    // landing in the same frame after FIRE succeeds. The earlier five live
    // inventory/FIRE cycles already exercise combat conditions.
    for(const enemy of host?.enemies||[])enemy.alive=false;
    if(host?.stalker)host.stalker.awake=false;
    p1.x=world.start.x;p1.y=world.start.y;p1.rx=p1.x;p1.ry=p1.y;
    p1.firearmUnlocked=true;
    p1.mana=Math.max(80,p1.mana||0);
    p1.hitStunMs=5000;
    p1.__ccgLastHurtAt=performance.now()-2000;
    fire1=Number.POSITIVE_INFINITY;fireBuffer1=Number.POSITIVE_INFINITY;projectileCD=Number.POSITIVE_INFINITY;input.clear();
  });
  const staleBefore=await page.evaluate(()=>Number(p1.mana));
  await page.keyboard.press("Space");
  await page.waitForFunction(before=>Number(p1.mana)<before,staleBefore,{timeout:3000});
  const staleAfter=await page.evaluate(()=>({
    stun:Number(p1.hitStunMs||0),fire:Number(fire1),buffer:Number(fireBuffer1),
    r58:Boolean(window.CCGLostSizzlerV142R58AuthoritativeFireCore),
    r47:Boolean(window.CCGLostSizzlerV142R47InventoryFireRecovery)
  }));
  assert.equal(staleAfter.r58,true,"r58 FIRE core must own stale-state recovery");
  assert.equal(staleAfter.r47,false,"retired r47 inventory FIRE recovery must not load");
  assert.equal(staleAfter.stun,0,`stale hit-stun must be normalised by the core attack owner: ${JSON.stringify(staleAfter)}`);

  assert.equal(await page.evaluate(()=>mode),"playing");
  assert.equal(await page.evaluate(()=>Boolean(window.CCGLostSizzlerV142R47InventoryFireRecovery)),false,"retired r47 recovery owner must remain absent");
  console.log("Dungeon Carnage r58 repeated Inventory -> core FIRE browser regression passed.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
