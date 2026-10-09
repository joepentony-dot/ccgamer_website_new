import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {test} from "node:test";

const read=path=>fs.readFileSync(path,"utf8");
const dialogueSource=read("arcade/lost-sizzler/js/v10-41-stage8-npc-dialogue.js");
const recordings=read("arcade/lost-sizzler/js/v10-42-r69-recorded-voices.js");
const aliasText=recordings.match(/aliases:Object\.freeze\((\{[^\n]+\})\)/)?.[1];
assert.ok(aliasText,"R69 sprite aliases not found");
const canonicalAliases=JSON.parse(aliasText);

const start=dialogueSource.indexOf("  function speakDialogueLine(");
const end=dialogueSource.indexOf("  function queueDialogueSubtitleBehindActiveToast(",start);
assert.ok(start>0&&end>start,"Expected the real NPC voice entry point");
const source=dialogueSource.slice(start,end);

function harness(aliases){
  const spoken=[];
  const window={
    CCG_RECORDED_VOICE_SPRITE:{aliases},
    CCGLostSizzlerVoice:{
      sayDialogue(key,text,options){spoken.push({key,text,options});return true}
    }
  };
  const run=vm.runInNewContext(source+"\nspeakDialogueLine",{window,REPEAT_MS:7000});
  return {run,spoken};
}

test("outdated Alchemist Artefact recordings are silent while accurate Essence subtitles stay wired",()=>{
  assert.equal(canonicalAliases["npc.alchemist.partial"],
    "bring-me-three-and-i-can-help-you-deal-with-the-stalker",
    "Fixture only applies while the old incorrect owner recording exists");
  const h=harness(canonicalAliases);
  const line={voiceKey:"npc.alchemist.partial",text:"Bring me enough Essence and I can help you deal with the Stalker."};
  assert.equal(h.run(line),false);
  assert.equal(h.spoken.length,0,"Do not announce the wrong three-Artefact rule");
  assert.ok(dialogueSource.includes('text:"Bring me enough Essence and I can help you deal with the Stalker."'),
    "Accurate subtitle text must remain available in the NPC presentation");
  assert.ok(dialogueSource.includes("const spoken=speakDialogueLine(line),deferred=queueDialogueSubtitleBehindActiveToast(line,spoken)"),
    "Silent recording must not block NPC text presentation");
});
test("accidentally attaching the retired Artefact-ready clip cannot reintroduce false speech",()=>{
  const aliases={...canonicalAliases,
    "npc.alchemist.ready":"i-can-trade-those-artefacts-for-a-banishment-flask"};
  const h=harness(aliases);
  assert.equal(h.run({voiceKey:"npc.alchemist.ready",text:"I can distil that Essence into a Banishment Flask."}),false);
  assert.equal(h.spoken.length,0);
});
test("correct new owner-recorded Essence clip will be eligible without a future code patch",()=>{
  const aliases={...canonicalAliases,
    "npc.alchemist.partial":"bring-me-some-banishment-essence",
    "npc.alchemist.ready":"i-can-distil-your-banishment-essence"};
  const h=harness(aliases);
  assert.equal(h.run({voiceKey:"npc.alchemist.partial",text:"Bring me Banishment Essence."}),true);
  assert.equal(h.run({voiceKey:"npc.alchemist.ready",text:"I can distil your Essence."}),true);
  assert.deepEqual(h.spoken.map(x=>x.key),
    ["npc.alchemist.partial","npc.alchemist.ready"]);
});
test("unaffected NPC recordings still dispatch with existing priorities",()=>{
  const h=harness(canonicalAliases);
  for(const key of ["npc.alchemist.empty","npc.merchant.entrance","npc.scout.found","npc.sanctuary.keeper"]){
    assert.equal(h.run({voiceKey:key,text:"Test encounter line"}),true);
  }
  assert.equal(h.spoken.length,4);
  assert.equal(h.spoken[0].options.cooldown,7000);
  assert.equal(h.spoken[0].options.interrupt,false);
});
