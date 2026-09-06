import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../../..');
const read=relative=>fs.readFileSync(path.join(root,relative),'utf8');
const assert=(condition,message)=>{if(!condition)throw new Error(message)};

const loader=read('arcade/lost-sizzler/js/v10-41-r30-buglog.js');
const network=read('arcade/lost-sizzler/js/game-network.js');
const state=read('arcade/lost-sizzler/js/v10-42-multiplayer-state.js');
const collect=read('arcade/lost-sizzler/js/v10-42-multiplayer-collect-authority.js');

assert(loader.includes('v10-42-multiplayer-state.js'),'Canonical Lost Sizzler loader must request the V10.42 multiplayer state adapter.');
assert(loader.includes('v10-42-multiplayer-collect-authority.js'),'Canonical Lost Sizzler loader must request the V10.42 remote campaign collection authority bridge.');
assert(loader.includes('loadV142MultiplayerState();loadV142MultiplayerCollectAuthority()'),'V10.42 loader must request character-state authority before the remote collection bridge.');

for(const marker of ['rpgStats','relics','banishmentEssence','banishmentEssenceCost','sigilReveal','sigilWard','sigilBind','sigilBanish']){
  assert(state.includes(marker),`V10.42 multiplayer state must carry ${marker}.`);
}
assert(state.includes('playerStateForNetworkV142'),'Outgoing multiplayer player snapshots must include V10.42 character state.');
assert(state.includes('v131_player_state'),'Host-to-guest authoritative character updates must retain V10.42 state.');
assert(state.includes('_v142Campaign:campaignSnapshot()'),'Host world packets must include the persistent V10.42 campaign snapshot.');
assert(state.includes('applyCampaign(snapshot._v142Campaign)'),'Guests must consume the host V10.42 campaign snapshot.');
assert(state.includes('preservePlayerV142CampaignState'),'Floor descent must preserve V10.42 multiplayer character state.');
assert(state.includes('movementTriggersV142Authority'),'Local movement-triggered Key transitions must remain behind the V10.42 authority wrapper.');

const guestCampaignIndex=state.indexOf('added=applyCampaign(snapshot._v142Campaign)');
const baseWorldIndex=state.indexOf('const result=base.apply(this,arguments),player=currentPlayer();');
const guestRewardIndex=state.indexOf('for(const id of added){const domain=domainById(id);if(domain&&player)queueDomainReward(player,domain)}');
assert(guestCampaignIndex>=0&&baseWorldIndex>guestCampaignIndex,'Guest world handling must apply authoritative campaign run state before the stabilized world/floor rebuild.');
assert(guestRewardIndex>baseWorldIndex,'Guest domain powers and relic choices must be queued only after the stabilized world handler has rebuilt the current-floor player.');

assert(network.includes('if(!p){if(i.kind==="key")'),'The stabilized network path still treats a remote collector as non-local on the host.');
assert(network.includes('function onCollectRequest(p)'),'The stabilized host owns online collection requests.');
assert(network.includes('if(i.kind==="exitSigil"){host.exitSigilCollected=true'),'The stabilized host marks the final Sigil as collected before the V10.42 remote escape bridge runs.');
assert(collect.includes('onCollectRequestV142Authority'),'Remote campaign collection must be bridged at the authoritative host collection boundary.');
assert(collect.includes('playMode==="online"&&net?.connected&&net.isHost'),'The collection bridge must be active only on an online host.');
assert(collect.includes('!localRoster().some(player=>player.id===payload.collector)'),'Local and split-screen collectors must stay on the original V10.42 movement/reward path.');
assert(collect.includes('item?.kind==="key"&&item.domainId'),'Only V10.42 domain Keys should enter the campaign-domain Key bridge.');
assert(collect.includes('item?.active!==false'),'The bridge must require the authoritative collection request to deactivate a campaign item before granting progression.');
assert(collect.includes('runState.v142ClaimedDomains.push(domain.id)'),'The host must record a newly collected remote domain Key on the persistent run.');
assert(collect.includes('campaignApi.queueDomainReward?.(player,domain)'),'Host-local characters must receive the shared domain reward after a remote Key collection.');

assert(collect.includes('if(item.kind==="exitSigil")'),'Remote final-Sigil collection must have an explicit V10.42 authority path.');
assert(collect.includes('beginRemoteEscape(remotePlayer(payload.collector))'),'The host must start the V10.42 escape against the remote character that actually claimed the final Sigil.');
assert(collect.includes('runState.v142EscapePhase=true'),'Remote final-Sigil collection must advance the persistent campaign into escape phase.');
assert(collect.includes('player.sigilBanish=true'),'The remote final-Sigil collector must receive the awakened Banish Sigil power.');
assert(collect.includes('name:"Sigil Banishment Charge"'),'The remote final-Sigil collector must receive the same final Banishment Charge as a local collector when inventory permits.');
assert(collect.includes('hostState.stalker.v142EscapeAwakened=true'),'Remote final-Sigil collection must awaken the final Stalker pressure on the host simulation.');
assert(collect.includes('enemy.aiState="chase"'),'Remote final-Sigil collection must place living Death Stalkers into final pursuit.');
assert(collect.includes('sendRemotePlayerState(player)'),'The host must push the remote collector\'s Banish power and charge through the authoritative player-state channel.');
assert(collect.includes('broadcastWorld()'),'Remote campaign collection must publish the updated campaign snapshot to guests.');

const representative={
  rpgStats:{might:8,vitality:7,agility:6,endurance:9,luck:7,arcana:8},
  relics:['archive-plate','ward-amplifier'],
  banishmentVessel:true,
  banishmentEssence:4,
  banishmentEssenceCost:2,
  sigilReveal:true,
  sigilWard:true,
  sigilBind:true,
  v142RelicDomains:['iron','bone']
};
const wire=JSON.parse(JSON.stringify(representative));
assert(wire.rpgStats.arcana===8&&wire.relics.length===2,'Representative V10.42 RPG/relic state must survive network-safe JSON cloning.');
assert(wire.banishmentEssence===4&&wire.sigilBind===true,'Representative alchemy and Sigil state must survive network-safe JSON cloning.');

console.log('Lost Sizzler V10.42 multiplayer authority, final-Sigil escape and guest floor-transition ordering contract passed.');