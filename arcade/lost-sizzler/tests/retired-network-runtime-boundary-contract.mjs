import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");
const exists=file=>fs.existsSync(path.join(root,file));

const legacyNetwork=read("js/game-network.js");
const extractedLocal=exists("js/game-local-runtime.js")?read("js/game-local-runtime.js"):"";
const retainedRuntime=`${legacyNetwork}\n${extractedLocal}`;
const main=read("js/game-main.js");
const index=read("index.html");

/*
 * Everything from hostEnemyStep through dropInventorySlot is live Solo/local
 * gameplay despite currently living in the legacy-named game-network.js file.
 * Keep this list exhaustive so the online-transport retirement cannot strand a
 * combat, pickup, Banishment or inventory helper during the mechanical split.
 */
const activeOwners=[
  "hostEnemyStep",
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
  const matches=retainedRuntime.match(new RegExp(`function\\s+${name}\\s*\\(`,"g"))||[];
  assert.equal(matches.length,1,`${name} must have exactly one retained Solo/local runtime owner across game-network.js and game-local-runtime.js`);
}

const splitBoundary=legacyNetwork.indexOf("function hostEnemyStep(");
assert.ok(splitBoundary>0,"the current mixed file must retain an explicit hostEnemyStep split boundary until extraction is complete");
const retiredPrefix=legacyNetwork.slice(0,splitBoundary);
const localSuffix=legacyNetwork.slice(splitBoundary);
assert.match(retiredPrefix,/function onPacket\s*\(/,"the still-unextracted legacy online adapter must remain identifiable until the guarded split is complete");
assert.match(retiredPrefix,/function serialWorld\s*\(/,"the still-unextracted online world serializer must remain identifiable until the guarded split is complete");
assert.match(retiredPrefix,/function onWorld\s*\(/,"the still-unextracted online world receiver must remain identifiable until the guarded split is complete");
assert.doesNotMatch(localSuffix,/function onPacket\s*\(|function serialWorld\s*\(|function onWorld\s*\(/,"retained Solo/local suffix must not contain the retired packet/world-sync owners");
assert.match(localSuffix,/function dropInventorySlot\s*\(/,"the retained local suffix must extend through inventory dropping, not stop at combat or pickups");

assert.doesNotMatch(index,/id="create-btn"|id="join-btn"|id="room-code"/,"retired online room controls must not return to the public menu");
assert.match(index,/id="solo-btn"/,"Solo must remain available while online runtime is retired");
assert.match(index,/id="split-btn"/,"local 2P Split Screen must remain available while online runtime is retired");
assert.match(index,/id="weekly-vault"/,"Weekly High-Score Vault/account UI must remain available while online runtime is retired");
assert.doesNotMatch(main,/getElementById\(["']create-btn["']\)|getElementById\(["']join-btn["']\)/,"game-main.js must not restore hard bindings to retired online controls");

console.log("Dungeon Carnage retired-network runtime boundary contract passed.");
