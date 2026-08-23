import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";
import assert from "node:assert/strict";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");
const css=read("css/v10-24-mobile-ergonomics.css");
const js=read("js/v10-24-mobile-ergonomics.js");
const assets=read("js/asset-overrides.js");

assert.match(assets,/CCG_MOBILE_ERGONOMICS_REV="20260823a"/,"mobile ergonomics must have an explicit cache revision");
assert.match(assets,/css\/v10-24-mobile-ergonomics\.css\?v=\$\{CCG_MOBILE_ERGONOMICS_REV\}/,"mobile ergonomics CSS must be loaded after the compact mobile layers");
assert.match(assets,/js\/v10-24-mobile-ergonomics\.js\?v=\$\{CCG_MOBILE_ERGONOMICS_REV\}/,"mobile ergonomics helper must be loaded by the game");

assert.match(js,/id="ccg-mobile-inventory-return"|button\.id="ccg-mobile-inventory-return"/,"mobile inventory must add a thumb-reach return button");
assert.match(js,/button\.textContent="← BACK TO GAME"/,"mobile return control must use an unambiguous Back to Game label");
assert.match(js,/document\.getElementById\("inventory-close-top"\)/,"return helper must reuse the existing safe inventory-close path");
assert.match(js,/observer\.observe\(panel,\{attributes:true,attributeFilter:\["class"\]\}\)/,"return button visibility must follow the actual inventory overlay state");
assert.match(js,/ccg-mobile-inventory-open/,"body must expose mobile inventory-open state for layout safeguards");

assert.match(css,/#ccg-mobile-inventory-return\{[\s\S]*?position:fixed!important/,"Back to Game must stay in thumb reach while inventory scrolls");
assert.match(css,/bottom:max\(10px,env\(safe-area-inset-bottom\)\)!important/,"Back to Game must respect the phone safe area");
assert.match(css,/#inventory-panel>\.inventory-panel\{[\s\S]*?padding:14px 12px 92px!important/,"inventory content must reserve space for the fixed return button instead of being covered by it");
assert.match(css,/#inventory-panel \.mobile-panel-head\{[\s\S]*?position:sticky!important/,"inventory header must remain reachable while scrolling");

assert.match(css,/\.mission strong\{[\s\S]*?font-size:9px!important/,"mobile mission label must be larger than the former compact 7px label");
assert.match(css,/\.mission span\{[\s\S]*?font-size:10px!important/,"mobile mission text must be enlarged");
assert.match(css,/\.hub-stat b\{[\s\S]*?font-size:13px!important/,"mobile HUD values must be enlarged");
assert.match(css,/\.v104-touch-btn\{[\s\S]*?font-size:10px!important/,"portrait action labels must be enlarged");
assert.match(css,/\.v104-touch-pad \.v104-touch-btn\{[\s\S]*?font-size:18px!important/,"portrait movement arrows must be enlarged");
assert.match(css,/grid-template-columns:repeat\(3,minmax\(0,1fr\)\)!important/,"touch actions must use equal flexible columns to avoid overlap");
assert.match(css,/white-space:normal!important;[\s\S]*?overflow:hidden!important;[\s\S]*?overflow-wrap:anywhere!important/,"larger touch labels must wrap safely inside their own buttons");
assert.match(css,/@media \(orientation:portrait\) and \(max-width:380px\)/,"very narrow phones must have a dedicated non-overlap fallback");
assert.match(css,/#inventory-panel \.inventory-list\{[\s\S]*?grid-template-columns:1fr!important/,"very narrow phones must collapse inventory slots to one column");

console.log("Lost Sizzler V10.24 mobile ergonomics regression checks passed.");
