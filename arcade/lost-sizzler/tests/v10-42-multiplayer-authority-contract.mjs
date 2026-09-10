import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const loader=read('arcade/lost-sizzler/js/v10-41-r30-buglog.js');
const bootstrap=read('arcade/lost-sizzler/js/v10-42-bootstrap.js');
const zeroServer=read('arcade/lost-sizzler/js/v10-42-zero-server-release.js');
const network=read('arcade/lost-sizzler/js/game-network.js');
const state=read('arcade/lost-sizzler/js/v10-42-multiplayer-state.js');
const collect=read('arcade/lost-sizzler/js/v10-42-multiplayer-collect-authority.js');

assert(loader.includes('v10-42-bootstrap.js'),'Canonical late loader must hand V10.42 activation to the ordered bootstrap.');
assert(!bootstrap.includes('v10-42-multiplayer-state.js'),'Production V10.42 bootstrap must not load the online multiplayer state adapter.');
assert(!bootstrap.includes('v10-42-multiplayer-collect-authority.js'),'Production V10.42 bootstrap must not load the online collection authority bridge.');
assert(bootstrap.includes('v10-42-zero-server-release.js'),'Production V10.42 bootstrap must load the zero-server-cost release policy.');

for(const id of ['create-btn','horde-mode-btn','saboteurs-mode-btn','join-btn']){
  assert(zeroServer.includes(`\"${id}\"`),`${id} must be retired from the production release entry surface.`);
}
assert(zeroServer.includes('onlineMultiplayer:false'),'Production release diagnostics must declare online multiplayer disabled.');
assert(zeroServer.includes('localModes:Object.freeze([\"solo\",\"tutorial\",\"split-screen\"])'),'Solo, Tutorial and local split-screen must remain the supported release modes.');
assert(zeroServer.includes('supabaseAccountFeatures:true'),'Supabase-backed account features must remain explicitly permitted.');
assert(zeroServer.includes('online_multiplayer_disabled'),'Direct legacy multiplayer calls must fail with an explicit release-policy error.');
assert(zeroServer.includes('net.setSolo?.(\"TITLE\")'),'Release policy must normalize the network object back to local Solo state.');

// Preserve the old online implementation in source control for possible future use.
for(const marker of ['rpgStats','relics','banishmentEssence','sigilReveal','sigilWard','sigilBind','sigilBanish']){
  assert(state.includes(marker),`Preserved V10.42 multiplayer state source must still carry ${marker}.`);
}
assert(state.includes('playerStateForNetworkV142'),'Preserved multiplayer source must retain V10.42 character-state transport.');
assert(network.includes('function onCollectRequest(p)'),'Preserved stabilized network source must retain authoritative collection handling.');
assert(collect.includes('onCollectRequestV142Authority'),'Preserved remote campaign collection authority source must remain intact.');

console.log('Lost Sizzler V10.42 zero-server release contract passed: online multiplayer code is preserved but excluded from the production bootstrap and entry surface.');
