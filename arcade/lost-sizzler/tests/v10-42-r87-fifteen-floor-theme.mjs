import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"../../..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const configSource=read("arcade/lost-sizzler/js/config.js");
const worldSource=read("arcade/lost-sizzler/js/world.js");
const campaignSource=read("arcade/lost-sizzler/js/v10-42-five-depth-campaign.js");
const floorBalanceSource=read("arcade/lost-sizzler/js/v10-42-floor-balance.js");

const sandbox={window:{},console};
vm.runInNewContext(configSource,sandbox,{filename:"config.js"});
const config=sandbox.window.CCG_CONFIG;

assert.equal(config.maxFloors,15,"campaign must finish on Floor 15");
assert.equal(config.floors.length,15,"all fifteen floor identities must be defined");
assert.equal(config.proceduralDungeon.campaignFloors.length,15,"all fifteen campaign balance profiles must be defined");
assert.equal(new Set(config.proceduralDungeon.campaignFloors.map(row=>row.theme)).size,15,"every campaign floor must own a distinct primary theme");
assert.equal(config.proceduralDungeon.campaignFloors[14].theme,"BLOOD_CITADEL","Floor 15 must use the danger-red Blood Citadel identity");
assert.ok(config.roomThemes.includes("BLOOD_CITADEL"),"Blood Citadel must be registered in the shared room-theme registry");

vm.runInNewContext(worldSource,sandbox,{filename:"world.js"});
const blood=sandbox.window.CCGWorld?.themes?.BLOOD_CITADEL;
assert.ok(blood,"world palette must define BLOOD_CITADEL");
assert.match(String(blood.floor),/^#(?:1f090c|[0-9a-f]{6})$/i,"Blood Citadel must expose a concrete floor colour");
assert.match(String(blood.accent),/^#ff4b57$/i,"Blood Citadel must retain its high-danger red accent");

assert.match(campaignSource,/function applyFloorTheme\(/,"campaign owner must apply the configured floor theme to ordinary rooms");
assert.match(campaignSource,/floor===CFG\.maxFloors/,"final Sigil logic must follow maxFloors rather than a hard-coded fifth floor");
assert.doesNotMatch(worldSource,/Math\.min\(5,Number\(w\.floor\)/,"named-enemy campaign pressure must not clamp to five floors");
assert.match(floorBalanceSource,/15:1\.32/,"combat damage scaling must explicitly reach Floor 15");
assert.match(floorBalanceSource,/15:1\.26/,"elite pressure scaling must explicitly reach Floor 15");

console.log("Dungeon Carnage R87 fifteen-floor theme and scaling contract passed.");
