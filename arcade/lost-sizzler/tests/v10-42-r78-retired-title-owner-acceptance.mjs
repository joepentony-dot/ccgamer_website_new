import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const config=read("js/config.js");
const core=read("js/game-core.js");
const voice=read("js/v10-16-voice-director.js");
const paywall=read("js/v10-42-demo-paywall.js");
const zero=read("js/v10-42-zero-server-release.js");
const render=read("js/game-render.js");
const play=read("js/game-play.js");
const mapDeath=read("js/v10-42-r72-map-death-feedback.js");
const procedural=read("js/v10-42-procedural-overhaul.js");
const rpgExpansion=read("js/v10-42-r23-rpg-build-expansion.js");
const index=read("index.html");

assert.match(config,/name:"C64 Dungeon Carnage — Fifteen Floors"/,
  "campaign config must expose the current fifteen-floor C64 Dungeon Carnage name");
assert.doesNotMatch(config,/name:"(?:The Lost Sizzler — Five Depths|C64 Dungeon Carnage — Five Depths)"/,
  "retired five-floor campaign names must not remain player-facing");

assert.match(core,/run\.floor>=C\.maxFloors&&!run\.dailyFailed\?"CITADEL CLEARED"/,
  "full-run completion must use the current Citadel completion banner");
assert.doesNotMatch(core,/THE LOST SIZZLER RECOVERED/,
  "retired completion banner must not survive");

assert.match(voice,/welcome:\{text:"Welcome to C64 Dungeon Carnage\. Good luck down there\."/,
  "default welcome voice fallback must name C64 Dungeon Carnage");
assert.match(voice,/welcomeRare:\{text:"Welcome to C64 Dungeon Carnage\. Good luck down there\."/,
  "rare welcome voice fallback must name C64 Dungeon Carnage");
assert.doesNotMatch(voice,/Welcome to The Lost Sizzler/,
  "retired spoken title must not survive in active voice fallbacks");

assert.match(paywall,/C64 Dungeon Carnage is permanently unlocked/,
  "owned-game presentation must use the current title");
assert.match(paywall,/Unlock C64 Dungeon Carnage permanently/,
  "unlock presentation must use the current title");
assert.doesNotMatch(paywall,/The Lost Sizzler/,
  "active purchase/entitlement presentation must not expose the retired title");

assert.match(zero,/Online multiplayer is not part of the C64 Dungeon Carnage browser release\./,
  "retired multiplayer error must use the current game identity");
assert.doesNotMatch(zero,/zero-server-cost Lost Sizzler release/,
  "retired game name must not surface through the multiplayer rejection");

for(const id of ["threshold-stone","drive-steel","iron-keep","budget-amber","cartridge-green","tape-violet","crypt-moss","demo-magenta","modem-cyan","sid-red","ember-orange","foundry-copper","score-gold","crt-green","blood-citadel"]){
  assert.ok(render.includes(`id:"${id}"`),`fifteen-floor owner acceptance must retain palette ${id}`);
}
assert.ok(play.includes("MEMORY VAULT LOCKDOWN"),
  "owner acceptance must retain Memory Vault chamber lockdown");
assert.ok(play.includes("MEMORY SEQUENCE SOLVED"),
  "owner acceptance must retain Memory Vault completion feedback");
assert.ok(mapDeath.includes("YOU DIED"),
  "owner acceptance must retain explicit death feedback");
assert.ok(index.includes("radar-sanctuary")&&index.includes("SANCTUARY"),
  "owner acceptance must retain Sanctuary map identity in the public tactical radar");

assert.match(play,/showToast\("LOCKED BRONZE DOOR","You need a bronze key\./,
  "locked bronze doors must give explicit visual key-required feedback");
assert.match(play,/showToast\("LOCKED CHEST","A bronze key opens it\./,
  "locked chests must give explicit visual key-required feedback");
assert.match(voice,/bronzeKeyRequired:\{text:"Bronze key required\."/,
  "locked bronze door feedback must retain the spoken key-required cue");
assert.match(voice,/chestKeyRequired:\{text:"You need a key to open this chest\."/,
  "locked chest feedback must retain the spoken key-required cue");
assert.match(voice,/LOCKED BRONZE DOOR.*return"bronzeKeyRequired"/s,
  "toast voice classifier must route locked bronze doors to the key-required cue");
assert.match(voice,/LOCKED CHEST.*return"chestKeyRequired"/s,
  "toast voice classifier must route locked chests to the key-required cue");

assert.match(procedural,/statId==="vitality"\)\{player\.maxHealth\+=1;player\.health=Math\.min\(player\.maxHealth,player\.health\+1\)\}/,
  "Vitality must increase maximum health and heal immediately");
assert.match(procedural,/statId==="agility"\)player\.moveMultiplier=\(player\.moveMultiplier\|\|1\)\*\.97/,
  "Agility must reduce movement delay through the canonical movement multiplier");
assert.match(play,/C\.player\.moveDelay\*\(p1\.moveMultiplier\|\|1\)/,
  "keyboard movement must consume the Agility movement multiplier");
assert.match(procedural,/statId==="endurance"\)\{player\.maxMana\+=14;player\.mana=Math\.min\(player\.maxMana,player\.mana\+14\);player\.armor=Math\.min\(12,\(player\.armor\|\|0\)\+1\)\}/,
  "Endurance must increase ammunition reserve, refill ammunition and grant armour");
assert.match(procedural,/const player=currentPlayer\(\),luck=Math\.max\(0,stat\(player,"luck"\)-RPG_BASE\),boost=luck\*1\.35/,
  "Luck must feed generated chest-loot depth rather than remain display-only");
assert.match(procedural,/const arcana=Math\.max\(0,stat\(player,"arcana"\)-RPG_BASE\),reveal=player\?\.sigilReveal\?2\+Math\.floor\(arcana\/3\):0/,
  "Arcana must improve Sigil Reveal sight");
assert.match(procedural,/player\.v142WardCooldownMs=Math\.max\(14000,30000-\(after-RPG_BASE\)\*1800\)/,
  "Arcana must reduce Ward cooldown");
assert.match(rpgExpansion,/agility:Object\.freeze[\s\S]*dashDamage=Math\.max\(0,Number\(player\.dashDamage\)\|\|0\)\+1/,
  "AGI 10 specialisation must add dash contact damage");
assert.match(rpgExpansion,/endurance:Object\.freeze[\s\S]*player\.maxMana=Math\.max\(1,Number\(player\.maxMana\)\|\|1\)\+40/,
  "END 10 specialisation must add the advertised ammunition reserve");
assert.match(rpgExpansion,/arcana:Object\.freeze[\s\S]*player\.v142SightBonus=Math\.max\(0,Number\(player\.v142SightBonus\)\|\|0\)\+1/,
  "ARC 10 specialisation must add permanent sight");

console.log("Dungeon R78 retired-title cleanup and owner-acceptance contract passed.");
