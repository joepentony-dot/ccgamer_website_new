import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import {chromium} from "playwright";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../../..");
const watchdogPath=path.join(repo,"arcade/lost-sizzler/js/v10-41-load-watchdog.js");
const watchdog=fs.readFileSync(watchdogPath,"utf8");

const html=`<!doctype html>
<html>
<head><meta charset="utf-8"><title>Lost Sizzler live-host lock liveness</title></head>
<body>
  <main id="menu">
    <div class="game-mode-buttons">
      <button id="solo-btn">PLAY SOLO</button>
      <button id="tutorial-zone-btn">TUTORIAL</button>
      <button id="create-btn">DUNGEON MULTIPLAYER</button>
      <button id="horde-mode-btn">HORDE MULTIPLAYER</button>
      <button id="saboteurs-mode-btn">SPY VS SPY MULTIPLAYER</button>
      <button id="daily-btn">WEEKLY HIGH-SCORE VAULT</button>
      <button id="split-btn">2P SPLIT SCREEN</button>
    </div>
    <div id="weekly-render-probe"></div>
  </main>
  <script>
    window.__ownerAllowed=true;
    window.CCGLostSizzlerReleaseGate={state:{ready:false,failed:false}};
    window.CCGWeeklyChallenge={
      renders:0,
      render(){
        this.renders++;
        document.getElementById("weekly-render-probe").textContent=String(this.renders);
      }
    };
    window.ccgSupabase={
      getCurrentUserContext(){
        return new Promise(resolve=>setTimeout(()=>resolve(window.__ownerAllowed?{isAuthenticated:true,user:{id:"owner-user"}}:{isAuthenticated:false,user:null}),25));
      },
      async getClient(){
        return {
          from(){
            return {
              select(){
                return {
                  eq(){
                    return {maybeSingle:async()=>({data:{username:"Cheeky Commodore Gamer",role:"admin"},error:null})};
                  }
                };
              }
            };
          }
        };
      }
    };
  </script>
  <script src="/arcade/lost-sizzler/js/v10-41-load-watchdog.js"></script>
</body>
</html>`;

const browser=await chromium.launch({headless:true,args:["--disable-dev-shm-usage","--disable-background-networking"]});

try{
  const context=await browser.newContext(),page=await context.newPage();
  page.setDefaultTimeout(5000);
  const errors=[];page.on("pageerror",error=>errors.push(String(error?.stack||error)));

  await page.route("https://cheekycommodoregamer.co.uk/**",async route=>{
    const pathname=new URL(route.request().url()).pathname;
    if(pathname==="/live-host-lock-test.html"){
      await route.fulfill({status:200,contentType:"text/html; charset=utf-8",body:html});
      return;
    }
    if(pathname==="/arcade/lost-sizzler/js/v10-41-load-watchdog.js"){
      await route.fulfill({status:200,contentType:"text/javascript; charset=utf-8",body:watchdog});
      return;
    }
    await route.fulfill({status:404,contentType:"text/plain",body:"not found"});
  });

  console.log("[live host] owner preview must unlock without observer starvation");
  await page.goto("https://cheekycommodoregamer.co.uk/live-host-lock-test.html",{waitUntil:"domcontentloaded"});
  await page.waitForFunction(()=>window.CCGLostSizzlerLoadWatchdog?.state?.ownerAuthChecked===true&&window.CCGLostSizzlerLoadWatchdog?.state?.ownerAccess===true);
  await page.waitForTimeout(100);
  const owner=await page.evaluate(async()=>{
    let timerFired=false;
    await new Promise(resolve=>setTimeout(()=>{timerFired=true;resolve()},40));
    return {
      timerFired,
      beta:document.body.dataset.publicBeta||"",
      locked:document.body.classList.contains("ccg-public-beta-closed"),
      sash:Boolean(document.getElementById("ccg-beta-ended-sash")),
      soloDisabled:Boolean(document.getElementById("solo-btn")?.disabled),
      renders:Number(window.CCGWeeklyChallenge?.renders||0),
      betaSyncTimer:Number(window.CCGLostSizzlerLoadWatchdog?.state?.betaSyncTimer||0)
    };
  });
  assert.equal(owner.timerFired,true,`live-host owner preview must leave the main thread responsive: ${JSON.stringify(owner)}`);
  assert.equal(owner.beta,"owner-preview",`owner preview must be marked after authenticated access: ${JSON.stringify(owner)}`);
  assert.equal(owner.locked,false,`owner preview must remove the public beta lock class: ${JSON.stringify(owner)}`);
  assert.equal(owner.sash,false,`owner preview must remove the beta-ended sash: ${JSON.stringify(owner)}`);
  assert.equal(owner.soloDisabled,false,`owner preview must restore Play Solo: ${JSON.stringify(owner)}`);
  assert.equal(owner.renders,1,`owner-dependent UI must render once on the locked-to-owner transition, not recursively: ${JSON.stringify(owner)}`);
  assert.equal(owner.betaSyncTimer,0,`owner observer sync must settle instead of perpetually rescheduling: ${JSON.stringify(owner)}`);

  console.log("[live host] public beta lock must remain responsive under watched mutations");
  await page.evaluate(()=>{window.__ownerAllowed=false;window.dispatchEvent(new Event("ccg:auth-changed"))});
  await page.waitForFunction(()=>window.CCGLostSizzlerLoadWatchdog?.state?.ownerAuthChecked===true&&window.CCGLostSizzlerLoadWatchdog?.state?.ownerAccess===false&&document.body.dataset.publicBeta==="ended");
  const locked=await page.evaluate(()=>({
    locked:document.body.classList.contains("ccg-public-beta-closed"),
    sash:Boolean(document.getElementById("ccg-beta-ended-sash")),
    soloDisabled:Boolean(document.getElementById("solo-btn")?.disabled)
  }));
  assert.deepEqual(locked,{locked:true,sash:true,soloDisabled:true},`public live host must stay visibly and functionally locked: ${JSON.stringify(locked)}`);

  await page.evaluate(()=>{
    window.__liveHostProbeTicks=0;
    const timer=setInterval(()=>{
      document.body.classList.toggle("ccg-live-host-probe");
      window.__liveHostProbeTicks++;
      if(window.__liveHostProbeTicks>=20)clearInterval(timer);
    },5);
  });
  await page.waitForFunction(()=>window.__liveHostProbeTicks>=20);
  await page.waitForTimeout(50);
  const publicResponsive=await page.evaluate(async()=>{
    let timerFired=false;
    await new Promise(resolve=>setTimeout(()=>{timerFired=true;resolve()},40));
    return {
      timerFired,
      ticks:Number(window.__liveHostProbeTicks||0),
      betaSyncTimer:Number(window.CCGLostSizzlerLoadWatchdog?.state?.betaSyncTimer||0),
      soloDisabled:Boolean(document.getElementById("solo-btn")?.disabled)
    };
  });
  assert.equal(publicResponsive.timerFired,true,`public beta observer must not starve browser timers: ${JSON.stringify(publicResponsive)}`);
  assert.equal(publicResponsive.ticks,20,`watched live-host mutations must complete normally: ${JSON.stringify(publicResponsive)}`);
  assert.equal(publicResponsive.betaSyncTimer,0,`public beta observer sync must settle after mutations: ${JSON.stringify(publicResponsive)}`);
  assert.equal(publicResponsive.soloDisabled,true,`public lock must remain enforced after mutation stress: ${JSON.stringify(publicResponsive)}`);

  console.log("[live host] owner access must recover again after public lock");
  await page.evaluate(()=>{window.__ownerAllowed=true;window.dispatchEvent(new Event("ccg:auth-changed"))});
  await page.waitForFunction(()=>window.CCGLostSizzlerLoadWatchdog?.state?.ownerAuthChecked===true&&window.CCGLostSizzlerLoadWatchdog?.state?.ownerAccess===true&&document.body.dataset.publicBeta==="owner-preview"&&!document.getElementById("solo-btn")?.disabled);
  await page.waitForTimeout(50);
  const recovered=await page.evaluate(()=>({
    renders:Number(window.CCGWeeklyChallenge?.renders||0),
    locked:document.body.classList.contains("ccg-public-beta-closed"),
    sash:Boolean(document.getElementById("ccg-beta-ended-sash")),
    soloDisabled:Boolean(document.getElementById("solo-btn")?.disabled)
  }));
  assert.deepEqual(recovered,{renders:2,locked:false,sash:false,soloDisabled:false},`owner preview must recover once without recursive renders: ${JSON.stringify(recovered)}`);

  assert.deepEqual(errors,[],`live-host beta-lock regression produced page errors: ${errors.join("\n")}`);
  console.log("Lost Sizzler live-host beta lock and owner-preview liveness regression passed in Chromium.");
  await context.close();
}finally{
  await browser.close().catch(()=>{});
}
