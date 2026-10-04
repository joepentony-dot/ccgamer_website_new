import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const tutorial=read("js/v10-23-tutorial-guidance.js");
assert.match(tutorial,/let highlightedControlSignature="";/,"R101 must track the active Tutorial control highlight");
assert.match(tutorial,/let highlightedInfoStep=-1;/,"R101 must track the active Tutorial information highlight");
assert.match(tutorial,/highlightedControlSignature===signature&&nodes\.length>0&&nodes\.every\(/,
  "R101 must not remove and re-add an unchanged live control highlight every 100 ms");
assert.match(tutorial,/highlightedInfoStep===numericStep&&entries\.length>0&&entries\.every\(/,
  "R101 must not rebuild an unchanged live information highlight every 100 ms");
assert.match(tutorial,/@media\(min-width:701px\)[\s\S]*?animation:none!important;filter:none!important;/,
  "desktop Tutorial highlights must remain non-animated");
assert.match(tutorial,/const timer=setInterval\(tick,100\);/,
  "Tutorial polling cadence changed unexpectedly; R101 should stabilise mutations rather than remove state polling");

const sandbox={window:{}};
vm.runInNewContext(read("js/v10-42-r69-recorded-voices.js"),sandbox,{filename:"v10-42-r69-recorded-voices.js"});
const sprite=sandbox.window.CCG_RECORDED_VOICE_SPRITE;
assert.ok(sprite?.src,"owner-recorded voice sprite must remain available");

const alchemistAliases={
  "npc.alchemist.empty":"bring-me-something-interesting",
  "npc.alchemist.partial":"bring-me-three-and-i-can-help-you-deal-with-the-stalker"
};
for(const [key,cue] of Object.entries(alchemistAliases)){
  assert.equal(sprite.aliases?.[key],cue,`${key} must route to the existing owner-recorded cue`);
  assert.ok(sprite.cues?.[cue],`owner-recorded cue missing for ${key}: ${cue}`);
}
assert.equal(sprite.aliases?.["npc.alchemist.ready"],undefined,
  "the obsolete artefact-era Flask trade recording must not be replayed for the current Essence mechanic");

const stage8=read("js/v10-41-stage8-npc-dialogue.js");
for(const key of [...Object.keys(alchemistAliases),"npc.alchemist.ready"]){
  assert.ok(stage8.includes(`voiceKey:"${key}"`),`live Stage 8 dialogue no longer uses expected voice key ${key}`);
}

console.log("Dungeon R101 Tutorial stability and recorded Alchemist voice-routing contract passed.");
