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

assert.equal(version.build,"2026.08.25.21","stability release must publish build 2026.08.25.21");
assert.equal(version.cacheToken,"20260825r21","stability release must publish cache generation r21");
assert.match(index,/ccg-lost-sizzler-build" content="2026\.08\.25\.21"/,"HTML build metadata must match r21");
assert.match(index,/ccg-lost-sizzler-cache" content="20260825r21"/,"HTML cache metadata must match r21");
assert.doesNotMatch(index,/20260825r20|2026\.08\.25\.20/,"canonical HTML must contain no r20 release token");
assert.match(checker,/const RELEASE_CACHE=String\(document\.querySelector\('meta\[name="ccg-lost-sizzler-cache"\]'\)/,"deferred release modules must derive the current cache generation from page metadata");
assert.doesNotMatch(checker,/script\.src="js\/v10-(?:36|37|38|39|40|41)-[^"?]+\.js\?v=20260824[a-z]"/,"deferred V10.36–V10.41 loaders must not retain dated cache URLs");
assert.match(late,/script\.src=`\$\{path\}\?v=\$\{encodeURIComponent\(releaseRev\)\}`/,"late stability modules must share the published release token");

console.log("Lost Sizzler V10.41 r21 release-delivery contract passed.");
