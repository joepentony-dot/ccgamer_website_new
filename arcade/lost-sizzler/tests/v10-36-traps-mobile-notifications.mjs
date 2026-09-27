import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const gameDir=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(gameDir,relative),"utf8");

const balance=read("js/v10-15-rare-events-balance.js");
const polish=read("css/v10-30-polish.css");
const loader=read("js/asset-overrides.js");
const r19=read("js/v10-42-r19-mobile-trap-layout-stability.js");
const play=read("js/game-play.js");

assert.match(balance,/const TRAP_WARNING_DISTANCE=3;/,"ordinary trap warnings use a three-tile radius");
assert.match(balance,/trapMd\(player,trap\)<=TRAP_WARNING_DISTANCE/,"trap warning is raised when the player enters the three-tile danger radius");
assert.match(balance,/warned:new Set\(\)/,"trap warnings are latched instead of repeating every frame");
assert.match(balance,/trapRuntime\.warned\.has\(trapKey\(candidate,player\)\)/,"each player/trap warning is emitted only once per floor");
assert.match(balance,/contact:new Set\(\)/,"presentation diagnostics may retain a passive active-contact observation latch");
assert.match(balance,/observeTrapContact\(player,now\)/,"standing players remain observed for trap presentation during update");
assert.match(balance,/updateV115TrapPresentation/,"Rare Events trap update must remain presentation/diagnostics only");
assert.doesNotMatch(balance,/triggerTrap=function triggerTrapV115Reliable/,"Rare Events must not replace the canonical trap gameplay owner");
assert.doesNotMatch(balance,/hurtPlayer\(player,1,false,/,"Rare Events must not apply ordinary trap HEALTH damage");
assert.match(balance,/drawReliableTrap/,"ordinary floor traps retain their dedicated visible renderer");
assert.match(balance,/drawSpecialObjectsV115ReliableTraps/,"trap plates remain attached to the live special-object render path");
assert.match(r19,/gameplayOwnership:false/,"R19 mobile compatibility must be layout-only after the R58 rewrite");
assert.doesNotMatch(r19,/__ccgV142R19MobileTrapDamage/,"layout compatibility must not restore an R19 damage wrapper");
assert.match(r19,/function syncPortraitCanvasAspect\(\)/,"portrait stability must retain backing-store aspect repair");
assert.match(play,/function updateActiveTrapContacts\(source="simulation"\)/,"canonical R58 gameplay must continuously check occupied active floor traps");
assert.match(play,/function rearmInactiveTrapContacts\(\)/,"canonical R58 gameplay must rearm inactive and later-cycle trap contacts");
assert.match(play,/trapCycleHits\.set\(key,cycle\)/,"verified canonical trap hits must latch one active cycle");
assert.match(play,/trapHitsByKind:\{fire:0,spike:0,shock:0,other:0\}/,"canonical trap diagnostics must distinguish FIRE SPIKE and SHOCK");

assert.match(polish,/@media \(max-width:900px\),\(pointer:coarse\)/,"mobile notification correction applies to phones and coarse pointers");
assert.match(polish,/game-message-rail,[\s\S]*position:relative!important;[\s\S]*min-height:52px!important;/,"mobile message rail retains a visible notification row");
assert.match(polish,/game-message-rail>\.pickup-toast,[\s\S]*position:absolute!important;[\s\S]*inset:0!important;/,"mobile toast overlays room context instead of being clipped below it");
assert.match(polish,/game-message-rail>\.pickup-toast\.show,[\s\S]*display:grid!important;[\s\S]*visibility:visible!important;[\s\S]*opacity:1!important;/,"active mobile notifications are forced visible");
assert.match(loader,/CCG_RARE_EVENTS_BALANCE_REV=CCG_RELEASE_REV;/,"trap runtime asset revision must inherit the current published release token");
assert.match(loader,/CCG_POLISH_REV=CCG_RELEASE_REV;/,"mobile notification stylesheet revision must inherit the current published release token");

console.log("Lost Sizzler trap and mobile notification regression checks passed");
