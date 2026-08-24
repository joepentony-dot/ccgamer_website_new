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
const index=read("index.html");

assert.match(assets,/CCG_ONBOARDING_SAFETY_REV="20260823e"/,"onboarding safety must remain cache-versioned");
assert.match(assets,/CCG_TUTORIAL_GUIDANCE_REV="20260824c"/,"fullscreen-safe tutorial launcher must use a fresh cache revision");
assert.match(index,/v10-23-tutorial-guidance\.js\?v=20260824c/,"the release must directly load the fullscreen-safe tutorial launcher");
assert.match(guidance,/const mount=document\.querySelector\("\.ccg-game"\)\|\|document\.body/,"tutorial cards must mount inside the element that enters fullscreen so the canvas cannot intercept them");

assert.match(source,/floor===1\|\|depth\(host\.spiderNest\?\.roomId\)<=safeDepth\)clearSpiderNest\(\)/,"floor one must suppress the Dustweb spider nest");
assert.match(source,/floor===1\|\|depth\(host\.skeletonHorde\?\.roomId\)<=safeDepth\)clearSkeletonHorde\(\)/,"floor one must suppress the skeleton horde");
assert.match(source,/safeDepth=floor===1\?2:1/,"opening safety must cover the first two graph depths on floor one");
assert.match(source,/spawnCooldown=Math\.max\(Number\(g\.spawnCooldown\|\|0\),floor===1\?18000:12000\)/,"shallow monster generators must receive an extended opening cooldown");

/* The core chooser remains only as a fallback if the guidance module fails to load. */
assert.match(source,/Play or use the Tutorial\?/,"core must retain a fallback tutorial/play chooser");
assert.match(source,/data-tutorial-enter>TUTORIAL</,"fallback chooser must retain Tutorial");
assert.match(source,/data-tutorial-skip>PLAY GAME</,"fallback chooser must retain Play Game");

for(const phrase of ["MOVE AROUND","FIRE YOUR WEAPON","DASH","OPEN AND CLOSE THE INVENTORY","OBJECTIVES, RADAR & HINTS","HEALTH, ARMOUR & QUICK ITEMS","KEYS, DOORS, CHESTS & SECRETS","ENEMIES, NAMED ENEMIES & THE STALKER","RARE EVENTS, SHOPS, HAZARDS & SCORE","TUTORIAL COMPLETE"]){
  assert.ok(source.includes(phrase),`tutorial is missing section: ${phrase}`);
}

assert.match(source,/movementDistance:0/,"tutorial movement must track cumulative successful movement");
assert.match(source,/state\.movementDistance\+=d/,"movement polling must accumulate successful movement");
assert.match(source,/if\(state\.movementDistance>=2\)completeInteractive\("move"\)/,"two cumulative tiles must complete movement");
assert.match(source,/firePlayer=function\(\)\{const r=o\.apply\(this,arguments\);note\("fire"\);return r\}/,"firing must progress the fire stage");
assert.match(source,/dashPlayer=function\(\)\{const r=o\.apply\(this,arguments\);note\("dash"\);return r\}/,"dashing must progress the dash stage");
assert.match(source,/state\.inventoryOpened&&state\.inventoryClosed/,"inventory training must require opening and closing");
assert.match(source,/setInterval\(watchTutorialProgress,80\)/,"tutorial progress must retain a fast fallback");

assert.match(guidance,/INPUT_STEPS=new Map\(\[\[0,"move"\],\[1,"fire"\],\[2,"dash"\],\[3,"inventory"\]\]\)/,"only movement, fire, dash and inventory should require gameplay input");
assert.doesNotMatch(guidance,/INFO_DELAY|FINISH_DELAY|Continuing automatically|Returning to the game options automatically/,"tutorial cards must never auto-advance on a timer");
assert.match(guidance,/#ccg-tutorial-stage-modal\{[\s\S]*?position:fixed!important;inset:0!important/,"tutorial acknowledgement must be a full-viewport centred modal");
assert.match(guidance,/place-items:center/,"tutorial acknowledgement card must be centred");
assert.match(guidance,/body\[data-tutorial-active="true"\] #ccg-tutorial-rail\{display:none!important\}/,"old report-rail tutorial UI must be hidden while centred guidance is active");
assert.match(guidance,/data-stage-continue/,"every tutorial explanation must expose Continue");
assert.match(guidance,/The tutorial will not move on until you acknowledge it/,"information stages must require acknowledgement");
assert.match(guidance,/Press Continue to acknowledge this step/,"interactive stages must require acknowledgement before control input");
assert.match(guidance,/step===9\?"COMPLETE TUTORIAL":"CONTINUE"/,"final tutorial card must require explicit completion");
assert.ok(guidance.includes("[data-dir]"),"movement controls must be highlighted");
assert.ok(guidance.includes('[data-action="fire"]'),"FIRE must be highlighted");
assert.ok(guidance.includes('[data-action="dash"]'),"DASH must be highlighted");
assert.ok(guidance.includes('[data-action="inventory"],[data-action="items"]'),"ITEMS must be highlighted");
assert.match(guidance,/ccgTutorialControlFlash/,"highlighted controls must visibly pulse");
assert.match(guidance,/#inventory-close,#inventory-close-top/,"inventory close controls must be highlighted after opening inventory");

/* Start flow: the menu itself is the only chooser after the mobile notice. */
assert.match(index,/<button id="solo-btn" class="primary">Play Solo<\/button><button id="tutorial-zone-btn" type="button" class="tutorial-primary-option">Tutorial<\/button>/,"Tutorial must be present in the shipped HTML immediately beside Play Solo");
assert.match(guidance,/function ensurePrimaryTutorialButton\(\)/,"guidance must enforce the permanent Tutorial button if another runtime rearranges the menu");
assert.match(guidance,/solo\.insertAdjacentElement\("afterend",button\)/,"Tutorial must remain immediately beside Play Solo");
assert.match(guidance,/button\.textContent="Tutorial"/,"permanent tutorial option must be labelled Tutorial");
assert.match(guidance,/function bindSoloDirect\(\)/,"Play Solo must start directly without another chooser");
assert.doesNotMatch(guidance,/Choose how you want to start|data-start-tutorial|data-start-game/,"the redundant second tutorial/play chooser must be removed");
assert.match(guidance,/function hideRedundantChoices\(\)/,"guidance must actively suppress stale chooser DOM");
assert.match(guidance,/document\.getElementById\("ccg-start-mode-choice"\)\?\.remove\(\)/,"obsolete new chooser must be removed if present");
assert.match(guidance,/legacy\.classList\.add\("hidden"\)/,"legacy fallback chooser must remain hidden during the normal r7 flow");

/* Async mobile/fullscreen launch regression: choiceAccepted cannot be cleared until startSolo settles. */
assert.match(guidance,/function launchSolo\(tutorial\)/,"tutorial and normal solo launches must share one reliable async path");
assert.match(guidance,/queuedLaunch=requested/,"an early Tutorial click must be retained until onboarding is ready");
assert.match(guidance,/if\(queuedLaunch!==null&&state&&typeof startSolo==="function"\)/,"the retained start request must launch as soon as its dependencies are ready");
assert.match(guidance,/function focusGameplaySurface\(\)/,"acknowledging a tutorial card must return focus to keyboard gameplay");
assert.match(guidance,/event\.code==="Enter"\|\|event\.code==="Space"/,"only button activation keys may pass through a visible tutorial card");
assert.match(guidance,/state\.tutorialRequested=requested/,"Tutorial selection must persist as launch intent");
assert.match(guidance,/state\.choiceAccepted=true/,"selected menu action must bypass the fallback chooser");
assert.match(guidance,/result=startSolo\(\)/,"the primary buttons must use the real async solo start");
assert.match(guidance,/Promise\.resolve\(result\)\.finally\(\(\)=>\{/,"fallback-chooser bypass must stay active until fullscreen/audio start settles");
assert.match(guidance,/if\(!tutorial\)state\.forceTutorial=false/,"normal Play Solo must clear tutorial forcing only after the async start settles");
assert.match(guidance,/Do not clear tutorialRequested here/,"tutorial intent must survive fullscreen/audio completion until core activation consumes it");

assert.match(source,/if\(state\.active\)return false;return o\.apply\(this,arguments\)/,"tutorial players must be immune to accidental damage");
assert.match(source,/if\(typeof quitToMenu==="function"\)await quitToMenu\(\)/,"finishing training must return to main options");
assert.match(source,/TUTORIAL COMPLETE<\/b>/,"completed training must leave a completion notice");
assert.match(source,/run\?\.daily\|\|playMode==="online"/,"ranked and online runs must not become tutorial runs");

assert.match(hardening,/PGR\.makeRun\(\{difficulty,seed,daily:false\}\)/,"leaving training must reconstruct a pristine run");
assert.match(hardening,/score=0/,"tutorial score must be discarded");
assert.match(hardening,/floorEntryCheckpoint=null/,"tutorial state must not create a real checkpoint");

assert.match(config,/\{name:"CCG"[^\n]*ccgBoss:true/,"special dossier enemy must remain named CCG");
assert.match(source,/ccg-lost-sizzler-player-dossier-block-v1/,"false player-name dossier identities must remain blocked until verified");
assert.match(hardening,/new Set\(\["ccg","ccg player","cheeky commodore gamer"\]\)/,"CCG identity aliases must remain recognised");

console.log("Lost Sizzler r7 tutorial regression checks passed: static Tutorial option, one start menu, async mobile launch persistence, centred acknowledgement cards and real control input.");
