import assert from "node:assert/strict";
import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const play=read("arcade/lost-sizzler/js/game-play.js");
const r20=read("arcade/lost-sizzler/js/v10-42-r20-live-regression-stability.js");
const reporter=read("arcade/lost-sizzler/js/v10-42-bug-reporter.js");
const canonical=read("arcade/lost-sizzler/index.html");
const alias=read("arcade/c64-dungeon-carnage/index.html");
const version=JSON.parse(read("arcade/lost-sizzler/version.json"));
const cache="20260925r57";

assert.match(play,/hurtPlayer\(p,1,false,\`\$\{hazard\.title\|\|"hazard chamber"\} trap\`\)/,"dedicated hazard rooms must identify their damage as trap damage so the hardened environmental owner applies");
assert.match(r20,/function recoverThroughDeepFireOwner\(/,"R20 must expose a retained-owner attack recovery path");
assert.match(r20,/if\(!fired\)fired=recoverThroughDeepFireOwner\(/,"attackNow must actually invoke the retained-owner fallback when the live outer owner swallows an attack");
assert.match(r20,/deepOwnerFallbackSuccesses/,"retained-owner recovery must be diagnosable");
assert.match(r20,/function recoverThroughCapturedR1FireOwner\(/,"R20 must expose the final canonical R1 FIRE recovery boundary");
assert.match(r20,/if\(!fired\)fired=recoverThroughCapturedR1FireOwner\(/,"attackNow must invoke the captured R1 fallback after the existing recovery chain fails");
assert.match(r20,/capturedR1FallbackSuccesses/,"captured R1 fallback must be diagnosable");
assert.match(reporter,/dedicatedHazardUnderPlayer:dedicatedHazardSnapshot\(player\)/,"bug reporter must capture dedicated hazard state under the player");
assert.match(reporter,/meleeSwingAt:Number\(player\._meleeSwingAt\|\|0\)/,"bug reporter must observe melee as a valid ATTACK result");
assert.match(reporter,/ANOMALY_POSSIBLE_ATTACK_FAILURE/,"bug reporter must flag complete attack failures, not firearm-only failures");
assert.ok(canonical.includes(`ccg-lost-sizzler-cache" content="${cache}`),"canonical runtime must publish the critical-fix cache token");
assert.ok(alias.includes(`ccg-lost-sizzler-cache" content="${cache}`),"raw-main public-route alias must publish the same critical-fix cache token");
assert.ok(canonical.includes(`game-play.js?v=${cache}`),"canonical game-play script must bypass the older cached R54 core");
assert.ok(alias.includes(`game-play.js?v=${cache}`),"route alias must bypass the older cached R54 core");
assert.equal(version.cacheToken,cache,"version metadata must publish the critical-fix cache token");
console.log("PASS critical combat/trap recovery contract");
