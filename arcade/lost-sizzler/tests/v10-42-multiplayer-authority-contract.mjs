import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const exists=relative=>fs.existsSync(path.join(root,relative));
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const loader=read('arcade/lost-sizzler/js/v10-41-r30-buglog.js');
const bootstrap=read('arcade/lost-sizzler/js/v10-42-bootstrap.js');
const zeroServer=read('arcade/lost-sizzler/js/v10-42-zero-server-release.js');
const network=read('arcade/lost-sizzler/js/game-network.js');

assert(loader.includes('v10-42-bootstrap.js'),'Canonical late loader must hand V10.42 activation to the ordered bootstrap.');
assert(!bootstrap.includes('v10-42-multiplayer-state.js'),'Production V10.42 bootstrap must not load the retired online multiplayer state adapter.');
assert(!bootstrap.includes('v10-42-multiplayer-collect-authority.js'),'Production V10.42 bootstrap must not load the retired online collection authority bridge.');
assert(bootstrap.includes('v10-42-zero-server-release.js'),'Production V10.42 bootstrap must load the zero-server-cost release policy.');

for(const id of ['create-btn','horde-mode-btn','saboteurs-mode-btn','join-btn']){
  assert(zeroServer.includes(`\"${id}\"`),`${id} must remain retired from the production release entry surface until its legacy markup is physically removed.`);
}
assert(zeroServer.includes('onlineMultiplayer:false'),'Production release diagnostics must declare online multiplayer disabled.');
assert(zeroServer.includes('localModes:Object.freeze([\"solo\",\"tutorial\",\"split-screen\"])'),'Solo, Tutorial and local split-screen must remain the supported release modes.');
assert(zeroServer.includes('supabaseAccountFeatures:true'),'Supabase-backed account features must remain explicitly permitted.');
assert(zeroServer.includes('online_multiplayer_disabled'),'Direct legacy multiplayer calls must fail with an explicit release-policy error.');
assert(zeroServer.includes('net.setSolo?.(\"TITLE\")'),'Release policy must normalize the network object back to local Solo state.');

for(const retired of [
  'arcade/lost-sizzler/js/v10-42-multiplayer-state.js',
  'arcade/lost-sizzler/js/v10-42-multiplayer-collect-authority.js'
]){
  assert(!exists(retired),`${retired} must remain physically deleted from the release tree.`);
}

assert(network.includes('function onCollectRequest(p)'),'Shared network compatibility must retain its existing collection handler until the deeper legacy network runtime is retired in a separately guarded stage.');

console.log('C64 Dungeon Carnage V10.42 retired-network boundary contract passed: obsolete online adapters are deleted while Solo, Tutorial, local split-screen and account features remain supported.');
