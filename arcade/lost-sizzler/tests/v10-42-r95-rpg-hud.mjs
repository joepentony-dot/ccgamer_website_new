import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const html=fs.readFileSync(path.join(root,"index.html"),"utf8");
const version=JSON.parse(fs.readFileSync(path.join(root,"version.json"),"utf8"));
const cache=String(version.cacheToken||"").trim();
const css=fs.readFileSync(path.join(root,"css/v10-42-r95-rpg-hud.css"),"utf8");
const core=fs.readFileSync(path.join(root,"js/game-core.js"),"utf8");

const inventoryCss=`v10-42-r71-equipment-inventory.css?v=${cache}`,hudCss=`v10-42-r95-rpg-hud.css?v=${cache}`;
assert.ok(html.indexOf(inventoryCss)>=0&&html.indexOf(hudCss)>html.indexOf(inventoryCss),"R95 HUD CSS must load after the established R71 inventory presentation under the current release cache.");
assert.match(css,/--r95-rpg-font:"Palatino Linotype","Book Antiqua",Palatino,Georgia,serif/,"R95 must provide a self-contained RPG heading font stack.");
assert.match(css,/--r95-data-font:Consolas,"Lucida Console","Courier New",monospace/,"R95 must retain a compact data font for live numeric readouts.");
assert.match(css,/body\[data-run-active="true"\] \.ccg-game>\.player-hub\{/,"R95 must own the active gameplay HUD without changing the menu.");
assert.match(css,/\.health-stat::before\{width:var\(--health-pct,100%\)!important/,"health meter must consume the canonical live health percentage.");
assert.match(css,/\.armour-stat::before\{width:var\(--armour-pct,0%\)!important/,"armour meter must consume the canonical live armour percentage.");
assert.match(css,/\.ammo-stat::before\{width:var\(--ammo-pct,0%\)!important/,"ammo meter must consume the canonical live ammunition percentage.");
assert.match(core,/style\.setProperty\("--health-pct"/,"canonical sync must continue publishing health percentage without an R95 timer.");
assert.match(core,/style\.setProperty\("--armour-pct"/,"canonical sync must continue publishing armour percentage without an R95 timer.");
assert.match(core,/style\.setProperty\("--ammo-pct"/,"canonical sync must continue publishing ammo percentage without an R95 timer.");
assert.match(css,/\.hub-telemetry\{display:none!important\}/,"secondary telemetry must remain visually demoted.");
assert.match(css,/@media\(max-width:820px\)/,"R95 must retain a dedicated mobile gameplay layout.");
assert.match(html,/QUICK ITEM BELT/,"player inventory strip must use the new RPG-oriented label.");
assert.match(html,/<strong>QUEST<\/strong><span id="mission-text">/,"mission strip must read as the active quest banner.");
assert.doesNotMatch(css,/MutationObserver|setInterval|requestAnimationFrame|innerHTML/,"R95 presentation must not add a runtime repaint owner.");

for(const id of ["hud-health","hud-p2","hud-mana","hud-weapon","quick-slots","quick-level","quick-xp-fill","hud-keys","hud-score","hud-room","radar-canvas","item-shortcuts"]){
  assert.match(html,new RegExp(`id=["']${id}["']`),`R95 must preserve stable runtime id ${id}`);
}

console.log("Dungeon Carnage R95 RPG HUD presentation contract passed.");