import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const repo=path.resolve(root,"../..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const hub=fs.readFileSync(path.join(repo,"games/ccg-games/index.html"),"utf8");
const release=fs.readFileSync(path.join(root,"js/v10-42-zero-server-release.js"),"utf8");
const version=JSON.parse(fs.readFileSync(path.join(root,"version.json"),"utf8"));

assert.match(version.build,/^V10\.42 r\d+$/,"retired public-UI contract requires the current V10.42 release family");
assert.match(version.cacheToken,/^\d{8}r\d+$/,"retired public-UI contract requires a valid current cache token");
const buildUpper=String(version.build).toUpperCase();

for(const retiredCopy of [
  "Weekly High-Score Vault",
  "Weekly Dungeon",
  "2P Split Screen",
  "WEEKLY HIGH-SCORE VAULT LEADERBOARD",
  "P2:",
  "Supabase remains available"
]){
  assert.equal(html.toLowerCase().includes(retiredCopy.toLowerCase()),false,"public Dungeon page still exposes retired copy: "+retiredCopy);
}

assert.doesNotMatch(html,/id="weekly-vault"/i,"retired Weekly leaderboard section must not remain in public DOM");
assert.doesNotMatch(html,/weekly-challenge\.js/i,"retired Weekly browser client must not load");
assert.doesNotMatch(html,/split-player-hud\.js/i,"retired split-screen HUD must not load");
assert.doesNotMatch(html,/v10-41-r29-buglog\.js|v10-41-r30-buglog\.js/i,"historical developer buglogs must not load publicly");
assert.doesNotMatch(html,/id="daily-btn"/i,"retired daily compatibility control must be absent from the public DOM");
assert.doesNotMatch(html,/id="split-btn"/i,"retired split compatibility control must be absent from the public DOM");
assert.match(html,/id="release-note"[^>]*>C64 Dungeon Carnage runs directly in your browser\. Start the main game or use the Tutorial to learn the controls\./i);
assert.match(html,/id="menu-note"[^>]*hidden[^>]*aria-hidden="true"[^>]*display:none!important/i,"legacy release-note sink must stay hidden");
assert.match(html,/M MAP/,"map shortcut must remain documented after retired secondary-player help removal");

assert.doesNotMatch(hub,/split-screen|co-op|Weekly High-Score Vault/i,"maintenance hub must not advertise retired Dungeon modes");
assert.match(hub,/Browser play/);
assert.match(hub,/>Tutorial</);

assert.match(release,/const LOCAL_BUTTON_IDS=\["solo-btn","tutorial-zone-btn"\];/);
assert.doesNotMatch(release,/ONLINE_BUTTON_IDS|daily-btn|split-btn|weekly-vault|online-howto/,"local release policy must not retain retired alternate-mode controls");
assert.doesNotMatch(release,/#developer-changelog|\.developer-changelog/,"current-build changelog must remain visible");
assert.match(html,/id="developer-changelog"[^>]*data-latest-build-only="true"/,"one canonical latest-build changelog must remain");
assert.ok(html.includes(`Latest Build Changes · ${buildUpper}`));
assert.ok(html.includes(`ACTIVE BUILD: ${buildUpper}`));
assert.doesNotMatch(html,/AUGUST|JULY|JUNE|MAY|APRIL|MARCH|FEBRUARY|JANUARY/i,"public changelog must not retain pre-September periodic history");
assert.match(release,/getElementById\("release-note"\)/);
assert.doesNotMatch(release,/Weekly High-Score Vault|2P Split Screen|Supabase remains available/i);

console.log("PASS V10.42 R51 retired public-mode boundary under current build");

assert.match(html,/src="\/resources\/images\/hero\/c64-dungeon-carnage-home-v2\.webp(?:\?[^"]*)?"/,"canonical website loader must use the current Dungeon Carnage artwork");
