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
    const url=new URL(req.url,"http://local");
    const pathname=decodeURIComponent(url.pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404,{connection:"close"}).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});
      res.end(data);
    });
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1280,height:800}});
  await context.route("https://*.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:"{}"}));
  await context.addInitScript(()=>{
    try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}
    HTMLElement.prototype.requestFullscreen=function(){return Promise.resolve()};
  });
  const page=await context.newPage();
  page.setDefaultTimeout(60000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/?r55-long-pause-fire=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.CCGLostSizzlerV142Bootstrap?.ready===true||window.CCGLostSizzlerV142Bootstrap?.failed===true,null,{timeout:90000});
  const boot=await page.evaluate(()=>({ready:CCGLostSizzlerV142Bootstrap?.ready===true,failed:CCGLostSizzlerV142Bootstrap?.failed===true,error:String(CCGLostSizzlerV142Bootstrap?.error||"")}));
  assert.equal(boot.failed,false,`ordered bootstrap failed: ${boot.error}`);
  assert.equal(boot.ready,true,"ordered bootstrap must complete");
  assert.equal(await page.evaluate(()=>Boolean(window.CCGLostSizzlerV142R20LiveRegressionStability)),true,"R20 FIRE recovery owner must be loaded");

  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1)&&Boolean(host),null,{timeout:30000});
  await page.evaluate(()=>{
    host.enemies=[];enemyBullets.length=0;hazards.length=0;bullets.length=0;
    p1.firearmUnlocked=true;p1.weapon=baseWeapon();p1.mana=80;p1.maxMana=Math.max(80,Number(p1.maxMana)||0);
    p1.hitStunMs=0;p1.controlLocked=false;p1.controlsLocked=false;
    fire1=0;fireBuffer1=0;projectileCD=0;input.clear();
  });

  const initialMana=await page.evaluate(()=>Number(p1.mana));
  await page.keyboard.press("Space");
  await page.waitForFunction(before=>Number(p1.mana)<before,initialMana,{timeout:4000});

  await page.keyboard.press("KeyP");
  await page.waitForFunction(()=>mode==="paused");
  await page.waitForTimeout(2200);
  await page.evaluate(()=>{fire1=1700;fireBuffer1=650;projectileCD=400});
  await page.keyboard.press("KeyP");
  await page.waitForFunction(()=>mode==="playing"&&Boolean(window.__CCG_PAUSE_ATTACK_LAST_RESET__?.at),null,{timeout:4000});

  const keyboardBefore=await page.evaluate(()=>{
    // Simulate a late compatibility owner restoring stale transient cadence after
    // the normal pause-resume settlement. The first real attack must still win.
    fire1=1400;fireBuffer1=500;projectileCD=350;bullets.length=0;input.clear();
    const r20=window.CCGLostSizzlerV142R20LiveRegressionStability.diagnostics;
    return{mana:Number(p1.mana),guardFires:Number(r20.resumeAttackGuardFires||0),lastReset:{...window.__CCG_PAUSE_ATTACK_LAST_RESET__}};
  });
  await page.keyboard.press("Space");
  await page.waitForFunction(before=>Number(p1.mana)<before.mana,keyboardBefore,{timeout:4000});
  const keyboardAfter=await page.evaluate(()=>({
    mana:Number(p1.mana),
    fire1:Number(fire1),buffer:Number(fireBuffer1),projectileCD:Number(projectileCD),
    guardFires:Number(window.CCGLostSizzlerV142R20LiveRegressionStability.diagnostics.resumeAttackGuardFires||0)
  }));
  assert.equal(keyboardBefore.mana-keyboardAfter.mana,1,"first keyboard FIRE after a long pause must recover and consume exactly one round");
  assert.ok(keyboardAfter.guardFires>keyboardBefore.guardFires,"long-pause keyboard FIRE must consume the R55 resume guard");

  await page.waitForTimeout(500);
  const followBefore=await page.evaluate(()=>{bullets.length=0;return Number(p1.mana)});
  await page.keyboard.press("Space");
  await page.waitForFunction(before=>Number(p1.mana)<before,followBefore,{timeout:4000});
  const followAfter=await page.evaluate(()=>({
    mana:Number(p1.mana),
    guardFires:Number(window.CCGLostSizzlerV142R20LiveRegressionStability.diagnostics.resumeAttackGuardFires||0)
  }));
  assert.equal(followBefore-followAfter.mana,1,"the next keyboard tap must return to normal one-shot cadence");
  assert.equal(followAfter.guardFires,keyboardAfter.guardFires,"the pause guard must be one-shot and must not keep bypassing normal cooldown");

  await page.keyboard.press("KeyP");
  await page.waitForFunction(()=>mode==="paused");
  await page.waitForTimeout(2200);
  await page.evaluate(()=>{fire1=1600;fireBuffer1=600;projectileCD=420});
  await page.click("#resume-btn");
  await page.waitForFunction(()=>mode==="playing"&&Boolean(window.__CCG_PAUSE_ATTACK_LAST_RESET__?.at),null,{timeout:4000});

  const pad=await page.evaluate(()=>{
    fire1=1300;fireBuffer1=450;projectileCD=300;bullets.length=0;input.clear();
    gamepadFireDown=false;
    const beforeMana=Number(p1.mana);
    const beforeGuard=Number(window.CCGLostSizzlerV142R20LiveRegressionStability.diagnostics.resumeAttackGuardFires||0);
    const blank=()=>Array.from({length:16},()=>({pressed:false,value:0}));
    const buttons=blank();buttons[0]={pressed:true,value:1};
    const mock={connected:true,axes:[0,0],buttons};
    const own=Object.prototype.hasOwnProperty.call(navigator,"getGamepads");
    const original=navigator.getGamepads;
    Object.defineProperty(navigator,"getGamepads",{configurable:true,value:()=>[mock]});
    try{
      updateGamepad();
      const afterFirst=Number(p1.mana);
      const afterFirstGuard=Number(window.CCGLostSizzlerV142R20LiveRegressionStability.diagnostics.resumeAttackGuardFires||0);
      // A held button during a live cooldown must not repeatedly bypass cadence.
      for(let i=0;i<8;i++)updateGamepad();
      const afterHeld=Number(p1.mana);
      // Once the canonical cooldown is ready, the same held button may fire once.
      fire1=0;fireBuffer1=0;projectileCD=0;bullets.length=0;
      updateGamepad();
      const afterCooldown=Number(p1.mana);
      return{beforeMana,afterFirst,afterHeld,afterCooldown,beforeGuard,afterFirstGuard};
    }finally{
      if(own)Object.defineProperty(navigator,"getGamepads",{configurable:true,value:original});
      else delete navigator.getGamepads;
    }
  });
  assert.equal(pad.beforeMana-pad.afterFirst,1,"first joystick FIRE after a long pause must recover immediately");
  assert.ok(pad.afterFirstGuard>pad.beforeGuard,"joystick FIRE must consume the same one-shot pause guard");
  assert.equal(pad.afterHeld,pad.afterFirst,"holding joystick FIRE during cooldown must not bypass weapon cadence");
  assert.equal(pad.afterHeld-pad.afterCooldown,1,"held joystick FIRE may repeat once the normal cooldown becomes ready");

  assert.deepEqual(errors,[],`R55 long-pause FIRE regression produced page errors: ${JSON.stringify(errors,null,2)}`);
  console.log("Dungeon Carnage R55 long-pause keyboard and joystick FIRE recovery passed in Chromium.");
  await context.close();
}finally{
  await browser.close().catch(()=>{});
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
