import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameDir=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(gameDir,relative),"utf8");

const balance=read("js/v10-15-rare-events-balance.js");
const polish=read("css/v10-30-polish.css");

assert.match(balance,/const TRAP_WARNING_DISTANCE=3;/,"ordinary trap warnings use a three-tile radius");
assert.match(balance,/trapMd\(player,trap\)<=TRAP_WARNING_DISTANCE/,"trap warning is raised when the player enters the three-tile danger radius");
assert.match(balance,/warned:new Set\(\)/,"trap warnings are latched instead of repeating every frame");
assert.match(balance,/trapRuntime\.warned\.has\(trapKey\(candidate,player\)\)/,"each player/trap warning is emitted only once per floor");
assert.match(balance,/contact:new Set\(\)/,"active trap contact is latched to prevent duplicate movement/update hits");
assert.match(balance,/resolveTrapContact\(player,now\)/,"standing players are checked against active trap cycles during update");
assert.match(balance,/updateV115TrapRuntime/,"trap checks run continuously instead of only on movement triggers");
assert.match(balance,/drawReliableTrap/,"ordinary floor traps have a dedicated visible renderer");
assert.match(balance,/drawSpecialObjectsV115ReliableTraps/,"trap plates are attached to the live special-object render path");

assert.match(polish,/@media \(max-width:900px\),\(pointer:coarse\)/,"mobile notification correction applies to phones and coarse pointers");
assert.match(polish,/\.game-message-rail\{[\s\S]*min-height:52px!important;[\s\S]*position:relative!important|\.game-message-rail,[\s\S]*position:relative!important;[\s\S]*min-height:52px!important;/,"mobile message rail retains a visible notification row");
assert.match(polish,/\.pickup-toast\{[\s\S]*position:absolute!important;[\s\S]*inset:0!important/s,"mobile toast overlays room context instead of being clipped below it");
assert.match(polish,/\.pickup-toast\.show\{[\s\S]*display:grid!important;[\s\S]*visibility:visible!important;[\s\S]*opacity:1!important/s,"active mobile notifications are forced visible");

console.log("Lost Sizzler trap and mobile notification regression checks passed");
