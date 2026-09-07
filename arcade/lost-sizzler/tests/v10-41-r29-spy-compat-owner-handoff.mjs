import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const finalizer=fs.readFileSync(path.join(root,"js/v10-41-spy-movement-finalizer.js"),"utf8");
const legacy=fs.readFileSync(path.join(root,"js/v10-41-r29-runtime-repair.js"),"utf8");

const adoptStart=finalizer.indexOf("function adoptIsolatedMovementOwner()");
const adoptEnd=finalizer.indexOf("\n  function installModeBridge()",adoptStart);
assert.ok(adoptStart>=0&&adoptEnd>adoptStart,"Spy movement finalizer must expose the isolated-owner adoption boundary");
const adopt=finalizer.slice(adoptStart,adoptEnd);

assert.match(adopt,/window\.CCGLostSizzlerV141R29SpyEngine,owner=engine\?\.moveOwner/,
  "handoff must target the canonical R29 isolated movement owner");
assert.match(adopt,/if\(typeof owner!=="function"\)return false;/,
  "handoff must refuse missing or non-function owners");
assert.match(adopt,/if\(owner\.__ccgV141R29SpyOwner===true\)return true;/,
  "adoption must be idempotent once the compatibility capability is present");
assert.match(adopt,/owner\.__ccgV141R29SpyOwner=true;state\.isolatedOwnerAdoptions\+\+;/,
  "canonical isolated owner must advertise the capability expected by the retained R29 installer without adding a wrapper");

const bridgeStart=finalizer.indexOf("function installModeBridge()");
const bridgeEnd=finalizer.indexOf("\n  function install()",bridgeStart);
assert.ok(bridgeStart>=0&&bridgeEnd>bridgeStart,"event-driven Spy handoff bridge must remain present");
const bridge=finalizer.slice(bridgeStart,bridgeEnd);
assert.match(bridge,/new MutationObserver\(/,"handoff must be driven by the existing mode attribute transition rather than a poll");
assert.match(bridge,/attributeFilter:\["data-special-mode"\]/,"handoff observer must be scoped to the special-mode boundary");
assert.match(bridge,/if\(spyActive\(\)\)adoptIsolatedMovementOwner\(\);/,
  "entering Spy must adopt the isolated owner before retained compatibility maintenance can wrap it");
assert.doesNotMatch(bridge,/setInterval|setTimeout|requestAnimationFrame/,
  "the compatibility handoff must not introduce a timer or frame owner");

const legacyStart=legacy.indexOf("function installSpyMovementOwner()");
const legacyEnd=legacy.indexOf("\n\n  function desiredHordeQuota",legacyStart);
assert.ok(legacyStart>=0&&legacyEnd>legacyStart,"retained R29 Spy movement installer must remain identifiable");
const legacyOwner=legacy.slice(legacyStart,legacyEnd);
assert.match(legacyOwner,/if\(current\.__ccgV141R29SpyOwner\)\{state\.spyMoveInstalled=true;state\.lastSpyMoveSource=current;return true\}/,
  "retained R29 installer must stand down when the canonical isolated owner advertises its accepted capability");

assert.equal((finalizer.match(/setInterval\(/g)||[]).length,1,
  "Spy movement finalizer must retain only its pre-existing release-ready installer interval");

console.log("Lost Sizzler V10.41 Spy compatibility owner handoff contract passed without a competing movement wrapper.");