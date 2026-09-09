import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const source=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-r14-combat-encounter-bridge.js'),'utf8');
const bootstrapSource=fs.readFileSync(path.join(root,'arcade/lost-sizzler/js/v10-42-bootstrap.js'),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const room={roomId:4,saveKey:'room-4:progress',active:false,completed:false,currentWave:0,defeatedInWave:0,wavesCleared:0,waveTargets:[2],eliteReady:false,eliteDefeated:false,eventFired:false,rewardClaimed:false,encounter:{reinforcements:2,rewardFocus:'equipment',rewardTier:3,routeBonus:'rare-route',eliteSpec:{id:'bone-marshal',name:'BONE MARSHAL'},event:{kind:'bone-wake',trigger:'room-entry'}}};
const runtime={rooms:[room],activate(roomId,trigger){if(roomId!==4||trigger!=='room-entry')return false;room.active=true;room.currentWave=1;room.eventFired=true;return true},reportDefeat(roomId,count){if(roomId!==4||!room.active||room.eliteReady)return false;room.defeatedInWave+=count;if(room.defeatedInWave>=2){room.defeatedInWave=0;room.wavesCleared=1;room.eliteReady=true}return true},reportEliteDefeat(roomId){if(roomId!==4||!room.eliteReady)return false;room.eliteReady=false;room.eliteDefeated=true;room.completed=true;room.active=false;return true}};
const windowObject={CCGLostSizzlerV142R13EncounterProgressionRuntime:{}};
vm.runInNewContext(source,{window:windowObject,console,JSON,Math,Set,Map,Object},{filename:'v10-42-r14-combat-encounter-bridge.js'});
const api=windowObject.CCGLostSizzlerV142R14CombatEncounterBridge;
assert(api,'R14 combat encounter bridge must export its API.');
const host={v142EncounterRuntime:runtime};
assert(api.activate(host,4,'room-entry')===true,'Room-entry combat signal must activate the matching r13 encounter.');
let directive=api.nextDirective(host,4);
assert(directive.active===true&&directive.wave===1&&directive.remaining===2,'Active encounter directive must expose wave and remaining enemy demand.');
assert(directive.reinforcements===2&&directive.event?.kind==='bone-wake','Directive must preserve deterministic reinforcement and biome-event direction for the established AI owner.');
assert(api.reportEnemyDefeat(host,{roomId:4,enemyId:'skeleton-a',wave:1})===true,'First unique enemy defeat must advance encounter progression.');
assert(api.reportEnemyDefeat(host,{roomId:4,enemyId:'skeleton-a',wave:1})===false,'Duplicate combat defeat token must not advance progression twice.');
assert(api.reportEnemyDefeat(host,{roomId:4,enemyId:'skeleton-b',wave:1})===true,'Second unique defeat must clear the wave.');
directive=api.nextDirective(host,4);
assert(directive.eliteReady===true&&directive.eliteSpec?.id==='bone-marshal','Cleared waves must expose the planned biome elite through the bridge.');
assert(api.reportEnemyDefeat(host,{roomId:4,enemyId:'premature-elite',elite:true})===true,'Ready elite defeat must resolve through r13 elite authority.');
assert(room.completed===true&&room.eliteDefeated===true,'Elite defeat must complete the encounter without a parallel combat state owner.');

const saved=api.snapshot(host);
const restored={v142EncounterRuntime:runtime};
api.restore(restored,saved);
assert(restored.v142CombatEncounterBridge.seenDefeats.has('4|1|mob|skeleton-a'),'Bridge snapshot/restore must preserve exactly-once defeat identity.');
assert(restored.v142CombatEncounterBridge.roomSignals.get('4')==='room-entry','Bridge snapshot/restore must preserve room activation signal identity.');

for(const forbidden of ['fetch(','WebSocket','EventSource','supabase.from','render.com'])assert(!source.includes(forbidden),`R14 must remain local/browser-native and not introduce ${forbidden}.`);
assert(!source.includes('Math.random'),'R14 combat integration must remain deterministic.');
assert(!source.includes('localStorage')&&!source.includes('sessionStorage'),'R14 must not create a parallel persistence authority.');
assert(!source.includes('setInterval(')&&!source.includes('requestAnimationFrame('),'R14 must not create a second combat/AI/render owner.');
assert(source.includes('reportEnemyDefeat')&&source.includes('nextDirective'),'R14 must expose combat defeat ingestion and deterministic AI directives.');
console.log('Lost Sizzler V10.42 r14 combat encounter bridge contract passed.');
