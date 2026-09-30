import assert from "node:assert/strict";
import fs from "node:fs";

const root=new URL("../",import.meta.url);
const repoRoot=new URL("../../",root);

const systems=fs.readFileSync(new URL("js/systems.js",root),"utf8");
const stage6=fs.readFileSync(new URL("js/v10-42-stage6-zone-gameplay.js",root),"utf8");
const reporter=fs.readFileSync(new URL("js/v10-42-bug-reporter.js",root),"utf8");
const shop=fs.readFileSync(new URL("js/v10-42-r55-shop-feedback.js",root),"utf8");
const canonical=fs.readFileSync(new URL("index.html",root),"utf8");
const publicAlias=fs.readFileSync(new URL("arcade/c64-dungeon-carnage/index.html",repoRoot),"utf8");

for(const html of [canonical,publicAlias]){
  assert.match(html,/ccg-lost-sizzler-build" content="V10\.42 r77"/);
  assert.match(html,/ccg-lost-sizzler-cache" content="20260930r78"/);
  assert.match(html,/Latest Build Changes · V10\.42 R77/);
  assert.match(html,/ACTIVE BUILD: V10\.42 R77/);
}

assert.match(
  systems,
  /strictHazardRoomIds=new Set\(\[\.\.\.reservedHazardRooms,\.\.\.primaryHazardRooms,\.\.\.fallbackHazardRooms\]\.map\(room=>room\.id\)\)[\s\S]*relaxedHazardRooms=[\s\S]*!strictHazardRoomIds\.has\(room\.id\)/,
  "relaxed hazard-room candidates must exclude reserved and strict candidates so one room cannot receive duplicate dedicated hazards"
);
assert.match(
  systems,
  /hazardReserveCount=.*>=3\?2:1[\s\S]*dedicatedHazardReserved=true[\s\S]*featureRooms=rooms\.filter\(room=>!hazardReservedRoomIds\.has\(room\.id\)\)/,
  "dedicated hazard capacity must be reserved before later room owners claim the same floor spaces"
);
assert.match(
  systems,
  /hardHazardEligible=\(room,minW=6,minH=5\)=>Boolean\([\s\S]*reservedHazardRooms=\(world\.rooms\|\|\[\]\)\.filter\(room=>Boolean\(room\?\.dedicatedHazardReserved&&room\.id!==world\.startRoomId&&room\.id!==world\.exitRoomId&&room\.w>=2&&room\.h>=2\)\)[\s\S]*choices=\[\.\.\.shuffleHazardRooms\(reservedHazardRooms\),/,
  "reserved dedicated-hazard rooms must remain authoritative even if stale soft room-owner flags survive a repeated decoration pass"
);
assert.match(
  systems,
  /while\(\(host\.hazardRooms\|\|\[\]\)\.length<count\)[\s\S]*candidate\?\.dedicatedHazardReserved[\s\S]*candidate\.w>=2&&candidate\.h>=2[\s\S]*if\(!cells\.length\)cells\.push\(/,
  "compact dedicated-hazard fallback must preserve the floor invariant and still synthesize a playable hazard cell when only a tiny reserved room remains"
);
assert.match(
  systems,
  /const sigilChoices=world\.rooms\.filter\(r=>r\.optional&&!r\.dedicatedHazardReserved\)/,
  "Sigil annex selection must not claim a room reserved for a dedicated hazard"
);
assert.match(
  systems,
  /const traderRoom=\[\.\.\.world\.rooms\]\.filter\(r=>r\.optional&&r\.id!==host\.sigilRoomId&&!r\.dedicatedHazardReserved\)/,
  "preferred hidden-trader room selection must not claim a dedicated-hazard reservation"
);
assert.match(
  systems,
  /const traderRoom=\[\.\.\.world\.rooms\]\.filter\(r=>r\.optional&&r\.id!==host\.sigilRoomId&&!r\.dedicatedHazardReserved\)[\s\S]*\|\|featureRooms\.find\(r=>r\.id!==world\.exitRoomId&&!r\.dedicatedHazardReserved\)\|\|null;/,
  "hidden trader fallback must stay outside rooms reserved for dedicated hazards"
);
assert.doesNotMatch(
  systems,
  /const traderRoom=[^\n]*\|\|rooms\[rooms\.length-1\]/,
  "hidden trader fallback must not reclaim a reserved mandatory room"
);
assert.match(
  systems,
  /fallbackHazardRooms=reservedHazardRooms\.length\+primaryHazardRooms\.length>=count\?\[\]:/,
  "fallback hazard rooms must only be considered when reserved and primary rooms are insufficient"
);
assert.match(
  systems,
  /R67: ordinary single-tile FIRE\/SPIKE\/SHOCK traps are retired[\s\S]*host\.traps=\[\];/,
  "R67 base decoration must leave the ordinary procedural trap collection empty"
);
assert.match(
  stage6,
  /hostState\.traps=\[\];[\s\S]*ensureDedicatedHazard\(worldState,hostState,runState,profile,seed\)/,
  "Stage 6 must clear retired ordinary traps and preserve only the dedicated hazard-room path"
);
assert.doesNotMatch(
  stage6,
  /reconcileTrapFamilies\(hostState,seed,worldState,\{\.\.\.profile,floor\}\);/,
  "Stage 6 must not restore FIRE, SPIKE or SHOCK procedural trap families"
);
assert.match(
  reporter,
  /row\?\.active===true&&Number\(row\?\.hitCooldown\|\|0\)<=0/,
  "dedicated hazard contacts under the normal hit cooldown must not be reported as missed damage"
);
assert.match(
  reporter,
  /damageObserved=Boolean\(exactSignal\)/,
  "trap polling must require exact player-and-contact evidence"
);
assert.match(
  reporter,
  /signal\.playerId===String\(before\?\.playerId\|\|""\)[\s\S]*signal\.x===Number\(before\?\.x\)&&signal\.y===Number\(before\?\.y\)/,
  "movement-boundary diagnostics must be tied to the exact player and cell"
);
assert.match(
  shop,
  /if\(shopVisible\(\)&&serial===before&&revisionNow\(\)<=beforeRevision\)fallbackFeedback\(id\)/,
  "successful purchases must not be overwritten by a post-purchase INVENTORY FULL or price blocker"
);
assert.match(shop,/INVENTORY FULL/);

console.log("Dungeon Carnage R69 post-merge blocker regression contract passed.");
