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
    Object.defineProperty(navigator,"maxTouchPoints",{configurable:true,value:1});
    HTMLElement.prototype.requestFullscreen=function(){window.__ccgFullscreenRequests=(window.__ccgFullscreenRequests||0)+1;return Promise.resolve()};
  });
  const page=await context.newPage();
  page.setDefaultTimeout(60000);
  await page.goto(`${origin}/arcade/lost-sizzler/?r51-fire-lockout=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.CCGLostSizzlerV142Bootstrap?.ready===true||window.CCGLostSizzlerV142Bootstrap?.failed===true,null,{timeout:90000});
  const boot=await page.evaluate(()=>({ready:CCGLostSizzlerV142Bootstrap?.ready===true,failed:CCGLostSizzlerV142Bootstrap?.failed===true,error:String(CCGLostSizzlerV142Bootstrap?.error||"")}));
  assert.equal(boot.failed,false,`ordered bootstrap failed: ${boot.error}`);
  assert.equal(boot.ready,true,"ordered bootstrap must complete");
  assert.equal(await page.evaluate(()=>Boolean(window.CCGLostSizzlerV142AttackHoldLiveness&&window.CCGLostSizzlerV142R20LiveRegressionStability)),true,"FIRE liveness owners must be loaded");

  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1)&&Boolean(host),null,{timeout:20000});
  assert.ok(await page.evaluate(()=>Number(window.__ccgFullscreenRequests||0))>=1,"Solo launch must request fullscreen from the click gesture");

  const before=await page.evaluate(()=>{
    p1.firearmUnlocked=true;
    p1.weapon=p1.weapon||baseWeapon();
    p1.maxMana=Math.max(120,Number(p1.maxMana)||0);
    p1.mana=117;
    p1.controlLocked=true;
    p1.controlsLocked=true;
    p1.hitStunMs=180;
    p1.__ccgLastHurtAt=performance.now()-2000;
    bullets.length=0;
    fire1=Number.POSITIVE_INFINITY;
    fireBuffer1=Number.POSITIVE_INFINITY;
    projectileCD=Number.POSITIVE_INFINITY;
    input.clear();
    document.body.dataset.runActive="false";
    const r20=window.CCGLostSizzlerV142R20LiveRegressionStability?.diagnostics||{};
    const hold=window.CCGLostSizzlerV142AttackHoldLiveness?.diagnostics||{};
    return{
      mana:Number(p1.mana),
      staleRepairs:Number(r20.staleStunRepairs||0),
      controlRepairs:Number(r20.controlLockRepairs||0),
      verifications:Number(hold.pressVerifications||0)
    };
  });

  await page.keyboard.press("Space");
  await page.waitForFunction(before=>Number(p1?.mana||0)<before.mana,before,{timeout:4000});

  const recovered=await page.evaluate(()=>({
    mana:Number(p1.mana),
    hitStun:Number(p1.hitStunMs||0),
    controlLocked:Boolean(p1.controlLocked),
    controlsLocked:Boolean(p1.controlsLocked),
    fire1:Number(fire1),
    buffer:Number(fireBuffer1),
    active:String(document.body.dataset.runActive||""),
    shots:bullets.filter(b=>b&&b.ttl>0&&b.owner===p1.id).length,
    r20:{...window.CCGLostSizzlerV142R20LiveRegressionStability.diagnostics},
    hold:{...window.CCGLostSizzlerV142AttackHoldLiveness.diagnostics}
  }));

  assert.ok(recovered.mana<before.mana,"a fresh FIRE press must recover the poisoned combat boundary and consume ammo");
  assert.equal(recovered.hitStun,0,"stale hit-stun must not permanently disable FIRE");
  assert.equal(recovered.controlLocked,false,"stale controlLocked must be cleared before FIRE");
  assert.equal(recovered.controlsLocked,false,"stale controlsLocked must be cleared before FIRE");
  assert.equal(recovered.active,"true","FIRE recovery must restore the live-run presentation flag");
  assert.ok(
    recovered.r20.staleStunRepairs>before.staleRepairs||
    recovered.r20.controlLockRepairs>before.controlRepairs||
    recovered.hold.pressVerifications>before.verifications,
    "fresh FIRE recovery must pass through an established liveness/repair owner"
  );

  const normalTapBefore=await page.evaluate(()=>{
    p1.firearmUnlocked=true;
    p1.weapon=baseWeapon();
    p1.maxMana=Math.max(120,Number(p1.maxMana)||0);
    p1.mana=117;
    bullets.length=0;
    fire1=0;
    fireBuffer1=0;
    projectileCD=0;
    input.clear();
    window.__ccgR51TapShots=0;
    window.__ccgR51TapPush=bullets.push;
    bullets.push=function(...shots){
      window.__ccgR51TapShots+=shots.filter(shot=>shot&&shot.owner===p1.id).length;
      return window.__ccgR51TapPush.apply(this,shots);
    };
    return Number(p1.mana);
  });
  await page.keyboard.press("Space");
  await page.waitForTimeout(650);
  const normalTap=await page.evaluate(before=>{
    const result={
      before,
      after:Number(p1.mana),
      launched:Number(window.__ccgR51TapShots||0),
      held:input.has("Space"),
      heldOwner:[...window.CCGLostSizzlerV142AttackHoldLiveness.held]
    };
    bullets.push=window.__ccgR51TapPush;
    delete window.__ccgR51TapPush;
    delete window.__ccgR51TapShots;
    return result;
  },normalTapBefore);
  assert.equal(normalTap.before-normalTap.after,1,`one quick keyboard FIRE tap must consume exactly one ammo unit: ${JSON.stringify(normalTap)}`);
  assert.equal(normalTap.launched,1,`one quick keyboard FIRE tap must spawn exactly one projectile: ${JSON.stringify(normalTap)}`);
  assert.equal(normalTap.held,false,"normal follow-up tap must release Space");
  assert.equal(normalTap.heldOwner.length,0,"quick tap must not remain armed in the held-FIRE owner");

  const heldBefore=await page.evaluate(()=>{
    p1.weapon=baseWeapon();p1.mana=117;bullets.length=0;fire1=0;fireBuffer1=0;input.clear();return Number(p1.mana);
  });
  await page.keyboard.down("Space");
  await page.waitForTimeout(700);
  await page.keyboard.up("Space");
  const heldResult=await page.evaluate(before=>({spent:before-Number(p1.mana),held:input.has("Space"),ownerHeld:window.CCGLostSizzlerV142AttackHoldLiveness.held.size}),heldBefore);
  assert.ok(heldResult.spent>=2,`deliberately holding FIRE must still sustain ordinary autofire: ${JSON.stringify(heldResult)}`);
  assert.equal(heldResult.held,false,"releasing deliberate held FIRE must clear Space");
  assert.equal(heldResult.ownerHeld,0,"releasing deliberate held FIRE must clear the hold owner");

  await page.evaluate(async()=>{await quitToMenu()});
  await page.waitForFunction(()=>mode==="menu"&&document.body.dataset.runActive!=="true",null,{timeout:10000});
  const beforeTutorialFullscreen=await page.evaluate(()=>Number(window.__ccgFullscreenRequests||0));
  await page.click("#tutorial-zone-btn");
  await page.waitForFunction(()=>document.body.dataset.tutorialActive==="true"&&mode==="playing"&&Boolean(p1),null,{timeout:20000});
  assert.ok(await page.evaluate(before=>Number(window.__ccgFullscreenRequests||0)>before,beforeTutorialFullscreen),"Tutorial launch must request fullscreen from the click gesture");

  const tutorialFire=await page.evaluate(async()=>{
    p1.firearmUnlocked=true;
    p1.weapon=p1.weapon||baseWeapon();
    p1.maxMana=Math.max(120,Number(p1.maxMana)||0);
    p1.mana=117;
    bullets.length=0;
    fire1=0;
    fireBuffer1=0;
    projectileCD=0;
    input.clear();
    const mana=Number(p1.mana);
    let launched=0;
    const nativePush=bullets.push;
    bullets.push=function(...shots){
      launched+=shots.filter(shot=>shot&&shot.owner===p1.id).length;
      return nativePush.apply(this,shots);
    };
    // This is the mobile/tutorial FIRE owner. Wait beyond a normal held
    // repeat interval: one clean press may shoot once but must not latch.
    // Count the projectile at spawn time because a valid Tutorial shot can
    // immediately hit nearby room geometry and disappear before sampling.
    const fire=document.querySelector('#v104-touch-controls [data-action="fire"]');
    try{
      fire.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerId:71}));
      await new Promise(resolve=>setTimeout(resolve,450));
      fire.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerId:71}));
    }finally{
      bullets.push=nativePush;
    }
    return{mana,afterMana:Number(p1.mana),held:input.has("Space"),launched};
  });
  assert.equal(tutorialFire.mana-tutorialFire.afterMana,1,"one Tutorial FIRE press must produce exactly one ammo-consuming action");
  assert.equal(tutorialFire.held,false,"Tutorial FIRE must not leave the held/repeat input latched");
  assert.equal(tutorialFire.launched,1,"one Tutorial FIRE press must create exactly one projectile");

  await page.evaluate(()=>showToast("AMMO PICKUP","Reserve shots collected.","cyan",6000));
  const rail=await page.evaluate(()=>{
    const canvas=document.querySelector(".canvas-wrap")?.getBoundingClientRect();
    const rail=document.querySelector(".game-message-rail")?.getBoundingClientRect();
    const toast=document.getElementById("pickup-toast")?.getBoundingClientRect();
    const style=getComputedStyle(document.getElementById("pickup-toast"));
    return{canvas,rail,toast,position:style.position,pointerEvents:style.pointerEvents,railDisplay:getComputedStyle(document.querySelector(".game-message-rail")).display};
  });
  assert.equal(rail.position,"static","routine pickup must be static in the message rail");
  assert.ok(rail.toast.top>=rail.canvas.bottom-1,"routine pickup rail must be beneath the dungeon canvas");
  assert.ok(rail.toast.bottom<=rail.rail.bottom+1,`routine pickup must remain inside the lower rail: ${JSON.stringify(rail)}`);
  assert.equal(rail.pointerEvents,"none","routine pickup must remain non-blocking");

  console.log("Dungeon Carnage R51 fullscreen, lower-rail pickup, Tutorial single FIRE and normal FIRE regression passed in Chromium.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
