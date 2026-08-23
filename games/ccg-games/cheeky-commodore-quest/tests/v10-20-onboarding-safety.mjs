import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const source=read("js/v10-20-onboarding-safety.js");
const hardening=read("js/v10-20-onboarding-hardening.js");
const guidance=read("js/v10-23-tutorial-guidance.js");
const assets=read("js/asset-overrides.js");
const config=read("js/config.js");
const changelog=read("js/v10-18-expansion-changelog.js");
const index=read("index.html");

assert.match(assets,/CCG_ONBOARDING_SAFETY_REV="20260823e"/,"onboarding safety must remain cache-versioned");
assert.match(assets,/CCG_ONBOARDING_HARDENING_REV/,"asset loader must expose onboarding hardening");
assert.match(assets,/v10-20-onboarding-safety\.js\?v=\$\{CCG_ONBOARDING_SAFETY_REV\}/,"onboarding safety script must be loaded by the game");
assert.match(assets,/v10-20-onboarding-hardening\.js\?v=\$\{CCG_ONBOARDING_HARDENING_REV\}/,"onboarding hardening must be loaded by the game");
assert.match(index,/v10-23-tutorial-guidance\.js\?v=20260823b/,"r6 must directly load the tightened tutorial guidance before the enhancement queue can serve an older cached copy");

assert.match(source,/floor===1\|\|depth\(host\.spiderNest\?\.roomId\)<=safeDepth\)clearSpiderNest\(\)/,"floor one must suppress the Dustweb spider nest");
assert.match(source,/floor===1\|\|depth\(host\.skeletonHorde\?\.roomId\)<=safeDepth\)clearSkeletonHorde\(\)/,"floor one must suppress the skeleton horde");
assert.match(source,/safeDepth=floor===1\?2:1/,"opening safety must cover the first two graph depths on floor one");
assert.match(source,/spawnCooldown=Math\.max\(Number\(g\.spawnCooldown\|\|0\),floor===1\?18000:12000\)/,"shallow monster generators must receive an extended opening cooldown");
assert.match(source,/c\.mimicChest=false;c\.mimicDormant=false/,"mimics must not ambush players inside the protected opening depth");

assert.match(source,/Play or use the Tutorial\?/,"core normal starts must still expose tutorial versus play");
assert.match(source,/data-tutorial-enter>TUTORIAL</,"core start choice must retain a tutorial option");
assert.match(source,/data-tutorial-skip>PLAY GAME</,"core start choice must retain a play-game option");
assert.match(source,/if\(!state\.choiceAccepted&&!daily&&!online\)\{showChoice\(Array\.from\(arguments\)\);return false\}/,"normal beginRun calls must remain protected by the tutorial/play decision");
assert.match(source,/Tutorial Zone/,"the tutorial must remain replayable");
for(const phrase of ["MOVE AROUND","FIRE YOUR WEAPON","DASH","OPEN AND CLOSE THE INVENTORY","OBJECTIVES, RADAR & HINTS","HEALTH, ARMOUR & QUICK ITEMS","KEYS, DOORS, CHESTS & SECRETS","ENEMIES, NAMED ENEMIES & THE STALKER","RARE EVENTS, SHOPS, HAZARDS & SCORE","TUTORIAL COMPLETE"]){
  assert.ok(source.includes(phrase),`tutorial is missing section: ${phrase}`);
}

assert.match(source,/movementDistance:0/,"tutorial movement must track cumulative successful movement");
assert.match(source,/state\.movementDistance\+=d/,"movement polling must accumulate successful movement");
assert.match(source,/function recordMovement\(p,before\)/,"movement must be observed from the actual movement action");
assert.match(source,/if\(state\.movementDistance>=2\)completeInteractive\("move"\)/,"two cumulative tiles must complete movement");
assert.match(source,/function completeInteractive\(kind\)/,"interactive tutorial stages must share a completion path");
assert.match(source,/firePlayer=function\(\)\{const r=o\.apply\(this,arguments\);note\("fire"\);return r\}/,"firing must progress the fire stage");
assert.match(source,/dashPlayer=function\(\)\{const r=o\.apply\(this,arguments\);note\("dash"\);return r\}/,"dashing must progress the dash stage");
assert.match(source,/step==="fire"&&\(event\.code==="Space"\|\|event\.code==="Enter"\)/,"keyboard fire must remain a fallback");
assert.match(source,/step==="dash"&&\["ShiftLeft","ShiftRight","ControlLeft","ControlRight"\]\.includes\(event\.code\)/,"keyboard dash must remain a fallback");
assert.match(source,/step==="fire"&&action==="fire"/,"touch fire must remain a fallback");
assert.match(source,/step==="dash"&&action==="dash"/,"touch dash must remain a fallback");
assert.match(source,/state\.inventoryOpened&&state\.inventoryClosed/,"inventory training must require opening and closing");
assert.match(source,/setInterval\(watchTutorialProgress,80\)/,"tutorial progress must retain a fast polling fallback");
assert.match(source,/setInterval\(install,500\)/,"tutorial action wrappers must keep self-healing");

assert.match(guidance,/INPUT_STEPS=new Map\(\[\[0,"move"\],\[1,"fire"\],\[2,"dash"\],\[3,"inventory"\]\]\)/,"only movement, fire, dash and inventory should require gameplay input");
assert.doesNotMatch(guidance,/INFO_DELAY|FINISH_DELAY|Continuing automatically|Returning to the game options automatically/,"tutorial explanation cards must never auto-advance on a timer");
assert.match(guidance,/#ccg-tutorial-stage-modal,#ccg-start-mode-choice/,"tutorial stages and start choice must use centred full-viewport modal layers");
assert.match(guidance,/position:fixed!important;inset:0!important/,"tutorial acknowledgement layers must cover the viewport so they cannot be clipped into the top report rail");
assert.match(guidance,/place-items:center/,"tutorial acknowledgement cards must be centred");
assert.match(guidance,/body\[data-tutorial-active="true"\] #ccg-tutorial-rail\{display:none!important\}/,"the old top-rail tutorial card must be hidden while centred guidance is active");
assert.match(guidance,/data-stage-continue/,"every tutorial explanation must expose an acknowledgement control");
assert.match(guidance,/The tutorial will not move on until you acknowledge it/,"informational stages must tell players that Continue is required");
assert.match(guidance,/Press Continue to acknowledge this step/,"interactive stages must also require acknowledgement before controls become active");
assert.match(guidance,/step===9\?"COMPLETE TUTORIAL":"CONTINUE"/,"the final card must require an explicit completion acknowledgement");
assert.match(guidance,/button\?\.click\?\.\(\)/,"Continue on informational cards must use the core sequential tutorial advance path");
assert.ok(guidance.includes("[data-dir]"),"movement controls must be highlighted");
assert.ok(guidance.includes('[data-action="fire"]'),"FIRE must be highlighted");
assert.ok(guidance.includes('[data-action="dash"]'),"DASH must be highlighted");
assert.ok(guidance.includes('[data-action="inventory"],[data-action="items"]'),"ITEMS must be highlighted");
assert.match(guidance,/ccgTutorialControlFlash/,"highlighted controls must visibly pulse");
assert.match(guidance,/#inventory-close,#inventory-close-top/,"inventory close controls must be highlighted once inventory has been opened");
assert.match(guidance,/function interactiveReady\(kind,state\)/,"tutorial watchdog must check real state rather than treating an unspecified step as complete");
assert.match(guidance,/if\(kind==="move"\)return Boolean\(state\?\.moved\)/,"movement readiness must depend on actual movement");
assert.match(guidance,/if\(kind==="fire"\)return Boolean\(state\?\.fired\)/,"fire readiness must depend on actual firing");
assert.match(guidance,/if\(kind==="dash"\)return Boolean\(state\?\.dashed\)/,"dash readiness must depend on an actual dash");
assert.match(guidance,/state\?\.inventoryOpened&&state\?\.inventoryClosed/,"inventory readiness must depend on opening and closing the panel");

assert.match(guidance,/function ensurePrimaryTutorialButton\(\)/,"guidance must enforce tutorial placement on the main menu");
assert.match(guidance,/solo\.insertAdjacentElement\("afterend",button\)/,"Tutorial must sit directly beside Play Solo rather than in the secondary menu");
assert.match(guidance,/button\.textContent="Tutorial"/,"the permanent primary tutorial option must be labelled Tutorial");
assert.match(guidance,/function bindStartChoice\(\)/,"Play Solo must be guarded by a permanent tutorial/play choice");
assert.match(guidance,/data-start-tutorial>TUTORIAL</,"the guarded start choice must always offer Tutorial");
assert.match(guidance,/data-start-game>PLAY GAME</,"the guarded start choice must always offer Play Game");
assert.match(guidance,/state\.forceTutorial=false;state\.tutorialRequested=false;state\.choiceAccepted=true/,"Play Game must deliberately bypass tutorial without removing future tutorial availability");

assert.match(source,/if\(state\.active\)return false;return o\.apply\(this,arguments\)/,"tutorial players must be immune to accidental damage");
assert.match(source,/if\(typeof quitToMenu==="function"\)await quitToMenu\(\)/,"finishing training must return to the main options");
assert.match(source,/TUTORIAL COMPLETE<\/b>/,"completed training must leave a completion notice");
assert.match(source,/run\?\.daily\|\|playMode==="online"/,"ranked and online runs must not be converted into tutorial runs");

assert.match(hardening,/PGR\.makeRun\(\{difficulty,seed,daily:false\}\)/,"leaving training must reconstruct a pristine run");
assert.match(hardening,/score=0/,"tutorial score must be discarded");
assert.match(hardening,/floorEntryCheckpoint=null/,"tutorial state must not create a real checkpoint");

assert.match(source,/WELCOME TO THE LOST SIZZLER/,"normal runs must retain a visible welcome");
assert.match(source,/v\.state\.unlocked=true/,"welcome voice must retry after audio unlock");

assert.match(config,/\{name:"CCG"[^\n]*ccgBoss:true/,"the special dossier enemy must remain named CCG");
assert.match(source,/ccg-lost-sizzler-player-dossier-block-v1/,"false player-name dossier identities must persist as blocked until verified");
assert.match(source,/blockPlayerEnemyName\(f\.name\)/,"matching player/enemy names must be blocked from false discovery");
assert.match(source,/blocked\.has\(name\)&&!verified\.has\(name\)/,"blocked identities must remain hidden until actual encounter");
assert.match(hardening,/new Set\(\["ccg","ccg player","cheeky commodore gamer"\]\)/,"CCG identity aliases must remain recognised");

for(const id of ["LS-0823-25","LS-0823-26","LS-0823-27","LS-0823-28","LS-0823-33","LS-0823-34","LS-0823-35","LS-0823-36"])assert.ok(changelog.includes(id),`developer changelog is missing ${id}`);

console.log("Lost Sizzler tutorial regression checks passed: permanent start option, centred acknowledgement cards, explicit Continue flow, real control input, return-to-options, gentle opening and dossier isolation.");
