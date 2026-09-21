import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".ogg":"audio/ogg",".mp3":"audio/mpeg",".wav":"audio/wav"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

async function snap(page){
  return page.evaluate(()=>{
    const r59=window.CCGLostSizzlerV141R59LiveRegressionFixes?.state||{};
    const r20=window.CCGLostSizzlerV142R20LiveRegressionStability?.diagnostics||{};
    const r22=window.CCGLostSizzlerV142R22StallElapsedHandoff?.diagnostics||{};
    const life=window.CCGLostSizzlerV142ProjectileLifecycle?.diagnostics||{};
    const seal=window.CCGLostSizzlerV142R2ControllerOwnerSeal;
    const hb=window.__ccgEnduranceHeartbeat||{};
    return {
      mode:String(typeof mode!=="undefined"?mode:""),active:document.body?.dataset?.runActive||"",
      elapsed:Number(run?.elapsed)||0,floorElapsed:Number(host?.floorElapsed)||0,
      mana:Number(p1?.mana)||0,health:Number(p1?.health)||0,hitStun:Number(p1?.hitStunMs)||0,controlLocked:Boolean(p1?.controlLocked),controlsLocked:Boolean(p1?.controlsLocked),
      fire1:Number(typeof fire1!=="undefined"?fire1:0)||0,buffer:Number(typeof fireBuffer1!=="undefined"?fireBuffer1:0)||0,projectileCD:Number(typeof projectileCD!=="undefined"?projectileCD:0)||0,
      bullets:Number(bullets?.length)||0,enemyBullets:Number(enemyBullets?.length)||0,particles:Number(particles?.length)||0,rings:Number(rings?.length)||0,floaters:Number(floaters?.length)||0,hazards:Number(hazards?.length)||0,
      enemies:Number(host?.enemies?.length)||0,aliveEnemies:(host?.enemies||[]).filter(e=>e?.alive!==false).length,
      projectileSteps:Number(life.steps)||0,projectileFaultSweeps:Number(life.faultSweeps)||0,
      updateFaults:Number(window.CCGLostSizzlerV141R29?.state?.updateFaults)||0,renderFaults:Number(window.CCGLostSizzlerV141R29?.state?.renderFaults)||0,
      attackIntents:Number(r20.attackIntents)||0,directAttackErrors:Number(r20.directAttackErrors)||0,staleStunRepairs:Number(r20.staleStunRepairs)||0,controlLockRepairs:Number(r20.controlLockRepairs)||0,presentationRepairs:Number(r20.presentationRepairs)||0,mobileFireFallbacks:Number(r20.mobileFireFallbacks)||0,mobileFireReleases:Number(r20.mobileFireReleases)||0,r20FrameStalls:Number(r20.frameStalls)||0,
      r22Stalls:Number(r22.stallFrames)||0,r59LongGaps:Number(r59.longGaps)||0,r59Substeps:Number(r59.soloSubsteps)||0,r59Frames:Number(r59.soloFrames)||0,
      lifecycleOwner:Boolean(window.CCGLostSizzlerV142ProjectileLifecycle?.ownsBoundary?.()),
      sealGate:Boolean(seal?.gateActive?.()),sealUnsupported:Boolean(seal?.state?.unsupported),
      authoritativeUpdate:Boolean(seal?.authoritativeBoundary?.()&&window.update===seal.authoritativeBoundary()),
      rafFrames:Number(hb.frames)||0,rafStalls:Number(hb.stalls)||0,maxRafGap:Number(hb.maxGap)||0,
      build:String(window.CCGLostSizzlerV142Bootstrap?.build||""),cache:String(window.CCGLostSizzlerV142Bootstrap?.cache||"")
    };
  });
}

async function settleGameplayMode(page,label){
  const current=await page.evaluate(()=>String(typeof mode!=="undefined"?mode:""));
  if(current==="playing")return;
  if(current!=="levelup")assert.fail(`${label}: unexpected gameplay mode ${current}`);
  const choice=page.locator("#level-up-choices button").first();
  await choice.waitFor({state:"visible",timeout:5000});
  await choice.click();
  await page.waitForFunction(()=>typeof mode!=="undefined"&&mode==="playing",null,{timeout:5000});
}

async function armEnemy(page){
  return page.evaluate(()=>{
    if(!p1||!host)return false;
    p1.maxHealth=Math.max(5000,Number(p1.maxHealth)||0);p1.health=p1.maxHealth;p1.invuln=0;p1.hitStunMs=0;
    p1.firearmUnlocked=true;p1.maxMana=Math.max(100000,Number(p1.maxMana)||0);p1.mana=p1.maxMana;
    const enemy=(host.enemies||[]).find(e=>e&&e.alive!==false)||(host.enemies||[]).find(Boolean);
    if(!enemy)return false;
    enemy.alive=true;enemy.hp=1;enemy.maxHp=Math.max(1,Number(enemy.maxHp)||1);enemy.attackCooldown=5000;
    const dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
    const chosen=dirs.find(d=>{try{return W.walkable(world.map,p1.x+d.x,p1.y+d.y,host)}catch(_){return true}})||dirs[0];
    enemy.x=p1.x+chosen.x;enemy.y=p1.y+chosen.y;enemy.rx=enemy.x;enemy.ry=enemy.y;p1.dir=chosen;
    return true;
  });
}

async function fireCycle(page,key,round){
  await settleGameplayMode(page,`round ${round} before ${key}`);
  const before=await snap(page);
  await page.keyboard.down(key);await page.waitForTimeout(520);await page.keyboard.up(key);await page.waitForTimeout(120);
  await settleGameplayMode(page,`round ${round} after ${key}`);
  const after=await snap(page);
  assert.equal(after.active,"true",`round ${round}: run deactivated during ${key}`);
  assert.ok(after.elapsed>before.elapsed,`round ${round}: simulation stopped advancing during ${key}`);
  assert.ok(after.rafFrames>before.rafFrames,`round ${round}: requestAnimationFrame stopped advancing during ${key}`);
  assert.ok(after.attackIntents>before.attackIntents,`round ${round}: ${key} never reached the authoritative attack input owner`);
  assert.ok(after.projectileSteps>before.projectileSteps||after.mana<before.mana,`round ${round}: firing input reached the attack owner but no attack/projectile work occurred for ${key}`);
  assert.equal(after.lifecycleOwner,true,`round ${round}: #2118 projectile lifecycle lost ownership`);
  assert.equal(after.projectileFaultSweeps,before.projectileFaultSweeps,`round ${round}: projectile lifecycle encountered a new downstream fault`);
  assert.equal(after.updateFaults,before.updateFaults,`round ${round}: update fault loop appeared`);
  assert.equal(after.renderFaults,before.renderFaults,`round ${round}: render fault loop appeared`);
  assert.equal(after.directAttackErrors,before.directAttackErrors,`round ${round}: direct attack owner threw`);
  assert.ok(after.bullets<80&&after.enemyBullets<160,`round ${round}: projectile pools grew unexpectedly (${after.bullets}/${after.enemyBullets})`);
  assert.ok(after.particles<=900&&after.rings<=180&&after.floaters<=140,`round ${round}: visual collections exceeded bounded runtime limits`);
  assert.ok(after.maxRafGap<5000,`round ${round}: browser frame gap reached ${Math.round(after.maxRafGap)}ms`);
  return after;
}

async function directQueueAttackCycle(page,round){
  await settleGameplayMode(page,`round ${round} before direct queue attack`);
  const before=await snap(page);
  const queued=await page.evaluate(()=>{
    if(!p1||typeof queueAttack!=="function")return false;
    queueAttack(p1);
    input.add("Space");
    return true;
  });
  assert.equal(queued,true,`round ${round}: mobile-style direct queue attack route unavailable`);
  await page.waitForTimeout(520);
  await page.evaluate(()=>input.delete("Space"));
  await page.waitForTimeout(140);
  await settleGameplayMode(page,`round ${round} after direct queue attack`);
  const after=await snap(page);
  assert.equal(after.active,"true",`round ${round}: run deactivated during direct queue attack`);
  assert.ok(after.elapsed>before.elapsed,`round ${round}: simulation stopped during direct queue attack`);
  assert.ok(after.projectileSteps>before.projectileSteps||after.mana<before.mana,`round ${round}: mobile-style direct queue attack produced no attack/projectile work`);
  assert.equal(after.lifecycleOwner,true,`round ${round}: projectile lifecycle ownership changed during direct queue attack`);
  assert.equal(after.updateFaults,before.updateFaults,`round ${round}: update fault appeared during direct queue attack`);
  assert.equal(after.renderFaults,before.renderFaults,`round ${round}: render fault appeared during direct queue attack`);
  return after;
}

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}});
  // The endurance contract owns runtime/frame/firing behaviour, not live account
  // services. Stub production Supabase calls so localhost CORS policy cannot
  // create false console failures after the gameplay assertions have passed.
  await context.route("https://*.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:"{}"}));
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}});
  const page=await context.newPage();
  page.setDefaultTimeout(60000);
  const pageErrors=[],consoleErrors=[],failedScripts=[],v142Requests=[];
  page.on("pageerror",error=>pageErrors.push(String(error?.stack||error)));
  page.on("console",msg=>{if(msg.type()==="error")consoleErrors.push(msg.text())});
  page.on("request",request=>{try{const url=new URL(request.url());if(/\/arcade\/lost-sizzler\/js\/v10-42-/.test(url.pathname))v142Requests.push(`${url.pathname}${url.search}`)}catch(_){}});
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.js$/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});

  await page.goto(`${origin}/arcade/lost-sizzler/?live-solo-combat-endurance=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.CCGLostSizzlerV142Bootstrap&&document.body,null,{timeout:20000});
  await page.waitForFunction(()=>window.CCGLostSizzlerV142Bootstrap?.ready===true||window.CCGLostSizzlerV142Bootstrap?.failed===true,null,{timeout:90000});
  const boot=await page.evaluate(()=>({ready:CCGLostSizzlerV142Bootstrap.ready,failed:CCGLostSizzlerV142Bootstrap.failed,error:CCGLostSizzlerV142Bootstrap.error||"",build:CCGLostSizzlerV142Bootstrap.build,cache:CCGLostSizzlerV142Bootstrap.cache,metaBuild:document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content,metaCache:document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content,ordered:[...document.querySelectorAll('script[data-ccg-v142-ordered="true"]')].map(s=>s.src)}));
  assert.equal(boot.failed,false,`r43 ordered bootstrap failed: ${boot.error}`);assert.equal(boot.ready,true,"r43 ordered bootstrap must complete");
  assert.equal(boot.build,"V10.42 r43");assert.equal(boot.cache,"20260921r43");assert.equal(boot.metaBuild,"V10.42 r43");assert.equal(boot.metaCache,"20260921r43");
  assert.ok(boot.ordered.length>=30,"r43 bootstrap must load the complete ordered V10.42 chain");
  assert.ok(boot.ordered.every(src=>new URL(src).searchParams.get("v")==="20260921r43"),"every ordered V10.42 module must use the r43 cache token");
  assert.ok(v142Requests.some(src=>src.includes("v10-42-projectile-lifecycle.js?v=20260921r43")),"expected r43 projectile lifecycle asset was not requested");
  assert.equal(await page.evaluate(()=>window.CCGLostSizzlerV142ProjectileLifecycle?.ownsBoundary?.()===true),true,"#2118 lifecycle owner must be authoritative before play");

  await page.evaluate(()=>{const hb=window.__ccgEnduranceHeartbeat={frames:0,stalls:0,maxGap:0,last:0};const beat=t=>{if(hb.last){const gap=t-hb.last;hb.maxGap=Math.max(hb.maxGap,gap);if(gap>300)hb.stalls++}hb.last=t;hb.frames++;requestAnimationFrame(beat)};requestAnimationFrame(beat)});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1)&&Boolean(host),null,{timeout:20000});
  await page.waitForFunction(()=>Number(window.__ccgDungeonCamera?.zoom)>=1);
  const desktopCamera=await page.evaluate(()=>({...window.__ccgDungeonCamera}));
  assert.equal(desktopCamera.zoom,1,`desktop Solo must retain the established camera scale: ${JSON.stringify(desktopCamera)}`);
  assert.equal(desktopCamera.logicalWidth,desktopCamera.viewportWidth,"desktop Solo must retain the full logical viewport width");
  assert.equal(desktopCamera.logicalHeight,desktopCamera.viewportHeight,"desktop Solo must retain the full logical viewport height");
  const initial=await snap(page);
  assert.equal(initial.lifecycleOwner,true,"#2118 lifecycle owner must remain authoritative in Solo");
  assert.ok(initial.sealGate||initial.sealUnsupported||initial.authoritativeUpdate,"controller owner must be sealed, explicitly unsupported, or already on its authoritative boundary");

  const keys=["Space","KeyF","Numpad0"];
  for(let round=1;round<=96;round++){
    await settleGameplayMode(page,`round ${round} start`);
    assert.equal(await armEnemy(page),true,`round ${round}: no generated enemy available`);
    const current=await fireCycle(page,keys[(round-1)%keys.length],round);
    const movement=round%2?"KeyD":"KeyA";await page.keyboard.down(movement);await page.waitForTimeout(90);await page.keyboard.up(movement);await page.waitForTimeout(50);
    await settleGameplayMode(page,`round ${round} after movement`);
    const moved=await snap(page);
    assert.ok(moved.elapsed>current.elapsed,`round ${round}: movement/combat simulation failed to progress after attack`);
    assert.ok(moved.projectileSteps>=current.projectileSteps,`round ${round}: projectile simulation regressed`);
    assert.ok(moved.rafFrames>current.rafFrames,`round ${round}: frame loop failed to progress after movement`);
    if(round===48){
      await page.keyboard.press("KeyP");
      await page.waitForFunction(()=>mode==="paused");
      await page.waitForTimeout(5500);
      const pausedPoison=await page.evaluate(()=>{
        fire1=4000;fireBuffer1=700;projectileCD=700;
        input.add("Space");input.add("KeyF");input.add("Numpad0");
        window.CCGLostSizzlerV142AttackHoldLiveness?.held?.add?.("KeyF");
        return{
          mode:String(mode),fire1:Number(fire1),buffer:Number(fireBuffer1),projectileCD:Number(projectileCD),
          held:Number(window.CCGLostSizzlerV142AttackHoldLiveness?.held?.size||0)
        };
      });
      assert.equal(pausedPoison.mode,"paused","extended-pause regression must remain inside the pause boundary while stale attack state is seeded");
      assert.ok(pausedPoison.fire1>0&&pausedPoison.buffer>0&&pausedPoison.projectileCD>0&&pausedPoison.held>0,"extended-pause regression failed to reproduce stale attack ownership");
      await page.keyboard.press("KeyP");
      await page.waitForFunction(()=>mode==="playing");
      await page.waitForTimeout(80);
      const recovered=await page.evaluate(()=>({
        fire1:Number(fire1),buffer:Number(fireBuffer1),projectileCD:Number(projectileCD),
        space:input.has("Space"),keyF:input.has("KeyF"),numpad0:input.has("Numpad0"),
        held:Number(window.CCGLostSizzlerV142AttackHoldLiveness?.held?.size||0),
        resets:Number(window.__CCG_PAUSE_ATTACK_RESETS__||0)
      }));
      assert.ok(Number.isFinite(recovered.fire1)&&recovered.fire1<=0,`extended pause resume must leave P1 fire cadence ready (<=0), got ${recovered.fire1}`);
      assert.equal(recovered.buffer,0,"extended pause resume must clear stale attack buffer");
      assert.ok(Number.isFinite(recovered.projectileCD)&&recovered.projectileCD>=0&&recovered.projectileCD<=70,`extended pause resume must replace stale projectile cadence with the normal 0-70 ms live cadence, got ${recovered.projectileCD}`);
      assert.equal(recovered.space,false,"extended pause resume must clear canonical Space ownership");
      assert.equal(recovered.keyF,false,"extended pause resume must clear KeyF alias ownership");
      assert.equal(recovered.numpad0,false,"extended pause resume must clear Numpad0 alias ownership");
      assert.equal(recovered.held,0,"extended pause resume must clear the independent held-attack owner");
      assert.ok(recovered.resets>=2,"extended pause resume must execute the guarded attack reset boundary");
      assert.equal(await armEnemy(page),true,"extended-pause recovery enemy unavailable");
      await fireCycle(page,"Space",4801);
      assert.equal(await armEnemy(page),true,"extended-pause KeyF recovery enemy unavailable");
      await fireCycle(page,"KeyF",4802);
      assert.equal(await armEnemy(page),true,"extended-pause Numpad0 recovery enemy unavailable");
      await fireCycle(page,"Numpad0",4803);
    }
    if(round===64){
      await page.evaluate(()=>toggleInventory());
      await page.waitForFunction(()=>mode==="inventory"&&!document.getElementById("inventory-panel")?.classList.contains("hidden"));
      await page.waitForTimeout(5500);
      const inventoryPoison=await page.evaluate(()=>{
        fire1=4000;fireBuffer1=700;projectileCD=700;
        input.add("Space");input.add("KeyF");input.add("Numpad0");
        window.CCGLostSizzlerV142AttackHoldLiveness?.held?.add?.("KeyF");
        p1.controlLocked=true;p1.controlsLocked=true;p1.hitStunMs=7000;
        return{
          mode:String(mode),fire1:Number(fire1),buffer:Number(fireBuffer1),projectileCD:Number(projectileCD),
          held:Number(window.CCGLostSizzlerV142AttackHoldLiveness?.held?.size||0),
          controlLocked:Boolean(p1.controlLocked),controlsLocked:Boolean(p1.controlsLocked),hitStunMs:Number(p1.hitStunMs)
        };
      });
      assert.equal(inventoryPoison.mode,"inventory","extended inventory regression must remain inside the inventory boundary while stale attack state is seeded");
      assert.ok(inventoryPoison.fire1>0&&inventoryPoison.buffer>0&&inventoryPoison.projectileCD>0&&inventoryPoison.held>0,"extended inventory regression failed to reproduce stale attack ownership");
      assert.equal(inventoryPoison.controlLocked,true,"extended inventory regression failed to seed the primary control lock");
      assert.equal(inventoryPoison.controlsLocked,true,"extended inventory regression failed to seed the aliased control lock");
      await page.locator("#inventory-close").click();
      await page.waitForFunction(()=>mode==="playing"&&document.getElementById("inventory-panel")?.classList.contains("hidden"));
      await page.waitForTimeout(120);
      const inventoryRecovered=await page.evaluate(()=>({
        fire1:Number(fire1),buffer:Number(fireBuffer1),projectileCD:Number(projectileCD),
        space:input.has("Space"),keyF:input.has("KeyF"),numpad0:input.has("Numpad0"),
        held:Number(window.CCGLostSizzlerV142AttackHoldLiveness?.held?.size||0),
        controlLocked:Boolean(p1.controlLocked),controlsLocked:Boolean(p1.controlsLocked),hitStunMs:Number(p1.hitStunMs),
        lastReset:String(window.__CCG_PAUSE_ATTACK_LAST_RESET__?.reason||"")
      }));
      assert.ok(Number.isFinite(inventoryRecovered.fire1)&&inventoryRecovered.fire1<=0,`extended inventory resume must leave P1 fire cadence ready (<=0), got ${inventoryRecovered.fire1}`);
      assert.equal(inventoryRecovered.buffer,0,"extended inventory resume must clear stale attack buffer");
      assert.ok(Number.isFinite(inventoryRecovered.projectileCD)&&inventoryRecovered.projectileCD>=0&&inventoryRecovered.projectileCD<=70,`extended inventory resume must restore normal live projectile cadence, got ${inventoryRecovered.projectileCD}`);
      assert.equal(inventoryRecovered.space,false,"extended inventory resume must clear canonical Space ownership");
      assert.equal(inventoryRecovered.keyF,false,"extended inventory resume must clear KeyF alias ownership");
      assert.equal(inventoryRecovered.numpad0,false,"extended inventory resume must clear Numpad0 alias ownership");
      assert.equal(inventoryRecovered.held,0,"extended inventory resume must clear the independent held-attack owner");
      assert.equal(inventoryRecovered.controlLocked,false,"extended inventory resume must clear the primary player control lock");
      assert.equal(inventoryRecovered.controlsLocked,false,"extended inventory resume must clear the aliased player control lock");
      assert.equal(inventoryRecovered.hitStunMs,0,"extended inventory resume must clear a stale over-limit hit-stun lock");
      assert.ok(inventoryRecovered.lastReset.startsWith("inventory-close"),`inventory close must own the combat resume reset, got ${inventoryRecovered.lastReset}`);
      assert.equal(await armEnemy(page),true,"extended-inventory direct queue recovery enemy unavailable");
      await directQueueAttackCycle(page,6401);
      assert.equal(await armEnemy(page),true,"extended-inventory keyboard recovery enemy unavailable");
      await fireCycle(page,"Space",6402);
    }
    if(round===80){
      assert.equal(await armEnemy(page),true,"ordinary-play liveness enemy unavailable");
      const beforeLiveRepair=await snap(page);
      const poisoned=await page.evaluate(()=>{
        p1.controlLocked=true;p1.controlsLocked=true;
        p1.hitStunMs=180;p1.__ccgLastHurtAt=performance.now()-2000;
        fire1=4000;fireBuffer1=700;projectileCD=700;
        return{
          controlLocked:Boolean(p1.controlLocked),controlsLocked:Boolean(p1.controlsLocked),hitStunMs:Number(p1.hitStunMs),
          fire1:Number(fire1),buffer:Number(fireBuffer1),projectileCD:Number(projectileCD)
        };
      });
      assert.equal(poisoned.controlLocked,true,"ordinary-play regression failed to seed controlLocked");
      assert.equal(poisoned.controlsLocked,true,"ordinary-play regression failed to seed controlsLocked");
      assert.equal(poisoned.hitStunMs,180,"ordinary-play regression failed to seed a numerically valid but stale hit-stun");
      const handled=await page.evaluate(()=>window.CCGLostSizzlerV142R20LiveRegressionStability?.attackNow?.("Space")===true);
      assert.equal(handled,true,"ordinary-play attack owner did not recover a stale live-combat lock");
      await page.waitForTimeout(360);
      const afterLiveRepair=await snap(page);
      assert.ok(afterLiveRepair.mana<beforeLiveRepair.mana||afterLiveRepair.projectileSteps>beforeLiveRepair.projectileSteps,"ordinary-play attack recovery produced no shot/projectile work");
      assert.equal(afterLiveRepair.hitStun,0,"ordinary-play attack recovery must clear stale hit-stun after its real damage window");
      assert.equal(afterLiveRepair.controlLocked,false,"ordinary-play attack recovery must clear controlLocked regardless of which repair owner wins the race");
      assert.equal(afterLiveRepair.controlsLocked,false,"ordinary-play attack recovery must clear controlsLocked regardless of which repair owner wins the race");
    }
  }

  const sealedDeath=await page.evaluate(()=>{
    const room=(world.rooms||[]).find(r=>r.id!==host.sigilRoomId&&(host.doors||[]).some(d=>d.type==="room"&&d.roomId===r.id));
    if(!room)return{ok:false,reason:"no ordinary room with doors"};
    const pos=[];
    for(let y=room.y+1;y<room.y+room.h;y++)for(let x=room.x+1;x<room.x+room.w;x++)if(world.map[y]?.[x]===0){pos.push({x,y});break}
    const q=pos[0];if(!q)return{ok:false,reason:"no open death cell"};
    const doors=(host.doors||[]).filter(d=>d.type==="room"&&d.roomId===room.id);
    for(const d of doors){d.locked=true;d.open=false;d.opening=false;d.openAt=0;d.openingStart=0}
    p1.x=q.x;p1.y=q.y;p1.rx=q.x;p1.ry=q.y;p1.health=1;p1.invuln=0;
    p1.totalXp=Math.max(1000,Number(p1.totalXp)||0);p1.xp=Math.max(500,Number(p1.xp)||0);run.everEarnedXp=true;
    const deathsBefore=Number(run.stats.deaths||0);
    hurtPlayer(p1,999,false,"sealed-room regression");
    const cache=(host.deathCaches||[]).at(-1)||null;
    return{
      ok:true,roomId:room.id,deathsBefore,deathsAfter:Number(run.stats.deaths||0),
      mode:String(mode),atStart:p1.x===world.start.x&&p1.y===world.start.y,
      doors:doors.map(d=>({locked:Boolean(d.locked),open:Boolean(d.open)})),
      cache:cache?{active:Boolean(cache.active),x:cache.x,y:cache.y,roomId:W.roomAt(world,cache.x,cache.y)}:null,
      hitStun:Number(p1.hitStunMs||0),controlLocked:Boolean(p1.controlLocked),controlsLocked:Boolean(p1.controlsLocked)
    };
  });
  assert.equal(sealedDeath.ok,true,`sealed-room death regression could not be staged: ${JSON.stringify(sealedDeath)}`);
  assert.equal(sealedDeath.deathsAfter,sealedDeath.deathsBefore+1,"sealed-room regression must execute a real normal death");
  assert.equal(sealedDeath.mode,"playing","normal sealed-room death must respawn rather than end the run");
  assert.equal(sealedDeath.atStart,true,"normal sealed-room death must respawn at the floor start");
  assert.ok(sealedDeath.doors.length>0&&sealedDeath.doors.every(d=>!d.locked&&d.open),"all ordinary doors for the death room must reopen after respawn");
  assert.equal(sealedDeath.cache?.active,true,"sealed-room death must leave an active death box");
  assert.equal(sealedDeath.cache?.roomId,sealedDeath.roomId,"death box must remain in the room where the player died");
  assert.equal(sealedDeath.hitStun,0,"respawn must clear hit-stun");
  assert.equal(sealedDeath.controlLocked,false,"respawn must clear controlLocked");
  assert.equal(sealedDeath.controlsLocked,false,"respawn must clear controlsLocked");

  await settleGameplayMode(page,"post-cycle");assert.equal(await armEnemy(page),true,"post-cycle enemy unavailable");
  await fireCycle(page,"Space",97);
  const final=await snap(page);
  assert.ok(final.elapsed>initial.elapsed+45000,`endurance run did not accumulate enough real simulation time (${Math.round(final.elapsed-initial.elapsed)}ms)`);
  assert.ok(final.projectileSteps>initial.projectileSteps+300,`authoritative projectile lifecycle did not execute sustained work (${final.projectileSteps-initial.projectileSteps})`);
  assert.ok(final.attackIntents>initial.attackIntents+90,`attack owner did not process the expected sustained input volume (${final.attackIntents-initial.attackIntents})`);
  assert.equal(final.lifecycleOwner,true,"#2118 projectile lifecycle ownership changed during endurance run");
  assert.equal(final.updateFaults,initial.updateFaults,"sustained combat accumulated update faults");
  assert.equal(final.renderFaults,initial.renderFaults,"sustained combat accumulated render faults");
  assert.equal(final.directAttackErrors,initial.directAttackErrors,"sustained combat accumulated attack-owner errors");
  assert.ok(final.bullets<80&&final.enemyBullets<160,"projectile collections were not bounded");
  assert.ok(final.particles<=900&&final.rings<=180&&final.floaters<=140,"visual effect collections were not bounded");
  assert.deepEqual(pageErrors,[],`uncaught page errors:\n${pageErrors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`same-origin script failures:\n${failedScripts.join("\n")}`);
  assert.deepEqual(consoleErrors,[],`console errors:\n${consoleErrors.join("\n")}`);

  console.log("DUNGEON_R30_SOLO_ENDURANCE",JSON.stringify({initial,final,requests:v142Requests.length}));
  console.log("Dungeon Carnage V10.42 r43 live Solo combat endurance regression passed.");
  await context.close();

  const touchContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await touchContext.route("https://*.supabase.co/**",route=>route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:"{}"}));
  await touchContext.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true")}catch(_){}});
  const touchPage=await touchContext.newPage();
  touchPage.setDefaultTimeout(60000);
  await touchPage.goto(`${origin}/arcade/lost-sizzler/?mobile-fire-runtime-contract=1`,{waitUntil:"domcontentloaded"});
  await touchPage.waitForFunction(()=>window.CCGLostSizzlerV142Bootstrap?.ready===true||window.CCGLostSizzlerV142Bootstrap?.failed===true,null,{timeout:90000});
  const touchBoot=await touchPage.evaluate(()=>({ready:CCGLostSizzlerV142Bootstrap?.ready===true,failed:CCGLostSizzlerV142Bootstrap?.failed===true,error:String(CCGLostSizzlerV142Bootstrap?.error||"")}));
  assert.equal(touchBoot.failed,false,`mobile FIRE runtime bootstrap failed: ${touchBoot.error}`);
  assert.equal(touchBoot.ready,true,"mobile FIRE runtime bootstrap must complete");
  await touchPage.click("#solo-btn");
  await touchPage.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1)&&Boolean(host),null,{timeout:20000});
  await touchPage.locator('#v104-touch-controls [data-action="fire"]').waitFor({state:"visible",timeout:10000});
  assert.equal(await armEnemy(touchPage),true,"mobile FIRE runtime enemy unavailable");

  const touchBefore=await snap(touchPage);
  const touchPoison=await touchPage.evaluate(()=>{
    p1.controlLocked=true;p1.controlsLocked=true;
    p1.hitStunMs=180;p1.__ccgLastHurtAt=performance.now()-2000;
    fire1=4000;fireBuffer1=700;projectileCD=700;
    document.body.dataset.runActive="false";
    const button=document.querySelector('#v104-touch-controls [data-action="fire"]');
    if(button){
      const clone=button.cloneNode(true);
      button.replaceWith(clone);
    }
    return{
      controlLocked:Boolean(p1.controlLocked),
      controlsLocked:Boolean(p1.controlsLocked),
      hitStunMs:Number(p1.hitStunMs),
      fire1:Number(fire1),
      buffer:Number(fireBuffer1),
      projectileCD:Number(projectileCD),
      runActive:String(document.body.dataset.runActive||""),
      fireButton:Boolean(document.querySelector('#v104-touch-controls [data-action="fire"]'))
    };
  });
  assert.equal(touchPoison.controlLocked,true,"mobile FIRE regression failed to seed controlLocked");
  assert.equal(touchPoison.controlsLocked,true,"mobile FIRE regression failed to seed controlsLocked");
  assert.equal(touchPoison.hitStunMs,180,"mobile FIRE regression failed to seed stale hit-stun");
  assert.equal(touchPoison.runActive,"false","mobile FIRE regression failed to seed stale live-run presentation state");
  assert.equal(touchPoison.fireButton,true,"mobile FIRE regression failed to retain the visible FIRE button after stripping its direct listeners");

  await touchPage.locator('#v104-touch-controls [data-action="fire"]').tap();
  await touchPage.waitForTimeout(420);
  const touchAfter=await snap(touchPage);
  const touchSpaceHeld=await touchPage.evaluate(()=>input.has("Space"));
  assert.ok(touchAfter.projectileSteps>touchBefore.projectileSteps||touchAfter.mana<touchBefore.mana,"actual mobile FIRE button produced no attack/projectile work after stale-state recovery");
  assert.equal(touchAfter.hitStun,0,"actual mobile FIRE button must clear stale hit-stun");
  assert.equal(touchAfter.controlLocked,false,"actual mobile FIRE button must clear controlLocked");
  assert.equal(touchAfter.controlsLocked,false,"actual mobile FIRE button must clear controlsLocked");
  assert.equal(touchSpaceHeld,false,"mobile FIRE pointer release must not leave Space held");
  assert.equal(touchAfter.lifecycleOwner,true,"mobile FIRE must preserve projectile lifecycle ownership");
  assert.ok(touchAfter.presentationRepairs>touchBefore.presentationRepairs,"actual mobile FIRE must repair a stale live-run presentation flag");
  assert.ok(touchAfter.mobileFireFallbacks>touchBefore.mobileFireFallbacks,"delegated mobile FIRE safety owner must recover a visible button whose direct listener was lost");

  const fireButton=touchPage.locator('#v104-touch-controls [data-action="fire"]');
  const moveRight=touchPage.locator('#v104-touch-controls [data-key="KeyD"]');
  const moveLeft=touchPage.locator('#v104-touch-controls [data-key="KeyA"]');
  const soakStarted=Date.now();
  let soakShots=0;
  while(Date.now()-soakStarted<305000){
    await settleGameplayMode(touchPage,"five-minute mobile FIRE soak");
    await touchPage.evaluate(()=>{
      if(p1){
        p1.maxHealth=Math.max(5000,Number(p1.maxHealth)||0);
        p1.health=p1.maxHealth;
        p1.invuln=0;
        p1.mana=Math.max(80,Number(p1.mana)||0);
      }
    });
    assert.equal(await armEnemy(touchPage),true,"five-minute mobile FIRE soak enemy unavailable");
    const beforeSoakShot=await snap(touchPage);
    await fireButton.tap();
    await touchPage.waitForTimeout(420);
    const afterSoakShot=await snap(touchPage);
    assert.ok(afterSoakShot.projectileSteps>beforeSoakShot.projectileSteps||afterSoakShot.mana<beforeSoakShot.mana,`five-minute mobile FIRE soak lost firing at ${Math.round((Date.now()-soakStarted)/1000)}s`);
    assert.equal(afterSoakShot.controlLocked,false,"five-minute mobile FIRE soak left controlLocked set");
    assert.equal(afterSoakShot.controlsLocked,false,"five-minute mobile FIRE soak left controlsLocked set");
    soakShots++;
    const move=soakShots%2?moveRight:moveLeft;
    await move.tap().catch(()=>{});
    await touchPage.waitForTimeout(14580);
  }
  assert.ok(soakShots>=19,`five-minute mobile FIRE soak completed too few verified attacks: ${soakShots}`);

  await touchPage.locator('#v104-touch-controls [data-action="inventory"]').tap();
  await touchPage.waitForFunction(()=>mode==="inventory");
  await touchPage.waitForTimeout(5500);
  await touchPage.evaluate(()=>{
    document.body.dataset.runActive="false";
    fire1=4000;fireBuffer1=700;projectileCD=700;
    p1.hitStunMs=180;p1.__ccgLastHurtAt=performance.now()-2000;
  });
  await touchPage.locator("#inventory-close").click();
  await touchPage.waitForFunction(()=>mode==="playing");
  assert.equal(await armEnemy(touchPage),true,"post-inventory mobile FIRE enemy unavailable");
  const beforeInventoryFire=await snap(touchPage);
  await fireButton.tap();
  await touchPage.waitForTimeout(420);
  const afterInventoryFire=await snap(touchPage);
  assert.ok(afterInventoryFire.projectileSteps>beforeInventoryFire.projectileSteps||afterInventoryFire.mana<beforeInventoryFire.mana,"actual mobile FIRE failed after extended inventory dwell");

  await touchPage.evaluate(()=>pause(false));
  await touchPage.waitForFunction(()=>mode==="paused");
  await touchPage.waitForTimeout(5500);
  await touchPage.evaluate(()=>{
    document.body.dataset.runActive="false";
    fire1=4000;fireBuffer1=700;projectileCD=700;
    p1.hitStunMs=180;p1.__ccgLastHurtAt=performance.now()-2000;
  });
  await touchPage.locator("#resume-btn").click();
  await touchPage.waitForFunction(()=>mode==="playing");
  assert.equal(await armEnemy(touchPage),true,"post-pause mobile FIRE enemy unavailable");
  const beforePauseFire=await snap(touchPage);
  await fireButton.tap();
  await touchPage.waitForTimeout(420);
  const afterPauseFire=await snap(touchPage);
  assert.ok(afterPauseFire.projectileSteps>beforePauseFire.projectileSteps||afterPauseFire.mana<beforePauseFire.mana,"actual mobile FIRE failed after extended pause");

  const finalTouchSpaceHeld=await touchPage.evaluate(()=>input.has("Space"));
  assert.equal(finalTouchSpaceHeld,false,"extended mobile FIRE scenarios must finish with Space released");
  await touchContext.close();
  console.log("Dungeon Carnage five-minute mobile FIRE, inventory and pause liveness regression passed.");
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
