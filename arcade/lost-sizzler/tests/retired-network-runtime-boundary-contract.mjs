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
  "requestCollect",
  "onCollected",
  "storeConsumable",
  "equipWeapon",
  "applyItem"
];

for(const name of activeOwners){
  const matches=retainedRuntime.match(new RegExp(`function\\s+${name}\\s*\\(`,"g"))||[];
  assert.equal(matches.length,1,`${name} must have exactly one retained Solo/local runtime owner across game-network.js and game-local-runtime.js`);
}

assert.match(legacyNetwork,/function onPacket\s*\(/,"the still-unextracted legacy online adapter must remain identifiable until the guarded split is complete");
assert.match(legacyNetwork,/function serialWorld\s*\(/,"the still-unextracted online world serializer must remain identifiable until the guarded split is complete");
assert.match(legacyNetwork,/function onWorld\s*\(/,"the still-unextracted online world receiver must remain identifiable until the guarded split is complete");

assert.doesNotMatch(index,/id="create-btn"|id="join-btn"|id="room-code"/,"retired online room controls must not return to the public menu");
assert.match(index,/id="solo-btn"/,"Solo must remain available while online runtime is retired");
assert.match(index,/id="split-btn"/,"local 2P Split Screen must remain available while online runtime is retired");
assert.match(index,/id="weekly-vault"/,"Weekly High-Score Vault/account UI must remain available while online runtime is retired");
assert.doesNotMatch(main,/getElementById\(["']create-btn["']\)|getElementById\(["']join-btn["']\)/,"game-main.js must not restore hard bindings to retired online controls");

console.log("Dungeon Carnage retired-network runtime boundary contract passed.");
