import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const loader=fs.readFileSync(path.join(root,"js/v10-41-r53-terminal-solo-end-recovery.js"),"utf8");
const r55=fs.readFileSync(path.join(root,"js/v10-41-r55-final-playtest-cleanup.js"),"utf8");

assert.match(loader,/v10-41-r55-final-playtest-cleanup\.js/,"R53 recovery edge must load R55 after R54");
assert.match(loader,/data-ccg-v141-r55-final-playtest-cleanup/,"R55 loader must remain idempotent");

assert.match(r55,/display:flex!important;align-items:center!important;justify-content:flex-start!important/,"menu mode-card titles must own a centred middle row");
assert.match(r55,/padding:28px 12px 24px!important/,"menu cards must reserve independent top and bottom text bands");
assert.match(r55,/button::before[\s\S]*top:9px!important/,"mode-card kicker must be pinned to its own top row");
assert.match(r55,/button::after[\s\S]*bottom:8px!important/,"mode-card description must be pinned to its own bottom row");
assert.match(r55,/#continue-save-btn\{min-height:78px!important/,"dynamic Continue copy must retain enough vertical space");
assert.match(r55,/#horde-mode-btn,[\s\S]*#saboteurs-mode-btn,[\s\S]*#split-btn\{min-height:74px!important/,"special-mode cards must not collapse onto their descriptions");

assert.match(r55,/document\.body\?\.dataset\?\.hordeSolo==="true"\|\|net\?\.mode==="solo"\|\|!net\?\.connected/,"Solo Horde must retain browser authority even when the dedicated module is present");
assert.match(r55,/if\(dedicatedLive\(\)\)return false/,"browser authority must yield only after dedicated Horde authority is live");
assert.match(r55,/return Boolean\(net\?\.isHost\)/,"online Horde fallback authority must remain with the current browser host until server handoff");
assert.match(r55,/\["briefing","intermission"\]\.includes\(phase\)/,"R55 must repair stalled Horde transition phases without double-owning live wave spawning");
assert.match(r55,/H\.tick\(runState,Date\.now\(\)\)/,"stalled Horde transition phases must be advanced through the canonical rules engine");
assert.match(r55,/\["wave","siege"\]\.includes\(phase\)[\s\S]*banner\.dataset\.visible="false"/,"Horde transition banner must leave the centre once a live wave begins");

console.log("R55 final playtest cleanup contracts passed.");
