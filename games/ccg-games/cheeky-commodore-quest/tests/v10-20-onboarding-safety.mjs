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

assert.match(assets,/CCG_ONBOARDING_SAFETY_REV="20260823e"/,"latest tutorial start/progression fix must be cache-busted for players who loaded an earlier tutorial");
assert.match(assets,/CCG_ONBOARDING_HARDENING_REV/,"asset loader must expose a cache-busted onboarding-hardening revision");
assert.match(assets,/CCG_TUTORIAL_GUIDANCE_REV="20260823a"/,"tutorial guidance must have an explicit cache revision");
assert.match(assets,/v10-20-onboarding-safety\.js\?v=\$\{CCG_ONBOARDING_SAFETY_REV\}/,"onboarding safety script must be loaded by the game");
assert.match(assets,/v10-20-onboarding-hardening\.js\?v=\$\{CCG_ONBOARDING_HARDENING_REV\}/,"onboarding hardening must be loaded by the game");
assert.match(assets,/v10-23-tutorial-guidance\.js\?v=\$\{CCG_TUTORIAL_GUIDANCE_REV\}/,"tutorial guidance must be loaded by the game");

assert.match(source,/floor===1\|\|depth\(host\.spiderNest\?\.roomId\)<=safeDepth\)clearSpiderNest\(\)/,"floor one must suppress the Dustweb spider nest");
assert.match(source,/floor===1\|\|depth\(host\.skeletonHorde\?\.roomId\)<=safeDepth\)clearSkeletonHorde\(\)/,"floor one must suppress the skeleton horde");
assert.match(source,/safeDepth=floor===1\?2:1/,"opening safety must cover the first two graph depths on floor one");
assert.match(source,/spawnCooldown=Math\.max\(Number\(g\.spawnCooldown\|\|0\),floor===1\?18000:12000\)/,"shallow monster generators must receive an extended opening cooldown");
assert.match(source,/c\.mimicChest=false;c\.mimicDormant=false/,"mimics must not ambush players inside the protected opening depth");
assert.match(source,/rare\?\.golden&&depth\(rare\.golden\.roomId\)<=safeDepth/,"Golden Room combat must not trigger in the protected opening depth");

assert.match(source,/Play or use the Tutorial\?/,"normal game starts must present the tutorial/play decision");
assert.match(source,/data-tutorial-enter>TUTORIAL</,"the start choice must expose a direct tutorial option");
assert.match(source,/data-tutorial-skip>PLAY GAME</,"the start choice must expose a direct play-game option");
assert.match(source,/if\(!state\.choiceAccepted&&!daily&&!online\)\{showChoice\(Array\.from\(arguments\)\);return false\}/,"every normal new game start must ask for tutorial or play instead of only first-time players");
assert.match(source,/Tutorial Zone/,"the tutorial must remain directly replayable from the menu");
for(const phrase of ["MOVE AROUND","FIRE YOUR WEAPON","DASH","OPEN AND CLOSE THE INVENTORY","OBJECTIVES, RADAR & HINTS","HEALTH, ARMOUR & QUICK ITEMS","KEYS, DOORS, CHESTS & SECRETS","ENEMIES, NAMED ENEMIES & THE STALKER","RARE EVENTS, SHOPS, HAZARDS & SCORE","TUTORIAL COMPLETE"]){
  assert.ok(source.includes(phrase),`tutorial is missing section: ${phrase}`);
}

assert.match(source,/movementDistance:0/,"tutorial movement must track cumulative successful movement rather than only distance from the starting square");
assert.match(source,/state\.movementDistance\+=d/,"movement polling must accumulate every successful tile movement");
assert.match(source,/function recordMovement\(p,before\)/,"movement must also be observed directly from the movement action");
assert.match(source,/movePlayer=function\(p\)\{const before=p\?\{x:p\.x,y:p\.y\}:null,r=o\.apply\(this,arguments\);recordMovement\(p,before\);return r\}/,"the tutorial must wrap actual player movement so desktop, gamepad and mobile movement can progress stage one");
assert.match(source,/if\(state\.movementDistance>=2\)completeInteractive\("move"\)/,"two cumulative tiles must complete the movement stage even if the player circles back toward the start");
assert.match(source,/function completeInteractive\(kind\)/,"all interactive tutorial stages must share a single completion path");
assert.match(source,/if\(state\.autoAdvanceTimer\)return true;/,"holding a completed action must not keep postponing the tutorial's advance timer");
assert.match(source,/state\.autoAdvanceTimer=setTimeout\(\(\)=>\{state\.autoAdvanceTimer=0;if\(state\.active&&STEPS\[state\.step\]\?\.\[0\]===kind&&stepReady\(STEPS\[state\.step\]\)\)advance\(\)\},220\)/,"completed interactive stages must advance automatically exactly once");
assert.match(source,/function note\(kind\)\{if\(!state\.active\|\|STEPS\[state\.step\]\?\.\[0\]!==kind\)return;completeInteractive\(kind\)\}/,"actions performed before their displayed tutorial stage must not pre-complete later stages");
assert.match(source,/firePlayer=function\(\)\{const r=o\.apply\(this,arguments\);note\("fire"\);return r\}/,"firing through the game action must progress the fire tutorial stage");
assert.match(source,/dashPlayer=function\(\)\{const r=o\.apply\(this,arguments\);note\("dash"\);return r\}/,"dashing through the game action must progress the dash tutorial stage");
assert.match(source,/step==="fire"&&\(event\.code==="Space"\|\|event\.code==="Enter"\)/,"keyboard fire input must provide an independent progression fallback for stage two");
assert.match(source,/step==="dash"&&\["ShiftLeft","ShiftRight","ControlLeft","ControlRight"\]\.includes\(event\.code\)/,"keyboard dash input must provide an independent progression fallback");
assert.match(source,/step==="fire"&&action==="fire"/,"touch fire controls must provide an independent stage-two fallback");
assert.match(source,/step==="dash"&&action==="dash"/,"touch dash controls must provide an independent stage-three fallback");
assert.match(source,/state\.inventoryOpened&&state\.inventoryClosed/,"inventory training must require both opening and closing the inventory");
assert.match(source,/state\.inventoryClosed=true;completeInteractive\("inventory"\)/,"closing the inventory after opening it must complete the inventory stage");
assert.match(source,/setInterval\(watchTutorialProgress,80\)/,"tutorial progress must have a fast polling fallback for UI and control wrappers");
assert.match(source,/setInterval\(install,500\)/,"tutorial action wrappers must keep self-healing if later enhancement scripts wrap controls again");
assert.match(source,/data-next>Continue</,"informational tutorial sections must continue sequentially instead of ending the training flow");

assert.match(guidance,/INPUT_STEPS=new Map\(\[\[0,"move"\],\[1,"fire"\],\[2,"dash"\],\[3,"inventory"\]\]\)/,"only real player-input stages should require controls");
assert.match(guidance,/INFO_DELAY=8000/,"informational stages must remain readable before automatic continuation");
assert.match(guidance,/FINISH_DELAY=5000/,"completion notice must remain visible before returning to options");
assert.match(guidance,/\[data-dir\]/,"movement controls must be highlighted during the movement stage");
assert.match(guidance,/\[data-action=\\"fire\\"\]/,"FIRE must be highlighted during the firing stage");
assert.match(guidance,/\[data-action=\\"dash\\"\]/,"DASH must be highlighted during the dash stage");
assert.match(guidance,/\[data-action=\\"inventory\\"\],\[data-action=\\"items\\"\]/,"ITEMS or inventory must be highlighted during the inventory stage");
assert.match(guidance,/ccgTutorialControlFlash/,"highlighted tutorial controls must visibly pulse");
assert.match(guidance,/Explanation only — no button or key press is required/,"non-input tutorial sections must state that no control action is required");
assert.match(guidance,/button\.click\(\)/,"informational stages must continue automatically without player input");
assert.match(guidance,/max-height:min\(235px,36vh\)!important/,"mobile tutorial instructions must override the normal 50px report-rail cap");
assert.match(guidance,/:not\(#ccg-tutorial-rail\)\{display:none!important\}/,"mobile tutorial mode must dedicate the report rail to training instructions");

assert.match(source,/if\(state\.active\)return false;return o\.apply\(this,arguments\)/,"tutorial players must be immune to accidental damage");
assert.match(source,/if\(typeof quitToMenu==="function"\)await quitToMenu\(\)/,"finishing training must return to the main options rather than automatically starting a live floor");
assert.match(source,/TUTORIAL COMPLETE<\/b>/,"completed training must leave a visible completion notice on the main options");
assert.match(source,/Choose Play Solo to start the dungeon, or Tutorial Zone to run through the training again/,"completion notice must direct players to either play or repeat the tutorial");
assert.match(source,/run\?\.daily\|\|playMode==="online"/,"ranked and online runs must not be converted into tutorial runs");

assert.match(hardening,/PGR\.makeRun\(\{difficulty,seed,daily:false\}\)/,"leaving training must reconstruct a pristine run before the tutorial run is discarded");
assert.match(hardening,/score=0/,"tutorial score must be discarded before returning to options");
assert.match(hardening,/floorEntryCheckpoint=null/,"tutorial state must not create a real checkpoint");
assert.match(hardening,/wasTutorialActive&&!active/,"pristine reset must occur on the tutorial-active to menu transition");

assert.match(source,/WELCOME TO THE LOST SIZZLER/,"normal runs must have a visible welcome message");
assert.match(source,/v\.state\.unlocked=true/,"welcome voice must retry after audio has been unlocked");
assert.match(source,/v\.say\?\.\(key,\{cooldown:0\}\)/,"welcome voice must be explicitly requested after start");

assert.match(config,/\{name:"CCG"[^\n]*ccgBoss:true/,"the special dossier enemy must remain named CCG in config");
assert.match(source,/ccg-lost-sizzler-player-dossier-block-v1/,"false player-name dossier identities must persist as blocked until verified");
assert.match(source,/blockPlayerEnemyName\(f\.name\)/,"a player name exactly matching a named enemy must be blocked from dossier discovery");
assert.match(source,/e\?\.alive&&e\.follower&&localPlayers\(\)\.some\(p=>visibleTo\(p,e\.x,e\.y\)\)/,"only a physically encountered visible named enemy may verify a matching dossier identity");
assert.match(source,/blocked\.has\(name\)&&!verified\.has\(name\)/,"blocked player identities must remain hidden until the actual enemy is verified");
assert.match(hardening,/new Set\(\["ccg","ccg player","cheeky commodore gamer"\]\)/,"CCG player identity aliases must be recognised");
assert.match(hardening,/if\(CCG_ALIASES\.has\(n\)\)for\(const alias of CCG_ALIASES\)out\.add\(alias\)/,"all CCG identity aliases must map to the CCG dossier name");
assert.match(hardening,/if\(!enemies\.has\(alias\)\|\|blocked\.has\(alias\)\)continue/,"only aliases that correspond to actual enemy dossier names should be persisted as blocks");

for(const id of ["LS-0823-25","LS-0823-26","LS-0823-27","LS-0823-28","LS-0823-33","LS-0823-34","LS-0823-35","LS-0823-36"])assert.ok(changelog.includes(id),`developer changelog is missing ${id}`);

console.log("Lost Sizzler V10.20/V10.23 onboarding, highlighted input guidance, automatic explanation flow, mobile visibility, return-to-options, gentle-opening and dossier identity regression checks passed.");
