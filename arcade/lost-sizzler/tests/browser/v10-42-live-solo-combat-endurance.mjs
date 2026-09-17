import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".ogg":"audio/ogg",".mp3":"audio/mpeg",".wav":"audio/wav"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname),relative=pathname.endsWith("/")?`${pathname}index.html`:pathname,file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{if(error){res.writeHead(404,{connection:"close"}).end("not found");return}res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store",connection:"close"});res.end(data)});
  }catch(error){res.writeHead(500,{connection:"close"}).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

async function snapshot(page){
  return page.evaluate(()=>({
    now:performance.now(),mode:String(mode),active:document.body.dataset.runActive,
    elapsed:Number(run?.elapsed)||0,floorElapsed:Number(host?.floorElapsed)||0,
    mana:Number(p1?.mana)||0,health:Number(p1?.health)||0,hitStun:Number(p1?.hitStunMs)||0,
    fire1:Number(fire1)||0,buffer:Number(fireBuffer1)||0,projectileCD:Number(projectileCD)||0,
    inputSpace:Boolean(input?.has?.("Space")),
    bullets:Number(bullets?.length)||0,enemyBullets:Number(enemyBullets?.length)||0,
    particles:Number(particles?.length)||0,rings:Number(rings?.length)||0,floaters:Number(floaters?.length)||0,
    hazards:Number(hazards?.length)||0,enemies:Number(host?.enemies?.length)||0,
    aliveEnemies:(host?.enemies||[]).filter(enemy=>enemy?.alive!==false).length,
    projectileSteps:Number(window.CCGLostSizzlerV142ProjectileLifecycle?.diagnostics?.steps)||0,
    projectileFaultSweeps:Number(window.CCGLostSizzlerV142ProjectileLifecycle?.diagnostics?.faultSweeps)||0,
    r29UpdateFaults:Number(window.CCGLostSizzlerV141R29?.state?.updateFaults)||0,
    r29RenderFaults:Number(window.CCGLostSizzlerV141R29?.state?.renderFaults)||0,
    r29FrameStalls:Number(window.CCGLostSizzlerV141R29?.state?.frameStalls)||0,
    r20AttackIntents:Number(window.CCGLostSizzlerV142R20LiveRegressionStability?.diagnostics?.attackIntents)||0,
    r20AttackErrors:Number(window.CCGLostSizzlerV142R20LiveRegressionStability?.diagnostics?.directAttackErrors)||0,
    r20FrameStalls:Number(window.CCGLostSizzlerV142R20LiveRegressionStability?.diagnostics?.frameStalls)||0,
    holdKeydowns:Number(window.CCGLostSizzlerV142AttackHoldLiveness?.diagnostics?.keydowns)||0,
    holdNormalised:Number(window.CCGLostSizzlerV142AttackHoldLiveness?.diagnostics?.normalisedHolds)||0,
    holdCount:Number(window.CCGLostSizzlerV142AttackHoldLiveness?.held?.size)||0,
    lifecycleOwner:Boolean(window.CCGLostSizzlerV142ProjectileLifecycle?.ownsBoundary?.()),
    updateSealed:Boolean(window.CCGLostSizzlerV142R2ControllerOwnerSeal?.gateActive?.()),
    build:String(window.CCGLostSizzlerV142Bootstrap?.build||""),cache:String(window.CCGLostSizzlerV142Bootstrap?.cache||"")
  }));
}

async function armRealEnemy(page){
  return page.evaluate(()=>{
    p1.maxHealth=Math.max(5000,Number(p1.maxHealth)||0);p1.health=p1.maxHealth;p1.invuln=0;p1.hitStunMs=0;
    p1.firearmUnlocked=true;p1.maxMana=Math.max(100000,Number(p1.maxMana)||0);p1.mana=p1.maxMana;
    if(!p1.weapon)p1.weapon=baseWeapon();
    const pool=host?.enemies||[];
    let enemy=pool.find(row=>row&&row.alive!==false)||pool.find(Boolean)||null;
    if(!enemy)return{ok:false,enemies:pool.length};
    enemy.alive=true;enemy.hp=1;enemy.maxHp=Math.max(1,Number(enemy.maxHp)||1);enemy.attackCooldown=5000;
    const dirs=[{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
    const step=dirs.find(dir=>{try{return W.walkable(world,p1.x+dir.x,p1.y+dir.y)}catch(_){return true}})||dirs[0];
    enemy.x=p1.x+step.x;enemy.y=p1.y+step.y;enemy.rx=enemy.x;enemy.ry=enemy.y;p1.dir=step;
    return{ok:true,enemies:pool.length,id:String(enemy.id||enemy.name||"enemy"),x:enemy.x,y:enemy.y};
  });
}

async function holdAttack(page,key,holdMs=520){
  const before=await snapshot(page);
  await page.keyboard.down(key);
  await page.waitForTimeout(140);
  const held=await snapshot(page);
  assert.equal(held.mode,"playing",`${key}: Solo mode must remain playing while attack is physically held`);
  assert.equal(held.active,"true",`${key}: run must remain active while attack is physically held`);
  assert.ok(held.holdCount>=1,`${key}: physical attack hold must remain owned by the canonical hold-liveness layer`);
  assert.equal(held.inputSpace,true,`${key}: supported held attack must normalise to canonical Space input instead of depending on OS key repeat`);
  await page.waitForTimeout(Math.max(0,holdMs-140));
  await page.keyboard.up(key);
  await page.waitForTimeout(120);
  const after=await snapshot(page);
  assert.ok(after.mana<before.mana||after.projectileSteps>before.projectileSteps,`${key}: real firing command must advance the projectile/fire boundary`);
  assert.equal(after.mode,"playing",`${key}: attack cycle must not strand gameplay in another mode`);
  assert.equal(after.active,"true",`${key}: attack cycle must not deactivate the run`);
  assert.equal(after.lifecycleOwner,true,`${key}: #2118 projectile lifecycle must remain authoritative`);
  assert.equal(after.updateSealed,true,`${key}: authoritative update controller seal must remain active`);
  assert.equal(after.r20AttackErrors,before.r20AttackErrors,`${key}: attack cycle must not add swallowed direct-fire errors`);
  assert.equal(after.r29UpdateFaults,before.r29UpdateFaults,`${key}: attack cycle must not add recoverable update faults`);
  assert.equal(after.r29RenderFaults,before.r29RenderFaults,`${key}: attack cycle must not add recoverable render faults`);
  assert.ok(after.bullets<80,`${key}: player projectile collection must stay bounded (got ${after.bullets})`);
  assert.ok(after.enemyBullets<160,`${key}: enemy projectile collection must stay bounded (got ${after.enemyBullets})`);
  assert.ok(after.particles<=900,`${key}: particle collection must retain its runtime cap (got ${after.particles})`);
  return{before,held,after};
}

try{
  const context=await browser.newContext({viewport:{width:1440,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(60000);
  const errors=[],consoleErrors=[],failedScripts=[],v142Requests=[];
  page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  page.on("console",msg=>{if(msg.type()==="error")consoleErrors.push(msg.text())});
  page.on("request",request=>{try{const url=new URL(request.url());if(/\/arcade\/lost-sizzler\/js\/v10-42-/.test(url.pathname))v142Requests.push(`${url.pathname}${url.search}`)}catch(_){}});
  page.on("requestfailed",request=>{try{const url=new URL(request.url());if(url.origin===origin&&/\.js$/i.test(url.pathname))failedScripts.push(`${url.pathname}: ${request.failure()?.errorText||"failed"}`)}catch(_){}});

  await page.goto(`${origin}/arcade/lost-sizzler/?live-solo-combat-endurance=1`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&window.CCGLostSizzlerV142Bootstrap?.ready===true&&window.CCGLostSizzlerV142ProjectileLifecycle?.ownsBoundary?.()===true&&window.CCGLostSizzlerV142AttackHoldLiveness&&window.CCGLostSizzlerV142R2ControllerOwnerSeal?.gateActive?.()===true,null,{timeout:90000});
  const identity=await page.evaluate(()=>({build:CCGLostSizzlerV142Bootstrap.build,cache:CCGLostSizzlerV142Bootstrap.cache,metaBuild:document.querySelector('meta[name="ccg-lost-sizzler-build"]')?.content,metaCache:document.querySelector('meta[name="ccg-lost-sizzler-cache"]')?.content,ordered:[...document.querySelectorAll('script[data-ccg-v142-ordered="true"]')].map(script=>script.src)}));
  assert.equal(identity.build,"V10.42 r30");assert.equal(identity.cache,"20260917r30");assert.equal(identity.metaBuild,"V10.42 r30");assert.equal(identity.metaCache,"20260917r30");
  assert.ok(identity.ordered.length>=30,"ordered r30 bootstrap must load the complete V10.42 module chain");
  assert.ok(identity.ordered.every(src=>new URL(src).searchParams.get("v")==="20260917r30"),"every ordered V10.42 module must use the r30 cache token");
  assert.ok(v142Requests.some(src=>src.includes("v10-42-projectile-lifecycle.js?v=20260917r30")),"the expected r30 projectile lifecycle asset must actually be requested");

  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&Boolean(p1)&&Boolean(host),null,{timeout:20000});
  const initial=await snapshot(page);
  assert.equal(initial.lifecycleOwner,true,"#2118 projectile lifecycle owner must own current r30 runtime before endurance combat");
  assert.equal(initial.updateSealed,true,"current Solo must run through the sealed authoritative update boundary");
  const firstEnemy=await armRealEnemy(page);assert.equal(firstEnemy.ok,true,`generated Solo floor must provide a real enemy for endurance combat (count ${firstEnemy.enemies})`);

  // Stress real supported Solo input and combat rather than isolated projectile fixtures.
  // Each round uses a generated host enemy and the live damage/death/projectile owners.
  const attackKeys=["Space","f","Numpad0"];
  let previous=initial;
  for(let round=0;round<24;round++){
    const armed=await armRealEnemy(page);assert.equal(armed.ok,true,`round ${round+1}: a real generated enemy must remain available`);
    const key=attackKeys[round%attackKeys.length];
    const result=await holdAttack(page,key,520);
    const movement=round%2===0?"KeyD":"KeyA";
    await page.keyboard.down(movement);await page.waitForTimeout(90);await page.keyboard.up(movement);await page.waitForTimeout(50);
    const current=await snapshot(page);
    assert.ok(current.elapsed>previous.elapsed,`round ${round+1}: simulation elapsed time must continue advancing`);
    assert.ok(current.projectileSteps>previous.projectileSteps,`round ${round+1}: projectile simulation must continue advancing`);
    assert.ok(current.bullets<80&&current.enemyBullets<160,`round ${round+1}: projectile pools must stay bounded`);
    assert.ok(current.r29UpdateFaults===previous.r29UpdateFaults,`round ${round+1}: no repeated recoverable update-error loop is allowed`);
    assert.ok(current.r29RenderFaults===previous.r29RenderFaults,`round ${round+1}: no repeated recoverable render-error loop is allowed`);
    assert.ok(current.r20AttackErrors===previous.r20AttackErrors,`round ${round+1}: no direct attack-owner errors are allowed`);
    previous=current;
    void result;
  }

  // Exercise the retained pause/resume path mid-run, then prove firing and
  // simulation ownership remain alive after lifecycle state has changed.
  await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="paused");
  await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="playing");
  await armRealEnemy(page);await holdAttack(page,"Space",850);
  const final=await snapshot(page);
  assert.ok(final.elapsed>initial.elapsed+8000,`endurance run must accumulate substantial real simulation time (delta ${Math.round(final.elapsed-initial.elapsed)}ms)`);
  assert.ok(final.projectileSteps>initial.projectileSteps+80,`endurance run must execute sustained authoritative projectile work (delta ${final.projectileSteps-initial.projectileSteps})`);
  assert.equal(final.lifecycleOwner,true,"#2118 lifecycle owner must still own the boundary after sustained combat");
  assert.equal(final.updateSealed,true,"update owner seal must still hold after sustained combat");
  assert.equal(final.r29UpdateFaults,initial.r29UpdateFaults,"sustained combat must not enter a recoverable update-exception loop");
  assert.equal(final.r29RenderFaults,initial.r29RenderFaults,"sustained combat must not enter a recoverable render-exception loop");
  assert.equal(final.r20AttackErrors,initial.r20AttackErrors,"sustained combat must not accumulate attack-owner errors");
  assert.ok(final.bullets<80&&final.enemyBullets<160,"projectile lifecycle pools must remain bounded after sustained combat");
  assert.ok(final.particles<=900,"particle collection must remain capped after sustained combat");
  assert.deepEqual(errors,[],`endurance Solo combat must not produce uncaught page errors: ${errors.join("\n")}`);
  assert.deepEqual(failedScripts,[],`endurance Solo combat must not lose runtime scripts: ${failedScripts.join("\n")}`);
  assert.deepEqual(consoleErrors,[],`endurance Solo combat must not produce console errors: ${consoleErrors.join("\n")}`);

  console.log("Dungeon Carnage V10.42 r30 live Solo combat endurance regression passed.");
  console.log(JSON.stringify({initial,final,requests:v142Requests.length}));
  await context.close();
}finally{
  await browser.close();for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(()=>resolve()));
}
