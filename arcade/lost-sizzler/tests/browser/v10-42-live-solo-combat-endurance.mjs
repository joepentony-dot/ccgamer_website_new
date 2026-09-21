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
      mana:Number(p1?.mana)||0,health:Number(p1?.health)||0,hitStun:Number(p1?.hitStunMs)||0,
      fire1:Number(typeof fire1!=="undefined"?fire1:0)||0,buffer:Number(typeof fireBuffer1!=="undefined"?fireBuffer1:0)||0,projectileCD:Number(typeof projectileCD!=="undefined"?projectileCD:0)||0,
      bullets:Number(bullets?.length)||0,enemyBullets:Number(enemyBullets?.length)||0,particles:Number(particles?.length)||0,rings:Number(rings?.length)||0,floaters:Number(floaters?.length)||0,hazards:Number(hazards?.length)||0,
      enemies:Number(host?.enemies?.length)||0,aliveEnemies:(host?.enemies||[]).filter(e=>e?.alive!==false).length,
      projectileSteps:Number(life.steps)||0,projectileFaultSweeps:Number(life.faultSweeps)||0,
      updateFaults:Number(window.CCGLostSizzlerV141R29?.state?.updateFaults)||0,renderFaults:Number(window.CCGLostSizzlerV141R29?.state?.renderFaults)||0,
      attackIntents:Number(r20.attackIntents)||0,directAttackErrors:Number(r20.directAttackErrors)||0,r20FrameStalls:Number(r20.frameStalls)||0,
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
  assert.equal(boot.failed,false,`r36 ordered bootstrap failed: ${boot.error}`);assert.equal(boot.ready,true,"r36 ordered bootstrap must complete");
  assert.equal(boot.build,"V10.42 r36");assert.equal(boot.cache,"20260921r36a");assert.equal(boot.metaBuild,"V10.42 r36");assert.equal(boot.metaCache,"20260921r36a");
  assert.ok(boot.ordered.length>=30,"r36 bootstrap must load the complete ordered V10.42 chain");
  assert.ok(boot.ordered.every(src=>new URL(src).searchParams.get("v")==="20260921r36a"),"every ordered V10.42 module must use the r36 cache token");
  assert.ok(v142Requests.some(src=>src.includes("v10-42-projectile-lifecycle.js?v=20260921r36a")),"expected r36 projectile lifecycle asset was not requested");
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
    if(round===48){await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="paused");await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="playing");}
  }

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
  console.log("Dungeon Carnage V10.42 r36 live Solo combat endurance regression passed.");
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
