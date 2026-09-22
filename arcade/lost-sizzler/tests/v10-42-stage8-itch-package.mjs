import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {spawnSync} from "node:child_process";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const repo=path.resolve(here,"../../..");
const builder=path.join(repo,"scripts","build-c64-dungeon-carnage-itch-package.mjs");
const version=JSON.parse(fs.readFileSync(path.join(repo,"arcade/lost-sizzler/version.json"),"utf8"));
const sourceIndex=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/index.html"),"utf8");
const sourceBuilder=fs.readFileSync(builder,"utf8");
const temp=fs.mkdtempSync(path.join(os.tmpdir(),"ccg-stage8-itch-"));
const output=path.join(temp,"package");

function run(args){
  const result=spawnSync(process.execPath,[builder,...args],{cwd:repo,encoding:"utf8"});
  assert.equal(result.status,0,(result.stderr||result.stdout||"").trim());
  return result;
}

try{
  run(["--output",output,"--source-sha","stage8-contract"]);
  run(["--verify",output]);

  const manifest=JSON.parse(fs.readFileSync(path.join(output,"release-manifest.json"),"utf8"));
  const stagedIndex=fs.readFileSync(path.join(output,"index.html"),"utf8");
  const releaseGate=fs.readFileSync(path.join(output,"js","itch-release-runtime.js"),"utf8");
  const stagedPaywall=fs.readFileSync(path.join(output,"js","v10-42-demo-paywall.js"),"utf8");
  const canonicalPaywall=fs.readFileSync(path.join(repo,"arcade/lost-sizzler/js/v10-42-demo-paywall.js"),"utf8");

  assert.equal(manifest.schema,"ccg-c64-dungeon-carnage-itch-package-v1");
  assert.equal(manifest.product,"C64 Dungeon Carnage");
  assert.equal(manifest.delivery,"itch-html5");
  assert.equal(manifest.sourceRevision,"stage8-contract");
  assert.equal(manifest.releaseVersion,version.releaseVersion);
  assert.equal(manifest.build,version.build);
  assert.equal(manifest.cacheToken,version.cacheToken);
  assert.deepEqual(manifest.localModes,["Solo","Tutorial"]);
  assert.deepEqual(manifest.websiteAccountFeatures,[]);
  assert.ok(manifest.fileCount>100,"itch package should contain the complete current runtime, not a miniature shell");
  assert.ok(manifest.totalBytes>100000,"itch package should include real game assets");

  const listed=new Set(manifest.files.map(file=>file.path));
  for(const required of [
    "index.html","version.json","js/game-core.js","js/game-main.js","js/world.js",
    "js/v10-42-bootstrap.js","js/v10-42-stage7-npc-merchant.js","js/itch-release-runtime.js",
    "css/game.css","games/games.json","assets/c64-dungeon-carnage-loader.webp"
  ])assert.ok(listed.has(required),"missing staged runtime file: "+required);

  assert.match(sourceIndex,/src="\/js\/ccg-supabase-config\.js/,"canonical website build must retain its website account bootstrap");
  assert.doesNotMatch(sourceIndex,/src="js\/weekly-challenge\.js|Weekly High-Score Vault|2P Split Screen|P2:/i,"canonical public build must keep retired Weekly/Split surfaces absent");
  assert.doesNotMatch(stagedIndex,/ccg-supabase-config|ccg-supabase-client|js\/weekly-challenge\.js/,"staged itch build must not carry website account bootstraps");
  assert.match(stagedIndex,/js\/itch-release-runtime\.js\?v=/,"staged itch build must load its package-only gate");
  assert.match(stagedIndex,/https:\/\/www\.cheekycommodoregamer\.co\.uk\/games\/ccg-games\//,"exit links must leave itch safely for the CCG website");
  assert.doesNotMatch(stagedIndex,/weekly-vault|Weekly High-Score Vault|Weekly Dungeon|2P Split Screen|P2:/i,"standalone itch index must keep retired Weekly/Split surfaces absent");
  assert.match(sourceIndex,/src="\/resources\/images\/hero\/c64-dungeon-carnage-home-v2\.webp(?:\?[^"]*)?"/,"canonical website loader must use the current Dungeon Carnage artwork");
  assert.match(stagedIndex,/src="assets\/c64-dungeon-carnage-loader\.webp"/,"standalone itch loader must use the packaged current Dungeon Carnage artwork");
  assert.doesNotMatch(stagedIndex,/(?:href|src)="\/(?!\/)/,"standalone itch index must not depend on root-relative website paths");

  assert.match(releaseGate,/mode:"itch-html5"/);
  assert.match(releaseGate,/supportedModes:Object\.freeze\(\["Solo","Tutorial"\]\)/,"itch gate must advertise only supported public modes");
  assert.match(releaseGate,/retired:true/,"retained Weekly compatibility stub must be explicitly inert");
  assert.match(releaseGate,/CCGWeeklyChallenge=\{/,"package may retain the inert compatibility owner required by historical runtime references");
  assert.match(releaseGate,/finish:async\(\)=>null/,"retired compatibility owner must preserve the no-op finish hook");
  assert.doesNotMatch(releaseGate,/Weekly Vault — CCG Website|weeklyUrl|openWeekly|#weekly-vault|2P Split Screen/i,"itch gate must not advertise or route to retired modes");
  assert.doesNotMatch(releaseGate,/CCG_SUPABASE|supabase\.co|paypal|checkout|entitlement/i,"itch package gate must not recreate custom commerce or account bootstrap");
  assert.match(canonicalPaywall,/PAYPAL CHECKOUT|BUY WITH PAYPAL/,"canonical website source should remain unchanged by package staging");
  assert.match(stagedPaywall,/demoMode:false/,"staged paywall compatibility owner must disable demo/paywall mode");
  assert.match(stagedPaywall,/commerce:false/,"staged paywall compatibility owner must explicitly disable commerce");
  assert.doesNotMatch(stagedPaywall,/paypal|buy with paypal|checkout|\/auth\/|ccg-backend|signed-download|private-download/i,"retired commerce/auth implementation must not ship in the active staged paywall module");

  const forbidden=manifest.files.filter(file=>/(?:^|\/)(?:ccg-supabase-config\.js|ccg-supabase-client\.js|service-account\.json|service_account\.json|\.env(?:\.|$))|(?:\.pem|\.key|\.p12|\.pfx)$/i.test(file.path));
  assert.deepEqual(forbidden,[],"credential/account bootstrap material must not enter the package manifest");

  assert.match(sourceBuilder,/INCLUDE_DIRS=\["css","js","assets"\]/,"builder must use an explicit runtime tree");
  assert.match(sourceBuilder,/EXTERNAL_FILES=\[\["games\/games\.json","games\/games\.json"\],\["resources\/images\/hero\/c64-dungeon-carnage-home-v2\.webp","assets\/c64-dungeon-carnage-loader\.webp"\]\]/,"builder must explicitly carry the runtime game catalogue and current loader artwork dependencies");
  assert.match(sourceBuilder,/sameOrWithin\(REPO_ROOT,outputRoot\).*sameOrWithin\(outputRoot,REPO_ROOT\)/s,"builder must reject both descendants and ancestors of the repository before recursive deletion");
  assert.match(sourceBuilder,/packageDemoPaywallRuntime\(\)/,"builder must replace the retired website commerce module only inside the staged artifact");
  assert.doesNotMatch(sourceBuilder,/path\.join\(REPO_ROOT[^\n]*(?:desktop|services\/ccg-backend|private-download|signed-download)/i,"fresh itch builder must not source files from retired desktop/private-delivery integration");

  console.log("PASS V10.42 R51 Solo/Tutorial itch.io package contract");
}finally{
  fs.rmSync(temp,{recursive:true,force:true});
}
