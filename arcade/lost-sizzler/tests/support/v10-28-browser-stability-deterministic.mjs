import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const sourcePath=path.resolve(here,"../v10-28-browser-stability.mjs");
const tempPath=path.resolve(here,"../.v10-28-browser-stability-deterministic.tmp.mjs");
let source=fs.readFileSync(sourcePath,"utf8");

const immediateSoloTarget=`    const state=await newGamePage();
    await withTimeout(state.page.goto(canonical,{waitUntil:"domcontentloaded",timeout:15000}),STAGE_TIMEOUT_MS,"immediate Solo navigation");`;
const immediateSoloReplacement=`    const state=await newGamePage();
    await state.page.route("**/arcade/lost-sizzler/js/v10-35-quality.js*",async route=>{
      await new Promise(resolve=>setTimeout(resolve,700));
      await route.continue();
    });
    await withTimeout(state.page.goto(canonical,{waitUntil:"domcontentloaded",timeout:15000}),STAGE_TIMEOUT_MS,"immediate Solo navigation");`;

const immediateSoloMatches=source.split(immediateSoloTarget).length-1;
assert.equal(immediateSoloMatches,1,"the deterministic browser harness must find exactly one immediate-Solo navigation target");
source=source.replace(immediateSoloTarget,immediateSoloReplacement);

const splitActivationTarget=`    await withTimeout(state.page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof p2!=="undefined"&&Boolean(p2)&&playMode==="split"&&mode==="playing",null,{timeout:15000}),STAGE_TIMEOUT_MS,"split-screen activation");`;
const splitActivationReplacement=`    await withTimeout(state.page.waitForFunction(()=>document.body.dataset.runActive==="true"&&typeof p2!=="undefined"&&Boolean(p2)&&playMode==="split"&&mode==="playing",null,{timeout:19000}),STAGE_TIMEOUT_MS,"split-screen activation");`;
const splitActivationMatches=source.split(splitActivationTarget).length-1;
assert.equal(splitActivationMatches,1,"the deterministic browser harness must find exactly one split-screen activation timeout target");
source=source.replace(splitActivationTarget,splitActivationReplacement);

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
