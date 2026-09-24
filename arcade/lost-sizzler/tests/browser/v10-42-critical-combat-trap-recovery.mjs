import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".jpg":"image/jpeg",".mp3":"audio/mpeg"};
const sockets=new Set();
const server=http.createServer((req,res)=>{
  try{
    const pathname=decodeURIComponent(new URL(req.url,"http://local").pathname);
    const relative=pathname.endsWith("/")?`${pathname}index.html`:pathname;
    const file=path.resolve(repo,`.${relative}`);
    if(!file.startsWith(`${repo}${path.sep}`)&&file!==repo){res.writeHead(403).end("forbidden");return}
    fs.readFile(file,(error,data)=>{
      if(error){res.writeHead(404).end("not found");return}
      res.writeHead(200,{"content-type":mime[path.extname(file).toLowerCase()]||"application/octet-stream","cache-control":"no-store"});
      res.end(data);
    });
  }catch(error){res.writeHead(500).end(String(error))}
});
server.on("connection",socket=>{sockets.add(socket);socket.on("close",()=>sockets.delete(socket))});
await new Promise((resolve,reject)=>{server.once("error",reject);server.listen(0,"127.0.0.1",resolve)});
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking","--autoplay-policy=no-user-gesture-required"]});

try{
  const context=await browser.newContext({viewport:{width:1280,height:900}});
  await context.addInitScript(()=>{try{localStorage.setItem("ccg-lost-sizzler-tutorial-seen-v1","true");localStorage.setItem("ccg-lost-sizzler-tutorial-complete-v1","true")}catch(_){}});
  const page=await context.newPage();
  page.setDefaultTimeout(30000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.goto(`${origin}/arcade/lost-sizzler/?critical-combat-trap=1`,{waitUntil:"load"});
  await page.waitForFunction(()=>document.body.dataset.gameReady==="true");
  await page.waitForFunction(()=>document.body.dataset.v142BootstrapReady==="true");
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV142R20LiveRegressionStability&&window.CCGLostSizzlerV141R56PlaytestCompletion));
  await page.locator("#solo-btn").click({noWaitAfter:true});
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&String(mode)==="playing"&&Boolean(p1&&host&&run));

  const attack=await page.evaluate(()=>globalThis.eval(`(()=>{
    p1.firearmUnlocked=false;p1.weapon=null;p1.mana=0;p1.hitStunMs=0;p1.controlLocked=false;p1.controlsLocked=false;
    fire1=0;fireBuffer1=0;input.delete("Space");
    const api=window.CCGLostSizzlerV142R20LiveRegressionStability;
    const before={melee:Number(p1._meleeSwingAt||0),fallbacks:Number(api.diagnostics.deepOwnerFallbacks||0),successes:Number(api.diagnostics.deepOwnerFallbackSuccesses||0)};
    const previous=firePlayer;
    const swallowed=function(){return false};swallowed.__ccgOriginal=previous;
    firePlayer=swallowed;
    let fired=false;
    try{fired=api.attackNow("Space")}finally{firePlayer=previous}
    return{fired,before,after:{melee:Number(p1._meleeSwingAt||0),fallbacks:Number(api.diagnostics.deepOwnerFallbacks||0),successes:Number(api.diagnostics.deepOwnerFallbackSuccesses||0)}};
  })()`));
  assert.equal(attack.fired,true,`deep retained fire owner must recover a swallowed outer attack owner: ${JSON.stringify(attack)}`);
  assert.ok(attack.after.melee>attack.before.melee,"recovered attack must produce a real melee swing");
  assert.ok(attack.after.fallbacks>attack.before.fallbacks&&attack.after.successes>attack.before.successes,"R20 diagnostics must record the retained-owner recovery");

  const hazard=await page.evaluate(()=>globalThis.eval(`(()=>{
    const h=(host?.hazardRooms||[])[0];if(!h||!(h.cells||[]).length)return{available:false};
    const cell=h.cells[0],groups=Math.max(2,Number(h.groups||2)),period=Math.max(1,Number(h.period||2300)),warning=Math.max(0,Number(h.warningMs||700)),phase=Number(h.phase||0);
    const step=Math.max(0,Number(cell.group||0))+groups*12;
    const elapsed=Math.max(0,step*period+warning+40-phase);
    host.floorElapsed=elapsed;run.elapsed=elapsed;
    p1.x=Number(cell.x);p1.y=Number(cell.y);p1.rx=p1.x;p1.ry=p1.y;
    p1.maxHealth=Math.max(8,Number(p1.maxHealth||8));p1.health=8;p1.armor=0;p1.invuln=5000;p1.hitStunMs=0;p1.hazardHitCooldown=0;
    const state=SYS.hazardCellState(h,p1.x,p1.y,host.floorElapsed||run.elapsed);
    const before={health:Number(p1.health),invuln:Number(p1.invuln),active:Boolean(state.active),type:String(h.type||""),title:String(h.title||"")};
    updateDedicatedHazards(16);
    return{available:true,before,after:{health:Number(p1.health),invuln:Number(p1.invuln),cooldown:Number(p1.hazardHitCooldown||0)}};
  })()`));
  assert.equal(hazard.available,true,"generated Solo floor must contain a dedicated hazard room");
  assert.equal(hazard.before.active,true,`fixture must place the player on an ACTIVE dedicated hazard cell: ${JSON.stringify(hazard)}`);
  assert.equal(hazard.after.health,hazard.before.health-1,`active dedicated hazard must remove one health even when stale invulnerability was present: ${JSON.stringify(hazard)}`);
  assert.ok(hazard.after.cooldown>0,"dedicated hazard must retain its normal hit cooldown after confirmed damage");

  assert.deepEqual(errors,[],"critical combat/trap recovery browser contract must not produce page errors");
  console.log("PASS critical combat owner recovery and dedicated hazard damage");
  await context.close();
} finally {
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
  for(const socket of sockets)socket.destroy();
}
