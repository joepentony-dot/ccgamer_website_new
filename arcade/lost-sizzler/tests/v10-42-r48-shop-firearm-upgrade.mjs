import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const src=fs.readFileSync(new URL("js/v10-42-r48-shop-firearm-upgrade.js",root),"utf8");
const bootstrap=fs.readFileSync(new URL("js/v10-42-bootstrap.js",root),"utf8");
const html=fs.readFileSync(new URL("index.html",root),"utf8");
const version=JSON.parse(fs.readFileSync(new URL("version.json",root),"utf8"));

assert.equal(version.build,"V10.42 r56");
assert.equal(version.cacheToken,"20260924r56");
assert.match(src,/BASE_UPGRADE_PRICE=2500/);
assert.match(src,/UPGRADE_PRICE_STEP=1250/);
assert.match(src,/GOLD_SCORE_COIN_VALUE=125/);
assert.match(src,/tier>=cap/);
assert.match(src,/String\(id\)==="weapon"/);
assert.match(src,/evolution\.stageWeapon\(offer\.nextTier\)/);
assert.match(src,/shop\.weaponUpgradePurchases/);
assert.doesNotMatch(src,/generateWeapon\(/);
assert.doesNotMatch(src,/S\.sfx\(["']pickup["']\)/);
assert.match(src,/score=beforeScore-offer\.price/);
assert.doesNotMatch(src,/scorePurchases\s*=/);
assert.match(src,/DESCEND TO UPGRADE/);
assert.match(html,/Firearm Upgrade/);
assert.doesNotMatch(html,/Weapon Cache/);
const evolution=bootstrap.indexOf('v10-42-r47-firearm-evolution.js');
const shop=bootstrap.indexOf('v10-42-r48-shop-firearm-upgrade.js');
assert.ok(evolution>=0&&shop>evolution);
console.log("Dungeon Carnage R54 retained shop firearm upgrade contract passed.");
