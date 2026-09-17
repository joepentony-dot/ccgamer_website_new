import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import {fileURLToPath} from "node:url";
import path from "node:path";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const source=fs.readFileSync(path.join(root,"js/v10-42-elemental-portal-foundation.js"),"utf8");
const bootstrap=fs.readFileSync(path.join(root,"js/v10-42-bootstrap.js"),"utf8");

let checkpoint=null;
const PGR={
  makeRun(opts={}){return{floor:1,deepest:1,seed:opts.seed||"PORTALTEST",stats:{}}},
  bankFloor(){return[]},
  makeCheckpoint(run,player,player2,score,playMode="solo"){return{version:"V10.3",floor:run.floor,run:JSON.parse(JSON.stringify(run)),player,player2,score,playMode}},
  loadCheckpoint(){return checkpoint}
};
const context={window:{CCGProgression:PGR,CCG_CONFIG:{maxFloors:5}},console};
vm.runInNewContext(source,context,{filename:"v10-42-elemental-portal-foundation.js"});

const API=context.window.CCGLostSizzlerV142ElementalPortalFoundation;
assert.ok(API,"portal foundation should install");
assert.deepEqual(Array.from(API.portals,portal=>portal.id),["water","fire","earth","air"]);
assert.deepEqual(Array.from(API.portals,portal=>[portal.sourceFloor,portal.targetFloor]),[[1,2],[2,3],[3,4],[4,5]]);

const run=PGR.makeRun({seed:"ABCD"});
assert.equal(run.floor,1,"portal foundation must not alter initial campaign floor");
assert.deepEqual(Array.from(run.v142ElementalPortals.unlocked),[]);

PGR.bankFloor(run);
assert.equal(run.floor,1,"banking Floor 1 must not let portal code own descent");
assert.deepEqual(Array.from(run.v142ElementalPortals.unlocked),["water"]);
assert.equal(API.routeForFloor(1).id,"water");
assert.equal(API.routeSeed(run,"water"),"ABCD-PORTAL-WATER-F1-F2");

const transit=API.prepareTransit(run,"water",{returnToken:"floor-1-exit"});
assert.equal(transit.fromFloor,1);
assert.equal(transit.toFloor,2);
assert.equal(run.floor,1,"preparing a portal route must not increment the authoritative floor");
run.floor=2;run.deepest=2;
const arrival=API.confirmArrival(run);
assert.equal(arrival.id,"water");
assert.deepEqual(Array.from(run.v142ElementalPortals.traversed),["water"]);
assert.equal(run.v142ElementalPortals.active,null);

PGR.bankFloor(run);
assert.deepEqual(Array.from(run.v142ElementalPortals.unlocked),["water","fire"]);
const saved=PGR.makeCheckpoint(run,{id:"p1"},null,1234,"solo");
assert.deepEqual(Array.from(saved.run.v142ElementalPortals.unlocked),["water","fire"]);
assert.deepEqual(Array.from(saved.run.v142ElementalPortals.traversed),["water"]);

checkpoint={version:"V10.3",floor:4,run:{floor:4,deepest:4,seed:"LEGACY",stats:{}},player:{id:"p1"},player2:null,score:99,playMode:"solo"};
const restored=PGR.loadCheckpoint();
assert.deepEqual(Array.from(restored.run.v142ElementalPortals.unlocked),["water","fire","earth"],"legacy checkpoint should infer portal unlocks from proven campaign depth");
assert.deepEqual(Array.from(restored.run.v142ElementalPortals.discovered),["water","fire","earth"]);
assert.equal(restored.run.floor,4,"normalising a legacy save must preserve its campaign floor");
assert.equal(API.isUnlocked(restored.run,"air"),false,"Air remains locked until Floor 4 has actually been cleared");

PGR.bankFloor(restored.run);
assert.deepEqual(Array.from(restored.run.v142ElementalPortals.unlocked),["water","fire","earth","air"]);
assert.equal(restored.run.floor,4,"unlocking Air must still leave descent to the established progression owner");

assert.doesNotMatch(source,/runState\.floor\s*(?:\+\+|\+=|=\s*[^=])/,'portal foundation must not write the authoritative run.floor');
const campaignIndex=bootstrap.indexOf('["v10-42-five-depth-campaign.js","CCGLostSizzlerV142FiveDepthCampaign"]');
const portalIndex=bootstrap.indexOf('["v10-42-elemental-portal-foundation.js","CCGLostSizzlerV142ElementalPortalFoundation"]');
const splitIndex=bootstrap.indexOf('["v10-42-split-campaign-state.js","CCGLostSizzlerV142SplitCampaignState"]');
assert.ok(campaignIndex>=0&&portalIndex>campaignIndex&&splitIndex>portalIndex,"portal foundation must load after five-depth ownership and before split campaign state");

console.log("PASS V10.42 elemental portal foundation");
