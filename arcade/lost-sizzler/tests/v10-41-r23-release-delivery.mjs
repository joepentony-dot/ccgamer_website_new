import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=file=>fs.readFileSync(path.join(root,file),"utf8");

const index=read("index.html");
const version=JSON.parse(read("version.json"));
const checker=read("js/version-check.js");
const late=read("js/v10-41-lake-item-safety.js");
const network=read("js/network.js");
const tutorialFinal=read("js/v10-41-tutorial-action-finalizer.js");

assert.equal(version.build,"2026.08.25.24","stability release must publish build 2026.08.25.24");
assert.equal(version.cacheToken,"20260825r24","stability release must publish cache generation r24");
assert.match(index,/ccg-lost-sizzler-build" content="2026\.08\.25\.24"/,"HTML build metadata must match r24");
assert.match(index,/ccg-lost-sizzler-cache" content="20260825r24"/,"HTML cache metadata must match r24");
assert.doesNotMatch(index,/20260825r(?:20|21|22|23)|2026\.08\.25\.(?:20|21|22|23)/,"canonical HTML must contain no superseded r20–r23 release token");
assert.doesNotMatch(index,/v10-41-live-join-presence\.js/,"canonical HTML must not duplicate the live-presence module already owned by network.js");
assert.match(checker,/const RELEASE_CACHE=String\(document\.querySelector\('meta\[name="ccg-lost-sizzler-cache"\]'\)/,"deferred release modules must derive the current cache generation from page metadata");
assert.doesNotMatch(checker,/script\.src="js\/v10-(?:36|37|38|39|40|41)-[^"?]+\.js\?v=20260824[a-z]"/,"deferred V10.36–V10.41 loaders must not retain dated cache URLs");
assert.match(late,/script\.src=`\$\{path\}\?v=\$\{encodeURIComponent\(releaseRev\)\}`/,"late stability modules must share the published release token");
assert.match(late,/load\("js\/v10-41-tutorial-action-finalizer\.js","data-ccg-v141-tutorial-action-finalizer"\)/,"the post-release tutorial action owner must remain in the r24 late runtime chain");
assert.match(late,/load\("js\/v10-41-r24-live-regressions\.js","data-ccg-v141-r24-live-regressions"\)/,"the r24 live regression owner must be included in the late runtime chain");
assert.doesNotMatch(network,/v10-41-live-join-presence\.js\?v=20260825a/,"network core must not retain the dated live-join cache URL");
assert.match(network,/v10-41-live-join-presence\.js\?v=\$\{encodeURIComponent\(releaseRev\)\}/,"network live-join loader must inherit r24 from page metadata");
assert.match(tutorialFinal,/function installMove\(\)/,"r24 must retain final tutorial movement ownership");
assert.match(tutorialFinal,/function installFire\(\)/,"r24 must retain final tutorial sword ownership");
assert.match(tutorialFinal,/function installDash\(\)/,"r24 must retain final tutorial dash ownership");

console.log("Lost Sizzler V10.41 r24 release-delivery contract passed.");
