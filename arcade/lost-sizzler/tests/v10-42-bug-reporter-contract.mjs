import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const reporter=fs.readFileSync(new URL("js/v10-42-bug-reporter.js",root),"utf8");
const audio=fs.readFileSync(new URL("js/audio.js",root),"utf8");
const css=fs.readFileSync(new URL("css/v10-42-bug-reporter.css",root),"utf8");
const bootstrap=fs.readFileSync(new URL("js/v10-42-bootstrap.js",root),"utf8");

const r18=bootstrap.indexOf('v10-42-r18-solo-playtest-stability.js');
const bug=bootstrap.indexOf('v10-42-bug-reporter.js');
assert.ok(r18>=0&&bug>r18,"incident reporter must load after established combat/input stability owners");

assert.match(reporter,/observationOnly:true/);
assert.match(reporter,/gameplayOwnership:false/);
assert.match(reporter,/inputOwnership:false/);
assert.match(reporter,/renderOwnership:false/);
for(const owner of ["firePlayer","queueAttack","movePlayer","toggleInventory","renderView","update"]){
  assert.doesNotMatch(reporter,new RegExp(String.raw`\\b${owner}\\s*=`),`incident reporter must not replace ${owner}`);
}
assert.match(reporter,/const MAX_EVENTS=240/,"diagnostic history must remain bounded");
assert.match(reporter,/events\.length>MAX_EVENTS/,"old diagnostics must be discarded instead of growing indefinitely");
assert.match(reporter,/ANOMALY_POSSIBLE_FIRE_FAILURE/,"reporter must flag a failed valid fire attempt");
assert.match(reporter,/fire1:/);
assert.match(reporter,/fireBuffer1:/);
assert.match(reporter,/activeProjectiles/);
assert.match(reporter,/inventory:panelState\("inventory-panel"\)/);
assert.match(reporter,/memoryPuzzle/);
assert.match(reporter,/addEventListener\("error"/);
assert.match(reporter,/unhandledrejection/);
assert.match(reporter,/sessionStorage\.setItem\("ccg-dungeon-last-bug-report"/);
assert.match(audio,/CustomEvent\("ccg:sfx"/,"audio owner must expose SFX names to diagnostics without changing the sound decision");
assert.match(reporter,/addEventListener\("ccg:sfx"/,"bug reporter must retain recent SFX names");
assert.match(reporter,/ccg:shop-firearm-upgrade/,"bug reporter must record the dedicated shop firearm transaction event");
assert.match(reporter,/params\.get\("bugreport"\)==="1"/,"mobile/desktop developer UI must be explicitly enableable by query");
assert.match(reporter,/localStorage\.setItem\("ccg-dungeon-bug-reporter","1"\)/,"developer UI preference must persist after opt-in");
assert.match(reporter,/data-bug-copy/);
assert.match(reporter,/data-bug-save/);
assert.match(reporter,/F8/);
assert.match(reporter,/clearInterval\(state\.sampleTimer\)/,"diagnostic timer must be cleaned up on page exit");

assert.match(css,/#ccg-bug-report-btn/);
assert.match(css,/#ccg-bug-report-modal/);
assert.match(css,/@media \(max-width:700px\)/,"reporter must remain usable on mobile");

console.log("Dungeon Carnage bounded incident reporter contract passed.");
