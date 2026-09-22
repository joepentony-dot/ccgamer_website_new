import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const src=fs.readFileSync(new URL("js/v10-42-r48-shop-firearm-upgrade.js",root),"utf8");
const bootstrap=fs.readFileSync(new URL("js/v10-42-bootstrap.js",root),"utf8");
const html=fs.readFileSync(new URL("index.html",root),"utf8");

assert.match(src,/BASE_UPGRADE_PRICE=2500/,"firearm shop must start at the agreed 2,500-score / 20-coin equivalent");
assert.match(src,/UPGRADE_PRICE_STEP=1250/,"firearm shop price must rise by 1,250 score per firearm tier");
assert.match(src,/GOLD_SCORE_COIN_VALUE=125/,"Gold Score Coin conversion must remain aligned with the live pickup value");
assert.match(src,/tier>=cap/,"shop upgrade must respect the existing floor firearm cap");
assert.match(src,/String\(id\)==="weapon"/,"legacy weapon shop action must be intercepted rather than deleted");
assert.match(src,/evolution\.stageWeapon\(offer\.nextTier\)/,"shop purchase must advance the deterministic evolving firearm");
assert.match(src,/shop\.weaponUpgradePurchases/,"shop upgrade purchases must be tracked separately");
assert.doesNotMatch(src,/generateWeapon\(/,"shop firearm upgrade must not roll a random legacy weapon");
assert.doesNotMatch(src,/S\.sfx\(["']pickup["']\)/,"shop firearm upgrade must not layer the generic pickup sound over the weapon upgrade SFX");
assert.match(src,/score=beforeScore-offer\.price/,"weapon upgrade must charge its dedicated price");
assert.doesNotMatch(src,/scorePurchases\s*=/,"weapon upgrade must not mutate the ordinary shop price ladder");
assert.match(src,/DESCEND TO UPGRADE/,"floor-capped shop UI must explain why another upgrade is unavailable");
assert.match(html,/Firearm Upgrade/,"shop help copy must no longer advertise Weapon Cache");
assert.doesNotMatch(html,/Weapon Cache/,"player-facing shop copy must not retain the obsolete random Weapon Cache");

const evolution=bootstrap.indexOf('v10-42-r47-firearm-evolution.js');
const shop=bootstrap.indexOf('v10-42-r48-shop-firearm-upgrade.js');
assert.ok(evolution>=0&&shop>evolution,"shop firearm bridge must load after the r47 evolution owner");
console.log("Dungeon Carnage r48 shop firearm upgrade contract passed.");