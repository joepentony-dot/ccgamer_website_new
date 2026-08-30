import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,"..");
const loader=fs.readFileSync(path.join(root,"js/v10-41-lake-item-safety.js"),"utf8");
const src=fs.readFileSync(path.join(root,"js/v10-41-r46-release-candidate-polish.js"),"utf8");
const migration=fs.readFileSync(path.resolve(root,"../../supabase/migrations/20260830203500_lost_sizzler_release_telemetry_metadata.sql"),"utf8");

assert.match(loader,/v10-41-r46-release-candidate-polish\.js/,"late loader must publish r46");
assert.match(src,/ccg-lost-sizzler-lifetime-stats-v1/,"r46 must use versioned local lifetime statistics");
assert.match(src,/ccg-lost-sizzler-accessibility-v1/,"r46 must use versioned accessibility preferences");
assert.match(src,/reducedMotion/,"r46 must expose reduced motion preference");
assert.match(src,/reducedFlashes/,"r46 must expose reduced flash preference");
assert.match(src,/largeText/,"r46 must expose larger text preference");
assert.match(src,/setMusicLevel/,"r46 must use the existing audio API rather than own music playback");
assert.match(src,/RUN REPORT/,"r46 must enrich the existing end screen with a run report");
assert.match(src,/BEST SCORE/,"r46 run report must expose the player's best score");
assert.match(src,/Player Statistics/,"r46 must expose lifetime player statistics");
assert.match(src,/floor_reached/,"r46 must record coarse floor-reached telemetry");
assert.match(src,/floor_cleared/,"r46 must record coarse floor-clear telemetry");
assert.match(src,/run_ended/,"r46 must record run outcome telemetry");
assert.doesNotMatch(src,/\.send\s*\(/,"r46 must not own multiplayer transport");
assert.doesNotMatch(src,/saveCheckpointData|startWorld\s*\(/,"r46 must not own save creation or world creation");
assert.match(migration,/add column if not exists metadata jsonb/i,"release telemetry migration must add optional JSON metadata");
assert.match(migration,/jsonb_typeof\(metadata\) = 'object'/i,"release telemetry metadata must be constrained to an object");

console.log("Lost Sizzler V10.41 r46 release-candidate static contract passed.");