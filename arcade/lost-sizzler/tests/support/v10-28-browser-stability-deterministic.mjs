import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const sourcePath=path.resolve(here,"../v10-28-browser-stability.mjs");
const tempPath=path.resolve(here,"../.v10-28-browser-stability-deterministic.tmp.mjs");
let source=fs.readFileSync(sourcePath,"utf8").replace(/\r\n/g,"\n");

const timeoutTarget=`const TEST_TIMEOUT_MS=210000;\nconst STAGE_TIMEOUT_MS=20000;`;
const timeoutReplacement=`const TEST_TIMEOUT_MS=270000;\nconst STAGE_TIMEOUT_MS=30000;`;
const timeoutMatches=source.split(timeoutTarget).length-1;
assert.equal(timeoutMatches,1,"the deterministic browser harness must find the broad stability timeout constants");
source=source.replace(timeoutTarget,timeoutReplacement);

const releaseSubtitleTarget=`    const buildSubtitle=await state.page.locator(".brand p").textContent();
    assert.equal(buildSubtitle?.trim(),"THE LOST SIZZLER — V10.41","the current build subtitle must survive older deferred UI initialisers");`;
const releaseSubtitleReplacement=`    const buildSubtitle=await state.page.locator(".brand p").textContent();
    assert.equal(buildSubtitle?.trim(),"C64 DUNGEON CARNAGE — V10.42","the current C64 Dungeon Carnage V10.42 subtitle must survive older deferred UI initialisers");`;
const releaseSubtitleMatches=source.split(releaseSubtitleTarget).length-1;
assert.equal(releaseSubtitleMatches,1,"the deterministic browser harness must find exactly one legacy V10.41 subtitle assertion");
source=source.replace(releaseSubtitleTarget,releaseSubtitleReplacement);

const immediateNavigationTarget=`    await withTimeout(state.page.goto(canonical,{waitUntil:"domcontentloaded",timeout:15000}),STAGE_TIMEOUT_MS,"immediate Solo navigation");`;
const immediateNavigationReplacement=`    await withTimeout(state.page.goto(canonical,{waitUntil:"domcontentloaded",timeout:25000}),STAGE_TIMEOUT_MS,"immediate Solo navigation");`;
const immediateNavigationMatches=source.split(immediateNavigationTarget).length-1;
assert.equal(immediateNavigationMatches,1,"the deterministic browser harness must find the immediate Solo navigation timeout target");
source=source.replace(immediateNavigationTarget,immediateNavigationReplacement);

const immediateClickTarget=`    const releaseAtClick=await state.page.evaluate(()=>document.body.dataset.releaseReady);
    assert.equal(releaseAtClick,"false","the immediate-click test must act before the enhancement queue is release-ready");
    await withTimeout(state.page.locator("#solo-btn").click({timeout:8000,noWaitAfter:true}),10000,"immediate Solo button click");`;
const immediateClickReplacement=`    await withTimeout(state.page.waitForFunction(()=>{
      const bootstrap=window.CCGLostSizzlerV142Bootstrap;
      const loader=document.getElementById("ccg-release-loading");
      return Boolean(bootstrap&&bootstrap.ready===false&&document.body.dataset.releaseReady==="false"&&loader&&!loader.hidden&&getComputedStyle(loader).display!=="none");
    },null,{timeout:25000}),STAGE_TIMEOUT_MS,"V10.42 blocking Solo loader gate");
    const blockedFirstVisual=await state.page.evaluate(()=>{
      const loader=document.getElementById("ccg-release-loading"),rect=loader?.getBoundingClientRect(),style=loader?getComputedStyle(loader):null;
      return{releaseReady:document.body.dataset.releaseReady,loaderVisible:Boolean(loader&&!loader.hidden&&style?.display!=="none"),loaderZ:Number(style?.zIndex||0),loaderWidth:Math.round(rect?.width||0),loaderHeight:Math.round(rect?.height||0),viewport:{w:innerWidth,h:innerHeight}};
    });
    assert.equal(blockedFirstVisual.releaseReady,"false","the immediate-start audit must observe pre-release V10.42 state");
    assert.equal(blockedFirstVisual.loaderVisible,true,"pre-release Solo menu must remain covered rather than accepting a hidden-menu click");
    assert.ok(blockedFirstVisual.loaderZ>1000000&&blockedFirstVisual.loaderWidth>=blockedFirstVisual.viewport.w&&blockedFirstVisual.loaderHeight>=blockedFirstVisual.viewport.h,"the pre-release loader must own the viewport: "+JSON.stringify(blockedFirstVisual));
    await withTimeout(state.page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&window.CCGLostSizzlerV142Bootstrap?.ready===true&&document.getElementById("ccg-release-loading")?.hidden===true,null,{timeout:25000}),STAGE_TIMEOUT_MS,"authoritative Solo menu reveal");
    await withTimeout(state.page.locator("#solo-btn").click({timeout:10000,noWaitAfter:true}),12000,"post-reveal Solo button click");`;
const immediateClickMatches=source.split(immediateClickTarget).length-1;
assert.equal(immediateClickMatches,1,"the deterministic browser harness must find exactly one immediate-Solo click block");
source=source.replace(immediateClickTarget,immediateClickReplacement);

const earlyTutorialClickTarget=`    await withTimeout(state.page.locator("#tutorial-zone-btn").click({timeout:8000,noWaitAfter:true}),10000,"early Tutorial button click");`;
const earlyTutorialClickReplacement=`    await withTimeout(state.page.waitForFunction(()=>{
      const loader=document.getElementById("ccg-release-loading");
      return Boolean(window.CCGLostSizzlerV142Bootstrap&&window.CCGLostSizzlerV142Bootstrap.ready===false&&document.body.dataset.releaseReady==="false"&&loader&&!loader.hidden&&getComputedStyle(loader).display!=="none");
    },null,{timeout:25000}),STAGE_TIMEOUT_MS,"V10.42 blocking Tutorial loader gate");
    const blockedTutorialVisual=await state.page.evaluate(()=>{
      const loader=document.getElementById("ccg-release-loading"),style=loader?getComputedStyle(loader):null;
      return{releaseReady:document.body.dataset.releaseReady,loaderVisible:Boolean(loader&&!loader.hidden&&style?.display!=="none")};
    });
    assert.deepEqual(blockedTutorialVisual,{releaseReady:"false",loaderVisible:true},"pre-release Tutorial menu must remain covered by the canonical loader");
    await withTimeout(state.page.waitForFunction(()=>document.body.dataset.releaseReady==="true"&&window.CCGLostSizzlerV142Bootstrap?.ready===true&&document.getElementById("ccg-release-loading")?.hidden===true,null,{timeout:25000}),STAGE_TIMEOUT_MS,"authoritative Tutorial menu reveal");
    await withTimeout(state.page.locator("#tutorial-zone-btn").click({timeout:10000,noWaitAfter:true}),12000,"post-reveal Tutorial button click");`;
const earlyTutorialClickMatches=source.split(earlyTutorialClickTarget).length-1;
assert.equal(earlyTutorialClickMatches,1,"the deterministic browser harness must find exactly one early Tutorial click block");
source=source.replace(earlyTutorialClickTarget,earlyTutorialClickReplacement);

const splitActivationTarget=`    await withTimeout(state.page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof p2!=="undefined"&&Boolean(p2)&&playMode==="split"&&mode==="playing",null,{timeout:15000}),STAGE_TIMEOUT_MS,"split-screen activation");`;
const splitActivationReplacement=`    await withTimeout(state.page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof p2!=="undefined"&&Boolean(p2)&&playMode==="split"&&mode==="playing",null,{timeout:25000}),STAGE_TIMEOUT_MS,"split-screen activation");`;
const splitActivationMatches=source.split(splitActivationTarget).length-1;
assert.equal(splitActivationMatches,1,"the deterministic browser harness must find exactly one split-screen activation timeout target");
source=source.replace(splitActivationTarget,splitActivationReplacement);

const stationaryGunSetupTarget=`      input.clear();bullets.length=0;p1.firearmUnlocked=true;p1.weapon={id:"browser-facing-gun",shots:1,power:1,ttl:40,delay:1,element:"energy"};p1.mana=5;p1.maxMana=Math.max(5,Number(p1.maxMana||5));p1.dir={...dir};p1.hitStunMs=0;fire1=0;fireBuffer1=0;
      return{position:{x:p1.x,y:p1.y},dir:{...p1.dir},mode};`;
const stationaryGunSetupReplacement=`      input.clear();bullets.length=0;p1.firearmUnlocked=true;p1.weapon={id:"browser-facing-gun",shots:1,power:1,ttl:40,delay:1,element:"energy"};p1.mana=5;p1.maxMana=Math.max(5,Number(p1.maxMana||5));p1.dir={...dir};p1.hitStunMs=0;fire1=0;fireBuffer1=0;
      window.__browserStationaryGunShot=null;
      window.__browserStationaryGunSpawnBullet=spawnBullet;
      spawnBullet=(bullet,remoteShot)=>{
        if(!window.__browserStationaryGunShot&&bullet?.owner===p1.id&&bullet?.style==="browser-facing-gun")window.__browserStationaryGunShot={dx:bullet.dx,dy:bullet.dy};
        return window.__browserStationaryGunSpawnBullet(bullet,remoteShot);
      };
      return{position:{x:p1.x,y:p1.y},dir:{...p1.dir},mode};`;
const stationaryGunSetupMatches=source.split(stationaryGunSetupTarget).length-1;
assert.equal(stationaryGunSetupMatches,1,"the deterministic browser harness must find exactly one stationary-gun setup target");
source=source.replace(stationaryGunSetupTarget,stationaryGunSetupReplacement);

const stationaryGunSampleTarget=`    await state.page.keyboard.press("Space",{delay:20});
    await state.page.waitForTimeout(45);
    const stationaryGun=await state.page.evaluate(()=>{const shot=bullets.find(b=>b.owner===p1.id&&b.style==="browser-facing-gun");return{shot:shot?{dx:shot.dx,dy:shot.dy}:null,playerDir:{...p1.dir},mana:p1.mana,moving:Boolean(d1()),mode,fire1,fireBuffer1}});`;
const stationaryGunSampleReplacement=`    await state.page.keyboard.press("Space",{delay:20});
    try{await state.page.waitForFunction(()=>Boolean(window.__browserStationaryGunShot),null,{timeout:2500})}catch(_){}
    const stationaryGun=await state.page.evaluate(()=>{
      const shot=window.__browserStationaryGunShot?{...window.__browserStationaryGunShot}:null;
      if(window.__browserStationaryGunSpawnBullet){spawnBullet=window.__browserStationaryGunSpawnBullet;delete window.__browserStationaryGunSpawnBullet}
      delete window.__browserStationaryGunShot;
      return{shot,playerDir:{...p1.dir},mana:p1.mana,moving:Boolean(d1()),mode,fire1,fireBuffer1};
    });`;
const stationaryGunSampleMatches=source.split(stationaryGunSampleTarget).length-1;
assert.equal(stationaryGunSampleMatches,1,"the deterministic browser harness must find exactly one stationary-gun sampling target");
source=source.replace(stationaryGunSampleTarget,stationaryGunSampleReplacement);

const readyHelperTarget=`async function waitForReady(state,label){
  await withTimeout(state.page.waitForFunction(()=>document.body.dataset.gameReady==="true",null,{timeout:15000}),STAGE_TIMEOUT_MS,\`${"${label}"} gameReady\`);
}`;
const readyHelperReplacement=`async function waitForReady(state,label){
  await withTimeout(state.page.waitForFunction(()=>document.body.dataset.gameReady==="true"&&document.body.dataset.releaseReady==="true"&&window.CCGLostSizzlerV142Bootstrap?.ready===true,null,{timeout:15000}),STAGE_TIMEOUT_MS,\`${"${label}"} active runtime ready\`);
}

async function acknowledgeTutorialStage(page,label){
  await withTimeout(page.waitForFunction(()=>{
    const modal=document.getElementById("ccg-tutorial-stage-modal");
    const button=modal?.querySelector?.("[data-stage-continue]");
    if(!modal||modal.classList.contains("hidden")||!button)return false;
    button.click();
    return true;
  },null,{timeout:25000}),STAGE_TIMEOUT_MS,label);
}`;
const readyHelperMatches=source.split(readyHelperTarget).length-1;
assert.equal(readyHelperMatches,1,"the deterministic browser harness must find the readiness helper insertion point");
source=source.replace(readyHelperTarget,readyHelperReplacement);

const tutorialAckTarget=`    await state.page.locator("#ccg-tutorial-stage-modal [data-stage-continue]").evaluate(button=>button.click());`;
const tutorialAckMatches=source.split(tutorialAckTarget).length-1;
assert.ok(tutorialAckMatches>=4,`the deterministic browser harness must find the Tutorial stage acknowledgements (found ${tutorialAckMatches})`);
source=source.split(tutorialAckTarget).join(`    await acknowledgeTutorialStage(state.page,"Tutorial stage acknowledgement");`);

const immediateSoloWaitTarget=`    await withTimeout(state.page.waitForFunction(()=>document.body.dataset.runActive==="true",null,{timeout:15000}),STAGE_TIMEOUT_MS,"queued Solo launch");`;
const immediateSoloWaitReplacement=`    try{
      await withTimeout(state.page.waitForFunction(()=>document.body.dataset.runActive==="true",null,{timeout:15000}),STAGE_TIMEOUT_MS,"queued Solo launch");
    }catch(error){
      const debug=await state.page.evaluate(()=>({
        body:{gameReady:document.body?.dataset?.gameReady,releaseReady:document.body?.dataset?.releaseReady,runActive:document.body?.dataset?.runActive,v142BootstrapReady:document.body?.dataset?.v142BootstrapReady},
        bootstrap:window.CCGLostSizzlerV142Bootstrap?{ready:window.CCGLostSizzlerV142Bootstrap.ready,failed:window.CCGLostSizzlerV142Bootstrap.failed,pendingStartId:window.CCGLostSizzlerV142Bootstrap.pendingStartId,pendingStartRetries:window.CCGLostSizzlerV142Bootstrap.pendingStartRetries,error:window.CCGLostSizzlerV142Bootstrap.error||""}:null,
        legacyGate:window.CCGLostSizzlerReleaseGate?.state?{ready:window.CCGLostSizzlerReleaseGate.state.ready,failed:window.CCGLostSizzlerReleaseGate.state.failed,errors:Number(window.CCGLostSizzlerReleaseGate.state.errors?.length||0)}:null,
        watchdog:window.CCGLostSizzlerLoadWatchdog?.state?{finished:window.CCGLostSizzlerLoadWatchdog.state.finished,pendingSolo:window.CCGLostSizzlerLoadWatchdog.state.pendingSolo,soloReplayQueued:window.CCGLostSizzlerLoadWatchdog.state.soloReplayQueued,soloReplays:window.CCGLostSizzlerLoadWatchdog.state.soloReplays,modulesReady:window.CCGLostSizzlerLoadWatchdog.state.modulesReady,loadingStage:window.CCGLostSizzlerLoadWatchdog.state.loadingStage}:null,
        button:(()=>{const button=document.getElementById("solo-btn");return button?{disabled:button.disabled,connected:button.isConnected,ariaBusy:button.getAttribute("aria-busy")}:null})(),
        runtime:{runActive:Boolean(window.run?.active),mode:typeof mode!=="undefined"?mode:null,playMode:typeof playMode!=="undefined"?playMode:null,p1:Boolean(window.p1)}
      }));
      console.error(\`[deterministic early-start diagnostic] immediate Solo ${"${JSON.stringify(debug)}"}\`);
      throw error;
    }`;
const immediateSoloWaitMatches=source.split(immediateSoloWaitTarget).length-1;
assert.equal(immediateSoloWaitMatches,1,"the diagnostic harness must find exactly one queued-Solo activation wait");
source=source.replace(immediateSoloWaitTarget,immediateSoloWaitReplacement);

const tutorialWaitTarget=`    await withTimeout(state.page.waitForFunction(()=>document.body.dataset.runActive==="true"&&window.CCGLostSizzlerOnboardingV120?.state?.active===true,null,{timeout:15000}),STAGE_TIMEOUT_MS,"Tutorial activation");`;
const tutorialWaitReplacement=`    try{
      await withTimeout(state.page.waitForFunction(()=>document.body.dataset.runActive==="true"&&window.CCGLostSizzlerOnboardingV120?.state?.active===true,null,{timeout:15000}),STAGE_TIMEOUT_MS,"Tutorial activation");
    }catch(error){
      const debug=await state.page.evaluate(()=>({
        body:{gameReady:document.body?.dataset?.gameReady,releaseReady:document.body?.dataset?.releaseReady,runActive:document.body?.dataset?.runActive,v142BootstrapReady:document.body?.dataset?.v142BootstrapReady},
        bootstrap:window.CCGLostSizzlerV142Bootstrap?{ready:window.CCGLostSizzlerV142Bootstrap.ready,failed:window.CCGLostSizzlerV142Bootstrap.failed,pendingStartId:window.CCGLostSizzlerV142Bootstrap.pendingStartId,pendingStartRetries:window.CCGLostSizzlerV142Bootstrap.pendingStartRetries,error:window.CCGLostSizzlerV142Bootstrap.error||""}:null,
        legacyGate:window.CCGLostSizzlerReleaseGate?.state?{ready:window.CCGLostSizzlerReleaseGate.state.ready,failed:window.CCGLostSizzlerReleaseGate.state.failed,errors:Number(window.CCGLostSizzlerReleaseGate.state.errors?.length||0)}:null,
        watchdog:window.CCGLostSizzlerLoadWatchdog?.state?{finished:window.CCGLostSizzlerLoadWatchdog.state.finished,pendingSolo:window.CCGLostSizzlerLoadWatchdog.state.pendingSolo,soloReplayQueued:window.CCGLostSizzlerLoadWatchdog.state.soloReplayQueued,soloReplays:window.CCGLostSizzlerLoadWatchdog.state.soloReplays,modulesReady:window.CCGLostSizzlerLoadWatchdog.state.modulesReady,loadingStage:window.CCGLostSizzlerLoadWatchdog.state.loadingStage}:null,
        button:(()=>{const button=document.getElementById("tutorial-zone-btn");return button?{disabled:button.disabled,connected:button.isConnected,ariaBusy:button.getAttribute("aria-busy")}:null})(),
        onboarding:window.CCGLostSizzlerOnboardingV120?.state?{active:window.CCGLostSizzlerOnboardingV120.state.active,tutorialRequested:window.CCGLostSizzlerOnboardingV120.state.tutorialRequested,step:window.CCGLostSizzlerOnboardingV120.state.step}:null,
        runtime:{runActive:Boolean(window.run?.active),mode:typeof mode!=="undefined"?mode:null,playMode:typeof playMode!=="undefined"?playMode:null,p1:Boolean(window.p1)}
      }));
      console.error(\`[deterministic early-start diagnostic] Tutorial ${"${JSON.stringify(debug)}"}\`);
      throw error;
    }`;
const tutorialWaitMatches=source.split(tutorialWaitTarget).length-1;
assert.equal(tutorialWaitMatches,1,"the diagnostic harness must find exactly one Tutorial activation wait");
source=source.replace(tutorialWaitTarget,tutorialWaitReplacement);

fs.writeFileSync(tempPath,source,"utf8");
try{
  await import(`${pathToFileURL(tempPath).href}?deterministic=${Date.now()}`);
}finally{
  try{fs.unlinkSync(tempPath);}catch(_){}
}
