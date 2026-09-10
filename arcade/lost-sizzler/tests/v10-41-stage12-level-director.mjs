import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-41-stage8-npc-dialogue.js"),"utf8");

assert.doesNotThrow(()=>new Function(source),"Stage 12 runtime module parses");

for(const token of[
  'id:"search-routes",min:1,max:2,cadence:4,maxEncounters:1,squad:1',
  'id:"split-patrols",min:3,max:5,cadence:3,maxEncounters:2,squad:1',
  'id:"crossfire-routes",min:6,max:8,cadence:3,maxEncounters:3,squad:2',
  'id:"lockdown-depths",min:9,max:Infinity,cadence:2,maxEncounters:4,squad:2',
  'function directedEncounterEligible(room,roomId)',
  'if(!soloDungeon()||!player||!directedEncounterEligible(room,roomId))return false;',
  'if(room.sanctuary||room.sigilRoom||room.sigilGreatHall||room.dangerous',
  'floorState.encounters>=profile.maxEncounters',
  '((Number(roomId)+floor*3)%profile.cadence)!==0',
  'levelDirectorEnemy:true',
  'const encounter=applyDirectedEncounter(player,roomId,room);'
]){
  assert.ok(source.includes(token),`missing Stage 12 contract: ${token}`);
}

for(const mode of['"horde-survivor"','"sizzler-saboteurs"']){
  assert.ok(source.includes(mode),`special-mode isolation missing for ${mode}`);
}

for(const protectedFlag of[
  "room.sanctuary",
  "room.sigilRoom",
  "room.sigilGreatHall",
  "room.arenaRoom",
  "room.timedRoom",
  "room.boulderRoom",
  "room.weightBridgeRoom",
  "room.memoryPuzzleRoom",
  "room.sequenceTorchRoom",
  "room.bloodClueRoom",
  "room.traderRoom",
  "room.developerRoom",
  "room.goldenRoom",
  "room.rareVortexPit"
]){
  assert.ok(source.includes(protectedFlag),`protected room flag missing: ${protectedFlag}`);
}

assert.equal((source.match(/Math\.random\(/g)||[]).length,0,"Stage 12 director must remain deterministic");
assert.equal((source.match(/setInterval\(/g)||[]).length,0,"Stage 12 director must not add polling");
assert.equal((source.match(/setTimeout\(/g)||[]).length,0,"Stage 12 director must not add timer work");

console.log("Stage 12 level director acceptance: PASS");
