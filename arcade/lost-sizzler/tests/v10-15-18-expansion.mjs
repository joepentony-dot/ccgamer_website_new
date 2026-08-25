import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameDir=path.resolve(here,"..");
const repo=path.resolve(gameDir,"../..");
const read=relative=>fs.readFileSync(path.join(gameDir,relative),"utf8");

const rare=read("js/v10-15-rare-events.js");
const balance=read("js/v10-15-rare-events-balance.js");
const voice=read("js/v10-16-voice-director.js");
const voiceExpansion=read("js/v10-17-voice-expansion.js");
const completeVoiceSystem=`${voice}\n${voiceExpansion}`;
const loader=read("js/asset-overrides.js");
const weekly=read("js/weekly-challenge.js");
const edge=fs.readFileSync(path.join(repo,"supabase/functions/ccq-weekly-challenge/index.ts"),"utf8");

for(const token of ["mimicChest","cursedCartridge","wanderingMerchant","goldenRoom","lostAdventurer","DUNGEON TREMOR","possessedCabinet","treasureBat","taxman","mysteryPotion","developerRoom","DUNGEON BOUNTY","treasureMap","rareMutation"]){
  assert.match(rare,new RegExp(token),`rare event is present: ${token}`);
}
assert.match(rare,/HINT_STAGE_MS=\[300000\]/,"the objective radar hint must be a single event after five minutes of inactive exploration");
assert.match(rare,/ACTIVE_MOVEMENT_WINDOW_MS=5000/,"objective-hint time must accumulate only while the player is actively walking");
assert.match(rare,/enemyEncounter[\s\S]*?resetHintInactivity\(\)/,"an enemy encounter must reset the lost-player hint timer");
assert.match(rare,/function noteActivity\(\)/,"pickups must expose an activity reset for the lost-player hint timer");
assert.match(rare,/now-state\.lastMoveAt>ACTIVE_MOVEMENT_WINDOW_MS/,"standing still must not accumulate the five-minute walking timer");
assert.match(rare,/objective\.type==="keys"[\s\S]*?i\.kind==="key"/,"a required main-vault-key objective must point only to a main key");
assert.match(rare,/if\(!host\.exitSigilCollected\)[\s\S]*?i\.kind==="exitSigil"/,"completed main objectives must point to the Exit Sigil next");
assert.match(rare,/return\{x:world\.exit\.x,y:world\.exit\.y,label:"FLOOR EXIT"\}/,"the floor exit must be the final hint target after the sigil is collected");
assert.doesNotMatch(rare,/label:"SWITCH"/,"lost-player hints must never point at optional switches");
assert.match(rare,/state\.hintTarget=\{\.\.\.t\}[\s\S]*?showToast\("RADAR HINT"/,"the objective marker and lost-player voice event must be activated together");
assert.match(rare,/Are you getting lost\? Better check your radar\./,"the single five-minute hint must use the requested radar wording");
assert.match(rare,/const target=Math\.max\(1,Math\.min\(50,eligible\.length\)\)/,"each floor bounty must require 50 kills or every eligible enemy when fewer exist");
assert.match(rare,/type:`KILL \$\{target\} ENEMIES`/,"the bounty banner must state its computed enemy target");
assert.match(rare,/BOUNTY_ANNOUNCE_DELAY_MS=20000/,"the bounty must wait for 20 seconds of active play");
assert.match(rare,/state\.activePlayMs\+=Math\.max\(0,Number\(dt\|\|0\)\)/,"only active gameplay time may advance the bounty announcement");
assert.match(rare,/state\.activePlayMs>=BOUNTY_ANNOUNCE_DELAY_MS/,"the bounty must not appear before its active-play delay");
assert.match(rare,/spoken=Boolean\(voice\.say\("bountyStart",\{cooldown:0\}\)\)[\s\S]*?if\(!voiceRequired\|\|expired\|\|spoken\)\{b\.announced=true;showToast\(`DUNGEON BOUNTY/ ,"the voice must be accepted before the matching bounty popup is dispatched");
assert.match(rare,/DUNGEON BOUNTY — \$\{remaining\} \$\{noun\} LEFT/,"each bounty kill must publish a visible enemies-remaining countdown");
assert.match(rare,/MUTATION_ACTIVATION_DELAY_MS=120000/,"floor mutations must wait for two minutes of active play");
assert.match(rare,/state\.activePlayMs<MUTATION_ACTIVATION_DELAY_MS/,"mutation effects must remain dormant before their delay");
assert.doesNotMatch(voiceExpansion,/DUNGEON BOUNTY\(\?! COMPLETE\)/,"generic toast classification must not trigger an out-of-sync bounty announcement");
assert.match(rare,/Number\(run\.stats\?\.kills\|\|0\)-b\.startKills/,"bounty progress must count kills made on the current floor only");
assert.match(balance,/DOUBLE GOLD/,"double-gold mutation is enforced at pickup time");
assert.match(balance,/NO SHOPPING/,"no-shopping mutation blocks floor traders");
assert.match(balance,/ELITE BOUNTY/,"elite-bounty mutation pays on elite kills");

assert.match(voice,/SpeechSynthesisUtterance/,"voice director has browser speech fallback");
assert.match(voice,/function tutorialSilent\(\)/,"tutorial mode must silence all recorded and browser speech prompts");
assert.match(voice,/cooldown:120000/,"the low-ammo voice cue must retain a long secondary cooldown");
assert.match(voice,/hadGun&&before>0&&after===0/,"the ammunition warning must require a real gun to expend its final round");
assert.doesNotMatch(voice,/ammo<=8|lowAmmoWarned/,"the ammunition warning must never be polled from the starting sword state");
assert.match(voice,/key==="rareLoot"&&currentFloor>0&&state\.rareLootFloor===currentFloor/,"rare-loot speech must be limited to its first occurrence on each floor");
assert.match(voice,/state\.rareLootFloor=currentFloor/,"the voice director must remember the floor where rare loot was first announced");
assert.match(voice,/if\(\/RADAR HINT\/\.test\(s\)\)return"objectiveHint"/,"the lost-player speech cue must only be triggered by the paired radar hint event");
assert.match(voice,/function voiceVolume\(key\)\{return key==="hurt" \? \.56 : \.72\}/,"all speech must be 20 percent lower and the Ow cue must be quieter again");
assert.match(voice,/lowHealth:\{text:"I need to heal\.",priority:35,cooldown:0\}/,"low health must use one concise requested reminder");
assert.match(voice,/!state\.lowHealthLatch\.has\(player\)/,"a continuous low-health episode must not repeat its reminder");
assert.match(voice,/createMediaElementSource\(audio\)/,"recorded main-game voice must pass through the dungeon effect graph");
assert.match(voice,/createConvolver\(\)/,"the dungeon voice graph must include restrained room ambience");
assert.match(voice,/wet\.gain\.value=\.12/,"dungeon ambience must remain subtle rather than obscuring speech");
assert.match(voice,/hurt:\{text:"Ow!",priority:8,cooldown:30000\}/,"Ow must have the requested 30-second gap");
assert.match(voice,/painPlayed=after<before\?sayKey\("hurt"\):false/,"damage handling must request Ow only after real health or armour loss");
assert.match(voice,/deathsAfter>deathsBefore\)setTimeout\(\(\)=>sayKey\("playerDeath"\),painPlayed\?800:0\)/,"the death line must wait for a played Ow cue and remain non-layered");
assert.match(voice,/if\(state\.active\)\{const mayInterrupt=/,"a busy voice channel must make an immediate skip-or-interrupt decision");
assert.doesNotMatch(voice,/queue\.push|function pump\(/,"voice events must never build a playback backlog");
assert.match(voice,/speechSynthesis\.cancel\(\)/,"browser speech must flush any hidden browser queue before playback");
assert.match(voice,/deathStalkerEncounterVisible\(\)/,"Death Stalker speech must require a live same-room encounter");
assert.match(voice,/loadulaEncounterVisible\(\)/,"Count Loadula speech must require a live same-room encounter");
assert.doesNotMatch(voiceExpansion,/hurtPlayer=function/,"the expansion layer must not add a second death or respawn speech path");
assert.match(voice,/VOICE ON/,"voice prompts can be disabled by the player");
assert.match(voice,/activePriority/,"voice prompts use priorities");
assert.match(voice,/cooldown/,"voice prompts use cooldowns");
for(const token of ["welcome","hurt","lowHealth","objectiveHint","deathStalker","gildedElf","weeklyDeath"]){
  assert.match(voice,new RegExp(`${token}:`),`core voice cue exists: ${token}`);
}
for(const token of ["mimic","taxman","treasureBat","goldenRoom","developerRoom","weeklyGhost","respawn"]){
  assert.match(completeVoiceSystem,new RegExp(`${token}:`),`rare-event voice cue exists in the complete voice system: ${token}`);
}

assert.match(loader,/v10-15-rare-events\.js\?v=/,"rare-event layer is cache-busted and loaded");
assert.match(loader,/v10-15-rare-events-balance\.js\?v=/,"rare-event balance layer is loaded");
assert.match(loader,/v10-16-voice-director\.js\?v=/,"voice director is loaded");
assert.match(loader,/v10-17-voice-expansion\.js\?v=/,"rare-event voice expansion is loaded");
assert.match(loader,/v10-18-expansion-changelog\.js\?v=/,"developer-log expansion is loaded");

assert.match(weekly,/refreshGhost/,"weekly client retrieves a real ghost replay");
assert.match(weekly,/ccg-weekly-ghost-preview/,"weekly ghost data is cached only for the active browser session");
assert.match(edge,/action===\"ghost\"/,"weekly edge function exposes the ghost action");
assert.match(edge,/ghostPath\(result\.ghostPath\)/,"weekly finish stores a sanitised ghost route");
assert.match(edge,/const MAX_GHOST_POINTS = 900/,"weekly ghost route keeps the reconciled bounded replay ceiling");
assert.match(edge,/value\.slice\(0,MAX_GHOST_POINTS\)/,"weekly ghost route is truncated through the declared bound");

console.log("V10.15–V10.18 rare events, hints, weekly ghost and voice regression checks passed");
