import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const voiceCode=fs.readFileSync(path.join(root,"js/v10-16-voice-director.js"),"utf8");
const spritePath=path.join(root,"assets/audio/voice/lost-sizzler-voices.ogg");
const sprite=fs.readFileSync(spritePath);

assert.match(voiceCode,/src:"assets\/audio\/voice\/lost-sizzler-voices\.ogg"/,"runtime must load the completed Ogg voice sprite");
const cueBlock=voiceCode.match(/cues:\{([\s\S]*?)\r?\n    \}\r?\n  \};/)?.[1]||"";
const cues=[...cueBlock.matchAll(/([A-Za-z][A-Za-z0-9]*):\{start:([\d.]+),duration:([\d.]+)\}/g)].map(match=>({key:match[1],start:Number(match[2]),duration:Number(match[3])}));
const expectedOrder=["welcome","welcomeRare","hurt","lowHealth","noAmmo","objectiveNear","floorClear","gameOver","playerDeath","respawn","rareLoot","levelUp","shop","sanctuary","secret","trap","boulder","merchantGone","adventurerSaved","cabinet","cabinetFail","cabinetWin","bounty","buriedCache","loadula","cursed","deathStalker","developerRoom","bountyStart","tremor","mutation","gildedElf","gildedCaught","gildedEscaped","gildedFive","goldenRoom","adventurer","mysteryPotion","namedEnemy","objectiveHint","taxman","treasureBat","treasureMap","merchant","weeklyGhost","weeklyReset","weeklyDeath","weeklyWelcome","mimic"];
assert.equal(cues.length,49,"recorded voice sprite must expose all 49 cues");
assert.deepEqual(cues.map(cue=>cue.key),expectedOrder,"recorded cue order must match the physical sprite order");
let expectedStart=.16;
for(const cue of cues){
  assert.ok(Math.abs(cue.start-expectedStart)<.0011,`${cue.key} must begin after the intended 160 ms separator`);
  assert.ok(cue.duration>.6,`${cue.key} must have a usable positive duration`);
  expectedStart=cue.start+cue.duration+.16;
}

assert.equal(sprite.subarray(0,4).toString("ascii"),"OggS","voice sprite must be an Ogg container");
let offset=0,pages=0,serial=null,lastSequence=-1,lastGranule=0n,preSkip=0,eos=false;
while(offset<sprite.length){
  assert.ok(offset+27<=sprite.length,`truncated Ogg header at byte ${offset}`);
  assert.equal(sprite.subarray(offset,offset+4).toString("ascii"),"OggS",`invalid Ogg capture pattern at byte ${offset}`);
  assert.equal(sprite[offset+4],0,"unsupported Ogg stream version");
  const pageSerial=sprite.readUInt32LE(offset+14),sequence=sprite.readUInt32LE(offset+18),segments=sprite[offset+26];
  const tableEnd=offset+27+segments;
  assert.ok(tableEnd<=sprite.length,`truncated Ogg segment table at byte ${offset}`);
  let bodyLength=0;for(let index=0;index<segments;index++)bodyLength+=sprite[offset+27+index];
  const bodyEnd=tableEnd+bodyLength;
  assert.ok(bodyEnd<=sprite.length,`truncated Ogg page body at byte ${offset}`);
  if(pages===0){
    serial=pageSerial;
    assert.equal(sprite.subarray(tableEnd,tableEnd+8).toString("ascii"),"OpusHead","voice sprite must contain Opus audio");
    preSkip=sprite.readUInt16LE(tableEnd+10);
  }else{
    assert.equal(pageSerial,serial,"voice sprite must remain in one logical Ogg stream");
    assert.equal(sequence,lastSequence+1,"Ogg page sequence must be continuous");
  }
  lastSequence=sequence;
  const granule=sprite.readBigUInt64LE(offset+6);
  if(granule!==0xffffffffffffffffn){assert.ok(granule>=lastGranule,"Ogg granule positions must not run backwards");lastGranule=granule}
  eos||=Boolean(sprite[offset+5]&4);
  offset=bodyEnd;pages++;
}
assert.equal(offset,sprite.length,"Ogg parser must consume the complete sprite without trailing or missing bytes");
assert.ok(eos,"voice sprite must finish with an Ogg end-of-stream page");
assert.ok(pages>100,"voice sprite must contain the complete recorded bank rather than a short placeholder");
const duration=(Number(lastGranule)-preSkip)/48000;
const finalCueEnd=cues.at(-1).start+cues.at(-1).duration;
assert.ok(Math.abs(duration-finalCueEnd)<.01,`sprite duration ${duration.toFixed(6)} must cover the final cue ending at ${finalCueEnd.toFixed(6)}`);
assert.equal(createHash("sha256").update(sprite).digest("hex"),"c09aa9fb584d0d36be1feb17899607f262a62f67ebdb1f612d2d1833df4cf22b","voice sprite checksum must match the verified 49-cue bank");

const base64Files=[];
const walk=directory=>{for(const entry of fs.readdirSync(directory,{withFileTypes:true})){const full=path.join(directory,entry.name);if(entry.isDirectory())walk(full);else if(/\.b64(?:\.txt)?$/i.test(entry.name))base64Files.push(full)}};
walk(path.join(root,"assets/audio/voice"));
assert.deepEqual(base64Files,[],"temporary base64 voice-transfer files must not ship");

console.log("Lost Sizzler 49-cue recorded voice sprite integrity checks passed.");
