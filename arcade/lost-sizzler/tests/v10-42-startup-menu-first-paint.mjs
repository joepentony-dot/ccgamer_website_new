import assert from "node:assert/strict";
import fs from "node:fs";

const index=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const blockingCss=fs.readFileSync(new URL("../css/v10-41-r29.css",import.meta.url),"utf8");
const baseCss=fs.readFileSync(new URL("../css/game.css",import.meta.url),"utf8");
const startupCss=fs.readFileSync(new URL("../css/v10-42-startup-first-visual.css",import.meta.url),"utf8");
const runtimePolish=fs.readFileSync(new URL("../js/v10-41-landing-notification-polish.js",import.meta.url),"utf8");
const r55=fs.readFileSync(new URL("../js/v10-41-r55-final-playtest-cleanup.js",import.meta.url),"utf8");

const headEnd=index.indexOf("</head>");
assert.match(index,/css\/v10-41-r29\.css\?v=[^"']+/,"r29 must remain a blocking stylesheet in the document head");
assert.match(index,/css\/v10-42-startup-first-visual\.css\?v=[^"']+/,"final startup-card colours must remain a blocking stylesheet in the document head");
assert.ok(index.indexOf("css/v10-41-r29.css")<headEnd,"r29 geometry must load before first body paint");
assert.ok(index.indexOf("css/v10-42-startup-first-visual.css")<headEnd,"settled colour treatment must load before first body paint");
assert.ok(headEnd<index.indexOf("js/v10-41-landing-notification-polish.js"),"retained notification compatibility must execute only after blocking menu CSS");

for(const contract of [
  'html body[data-run-active="false"] #menu #continue-save-btn{',
  'order:10!important;',
  'min-height:78px!important;',
  'html body[data-run-active="false"] #menu #solo-btn{',
  'order:11!important;',
  'min-height:82px!important;',
  'html body[data-run-active="false"] #menu #tutorial-zone-btn{',
  'order:12!important;',
  'min-height:70px!important;'
])assert.ok(blockingCss.includes(contract),"blocking menu geometry is missing: "+contract);

for(const retiredSelector of ["#create-btn","#split-btn","#daily-btn","#horde-solo-btn","#horde-mode-btn","#saboteurs-mode-btn"]){
  assert.ok(!blockingCss.includes(retiredSelector),"blocking landing CSS must not retain retired mode selector: "+retiredSelector);
}

assert.match(baseCss,/\.mode-solo\{[^}]*background:linear-gradient/,"Start Game must use its final blended colour in base CSS");
assert.match(baseCss,/#tutorial-zone-btn\{[^}]*background:linear-gradient/,"Tutorial must use its final blended colour in base CSS");
assert.match(baseCss,/\.save-resume\{[^}]*background:linear-gradient/,"Continue must use its final blended colour in base CSS");
assert.doesNotMatch(baseCss,/\.mode-solo\{[^}]*background:#ffd85a!important/,"the obsolete solid yellow Start Game first paint must not exist");
assert.doesNotMatch(baseCss,/#tutorial-zone-btn\{[^}]*background:#103542!important/,"the obsolete flat Tutorial first paint must not exist");

assert.match(startupCss,/html body\[data-run-active="false"\] #menu #solo-btn\{[\s\S]*?background:linear-gradient/,"Start Game must have its final blended colour in blocking startup CSS");
assert.match(startupCss,/html body\[data-run-active="false"\] #menu #tutorial-zone-btn\{[\s\S]*?background:linear-gradient/,"Tutorial must have its final blended colour in blocking startup CSS");
assert.match(startupCss,/html body\[data-run-active="false"\] #menu #continue-save-btn\{[\s\S]*?background:linear-gradient/,"Continue must have its final blended colour in blocking startup CSS");

assert.doesNotMatch(runtimePolish,/#menu|game-mode-buttons|MAIN ADVENTURES|SPECIAL MODES|ensureModeLabels|modeObserver|data-ccg-legacy-menu-polish/,"retained landing compatibility code must not own menu presentation");
assert.match(runtimePolish,/#ccg-major-notification/,"retained landing module must continue to own major notifications");

assert.match(r55,/function markMenu\(\)\{[\s\S]*?compatibility no-op/,"R55 menu compatibility must remain non-mutating");
assert.match(r55,/function tick\(\)\{repairHordeAuthority\(\)\}/,"R55 recurring compatibility work must not repaint the menu");
assert.doesNotMatch(r55,/function tick\(\)\{[^}]*markMenu\(/,"R55 timer must never invoke the retired menu repair");

console.log("startup menu first-paint single-owner contract passed");
