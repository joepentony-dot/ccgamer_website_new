import assert from 'node:assert/strict';
import fs from 'node:fs';

const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const blockingCss=fs.readFileSync(new URL('../css/v10-41-r29.css',import.meta.url),'utf8');
const runtimePolish=fs.readFileSync(new URL('../js/v10-41-landing-notification-polish.js',import.meta.url),'utf8');

assert.match(index,/css\/v10-41-r29\.css\?v=[^"']+/,'r29 must remain a blocking stylesheet in the document head');
assert.ok(index.indexOf('css/v10-41-r29.css') < index.indexOf('</head>'),'r29 must load before the first body paint');
assert.ok(index.indexOf('</head>') < index.indexOf('js/v10-41-landing-notification-polish.js'),'runtime landing polish must remain later than blocking CSS');

const firstPaintContracts=[
  'body[data-run-active="false"] #menu>.panel{padding-top:20px!important;padding-bottom:22px!important}',
  'body[data-run-active="false"] #menu .game-mode-buttons{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important',
  'body[data-run-active="false"] #menu #solo-btn{order:11;grid-column:span 2!important}',
  'body[data-run-active="false"] #menu #tutorial-zone-btn{order:31;grid-column:span 2!important}',
  'body[data-run-active="false"] #menu #daily-btn{order:32;grid-column:span 2!important}',
  'body[data-run-active="false"] #menu #solo-btn,',
  'body[data-run-active="false"] #menu #tutorial-zone-btn,',
];

for(const contract of firstPaintContracts){
  assert.ok(blockingCss.includes(contract),`blocking CSS is missing startup contract: ${contract}`);
  assert.ok(runtimePolish.includes(contract),`runtime polish no longer agrees with blocking startup contract: ${contract}`);
}

assert.match(blockingCss,/body\[data-run-active="false"\] #menu #solo-btn,[\s\S]*?min-height:54px!important;[\s\S]*?box-shadow:0 8px 18px/,'primary landing button geometry must exist before script execution');
assert.match(blockingCss,/body\[data-run-active="false"\] #menu #tutorial-zone-btn,[\s\S]*?min-height:38px!important;[\s\S]*?opacity:\.88;box-shadow:none!important/,'secondary landing button hierarchy must exist before script execution');

console.log('startup menu first-paint contract passed');
