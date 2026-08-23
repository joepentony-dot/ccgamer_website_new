import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-27-keyboard-input-fix.js"),"utf8");

assert.match(source,/textarea/,"editable guard must include textareas");
assert.match(source,/input,textarea,select/,"editable guard must include form controls");
assert.match(source,/event\.stopPropagation\(\)/,"editable events must be stopped before the window gameplay handler");
assert.doesNotMatch(source,/protectEditableFields[\s\S]{0,220}preventDefault/,"editable guard must not cancel normal typing defaults");
assert.match(source,/KeyW/,"tutorial movement must accept WASD");
assert.match(source,/ArrowUp/,"tutorial movement must accept arrow keys");
assert.match(source,/\[1,new Set\(\["Space"\]\)\]/,"tutorial fire step must accept Space");
assert.match(source,/\[3,new Set\(\["Tab"\]\)\]/,"tutorial inventory step must accept Tab");
assert.match(source,/button\.click\(\)/,"expected tutorial key must acknowledge the instruction card");
assert.match(source,/window\.addEventListener\("keydown",releaseExpectedTutorialKey,true\)/,"tutorial release must run in capture before the older document blocker");
assert.match(source,/document\.addEventListener\("keydown",protectEditableFields,false\)/,"editable protection must run after the field receives the key but before window bubbling");

console.log("v10-27 keyboard input regression checks passed");
