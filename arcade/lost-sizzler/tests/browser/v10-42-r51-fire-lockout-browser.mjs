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

  // Reproduce the deployed lockout architecture directly: after ordered startup
  // and late installers have settled, replace the mutable global FIRE owner with
  // a function that always refuses the shot. Real keyboard FIRE must still route
  // through the captured authoritative core and complete projectile/ammo commit.
  await page.waitForTimeout(450);
  const lateOwnerBefore=await page.evaluate(()=>{
    // Keep this ownership regression independent of procedural furniture. A
    // breakable immediately in the attack cell deliberately routes ATTACK to
    // melee, so stage a genuine walkable three-cell northbound lane while still
    // using the real ArrowUp + Space input path below.
    const occupied=(x,y)=>(host.blockingDecor||[]).some(row=>row&&row.x===x&&row.y===y&&Number(row.hp??2)>0)
      ||(host.doors||[]).some(row=>row&&row.x===x&&row.y===y&&!row.open)
      ||(host.enemies||[]).some(row=>row?.alive&&row.x===x&&row.y===y);
    let lane=null;
    for(let y=3;y<world.map.length-2&&!lane;y++)for(let x=2;x<(world.map[y]?.length||0)-2;x++){
      if(
        W.walkable(world.map,x,y,host)
        &&W.walkable(world.map,x,y-1,host)
        &&W.walkable(world.map,x,y-2,host)
        &&!occupied(x,y)&&!occupied(x,y-1)&&!occupied(x,y-2)
      ){lane={x,y};break}
    }
    if(!lane)throw new Error("late-owner FIRE regression could not stage a clear three-cell firing lane");
    p1.x=lane.x;p1.y=lane.y;p1.rx=lane.x;p1.ry=lane.y;p1.dir={x:0,y:-1};

    p1.firearmUnlocked=true;
    p1.weapon={...baseWeapon(),name:"TIER 2 · Field Pulse II",displayName:"TIER 2 · Field Pulse II",rating:3};
    p1.weaponLevel=2;p1.mana=113;p1.maxMana=Math.max(120,Number(p1.maxMana)||0);p1.hitStunMs=0;
    fire1=0;fireBuffer1=0;projectileCD=0;bullets.length=0;input.clear();
    window.CCGLostSizzlerV142R58AuthoritativeFireCore?.clearTrace?.();
    window.__ccgR62OriginalMutableFire=firePlayer;
    window.__ccgR62PoisonedFireCalls=0;
    firePlayer=function firePlayerR62PoisonedLateOwner(){window.__ccgR62PoisonedFireCalls++;return false};
    return{
      mana:Number(p1.mana),
      lane,
      r29UpdateFaults:Number(window.CCGLostSizzlerV141R29?.state?.updateFaults||0),
      r59FaultBridges:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?.faultBridges||0)
    };
  });
  await page.keyboard.down("ArrowUp");
  await page.keyboard.press("Space");
  await page.keyboard.up("ArrowUp");
  await page.waitForFunction(before=>Number(p1?.mana||0)<before,lateOwnerBefore.mana,{timeout:3000});
  const lateOwnerAfter=await page.evaluate(()=>{
    const trace=(window.CCGLostSizzlerV142R58AuthoritativeFireCore?.trace||[]).map(row=>({...row}));
    return{
      mana:Number(p1.mana),
      liveShots:bullets.filter(b=>b&&b.ttl>0&&b.owner===p1.id).length,
      poisonedCalls:Number(window.__ccgR62PoisonedFireCalls||0),
      trace,
      stages:trace.map(row=>String(row.stage||"")),
      inserted:Math.max(0,...trace.filter(row=>String(row.stage||"")==="projectiles-inserted").map(row=>Number(row.inserted||0))),
      r29UpdateFaults:Number(window.CCGLostSizzlerV141R29?.state?.updateFaults||0),
      r59FaultBridges:Number(window.CCGLostSizzlerV141R59LiveRegressionFixes?.state?.faultBridges||0)
    }
  });
  assert.equal(lateOwnerBefore.mana-lateOwnerAfter.mana,1,"late mutable FIRE replacement must not block authoritative buffered FIRE");
  // Ammo is committed only after the lexical owner has verified insertion.
  // A valid projectile may immediately hit nearby geometry and leave the live
  // bullets array before this asynchronous sample, so prove insertion from the
  // authoritative trace rather than requiring the projectile to remain alive.
  assert.ok(lateOwnerAfter.inserted>=1,`authoritative buffered FIRE must record projectile insertion despite the poisoned mutable owner: ${JSON.stringify(lateOwnerAfter)}`);
  assert.equal(lateOwnerAfter.poisonedCalls,0,"buffered/direct FIRE must not invoke the poisoned mutable global owner");
  for(const stage of ["queue","executor-enter","projectiles-inserted","ammo-committed","shot-complete","executor-result"])assert.ok(lateOwnerAfter.stages.includes(stage),`authoritative FIRE trace must record ${stage}`);
  assert.equal(lateOwnerAfter.r29UpdateFaults,lateOwnerBefore.r29UpdateFaults,"late-owner regression must not introduce an R29 update fault");
  assert.equal(lateOwnerAfter.r59FaultBridges,lateOwnerBefore.r59FaultBridges,"late-owner regression must not introduce an R59 fault bridge");
  await page.evaluate(()=>{if(typeof window.__ccgR62OriginalMutableFire==="function")firePlayer=window.__ccgR62OriginalMutableFire;delete window.__ccgR62OriginalMutableFire});

  const swordBefore=await page.evaluate(()=>{
    p1.firearmUnlocked=false;p1.weapon=null;p1.mana=0;p1.hitStunMs=0;p1.controlLocked=false;p1.controlsLocked=false;
    fire1=0;fireBuffer1=0;projectileCD=0;bullets.length=0;input.clear();
    window.CCGLostSizzlerV142AttackHoldLiveness?.clearHeld?.();
    if(typeof setAttackHeldInput==="function")setAttackHeldInput(p1,false);
    window.CCGLostSizzlerV142R58AuthoritativeFireCore?.clearTrace?.();
    if(typeof focusGameplayKeyboard==="function")focusGameplayKeyboard();
    return Number(p1._meleeSwingAt||0);
  });
  await page.waitForTimeout(80);
  await page.keyboard.down("Space");
  try{
    await page.waitForFunction(before=>Number(p1?._meleeSwingAt||0)>before,swordBefore,{timeout:3000});
  }catch(error){
    console.error("R97_SWORD_START_BLOCKER",JSON.stringify(await page.evaluate(()=>({
      mode:String(mode),active:document.body.dataset.runActive,health:p1?.health,hitStun:p1?.hitStunMs,
      controlLocked:p1?.controlLocked,controlsLocked:p1?.controlsLocked,firearmUnlocked:p1?.firearmUnlocked,
      weapon:p1?.weapon,mana:p1?.mana,meleeWeapon:p1?.meleeWeapon,weaponLevel:p1?.weaponLevel,
      fire1,fireBuffer1,projectileCD,space:input.has("Space"),swing:p1?._meleeSwingAt,
      trace:window.CCGLostSizzlerV142R58AuthoritativeFireCore?.trace,
      activeElement:String(document.activeElement?.id||document.activeElement?.tagName||""),updateFaults:window.CCGLostSizzlerV141R29?.state?.updateFaults,renderFaults:window.CCGLostSizzlerV141R29?.state?.renderFaults
    }))));
    throw error;
  }finally{
    await page.keyboard.up("Space");
  }
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
    host.blockingDecor.push({id:"r61-adjacent-firearm-prop",x:Number(p1.x)+1,y:Number(p1.y),type:"crate",blocking:true,structural:false,hp:2,maxHp:2});
    sync();
    window.CCGLostSizzlerInventoryHudV106?.render?.();
    return{
      mana:Number(p1.mana),
      swing:Number(p1._meleeSwingAt||0),
      hud:String(document.getElementById("hud-weapon")?.textContent||""),
      title:String(document.getElementById("hud-weapon")?.title||"")
    };
  });
  assert.equal(adjacentBefore.hud,"L2 FIELD PULSE","weapon HUD must show compact level plus readable weapon family");
  assert.match(adjacentBefore.title,/Weapon Level 2 · TIER 2 · Field Pulse II/,"weapon HUD title must retain full evolved weapon identity");
  await page.keyboard.down("Space");
  try{
    await page.waitForFunction(before=>Number(p1?._meleeSwingAt||0)>before.swing,adjacentBefore,{timeout:3000});
  }finally{
    await page.keyboard.up("Space");
  }
  const adjacentAfter=await page.evaluate(()=>({
    mana:Number(p1.mana),
    swing:Number(p1._meleeSwingAt||0),
    shots:bullets.filter(b=>b&&b.ttl>0&&b.owner===p1.id).length,
    prop:(host.blockingDecor||[]).find(d=>d.id==="r61-adjacent-firearm-prop")||null
  }));
  assert.equal(adjacentAfter.mana,adjacentBefore.mana,"adjacent breakable furniture must route ATTACK to melee without consuming firearm ammunition");
  assert.ok(adjacentAfter.swing>adjacentBefore.swing,"adjacent breakable furniture must produce a melee swing");
  assert.equal(adjacentAfter.shots,0,"contextual furniture melee must not spawn a firearm projectile");
  assert.equal(Number(adjacentAfter.prop?.hp??0),1,"one starter-sword hit must damage the adjacent breakable fixture");
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
  assert.equal(deathAfter.mode,"respawning","a processed normal death must remain in the explicit acknowledgement state");
  assert.equal(deathAfter.deaths,deathBefore.deaths+1,"the staged normal death must be owned exactly once");
  assert.equal(deathAfter.armor,deathBefore.armor,"runtime death recovery must not invent an extra armour penalty");
  const deathPrompt=await page.evaluate(()=>({
    active:document.getElementById("ccg-r72-death-feedback")?.classList.contains("active")===true,
    hidden:document.getElementById("ccg-r72-death-feedback")?.getAttribute("aria-hidden")||"",
    button:Boolean(document.getElementById("ccg-r72-death-continue"))
  }));
  assert.equal(deathPrompt.active,true,"normal death must expose the persistent YOU DIED acknowledgement");
  assert.equal(deathPrompt.hidden,"false","persistent YOU DIED acknowledgement must remain visible until confirmed");
  assert.equal(deathPrompt.button,true,"persistent YOU DIED acknowledgement must offer CONTINUE");
  await page.click("#ccg-r72-death-continue");
  await page.waitForFunction(()=>mode==="playing"&&p1&&!p1.controlLocked&&!p1.controlsLocked,null,{timeout:4000});

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
