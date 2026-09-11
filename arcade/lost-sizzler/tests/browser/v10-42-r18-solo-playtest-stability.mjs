import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json; charset=utf-8",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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

try{
  const context=await browser.newContext({viewport:{width:1600,height:1000}}),page=await context.newPage();
  page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV142R18SoloPlaytestStability),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&mode==="playing"&&playMode==="solo"&&Boolean(p1)&&Boolean(host),null,{timeout:30000});

  const combat=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV142R18SoloPlaytestStability;
    p1.invuln=999999;
    const enemy=(host.enemies||[]).find(row=>row?.alive)||null;
    if(enemy){enemy.attackCooldown=999999;enemy.chargeCooldown=999999;enemy.chargeTelegraphMs=999999}
    api.repairCombatState();
    return{invuln:p1.invuln,enemy:enemy?{attack:enemy.attackCooldown,charge:enemy.chargeCooldown,telegraph:enemy.chargeTelegraphMs}:null,diag:{...api.diagnostics}};
  });
  assert.equal(combat.invuln,0,`stale player invulnerability must be released during active solo play: ${JSON.stringify(combat)}`);
  if(combat.enemy){assert.equal(combat.enemy.attack,0);assert.equal(combat.enemy.charge,0);assert.equal(combat.enemy.telegraph,0)}
  assert.ok(combat.diag.staleInvulnerabilityRepairs>=1,"repair must be recorded");

  const hud=await page.evaluate(()=>{
    host.v142WardenDomain={...(host.v142WardenDomain||{}),active:true,cleansed:false,profileName:"TEST DOMAIN"};
    sync();
    const first={effects:document.getElementById("quick-specials")?.textContent||"",warden:document.getElementById("quick-warden-status")?.textContent||""};
    sync();sync();
    const second={effects:document.getElementById("quick-specials")?.textContent||"",warden:document.getElementById("quick-warden-status")?.textContent||""};
    return{first,second};
  });
  assert.doesNotMatch(hud.first.effects,/WARDEN/i,"Warden state must not share the transient effects label");
  assert.doesNotMatch(hud.second.effects,/WARDEN/i,"repeated HUD sync must not reintroduce the shared-owner flicker");
  assert.match(hud.first.warden,/WARDEN CORRUPTED \[TEST DOMAIN\]/,"dedicated Warden status must render the corruption state");
  assert.equal(hud.second.warden,hud.first.warden,"dedicated Warden state must stay stable across repeated HUD syncs");

  const audio=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV142R18SoloPlaytestStability,before=api.diagnostics.suppressedSfxRetriggers;
    window.CCGSound.sfx("wall");window.CCGSound.sfx("wall");window.CCGSound.sfx("wall");
    return{before,after:api.diagnostics.suppressedSfxRetriggers};
  });
  assert.ok(audio.after-audio.before>=2,`frame-level repeat SFX must be suppressed instead of stacking: ${JSON.stringify(audio)}`);

  await page.evaluate(()=>{
    host.enemies=[];enemyBullets.length=0;hazards.length=0;bullets.length=0;
    p1.firearmUnlocked=true;p1.weapon=baseWeapon();p1.mana=220;p1.maxMana=Math.max(p1.maxMana,220);
    fire1=0;fireBuffer1=0;projectileCD=0;
  });

  for(let i=0;i<11;i++){
    await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="paused");
    await page.waitForTimeout(25);
    await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="playing");
  }

  await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="paused");
  const keyboardRepairBefore=await page.evaluate(()=>Number(window.CCGLostSizzlerV142R18SoloPlaytestStability.diagnostics.pauseResumeAttackRepairs||0));
  await page.evaluate(()=>{fire1=1200;fireBuffer1=900;projectileCD=600});
  await page.keyboard.press("KeyP");
  await page.waitForFunction(before=>mode==="playing"&&Number(window.CCGLostSizzlerV142R18SoloPlaytestStability.diagnostics.pauseResumeAttackRepairs||0)>before,keyboardRepairBefore,{timeout:4000});

  const beforeAttack=await page.evaluate(()=>({
    mana:p1.mana,
    bullets:bullets.filter(b=>b?.owner===p1.id&&b.ttl>0).length,
    fire1,fireBuffer1,projectileCD,
    diag:{...window.CCGLostSizzlerV142R18SoloPlaytestStability.diagnostics}
  }));
  assert.ok(beforeAttack.diag.pauseResumeAttackRepairs>keyboardRepairBefore,`repeated P-key resume must repair injected finite attack cadence: ${JSON.stringify({keyboardRepairBefore,beforeAttack})}`);

  await page.keyboard.press("Space");
  await page.waitForFunction(before=>p1.mana<before||bullets.filter(b=>b?.owner===p1.id&&b.ttl>0).length>0,beforeAttack.mana,{timeout:4000});
  const afterAttack=await page.evaluate(()=>({mana:p1.mana,bullets:bullets.filter(b=>b?.owner===p1.id&&b.ttl>0).length,mode,runActive:document.body.dataset.runActive}));
  assert.equal(afterAttack.mode,"playing");assert.equal(afterAttack.runActive,"true");
  assert.ok(afterAttack.mana<beforeAttack.mana||afterAttack.bullets>beforeAttack.bullets,`a real Space attack must still fire after repeated pause/resume cycles: before=${JSON.stringify(beforeAttack)} after=${JSON.stringify(afterAttack)}`);

  await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="paused");
  const buttonRepairBefore=await page.evaluate(()=>Number(window.CCGLostSizzlerV142R18SoloPlaytestStability.diagnostics.pauseResumeAttackRepairs||0));
  await page.evaluate(()=>{fire1=850;fireBuffer1=650;projectileCD=400});
  await page.click("#resume-btn");
  await page.waitForFunction(before=>mode==="playing"&&Number(window.CCGLostSizzlerV142R18SoloPlaytestStability.diagnostics.pauseResumeAttackRepairs||0)>before,buttonRepairBefore,{timeout:4000});
  const beforeButtonResumeAttack=await page.evaluate(()=>({mana:p1.mana,diag:{...window.CCGLostSizzlerV142R18SoloPlaytestStability.diagnostics}}));
  assert.ok(beforeButtonResumeAttack.diag.pauseResumeAttackRepairs>buttonRepairBefore,"Continue-button resume must repair the same injected finite attack cadence");
  await page.keyboard.press("Space");
  await page.waitForFunction(before=>p1.mana<before,beforeButtonResumeAttack.mana,{timeout:4000});

  assert.deepEqual(errors,[],`page errors: ${JSON.stringify(errors,null,2)}`);
  console.log("V10.42 r18 live solo stability and repeated pause/resume attack-liveness regression passed");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
