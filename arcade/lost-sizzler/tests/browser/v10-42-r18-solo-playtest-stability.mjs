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

  for(let i=0;i<6;i++){
    await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="paused");
    await page.waitForTimeout(40);
    await page.keyboard.press("KeyP");await page.waitForFunction(()=>mode==="playing");
  }
  const afterPauses=await page.evaluate(()=>{
    fire1=999999;fireBuffer1=999999;
    window.CCGLostSizzlerV142R18SoloPlaytestStability.repairCombatState();
    return{fire1,fireBuffer1,mode,runActive:document.body.dataset.runActive,diag:{...window.CCGLostSizzlerV142R18SoloPlaytestStability.diagnostics}};
  });
  assert.equal(afterPauses.mode,"playing");assert.equal(afterPauses.runActive,"true");
  assert.equal(afterPauses.fire1,0,"stale gun/melee cadence timer must recover after repeated pauses");
  assert.equal(afterPauses.fireBuffer1,0,"stale buffered attack timer must recover after repeated pauses");
  assert.deepEqual(errors,[],`page errors: ${JSON.stringify(errors,null,2)}`);
  console.log("V10.42 r18 live solo stability regression passed");
  await context.close();
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
