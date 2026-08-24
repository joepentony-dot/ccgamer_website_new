import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameDir=path.resolve(here,"..");
const source=fs.readFileSync(path.join(gameDir,"js/version-check.js"),"utf8");

assert.doesNotThrow(()=>new Function(source),"version-check.js remains valid JavaScript");
assert.match(source,/searchParams\.get\("mode"\).*tutorial/s,"the tutorial URL mode is recognised");
assert.match(source,/data-tutorial-deeplink=\"pending\".*#menu\{display:none!important\}/s,"the normal menu is hidden while direct tutorial launch is pending");
assert.match(source,/ccgTutorialLaunchBound/,"the deep link waits for the established tutorial launcher rather than duplicating run logic");
assert.match(source,/button\.click\(\)/,"the established Tutorial button path is used to start training");
assert.match(source,/dataset\?\.tutorialActive===\"true\"/,"deep-link state tracks actual tutorial activation");
assert.match(source,/ccg-tutorial-deeplink-gate/,"a one-click browser fallback exists without exposing the main menu");
assert.match(source,/searchParams\.delete\("mode"\)/,"the tutorial query is removed after training so returning to the menu stays normal");
assert.match(source,/CCGLostSizzlerTutorialDeepLink/,"deep-link diagnostics are exposed for regression checks");

console.log("Lost Sizzler tutorial deep-link contract checks passed");
