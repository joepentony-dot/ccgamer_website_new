import fs from "node:fs";
import assert from "node:assert/strict";

const read=(path)=>fs.readFileSync(path,"utf8");
const index=read("arcade/lost-sizzler/index.html");
const deploy=read(".github/workflows/deploy-github-pages-omega-stable.yml");
const loadSafety=read(".github/workflows/lost-sizzler-load-safety.yml");
const home=read("home.html");
const homeRuntime=read("js/ccg-home-community.js");
const sw=read("service-worker.js");
const cacheGuard=read("arcade/lost-sizzler/js/v10-41-cache-guard.js");
const canonicalOwner=read("arcade/lost-sizzler/js/v10-18-input-ui-bugfixes.js");
const packageBuilder=read("scripts/build-c64-dungeon-carnage-itch-package.mjs");
const oldGameEntry=read("games/the-lost-sizzler/index.html");
const oldQuestEntry=read("games/ccg-games/cheeky-commodore-quest/index.html");

const canonical="/arcade/c64-dungeon-carnage/";
const legacy="/arcade/lost-sizzler/";

assert.match(index,/https:\/\/www\.cheekycommodoregamer\.co\.uk\/arcade\/c64-dungeon-carnage\//,"canonical source page must publish the Dungeon Carnage public URL");
assert.match(home,/href="\/arcade\/c64-dungeon-carnage\/"/,"home HTML CTA must use the Dungeon Carnage public URL");
assert.match(homeRuntime,/const lostSizzlerUrl = "\/arcade\/c64-dungeon-carnage\/";/,"home runtime must not overwrite the CTA with the legacy route");
assert.match(homeRuntime,/image\.src = "\/arcade\/c64-dungeon-carnage\/assets\/lost-sizzler\.webp";/,"home recognition art must load from the canonical public route");
assert.ok(sw.includes(canonical)&&sw.includes(legacy),"service worker must treat canonical and legacy arcade paths as Dungeon Carnage");
assert.match(sw,/CODE_CACHE_VERSION = "2026-09-23-public-code-v7"/,"public route owner changes must use a fresh public code cache namespace");
assert.ok(cacheGuard.includes(canonical)&&cacheGuard.includes(legacy),"game cache sanitation must cover canonical and legacy arcade paths");
assert.match(canonicalOwner,/const CANONICAL_PATH="\/arcade\/c64-dungeon-carnage\/";/,"late canonical owner must agree with the deployed public route");
assert.match(packageBuilder,/const SOURCE_ROOT=path\.join\(REPO_ROOT,"arcade","lost-sizzler"\);/,"repository source path must remain arcade/lost-sizzler");
assert.match(packageBuilder,/CANONICAL_GAME_URL="https:\/\/www\.cheekycommodoregamer\.co\.uk\/arcade\/c64-dungeon-carnage\/"/,"itch handoff must advertise the new canonical website route");
for(const page of [oldGameEntry,oldQuestEntry]){
  assert.ok(page.includes(canonical),"legacy entry page must redirect directly to the new canonical route");
  assert.equal(page.includes('href="'+legacy+'"'),false,"legacy entry page must not send users through a second redirect");
}
assert.match(deploy,/test -d _site\/arcade\/lost-sizzler/,"deployment must retain the historical repository/source staging path");
assert.match(deploy,/cp -a _site\/arcade\/lost-sizzler _site\/arcade\/c64-dungeon-carnage/,"deployment must copy the source tree to the renamed public route");
assert.match(deploy,/mkdir -p _site\/arcade\/lost-sizzler/,"deployment must retain the compatibility route");
assert.ok(loadSafety.includes("tests/dungeon-carnage-public-route.test.mjs"),"load safety must execute the public-route ownership contract");

console.log("Dungeon Carnage public-route ownership contract passed.");
