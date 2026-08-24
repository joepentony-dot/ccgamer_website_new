import fs from "node:fs";
import assert from "node:assert/strict";

const patch=fs.readFileSync(new URL("../js/v10-41-sanctuary-hardening.js",import.meta.url),"utf8");
const quality=fs.readFileSync(new URL("../js/v10-35-quality.js",import.meta.url),"utf8");

assert.match(patch,/\["arenas","timedRooms"\]/,"sanctuary hardening must remove arena and timed-room assignments");
assert.match(patch,/challenge=>!ids\.has\(Number\(challenge\?\.roomId\)\)/,"sanctuary challenge filtering must be keyed to sanctuary room ids");
assert.match(patch,/triggerArenaV141SanctuaryGuard/,"arena trigger must have a sanctuary guard");
assert.match(patch,/triggerTimedV141SanctuaryGuard/,"timed-room trigger must have a sanctuary guard");
assert.match(patch,/tryDoorV141SanctuaryFailSafe/,"ordinary sanctuary doors must have a runtime release fail-safe");
assert.match(patch,/leaf\.locked=false;\s*leaf\.open=true/,"a blocked sanctuary challenge door must be unlocked and opened");
assert.match(patch,/door\.type==="secret"\|\|door\.sigilGate\|\|door\.sigilAnnex/,"secret and Sigil gates must not be accidentally converted into sanctuary exits");
assert.match(quality,/if\(room\.sanctuary\)continue/,"sanctuary enemy expulsion must remain active");
assert.match(quality,/host\.sanctuaryRegeneration/,"sanctuary regeneration tiles must remain installed");

console.log("V10.41 sanctuary progression regression checks passed.");
