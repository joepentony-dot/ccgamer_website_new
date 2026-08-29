import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const read=relative=>fs.readFileSync(path.join(root,relative),"utf8");

const loader=read("js/v10-41-lake-item-safety.js");
const responsive=read("js/v10-41-r39-horde-responsive-handoff.js");

assert.doesNotThrow(()=>new Function(responsive),"r39 Horde responsive/handoff module must parse as valid JavaScript");
assert.match(loader,/const loadHordeServer=\(\)=>\{/,"dedicated Horde runtime must have a lazy Horde-only loader");
assert.match(loader,/document\.body\?\.dataset\?\.specialMode!=="horde-survivor"/,"lazy loader must refuse to install Colyseus outside Horde");
assert.match(loader,/attributeFilter:\["data-special-mode"\]/,"lazy loader must wake from the special-mode transition instead of polling the whole game");
assert.match(loader,/load\("js\/v10-41-r38-colyseus-horde\.js","data-ccg-v141-r38-colyseus-horde"\)/,"Horde activation must load the Colyseus authority adapter");
assert.match(loader,/load\("js\/v10-41-r39-horde-responsive-handoff\.js","data-ccg-v141-r39-horde-responsive-handoff"\)/,"Horde activation must load the final responsive/handoff owner");
assert.ok(loader.indexOf("v10-41-release-overlay-safety.js")<loader.indexOf("const loadHordeServer"),"general startup safety must install before the Horde-only lazy path is armed");

assert.match(responsive,/grid-template-columns:minmax\(0,1fr\) clamp\(220px,18vw,310px\)/,"desktop Horde must dedicate the main width to gameplay and a bounded radar column");
assert.match(responsive,/grid-template-rows:auto auto minmax\(0,1fr\) auto!important/,"desktop Horde must reserve explicit rows for top bar, Horde status, gameplay and compact HUD");
assert.match(responsive,/\.ccg-game>#horde-performance-status\{[\s\S]*?grid-column:1\/-1!important;grid-row:2!important;/,"Horde wave/enemy status must remain above gameplay instead of being auto-placed below it");
assert.match(responsive,/\.v102-game-area\{[\s\S]*?grid-row:3!important;[\s\S]*?height:100%!important;[\s\S]*?min-height:0!important;/,"Horde game area must override the retained height:auto rule and fill the dedicated gameplay row");
assert.match(responsive,/\.v102-game-area \.canvas-wrap\{[\s\S]*?height:100%!important;/,"Horde canvas wrapper must fill the available gameplay height instead of leaving a black dead band");
assert.match(responsive,/\.tactical-zone\{[\s\S]*?grid-row:3!important;[\s\S]*?grid-template-rows:minmax\(0,1fr\) auto!important;/,"desktop Horde side column must align with gameplay and use its height for radar plus the live player roster");
assert.match(responsive,/\.player-hub\{[\s\S]*?grid-row:4!important;/,"desktop Horde HUD must sit immediately below the gameplay row");
assert.match(responsive,/tactical\.appendChild\(roster\)/,"live Horde player roster must move into the useful side/compact tactical region");
assert.match(responsive,/function watchRosterPlacement\(\)/,"r39 must explicitly handle a roster created after the Horde lazy module starts");
assert.match(responsive,/rosterObserver\.observe\(root,\{childList:true,subtree:true\}\)/,"late roster recovery must use event-driven DOM observation rather than gameplay polling");
assert.match(responsive,/if\(placeRoster\(\)\)requestResize\(\)/,"late roster observation must place the panel and resize immediately when it appears");
assert.match(responsive,/stopRosterWatch\(\)/,"late roster observer must disconnect once placement is complete or Horde ends");
assert.match(responsive,/@media\(max-width:900px\)/,"tablet and phone Horde must have a dedicated bounded viewport layout");
assert.match(responsive,/grid-template-rows:auto auto minmax\(0,1fr\) auto auto!important;height:100dvh!important;max-height:100dvh!important/,"tablet Horde must reserve status/game/HUD rows while remaining within one dynamic viewport");
assert.match(responsive,/\.tactical-zone>\.radar-card\{display:none!important\}/,"tablet Horde must remove the desktop radar rather than squeezing the arena");
assert.match(responsive,/HOST MIGRATION COMPLETE/,"r39 must intercept the obsolete browser-host migration notice during dedicated Horde");
assert.match(responsive,/live\.authoritative=false/,"dedicated Horde must reassert server authority after retained Supabase membership callbacks");
assert.match(responsive,/__CCG_LOST_SIZZLER_SCHEDULE_RESIZE__/,"Horde layout changes must reuse the canonical canvas resize scheduler");
assert.doesNotMatch(responsive,/setInterval\(|setTimeout\(/,"r39 must add no permanent polling or timer workload to gameplay");

console.log("Lost Sizzler V10.41 r39 Horde responsive viewport, late-roster observation, status-row and dedicated-handoff contracts passed.");
