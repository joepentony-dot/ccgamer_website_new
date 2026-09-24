import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const reporter=fs.readFileSync(new URL("js/v10-42-bug-reporter.js",root),"utf8");
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
assert.match(reporter,/addEventListener\("ccg:sfx"/,"reporter must retain named SFX evidence");
assert.match(reporter,/ccg:shop-firearm-upgrade/,"reporter must retain firearm shop transaction evidence");
assert.match(reporter,/const TRAP_PROBE_MS=40/,"trap contact observation must sample faster than the tile movement cadence");
assert.match(reporter,/function trapProbe\(\)/,"reporter must observe real player/trap overlap without taking gameplay ownership");
assert.match(reporter,/ANOMALY_ACTIVE_TRAP_NO_DAMAGE/,"reporter must flag an active floor trap that fails to remove health");
assert.match(reporter,/ANOMALY_MULTIPLE_TRAPS_SAME_TILE/,"reporter must expose duplicate ordinary trap objects occupying one tile");
assert.match(reporter,/trap-active-contact-observed/,"reporter must record the exact active trap contact before delayed verification");
assert.match(reporter,/trap-active-damage-confirmed/,"reporter must distinguish verified trap health loss from a failed contact");
assert.match(reporter,/trapHitsByKind/,"trap diagnostics must retain per-kind FIRE SPIKE and SHOCK hit evidence");
assert.match(reporter,/CCGLostSizzlerV141R56PlaytestCompletion/,"trap report must capture the retained R56 cycle latch");
assert.match(reporter,/CCGLostSizzlerV141R57DesktopPrepStability/,"trap report must capture the retained R57 cycle latch");
assert.match(reporter,/__ccgV141R60EnvironmentSeal/,"trap report must expose the retained R60 environmental damage owner");
assert.match(reporter,/__ccgV142R18/,"trap report must expose the later R18 damage wrapper");
assert.match(reporter,/owners:\{hurtPlayer:ownerChain\(window\.hurtPlayer\),triggerTrap:ownerChain\(window\.triggerTrap\)\}/,"trap report must capture live hurt/trigger ownership chains");
assert.match(reporter,/fire1:/);
assert.match(reporter,/fireBuffer1:/);
assert.match(reporter,/activeProjectiles/);
assert.match(reporter,/inventory:panelState\("inventory-panel"\)/);
assert.match(reporter,/memoryPuzzle/);
assert.match(reporter,/addEventListener\("error"/);
assert.match(reporter,/unhandledrejection/);
assert.match(reporter,/sessionStorage\.setItem\("ccg-dungeon-last-bug-report"/);
assert.match(reporter,/params\.get\("bugreport"\)==="1"/,"mobile/desktop developer UI must be explicitly enableable by query");
assert.match(reporter,/localStorage\.setItem\("ccg-dungeon-bug-reporter","1"\)/,"developer UI preference must persist after opt-in");
assert.match(reporter,/data-bug-copy/);
assert.match(reporter,/data-bug-save/);
assert.match(reporter,/F8/);
assert.match(reporter,/clearInterval\(state\.sampleTimer\)/,"diagnostic timer must be cleaned up on page exit");
assert.match(reporter,/clearInterval\(state\.trapProbeTimer\)/,"trap observer timer must be cleaned up on page exit");

assert.match(css,/#ccg-bug-report-btn/);
assert.match(css,/#ccg-bug-report-modal/);
assert.match(css,/@media \(max-width:700px\)/,"reporter must remain usable on mobile");

console.log("Dungeon Carnage bounded incident reporter contract passed.");
