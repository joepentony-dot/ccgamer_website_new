import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameDir=path.resolve(here,"..");
const read=name=>fs.readFileSync(path.join(gameDir,name),"utf8");

const loader=read("js/asset-overrides.js");
const fixes=read("js/v10-18-input-ui-bugfixes.js");
const css=read("css/v10-18-input-ui-bugfixes.css");

assert.match(loader,/v10-18-input-ui-bugfixes\.css\?v=/,"input/UI bugfix CSS is cache-busted and loaded");
assert.match(loader,/v10-18-input-ui-bugfixes\.js\?v=/,"input/UI bugfix JS is cache-busted and loaded");
assert.match(fixes,/ControlLeft/,"Left Ctrl compatibility is installed for player-two dash");
assert.match(fixes,/ControlRight/,"existing Right Ctrl mapping remains recognised");
assert.match(fixes,/event\.preventDefault\(\)/,"Ctrl browser default is suppressed during active split-screen input");
assert.match(fixes,/REINFORCED_WARNING_COOLDOWN_MS=1800/,"reinforced-door warning has a stable cooldown");
assert.match(fixes,/door\.sigilGate/,"Sigil reinforced gates are recognised by the fix");
assert.match(fixes,/panel\.scrollTop=/,"inventory wheel explicitly controls the inner panel scroll position");
assert.match(css,/#inventory-panel\{[\s\S]*overflow:hidden!important/,"inventory overlay no longer competes for wheel scrolling");
assert.match(css,/#inventory-panel>\.inventory-panel\{[\s\S]*overflow-y:auto!important/,"inventory panel owns vertical scrolling");
assert.match(css,/overflow-anchor:none!important/,"scroll anchoring cannot snap the inventory list back down");
assert.match(css,/overscroll-behavior:contain!important/,"inventory overscroll is contained");

console.log("V10.18 Ctrl, inventory scroll and reinforced-door regression checks passed");
