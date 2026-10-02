import assert from "node:assert/strict";
import fs from "node:fs";

const read=relative=>fs.readFileSync(new URL(`../${relative}`,import.meta.url),"utf8");
const core=read("js/game-core.js");
const r71=read("js/v10-42-r71-equipment-inventory.js");
const r80=read("js/v10-42-r80-wearable-equipment.js");
const r55=read("js/v10-41-r55-final-playtest-cleanup.js");
const landing=read("js/v10-41-landing-notification-polish.js");
const bootstrap=read("js/v10-42-bootstrap.js");
const firstVisual=read("css/v10-42-startup-first-visual.css");

assert.match(core,/function renderInventoryHudIfChanged\(player,useKeys\)/,"R93 must own quick inventory rendering behind a state-change boundary");
assert.match(core,/quickSlotsRenderSignature!==inventorySignature/,"quick slots must not rebuild on every sync tick");
assert.match(core,/itemShortcutsRenderSignature!==shortcutSignature/,"right-side item shortcuts must not rebuild on every sync tick");

const syncBody=core.slice(core.indexOf("function sync(){"),core.indexOf("function updateQuests(){"));
assert.ok(!/UI\.quickSlots\.innerHTML=/.test(syncBody),"sync() must not directly replace quick-slot DOM every frame");
assert.ok(!/UI\.itemShortcuts\.innerHTML=/.test(syncBody),"sync() must not directly replace shortcut DOM every frame");

assert.ok(!/observer\.observe\(inventory/.test(r71),"R71 must not own a second inventory visibility observer");
assert.ok(!/visibilityObserver\.observe\(inventoryPanel/.test(r80),"R80 must not own a second inventory visibility observer");
assert.match(r71,/renderInventoryPanel=function r71RenderInventoryPanel/,"R71 must still compose through the canonical inventory render boundary");
assert.match(r80,/renderInventoryPanel=function r80RenderInventory/,"R80 must still compose through the canonical inventory render boundary");

assert.match(r55,/function markMenu\(\)\{[\s\S]*compatibility no-op/,"legacy R55 menu repair must be retained only as a no-op");
assert.match(r55,/function tick\(\)\{repairHordeAuthority\(\)\}/,"R55 timer must no longer mutate menu presentation");
assert.ok(!bootstrap.includes("R55FinalPlaytestCleanup?.markMenu"),"ordered bootstrap must not replay legacy R55 menu presentation");

assert.ok(landing.includes('body[data-ccg-legacy-menu-polish="true"][data-run-active="false"] #menu'),"legacy landing CSS must be dormant behind an unset compatibility flag");
assert.ok(!/state\.modeObserver=new MutationObserver/.test(landing),"legacy landing module must not observe/rebuild menu tiers");

for(const id of ["solo-btn","tutorial-zone-btn","continue-save-btn"]){
  const re=new RegExp(`html body\\[data-run-active="false"\\] #menu #${id}\\{[\\s\\S]*?background:linear-gradient`);
  assert.match(firstVisual,re,`${id} must have its final blended colour in blocking CSS before first paint`);
}

console.log("Dungeon Carnage R93 UI single-owner flicker contract passed.");
