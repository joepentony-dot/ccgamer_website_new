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
assert.match(css,/grid-template-rows:minmax\(190px,52%\) minmax\(0,1fr\)!important/,'desktop sidebar reserves separate radar and inventory rows');
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
assert.match(inventoryRule,/min-height:0!important/,'inventory can scroll inside its own row');

assert.match(css,/@media\(max-height:720px\)[\s\S]*grid-template-rows:minmax\(150px,44%\) minmax\(0,1fr\)!important/,'short desktop viewports keep radar and inventory separated');

console.log('Lost Sizzler tactical radar/sidebar geometry regression checks passed.');
