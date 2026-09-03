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

async function waitForFloorEntrySettled(page){
  try{
    await page.waitForFunction(()=>mode==="playing"&&document.getElementById("save-panel")?.classList.contains("hidden")===true,null,{timeout:10000})
  }catch(error){
    const state=await page.evaluate(()=>{
      const r43=window.CCGLostSizzlerV141R43SoloSave?.state||{},r59=window.CCGLostSizzlerV141R59LiveRegressionFixes?.state||{};
      return{
        floor:Number(run?.floor||0),mode:typeof mode==="string"?mode:null,playMode:typeof playMode==="string"?playMode:null,
        runActive:document.body.dataset.runActive||"",savePromptReason:typeof savePromptReason==="string"?savePromptReason:null,
        savePanelVisible:Boolean(UI?.savePanel&&!UI.savePanel.classList.contains("hidden")),
        savedFloor:Number(window.CCGLostSizzlerV141R43SoloSave?.readEnvelope?.()?.summary?.floor||0),
        r43:{autosaves:Number(r43.autosaves||0),lastAutoSaveKey:String(r43.lastAutoSaveKey||""),entryFloorKey:String(r43.entryFloorKey||""),offerOwnerInstalls:Number(r43.offerOwnerInstalls||0),automaticPromptSuppressions:Number(r43.automaticPromptSuppressions||0),floorEntrySettleSchedules:Number(r43.floorEntrySettleSchedules||0),floorEntrySettles:Number(r43.floorEntrySettles||0),lastError:String(r43.lastError||"")},
        r59:{soloFloorAutosaves:Number(r59.soloFloorAutosaves||0),soloSaveTransitionInstalls:Number(r59.soloSaveTransitionInstalls||0),lastError:String(r59.lastError||"")},
        offerOwner:Boolean(window.offerFloorSave?.__ccgV141R43AutoSaveOwner),
        captureOwner:Boolean(window.captureFloorEntryCheckpoint?.__ccgV141R59SoloAutosave)
      }
    });
    console.error("R42_FLOOR_ENTRY_SETTLE_TIMEOUT "+JSON.stringify(state));
    throw error
  }
}

try{
  const context=await browser.newContext({viewport:{width:1600,height:900}}),page=await context.newPage();page.setDefaultTimeout(45000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));
  await page.goto(`${origin}/arcade/lost-sizzler/`,{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&Boolean(window.CCGLostSizzlerV141R42SoloLiveRecovery)&&Boolean(document.getElementById("solo-btn")),null,{timeout:90000});
  await page.click("#solo-btn");
  await page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof mode!=="undefined"&&mode==="playing"&&Boolean(run)&&Boolean(p1)&&Boolean(world)&&Boolean(host),null,{timeout:20000});
  await page.waitForFunction(()=>window.CCGLostSizzlerV141R42SoloLiveRecovery?.standardSoloPlaying?.()===true,null,{timeout:10000});
  // This regression specifically exercises the r43 autosave/prompt handoff.
  // The production loader may publish r43 after r42, while this fixture can
  // complete Floor 1 unrealistically quickly, so wait for that owner before
  // forcing descent instead of accidentally testing late-loader scheduling.
  await page.waitForFunction(()=>Boolean(window.CCGLostSizzlerV141R43SoloSave)&&window.offerFloorSave?.__ccgV141R43AutoSaveOwner===true,null,{timeout:10000});

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
  // floor number. Standard Solo must autosave Floor 2 and deterministically
  // settle any delayed legacy entry prompt after the core's 120 ms timer.
  await page.evaluate(()=>floorComplete("R42 REGRESSION"));
  await page.waitForSelector("#floor-complete:not(.hidden)");
  await page.click("#descend-btn");
  await page.waitForFunction(()=>run?.floor===2&&Boolean(world)&&Boolean(host)&&Boolean(p1),null,{timeout:15000});
  await page.waitForTimeout(420);
  await waitForFloorEntrySettled(page);
  const transition=await page.evaluate(()=>{
    const api=window.CCGLostSizzlerV141R42SoloLiveRecovery,r43=window.CCGLostSizzlerV141R43SoloSave?.state||{};api.monitor();
    return{floor:run.floor,mode,active:document.body.dataset.runActive,world:Boolean(world),host:Boolean(host),player:Boolean(p1),recoveries:api.state.transitionRecoveries,lastFloor:api.state.lastTransitionFloor,width:canvas.width,height:canvas.height,r43SettleSchedules:Number(r43.floorEntrySettleSchedules||0),r43Settles:Number(r43.floorEntrySettles||0),r43PromptSuppressions:Number(r43.automaticPromptSuppressions||0),savedFloor:Number(window.CCGLostSizzlerV141R43SoloSave?.readEnvelope?.()?.summary?.floor||0)}
  });
  assert.equal(transition.floor,2,"real Solo descent must reach Floor 2");
  assert.equal(transition.mode,"playing","Floor 2 must return to live gameplay after autosave prompt settling");
  assert.equal(transition.active,"true","Floor 2 must keep the run active");
  assert.equal(transition.world,true,"Floor 2 must own a generated world");
  assert.equal(transition.host,true,"Floor 2 must own a host simulation");
  assert.equal(transition.player,true,"Floor 2 must retain the Solo player");
  assert.ok(transition.recoveries>=1,"r42 must run a post-descent live-state recovery");
  assert.equal(transition.lastFloor,2,"r42 must record the recovered floor");
  assert.ok(transition.width>0&&transition.height>0,"Floor 2 canvas must retain a valid backing size");
  assert.equal(transition.savedFloor,2,"Floor 2 entry autosave must exist before live gameplay continues");
  assert.ok(transition.r43SettleSchedules>=1&&transition.r43Settles>=1,"real Floor 2 descent must execute the deterministic r43 post-timer settle path");

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
  // Record the live projectile/cooldown synchronously at spawn time because both
  // are intentionally transient and can expire before Playwright's next poll on
  // a busy CI runner.
  const attackBefore=await page.evaluate(()=>{
    p1.mana=50;p1.health=Math.max(3,Number(p1.maxHealth)||3);p1.hitStunMs=0;
    if("controlLocked" in p1)p1.controlLocked=false;if("controlsLocked" in p1)p1.controlsLocked=false;
    p1.firearmUnlocked=true;p1.weapon={id:"pulse",name:"Pulse Blaster",displayName:"Pulse Blaster",element:"energy",power:1,delay:1,shots:1,ammo:1};
    fire1=0;fireBuffer1=0;bullets.length=0;for(const enemy of host.enemies||[]){enemy.alive=false;enemy.active=false}
    const originalSpawn=window.spawnBullet;
    window.__ccgR42AttackProbe={shots:0,fireMax:0,bulletMax:0,originalSpawn};
    window.spawnBullet=function(){
      const result=originalSpawn.apply(this,arguments),probe=window.__ccgR42AttackProbe;
      probe.shots++;probe.fireMax=Math.max(probe.fireMax,Number(fire1||0));probe.bulletMax=Math.max(probe.bulletMax,Number(bullets.length||0));
      return result
    };
    try{canvas.focus({preventScroll:true})}catch(_){}
    return{mana:Number(p1.mana),bullets:bullets.length}
  });
  await page.keyboard.press("Space");
  await page.waitForFunction(before=>Number(p1?.mana)<before.mana&&Number(window.__ccgR42AttackProbe?.shots||0)>0,attackBefore,{timeout:10000});
  const attack=await page.evaluate(()=>{
    const probe=window.__ccgR42AttackProbe||{},originalSpawn=probe.originalSpawn;
    const result={mana:Number(p1.mana),bullets:bullets.length,mode,fire:Number(fire1),intents:window.CCGLostSizzlerV141R42SoloLiveRecovery.state.attackIntents,shots:Number(probe.shots||0),fireObserved:Number(probe.fireMax||0),bulletObserved:Number(probe.bulletMax||0)};
    if(typeof originalSpawn==="function")window.spawnBullet=originalSpawn;delete window.__ccgR42AttackProbe;return result
  });
  assert.ok(attack.mana<attackBefore.mana,"real Space input must consume ammunition through the firearm path after Floor 2 recovery");
  assert.ok(attack.shots>=1&&attack.fireObserved>0&&attack.bulletObserved>attackBefore.bullets,`real Space input must create a live projectile/cooldown state: ${JSON.stringify(attack)}`);
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
  console.log("V10.41 r42 Solo Floor 1→2, autosave settle, black-frame and combat-liveness browser regression passed.");
}finally{
  await browser.close();
  for(const socket of sockets)socket.destroy();
  await new Promise(resolve=>server.close(resolve));
}
