import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

const legacyNetwork=read("js/game-network.js");
const extractedLocal=read("js/game-local-runtime.js");
const main=read("js/game-main.js");
const index=read("index.html");

/*
 * Networked Dungeon Multiplayer is retired. The active local gameplay suffix
 * remains in game-local-runtime.js. game-network.js retains only the callbacks
 * still passed to RoomNetwork plus broadcastWorld(), which supported local
 * gameplay still calls as an inert compatibility hook.
 */
const activeOwners=[
  "hostEnemyStep","onHit","elementalDamage","isDeathStalkerEnemy",
  "enemyDefeatIdentity","recordEnemyDefeat","damageEnemy","onFX",
  "floorItemNeedsSlot","floorItemCarryCandidate","inventoryFullForPickup",
  "resourcePickupBlock","reserveAmmoCollection","onCollectRequest",
  "requestCollect","collectedName","onCollected","storeConsumable",
  "equipWeapon","applyLoot","pickupXP","applyItem","usePotion",
  "banishmentState","dropBanishmentArtefact","offerBanishmentArtefact",
  "claimBanishmentArtefact","permanentlyBanish","activateBanishment",
  "useUtility","useTeleport","useBanishment","useInventorySlot",
  "dropInventorySlot"
];

for(const name of activeOwners){
  const legacyMatches=legacyNetwork.match(new RegExp(`function\\s+${name}\\s*\\(`,"g"))||[];
  const localMatches=extractedLocal.match(new RegExp(`function\\s+${name}\\s*\\(`,"g"))||[];
  assert.equal(legacyMatches.length,0,`${name} must not return to game-network.js`);
  assert.equal(localMatches.length,1,`${name} must have exactly one retained owner in game-local-runtime.js`);
}

for(const name of ["onMembers","onPacket","broadcastWorld"]){
  assert.equal((legacyNetwork.match(new RegExp(`function\\s+${name}\\s*\\(`,"g"))||[]).length,1,`${name} required local-session compatibility owner must remain singular`);
}
for(const name of ["onPlayer","playerStateForNetwork","sendPlayer","sendRemotePlayerState","processRemoteMovement","serialWorld","onWorld"]){
  assert.equal((legacyNetwork.match(new RegExp(`function\\s+${name}\\s*\\(`,"g"))||[]).length,0,`${name} retired network compatibility owner must remain removed`);
}
assert.doesNotMatch(legacyNetwork,/net\.send\s*\(/,"retired online adapter must not transmit packets");
assert.doesNotMatch(legacyNetwork,/remote\.(?:get|set|delete|clear)\s*\(/,"retired online adapter must not own remote-player state");
assert.doesNotMatch(legacyNetwork,/host\.(?:doors|chests|enemies|items|traps|generators|shrines|switches|arenas|timedRooms)/,"retired online adapter must not serialize or apply world state");
assert.doesNotMatch(legacyNetwork,/playMode\s*===?\s*["']online["']|playMode\s*!==?\s*["']online["']/,"retired online product mode must not regain a runtime branch");
assert.match(legacyNetwork,/function onPacket\s*\([^)]*\)\{\}/,"packet callback must remain inert while RoomNetwork constructs with it");
assert.match(legacyNetwork,/function broadcastWorld\s*\(\)\{\}/,"local gameplay broadcast compatibility hook must remain inert");

assert.match(extractedLocal,/^function hostEnemyStep\s*\(/,"game-local-runtime.js must begin at the retained hostEnemyStep boundary");
assert.match(extractedLocal,/function dropInventorySlot\s*\(/,"game-local-runtime.js must extend through inventory dropping");
assert.doesNotMatch(extractedLocal,/function onPacket\s*\(|function serialWorld\s*\(|function onWorld\s*\(/,"retained local runtime must not absorb retired packet/world-sync owners");

const networkScript=index.indexOf('src="js/game-network.js');
const localScript=index.indexOf('src="js/game-local-runtime.js');
const playScript=index.indexOf('src="js/game-play.js');
assert.ok(networkScript>=0,"compatibility boundary must remain loaded while RoomNetwork constructs with onMembers/onPacket");
assert.ok(localScript>networkScript,"game-local-runtime.js must load after the compatibility boundary");
assert.ok(playScript>localScript,"game-local-runtime.js must load before game-play.js");
assert.equal((index.match(/src="js\/game-local-runtime\.js/g)||[]).length,1,"game-local-runtime.js must be loaded exactly once");

assert.match(main,/new window\.CCGNetwork\.RoomNetwork\(\{onMembers,onPacket\}\)/,"local session shell must retain its explicit compatibility callbacks");
assert.doesNotMatch(index,/id="create-btn"|id="join-btn"|id="room-code"/,"retired online room controls must not return to the public menu");
assert.match(index,/id="solo-btn"/,"Solo must remain available");
assert.match(index,/id="split-btn"/,"local 2P Split Screen must remain available");
assert.match(index,/id="weekly-vault"/,"Weekly High-Score Vault/account UI must remain available");
assert.doesNotMatch(main,/getElementById\(["']create-btn["']\)|getElementById\(["']join-btn["']\)/,"game-main.js must not restore retired online controls");

console.log("Dungeon Carnage retired-network runtime retirement contract passed.");
