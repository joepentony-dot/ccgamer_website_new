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
const r28=read("js/v10-41-r28-special-mode-repair.js");
const r29=read("js/v10-41-r29-runtime-repair.js");

assert.equal(version.releaseVersion,"V10.42","current stability release must publish V10.42");
assert.ok(index.includes(`ccg-lost-sizzler-build" content="${version.build}"`),"HTML build metadata must match the published build");
assert.ok(index.includes(`ccg-lost-sizzler-cache" content="${version.cacheToken}"`),"HTML cache metadata must match the published cache generation");
assert.doesNotMatch(index,/20260825r(?:20|21|22|23|24|25|26|27|28)|2026\.08\.25\.(?:20|21|22|23|24|25|26|27|28)/,"canonical HTML must contain no superseded r20–r28 release token");
assert.doesNotMatch(index,/v10-41-live-join-presence\.js/,"canonical HTML must not duplicate the live-presence module already owned by network.js");
assert.match(checker,/const RELEASE_CACHE=String\(document\.querySelector\('meta\[name="ccg-lost-sizzler-cache"\]'\)/,"deferred release modules must derive the current cache generation from page metadata");
assert.doesNotMatch(checker,/script\.src="js\/v10-(?:36|37|38|39|40|41)-[^"?]+\.js\?v=20260824[a-z]"/,"deferred V10.36–V10.41 loaders must not retain dated cache URLs");
assert.match(late,/script\.src=`\$\{path\}\?v=\$\{encodeURIComponent\(releaseRev\)\}`/,"late stability modules must share the published release token");
assert.match(late,/load\("js\/v10-41-tutorial-action-finalizer\.js","data-ccg-v141-tutorial-action-finalizer"\)/,"the post-release tutorial action owner must remain in the late runtime chain");
assert.match(late,/load\("js\/v10-41-r24-live-regressions\.js","data-ccg-v141-r24-live-regressions"\)/,"the r24 live regression owner must remain included beneath the later hotfix layers");

const token=version.cacheToken;
const r28Url=`v10-41-r28-special-mode-repair.js?v=${token}`;
const r29Url=`v10-41-r29-runtime-repair.js?v=${token}`;
assert.doesNotMatch(index,/v10-41-r25-spy-speed-bounty-hotfix\.js/,"retired r25 Spy hotfix must not be directly loaded by the canonical page");
assert.doesNotMatch(index,/v10-41-r26-spy-enemy-stability\.js/,"retired r26 Spy stability layer must not be directly loaded by the canonical page");
assert.doesNotMatch(index,/v10-41-r27-spy-isolation\.js/,"retired r27 Spy isolation layer must not be directly loaded by the canonical page");
assert.ok(index.includes(r28Url),"the retained mixed r28 compatibility layer must remain loaded until its shared Dungeon fire path is extracted");
assert.ok(index.includes(r29Url),"the retained mixed r29 runtime repair must remain loaded until shared runtime protections are extracted");
assert.ok(index.indexOf(r28Url)<index.indexOf(r29Url),"r29 must load after the retained r28 compatibility layer");
assert.match(r28,/__CCG_LOST_SIZZLER_V141_R28_SPECIAL_MODE_REPAIR__/,"r28 compatibility layer must retain its duplicate-install guard until extraction");
assert.match(r29,/__CCG_LOST_SIZZLER_V141_R29_RUNTIME_REPAIR__/,"r29 shared runtime layer must retain its duplicate-install guard until extraction");
assert.doesNotMatch(network,/v10-41-live-join-presence\.js\?v=20260825a/,"network core must not retain the dated live-join cache URL");
assert.match(network,/v10-41-live-join-presence\.js\?v=\$\{encodeURIComponent\(releaseRev\)\}/,"network live-join loader must inherit the published cache generation from page metadata");
assert.match(tutorialFinal,/function installMove\(\)/,"current release must retain final tutorial movement ownership");
assert.match(tutorialFinal,/function installFire\(\)/,"current release must retain final tutorial sword ownership");
assert.match(tutorialFinal,/function installDash\(\)/,"current release must retain final tutorial dash ownership");

console.log("C64 Dungeon Carnage V10.42 active release-delivery contract passed.");
