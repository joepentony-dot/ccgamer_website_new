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
assert.match(bootstrap,/window\.addEventListener\("click",blockedStart,true\)/,"V10.42 must capture pre-ready start gestures before older document-level release handlers");
assert.match(bootstrap,/if\(state\.ready\)\{\s*if\(target\.id!=="solo-btn"&&target\.id!=="tutorial-zone-btn"\)return;/,"after readiness V10.42 must narrow capture ownership to Solo/Tutorial while preserving established handlers for the other supported controls");
assert.match(bootstrap,/state\.pendingStartId=target\.id;\s*target\.setAttribute\("aria-busy","true"\);\s*replayPendingStart\(\);/,"a Solo/Tutorial click crossing the readiness boundary must be preserved and handed to the authoritative replay path");
assert.doesNotMatch(bootstrap,/window\.removeEventListener\("click",blockedStart,true\)/,"V10.42 must not reopen the proven ready-transition click race by removing its narrow Solo/Tutorial capture owner");
assert.match(bootstrap,/legacyGatePending=window\.CCGLostSizzlerReleaseGate\?\.state\?\.ready===false/,"queued starts must wait for the legacy release gate rather than dropping the click");
assert.match(bootstrap,/if\(!button\|\|!button\.isConnected\)\{retry\(\);return\}\s*if\(button\.disabled\|\|legacyGatePending\)\{retry\(\);return\}/,"queued starts must survive missing, detached or transiently disabled buttons and the legacy-gate handoff");
assert.match(bootstrap,/state\.pendingStartRetries\+=1;\s*setTimeout\(attempt,50\)/,"queued starts must retain the canonical fixed retry cadence until dispatch becomes safe");

assert.match(attack,/new Set\(\["Space","KeyF","Numpad0"\]\)/,"all supported P1 attack keys must share the held-fire normalisation");
assert.match(attack,/input\?\.add\?\.\("Space"\)/,"held attack aliases must normalise to the canonical Space input consumed by the frame loop");
assert.doesNotMatch(attack,/firePlayer\s*=|function\s+firePlayer/,"held-fire liveness must not replace or wrap the combat owner");
assert.match(attack,/addEventListener\("blur",clearHeld/,"focus loss must clear held attack state");

assert.match(shop,/String\(id\)==="banishment"/,"Artefact repair must be isolated to the Flask exchange action");
assert.match(shop,/physicalArtefactCount\(player\)/,"Artefact exchange must recognise legacy physical Artefact stacks");
assert.match(shop,/nonNegativeInt\(player\.banishmentEssence\)/,"Artefact exchange must recognise the current V10.42 essence store");
assert.match(shop,/inventoryRemove\(player,slot,1\)/,"physical Artefacts must be removed transactionally before destination-slot validation");
assert.match(shop,/snapshotPaymentState\(player\)/,"Artefact exchange must snapshot both payment stores before spending");
assert.match(shop,/restorePaymentState\(player,snapshot\)/,"failed exchange must restore physical Artefacts and essence exactly");
assert.match(shop,/snapshot\.hadEssence/,"rollback must preserve whether the essence field existed before the transaction");
assert.match(shop,/liveOwner\.__ccgArtefactShopStability/,"Artefact repair must verify current buyShopItem ownership rather than trusting a historical install flag");
assert.match(shop,/wrapped\.__ccgOriginal=base/,"Artefact repair must preserve the latest non-Flask shop owner chain when re-binding");
assert.match(shop,/if\(installed\)diagnostics\.rebinds\+\+/,"later shop wrappers must be detectable as an explicit Artefact-boundary rebind");
assert.match(shop,/10 Gold purchase remains available separately/,"Artefact repair must preserve the current 10 Gold Flask alternative");
assert.doesNotMatch(shop,/spendGold|shopGoldPrice/,"Artefact exchange repair must not rewrite the normal Gold economy");

console.log("Dungeon Carnage current-main live-defect source contract passed.");
