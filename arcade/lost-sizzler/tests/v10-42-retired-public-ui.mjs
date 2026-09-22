import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const release=fs.readFileSync(path.join(root,"js/v10-42-zero-server-release.js"),"utf8");

for(const retiredCopy of [
  "Weekly High-Score Vault",
  "Weekly Dungeon",
  "2P Split Screen",
  "co-op expeditions",
  "Supabase remains available",
  "ACTIVE DEVELOPMENT LOG",
  "P2:"
]){
  assert.equal(html.toLowerCase().includes(retiredCopy.toLowerCase()),false,"public page still exposes retired copy: "+retiredCopy);
}

assert.doesNotMatch(html,/id="weekly-vault"/i,"retired Weekly Vault leaderboard surface must not remain in the public DOM");
assert.doesNotMatch(html,/weekly-challenge\.js/i,"retired Weekly Vault browser client must not load");
assert.doesNotMatch(html,/split-player-hud\.js/i,"retired split-screen HUD must not load");
assert.doesNotMatch(html,/v10-41-r29-buglog\.js|v10-41-r30-buglog\.js/i,"public developer changelog scripts must not load");
assert.match(html,/id="daily-btn"[^>]*hidden[^>]*aria-hidden="true"[^>]*display:none!important/i,"legacy daily button compatibility anchor must remain inert during r49 startup");
assert.match(html,/id="split-btn"[^>]*hidden[^>]*aria-hidden="true"[^>]*display:none!important/i,"legacy split button compatibility anchor must remain inert during r49 startup");
assert.match(html,/id="release-note"[^>]*>C64 Dungeon Carnage runs directly in your browser\. Solo play and the Tutorial do not require a multiplayer server\./i,"public release copy must describe the supported Solo/Tutorial product");
assert.match(html,/id="menu-note"[^>]*hidden[^>]*aria-hidden="true"[^>]*display:none!important/i,"legacy menu-note target must remain hidden so cached retired policy cannot rewrite public copy");

assert.match(release,/const LOCAL_BUTTON_IDS=\["solo-btn","tutorial-zone-btn"\];/,"release policy must restore only Solo and Tutorial");
assert.match(release,/const ONLINE_BUTTON_IDS=\[[^\]]*"daily-btn"[^\]]*"split-btn"[^\]]*\];/,"release policy must remove retired Weekly and Split entry points after startup");
assert.match(release,/#daily-btn,#split-btn,#weekly-vault,#developer-changelog,\.developer-changelog/,"release style must fail closed for retired public surfaces");
assert.match(release,/getElementById\("release-note"\)/,"release policy must own the new public release-note target");
assert.doesNotMatch(release,/Weekly High-Score Vault|2P Split Screen|Supabase remains available/i,"release policy must not reintroduce retired product copy");

console.log("Dungeon Carnage retired public-mode contract passed.");
