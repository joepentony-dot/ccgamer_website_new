import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const core=fs.readFileSync(new URL("js/game-core.js",root),"utf8");
const local=fs.readFileSync(new URL("js/game-local-runtime.js",root),"utf8");
const audio=fs.readFileSync(new URL("js/audio.js",root),"utf8");
const reporter=fs.readFileSync(new URL("js/v10-42-bug-reporter.js",root),"utf8");

assert.match(local,/_ccgPickupAudioAt=performance\.now\(\)/,"collection boundary must timestamp pickup audio");
assert.match(local,/CustomEvent\("ccg:item-collected"/,"collection boundary must expose item identity to diagnostics");
assert.match(local,/kind:String\(i\.kind\|\|""\)/);
assert.match(local,/name:collectedName\(i\)/);
assert.match(local,/lootKind:String\(i\.loot\?\.kind\|\|""\)/);

assert.match(core,/pickupAge=performance\.now\(\)-pickupAt/,"level audio must measure distance from the collection sound");
assert.match(core,/pickupAge<240\?Math\.ceil\(260-pickupAge\):0/,"pickup-triggered level audio must be staggered beyond the pickup transient");
assert.match(core,/setTimeout\(\(\)=>S\.sfx\("level"\),levelDelay\)/);
assert.match(core,/showToast\(`LEVEL \$\{p\.level\}`/,"level presentation must remain immediate");
assert.match(core,/queueLevelChoice\(p\)/,"level choice progression must remain unchanged");

assert.match(audio,/CustomEvent\("ccg:sfx"/,"audio owner must publish observation-only SFX events");
assert.match(audio,/name:String\(name\|\|""\)/);
assert.match(audio,/CustomEvent\("ccg:music-state"/,"audio owner must publish observation-only music-state transitions");
assert.match(audio,/stalkerNear:Boolean\(stalkerNear\)/);
assert.match(audio,/stalkerSight:Boolean\(stalkerSight\)/);
assert.match(audio,/publishMusicState\("stalker-near"\)/);
assert.match(audio,/publishMusicState\("stalker-sight"\)/);
assert.match(reporter,/addEventListener\("ccg:sfx"/,"incident reporter must record SFX names");
assert.match(reporter,/addEventListener\("ccg:music-state"/,"incident reporter must record threat music transitions");
assert.match(reporter,/stalkerNear:Boolean\(event\.detail\?\.stalkerNear\)/);
assert.match(reporter,/stalkerSight:Boolean\(event\.detail\?\.stalkerSight\)/);
assert.match(reporter,/addEventListener\("ccg:item-collected"/,"incident reporter must record exact collected item identity");
assert.match(reporter,/push\("sfx"/);
assert.match(reporter,/push\("item-collected"/);

console.log("Dungeon Carnage pickup/threat audio diagnostics contract passed.");
