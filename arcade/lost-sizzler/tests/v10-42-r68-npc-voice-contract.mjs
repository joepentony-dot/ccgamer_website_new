import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const voice=fs.readFileSync(path.join(root,"js/v10-16-voice-director.js"),"utf8");
const expansion=fs.readFileSync(path.join(root,"js/v10-17-voice-expansion.js"),"utf8");
const dialogue=fs.readFileSync(path.join(root,"js/v10-41-stage8-npc-dialogue.js"),"utf8");
const bootstrap=fs.readFileSync(path.join(root,"js/v10-42-bootstrap.js"),"utf8");

assert.match(bootstrap,/\["v10-16-voice-director\.js","CCGLostSizzlerVoice"\]/,"ordered bootstrap must load the voice director before Stage 8 dialogue");
assert.match(bootstrap,/\["v10-17-voice-expansion\.js","CCGLostSizzlerVoiceExpansion"\]/,"ordered bootstrap must load the voice expansion before Stage 8 dialogue");
assert.ok(bootstrap.indexOf('"v10-16-voice-director.js"')<bootstrap.indexOf('"v10-41-stage8-npc-dialogue.js"'),"voice director must initialise before Stage 8 NPC dialogue");

assert.match(voice,/function sayDialogue\(key,text,opts=\{\}\)/,"R68 must expose arbitrary NPC dialogue through the existing voice owner");
assert.match(voice,/say:sayKey,sayDialogue,stop:stopActive/,"the public voice API must export the bounded dialogue path");
assert.match(voice,/meta\?\.ccgDialogueVoiceHandled!==true/,"generic V10.16 toast voice classification must skip already-spoken character dialogue");
assert.match(expansion,/meta\?\.ccgDialogueVoiceHandled!==true/,"V10.17 rare-event voice classification must also skip handled dialogue");
assert.match(expansion,/if\(window\.CCGLostSizzlerVoiceExpansion\)return;[\s\S]*const voice=window\.CCGLostSizzlerVoice;[\s\S]*if\(!voice\?\.lines\|\|typeof voice\.say!=="function"\)return;[\s\S]*window\.__CCG_LOST_SIZZLER_VOICE_EXPANSION_V117__=true;/,"V10.17 must not permanently claim its load guard before the voice director dependency exists");
assert.match(dialogue,/function speakDialogueLine\(line,/,"Stage 8 must route character lines through one reusable voice bridge");
assert.match(dialogue,/voice\.sayDialogue\(line\.voiceKey,line\.text/,"Stage 8 must pass the stable voice key and actual NPC text to the existing voice owner");
assert.match(dialogue,/ccgDialogueVoiceHandled:true/,"spoken NPC toasts must suppress duplicate generic voice classification");
assert.doesNotMatch(dialogue,/\bsetInterval\s*\(/,"NPC voice integration must not add a polling interval");
assert.doesNotMatch(dialogue,/\brequestAnimationFrame\s*\(/,"NPC voice integration must not add a new frame owner");

for(const key of ["npc.scout.found","npc.scout.following","npc.scout.safe","npc.merchant.entrance","npc.merchant.hidden","npc.sanctuary.keeper"]){
  assert.ok(dialogue.includes(`voiceKey:"${key}"`),`missing stable R68 NPC voice key: ${key}`);
}

console.log("C64 Dungeon Carnage R68 NPC dialogue voice static contract passed.");
