import assert from "node:assert/strict";
import fs from "node:fs";

const read=path=>fs.readFileSync(path,"utf8");
const deploy=read(".github/workflows/deploy-github-pages-omega-stable.yml");
const smoke=read("arcade/lost-sizzler/tests/production/v10-41-r47-production-smoke.mjs");
const version=JSON.parse(read("arcade/lost-sizzler/version.json"));
const game=read("arcade/lost-sizzler/index.html");

assert.match(
  deploy,
  /cp -a scripts _site\/scripts[\s\S]*\(cd _site && node scripts\/generate-sitemaps\.js\)[\s\S]*rm -rf _site\/scripts/,
  "Omega Pages must stage the complete sitemap tool directory temporarily and remove it before upload"
);
assert.match(
  smoke,
  /checkedOutVersion=JSON\.parse\(fs\.readFileSync\(new URL\("\.\.\/\.\.\/version\.json",import\.meta\.url\),"utf8"\)\)/,
  "production smoke must derive its expected release identity from checked-out version.json"
);
assert.doesNotMatch(smoke,/const expectedBuild="V10\.42 r\d+"/,"production smoke must not hardcode a release build");
assert.doesNotMatch(smoke,/const expectedCacheToken="\d{8}r\d+"/,"production smoke must not hardcode a cache token");
assert.ok(String(version.releaseVersion||""),"version.json must publish a releaseVersion");
assert.ok(String(version.build||""),"version.json must publish a build");
assert.ok(String(version.cacheToken||""),"version.json must publish a cacheToken");
assert.ok(game.includes(`ccg-lost-sizzler-build" content="${version.build}`),"canonical game source must match version.json build");
assert.ok(game.includes(`ccg-lost-sizzler-cache" content="${version.cacheToken}`),"canonical game source must match version.json cache token");

console.log("Deployment and current-main production identity contract passed.");
