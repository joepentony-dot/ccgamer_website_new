import assert from 'node:assert/strict';
import fs from 'node:fs';

const index=fs.readFileSync(new URL('../index.html',import.meta.url),'utf8');
const blockingCss=fs.readFileSync(new URL('../css/v10-41-r29.css',import.meta.url),'utf8');
const runtimePolish=fs.readFileSync(new URL('../js/v10-41-landing-notification-polish.js',import.meta.url),'utf8');
const lateLayoutOwner=fs.readFileSync(new URL('../js/v10-41-r55-final-playtest-cleanup.js',import.meta.url),'utf8');

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
// deliberately outranks that presentation without rewriting gameplay ownership.
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

assert.match(blockingCss,/html body\[data-run-active="false"\] #menu #continue-save-btn\{[\s\S]*?grid-column:1\/-1!important[\s\S]*?min-height:78px!important/,'saved-run resume must own the full-width priority row and match the late R55 geometry');
assert.match(blockingCss,/html body\[data-run-active="false"\] #menu #solo-btn\{[\s\S]*?grid-column:span 2!important[\s\S]*?min-height:82px!important/,'Solo must remain a large primary release choice with the settled R55 height');
assert.match(blockingCss,/html body\[data-run-active="false"\] #menu #split-btn\{[\s\S]*?grid-column:span 2!important[\s\S]*?min-height:74px!important/,'local Split Screen must sit beside Solo and match the settled R55 height');
assert.match(blockingCss,/html body\[data-run-active="false"\] #menu #tutorial-zone-btn\{[\s\S]*?min-height:70px!important/,'Tutorial first-paint geometry must match the retained R55 owner');
assert.match(blockingCss,/html body\[data-run-active="false"\] #menu #daily-btn\{[\s\S]*?min-height:70px!important/,'Weekly first-paint geometry must match the retained R55 owner');
assert.match(blockingCss,/html body\[data-run-active="false"\] #menu \.game-mode-buttons button:not\(\.hidden\)\{[\s\S]*?padding:28px 12px 24px!important/,'blocking CSS must own the same desktop card padding as R55 for visible controls before first paint without forcing hidden controls visible');
assert.match(blockingCss,/@media\(max-width:760px\)\{[\s\S]*?min-height:78px!important;[\s\S]*?padding:29px 12px 25px!important/,'blocking mobile geometry must match the retained R55 seal');
assert.match(blockingCss,/@media\(max-width:520px\)\{[\s\S]*?grid-template-columns:1fr!important/,'narrow mobile landing menu must collapse to one column');

// R55 still owns late card-text sealing. It must agree with the blocking geometry
// and must reconcile DOM traversal order with the Stage 2 visual hierarchy.
assert.match(lateLayoutOwner,/if\(id==="solo-btn"\|\|id==="create-btn"\)\{height="82px";font="10\.5px"\}/,'R55 Solo height must remain aligned with first-paint geometry');
assert.match(lateLayoutOwner,/else if\(id==="continue-save-btn"\)\{height="78px";font="10px"\}/,'R55 Resume height must remain aligned with first-paint geometry');
assert.match(lateLayoutOwner,/else if\(id==="tutorial-zone-btn"\|\|id==="daily-btn"\)\{height="70px";font="9px"\}/,'R55 secondary heights must remain aligned with first-paint geometry');
assert.match(lateLayoutOwner,/if\(mobile\)height="78px"/,'R55 mobile height must remain aligned with blocking mobile geometry');
assert.match(lateLayoutOwner,/const ids=\["continue-save-btn","solo-btn","split-btn","tutorial-zone-btn","daily-btn"\]/,'late owner must put supported buttons into visual/focus order');
assert.match(lateLayoutOwner,/grid\.insertBefore\(fragment,grid\.firstChild\)/,'late owner must reconcile actual DOM order rather than relying only on CSS order');

console.log('Stage 2 supported landing menu contract passed');
