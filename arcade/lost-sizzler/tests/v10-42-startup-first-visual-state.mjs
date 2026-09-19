import assert from 'node:assert/strict';
import fs from 'node:fs';

const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const startupCss=fs.readFileSync(new URL('../css/v10-42-startup-first-visual.css',import.meta.url),'utf8');
const loaderCss=fs.readFileSync(new URL('../css/v10-36-special-ui.css',import.meta.url),'utf8');
const loaderBootstrap=fs.readFileSync(new URL('../js/v10-36-bootstrap.js',import.meta.url),'utf8');
const r55=fs.readFileSync(new URL('../js/v10-41-r55-final-playtest-cleanup.js',import.meta.url),'utf8');
const overlaySafety=fs.readFileSync(new URL('../js/v10-41-release-overlay-safety.js',import.meta.url),'utf8');

const headEnd=index.indexOf('</head>');
const bodyStart=index.indexOf('<body ');
const loader=index.indexOf('id="ccg-release-loading"');
const main=index.indexOf('<main class="ccg-game">');
const firstScript=index.indexOf('<script ');

assert.ok(headEnd>0&&bodyStart>headEnd,'canonical document head/body boundary must remain intact');
assert.ok(index.indexOf('css/v10-36-special-ui.css')>0&&index.indexOf('css/v10-36-special-ui.css')<headEnd,'release-loader CSS must block first paint in the document head');
assert.match(index,/<link rel="stylesheet" data-ccg-v136-special-ui="true" href="css\/v10-36-special-ui\.css\?v=20260919r35">/,'blocking loader stylesheet must retain the marker used by the V10.36 compatibility bootstrap');
assert.ok(index.indexOf('css/v10-42-startup-first-visual.css')>0&&index.indexOf('css/v10-42-startup-first-visual.css')<headEnd,'settled menu presentation must exist before body paint');
assert.ok(loader>bodyStart&&loader<main,'release loader must be static markup before the game shell');
assert.ok(loader<firstScript,'release loader must exist before any runtime script executes');
assert.match(index,/id="ccg-release-loading-status"/,'static loader must expose the existing runtime status target');
assert.match(index,/id="ccg-release-loading-progress"/,'static loader must expose the existing runtime progress target');
assert.match(index,/C64 DUNGEON CARNAGE · PREPARING RUNTIME/,'static loader must use current Dungeon Carnage identity');
assert.match(loaderCss,/\.ccg-release-loading\{[\s\S]*?position:fixed;[\s\S]*?inset:0;[\s\S]*?z-index:2147483000/,'blocking loader CSS must cover the viewport above the game shell');
assert.match(loaderBootstrap,/document\.getElementById\("ccg-release-loading"\)/,'V10.36 must continue adopting an existing canonical loader instead of requiring dynamic creation');
assert.match(loaderBootstrap,/link\[data-ccg-v136-special-ui="true"\]/,'V10.36 must continue respecting the static blocking loader stylesheet');
assert.match(loaderBootstrap,/function authoritativeReleaseReady\(\)/,'V10.36 must explicitly wait for the authoritative current release before revealing the menu');
assert.match(loaderBootstrap,/build\.startsWith\("V10\.42"\)/,'V10.42 builds must use the authoritative ordered-bootstrap reveal gate');
assert.match(loaderBootstrap,/v142\?\.ready===true[\s\S]*?dataset\?\.releaseReady==="true"[\s\S]*?dataset\?\.v142BootstrapReady==="true"/,'loader reveal must require V10.42 ordered readiness and matching body readiness markers');
assert.match(loaderBootstrap,/gate\?\.state\?\.ready&&authoritativeReleaseReady\(\)/,'legacy readiness alone must no longer hide the release loader');
assert.match(loaderBootstrap,/function finishLoading\(errors=\[\]\)\{[\s\S]*?if\(!authoritativeReleaseReady\(\)\)\{[\s\S]*?Finalising Dungeon Carnage menu and game systems…[\s\S]*?return;[\s\S]*?setTimeout\(\(\)=>\{[\s\S]*?if\(!authoritativeReleaseReady\(\)\)\{node\.hidden=false;return\}[\s\S]*?node\.hidden=true/,'every successful loader hide path must fail closed until authoritative V10.42 readiness');
assert.doesNotMatch(overlaySafety,/body\[data-release-ready="true"\]\s+#ccg-release-loading/,'legacy release-ready pulses must not own loader visibility');
assert.doesNotMatch(overlaySafety,/body\[data-run-active="true"\]\s+#ccg-release-loading/,'run-active alone must not own loader visibility');
assert.doesNotMatch(overlaySafety,/body\[data-tutorial-active="true"\]\s+#ccg-release-loading/,'tutorial-active alone must not own loader visibility');
assert.match(overlaySafety,/body\[data-v142-bootstrap-ready="true"\]\[data-release-ready="true"\]\[data-run-active="true"\]\s+#ccg-release-loading/,'gameplay-start safety must require authoritative V10.42 readiness');
assert.match(overlaySafety,/body\[data-v142-bootstrap-ready="true"\]\[data-release-ready="true"\]\[data-tutorial-active="true"\]\s+#ccg-release-loading/,'tutorial-start safety must require authoritative V10.42 readiness');

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

console.log('Dungeon Carnage startup first-visual static contract passed');
