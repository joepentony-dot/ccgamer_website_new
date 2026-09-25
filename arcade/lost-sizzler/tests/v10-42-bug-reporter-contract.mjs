import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const reporter=fs.readFileSync(new URL("js/v10-42-bug-reporter.js",root),"utf8");
const css=fs.readFileSync(new URL("css/v10-42-bug-reporter.css",root),"utf8");
const bootstrap=fs.readFileSync(new URL("js/v10-42-bootstrap.js",root),"utf8");
const r19=fs.readFileSync(new URL("js/v10-42-r19-mobile-trap-layout-stability.js",root),"utf8");

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
assert.match(reporter,/function observeMovementBoundary\(player,stage="after"/,"environment diagnostics must receive exact movement-boundary contacts");
assert.match(reporter,/ANOMALY_ACTIVE_TRAP_CROSSING_NO_DAMAGE/,"reporter must catch fast crossings over active ordinary traps");
assert.match(reporter,/ANOMALY_ACTIVE_HAZARD_CROSSING_NO_DAMAGE/,"reporter must catch fast crossings through active dedicated hazards");
assert.match(reporter,/environment-boundary-contact/,"reporter must retain contact evidence even when the player leaves the tile before the polling loop sees it");
assert.match(reporter,/environment-trap-crossing-damage-confirmed/,"reporter must distinguish a successful crossing hit from a failed crossing");
assert.match(reporter,/row\?\.active===true&&Number\(row\?\.hitCooldown\|\|0\)<=0/,"dedicated hazard crossings under the normal hit cooldown must not be misreported as failures");
assert.match(reporter,/const environmentDamageSignals=\[\]/,"environmental contact evidence must use its own bounded signal history");
assert.match(reporter,/const MAX_ENVIRONMENT_DAMAGE_SIGNALS=80/,"environmental contact signal history must remain bounded");
assert.match(reporter,/environmentDamageSignals\.length>MAX_ENVIRONMENT_DAMAGE_SIGNALS/,"old environmental contact signals must be discarded");
assert.match(reporter,/addEventListener\("ccg:trap-damage"/,"reporter must capture exact ordinary-trap damage signals");
assert.match(reporter,/addEventListener\("ccg:hazard-damage"/,"reporter must capture exact dedicated-hazard damage signals");
assert.match(reporter,/beforeDamageSignalSerial:environmentDamageSerial/,"movement verification must snapshot the environmental signal boundary before contact resolution");
assert.match(reporter,/signal\.playerId===String\(before\?\.playerId\|\|""\)[\s\S]*signal\.x===Number\(before\?\.x\)&&signal\.y===Number\(before\?\.y\)/,"movement verification must restrict evidence to the exact player and contact cell");
assert.match(reporter,/function contactDamageSignalsSince\(before,throughSerial=Infinity\)[\s\S]*signal\.serial>serial&&signal\.serial<=upper/,"movement-boundary evidence must support an upper serial cap so later retries cannot satisfy an earlier contact");
assert.match(reporter,/movementBoundarySignals\.get\(signal\.playerId\)[\s\S]*pending\.acceptedTrapSignal=signal[\s\S]*movementBoundarySignals\.set\(record\.playerId,record\)[\s\S]*movementBoundarySignals\.delete\(before\.playerId\)/,"dash trap diagnostics must bind the exact accepted signal only to the currently pending player movement boundary");
assert.match(reporter,/boundaryDamageSignalSerial=environmentDamageSerial[\s\S]*boundaryContactSignals=contactDamageSignalsSince\(before,boundaryDamageSignalSerial\)[\s\S]*boundaryTrapSignal=before\.acceptedTrapSignal\|\|boundaryContactSignals\.find\(signal=>signal\.type==="trap"[\s\S]*boundaryTrapIds\.has\(signal\.trapId\)/,"ordinary trap confirmation must prefer the directly bound accepted signal before the bounded movement-boundary scan");
assert.match(reporter,/trapContactSignals=contactDamageSignalsSince\(before,boundaryDamageSignalSerial\)[\s\S]*trapSignal=trapContactSignals\.find\(signal=>signal\.type==="trap"[\s\S]*trapIds\.has\(signal\.trapId\)/,"delayed ordinary-trap verification must remain capped at the original movement boundary even if later damage overwrites global last-hit fields");
assert.match(reporter,/hazardSignal=contactSignals\.find\(signal=>signal\.type==="hazard"&&hazardIds\.has\(signal\.hazardId\)/,"dedicated hazard confirmation must retain the exact hazard contact signal");
assert.match(reporter,/damageObserved=Boolean\(exactSignal\)/,"polling diagnostics must require exact player-and-trap contact evidence so another player's same-kind hit cannot mask a failure");


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

const gamePlay=fs.readFileSync(new URL("js/game-play.js",root),"utf8");
assert.match(gamePlay,/CCGLostSizzlerBugReporter\?\.observeMovementBoundary\?\.\(p,"before"/,"movement boundary must snapshot environmental contact before trap resolution");
assert.match(gamePlay,/triggerTrap\(p\);\s*try\{window\.CCGLostSizzlerBugReporter\?\.observeMovementBoundary\?\.\(p,"after"/s,"movement boundary must verify environmental contact immediately after trap resolution");
assert.match(gamePlay,/__ccgLastDamageAt=damageAt/,"canonical player damage must expose a timestamp for source-attributed diagnostics");
assert.match(gamePlay,/damageSource=String\(source\|\|"enemy"\);p\.__ccgLastHurtAt=damageAt;p\.__ccgLastDamageAt=damageAt;p\.__ccgLastDamageSource=damageSource/,"canonical player damage must expose its latest source as supporting diagnostic evidence");
assert.match(gamePlay,/new CustomEvent\("ccg:trap-damage"[\s\S]*trapId:String\(t\.id\|\|\`\$\{t\.x\},\$\{t\.y\}\`\)[\s\S]*x:Number\(t\.x\),y:Number\(t\.y\),at:damageAt/,"ordinary traps must emit an exact accepted-damage contact signal");
assert.match(gamePlay,/new CustomEvent\("ccg:hazard-damage"[\s\S]*hazardId:String\(hazard\.id\|\|""\)[\s\S]*x:contactX,y:contactY,at:damageAfter/,"dedicated hazards must emit an exact accepted-damage cell signal");
assert.match(r19,/function recordTrapHit\(player,trap,contactKey,cycle\)[\s\S]*new CustomEvent\("ccg:trap-damage"[\s\S]*playerId:playerId\(player\)[\s\S]*trapId:trapId\(trap\)[\s\S]*x:Number\(trap\.x\),y:Number\(trap\.y\)/,"the authoritative R19 trap owner must emit the exact accepted player/trap contact signal");
assert.match(gamePlay,/if\(healthLost&&damageAt>beforeDamageAt\)[\s\S]*new CustomEvent\("ccg:trap-damage"/,"canonical triggerTrap must emit exact accepted-damage contact evidence after real health loss");
