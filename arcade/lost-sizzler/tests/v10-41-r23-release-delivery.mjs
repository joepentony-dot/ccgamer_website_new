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
const r25=read("js/v10-41-r25-spy-speed-bounty-hotfix.js");
const r26=read("js/v10-41-r26-spy-enemy-stability.js");

assert.equal(version.build,"2026.08.25.27","stability release must publish build 2026.08.25.27");
assert.equal(version.cacheToken,"20260825r27","stability release must publish cache generation r27");
assert.match(index,/ccg-lost-sizzler-build" content="2026\.08\.25\.27"/,"HTML build metadata must match r27");
assert.match(index,/ccg-lost-sizzler-cache" content="20260825r27"/,"HTML cache metadata must match r27");
assert.doesNotMatch(index,/20260825r(?:20|21|22|23|24|25|26)|2026\.08\.25\.(?:20|21|22|23|24|25|26)/,"canonical HTML must contain no superseded r20–r26 release token");
assert.doesNotMatch(index,/v10-41-live-join-presence\.js/,"canonical HTML must not duplicate the live-presence module already owned by network.js");
assert.match(checker,/const RELEASE_CACHE=String\(document\.querySelector\('meta\[name="ccg-lost-sizzler-cache"\]'\)/,"deferred release modules must derive the current cache generation from page metadata");
assert.doesNotMatch(checker,/script\.src="js\/v10-(?:36|37|38|39|40|41)-[^"?]+\.js\?v=20260824[a-z]"/,"deferred V10.36–V10.41 loaders must not retain dated cache URLs");
assert.match(late,/script\.src=`\$\{path\}\?v=\$\{encodeURIComponent\(releaseRev\)\}`/,"late stability modules must share the published release token");
assert.match(late,/load\("js\/v10-41-tutorial-action-finalizer\.js","data-ccg-v141-tutorial-action-finalizer"\)/,"the post-release tutorial action owner must remain in the late runtime chain");
assert.match(late,/load\("js\/v10-41-r24-live-regressions\.js","data-ccg-v141-r24-live-regressions"\)/,"the r24 live regression owner must remain included beneath the later hotfix layers");
assert.match(index,/v10-41-r25-spy-speed-bounty-hotfix\.js\?v=20260825r27/,"the r25 Spy speed/bounty hotfix must remain directly loaded under the current r27 cache shell");
assert.match(index,/v10-41-r26-spy-enemy-stability\.js\?v=20260825r27/,"the r26 Spy/enemy stability layer must be directly loaded last by the canonical page");
assert.ok(index.indexOf("v10-41-r25-spy-speed-bounty-hotfix.js?v=20260825r27")<index.indexOf("v10-41-r26-spy-enemy-stability.js?v=20260825r27"),"r26 must load after r25");
assert.match(r25,/__CCG_LOST_SIZZLER_V141_R25_SPY_SPEED_BOUNTY_HOTFIX__/,"r25 hotfix must retain a duplicate-install guard");
assert.match(r26,/__CCG_LOST_SIZZLER_V141_R26_SPY_ENEMY_STABILITY__/,"r26 hotfix must retain a duplicate-install guard");
assert.doesNotMatch(network,/v10-41-live-join-presence\.js\?v=20260825a/,"network core must not retain the dated live-join cache URL");
assert.match(network,/v10-41-live-join-presence\.js\?v=\$\{encodeURIComponent\(releaseRev\)\}/,"network live-join loader must inherit r27 from page metadata");
assert.match(tutorialFinal,/function installMove\(\)/,"current release must retain final tutorial movement ownership");
assert.match(tutorialFinal,/function installFire\(\)/,"current release must retain final tutorial sword ownership");
assert.match(tutorialFinal,/function installDash\(\)/,"current release must retain final tutorial dash ownership");

console.log("Lost Sizzler V10.41 r27 release-delivery contract passed.");
