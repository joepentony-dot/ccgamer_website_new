import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"../../..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const core=read("arcade/lost-sizzler/js/game-core.js");
const recovery=read("arcade/lost-sizzler/js/v10-41-r53-terminal-solo-end-recovery.js");
const main=read("arcade/lost-sizzler/js/game-main.js");
const finalUi=read("arcade/lost-sizzler/js/v10-4-final-ui.js");

assert.doesNotMatch(core,/Friendly fire:/i,"normal end-run statistics must not expose retired friendly-fire data");
assert.doesNotMatch(recovery,/Friendly fire:/i,"terminal recovery end screen must not expose retired friendly-fire data");

assert.match(main,/title:"C64 Dungeon Carnage"/,"share metadata must use the current game title");
assert.match(main,/C64 Dungeon Carnage link copied/,"clipboard feedback must use the current game title");
assert.doesNotMatch(main,/Cheeky's Commodore Quest/,"retired game title must not remain in the active share path");

assert.match(finalUi,/run\?\.runComplete/,"completion credits must require the authoritative successful-run completion latch");
assert.match(finalUi,/!run\.xpGameOver/,"Floor 15 XP game-over must never receive victory credits");
assert.match(finalUi,/Number\(run\.floor\|\|0\)>=Number\(window\.CCG_CONFIG\?\.maxFloors\|\|15\)/,"victory credits must remain gated to the configured final floor");\nassert.match(finalUi,/CAMPAIGN COMPLETE — BLOOD CITADEL CLEARED/,"full campaign completion must receive a distinct credits finale");
assert.match(finalUi,/AZALEA and CPU/,"special acknowledgements must include long-term supporters AZALEA and CPU");
assert.match(finalUi,/info@cheekycommodoregamer\.co\.uk/,"completion credits must expose the requested feedback email");
assert.match(finalUi,/paypal\.com\/donate/,"completion credits must expose the existing donation destination");
assert.match(finalUi,/v108-end-share/,"completion credits must expose a dedicated share-completion action");
assert.match(finalUi,/CCGEndCreditsMusic\?\.play/,"completion credits must expose a configurable end-music hook without hardcoding an asset");
assert.match(finalUi,/data-enemy-avatar-index/,"enemy credits must retain the in-game sprite canvas recap");

console.log("Dungeon Carnage R88 endgame and credits contract passed.");
