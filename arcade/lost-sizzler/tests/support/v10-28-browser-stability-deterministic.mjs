import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const sourcePath=path.resolve(here,"../v10-28-browser-stability.mjs");
const tempPath=path.resolve(here,"../.v10-28-browser-stability-deterministic.tmp.mjs");
let source=fs.readFileSync(sourcePath,"utf8").replace(/\r\n/g,"\n");

const immediateSoloTarget=`    const state=await newGamePage();
    await withTimeout(state.page.goto(canonical,{waitUntil:"domcontentloaded",timeout:15000}),STAGE_TIMEOUT_MS,"immediate Solo navigation");`;
const immediateSoloReplacement=`    const state=await newGamePage();
    await state.page.addInitScript(()=>{
      document.addEventListener("DOMContentLoaded",()=>{
        const button=document.getElementById("solo-btn");
        window.__ccgImmediateSoloReleaseAtClick=document.body?.dataset?.releaseReady||"";
        window.__ccgImmediateSoloClicked=Boolean(button);
        button?.click();
      },{once:true});
    });
    await withTimeout(state.page.goto(canonical,{waitUntil:"domcontentloaded",timeout:15000}),STAGE_TIMEOUT_MS,"immediate Solo navigation");`;

const immediateSoloMatches=source.split(immediateSoloTarget).length-1;
assert.equal(immediateSoloMatches,1,"the deterministic browser harness must find exactly one immediate-Solo navigation target");
source=source.replace(immediateSoloTarget,immediateSoloReplacement);

const immediateClickTarget=`    const releaseAtClick=await state.page.evaluate(()=>document.body.dataset.releaseReady);
    assert.equal(releaseAtClick,"false","the immediate-click test must act before the enhancement queue is release-ready");
    await withTimeout(state.page.locator("#solo-btn").click({timeout:8000,noWaitAfter:true}),10000,"immediate Solo button click");`;
const immediateClickReplacement=`    const immediateClick=await state.page.evaluate(()=>({releaseAtClick:String(window.__ccgImmediateSoloReleaseAtClick||""),clicked:Boolean(window.__ccgImmediateSoloClicked)}));
    assert.equal(immediateClick.releaseAtClick,"false","the immediate-click test must act before the enhancement queue is release-ready");
    assert.equal(immediateClick.clicked,true,"the immediate-click harness must click Solo from the page's first DOMContentLoaded turn");`;
const immediateClickMatches=source.split(immediateClickTarget).length-1;
assert.equal(immediateClickMatches,1,"the deterministic browser harness must find exactly one immediate-Solo Playwright click block");
source=source.replace(immediateClickTarget,immediateClickReplacement);

const splitActivationTarget=`    await withTimeout(state.page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof p2!=="undefined"&&Boolean(p2)&&playMode==="split"&&mode==="playing",null,{timeout:15000}),STAGE_TIMEOUT_MS,"split-screen activation");`;
const splitActivationReplacement=`    await withTimeout(state.page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof p2!=="undefined"&&Boolean(p2)&&playMode==="split"&&mode==="playing",null,{timeout:19000}),STAGE_TIMEOUT_MS,"split-screen activation");`;
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
  await withTimeout(state.page.waitForFunction(()=>document.body.dataset.gameReady==="true",null,{timeout:15000}),STAGE_TIMEOUT_MS,\`${"${label}"} gameReady\`);
}

async function acknowledgeTutorialStage(page,label){
  await withTimeout(page.waitForFunction(()=>{
    const modal=document.getElementById("ccg-tutorial-stage-modal");
    const button=modal?.querySelector?.("[data-stage-continue]");
    if(!modal||modal.classList.contains("hidden")||!button)return false;
    button.click();
    return true;
  },null,{timeout:18000}),STAGE_TIMEOUT_MS,label);
}`;
const readyHelperMatches=source.split(readyHelperTarget).length-1;
assert.equal(readyHelperMatches,1,"the deterministic browser harness must find the readiness helper insertion point");
source=source.replace(readyHelperTarget,readyHelperReplacement);

const tutorialAckTarget=`    await state.page.locator("#ccg-tutorial-stage-modal [data-stage-continue]").evaluate(button=>button.click());`;
const tutorialAckMatches=source.split(tutorialAckTarget).length-1;
assert.ok(tutorialAckMatches>=4,`the deterministic browser harness must find the Tutorial stage acknowledgements (found ${tutorialAckMatches})`);
source=source.split(tutorialAckTarget).join(`    await acknowledgeTutorialStage(state.page,"Tutorial stage acknowledgement");`);

fs.writeFileSync(tempPath,source,"utf8");
try{
  await import(`${pathToFileURL(tempPath).href}?deterministic=${Date.now()}`);
}finally{
  try{fs.unlinkSync(tempPath);}catch(_){}
}
