import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameDir=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(gameDir,relative),"utf8");

const loader=read("js/asset-overrides.js");
const css=read("css/v10-11-mobile-focus.css");
const safety=read("css/v10-11-mobile-runtime-safety.css");

assert.match(loader,/v10-11-mobile-focus\.css\?v=\$\{CCG_MOBILE_FOCUS_REV\}/,"mobile focus stylesheet is cache-busted and loaded");
assert.match(loader,/v10-11-mobile-runtime-safety\.css\?v=\$\{CCG_MOBILE_SAFETY_REV\}/,"mobile safety stylesheet is cache-busted and loaded after focus layout");
assert.match(loader,/data-ccg-v111-mobile-focus/,"mobile focus stylesheet has a one-load guard");
assert.match(loader,/data-ccg-v111-mobile-safety/,"mobile safety stylesheet has a one-load guard");

assert.match(css,/\.ccg-game>\.tactical-zone\{\s*display:none!important;/s,"desktop tactical sidebar is removed from active mobile play");
assert.match(css,/grid-template-rows:auto auto minmax\(0,1fr\) auto!important/,"mobile game area reserves rows for notices, rating, canvas and portrait controls");
assert.match(css,/\.game-message-rail\{[\s\S]*grid-row:1!important/,"notifications have a dedicated row above gameplay");
assert.match(css,/#ccg-rating-panel\{[\s\S]*grid-row:2!important/,"rating request has a dedicated row above gameplay");
assert.match(css,/\.canvas-wrap\{[\s\S]*grid-row:3!important/,"canvas owns the main flexible gameplay row");
assert.match(css,/@media \(orientation:portrait\)[\s\S]*#v104-touch-controls\{[\s\S]*grid-row:4!important/,"portrait touch controls use a reserved row below the canvas");
assert.match(css,/@media \(orientation:landscape\)[\s\S]*\.v104-touch-pad\{[\s\S]*position:absolute!important;[\s\S]*left:max\(6px,env\(safe-area-inset-left\)\)/,"landscape movement controls stay in the lower-left edge");
assert.match(css,/@media \(orientation:landscape\)[\s\S]*\.v104-touch-actions\{[\s\S]*position:absolute!important;[\s\S]*right:max\(6px,env\(safe-area-inset-right\)\)/,"landscape action controls stay in the lower-right edge");
assert.match(css,/\.player-hub \.hub-inventory,[\s\S]*\.player-hub \.hub-progress,[\s\S]*\.player-hub \.hub-telemetry/,"non-essential bottom HUD sections are hidden on mobile");
assert.match(css,/\.feature-strip,[\s\S]*\.online-howto,[\s\S]*\.keys-help\{\s*display:none!important;/,"mobile title screen removes desktop-only explanatory blocks");
assert.match(safety,/#v104-touch-controls:not\(\.active\)/,"inactive touch controls are forced out of the layout");
assert.match(safety,/:has\(\.game-area>\.overlay:not\(\.hidden\)\)[\s\S]*#v104-touch-controls/,"modal panels suppress touch controls instead of overlapping them");
assert.match(safety,/orientation:portrait[\s\S]*bottom:198px!important/,"portrait contextual warning sits above the reserved control dock");
assert.match(safety,/orientation:landscape[\s\S]*bottom:166px!important/,"landscape contextual warning sits above the corner controls");

console.log("V10.11 mobile gameplay focus regression checks passed");
