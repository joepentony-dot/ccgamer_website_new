import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const metadata=read("js/v10-42-r69-recorded-voices.js");
const context={window:{}};
vm.runInNewContext(metadata,context,{filename:"v10-42-r69-recorded-voices.js",timeout:1200});
const original=context.window.CCG_RECORDED_VOICE_SPRITE;
const owner=context.window.CCG_OWNER_VOICE_SPRITE;
assert.ok(original?.cues&&original?.aliases,"previous R69 voice sprite and fallback remain intact");
assert.equal(original.src,"assets/audio/voice/ccg-recorded-voices-r69.ogg");
assert.ok(owner,"R169 local owner recorded voice data must initialise before the director");
assert.equal(owner.version,"R169");
assert.match(owner.src,/^assets\/audio\/voice\/ccg-owner-voices-r169\.ogg\?v=20261119r169$/);
assert.equal(Object.keys(owner.cues).length,170,"exactly 170 routed owner takes");
assert.equal(Object.keys(owner.aliases).length,124,"exactly 124 existing voice cue keys");
assert.equal(Object.keys(owner.alternates).length,42,"42 cue keys have alternate recorded takes");
assert.equal(owner.aliases.welcome,"vc001","normal run always uses the owner's new Welcome");
assert.equal(owner.aliases["npc.alchemist.ready"],"vc126","Essence-based Alchemist trade must use the new clip");
for(const key of Object.keys(owner.aliases)){
  const ids=owner.alternates[key]||[owner.aliases[key]];
  assert.equal(ids[0],owner.aliases[key],key+" first take must be the default");
  assert.equal(new Set(ids).size,ids.length,key+" alternate takes are unique");
  for(const id of ids)assert.ok(owner.cues[id],key+" references missing cue "+id);
}
assert.equal(Object.values(owner.alternates).reduce((n,clips)=>n+clips.length,0),88,
  "all 42 alternate groups must preserve their recorded takes");
assert.ok(!Object.keys(owner.aliases).some(key=>key.startsWith("npc.catalogue.")),
  "owner explicitly deferred all six NPC catalogue clips requiring new voice routing");
const allCues=Object.entries(owner.cues).sort((a,b)=>a[1].start-b[1].start);
let end=0;
for(const [key,cue] of allCues){
  assert.ok(Number.isFinite(cue.start)&&Number.isFinite(cue.duration)&&cue.duration>.3&&cue.duration<9.3,key+" clip duration");
  assert.ok(cue.start>=end-.002,key+" cue may not overlap the previous cue");
  end=cue.start+cue.duration;
}
assert.ok(end>370&&end<383,"voice sprite must cover approximately 382 seconds of owner audio");
const filename=path.join(root,"assets/audio/voice/ccg-owner-voices-r169.ogg");
assert.ok(fs.existsSync(filename),"committed R169 owner OGG file must exist; no release without playable asset");
const bytes=fs.readFileSync(filename);
assert.equal(bytes.length,1786006,"all owner OGG audio bytes must survive GitHub transfer");
assert.equal(crypto.createHash("sha256").update(bytes).digest("hex"),
  "fc4dbbdf2277da76a354b7135befcc19fdf51a0e421ffe2a67bb589cb74d6997",
  "production voice sprite byte-for-byte SHA-256");
assert.equal(bytes.subarray(0,4).toString("ascii"),"OggS","voice sprite must be Ogg");
assert.ok(bytes.includes(Buffer.from("OpusHead")),"voice sprite must use browser-compatible Opus");
const voice=read("js/v10-16-voice-director.js"),npc=read("js/v10-41-stage8-npc-dialogue.js");
assert.match(voice,/ownerCue\?owner:recordedAvailable/,"R169 local owner's sprite takes precedence over old sprite");
assert.match(voice,/ownerVoiceIndexes\.set\(key,ownerIndex\+1\)/,
  "owned alternate takes must rotate across repeated encounters");
assert.match(voice,/ownerAvailable\?playSprite\(key,priority\):false/,
  "existing routed game cues must use local owner recordings before any remote voice overrides");
assert.match(voice,/ownerAvailable\?playSprite\(voiceKey,priority\):false/,
  "existing routed NPC dialogues must use local owner recordings before any remote voice overrides");
assert.match(voice,/window\.CCG_OWNER_VOICE_SPRITE\?\.src/,"prime new voice sprite during real user gesture");
assert.match(npc,/if\(!ownerId\|\|!owner\?\.cues\?\.\[ownerId\]\)/,
  "obsolete R69 Alchemist suppression must not silence newly recorded correct Essence dialogue");
assert.doesNotMatch(voice,/SpeechSynthesisUtterance|speechSynthesis\.speak/,
  "owner voice integration must not reintroduce unreliable browser TTS");
console.log("PASS R169: 170 owner recordings / 124 routed keys / 42 alternate groups / SHA-256 / source precedence / six deferred catalogue clips");
