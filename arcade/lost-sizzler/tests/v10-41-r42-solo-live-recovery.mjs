import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-41-r42-solo-live-recovery.js"),"utf8");
const loader=fs.readFileSync(path.join(root,"js/v10-41-lake-item-safety.js"),"utf8");

assert.match(loader,/load\("js\/v10-41-r42-solo-live-recovery\.js","data-ccg-v141-r42-solo-live-recovery"\)/,"late V10.41 loader must install the Solo live-recovery guard");
assert.match(source,/run\.daily/,"Weekly Vault runs must be excluded from Solo recovery ownership");
assert.match(source,/String\(playMode\|\|""\)!=="solo"/,"recovery must be restricted to normal Solo playMode");
assert.match(source,/\!p1\|\|p2\|\|!world\|\|!host/,"Split Screen and incomplete runtime state must be excluded");
assert.match(source,/tutorialOwned\(\)/,"Tutorial ownership must be excluded");
assert.match(source,/specialType\(\)/,"special Horde/Spy modes must be excluded");
assert.match(source,/Boolean\(net\?\.connected\)/,"connected multiplayer sessions must be excluded");
assert.match(source,/getImageData\(0,0,20,12\)/,"Solo canvas watchdog must inspect a small downsampled probe rather than reading the full frame");
assert.match(source,/blackProbeStreak>=2/,"one dark probe must not be enough to trigger black-frame recovery");
assert.match(source,/captureGoodFrame/,"watchdog must preserve a last-good frame");
assert.match(source,/restoreGoodFrame/,"watchdog must be able to restore the last-good frame");
assert.match(source,/__ccgV141R42SoloBlackGuard/,"render wrapper must carry a stable ownership marker");
assert.match(source,/__ccgV141PostPlaytestRender/,"r42 must preserve the retained post-playtest render owner marker instead of fighting its monitor");
assert.match(source,/__ccgV141R28NoHordeBanner/,"r42 must preserve the retained r28 render owner marker instead of fighting its monitor");
assert.match(source,/descendFloorV141R42SoloRecovery/,"real floor descent must have a post-transition recovery boundary");
assert.match(source,/scheduleTransitionRecovery\(after\)/,"recovery must be scheduled only after the floor number actually advances");
assert.match(source,/fire1=0/,"stale Solo fire cooldown must be recoverable");
assert.match(source,/p1\.hitStunMs=0/,"stale Solo hit-stun must be recoverable");
assert.match(source,/p1\.controlLocked=false/,"stale Solo control lock must be recoverable");
assert.match(source,/lastAttackIntentAt/,"combat repair must require observed player attack intent");
assert.doesNotMatch(source,/\bfirePlayer\s*\(/,"recovery guard must never synthesize a player attack");
assert.doesNotMatch(source,/p1\.mana\s*\+=|p1\.mana\s*=\s*Math\.max/,"recovery guard must never grant ammunition");
assert.doesNotMatch(source,/net\.send\s*\(/,"Solo guard must not add network gameplay traffic");
assert.doesNotMatch(source,/ccgSupabase|supabase/i,"Solo guard must not introduce persistence/network coupling");

console.log("V10.41 r42 Solo live render/combat recovery contract passed.");
