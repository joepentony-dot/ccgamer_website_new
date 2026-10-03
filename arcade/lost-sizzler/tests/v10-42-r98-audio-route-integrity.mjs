import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const manifest=read("js/audio-assets.js");
const audio=read("js/audio.js");
const playlist=read("js/lost-sizzler-playlist-audio.js");
const overrides=read("js/admin-audio-overrides.js");
const owner=read("js/asset-overrides.js");
const core=read("js/game-core.js");
const local=read("js/game-local-runtime.js");
const play=read("js/game-play.js");
const ai=read("js/ai.js");

const assetPairs=[...manifest.matchAll(/\b([A-Za-z][A-Za-z0-9]*):"((?:assets\/audio\/)[^"]+)"/g)]
  .map(match=>({key:match[1],url:match[2]}));
assert.ok(assetPairs.length>=40,"Audio manifest must retain the authored Dungeon audio set.");
for(const {key,url} of assetPairs){
  const file=path.join(root,url);
  assert.ok(fs.existsSync(file),`Audio asset ${key} is missing: ${url}`);
  assert.ok(fs.statSync(file).size>0,`Audio asset ${key} is empty: ${url}`);
}

const requiredSfx={
  fire:"assets/audio/sfx/fire.wav",
  hit:"assets/audio/sfx/enemy-hit.wav",
  death:"assets/audio/sfx/enemy-death.wav",
  playerDeath:"assets/audio/sfx/player-death.wav",
  hurt:"assets/audio/sfx/player-hurt.wav",
  pickup:"assets/audio/sfx/item-pickup.wav",
  mainKey:"assets/audio/sfx/main-key-found.wav",
  exitSigil:"assets/audio/sfx/exit-sigil-found.wav",
  dash:"assets/audio/sfx/dash.wav",
  enemy:"assets/audio/sfx/enemy-attack.wav",
  alert:"assets/audio/sfx/alert.wav",
  search:"assets/audio/sfx/search.wav",
  flame:"assets/audio/sfx/flame.wav",
  heal:"assets/audio/sfx/heal.wav",
  empty:"assets/audio/sfx/empty-ammo.wav",
  respawn:"assets/audio/sfx/respawn.wav",
  door:"assets/audio/sfx/door-clunk.wav",
  dooropen:"assets/audio/sfx/door-open.wav",
  locked:"assets/audio/sfx/door-locked.wav",
  weapon:"assets/audio/sfx/weapon-upgrade.wav",
  armour:"assets/audio/sfx/armour-hit.wav",
  potion:"assets/audio/sfx/potion-use.wav",
  torch:"assets/audio/sfx/torch-light.wav",
  campwarn:"assets/audio/sfx/loiter-warning.wav",
  explosion:"assets/audio/sfx/explosion.wav",
  lowhealth:"assets/audio/sfx/low-health.wav",
  level:"assets/audio/sfx/level-up.wav",
  shrine:"assets/audio/sfx/shrine.wav",
  stalker:"assets/audio/sfx/stalker-sting.wav",
  trap:"assets/audio/sfx/trap.wav",
  generator:"assets/audio/sfx/generator.wav",
  secret:"assets/audio/sfx/secret-found.wav"
};
for(const [key,url] of Object.entries(requiredSfx)){
  assert.ok(manifest.includes(`${key}:"${url}"`),`Gameplay cue ${key} must remain routed to ${url}`);
}

const literalCalls=new Set();
for(const source of [core,local,play]){
  for(const match of source.matchAll(/(?:\bS|\bCCGSound|window\.CCGSound)\.sfx\(\s*["'`]([^"'`]+)["'`]/g))literalCalls.add(match[1]);
}
const synthKeys=new Set([...audio.matchAll(/(?:^|,)([A-Za-z][A-Za-z0-9]*):\(\)=>/g)].map(match=>match[1]));
const manifestKeys=new Set(assetPairs.map(row=>row.key));
for(const cue of literalCalls){
  assert.ok(synthKeys.has(cue)||manifestKeys.has(cue),`Gameplay SFX cue ${cue} has no active audio implementation.`);
}

for(const cue of ["alert","flame","heal","search"]){
  assert.ok(ai.includes(`,"${cue}",e)`),`AI notice cue ${cue} must remain explicitly routed.`);
  assert.ok(synthKeys.has(cue)||manifestKeys.has(cue),`AI notice cue ${cue} has no active audio implementation.`);
}

for(const [state,file] of Object.entries({
  normal:"assets/audio/music/exploration.wav",
  danger:"assets/audio/music/danger.wav",
  sanctuary:"assets/audio/music/sanctuary.wav",
  named:"assets/audio/music/named-enemy.wav",
  stalker:"assets/audio/music/count-loadula.wav"
})){
  assert.ok(manifest.includes(`${state}:"${file}"`),`Music state ${state} must retain its bundled fallback.`);
  assert.ok(playlist.includes(`"${state}"`),`Playlist controller must recognise music state ${state}.`);
}

assert.ok(owner.includes("js/admin-audio-overrides.js"),"Production owner must load uploaded/admin audio overrides.");
assert.ok(owner.includes("js/lost-sizzler-playlist-audio.js"),"Production owner must load the playlist controller.");
assert.ok(owner.indexOf("js/lost-sizzler-playlist-audio.js")<owner.indexOf("js/v10-42-bootstrap.js"),"Playlist controller must install before final V10.42 bootstrap readiness.");
for(const [prefix,state] of Object.entries({
  lostSizzlerExploration:"normal",
  lostSizzlerDanger:"danger",
  lostSizzlerSanctuary:"sanctuary",
  lostSizzlerNamed:"named",
  lostSizzlerStalker:"stalker"
})){
  assert.ok(overrides.includes(`${prefix}:"${state}"`),`Uploaded music prefix ${prefix} must resolve to ${state}.`);
}
assert.ok(playlist.includes('window.addEventListener("ccg:admin-audio-ready"'),"Late uploaded soundtrack readiness must refresh the active playlist.");
assert.ok(playlist.includes("custom.length)return custom"),"Uploaded/admin music must take priority over bundled fallback tracks.");

console.log("PASS R98 Dungeon audio assets, SFX routing and uploaded soundtrack ownership");
