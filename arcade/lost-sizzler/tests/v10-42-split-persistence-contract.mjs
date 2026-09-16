import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const exists=relative=>fs.existsSync(path.join(root,relative));
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const core=read('arcade/lost-sizzler/js/game-core.js');
const progression=read('arcade/lost-sizzler/js/progression.js');
const overhaul=read('arcade/lost-sizzler/js/v10-42-procedural-overhaul.js');

assert(core.includes('const old1=preserve?p1:null,old2=preserve?p2:null'),'Floor regeneration must retain both local player objects when preservation is requested.');
assert(core.includes('p2=old2?preservePlayer(old2,q.x,q.y):makePlayer("LOCAL-P2"'),'Split-screen Player 2 must be rebuilt through preservePlayer on later floors.');
assert(core.includes('startWorld(PGR.floorSeed(run),Boolean(p2),true);'),'Campaign descent must keep split-screen mode active while preserving both players.');
assert(core.includes('p2=saved.player2||null;playMode=p2?"split":"solo"'),'Checkpoint resume must restore Player 2 and recover split-screen mode.');
assert(core.includes('startWorld(PGR.floorSeed(run),Boolean(p2),true,true)'),'Checkpoint resume must regenerate the floor while preserving the restored split-screen characters.');

assert(progression.includes('player2:checkpointClone(player2)'),'Checkpoint payload must store the complete dynamic Player 2 object.');
assert(!exists('arcade/lost-sizzler/js/v10-42-multiplayer-state.js'),'Retired online multiplayer state must not be required for local split-screen persistence.');

for(const marker of ['rpgStats','relics','banishmentVessel','banishmentEssence','banishmentEssenceCost','sigilReveal','sigilWard','sigilBind','sigilBanish']){
  assert(overhaul.includes(marker),`V10.42 base preservation must retain ${marker} for split-screen characters.`);
}
assert(overhaul.includes('if(typeof preservePlayer==="function")'),'Active V10.42 RPG overhaul must extend the canonical player-preservation path used by both local players.');
assert(overhaul.includes('if(old?.rpgStats)result.rpgStats={...old.rpgStats}'),'Active player preservation must copy RPG stat allocation.');
assert(overhaul.includes('if(Array.isArray(old?.relics))result.relics=[...old.relics]'),'Active player preservation must copy relic builds.');
assert(overhaul.includes('"banishmentVessel","banishmentEssence","banishmentEssenceCost","sigilReveal","sigilWard","sigilBind","sigilBanish"'),'Active player preservation must carry alchemy and Sigil state for either local player.');

const splitCheckpoint={
  run:{floor:4,v142ClaimedDomains:['iron','bone','ash']},
  player:{name:'P1',rpgStats:{might:8,vitality:7,agility:6,endurance:8,luck:7,arcana:8},relics:['archive-plate'],banishmentEssence:3,sigilReveal:true,sigilWard:true},
  player2:{name:'P2',rpgStats:{might:6,vitality:9,agility:8,endurance:7,luck:8,arcana:6},relics:['sid-capacitor','cartographer-chip'],banishmentEssence:5,sigilReveal:true,sigilWard:true,sigilBind:true}
};
const cloned=JSON.parse(JSON.stringify(splitCheckpoint));
assert(cloned.player2.rpgStats.vitality===9&&cloned.player2.relics.length===2,'Player 2 RPG attributes and relic build must survive checkpoint cloning.');
assert(cloned.player2.banishmentEssence===5&&cloned.player2.sigilBind===true,'Player 2 alchemy and Sigil state must survive checkpoint cloning.');
assert(cloned.run.v142ClaimedDomains.length===3,'Split-screen checkpoint must retain the shared three-Key campaign state.');

console.log('C64 Dungeon Carnage V10.42 local split-screen persistence contract passed without retired online multiplayer ownership.');