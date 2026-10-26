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
const publicEntry=read("arcade/c64-dungeon-carnage/index.html");
const version=JSON.parse(read("arcade/lost-sizzler/version.json"));
const releaseCache=version.cacheToken;
const releaseBuild=version.build;
const releaseLabel=releaseBuild.toUpperCase();
const releaseIndex=Number(/\br(\d+)$/i.exec(releaseBuild)?.[1]||0);
assert.ok(releaseIndex>=136,"Dungeon Carnage must not downgrade below the R136 warp-stack and chest-notice fixes");
assert.match(releaseBuild,/^V10\.42 r\d+$/,"Dungeon Carnage version marker must have a stable V10.42 release format");
assert.match(releaseCache,/^\d{8}r\d+$/,"Dungeon Carnage release must publish a dated cache token");
assert.equal(Number(/r(\d+)$/.exec(releaseCache)?.[1]||0),releaseIndex,"Cache release index must match build number");
for(const [name,page] of [["source",index],["public",publicEntry]]){
  assert.ok(page.includes(`<meta name="ccg-lost-sizzler-build" content="${releaseBuild}">`),name+" build metadata must match version.json");
  assert.ok(page.includes(`<meta name="ccg-lost-sizzler-cache" content="${releaseCache}">`),name+" must match version.json cache token");
  assert.ok(page.includes(`<summary>Latest Build Changes · ${releaseLabel}</summary>`),name+" visible changelog must match the release");
  assert.ok(page.includes(`ACTIVE BUILD: ${releaseLabel}`),name+" visible active build must match the release");
  assert.ok(page.includes("flickering animated wall torches")&&page.includes("rotating gold-score coins"),name+" changelog must preserve R118 animation notes");
  assert.ok(page.includes("R119 improves permanent sanctuary spacing")&&page.includes("Treasure Goblin"),name+" changelog must preserve the R119 gameplay corrections");
  assert.ok(page.includes("R134 upgrades the visual presentation of spike traps"),name+" must describe the R134 art release");
  assert.ok(page.includes("R135 upgrades treasure chests"),name+" must preserve the R135 art release");
  assert.ok(page.includes("R136 makes Warp/Teleport Spells stack three"),name+" must show the new R136 testable behaviour");
  assert.ok(!page.includes("20261007r117")&&!page.includes("20261008r119"),name+" must not ship stale pre-R134 CSS/JS cache tokens");
  for(const script of ["js/v10-41-cache-guard.js","js/version-check.js","js/asset-overrides.js","js/game-render.js"]){
    assert.ok(page.includes(script+"?v="+releaseCache),name+" must load current "+script+" code");
  }
}


const canonical="/arcade/c64-dungeon-carnage/";
const legacy="/arcade/lost-sizzler/";

assert.match(index,/https:\/\/www\.cheekycommodoregamer\.co\.uk\/arcade\/c64-dungeon-carnage\//,"canonical source page must publish the Dungeon Carnage public URL");
assert.match(home,/href="\/arcade\/c64-dungeon-carnage\/"/,"home HTML CTA must use the Dungeon Carnage public URL");
assert.match(homeRuntime,/const lostSizzlerUrl = "\/arcade\/c64-dungeon-carnage\/";/,"home runtime must not overwrite the CTA with the legacy route");
assert.match(homeRuntime,/image\.src = "\/arcade\/c64-dungeon-carnage\/assets\/lost-sizzler\.webp";/,"home recognition art must load from the canonical public route");
assert.ok(sw.includes(canonical)&&sw.includes(legacy),"service worker must treat canonical and legacy arcade paths as Dungeon Carnage");
assert.ok(cacheGuard.includes(canonical)&&cacheGuard.includes(legacy),"game cache sanitation must cover canonical and legacy arcade paths");
assert.match(canonicalOwner,/const CANONICAL_PATH="\/arcade\/c64-dungeon-carnage\/";/,"late canonical owner must agree with the deployed public route");
assert.match(packageBuilder,/const SOURCE_ROOT=path\.join\(REPO_ROOT,"arcade","lost-sizzler"\);/,"repository source path must remain arcade/lost-sizzler");
assert.match(packageBuilder,/CANONICAL_GAME_URL="https:\/\/www\.cheekycommodoregamer\.co\.uk\/arcade\/c64-dungeon-carnage\/"/,"itch handoff must advertise the canonical website route");
for(const page of [oldGameEntry,oldQuestEntry]){
  assert.ok(page.includes(canonical),"legacy entry page must redirect directly to the canonical route");
  assert.equal(page.includes('href="'+legacy+'"'),false,"legacy entry page must not send users through a second redirect");
}
assert.match(deploy,/test -d _site\/arcade\/lost-sizzler/,"deployment must retain the historical repository/source staging path");
assert.match(deploy,/cp -a _site\/arcade\/lost-sizzler _site\/arcade\/c64-dungeon-carnage/,"deployment must copy the source tree to the renamed public route");
assert.match(deploy,/mkdir -p _site\/arcade\/lost-sizzler/,"deployment must retain the compatibility route");
assert.ok(loadSafety.includes("tests/dungeon-carnage-public-route.test.mjs"),"load safety must execute the public-route ownership contract");

console.log("Dungeon Carnage public-route ownership contract passed.");
