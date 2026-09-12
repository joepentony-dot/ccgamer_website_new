import assert from 'node:assert/strict';
import fs from 'node:fs';

const path = new URL('../js/v10-41-r30-global-movement-guard.js', import.meta.url);
const source = fs.readFileSync(path, 'utf8');

assert.match(source, /MONITOR_MS=40,OWNERSHIP_AUDIT_MS=1000/,
  'the existing 40 ms recovery cadence must remain while deep ownership audits are throttled separately');
assert.match(source, /ownershipAuditRefs:null,ownershipAuditHealthy:false,ownershipAuditNextAt:0,ownershipDeepAudits:0,ownershipFastPathSkips:0,baselineFastPathSkips:0/,
  'R30 must expose bounded audit diagnostics');
assert.match(source, /state\.ownershipAuditHealthy&&ownershipRefsUnchanged\(currentUpdate,currentMove,currentHurt\)&&now<state\.ownershipAuditNextAt/,
  'unchanged verified owners should take the fast path between deep audits');
assert.match(source, /state\.ownershipDeepAudits\+\+/,
  'deep ownership audits must remain observable');
assert.match(source, /state\.ownershipAuditNextAt=now\+OWNERSHIP_AUDIT_MS/,
  'a completed deep audit must schedule the next bounded verification window');
assert.match(source, /state\.ownershipAuditHealthy=!\(updateBad\|\|moveBad\|\|hurtBad\)/,
  'only a fully healthy deep audit may enable the fast path');
assert.match(source, /state\.goldenLocked&&state\.ownershipAuditHealthy&&ownershipRefsUnchanged\(window\.update,window\.movePlayer,window\.hurtPlayer\)/,
  'baseline capture must also avoid repeating ancestry scans for the same verified owners');
assert.match(source, /function invalidateOwnershipAudit\(\)/,
  'the cache must have an explicit invalidation boundary');
assert.match(source, /state\.spyOwnerUpdate=state\.spyOwnerMove=state\.spyOwnerHurt=null;invalidateOwnershipAudit\(\);noteRecovery/,
  'runtime ownership repair must invalidate the cached healthy snapshot');
assert.match(source, /state\.modeTransitions\+\+;resetWatch\(watches\.p1\);resetWatch\(watches\.p2\);invalidateOwnershipAudit\(\)/,
  'mode transitions must invalidate the cached healthy snapshot');
assert.match(source, /if\(spyActive\(\)\)\{\n      invalidateOwnershipAudit\(\);/,
  'Spy isolation must never reuse a normal-mode healthy snapshot');

assert.doesNotMatch(source, /MONITOR_MS=(?!40)/,
  'the recovery/watchdog interval must not be lengthened to hide the scan problem');

console.log('C64 Dungeon Carnage R30 ownership audit throttle contract passed.');
