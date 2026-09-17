import assert from 'node:assert/strict';
import fs from 'node:fs';

const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const blockingCss=fs.readFileSync(new URL('../css/v10-41-r29.css',import.meta.url),'utf8');
const runtimePolish=fs.readFileSync(new URL('../js/v10-41-landing-notification-polish.js',import.meta.url),'utf8');

// Stage 2 is a product-facing landing milestone, not another retired-mode cleanup
// pass. The canonical menu must expose only supported release choices.
for(const id of ['solo-btn','continue-save-btn','split-btn','tutorial-zone-btn','daily-btn']){
  assert.match(index,new RegExp(`id=["']${id}["']`),`${id} must remain present on the supported landing menu`);
}
for(const retiredId of ['create-btn','join-btn','horde-solo-btn','horde-mode-btn','saboteurs-mode-btn']){
  assert.doesNotMatch(index,new RegExp(`id=["']${retiredId}["']`),`${retiredId} must not return to the canonical landing menu`);
}

// Preserve #2127: final visible landing geometry must exist in a stylesheet that
// blocks first paint, before the historical runtime compatibility layer executes.
assert.ok(index.indexOf('css/v10-41-r29.css') < index.indexOf('</head>'),'Stage 2 landing rules must remain in blocking head CSS');
assert.ok(index.indexOf('</head>') < index.indexOf('js/v10-41-landing-notification-polish.js'),'historical runtime polish must remain later than blocking CSS');

// The old compatibility script may still create historical tier labels. Stage 2
// deliberately outranks that presentation without rewriting gameplay/runtime
// ownership underneath the menu.
assert.match(runtimePolish,/MAIN ADVENTURES/,'compatibility landing layer should remain intact rather than being rewritten for presentation-only work');
assert.match(runtimePolish,/SPECIAL MODES/,'historical compatibility label remains isolated behind Stage 2 presentation ownership');
assert.match(blockingCss,/html body\[data-run-active="false"\] #menu \.ccg-mode-tier-label\{display:none!important\}/,'runtime-injected tier labels must be hidden by the blocking Stage 2 hierarchy');

const requiredStage2=[
  'html body[data-run-active="false"] #menu #continue-save-btn{',
  'order:10!important;',
  'html body[data-run-active="false"] #menu #solo-btn{',
  'order:11!important;',
  'html body[data-run-active="false"] #menu #split-btn{',
  'order:12!important;',
  'html body[data-run-active="false"] #menu #tutorial-zone-btn{',
  'order:21!important;',
  'html body[data-run-active="false"] #menu #daily-btn{',
  'order:22!important;'
];
for(const contract of requiredStage2){
  assert.ok(blockingCss.includes(contract),`Stage 2 landing hierarchy is missing: ${contract}`);
}

assert.match(blockingCss,/html body\[data-run-active="false"\] #menu #continue-save-btn\{[\s\S]*?grid-column:1\/-1!important/,'saved-run resume must own a full-width priority row when available');
assert.match(blockingCss,/html body\[data-run-active="false"\] #menu #solo-btn\{[\s\S]*?grid-column:span 2!important[\s\S]*?min-height:56px!important/,'Solo must remain a large primary release choice');
assert.match(blockingCss,/html body\[data-run-active="false"\] #menu #split-btn\{[\s\S]*?grid-column:span 2!important[\s\S]*?min-height:56px!important/,'local Split Screen must sit beside Solo as a supported adventure choice');
assert.match(blockingCss,/@media\(max-width:520px\)\{[\s\S]*?grid-template-columns:1fr!important/,'narrow mobile landing menu must collapse to one column');

console.log('Stage 2 supported landing menu contract passed');
