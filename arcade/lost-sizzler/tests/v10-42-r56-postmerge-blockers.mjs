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
  assert.match(html,/ccg-lost-sizzler-build" content="V10\.42 r56"/);
  assert.match(html,/ccg-lost-sizzler-cache" content="20260924r56"/);
  assert.match(html,/Latest Build Changes · V10\.42 R56/);
  assert.match(html,/ACTIVE BUILD: V10\.42 R56/);
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
  /reservedHazardRooms=rooms\.filter\(room=>room\?\.dedicatedHazardReserved&&hazardEligible\(room,6,5\)\)[\s\S]*choices=\[\.\.\.shuffleHazardRooms\(reservedHazardRooms\),/,
  "reserved dedicated-hazard rooms must be consumed before ordinary hazard candidates"
);
assert.match(
  systems,
  /fallbackHazardRooms=reservedHazardRooms\.length\+primaryHazardRooms\.length>=count\?\[\]:/,
  "fallback hazard rooms must only be considered when reserved and primary rooms are insufficient"
);
assert.match(
  systems,
  /fallbackFinalTrapRooms=\[\.\.\.\(world\.rooms\|\|\[\]\)\][\s\S]*emergencyFinalTrapRooms=\[\.\.\.\(world\.rooms\|\|\[\]\)\][\s\S]*fallbackFinalTrapRooms\[offset%Math\.max\(1,fallbackFinalTrapRooms\.length\)\][\s\S]*emergencyFinalTrapRooms\[offset%Math\.max\(1,emergencyFinalTrapRooms\.length\)\]/,
  "final trap-family restoration must fall back to progressively relaxed non-hazard rooms when the strict pool is empty"
);
assert.match(
  stage6,
  /TRAP_FAMILIES=Object\.freeze\(\["fire","spike","shock"\]\)[\s\S]*function reconcileTrapFamilies\(hostState,seed\)[\s\S]*counts\[String\(trap\.kind\|\|""\)\.toLowerCase\(\)\]>1[\s\S]*donor\.kind=kind[\s\S]*reconcileTrapFamilies\(hostState,seed\)/,
  "Stage 6 zone retuning must preserve at least one active FIRE, SPIKE and SHOCK family by retagging only a surplus duplicate"
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

console.log("Dungeon Carnage R56 post-merge blocker regression contract passed.");
