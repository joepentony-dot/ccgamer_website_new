import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const source=read("js/v10-20-onboarding-safety.js");
const hardening=read("js/v10-20-onboarding-hardening.js");
const assets=read("js/asset-overrides.js");
const config=read("js/config.js");
const changelog=read("js/v10-18-expansion-changelog.js");

assert.match(assets,/CCG_ONBOARDING_SAFETY_REV/,"asset loader must expose a cache-busted onboarding revision");
assert.match(assets,/CCG_ONBOARDING_HARDENING_REV/,"asset loader must expose a cache-busted onboarding-hardening revision");
assert.match(assets,/v10-20-onboarding-safety\.js\?v=\$\{CCG_ONBOARDING_SAFETY_REV\}/,"onboarding safety script must be loaded by the game");
assert.match(assets,/v10-20-onboarding-hardening\.js\?v=\$\{CCG_ONBOARDING_HARDENING_REV\}/,"onboarding hardening must be loaded by the game");

assert.match(source,/floor===1\|\|depth\(host\.spiderNest\?\.roomId\)<=safeDepth\)clearSpiderNest\(\)/,"floor one must suppress the Dustweb spider nest");
assert.match(source,/floor===1\|\|depth\(host\.skeletonHorde\?\.roomId\)<=safeDepth\)clearSkeletonHorde\(\)/,"floor one must suppress the skeleton horde");
assert.match(source,/safeDepth=floor===1\?2:1/,"opening safety must cover the first two graph depths on floor one");
assert.match(source,/spawnCooldown=Math\.max\(Number\(g\.spawnCooldown\|\|0\),floor===1\?18000:12000\)/,"shallow monster generators must receive an extended opening cooldown");
assert.match(source,/c\.mimicChest=false;c\.mimicDormant=false/,"mimics must not ambush players inside the protected opening depth");
assert.match(source,/rare\?\.golden&&depth\(rare\.golden\.roomId\)<=safeDepth/,"Golden Room combat must not trigger in the protected opening depth");

assert.match(source,/Visit the Tutorial Zone\?/,"first-time players must be offered the tutorial");
assert.match(source,/I've Played Before — Skip/,"experienced players must be able to skip the tutorial");
assert.match(source,/Tutorial Zone/,"the tutorial must be replayable from the menu");
for(const phrase of ["MOVE AROUND","FIRE YOUR WEAPON","DASH","OPEN THE INVENTORY","OBJECTIVES, RADAR & HINTS","HEALTH, ARMOUR & QUICK ITEMS","KEYS, DOORS, CHESTS & SECRETS","ENEMIES, NAMED ENEMIES & THE STALKER","RARE EVENTS, SHOPS & SCORE","READY TO ENTER THE DUNGEON"]){
  assert.ok(source.includes(phrase),`tutorial is missing section: ${phrase}`);
}
assert.match(source,/if\(state\.active\)return false;return o\.apply\(this,arguments\)/,"tutorial players must be immune to accidental damage");
assert.match(source,/startWorld\(PGR\.floorSeed\(run\),split,false,false\)/,"completing or skipping live training must rebuild a real floor");
assert.match(source,/run\?\.daily\|\|playMode==="online"/,"ranked and online runs must not be converted into tutorial runs");

assert.match(hardening,/PGR\.makeRun\(\{difficulty,seed,daily:false\}\)/,"leaving training must reconstruct a pristine run from the same seed and difficulty");
assert.match(hardening,/score=0/,"tutorial score must be discarded before the real floor starts");
assert.match(hardening,/floorEntryCheckpoint=null/,"tutorial state must not create a real checkpoint");
assert.match(hardening,/wasTutorialActive&&!active/,"pristine reset must occur on the tutorial-active to real-run transition");

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

for(const id of ["LS-0823-25","LS-0823-26","LS-0823-27","LS-0823-28"])assert.ok(changelog.includes(id),`developer changelog is missing ${id}`);

console.log("Lost Sizzler V10.20 onboarding, gentle-opening, pristine-reset and dossier identity regression checks passed.");
