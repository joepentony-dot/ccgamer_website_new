import assert from 'node:assert/strict';
import fs from 'node:fs';

const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const startupCss=fs.readFileSync(new URL('../css/v10-42-startup-first-visual.css',import.meta.url),'utf8');
const loaderCss=fs.readFileSync(new URL('../css/v10-36-special-ui.css',import.meta.url),'utf8');
const loaderBootstrap=fs.readFileSync(new URL('../js/v10-36-bootstrap.js',import.meta.url),'utf8');
const r55=fs.readFileSync(new URL('../js/v10-41-r55-final-playtest-cleanup.js',import.meta.url),'utf8');
const r51Css=fs.readFileSync(new URL('../css/v10-41-r51-visual-ui-overhaul.css',import.meta.url),'utf8');
const r51Runtime=fs.readFileSync(new URL('../js/v10-41-r51-visual-ui-overhaul.js',import.meta.url),'utf8');

const headEnd=index.indexOf('</head>');
const bodyStart=index.indexOf('<body ');
const loader=index.indexOf('id="ccg-release-loading"');
const main=index.indexOf('<main class="ccg-game">');
const firstScript=index.indexOf('<script ');

assert.ok(headEnd>0&&bodyStart>headEnd,'canonical document head/body boundary must remain intact');
assert.ok(index.indexOf('css/v10-36-special-ui.css')>0&&index.indexOf('css/v10-36-special-ui.css')<headEnd,'release-loader CSS must block first paint in the document head');
assert.match(index,/<link rel="stylesheet" data-ccg-v136-special-ui="true" href="css\/v10-36-special-ui\.css\?v=20260918r34">/,'blocking loader stylesheet must retain the marker used by the V10.36 compatibility bootstrap');
assert.ok(index.indexOf('css/v10-42-startup-first-visual.css')>0&&index.indexOf('css/v10-42-startup-first-visual.css')<headEnd,'settled menu presentation must exist before body paint');
assert.ok(index.indexOf('css/v10-41-r51-visual-ui-overhaul.css')>0&&index.indexOf('css/v10-41-r51-visual-ui-overhaul.css')<headEnd,'R51 settled menu visuals must block first paint instead of arriving after its historical startup delay');
assert.match(index,/<link rel="stylesheet" data-ccg-v141-r51-style="true" href="css\/v10-41-r51-visual-ui-overhaul\.css\?v=20260918r34">/,'blocking R51 stylesheet must retain the marker used by the delayed compatibility owner');
assert.ok(loader>bodyStart&&loader<main,'release loader must be static markup before the game shell');
assert.ok(loader<firstScript,'release loader must exist before any runtime script executes');
assert.match(index,/id="ccg-release-loading-status"/,'static loader must expose the existing runtime status target');
assert.match(index,/id="ccg-release-loading-progress"/,'static loader must expose the existing runtime progress target');
assert.match(index,/C64 DUNGEON CARNAGE · PREPARING RUNTIME/,'static loader must use current Dungeon Carnage identity');
assert.match(loaderCss,/\.ccg-release-loading\{[\s\S]*?position:fixed;[\s\S]*?inset:0;[\s\S]*?z-index:2147483000/,'blocking loader CSS must cover the viewport above the game shell');
assert.match(loaderBootstrap,/document\.getElementById\("ccg-release-loading"\)/,'V10.36 must continue adopting an existing canonical loader instead of requiring dynamic creation');
assert.match(loaderBootstrap,/link\[data-ccg-v136-special-ui="true"\]/,'V10.36 must continue respecting the static blocking loader stylesheet');

for(const contract of [
  'color:#f5eefb!important',
  'button.primary{\n  color:#160b1e!important',
  'top:9px!important',
  'bottom:8px!important',
  'text-shadow:none!important',
  'filter:none!important'
])assert.ok(startupCss.includes(contract),`blocking startup presentation is missing R55 agreement: ${contract}`);

for(const contract of [
  'color:#f5eefb!important',
  'button.primary{color:#160b1e!important',
  'top:9px!important',
  'bottom:8px!important',
  'text-shadow:none!important',
  'filter:none!important'
])assert.ok(r55.includes(contract),`retained R55 presentation changed without updating first-paint ownership: ${contract}`);

const r51MenuContracts=[
  ['solo-btn','SOLO DUNGEON','Five floors · full progression · local save'],
  ['tutorial-zone-btn','LEARN THE DUNGEON','Controls, combat, items and objectives'],
  ['continue-save-btn','CONTINUE','Resume your saved Solo floor checkpoint'],
  ['daily-btn','WEEKLY CHALLENGE','Shared seed · one ranked attempt per account'],
  ['split-btn','LOCAL TWO PLAYER','Two controllers or shared keyboard']
];

assert.match(index,/<div class="panel r51-menu-panel">/,'canonical menu panel must already carry its settled R51 class before JavaScript');
assert.match(index,/id="ccg-r51-menu-guide"/,'R51 quick guide must exist in canonical markup before the delayed visual owner runs');
for(const [id,kicker,desc] of r51MenuContracts){
  assert.ok(index.includes('id="'+id+'"')&&index.includes('data-r51-kicker="'+kicker+'"')&&index.includes('data-r51-desc="'+desc+'"'),id+' must expose its settled R51 kicker/description before first paint');
  assert.ok(r51Runtime.includes('buttonMeta("'+id+'","'+kicker+'","'+desc+'")'),'R51 compatibility owner no longer agrees with canonical '+id+' metadata');
}
assert.match(r51Css,/content:attr\(data-r51-desc\)/,'blocking R51 CSS must render the canonical card descriptions');
assert.match(r51Css,/content:attr\(data-r51-kicker\)/,'blocking R51 CSS must render the canonical card kickers');
assert.match(r51Runtime,/document\.querySelector\('link\[data-ccg-v141-r51-style="true"\]'\)/,'delayed R51 runtime must adopt the blocking stylesheet instead of inserting another visual state');
assert.match(r51Runtime,/if\(!document\.getElementById\("ccg-r51-menu-guide"\)\)/,'delayed R51 runtime must adopt the canonical quick guide');
assert.match(r51Runtime,/const STARTUP_DELAY_MS=2200/,'R51 gameplay/cosmetic startup delay remains intact; only menu first-paint ownership moves earlier');
assert.match(startupCss,/#menu>\.panel\.r51-menu-panel\{[\s\S]*?padding:20px 16px 22px!important;[\s\S]*?text-align:center!important/,'blocking first-visual CSS must own the same settled R51 panel geometry and alignment observed after the late compatibility stack');
console.log('Dungeon Carnage startup first-visual static contract passed');
