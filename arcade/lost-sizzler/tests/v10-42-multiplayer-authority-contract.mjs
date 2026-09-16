import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const file=relative=>path.join(root,relative);
const read=relative=>fs.readFileSync(file(relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const loader=read('arcade/lost-sizzler/js/v10-41-r30-buglog.js');
const bootstrap=read('arcade/lost-sizzler/js/v10-42-bootstrap.js');
const zeroServer=read('arcade/lost-sizzler/js/v10-42-zero-server-release.js');
const network=read('arcade/lost-sizzler/js/game-network.js');

assert(loader.includes('v10-42-bootstrap.js'),'Canonical late loader must hand V10.42 activation to the ordered bootstrap.');
assert(!bootstrap.includes('v10-42-multiplayer-state.js'),'Production V10.42 bootstrap must not load the retired online multiplayer state adapter.');
assert(!bootstrap.includes('v10-42-multiplayer-collect-authority.js'),'Production V10.42 bootstrap must not load the retired online collection authority bridge.');
assert(!fs.existsSync(file('arcade/lost-sizzler/js/v10-42-multiplayer-state.js')),'Retired V10.42 online multiplayer state adapter must be deleted from the canonical runtime.');
assert(!fs.existsSync(file('arcade/lost-sizzler/js/v10-42-multiplayer-collect-authority.js')),'Retired V10.42 online collection authority bridge must be deleted from the canonical runtime.');
assert(bootstrap.includes('v10-42-zero-server-release.js'),'Production V10.42 bootstrap must load the zero-server-cost release policy.');

for(const id of ['create-btn','horde-mode-btn','saboteurs-mode-btn','join-btn']){
  assert(zeroServer.includes(`\"${id}\"`),`${id} must remain retired from the production release entry surface until its legacy markup is physically removed.`);
}
assert(zeroServer.includes('onlineMultiplayer:false'),'Production release diagnostics must declare online multiplayer disabled.');
assert(zeroServer.includes('localModes:Object.freeze([\"solo\",\"tutorial\",\"split-screen\"])'),'Solo, Tutorial and local split-screen must remain the supported release modes.');
assert(zeroServer.includes('supabaseAccountFeatures:true'),'Supabase-backed account features must remain explicitly permitted.');
assert(zeroServer.includes('online_multiplayer_disabled'),'Direct legacy multiplayer calls must fail with an explicit release-policy error.');
assert(zeroServer.includes('net.setSolo?.(\"TITLE\")'),'Release policy must normalize the legacy network object back to local Solo state.');

assert(network.includes('function onCollectRequest(p)'),'Legacy game-network collection handling remains a separate later retirement boundary and must not be changed by this adapter-only stage.');

console.log('Lost Sizzler V10.42 zero-server retirement contract passed: obsolete V10.42 network adapters are deleted while Solo, Tutorial and local 2P Split Screen remain the supported release modes.');
