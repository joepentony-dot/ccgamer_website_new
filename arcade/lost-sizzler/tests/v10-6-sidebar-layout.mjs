import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';

const read=relative=>fs.readFileSync(fileURLToPath(new URL(relative,import.meta.url)),'utf8');
const css=read('../css/v10-6-sidebar-layout-fix.css');
const loader=read('../js/asset-overrides.js');

assert.match(loader,/v10-6-inventory-hud-fix\.css/,'persistent inventory HUD remains loaded');
assert.match(loader,/v10-6-sidebar-layout-fix\.css/,'final sidebar geometry correction is loaded');
assert.ok(
  loader.indexOf('v10-6-sidebar-layout-fix.css')>loader.indexOf('v10-6-inventory-hud-fix.css'),
  'sidebar geometry correction loads after the inventory HUD so it wins the cascade'
);

assert.match(css,/\.ccg-game>\.tactical-zone\s*\{[\s\S]*?display:grid!important/,'sidebar uses grid layout');
assert.match(css,/grid-template-rows:minmax\(180px,1fr\) auto!important/,'desktop sidebar gives the map flexible space and the concise keys/items summary only the height it needs');
assert.match(css,/max-height:none!important/,'old tactical sidebar height cap is removed');

const radarRule=css.match(/\.ccg-game>\.tactical-zone>\.radar-card\s*\{([\s\S]*?)\}/)?.[1]||'';
assert.match(radarRule,/position:relative!important/,'radar is no longer absolutely pinned over the inventory');
assert.match(radarRule,/inset:auto!important/,'legacy top/right/bottom/left offsets are neutralised');
assert.match(radarRule,/grid-row:1!important/,'radar owns the first sidebar row');
assert.match(radarRule,/min-height:0!important/,'radar can size to the available sidebar row without forcing overlap');

const inventoryRule=css.match(/\.ccg-game>\.tactical-zone>\.shortcut-dock\.inventory-live-dock\s*\{([\s\S]*?)\}/)?.[1]||'';
assert.match(inventoryRule,/position:relative!important/,'inventory is no longer absolutely positioned over the radar');
assert.match(inventoryRule,/inset:auto!important/,'legacy inventory offsets are neutralised');
assert.match(inventoryRule,/grid-row:2!important/,'inventory owns the second sidebar row');
assert.match(inventoryRule,/min-height:0!important/,'keys/items summary can shrink without overlapping the map');
assert.match(css,/\.shortcut-dock\.inventory-live-dock \.item-shortcuts\{[\s\S]*?overflow:hidden!important/,'live keys/items summary must not expose an inner scrollbar');
assert.match(css,/\.carried-copy span\{display:none!important/,'live summary hides explanatory copy that belongs in the TAB inventory');

assert.match(css,/@media\(max-height:720px\)[\s\S]*grid-template-rows:minmax\(130px,1fr\) auto!important/,'short desktop viewports keep the map and concise summary separated without scrolling');

console.log('Lost Sizzler tactical radar/sidebar geometry regression checks passed.');
