import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(new URL("../" + path, import.meta.url), "utf8");

for (const path of [
  "games/commodore-quest/index.html",
  "arcade/quest/index.html"
]) {
  const html = read(path);
  assert.match(html, /data-ccg-play-maintenance-gate="true"/, path + " must contain the maintenance gate");
  assert.match(html, /www\.cheekycommodoregamer\.co\.uk/);
  assert.match(html, /cheekycommodoregamer\.co\.uk/);
  assert.match(html, /window\.location\.replace\("\/games\/ccg-games\/"\)/);
}

const ownerGate = read("js/ccg-play-maintenance-owner-gate.js");
const dungeonVersion = JSON.parse(read("arcade/lost-sizzler/version.json"));
const dungeonCache = String(dungeonVersion.cacheToken || "").trim();
assert.ok(/^20261005r107$/.test(dungeonCache), "Dungeon maintenance boundary must follow the active R107 cache identity");
for (const path of [
  "arcade/c64-dungeon-carnage/index.html",
  "arcade/lost-sizzler/index.html"
]) {
  const dungeon = read(path);
  assert.match(dungeon, /data-ccg-play-maintenance-gate="owner-preview"/, path + " must load the protected Dungeon access gate");
  assert.ok(dungeon.includes(`src="/js/ccg-supabase-config.js?v=${dungeonCache}"`), path + " must load the current Supabase config cache identity");
  assert.ok(dungeon.includes(`src="/js/ccg-supabase-client.js?v=${dungeonCache}"`), path + " must load the current Supabase client cache identity");
  assert.match(dungeon, /src="\/js\/ccg-play-maintenance-owner-gate\.js\?v=20261002-round2-v1"/);
  assert.match(dungeon, /c64-dungeon-carnage-home-v2\.webp\?v=20260922-r51-owner-preview/, "Dungeon loader must retain supplied WebP");
  assert.match(dungeon, /type="application\/ccg-protected-runtime" data-ccg-protected-runtime src="js\/game-main\.js/, path + " must keep game-main inert until access is validated");
  assert.match(dungeon, /type="application\/ccg-protected-runtime" data-ccg-protected-runtime src="js\/game-core\.js/, path + " must protect the core runtime");
  assert.doesNotMatch(dungeon, /<script src="js\/game-main\.js/, path + " must not boot game-main unconditionally");
}

const home = read("home.html");
const homeCtaCss = read("resources/css/home-lost-sizzler-cta.css");
const homeArtwork = new URL("../resources/images/hero/c64-dungeon-carnage-home-feature.webp", import.meta.url);

assert.match(home, /href="\/arcade\/c64-dungeon-carnage\/"[\s\S]*class="ccg-btn home-hero__beta-cta"/, "Home must keep the canonical direct Dungeon Carnage link");
assert.match(home, /c64-dungeon-carnage-home-feature\.webp/, "Home must use the dedicated compact Dungeon Carnage artwork");
assert.match(home, /home-lost-sizzler-cta\.css\?v=20260922-carnage-feature/, "Home must cache-bust the compact CTA CSS");
assert.doesNotMatch(home, /<span>C64 DUNGEON CARNAGE<\/span>/, "Home CTA must not repeat the game title as a yellow text banner");
assert.doesNotMatch(home, /<strong>PLAY MY NEW GAME<\/strong>/, "Home CTA must not retain the redundant text prompt");
assert.ok(fs.existsSync(homeArtwork), "Dedicated Dungeon Carnage home artwork must exist");
assert.ok(fs.statSync(homeArtwork).size > 0, "Dedicated Dungeon Carnage home artwork must not be empty");
assert.match(homeCtaCss, /width: min\(440px, 100%\) !important;/, "Home Dungeon link must remain compact");
assert.match(homeCtaCss, /background: rgba\(3, 7, 15, 0\.86\) !important;/, "Home Dungeon link must override the old yellow treatment");

assert.match(ownerGate, /OWNER_USERNAME = "cheekycommodoregamer"/);
assert.match(ownerGate, /OWNER_DISPLAY_NAME = "cheeky commodore gamer"/);
assert.match(ownerGate, /OWNER_ROLE = "admin"/);
assert.match(ownerGate, /sessionStorage\.getItem\("ccg_header_auth_snapshot"\)/);
assert.match(ownerGate, /client\.auth\.getSession\(\)/);
assert.match(ownerGate, /client\.auth\.getUser\(\)/);
assert.match(ownerGate, /ccg_has_dungeon_carnage_playtest_access/);
assert.match(ownerGate, /bootstrapProtectedRuntime/);
assert.match(ownerGate, /data-ccg-protected-runtime/);
assert.match(ownerGate, /runtimeAccessGranted = true/);
assert.match(ownerGate, /showMemberGate\(\)/);
assert.match(ownerGate, /mark\("member-playtester"\)/);
assert.match(ownerGate, /mark\("round2-member-required"\)/);
assert.match(ownerGate, /mark\("owner-preview"\)/);
assert.doesNotMatch(ownerGate, /ccg_validate_dungeon_carnage_tester_code/, "Round 2 must not use the retired tester-code path");
assert.match(ownerGate, /Current Members Only/, "Round 2 denial must explain the closed current-member cohort");
assert.doesNotMatch(ownerGate, /window\.location\.replace\(MAINTENANCE_DESTINATION\)/, "Dungeon access denial must use the member gate rather than the retired redirect");

const hub = read("games/ccg-games/index.html");
assert.match(hub, /CCG originals — maintenance/);
assert.match(hub, /href="\/quiz\/quiz\.html"/);
assert.match(hub, /href="\/quiz\/pack-6\.html"/);
assert.doesNotMatch(hub, /href="\/games\/commodore-quest\/"/);
assert.doesNotMatch(hub, /href="\/games\/ccg-games\/cheeky-commodore-quest\/"/);

console.log("Temporary play-games maintenance contract passed with closed Round 2 member runtime access.");
