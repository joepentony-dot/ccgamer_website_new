import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const runtime=fs.readFileSync(path.join(root,"js/v10-41-r29-spy-engine-isolation.js"),"utf8");

const start=runtime.indexOf("function ensureMovementOwner(countRecovery=false)");
const end=runtime.indexOf("\n\n  function ensureDamageBoundary()",start);
assert.ok(start>=0&&end>start,"R29 Spy movement ownership helper must remain present");
const owner=runtime.slice(start,end);

assert.match(owner,/if\(current===spyMoveOwner\)return true;/,"an already-canonical Spy movement owner must be a no-op");
assert.match(owner,/if\(!state\.isolated\)\{[\s\S]*state\.baseMove=current;[\s\S]*spyMoveOwner\.__ccgOriginal=current;[\s\S]*\}/,"the displaced movement delegate may only be captured during fresh Spy isolation entry");
assert.match(owner,/if\(!state\.isolated\)\{[\s\S]*ownerChainHas\(current,spyMoveOwner\)[\s\S]*window\.movePlayer=spyMoveOwner/,
  "fresh entry must still collapse stale ancestry back to the canonical Spy owner");
assert.match(owner,/\}\s*window\.movePlayer=spyMoveOwner;\s*if\(countRecovery\)state\.moveReassertions\+\+;/,
  "active-session recovery must reassert the canonical owner after the fresh-entry capture block");
assert.equal((owner.match(/state\.baseMove=current/g)||[]).length,1,"movement delegate capture must have exactly one assignment site");
assert.equal((owner.match(/spyMoveOwner\.__ccgOriginal=current/g)||[]).length,1,"Spy owner ancestry delegate must have exactly one assignment site");
assert.match(runtime,/if\(state\.isolated\)\{ensureMovementOwner\(true\);ensureDamageBoundary\(\);suppressLegacyPhysicalBuilder\(\);return true\}/,
  "controller re-entry must use the non-rebasing active-isolation recovery path");
assert.match(runtime,/if\(!state\.isolated\)enterIsolation\(\);\s*else\{ensureMovementOwner\(true\);ensureDamageBoundary\(\)\}/,
  "legacy monitor recovery must use the same non-rebasing active-isolation path");

console.log("Lost Sizzler V10.41 Spy movement delegate capture-on-entry and active-session ancestry stability checks passed.");