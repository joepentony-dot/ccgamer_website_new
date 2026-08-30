import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const mime={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".mjs":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".ogg":"audio/ogg",".mp3":"audio/mpeg"};
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
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R42SoloLiveRecovery)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&Boolean(run)&&Boolean(p1)&&Boolean(world)&&Boolean(host),null,{timeout:20000});
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R42SoloLiveRecovery?.standardSoloPlaying?.()===true,null,{timeout:10000});

  const ownership=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R42SoloLiveRecovery;api.monitor();
    const normal=api.standardSoloRun();
    const dailyBefore=run.daily;run.daily=true;const weeklyExcluded=!api.standardSoloRun();run.daily=dailyBefore;
    document.body.dataset.tutorialActive="true";const tutorialExcluded=!api.standardSoloRun();delete document.body.dataset.tutorialActive;
    return{normal,weeklyExcluded,tutorialExcluded,renderInstalled:api.state.renderInstalled,transitionInstalled:api.state.transitionInstalled,controller:window.CCGLostSizzlerModeRuntime?.detect?.()||""}
  });
  assert.equal(ownership.normal,true,"r42 must own a normal active Solo Dungeon run");
  assert.equal(ownership.weeklyExcluded,true,"r42 must refuse Weekly Vault ownership");
  assert.equal(ownership.tutorialExcluded,true,"r42 must refuse Tutorial ownership");
  assert.equal(ownership.renderInstalled,true,"Solo render watchdog must install after a Solo run begins");
  assert.equal(ownership.transitionInstalled,true,"Solo floor-transition guard must install after a Solo run begins");
  assert.equal(ownership.controller,"dungeon-solo","browser regression must execute under the Solo Dungeon controller");

  // Exercise the real Floor 1 completion/descent path rather than mutating the
  // floor number. The existing Floor 2 checkpoint prompt is intentionally left
  // intact and is dismissed only after the transition recovery has run.
  await page.evaluate(()=>floorComplete("R42 REGRESSION"));
  await page.waitForSelector("#floor-complete:not(.hidden)");
  await page.click("#descend-btn");
  await page.waitForFunction(()=>run?.floor===2&&Boolean(world)&&Boolean(host)&&Boolean(p1),null,{timeout:15000});
  await page.waitForTimeout(260);
  if(await page.locator("#save-panel").isVisible())await page.click("#save-continue-btn");
  await page.waitForFunction(()=>mode==="playing"&&document.getElementById("save-panel")?.classList.contains("hidden")===true,null,{timeout:10000});
  const transition=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R42SoloLiveRecovery;api.monitor();
    return{floor:run.floor,mode,active:document.body.dataset.runActive,world:Boolean(world),host:Boolean(host),player:Boolean(p1),recoveries:api.state.transitionRecoveries,lastFloor:api.state.lastTransitionFloor,width:canvas.width,height:canvas.height}
  });
  assert.equal(transition.floor,2,"real Solo descent must reach Floor 2");
  assert.equal(transition.mode,"playing","Floor 2 must return to live gameplay after the checkpoint prompt is dismissed");
  assert.equal(transition.active,"true","Floor 2 must keep the run active");
  assert.equal(transition.world,true,"Floor 2 must own a generated world");
  assert.equal(transition.host,true,"Floor 2 must own a host simulation");
  assert.equal(transition.player,true,"Floor 2 must retain the Solo player");
  assert.ok(transition.recoveries>=1,"r42 must run a post-descent live-state recovery");
  assert.equal(transition.lastFloor,2,"r42 must record the recovered floor");
  assert.ok(transition.width>0&&transition.height>0,"Floor 2 canvas must retain a valid backing size");

  // Capture a known lit frame, paint a silent black frame without throwing an
  // exception, then force two watchdog probes synchronously. The second probe
  // must restore the last-good frame; this is the failure shape the generic
  // exception guard cannot catch.
  const blackRecovery=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R42SoloLiveRecovery;
    if(typeof render==="function")render();
    const litBefore=(()=>{const probe=document.createElement("canvas");probe.width=20;probe.height=12;const pc=probe.getContext("2d",{willReadFrequently:true});pc.drawImage(canvas,0,0,canvas.width,canvas.height,0,0,20,12);const d=pc.getImageData(0,0,20,12).data;let lit=0;for(let i=0;i<d.length;i+=4)if(d[i]>16||d[i+1]>16||d[i+2]>16)lit++;return lit})();
    api.captureGoodFrame();const before=api.state.blackRecoveries;
    ctx.save();ctx.fillStyle="#000";ctx.fillRect(0,0,canvas.width,canvas.height);ctx.restore();
    const first=api.inspectCanvas(true),second=api.inspectCanvas(true);
    const litAfter=(()=>{const probe=document.createElement("canvas");probe.width=20;probe.height=12;const pc=probe.getContext("2d",{willReadFrequently:true});pc.drawImage(canvas,0,0,canvas.width,canvas.height,0,0,20,12);const d=pc.getImageData(0,0,20,12).data;let lit=0;for(let i=0;i<d.length;i+=4)if(d[i]>16||d[i+1]>16||d[i+2]>16)lit++;return lit})();
    return{litBefore,litAfter,firstBlack:first.black,secondBlack:second.black,recovered:second.recovered,recoveryDelta:api.state.blackRecoveries-before,lastGood:api.state.lastGoodReady}
  });
  assert.ok(blackRecovery.litBefore>=5,"Floor 2 regression fixture must begin from a visibly rendered frame");
  assert.equal(blackRecovery.firstBlack,true,"first forced black probe must detect the silent black frame");
  assert.equal(blackRecovery.secondBlack,true,"second forced black probe must confirm the silent black frame");
  assert.equal(blackRecovery.recovered,true,"two consecutive black probes must restore the last-good Solo frame");
  assert.ok(blackRecovery.recoveryDelta>=1,"black recovery counter must advance");
  assert.ok(blackRecovery.litAfter>=5,"restored Solo frame must contain visible gameplay pixels");
  assert.equal(blackRecovery.lastGood,true,"watchdog must retain a valid last-good frame");
  await page.waitForFunction(()=>mode==="playing"&&window.CCGLostSizzlerV141R42SoloLiveRecovery?.state?.renderRecoveryQueued===false,null,{timeout:10000});
  await page.waitForTimeout(120);

  // Confirm ordinary keyboard input reaches the real firearm path after descent
  // and black-frame recovery. The deterministic Pulse Blaster fixture avoids a
  // random Floor 2 sword/melee loadout making ammunition an invalid assertion.
  const attackBefore=await page.evaluate(()=>{
    p1.mana=50;p1.health=Math.max(3,Number(p1.maxHealth)||3);p1.hitStunMs=0;
    if("controlLocked" in p1)p1.controlLocked=false;if("controlsLocked" in p1)p1.controlsLocked=false;
    p1.firearmUnlocked=true;p1.weapon={id:"pulse",name:"Pulse Blaster",displayName:"Pulse Blaster",element:"energy",power:1,delay:1,shots:1,ammo:1};
    fire1=0;fireBuffer1=0;bullets.length=0;for(const enemy of host.enemies||[]){enemy.alive=false;enemy.active=false}
    try{canvas.focus({preventScroll:true})}catch(_){}
    return{mana:Number(p1.mana),bullets:bullets.length}
  });
  await page.keyboard.press("Space");
  await page.waitForFunction(before=>Number(p1?.mana)<before.mana||bullets.length>before.bullets,attackBefore,{timeout:10000});
  const attack=await page.evaluate(()=>({mana:Number(p1.mana),bullets:bullets.length,mode,fire:Number(fire1),intents:window.CCGLostSizzlerV141R42SoloLiveRecovery.state.attackIntents}));
  assert.ok(attack.mana<attackBefore.mana,"real Space input must consume ammunition through the firearm path after Floor 2 recovery");
  assert.ok(attack.bullets>attackBefore.bullets||attack.fire>0,"real Space input must create a live shot/cooldown state");
  assert.equal(attack.mode,"playing","successful post-transition attack must remain in live play");
  assert.ok(attack.intents>=1,"r42 must observe real attack intent without synthesizing the shot");

  // Exercise the stale-state repair directly: timers/locks that have stopped
  // changing for longer than the safety window are released, while ammunition
  // is untouched.
  const staleRepair=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R42SoloLiveRecovery,now=performance.now();
    p1.mana=25;p1.health=Math.max(3,Number(p1.maxHealth)||3);p1.hitStunMs=300;p1.controlLocked=true;fire1=200;
    api.state.lastAttackIntentAt=now;api.state.fireObserved=200;api.state.fireStallSince=now-2200;api.state.stunObserved=300;api.state.stunStallSince=now-2200;api.state.controlLockSince=now-2200;
    const beforeMana=p1.mana,repaired=api.repairCombatLiveness();
    return{repaired,fire:Number(fire1),stun:Number(p1.hitStunMs),locked:Boolean(p1.controlLocked||p1.controlsLocked),beforeMana,afterMana:Number(p1.mana),repairs:api.state.combatRepairs}
  });
  assert.equal(staleRepair.repaired,true,"stalled active Solo combat state must be recoverable after observed attack intent");
  assert.equal(staleRepair.fire,0,"stalled fire cooldown must be released");
  assert.equal(staleRepair.stun,0,"stalled hit-stun must be released");
  assert.equal(staleRepair.locked,false,"stalled control lock must be released");
  assert.equal(staleRepair.afterMana,staleRepair.beforeMana,"combat liveness repair must never grant ammunition");
  assert.ok(staleRepair.repairs>=1,"combat repair diagnostics must record the repair");

  const orphan=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R42SoloLiveRecovery;document.getElementById("pause")?.classList.add("hidden");mode="paused";const before=api.state.orphanModeRepairs;api.noteAttackIntent();return{mode,delta:api.state.orphanModeRepairs-before}
  });
  assert.equal(orphan.mode,"playing","attack intent must recover an orphaned paused mode when no blocking panel is visible");
  assert.ok(orphan.delta>=1,"orphan-mode recovery must be recorded");

  await page.waitForTimeout(300);
  assert.deepEqual(errors,[],`r42 Solo floor/render/combat regression must not produce page errors: ${errors.join("\n")}`);
  console.log("V10.41 r42 Solo Floor 1→2, black-frame and combat-liveness browser regression passed.");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
