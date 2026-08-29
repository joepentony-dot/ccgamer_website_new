import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const guard=read("js/v10-41-release-overlay-safety.js");
const loader=read("js/v10-41-lake-item-safety.js");

assert.doesNotThrow(()=>new Function(guard),"release overlay safety module must parse as valid JavaScript");
assert.match(loader,/load\("js\/v10-41-release-overlay-safety\.js","data-ccg-v141-release-overlay-safety"\)/,"late loader must install the release overlay input guard");
assert.ok(loader.indexOf("v10-41-release-overlay-safety.js")>loader.indexOf("v10-41-r38-colyseus-horde.js"),"overlay guard should install after the new Horde transport and other late runtime work");
assert.match(guard,/data-release-ready="true"/,"ready pages must force the stale loading layer out of the interaction stack");
assert.match(guard,/data-run-active="true"/,"active runs must force the stale loading layer out of the interaction stack");
assert.match(guard,/pointer-events:none!important/,"stale loading layer must not be able to intercept mouse or touch input");
assert.match(guard,/classList\?\.contains\("is-error"\)/,"genuine V10.36 fatal-load presentation must remain exempt from the stale-overlay guard");
assert.match(guard,/CCGLostSizzlerReleaseGate\?\.state\?\.failed===true/,"release-gate failures must not be hidden by the gameplay safety layer");
assert.match(guard,/MutationObserver\(\(\)=>releaseOverlay\(\)\)/,"guard must immediately re-hide a stale overlay if older loading code makes it visible again");

console.log("Lost Sizzler V10.41 release-overlay gameplay input safety contract passed.");
