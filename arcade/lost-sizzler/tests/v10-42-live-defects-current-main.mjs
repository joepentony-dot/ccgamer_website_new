import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const bootstrap=read("js/v10-42-bootstrap.js");
const attack=read("js/v10-42-attack-hold-liveness.js");
const shop=read("js/v10-42-artefact-shop-stability.js");

assert.match(bootstrap,/expectedSubtitle="C64 DUNGEON CARNAGE — V10\.42"/,"authoritative bootstrap must retain the current customer-facing game identity");
assert.doesNotMatch(bootstrap,/expectedSubtitle="THE LOST SIZZLER/,"authoritative bootstrap must not restamp the retired public title");
assert.match(bootstrap,/v10-42-attack-hold-liveness\.js/,"ordered bootstrap must load sustained attack-key liveness");
assert.match(bootstrap,/v10-42-artefact-shop-stability\.js/,"ordered bootstrap must load Artefact exchange stability");

assert.match(attack,/new Set\(\["Space","KeyF","Numpad0"\]\)/,"all supported P1 attack keys must share the held-fire normalisation");
assert.match(attack,/input\?\.add\?\.\("Space"\)/,"held attack aliases must normalise to the canonical Space input consumed by the frame loop");
assert.doesNotMatch(attack,/firePlayer\s*=|function\s+firePlayer/,"held-fire liveness must not replace or wrap the combat owner");
assert.match(attack,/addEventListener\("blur",clearHeld/,"focus loss must clear held attack state");

assert.match(shop,/String\(id\)==="banishment"/,"Artefact repair must be isolated to the Flask exchange action");
assert.match(shop,/inventoryRemove\(player,slot,1\)/,"Artefacts must be removed transactionally before destination-slot validation");
assert.match(shop,/restoreRemovedArtefacts\(player,removed\)/,"failed exchange must restore every removed Artefact");
assert.match(shop,/10 Gold purchase remains available separately/,"Artefact repair must preserve the current 10 Gold Flask alternative");
assert.doesNotMatch(shop,/spendGold|shopGoldPrice/,"Artefact exchange repair must not rewrite the normal Gold economy");

console.log("Dungeon Carnage current-main live-defect source contract passed.");
