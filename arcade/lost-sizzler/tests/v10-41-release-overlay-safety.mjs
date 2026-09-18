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
assert.ok(loader.indexOf("v10-41-release-overlay-safety.js")<loader.indexOf("const loadHordeServer"),"general overlay input safety must install before the optional Horde-only Colyseus path is armed");
assert.match(guard,/data-v142-bootstrap-ready="true"/,"active-state escape hatch must require authoritative V10.42 bootstrap readiness");
assert.match(guard,/body\[data-v142-bootstrap-ready="true"\]\[data-release-ready="true"\]\[data-run-active="true"\]\s+#ccg-release-loading/,"active runs may retire the stale loading layer only after authoritative release readiness");
assert.match(guard,/body\[data-v142-bootstrap-ready="true"\]\[data-release-ready="true"\]\[data-tutorial-active="true"\]\s+#ccg-release-loading/,"active tutorials may retire the stale loading layer only after authoritative release readiness");
assert.doesNotMatch(guard,/body\[data-run-active="true"\]\s+#ccg-release-loading/,"run-active alone must not bypass the authoritative loader");
assert.doesNotMatch(guard,/body\[data-tutorial-active="true"\]\s+#ccg-release-loading/,"tutorial-active alone must not bypass the authoritative loader");
assert.doesNotMatch(guard,/body\[data-release-ready="true"\]\s+#ccg-release-loading/,"legacy readiness alone must not bypass the authoritative V10.42 loader owner");
assert.match(guard,/#ccg-release-loading:not\(\.is-error\)/,"genuine V10.36 fatal-load presentation must remain exempt from the stale-overlay guard");
assert.match(guard,/display:none!important/,"authoritatively active gameplay must deterministically hide a stale release overlay");
assert.match(guard,/pointer-events:none!important/,"stale loading layer must not be able to intercept mouse or touch input after authoritative startup");
assert.doesNotMatch(guard,/\bsetInterval\s*\(|\bsetTimeout\s*\(|\bnew\s+MutationObserver\s*\(/,"release overlay safety must add no polling, timers or observers to gameplay");

console.log("Lost Sizzler V10.41 authoritative release-overlay gameplay input safety contract passed.");
