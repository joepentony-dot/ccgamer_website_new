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
 * The guarded split is now complete: game-network.js owns the retired online
 * packet/world-sync prefix, while game-local-runtime.js owns the retained
 * Solo/local combat, pickup, Banishment and inventory runtime.
 */
const activeOwners=[
  "hostEnemyStep",
  "onHit",
  "elementalDamage",
  "isDeathStalkerEnemy",
  "enemyDefeatIdentity",
  "recordEnemyDefeat",
  "damageEnemy",
  "onFX",
  "floorItemNeedsSlot",
  "floorItemCarryCandidate",
  "inventoryFullForPickup",
  "resourcePickupBlock",
  "reserveAmmoCollection",
  "onCollectRequest",
  "requestCollect",
  "collectedName",
  "onCollected",
  "storeConsumable",
  "equipWeapon",
  "applyLoot",
  "pickupXP",
  "applyItem",
  "usePotion",
  "banishmentState",
  "dropBanishmentArtefact",
  "offerBanishmentArtefact",
  "claimBanishmentArtefact",
  "permanentlyBanish",
  "activateBanishment",
  "useUtility",
  "useTeleport",
  "useBanishment",
  "useInventorySlot",
  "dropInventorySlot"
];

for(const name of activeOwners){
  const legacyMatches=legacyNetwork.match(new RegExp(`function\\s+${name}\\s*\\(`,"g"))||[];
  const localMatches=extractedLocal.match(new RegExp(`function\\s+${name}\\s*\\(`,"g"))||[];
  assert.equal(legacyMatches.length,0,`${name} must no longer be owned by game-network.js after extraction`);
  assert.equal(localMatches.length,1,`${name} must have exactly one retained owner in game-local-runtime.js`);
}

assert.match(legacyNetwork,/function onPacket\s*\(/,"the retired online adapter must remain identifiable in game-network.js until transport retirement");
assert.match(legacyNetwork,/function serialWorld\s*\(/,"the retired online world serializer must remain identifiable in game-network.js until transport retirement");
assert.match(legacyNetwork,/function onWorld\s*\(/,"the retired online world receiver must remain identifiable in game-network.js until transport retirement");
assert.doesNotMatch(legacyNetwork,/function hostEnemyStep\s*\(/,"game-network.js must stop at the completed transport/local-runtime boundary");
assert.match(extractedLocal,/^function hostEnemyStep\s*\(/,"game-local-runtime.js must begin at the retained hostEnemyStep boundary");
assert.match(extractedLocal,/function dropInventorySlot\s*\(/,"game-local-runtime.js must extend through inventory dropping, not stop at combat or pickups");
assert.doesNotMatch(extractedLocal,/function onPacket\s*\(|function serialWorld\s*\(|function onWorld\s*\(/,"retained local runtime must not absorb the retired packet/world-sync owners");

const networkScript=index.indexOf('src="js/game-network.js');
const localScript=index.indexOf('src="js/game-local-runtime.js');
const playScript=index.indexOf('src="js/game-play.js');
assert.ok(networkScript>=0,"game-network.js must remain loaded while its retired transport prefix still exists");
assert.ok(localScript>networkScript,"game-local-runtime.js must load after game-network.js");
assert.ok(playScript>localScript,"game-local-runtime.js must load before game-play.js so retained helpers exist before gameplay wiring");
assert.equal((index.match(/src="js\/game-local-runtime\.js/g)||[]).length,1,"game-local-runtime.js must be loaded exactly once");

assert.doesNotMatch(index,/id="create-btn"|id="join-btn"|id="room-code"/,"retired online room controls must not return to the public menu");
assert.match(index,/id="solo-btn"/,"Solo must remain available while online runtime is retired");
assert.match(index,/id="split-btn"/,"local 2P Split Screen must remain available while online runtime is retired");
assert.match(index,/id="weekly-vault"/,"Weekly High-Score Vault/account UI must remain available while online runtime is retired");
assert.doesNotMatch(main,/getElementById\(["']create-btn["']\)|getElementById\(["']join-btn["']\)/,"game-main.js must not restore hard bindings to retired online controls");

console.log("Dungeon Carnage retired-network runtime extraction contract passed.");
