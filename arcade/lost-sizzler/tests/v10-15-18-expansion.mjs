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
const loader=read("js/asset-overrides.js");
const weekly=read("js/weekly-challenge.js");
const edge=fs.readFileSync(path.join(repo,"supabase/functions/ccq-weekly-challenge/index.ts"),"utf8");

for(const token of ["mimicChest","cursedCartridge","wanderingMerchant","goldenRoom","lostAdventurer","DUNGEON TREMOR","possessedCabinet","treasureBat","taxman","mysteryPotion","developerRoom","DUNGEON BOUNTY","treasureMap","rareMutation"]){
  assert.match(rare,new RegExp(token),`rare event is present: ${token}`);
}
assert.match(rare,/HINT_STAGE_MS=\[75000,120000,180000\]/,"objective hints escalate at 75s, 120s and 180s without progress");
assert.match(rare,/RADAR HINT/,"final objective hint marks the radar");
assert.match(balance,/DOUBLE GOLD/,"double-gold mutation is enforced at pickup time");
assert.match(balance,/NO SHOPPING/,"no-shopping mutation blocks floor traders");
assert.match(balance,/ELITE BOUNTY/,"elite-bounty mutation pays on elite kills");

assert.match(voice,/SpeechSynthesisUtterance/,"voice director has browser speech fallback");
assert.match(voice,/VOICE ON/,"voice prompts can be disabled by the player");
assert.match(voice,/activePriority/,"voice prompts use priorities");
assert.match(voice,/cooldown/,"voice prompts use cooldowns");
for(const token of ["welcome","hurt","lowHealth","objectiveHint","deathStalker","gildedElf","weeklyDeath"]){
  assert.match(voice,new RegExp(`${token}:`),`core voice cue exists: ${token}`);
}
for(const token of ["mimic","taxman","treasureBat","goldenRoom","developerRoom","weeklyGhost","respawn"]){
  assert.match(voiceExpansion,new RegExp(`${token}:`),`rare-event voice cue exists: ${token}`);
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
assert.match(edge,/slice\(0,360\)/,"weekly ghost route size is bounded");

console.log("V10.15–V10.18 rare events, hints, weekly ghost and voice regression checks passed");
