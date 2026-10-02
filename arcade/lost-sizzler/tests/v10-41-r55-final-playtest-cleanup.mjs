import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const loader=fs.readFileSync(path.join(root,"js/v10-41-r53-terminal-solo-end-recovery.js"),"utf8");
const r55=fs.readFileSync(path.join(root,"js/v10-41-r55-final-playtest-cleanup.js"),"utf8");
const blocking=fs.readFileSync(path.join(root,"css/v10-42-startup-first-visual.css"),"utf8");
const geometry=fs.readFileSync(path.join(root,"css/v10-41-r29.css"),"utf8");

assert.match(loader,/v10-41-r55-final-playtest-cleanup\.js/,"R53 recovery edge must load R55 after R54");
assert.match(loader,/data-ccg-v141-r55-final-playtest-cleanup/,"R55 loader must remain idempotent");

assert.match(geometry,/display:flex!important;[\s\S]*align-items:center!important;[\s\S]*justify-content:flex-start!important/,"blocking menu CSS must own the centred mode-card title row");
assert.match(geometry,/padding:28px 12px 24px!important/,"blocking menu CSS must reserve independent top and bottom text bands");
assert.match(blocking,/button::before[\s\S]*top:9px!important/,"blocking first-visual CSS must pin the mode-card kicker before runtime");
assert.match(blocking,/button::after[\s\S]*bottom:8px!important/,"blocking first-visual CSS must pin the mode-card description before runtime");
assert.match(geometry,/#continue-save-btn\{[\s\S]*min-height:78px!important/,"dynamic Continue copy must retain enough vertical space in blocking CSS");
assert.match(r55,/function markMenu\(\)\{[\s\S]*compatibility no-op/,"R55 menu presentation must remain retired");
assert.match(r55,/function tick\(\)\{repairHordeAuthority\(\)\}/,"R55 periodic work must be Horde-only and never repaint the menu");

assert.match(r55,/document\.body\?\.dataset\?\.hordeSolo==="true"\|\|net\?\.mode==="solo"\|\|!net\?\.connected/,"Solo Horde must retain browser authority even when the dedicated module is present");
assert.match(r55,/if\(dedicatedLive\(\)\)return false/,"browser authority must yield only after dedicated Horde authority is live");
assert.match(r55,/return Boolean\(net\?\.isHost\)/,"online Horde fallback authority must remain with the current browser host until server handoff");
assert.match(r55,/\["briefing","intermission"\]\.includes\(phase\)/,"R55 must repair stalled Horde transition phases without double-owning live wave spawning");
assert.match(r55,/H\.tick\(runState,Date\.now\(\)\)/,"stalled Horde transition phases must be advanced through the canonical rules engine");
assert.match(r55,/\["wave","siege"\]\.includes\(phase\)[\s\S]*banner\.dataset\.visible="false"/,"Horde transition banner must leave the centre once a live wave begins");

console.log("R55 final playtest cleanup contracts passed.");
