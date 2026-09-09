import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const core=read('arcade/lost-sizzler/js/game-core.js');
const progression=read('arcade/lost-sizzler/js/progression.js');
const overhaul=read('arcade/lost-sizzler/js/v10-42-procedural-overhaul.js');
const campaign=read('arcade/lost-sizzler/js/v10-42-five-depth-campaign.js');

assert(core.includes('run.floor++;run.deepest=Math.max(run.deepest,run.floor);'),'Floor descent must advance the existing run object rather than replacing the campaign.');
assert(core.includes('startWorld(PGR.floorSeed(run),Boolean(p2),true);'),'Floor descent must request player preservation when generating the next procedural floor.');
assert(core.includes('const old1=preserve?p1:null,old2=preserve?p2:null'),'startWorld must retain the old players when preservation is requested.');
assert(core.includes('old1?preservePlayer(old1,world.start.x,world.start.y):makePlayer'),'The next floor must rebuild Player 1 from the preserved player state.');

for(const marker of ['rpgStats','relics','banishmentVessel','banishmentEssence','banishmentEssenceCost','sigilReveal','sigilWard','sigilBind','sigilBanish']){
  assert(overhaul.includes(marker),`V10.42 preservePlayer must retain ${marker}.`);
}
assert(overhaul.includes('if(old?.rpgStats)result.rpgStats={...old.rpgStats}'),'RPG attribute values must be copied into the next-floor player.');
assert(overhaul.includes('if(Array.isArray(old?.relics))result.relics=[...old.relics]'),'Relic ownership must be copied into the next-floor player.');

assert(campaign.includes('runState.v142ClaimedDomains=Array.isArray(runState.v142ClaimedDomains)?runState.v142ClaimedDomains:[]'),'Global Iron/Bone/Ash progress must live on the persistent run object.');
assert(campaign.includes('globalKeyCount'),'Campaign HUD/objectives must derive key progress from the persistent run state.');

assert(progression.includes('run.bankedGames.push(...run.floorGames);run.floorGames=[]'),'Completing a floor must move rescued C64 games into the persistent campaign collection before the next depth.');
assert(progression.includes('for(const g of run.bankedGames)if(!saved.includes(g))saved.push(g)'),'Banked rescue games must also continue into the persistent local C64 collection.');
assert(progression.includes('function checkpointClone(value){try{return JSON.parse(JSON.stringify(value))}'),'Checkpoint storage must clone the complete dynamic run/player objects rather than a narrow legacy whitelist.');
assert(progression.includes('run:checkpointClone(run),player:checkpointClone(player),player2:checkpointClone(player2)'),'Checkpoint payload must retain the complete V10.42 run and character state.');
assert(core.includes('run=saved.run;score=Math.max(0,Number(saved.score)||0);p1=saved.player'),'Resume must restore the saved run and player before rebuilding the current floor.');
assert(core.includes('startWorld(PGR.floorSeed(run),Boolean(p2),true,true)'),'Resume must preserve the restored player while regenerating the deterministic floor entrance.');

const representative={
  run:{floor:4,v142ClaimedDomains:['iron','bone','ash'],v142AllKeysAnnounced:true,bankedGames:['Boulder Dash','Bruce Lee'],floorGames:['Commando']},
  player:{level:17,rpgStats:{might:8,vitality:7,agility:6,endurance:9,luck:7,arcana:8},relics:['sid-capacitor','ward-amplifier'],banishmentVessel:true,banishmentEssence:4,banishmentEssenceCost:2,sigilReveal:true,sigilWard:true,sigilBind:true}
};
const cloned=JSON.parse(JSON.stringify(representative));
assert(cloned.run.v142ClaimedDomains.join(',')==='iron,bone,ash','JSON checkpoint semantics must retain all three global Keys.');
assert(cloned.run.bankedGames.join(',')==='Boulder Dash,Bruce Lee'&&cloned.run.floorGames[0]==='Commando','JSON checkpoint semantics must retain both previously banked and current-floor rescued C64 games.');
assert(cloned.player.rpgStats.endurance===9&&cloned.player.relics.length===2,'JSON checkpoint semantics must retain RPG stats and relics.');
assert(cloned.player.banishmentEssence===4&&cloned.player.sigilBind===true,'JSON checkpoint semantics must retain alchemy and Sigil state.');

console.log('Lost Sizzler V10.42 campaign descent, rescued-game and checkpoint persistence contract passed.');