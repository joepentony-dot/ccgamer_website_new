import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");

const gameplay=read("js/game-play.js");
const feedback=read("js/v10-42-r72-map-death-feedback.js");
const css=read("css/v10-42-r72-map-death-feedback.css");
const version=JSON.parse(read("version.json"));

assert.equal(version.build,"V10.42 r82");
assert.equal(version.cacheToken,"20260930r82");

assert.match(gameplay,/let pendingDeathConfirmation=null;/,"death owner must keep an explicit pending confirmation transaction");
assert.match(gameplay,/mode="respawning"/,"lethal damage must enter the non-playing respawn state");
assert.match(gameplay,/requiresConfirmation:true/,"death event must tell the presentation layer confirmation is mandatory");
assert.match(gameplay,/addEventListener\("ccg:death-confirmed"/,"gameplay must listen for the explicit confirmation event");
assert.match(gameplay,/function finishPendingDeathRespawn/,"one gameplay owner must finish the pending respawn");
assert.match(gameplay,/new CustomEvent\("ccg:respawn-confirmed"/,"gameplay must acknowledge successful respawn completion");
assert.doesNotMatch(gameplay,/deathTransitionMs=1200/,"the retired 1.2 second auto-respawn timer must not return");
assert.doesNotMatch(gameplay,/setTimeout\(\(\)=>\{if\(mode==="respawning"\)\{mode="playing"/,"respawn must not resume unattended");

assert.match(feedback,/aria-modal/,"YOU DIED presentation must be a modal interaction");
assert.match(feedback,/id="ccg-r72-death-continue"/,"YOU DIED presentation must expose a CONTINUE button");
assert.match(feedback,/CONFIRM WHEN YOU ARE READY TO RESPAWN/,"death copy must explain that the player controls continuation");
assert.match(feedback,/event\.code!=="Enter".*event\.code!=="NumpadEnter".*event\.code!=="Space"/s,"Enter and Space must be supported confirmation keys");
assert.match(feedback,/ccg:death-confirmed/,"presentation must publish explicit confirmation");
assert.match(feedback,/ccg:respawn-confirmed/,"presentation must only dismiss after the gameplay owner confirms respawn");
assert.doesNotMatch(feedback,/setTimeout\(/,"death presentation must not contain an auto-dismiss timer");

assert.match(css,/pointer-events:auto!important/,"active death presentation must block pointer interaction with gameplay");
assert.match(css,/\.ccg-r72-death-card>button/,"CONTINUE must have an explicit visible control style");

console.log("Dungeon R79 explicit death confirmation contract passed.");
