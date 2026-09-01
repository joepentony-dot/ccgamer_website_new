import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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

async function stressedFrames(page,count=2,blockMs=145){
  for(let i=0;i<count;i++){
    await page.evaluate(ms=>{const until=performance.now()+ms;while(performance.now()<until){}},blockMs);
    await page.waitForTimeout(45);
  }
}

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  console.log("[r60 Horde] load canonical runtime and start Horde Solo");
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141HordeFramePerformance)&&Boolean(document.getElementById("horde-solo-btn")),null,{timeout:90000});
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R60HordeCombatIntegrity),null,{timeout:15000});
  await page.click("#horde-solo-btn");
  await page.waitForFunction(()=>document.body.dataset.specialMode==="horde-survivor"&&document.body.dataset.hordeSolo==="true"&&mode==="playing"&&Boolean(window.CCGLostSizzlerV141R60HordeCombatIntegrity?.state?.installed)&&Boolean(p1)&&Boolean(host),null,{timeout:30000});

  const fixture=await page.evaluate(()=>{
    const dirs=[{dx:1,dy:0},{dx:-1,dy:0},{dx:0,dy:1},{dx:0,dy:-1}],blocking=host.blockingDecor||[];
    const open=(x,y)=>world?.map?.[y]?.[x]===0&&!blocking.some(row=>row?.x===x&&row?.y===y);
    const ray=dirs.find(d=>[1,2,3,4,5].every(n=>open(Number(p1.x)+d.dx*n,Number(p1.y)+d.dy*n)));
    if(!ray)throw new Error("R60 Horde fixture could not find a five-cell open combat ray");
    const live=window.CCGLostSizzlerSpecialModes.active,runState=live.state,api=window.CCGLostSizzlerV141R60HordeCombatIntegrity;
    runState.state="intermission";runState.boss=null;runState.activeEnemies=[];
    host.enemies=[];bullets.length=0;enemyBullets.length=0;particles.length=0;
    p1.health=10;p1.maxHealth=Math.max(10,Number(p1.maxHealth)||10);p1.invuln=0;p1.hitStunMs=0;
    const model=runState.players?.find(row=>String(row.id)===String(p1.id||net?.sessionId))||runState.players?.[0];
    if(model){model.hp=10;model.maxHp=Math.max(10,Number(model.maxHp)||10);model.status="active";model.invulnerableUntil=0}
    api.resetClock("r60 browser fixture",false);
    return{x:Number(p1.x),y:Number(p1.y),dx:ray.dx,dy:ray.dy,playerId:String(p1.id||net?.sessionId||"P1")}
  });

  console.log("[r60 Horde] low-FPS real elapsed must still advance perimeter enemies");
  const movementBefore=await page.evaluate(({x,y,dx,dy})=>{
    const runState=window.CCGLostSizzlerSpecialModes.active.state,model={id:"r60-mover",kind:"spider",name:"R60 Mover",hp:8,maxHp:8,damage:1,speed:.55,score:1,alive:true,x:x+dx*4,y:y+dy*4};
    runState.activeEnemies=[model];
    host.enemies=[{id:model.id,x:model.x,y:model.y,kind:"spider",hp:8,maxHp:8,alive:true,aiState:"chase",facing:{x:-dx,y:-dy},lastSeen:null,memoryMs:999999,searchMs:0,moveCooldown:90000,attackCooldown:99999,chargeCooldown:99999,healCooldown:99999,flash:0,hpBarMs:0,hordeEnemy:true,hordeModelId:model.id,_v135ArenaSpawned:true,_v138PerimeterManaged:true,_v138ApproachMs:200}];
    const api=window.CCGLostSizzlerV141R60HordeCombatIntegrity;api.resetClock("movement fixture",false);enemyCD=90;projectileCD=70;
    return{x:Number(host.enemies[0].x),y:Number(host.enemies[0].y),liveElapsed:Number(api.state.liveElapsedFrames||0),catchup:Number(api.state.playerTimerCatchupMs||0)}
  },fixture);
  await stressedFrames(page,2,145);
  const movementAfter=await page.evaluate(before=>{
    const enemy=host.enemies.find(row=>row.id==="r60-mover"),api=window.CCGLostSizzlerV141R60HordeCombatIntegrity;
    return{x:Number(enemy?.x),y:Number(enemy?.y),liveElapsed:Number(api.state.liveElapsedFrames||0)-before.liveElapsed,catchup:Number(api.state.playerTimerCatchupMs||0)-before.catchup}
  },movementBefore);
  assert.ok(movementAfter.x!==movementBefore.x||movementAfter.y!==movementBefore.y,`Horde perimeter enemy must continue approaching under ~145 ms rendered frames: ${JSON.stringify({movementBefore,movementAfter})}`);
  assert.ok(movementAfter.liveElapsed>=1,`Horde live controller must receive R60 real elapsed frames: ${JSON.stringify(movementAfter)}`);
  assert.ok(movementAfter.catchup>0,`Horde player/combat timers must pay down elapsed time lost to the shared 45 ms frame clamp: ${JSON.stringify(movementAfter)}`);

  console.log("[r60 Horde] projectiles must keep tile-by-tile collision cadence under low FPS");
  const projectileBefore=await page.evaluate(({x,y,dx,dy,playerId})=>{
    const runState=window.CCGLostSizzlerSpecialModes.active.state,model={id:"r60-shot-target",kind:"spider",name:"R60 Target",hp:10,maxHp:10,damage:1,speed:.55,score:1,alive:true,x:x+dx*4,y:y+dy*4};
    runState.activeEnemies=[model];host.enemies=[{id:model.id,x:model.x,y:model.y,kind:"spider",hp:10,maxHp:10,alive:true,aiState:"chase",facing:{x:-dx,y:-dy},lastSeen:null,memoryMs:999999,searchMs:0,moveCooldown:90000,attackCooldown:99999,chargeCooldown:99999,healCooldown:99999,flash:0,hpBarMs:0,hordeEnemy:true,hordeModelId:model.id,_v135ArenaSpawned:true,_v138PerimeterManaged:true,_v138ApproachMs:999999}];
    bullets.length=0;particles.length=0;bullets.push({x,y,dx,dy,ttl:12,power:3,element:"energy",owner:playerId});
    const api=window.CCGLostSizzlerV141R60HordeCombatIntegrity;api.resetClock("projectile fixture",false);projectileCD=70;enemyCD=90;
    return{hp:Number(host.enemies[0].hp),steps:Number(api.state.projectileSteps||0),catchup:Number(api.state.projectileCatchupSteps||0)}
  },fixture);
  await stressedFrames(page,2,145);
  await page.waitForFunction(()=>Number(host?.enemies?.find?.(row=>row.id==="r60-shot-target")?.hp||0)<10,null,{timeout:3000});
  const projectileAfter=await page.evaluate(before=>{
    const enemy=host.enemies.find(row=>row.id==="r60-shot-target"),api=window.CCGLostSizzlerV141R60HordeCombatIntegrity;
    return{hp:Number(enemy?.hp||0),alive:Boolean(enemy?.alive),steps:Number(api.state.projectileSteps||0)-before.steps,catchup:Number(api.state.projectileCatchupSteps||0)-before.catchup,bullets:bullets.length}
  },projectileBefore);
  assert.ok(projectileAfter.hp<projectileBefore.hp,`a Horde bullet four cells away must actually damage its target despite repeated 145 ms main-thread stalls: ${JSON.stringify(projectileAfter)}`);
  assert.ok(projectileAfter.steps>=4,`R60 must preserve enough 70 ms tile steps to reach the four-cell target: ${JSON.stringify(projectileAfter)}`);
  assert.ok(projectileAfter.catchup>=1,`at least one rendered frame must perform multiple bounded projectile substeps under low FPS: ${JSON.stringify(projectileAfter)}`);

  console.log("[r60 Horde] enemy attack cooldowns must continue in wall-clock time under low FPS");
  const attackBefore=await page.evaluate(({x,y,dx,dy})=>{
    const runState=window.CCGLostSizzlerSpecialModes.active.state,model={id:"r60-attacker",kind:"spider",name:"R60 Attacker",hp:10,maxHp:10,damage:1,speed:.55,score:1,alive:true,x:x+dx,y:y+dy};
    runState.activeEnemies=[model];host.enemies=[{id:model.id,x:model.x,y:model.y,kind:"spider",hp:10,maxHp:10,alive:true,aiState:"chase",facing:{x:-dx,y:-dy},lastSeen:{x,y},memoryMs:999999,searchMs:0,moveCooldown:90000,attackCooldown:270,chargeCooldown:99999,healCooldown:99999,flash:0,hpBarMs:0,hordeEnemy:true,hordeModelId:model.id,_v135ArenaSpawned:true,_v138PerimeterManaged:true,_v138ApproachMs:999999}];
    p1.health=10;p1.invuln=0;p1.hitStunMs=0;const playerModel=runState.players?.find(row=>String(row.id)===String(p1.id||net?.sessionId))||runState.players?.[0];if(playerModel){playerModel.hp=10;playerModel.maxHp=Math.max(10,Number(playerModel.maxHp)||10);playerModel.status="active";playerModel.invulnerableUntil=0}
    bullets.length=0;const api=window.CCGLostSizzlerV141R60HordeCombatIntegrity;api.resetClock("enemy attack fixture",false);enemyCD=90;projectileCD=70;
    return{physical:Number(p1.health),model:Number(playerModel?.hp||p1.health),steps:Number(api.state.enemySteps||0),catchup:Number(api.state.enemyCatchupSteps||0)}
  },fixture);
  await stressedFrames(page,3,145);
  await page.waitForFunction(()=>{const runState=window.CCGLostSizzlerSpecialModes?.active?.state,model=runState?.players?.find?.(row=>String(row.id)===String(p1?.id||net?.sessionId))||runState?.players?.[0];return Number(model?.hp??p1?.health??10)<10},null,{timeout:4000});
  const attackAfter=await page.evaluate(before=>{
    const runState=window.CCGLostSizzlerSpecialModes.active.state,playerModel=runState.players?.find(row=>String(row.id)===String(p1.id||net?.sessionId))||runState.players?.[0],api=window.CCGLostSizzlerV141R60HordeCombatIntegrity;
    return{physical:Number(p1.health),model:Number(playerModel?.hp||p1.health),steps:Number(api.state.enemySteps||0)-before.steps,catchup:Number(api.state.enemyCatchupSteps||0)-before.catchup,attackCooldown:Number(host.enemies.find(row=>row.id==="r60-attacker")?.attackCooldown||0)}
  },attackBefore);
  assert.ok(attackAfter.model<attackBefore.model||attackAfter.physical<attackBefore.physical,`adjacent Horde enemy must land an attack while rendered frames are heavily delayed: ${JSON.stringify(attackAfter)}`);
  assert.ok(attackAfter.enemySteps===undefined||attackAfter.steps>=3,`enemy thinking must keep advancing under low FPS: ${JSON.stringify(attackAfter)}`);
  assert.ok(attackAfter.catchup>=1,`at least one low-FPS frame must perform bounded enemy-AI catch-up: ${JSON.stringify(attackAfter)}`);

  console.log("[r60 Horde] paused wall-clock time must never become Horde combat catch-up");
  await page.evaluate(()=>{host.enemies=[];bullets.length=0});
  const pauseBefore=await page.evaluate(()=>{const api=window.CCGLostSizzlerV141R60HordeCombatIntegrity;return{discarded:Number(api.state.pauseGapsDiscarded||0),projectiles:Number(api.state.projectileSteps||0),enemies:Number(api.state.enemySteps||0)}});
  await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="paused");
  await page.evaluate(()=>{const until=performance.now()+650;while(performance.now()<until){}});await page.waitForTimeout(80);
  await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="playing");await page.waitForTimeout(120);
  const pauseAfter=await page.evaluate(before=>{const api=window.CCGLostSizzlerV141R60HordeCombatIntegrity;return{discarded:Number(api.state.pauseGapsDiscarded||0)-before.discarded,projectiles:Number(api.state.projectileSteps||0)-before.projectiles,enemies:Number(api.state.enemySteps||0)-before.enemies,mode:String(mode),lastError:String(api.state.lastError||"")}},pauseBefore);
  assert.ok(pauseAfter.discarded>=1,`R60 must explicitly discard at least one R59 pause boundary: ${JSON.stringify(pauseAfter)}`);
  assert.ok(pauseAfter.projectiles<=2&&pauseAfter.enemies<=2,`a 650 ms pause must not burst through accumulated projectile/enemy simulation on resume: ${JSON.stringify(pauseAfter)}`);
  assert.equal(pauseAfter.mode,"playing");assert.equal(pauseAfter.lastError,"",`R60 must not record combat timing faults: ${JSON.stringify(pauseAfter)}`);

  assert.deepEqual(errors,[],`R60 Horde combat-integrity browser regression produced page errors: ${errors.join("\n")}`);
  const final=await page.evaluate(()=>({...window.CCGLostSizzlerV141R60HordeCombatIntegrity.state}));
  console.log(`R60 Horde low-FPS combat passed: projectile steps=${final.projectileSteps}, projectile catch-up=${final.projectileCatchupSteps}, enemy steps=${final.enemySteps}, enemy catch-up=${final.enemyCatchupSteps}.`);
  await context.close();
}finally{
  await browser.close().catch(()=>{});for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));
}