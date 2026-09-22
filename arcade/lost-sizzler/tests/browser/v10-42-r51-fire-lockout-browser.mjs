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
    p1.hitStunMs=0;
    p1.controlLocked=false;
    p1.controlsLocked=false;
    p1.maxMana=Math.max(120,Number(p1.maxMana)||0);
    p1.mana=117;
    bullets.length=0;
    fire1=0;
    fireBuffer1=0;
    projectileCD=0;
    input.clear();

    const original=firePlayer;
    const blocked=function(..._args){
      window.__ccgP0BlockedFireCalls=(window.__ccgP0BlockedFireCalls||0)+1;
      return undefined;
    };
    blocked.__ccgOriginal=original;
    window.__ccgP0OriginalFirePlayer=original;
    firePlayer=blocked;

    const blocker=event=>{
      if(event.code!=="Space")return;
      try{fireBuffer1=700;input.add("Space")}catch(_){}
      event.preventDefault();
      event.stopImmediatePropagation();
      removeEventListener("keydown",blocker,true);
    };
    addEventListener("keydown",blocker,true);

    const diag=window.CCGLostSizzlerV142AttackHoldLiveness.diagnostics;
    return{
      mana:Number(p1.mana),
      verifications:Number(diag.pressVerifications||0),
      recoveries:Number(diag.pressRecoveries||0),
      failures:Number(diag.pressRecoveryFailures||0)
    };
  });

  await page.keyboard.down("Space");
  await page.waitForTimeout(30);
  await page.keyboard.up("Space");
  await page.waitForTimeout(45);

  const stalled=await page.evaluate(()=>({
    mana:Number(p1.mana),
    buffer:Number(fireBuffer1),
    shots:bullets.filter(b=>b&&b.ttl>0&&b.owner===p1.id).length,
    blockedCalls:Number(window.__ccgP0BlockedFireCalls||0),
    held:Number(window.CCGLostSizzlerV142AttackHoldLiveness?.held?.size||0)
  }));
  assert.equal(stalled.mana,before.mana,"staged lockout must not fire before delayed verification");
  assert.ok(stalled.buffer>0,"staged lockout must retain a queued FIRE buffer");
  assert.equal(stalled.shots,0,"staged lockout must have zero live player projectiles");
  assert.ok(stalled.blockedCalls>0,"staged lockout must block the normal frame fire owner");
  assert.equal(stalled.held,0,"quick tap must already be released before delayed verification");

  await page.waitForFunction(before=>{
    const diag=window.CCGLostSizzlerV142AttackHoldLiveness?.diagnostics||{};
    return Number(diag.pressRecoveries||0)>before.recoveries&&Number(p1?.mana||0)<before.mana;
  },before,{timeout:4000});

  const recovered=await page.evaluate(()=>{
    const diag=window.CCGLostSizzlerV142AttackHoldLiveness.diagnostics;
    const result={
      mana:Number(p1.mana),
      buffer:Number(fireBuffer1),
      shots:bullets.filter(b=>b&&b.ttl>0&&b.owner===p1.id).length,
      verifications:Number(diag.pressVerifications||0),
      recoveries:Number(diag.pressRecoveries||0),
      failures:Number(diag.pressRecoveryFailures||0),
      held:Number(window.CCGLostSizzlerV142AttackHoldLiveness?.held?.size||0)
    };
    if(window.__ccgP0OriginalFirePlayer)firePlayer=window.__ccgP0OriginalFirePlayer;
    delete window.__ccgP0OriginalFirePlayer;
    return result;
  });

  assert.ok(recovered.mana<before.mana,"delayed FIRE recovery must consume ammo for a real shot");
  assert.ok(recovered.verifications>before.verifications,"quick tap must still be verified after keyup");
  assert.ok(recovered.recoveries>before.recoveries,"buffer-without-shot state must invoke R20 recovery");
  assert.equal(recovered.failures,before.failures,"successful P0 recovery must not count as a failed recovery");
  assert.equal(recovered.held,0,"recovery must not leave the released key held");

  const normalBefore=await page.evaluate(()=>Number(p1.mana));
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
