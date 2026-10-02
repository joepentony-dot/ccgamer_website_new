import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const current=read("css/v10-42-r95-rpg-hud.css");
const js=read("js/v10-24-mobile-ergonomics.js");
const assets=read("js/asset-overrides.js");

assert.match(assets,/CCG_MOBILE_ERGONOMICS_REV=CCG_RELEASE_REV;/,"mobile ergonomics helper must inherit the current published release token");
assert.doesNotMatch(assets,/css\/v10-24-mobile-ergonomics\.css/,"retired V10.24 live-play stylesheet must not be late-loaded after R95");
assert.match(assets,/js\/v10-24-mobile-ergonomics\.js\?v=\$\{CCG_MOBILE_ERGONOMICS_REV\}/,"mobile inventory ergonomics helper must remain loaded");

assert.match(js,/id="ccg-mobile-inventory-return"|button\.id="ccg-mobile-inventory-return"/,"mobile inventory must add a thumb-reach return button");
assert.match(js,/button\.textContent="← BACK TO GAME"/,"mobile return control must use an unambiguous Back to Game label");
assert.match(js,/document\.getElementById\("inventory-close-top"\)/,"return helper must reuse the existing safe inventory-close path");
assert.match(js,/observer\.observe\(panel,\{attributes:true,attributeFilter:\["class"\]\}\)/,"return button visibility must follow the actual inventory overlay state");
assert.match(js,/ccg-mobile-inventory-open/,"body must expose mobile inventory-open state for layout safeguards");
assert.match(js,/ccg-tutorial-control-highlight/,"thumb-reach Back to Game button must still integrate with tutorial guidance");

assert.match(current,/R95 — migrated mobile inventory ergonomics/,"R95 must own the migrated mobile inventory presentation");
assert.match(current,/#ccg-mobile-inventory-return\{[\s\S]*position:fixed!important/,"Back to Game must stay in thumb reach while inventory scrolls");
assert.match(current,/bottom:max\(10px,env\(safe-area-inset-bottom\)\)!important/,"Back to Game must respect the phone safe area");
assert.match(current,/#inventory-panel>\.inventory-panel\{[\s\S]*padding:14px 12px 92px!important/,"inventory content must reserve space for the fixed return button");
assert.match(current,/#inventory-panel \.mobile-panel-head\{[\s\S]*position:sticky!important/,"inventory header must remain reachable while scrolling");
assert.match(current,/@media\(max-width:380px\)[\s\S]*#inventory-panel \.inventory-list\{grid-template-columns:1fr!important/,"very narrow phones must collapse inventory slots to one column");
assert.match(current,/\.v104-touch-pad\{[\s\S]*grid-template-columns:repeat\(3,44px\)!important/,"current R95 touch pad must retain 44px movement targets");

console.log("V10.24 inventory ergonomics retained under R95 single-owner mobile presentation");
