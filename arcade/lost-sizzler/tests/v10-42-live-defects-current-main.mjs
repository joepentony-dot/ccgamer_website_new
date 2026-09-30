import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const bootstrap=read("js/v10-42-bootstrap.js");
const play=read("js/game-play.js");
const main=read("js/game-main.js");
const local=read("js/game-local-runtime.js");
const core=read("js/game-core.js");
const procedural=read("js/v10-42-procedural-overhaul.js");
const shop=read("js/v10-42-artefact-shop-stability.js");
const dialogue=read("js/v10-41-stage8-npc-dialogue.js");
const voice=read("js/v10-16-voice-director.js");
const index=read("index.html");
const alias=fs.readFileSync(path.resolve(root,"../c64-dungeon-carnage/index.html"),"utf8");

assert.match(bootstrap,/expectedSubtitle="C64 DUNGEON CARNAGE — V10\.42"/,"authoritative bootstrap must retain the current customer-facing game identity");
assert.doesNotMatch(bootstrap,/expectedSubtitle="THE LOST SIZZLER/,"authoritative bootstrap must not restamp the retired public title");
assert.doesNotMatch(bootstrap,/v10-42-attack-hold-liveness\.js/,"ordered bootstrap must not reload the retired held-FIRE recovery owner");
assert.match(bootstrap,/v10-42-artefact-shop-stability\.js/,"ordered bootstrap must load the Banishment exchange stability owner");
assert.match(bootstrap,/window\.addEventListener\("click",blockedStart,true\)/,"V10.42 must capture pre-ready start gestures before older document-level release handlers");
assert.match(bootstrap,/if\(state\.ready\)\{\s*if\(target\.id!=="solo-btn"&&target\.id!=="tutorial-zone-btn"\)return;/,"after readiness V10.42 must narrow capture ownership to Solo/Tutorial while preserving established handlers for the other supported controls");
assert.match(bootstrap,/state\.pendingStartId=target\.id;\s*target\.setAttribute\("aria-busy","true"\);\s*replayPendingStart\(\);/,"a Solo/Tutorial click crossing the readiness boundary must be preserved and handed to the authoritative replay path");
assert.doesNotMatch(bootstrap,/window\.removeEventListener\("click",blockedStart,true\)/,"V10.42 must not reopen the proven ready-transition click race by removing its narrow Solo/Tutorial capture owner");

assert.match(main,/const p1AttackKey=e\.code==="Space"\|\|e\.code==="Numpad0"[\s\S]*if\(p1AttackKey&&p1\)[\s\S]*if\(!e\.repeat\)queueAttack\(p1\)/,"fresh keyboard FIRE from Space or Numpad0 must enter the canonical queue exactly once");
assert.match(main,/setAttackHeldInput\(p1,Boolean\(e\.repeat\|\|gamepadHeld\)\)/,"sustained P1 FIRE must require an explicit repeat or gamepad-held qualification");
assert.match(play,/const p1HeldAttack=isAttackHeldInput\(p1\)&&\(input\.has\("Space"\)\|\|input\.has\("Numpad0"\)\)[\s\S]*executeAuthoritativeFire\(p1,d1\(\),"buffered"\)/,"sustained qualified held FIRE and one buffered tap must converge on the captured authoritative frame-loop owner");
assert.doesNotMatch(play,/recoverThroughDeepFireOwner|recoverThroughCapturedR1FireOwner/,"the canonical FIRE path must not traverse retired recovery-owner chains");

assert.match(shop,/function alchemistOpen\(\)/,"final Flask exchange owner must require a live Banishment Alchemist");
assert.match(shop,/__ccgR76BanishmentRenderBoundary/,"R76 must own the final shop render boundary");
assert.match(shop,/function cleanFlaskCards\(\)/,"final render owner must strip Flask cards from ordinary shops");
assert.match(shop,/alchemistOpen\(\)\?\["banishmentScore"\]:\["banishment","banishmentScore"\]/,"ordinary shops must remove both Flask routes while Alchemists retain only Essence distillation");
assert.match(shop,/if\(!alchemistOpen\(\)\)/,"Flask exchange must reject ordinary supply desks");
assert.match(shop,/physicalArtefactCount\(player\)/,"legacy physical Artefact stacks must remain compatible");
assert.match(shop,/nonNegativeInt\(player\.banishmentEssence\)/,"current Banishment Essence store must be spendable");
assert.match(shop,/snapshotPaymentState\(player\)/,"exchange must snapshot both payment stores before spending");
assert.match(shop,/restorePaymentState\(player,snapshot\)/,"failed exchange must restore legacy Artefacts and Essence exactly");
assert.match(shop,/if\(String\(id\)==="banishmentScore"\)return false/,"final wrapper must block the retired score Flask route");
assert.match(shop,/BANISHMENT FLASK DISTILLED/,"successful final exchange must present Flask distillation");
assert.match(shop,/Score and Gold are unchanged/,"successful exchange feedback must state that unrelated currencies are unchanged");
assert.doesNotMatch(shop,/10 Gold purchase remains available separately/,"retired Gold Flask alternative must not survive R76");

assert.match(procedural,/DISTIL BANISHMENT FLASK/,"Alchemist UI must describe Flask distillation");
assert.match(procedural,/if\(id==="banishmentScore"\).*ESSENCE ONLY/s,"procedural owner must reject direct legacy score-Flask calls");
assert.match(procedural,/\["banishment","banishmentScore"\]/,"ordinary shop presentation must remove both legacy Flask cards");
assert.match(procedural,/one permanent Banishment Flask/,"current RPG system must use Flask terminology consistently");
assert.doesNotMatch(procedural,/Banishment Charge/,"current RPG presentation must not expose the retired Charge term");

assert.doesNotMatch(core,/id:"banishmentScore",name:"BANISHMENT FLASK · SCORE"/,"base shop must not render a score-purchase Flask card");
assert.match(core,/BANISHMENT FLASK · ESSENCE/,"base Flask card must be Essence-labelled before the Alchemist finalizer");
assert.match(core,/Score cannot buy it/,"inventory help must explicitly reject the retired score route");
assert.doesNotMatch(play,/FIND 3 ARTEFACTS TO EXCHANGE FOR THE POTION|pay 10,000 score at a shop/i,"live Death Stalker guidance must not advertise retired Flask acquisition");
assert.match(play,/COLLECT BANISHMENT ESSENCE, DISTIL A FLASK AT AN ALCHEMIST/,"live threat guidance must direct the player to current Essence alchemy");
assert.doesNotMatch(local,/Trade 3 artefacts or pay 10,000 score|pay 10,000 score at a dungeon shop/i,"runtime pickup and Banishment guidance must not advertise retired Flask acquisition");
assert.match(local,/Collect Banishment Essence and distil a Flask at a Banishment Alchemist/,"no-Flask guidance must explain the current acquisition route");

assert.match(dialogue,/title:"BANISHMENT ALCHEMIST"/,"hidden merchant dialogue must present the current Alchemist role");
assert.match(dialogue,/npc\.alchemist\.partial/,"Essence-specific partial dialogue must avoid the obsolete recorded artefact line");
assert.match(dialogue,/npc\.alchemist\.ready/,"Essence-ready dialogue must avoid the obsolete recorded artefact line");
assert.match(dialogue,/essenceCost\?\.\(p1\)/,"Alchemist dialogue threshold must follow the player's Arcana-adjusted Essence cost");
assert.match(dialogue,/p1\?\.banishmentEssence/,"Alchemist dialogue must read the live Banishment Essence Vessel");
assert.doesNotMatch(dialogue,/Trade 3 rare artefacts for a Banishment Flask/,"merchant subtitles must not advertise the retired physical-only trade");

assert.match(voice,/essenceCollected:\{text:"Banishment Essence collected\."/,"Essence pickups must have accurate spoken fallback");
assert.match(voice,/essenceLore:\{text:"Banishment Essence is stored in your Vessel/,"Essence lore must explain Vessel storage and Alchemist distillation");
assert.match(voice,/notEnoughEssence:\{text:"Not enough Banishment Essence\."/,"insufficient Essence must have accurate spoken fallback");
assert.match(voice,/lootKind==="artefact"\?"essenceCollected"/,"current artefact-kind pickups must speak Essence rather than obsolete Artefact wording");
assert.match(voice,/BANISHMENT FLASK \(\?:ACQUIRED\|DISTILLED\)/,"voice classifier must recognise the new distillation success toast");

for(const page of [index,alias]){
  assert.match(page,/collect Banishment Essence, distil a Flask at a Banishment Alchemist/i,"public Death Stalker tip must explain current Flask acquisition");
  assert.match(page,/ESSENCE <b id="shop-artefacts">0<\/b>/,"shop wallet must label the current Banishment currency as Essence");
  assert.match(page,/Banishment Flasks are not score purchases/,"public shop note must reject the retired score route");
  assert.doesNotMatch(page,/trade 3 artefacts or pay 10,000 score at a shop/i,"public game pages must not advertise the retired Flask route");
}

console.log("Dungeon Carnage R76 Banishment Essence, Alchemist-only Flask and live-defect source contracts passed.");
