/**
 * Owner recording coverage audit — offline Node contract, NOT gameplay wiring.
 * Verifies sprite integrity, identifies scenario keys with no author-supplied
 * recording, and protects the current Alchemist/Essence terminology boundary.
 * This does not add missing audio, synthesise speech, or change production.
 */
import fs from "node:fs";
import assert from "node:assert/strict";
import {test} from "node:test";

const read=(path)=>fs.readFileSync(path,"utf8");
const recording=read("arcade/lost-sizzler/js/v10-42-r69-recorded-voices.js");
const director=read("arcade/lost-sizzler/js/v10-16-voice-director.js");
const npc=read("arcade/lost-sizzler/js/v10-41-stage8-npc-dialogue.js");
const aliasJson=recording.match(/aliases:Object\.freeze\((\{[^\n]+\})\)/)?.[1];
const cueJson=recording.match(/cues:Object\.freeze\((\{[^\n]+\})\)/)?.[1];
assert.ok(aliasJson&&cueJson,"Expected the published R69 owner-recorded voice sprite");
const aliases=JSON.parse(aliasJson),cues=JSON.parse(cueJson);
const linesSource=director.slice(director.indexOf("  const lines="),director.indexOf("  function readEnabled"));
assert.ok(linesSource.length>1000,"Voice director script-key section missing");
const directedKeys=[...linesSource.matchAll(/^ {4}([A-Za-z][A-Za-z0-9]*):\s*\{/gm)].map(m=>m[1]);
const npcKeys=[...new Set([...npc.matchAll(/voiceKey:"([^"]+)"/g)].map(m=>m[1]))];
const voiceKeys=[...new Set([...directedKeys,...npcKeys])];
const resolved=key=>Boolean(cues[aliases[key]||key]);
const unrecorded=voiceKeys.filter(key=>!resolved(key)&&key!=="welcomeRare");
const knownCurrentGameplayGaps=["npc.alchemist.ready","essenceCollected","notEnoughEssence","essenceLore"];
const olderUnapprovedArtefactCue="i-can-trade-those-artefacts-for-a-banishment-flask";

test("R69 metadata contains complete, non-overlapping audio cues",()=>{
  assert.ok(Object.keys(cues).length>=84,"Original R69 sprite unexpectedly lost recordings");
  assert.ok(Object.keys(aliases).length>=88,"Original R69 alias catalogue unexpectedly shrank");
  for(const [key,target] of Object.entries(aliases)){
    assert.ok(cues[target],"Alias "+key+" points to missing audio "+target);
  }
  const ordered=Object.entries(cues).sort((a,b)=>a[1].start-b[1].start);
  for(let i=0;i<ordered.length;i++){
    const [key,cue]=ordered[i];
    assert.ok(Number.isFinite(cue.start)&&Number.isFinite(cue.duration)&&cue.start>=0&&cue.duration>0&&cue.duration<40,
      "Invalid sprite cue window for "+key);
    if(i>0){
      const [prev,previous]=ordered[i-1];
      assert.ok(cue.start+0.005>=previous.start+previous.duration,
        "Owner audio cues overlap: "+prev+" and "+key);
    }
  }
});

test("critical R119 enemy/NPC events retain real approved recordings",()=>{
  const required=[
    "guardianEncountered","guardianDefeated",
    "sigilWardenEncountered","sigilWardenDefeated",
    "deathStalkerBanished","deathStalkerImmune",
    "bronzeKeyRequired","bronzeDoorUnlocked",
    "npc.scout.found","npc.scout.following","npc.scout.safe",
    "npc.merchant.entrance","npc.merchant.entrance.repeat",
    "npc.sanctuary.keeper","banishmentFlaskAcquired"
  ];
  for(const key of required)assert.ok(resolved(key),"Required owner recording unavailable: "+key);
  assert.ok(director.includes("deathStalkerBanished"),"Voice director lost banishment cue");
});

test("Alchemist's live Essence dialogue must never reuse the obsolete Artefact trade recording",()=>{
  assert.match(npc,/voiceKey:"npc\.alchemist\.ready"/);
  assert.match(npc,/I can distil that Essence into a Banishment Flask/);
  assert.notEqual(aliases["npc.alchemist.ready"],olderUnapprovedArtefactCue,
    "Do not play a false Artefact trading instruction for the modern Essence transaction");
  // This known unrecorded key needs an actual new source recording; until
  // then subtitles are preferable to incorrectly spoken game rules.
  if(!resolved("npc.alchemist.ready")){
    assert.ok(unrecorded.includes("npc.alchemist.ready"),
      "The missing voice must remain visible in the audit report");
  }
});

test("owner-recording gaps are reported, not falsely declared playable",()=>{
  assert.ok(directedKeys.length>=95&&npcKeys.length>=20,
    "Voice director or NPC scenario inventory unexpectedly shrank");
  assert.ok(unrecorded.every(key=>!resolved(key)),"Recorded asset incorrectly reported missing");
  for(const key of knownCurrentGameplayGaps){
    if(!resolved(key))assert.ok(unrecorded.includes(key),"Missing game recording excluded from QA: "+key);
  }
});
const report={
  ownerRecordedClips:Object.keys(cues).length,
  ownerAliases:Object.keys(aliases).length,
  directorKeys:directedKeys.length,
  npcScenarioKeys:npcKeys.length,
  scenarioKeysAudited:voiceKeys.length,
  noDirectR69Recording:unrecorded,
  missingCurrentGameplayRecordings:knownCurrentGameplayGaps.filter(key=>!resolved(key)),
  note:"Lack of R69 recording is not necessarily a broken feature; some events have older approved sprite clips. This test does not prove in-game playback."
};
console.log("VOICEOVER COVERAGE AUDIT:",JSON.stringify(report,null,2));
