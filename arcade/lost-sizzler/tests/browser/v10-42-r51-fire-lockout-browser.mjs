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
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}});
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
  assert.ok(recovered.r20.staleStunRepairs>before.staleRepairs,"stale hit-stun repair must be recorded");
  assert.ok(recovered.r20.controlLockRepairs>before.controlRepairs,"control-lock repair must be recorded");

  const normalBefore=Number(recovered.mana);
  await page.keyboard.press("Space");
  await page.waitForFunction(mana=>Number(p1?.mana||0)<mana,normalBefore,{timeout:3000});
  assert.equal(await page.evaluate(()=>input.has("Space")),false,"normal follow-up tap must release Space");

  console.log("Dungeon Carnage R51 quick-tap buffer-without-shot FIRE recovery browser regression passed.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
