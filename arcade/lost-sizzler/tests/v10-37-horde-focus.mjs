import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-37-horde-focus.js"),"utf8");
const loader=fs.readFileSync(path.join(root,"js/version-check.js"),"utf8");

assert.match(loader,/v10-37-horde-focus\.js/,"version-check must load the V10.37 Horde focus layer");
assert.match(source,/https:\/\/discord\.gg\/83Xw9ktAn4/,"Lost Sizzler menu must link to the CCG Discord invite");
assert.match(source,/JOIN THE LOST SIZZLER DISCORD/,"menu CTA must encourage Lost Sizzler Discord discussion");
assert.match(source,/Discuss the game, compare runs, report bugs and suggest ideas/,"Discord CTA must explain the discussion purpose");

assert.match(source,/#pickup-toast\{[\s\S]*position:absolute!important/,"transient popup layout must be removed from normal gameplay flow");
assert.match(source,/\.ccg-game>\.critical-strip\{[\s\S]*position:fixed!important/,"critical notices must not create a new grid row");
assert.match(source,/data-special-mode="horde-survivor"[\s\S]*\.mission/,"Horde mode must hide the normal dungeon mission strip");
assert.match(source,/data-special-mode="horde-survivor"[\s\S]*\.shortcut-dock/,"Horde mode must hide the normal dungeon inventory/key sidebar");
assert.match(source,/data-special-mode="horde-survivor"[\s\S]*\.hub-inventory/,"Horde mode must hide normal quick inventory");
assert.match(source,/data-special-mode="horde-survivor"[\s\S]*#inventory-panel/,"Horde mode must hide the TAB dungeon inventory");

for(const legacy of [
  "host.items=[]",
  "host.chests=[]",
  "host.shrines=[]",
  "host.shops=[]",
  "host.deathCaches=[]",
  "player.inventory=[]",
  "player.bronzeKeys=0"
]) assert.ok(source.includes(legacy),`Horde cleanup must remove legacy dungeon state: ${legacy}`);

assert.match(source,/allowedHordeToast/,"Horde must filter ordinary dungeon notifications");
assert.match(source,/if\(hordeActive\(\)&&!allowedHordeToast\(title\)\)return false/,"non-Horde notifications must be suppressed while Horde is active");
assert.match(source,/code!=="Tab"/,"Horde must intercept TAB");
assert.match(source,/Digit\[1-6\]/,"Horde must intercept normal quick-slot hotkeys");

assert.match(source,/HEALTH_MIN_DELAY_MS=15000/,"Horde health must not spam immediately");
assert.match(source,/HEALTH_MAX_DELAY_MS=26000/,"Horde health cadence must include a randomized upper delay");
assert.match(source,/MAX_HEALTH_PICKUPS=2/,"Horde health should stay scarce");
assert.match(source,/randomArenaCell/,"Horde health must use random arena cells rather than fixed dungeon pickups");
assert.match(source,/_v137Randomised=true/,"Horde health pickups must be marked after random placement");
assert.match(source,/H\.collectHealth\(stateValue,pickup\.id,model\.id,now\)/,"Horde health collection must update the authoritative Horde rules engine");
assert.match(source,/\+.*HP/,"Horde health collection must give local non-layout feedback");
assert.match(source,/drawHordeHealth/,"Horde health must have a dedicated arena rendering path");

console.log("Lost Sizzler V10.37 Horde isolation, stable popup and Discord CTA regression checks passed.");
