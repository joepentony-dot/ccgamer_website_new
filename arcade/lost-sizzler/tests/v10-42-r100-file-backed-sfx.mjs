import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const read=relative=>fs.readFileSync(path.join(repo,relative));

const sandbox={window:{}};
vm.runInNewContext(read("arcade/lost-sizzler/js/audio-assets.js").toString("utf8"),sandbox,{filename:"audio-assets.js"});
const sfx=sandbox.window.CCG_AUDIO_ASSETS?.sfx||{};

const required=Object.freeze({
  melee:"assets/audio/sfx/melee.wav",
  hazardwarn:"assets/audio/sfx/hazard-warning.wav",
  bladehit:"assets/audio/sfx/blade-hit.wav",
  chest:"assets/audio/sfx/chest-open.wav",
  creak:"assets/audio/sfx/creak.wav",
  pssst:"assets/audio/sfx/torch-extinguish.wav",
  fireplace:"assets/audio/sfx/fireplace.wav",
  woodhit:"assets/audio/sfx/wood-hit.wav",
  woodbreak:"assets/audio/sfx/wood-break.wav",
  bones:"assets/audio/sfx/bones.wav"
});

const hashes=new Map();
for(const [cue,relative] of Object.entries(required)){
  assert.equal(sfx[cue],relative,`${cue} must use the authored R100 WAV asset`);
  const absolute=path.join(repo,"arcade/lost-sizzler",relative);
  assert.ok(fs.existsSync(absolute),`R100 SFX asset missing: ${relative}`);
  const data=fs.readFileSync(absolute);
  assert.ok(data.length>=9000,`R100 SFX asset is suspiciously small: ${relative} (${data.length} bytes)`);
  assert.equal(data.subarray(0,4).toString("ascii"),"RIFF",`${relative} must be a RIFF WAV`);
  assert.equal(data.subarray(8,12).toString("ascii"),"WAVE",`${relative} must be a WAVE file`);
  assert.equal(data.subarray(12,16).toString("ascii"),"fmt ",`${relative} must expose a PCM fmt chunk first`);
  assert.equal(data.readUInt16LE(20),1,`${relative} must be uncompressed PCM`);
  assert.equal(data.readUInt16LE(22),1,`${relative} must be mono for low-latency gameplay playback`);
  assert.ok(data.readUInt32LE(24)>=22050,`${relative} sample rate must be at least 22.05 kHz`);
  assert.equal(data.readUInt16LE(34),16,`${relative} must use 16-bit PCM`);
  const hash=crypto.createHash("sha256").update(data).digest("hex");
  assert.ok(!hashes.has(hash),`${relative} duplicates ${hashes.get(hash)} instead of providing a distinct effect`);
  hashes.set(hash,relative);
}

const releaseAudit=read("arcade/lost-sizzler/tests/v10-42-release-content-audit.mjs").toString("utf8");
assert.ok(releaseAudit.includes("must resolve to a registered file-backed audio asset"),
  "release audit must describe file-backed SFX as release-critical");
assert.doesNotMatch(releaseAudit,/Object\.hasOwn\(audio\.sfx,cue\)\|\|synthesisedSfx\.has\(cue\)/,
  "release audit must not allow a procedural-only implementation to satisfy a live gameplay cue");

console.log("Dungeon R100 authored file-backed SFX quality contract passed.");
