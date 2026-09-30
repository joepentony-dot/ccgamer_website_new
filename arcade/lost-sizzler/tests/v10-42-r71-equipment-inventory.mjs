import fs from "node:fs";
import assert from "node:assert/strict";

const root=new URL("../",import.meta.url);
const html=fs.readFileSync(new URL("index.html",root),"utf8");
const bootstrap=fs.readFileSync(new URL("js/v10-42-bootstrap.js",root),"utf8");
const moduleSource=fs.readFileSync(new URL("js/v10-42-r71-equipment-inventory.js",root),"utf8");
const css=fs.readFileSync(new URL("css/v10-42-r71-equipment-inventory.css",root),"utf8");
const render=fs.readFileSync(new URL("js/game-render.js",root),"utf8");

assert.ok(html.includes("v10-42-r71-equipment-inventory.css?v=20260930r70"));
assert.ok(bootstrap.includes('v10-42-r71-equipment-inventory.js'));
assert.ok(moduleSource.includes("Equipment & Inventory"));
assert.ok(moduleSource.includes("r71-equipment-board"));
assert.ok(moduleSource.includes("BODY ARMOUR"));
assert.ok(moduleSource.includes("EQUIPPED RELICS"));
assert.ok(moduleSource.includes("r71-stat-strip"));
assert.ok(moduleSource.includes("DOMAIN KEYS"));
assert.ok(moduleSource.includes("player.relics"));
assert.ok(moduleSource.includes("player?.rpgStats"));
assert.ok(moduleSource.includes('guide.setAttribute("aria-hidden","true")'));
assert.ok(css.includes("height:min(760px,93dvh)"));
assert.ok(css.includes("overflow:hidden!important"));
assert.ok(css.includes("font-family:Georgia"));
assert.ok(css.includes(".r71-long-copy{display:none!important}"));
assert.ok(render.includes("R71: armour is deliberately sprite-scale"));
assert.ok(!render.includes("fillRect(cx-6,cy-5,12,12)"));
assert.ok(!render.includes("strokeRect(cx-7,cy-17,14,27)"));
assert.ok(render.includes("fillRect(cx-5,cy-3,10,5)"));
assert.ok(render.includes("fillRect(cx-5,cy-12,10,2)"));

console.log("PASS V10.42 R71 equipment inventory contract");
