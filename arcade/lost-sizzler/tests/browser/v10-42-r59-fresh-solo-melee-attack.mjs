import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const url=new URL(req.url,"http://local");
    const pathname=decodeURIComponent(url.pathname);
    const relative=pathname.endsWith("/")?pathname+"index.html":pathname;
    const file=path.resolve(repo,"."+relative);
    if(!file.startsWith(repo+path.sep)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});
      res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin="http://127.0.0.1:"+server.address().port;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.addInitScript(()=>{
    try{
      localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");
      localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true");
    }catch(_){}
  });
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  const errors=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(origin+"/arcade/lost-sizzler/?r59-fresh-melee=1",{waitUntil:"load"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&document.body.dataset.v142BootstrapReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerMeleeAmmoV125?.meleeAttack&&window.CCGLostSizzlerV142R58AuthoritativeFireCore?.attackNow));
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&String(mode)==="playing"&&Boolean(p1&&host&&run));

  const fresh=await page.evaluate(()=>({
    mana:Number(p1.mana||0),
    maxMana:Number(p1.maxMana||0),
    firearmUnlocked:Boolean(p1.firearmUnlocked),
    weapon:p1.weapon,
    melee:Boolean(p1.meleeWeapon),
    swingAt:Number(p1._meleeSwingAt||0),
    fire:Number(fire1||0),
    projectiles:bullets.filter(b=>b?.ttl>0&&b.owner===p1.id).length
  }));
  assert.equal(fresh.firearmUnlocked,false,"fresh Solo run must begin without a firearm");
  assert.equal(fresh.weapon,null,"fresh Solo run must not manufacture a firearm before the first weapon pickup");
  assert.equal(fresh.mana,0,"fresh Solo run starts with zero firearm ammunition");
  assert.equal(fresh.melee,true,"fresh Solo run must still own the starter melee weapon");

  await page.keyboard.press("Space",{delay:24});
  await page.waitForFunction(before=>Number(p1?._meleeSwingAt||0)>before,fresh.swingAt,{timeout:2500,polling:16});
  const keyboard=await page.evaluate(()=>({
    swingAt:Number(p1._meleeSwingAt||0),
    fire:Number(fire1||0),
    mana:Number(p1.mana||0),
    projectiles:bullets.filter(b=>b?.ttl>0&&b.owner===p1.id).length
  }));
  assert.ok(keyboard.swingAt>fresh.swingAt,"fresh-run Space attack must execute the starter sword swing");
  assert.ok(keyboard.fire>0,"starter sword swing must establish its normal attack cooldown");
  assert.equal(keyboard.mana,0,"starter sword attack must not require or consume firearm ammunition");
  assert.equal(keyboard.projectiles,0,"starter sword attack must not manufacture a projectile");

  const direct=await page.evaluate(()=>globalThis.eval(`(()=>{
    fire1=0;fireBuffer1=0;p1.hitStunMs=0;p1.__ccgFireSpawnFault=false;
    const before=Number(p1._meleeSwingAt||0);
    const handled=window.CCGLostSizzlerV142R58AuthoritativeFireCore.attackNow();
    return{handled,before,after:Number(p1._meleeSwingAt||0),fire:Number(fire1||0),mana:Number(p1.mana||0)};
  })()`));
  assert.equal(direct.handled,true,"authoritative direct attack owner must dispatch to melee on a fresh no-firearm run");
  assert.ok(direct.after>direct.before,"authoritative direct attack must create a real melee swing");
  assert.ok(direct.fire>0,"authoritative direct melee attack must establish cooldown");
  assert.equal(direct.mana,0,"authoritative direct melee attack must preserve zero firearm ammo");

  assert.deepEqual(errors,[],"fresh Solo melee attack contract must not produce page errors: "+errors.join("\n"));
  console.log("C64 Dungeon Carnage R59 fresh Solo melee FIRE ownership passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
