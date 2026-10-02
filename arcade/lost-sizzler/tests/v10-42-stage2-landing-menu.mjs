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

// R93 retires the historical runtime menu presentation owner entirely.
// The retained V10.41 module may own notifications/version compatibility only.
assert.doesNotMatch(runtimePolish,/MAIN ADVENTURES|SPECIAL MODES|ensureModeLabels|modeObserver|data-ccg-legacy-menu-polish/,'retained landing compatibility code must not recreate menu tiers or presentation layers');
assert.match(runtimePolish,/#ccg-major-notification/,'retained landing module must keep major-notification ownership');
assert.match(blockingCss,/html body\[data-run-active="false"\] #menu \.ccg-mode-tier-label\{display:none!important\}/,'blocking CSS may defensively suppress stale tier labels without requiring runtime creation');

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
assert.match(blockingCss,/@media\(max-width:900px\),\(pointer:coarse\)\{[\s\S]*?grid-template-columns:minmax\(0,1fr\)!important[\s\S]*?grid-column:1\/-1!important[\s\S]*?width:100%!important[\s\S]*?min-height:78px!important;[\s\S]*?padding:29px 12px 25px!important/,'phone/coarse landing geometry must collapse supported choices to one full-width column');
assert.match(blockingCss,/#solo-btn\.primary\{color:#f5eefb!important\}/,'Solo primary text must retain readable light contrast on its dark card');

// R55 is retained for historical/Horde compatibility only. It must never repaint
// or reorder the supported menu after first paint.
assert.match(lateLayoutOwner,/function injectStyle\(\)\{[\s\S]*?document\.getElementById\(STYLE_ID\)\?\.remove\?\.\(\)/,'R55 must remove any stale injected menu style instead of adding one');
assert.match(lateLayoutOwner,/function markMenu\(\)\{[\s\S]*?compatibility no-op/,'R55 menu presentation must remain a compatibility no-op');
assert.match(lateLayoutOwner,/function tick\(\)\{repairHordeAuthority\(\)\}/,'R55 recurring compatibility tick must not touch menu presentation');
assert.doesNotMatch(lateLayoutOwner,/function tick\(\)\{[^}]*markMenu\(/,'R55 timer must never call the legacy menu mutator');
assert.doesNotMatch(lateLayoutOwner,/function tick\(\)\{[^}]*injectStyle\(/,'R55 timer must never inject menu styles');

console.log('Stage 2 supported landing menu contract passed');
