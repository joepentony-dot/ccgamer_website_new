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
  assert.equal(await page.evaluate(()=>Boolean(window.CCGLostSizzlerV142R58AuthoritativeFireCore&&window.CCGLostSizzlerV142R20LiveRegressionStability)),true,"r58 FIRE core and non-FIRE live safeguards must be loaded");
  assert.equal(await page.evaluate(()=>Boolean(window.CCGLostSizzlerV142AttackHoldLiveness)),false,"retired held-FIRE recovery owner must remain absent");

  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1)&&Boolean(host),null,{timeout:20000});
  assert.ok(await page.evaluate(()=>Number(window.__ccgFullscreenRequests||0))>=1,"Solo launch must request fullscreen from the click gesture");

  const before=await page.evaluate(()=>{
    p1.firearmUnlocked=true;
    p1.weapon=p1.weapon||baseWeapon();
    p1.maxMana=Math.max(120,Number(p1.maxMana)||0);
    p1.mana=117;
    p1.hitStunMs=180;
    p1.__ccgLastHurtAt=performance.now()-2000;
    bullets.length=0;
    fire1=Number.POSITIVE_INFINITY;
    fireBuffer1=Number.POSITIVE_INFINITY;
    projectileCD=Number.POSITIVE_INFINITY;
    input.clear();
    return{mana:Number(p1.mana)};
  });

  await page.keyboard.press("Space");
  await page.waitForFunction(before=>Number(p1?.mana||0)<before.mana,before,{timeout:4000});

  const recovered=await page.evaluate(()=>({
    mana:Number(p1.mana),
    hitStun:Number(p1.hitStunMs||0),
    fire1:Number(fire1),
    buffer:Number(fireBuffer1),
    active:String(document.body.dataset.runActive||""),
    shots:bullets.filter(b=>b&&b.ttl>0&&b.owner===p1.id).length,
    r58:Boolean(window.CCGLostSizzlerV142R58AuthoritativeFireCore)
  }));

  assert.ok(recovered.mana<before.mana,"a fresh FIRE press must normalise poisoned cadence and consume ammo");
  assert.equal(recovered.hitStun,0,"stale hit-stun must not permanently disable FIRE");
  assert.equal(recovered.active,"true","the live run must remain active through FIRE");
  assert.equal(recovered.r58,true,"r58 authoritative FIRE core must own the recovery");

  const normalBefore=Number(recovered.mana);
  await page.keyboard.press("Space");
  await page.waitForFunction(mana=>Number(p1?.mana||0)<mana,normalBefore,{timeout:3000});
  await page.waitForTimeout(950);
  const normalAfter=await page.evaluate(()=>({mana:Number(p1.mana),held:input.has("Space"),physicalHeld:Number(window.CCGLostSizzlerV142AttackHoldLiveness?.held?.size||0)}));
  assert.equal(normalBefore-normalAfter.mana,1,"one desktop firearm tap must consume exactly one round");
  assert.equal(normalAfter.held,false,"normal follow-up tap must release Space");
  assert.equal(normalAfter.physicalHeld,0,"normal follow-up tap must not leave the physical hold owner latched");

  const swordBefore=await page.evaluate(()=>{
    p1.firearmUnlocked=false;p1.weapon=null;p1.mana=0;p1.hitStunMs=0;p1.controlLocked=false;p1.controlsLocked=false;
    fire1=0;fireBuffer1=0;projectileCD=0;bullets.length=0;input.clear();
    window.CCGLostSizzlerV142AttackHoldLiveness?.clearHeld?.();
    return Number(p1._meleeSwingAt||0);
  });
  await page.keyboard.press("Space");
  await page.waitForFunction(before=>Number(p1?._meleeSwingAt||0)>before,swordBefore,{timeout:3000});
  const firstSwordSwing=await page.evaluate(()=>Number(p1._meleeSwingAt||0));
  await page.waitForTimeout(1200);
  const swordAfter=await page.evaluate(()=>({
    swing:Number(p1._meleeSwingAt||0),
    held:input.has("Space"),
    physicalHeld:Number(window.CCGLostSizzlerV142AttackHoldLiveness?.held?.size||0),
    buffer:Number(fireBuffer1||0)
  }));
  assert.equal(swordAfter.swing,firstSwordSwing,"one desktop sword tap must produce one melee swing, not delayed recovery repeats");
  assert.equal(swordAfter.held,false,"a completed sword tap must not synthetically latch Space");
  assert.equal(swordAfter.physicalHeld,0,"a completed sword tap must release the physical hold owner");
  assert.equal(swordAfter.buffer,0,"a successful sword tap must not leave a queued attack buffer");

  const finiteBefore=await page.evaluate(()=>{
    p1.firearmUnlocked=true;p1.weapon=baseWeapon();p1.mana=100;p1.maxMana=Math.max(120,Number(p1.maxMana)||0);
    fire1=390;fireBuffer1=0;projectileCD=0;input.clear();
    return Number(p1.mana);
  });
  await page.keyboard.press("Space");
  await page.waitForFunction(before=>Number(p1.mana)<before,finiteBefore,{timeout:3000});
  const finiteAfter=await page.evaluate(()=>({mana:Number(p1.mana),fire:Number(fire1),buffer:Number(fireBuffer1)}));
  assert.equal(finiteBefore-finiteAfter.mana,1,"a normal finite cooldown must drain and release exactly one buffered shot through the core");

  const adjacentBefore=await page.evaluate(()=>{
    p1.firearmUnlocked=true;
    p1.weapon={...baseWeapon(),name:"TIER 2 · Field Pulse II",displayName:"TIER 2 · Field Pulse II",rating:3};
    p1.weaponLevel=2;p1.mana=120;p1.maxMana=Math.max(120,Number(p1.maxMana)||0);p1.hitStunMs=0;
    fire1=0;fireBuffer1=0;projectileCD=0;bullets.length=0;input.clear();
    p1.dir={x:1,y:0};
    host.blockingDecor=host.blockingDecor||[];
    host.blockingDecor.push({id:"r61-adjacent-firearm-prop",x:Number(p1.x)+1,y:Number(p1.y),type:"crate",blocking:true,structural:false});
    sync();
    window.CCGLostSizzlerInventoryHudV106?.render?.();
    return{
      mana:Number(p1.mana),
      hud:String(document.getElementById("hud-weapon")?.textContent||""),
      title:String(document.getElementById("hud-weapon")?.title||"")
    };
  });
  assert.equal(adjacentBefore.hud,"L2 FIELD PULSE","weapon HUD must show compact level plus readable weapon family");
  assert.match(adjacentBefore.title,/Weapon Level 2 · TIER 2 · Field Pulse II/,"weapon HUD title must retain full evolved weapon identity");
  await page.keyboard.press("Space");
  await page.waitForFunction(before=>Number(p1?.mana||0)<before,adjacentBefore.mana,{timeout:3000});
  const adjacentAfter=await page.evaluate(()=>({
    mana:Number(p1.mana),
    shots:bullets.filter(b=>b&&b.ttl>0&&b.owner===p1.id).length,
    propPresent:(host.blockingDecor||[]).some(d=>d.id==="r61-adjacent-firearm-prop")
  }));
  assert.equal(adjacentBefore.mana-adjacentAfter.mana,1,"loaded firearm must fire even when blocking furniture is directly adjacent");
  assert.equal(adjacentAfter.propPresent,true,"FIRE regression fixture must actually retain the adjacent blocking prop");
  await page.evaluate(()=>{host.blockingDecor=(host.blockingDecor||[]).filter(d=>d.id!=="r61-adjacent-firearm-prop")});

  const deathBefore=await page.evaluate(()=>{
    p1.armor=3;p1.invuln=0;p1.health=0;
    return{deaths:Number(run.stats?.deaths||0),armor:Number(p1.armor||0)};
  });
  await page.evaluate(()=>update(16));
  await page.waitForFunction(before=>mode!=="playing"||Number(run?.stats?.deaths||0)>before.deaths||Number(p1?.health||0)>0,deathBefore,{timeout:3000});
  const deathAfter=await page.evaluate(()=>({
    mode:String(mode||""),
    health:Number(p1?.health||0),
    deaths:Number(run?.stats?.deaths||0),
    armor:Number(p1?.armor||0)
  }));
  assert.ok(deathAfter.mode!=="playing"||deathAfter.deaths>deathBefore.deaths||deathAfter.health>0,"health <= 0 may not remain as an unprocessed live-play state");
  assert.equal(deathAfter.armor,deathBefore.armor,"runtime death recovery must not invent an extra armour penalty");

  const keyHud=await page.evaluate(()=>{
    p1.bronzeKeys=2;
    window.CCGLostSizzlerInventoryHudV106?.render?.();
    const text=String(document.getElementById("item-shortcuts")?.innerText||"");
    return{bronze:text.indexOf("BRONZE KEY"),potion:text.indexOf("RESTORATION POTION"),text};
  });
  assert.ok(keyHud.bronze>=0,"Bronze key status must remain visible in the live sidebar");
  assert.ok(keyHud.potion<0||keyHud.bronze<keyHud.potion,"Bronze/key status must render before stored items so it is visible without scrolling");

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
    const icon=document.getElementById("pickup-icon")?.getBoundingClientRect();
    const copy=document.querySelector("#pickup-toast .pickup-toast-copy")?.getBoundingClientRect();
    const style=getComputedStyle(document.getElementById("pickup-toast"));
    return{canvas,rail,toast,icon,copy,position:style.position,display:style.display,pointerEvents:style.pointerEvents,railDisplay:getComputedStyle(document.querySelector(".game-message-rail")).display};
  });
  assert.equal(rail.position,"static","routine pickup must be static in the message rail");
  assert.equal(rail.display,"grid","routine pickup must use the full rail as a horizontal icon/copy grid");
  assert.ok(rail.toast.top>=rail.canvas.bottom-1,"routine pickup rail must be beneath the dungeon canvas");
  assert.ok(rail.toast.bottom<=rail.rail.bottom+1,`routine pickup must remain inside the lower rail: ${JSON.stringify(rail)}`);
  assert.ok(rail.icon.right<=rail.copy.left+1,`routine pickup icon must sit to the left of its copy: ${JSON.stringify(rail)}`);
  assert.ok(rail.copy.width>rail.rail.width*.5,`routine pickup copy must use the majority of the black notification rail: ${JSON.stringify(rail)}`);
  assert.equal(rail.pointerEvents,"none","routine pickup must remain non-blocking");

  await page.evaluate(()=>window.CCGLostSizzlerV141LandingNotificationPolish?.showMajor?.("PATROL SHIFT","Enemy patrol routes have changed. Watch the corridor before advancing.","red",6000));
  const major=await page.evaluate(()=>{
    const rail=document.querySelector(".game-message-rail")?.getBoundingClientRect();
    const panel=document.getElementById("ccg-major-notification")?.getBoundingClientRect();
    const icon=document.querySelector("#ccg-major-notification .major-icon")?.getBoundingClientRect();
    const copy=document.querySelector("#ccg-major-notification .major-copy")?.getBoundingClientRect();
    const style=getComputedStyle(document.getElementById("ccg-major-notification"));
    return{rail,panel,icon,copy,display:style.display,title:document.querySelector("#ccg-major-notification .major-copy b")?.textContent||"",text:document.querySelector("#ccg-major-notification .major-copy span")?.textContent||""};
  });
  assert.equal(major.display,"grid","major notices must use the same full-width horizontal rail");
  assert.equal(major.title,"PATROL SHIFT","major notice title must remain visible");
  assert.ok(major.text.includes("patrol routes"),"major notice explanatory copy must remain visible");
  assert.ok(major.icon.right<=major.copy.left+1,`major-notice icon must sit beside, not above, the copy: ${JSON.stringify(major)}`);
  assert.ok(major.copy.width>major.rail.width*.5,`major-notice copy must use the majority of the black rail: ${JSON.stringify(major)}`);
  assert.ok(major.panel.bottom<=major.rail.bottom+1,`major notice must remain inside the reserved lower rail: ${JSON.stringify(major)}`);

  console.log("Dungeon Carnage R53 single-tap FIRE/melee, finite-lockout recovery and full-width notification rail regression passed in Chromium.");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(()=>resolve()));
}
